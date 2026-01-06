let isEnabled = true;
let currentTheme = 'default';
let activeThemeBackground = '';
let activeThemeColor = '';
let debounceTimer = null;

// --- WORKER SETUP ---

// Initialize the worker immediately
const workerURL = chrome.runtime.getURL('worker.js');
const highlightWorker = new Worker(workerURL);

// Listen for results from the worker
highlightWorker.onmessage = (event) => {
  const { id, html, success } = event.data;

  // Find the DOM element waiting for this result
  const codeElement = document.querySelector(`code[data-hl-id="${id}"]`);

  if (codeElement && success) {
    // Apply the highlighted HTML
    codeElement.innerHTML = html;

    // Add class for styling
    codeElement.classList.add('hljs');

    // Mark the parent block as fully processed/styled
    const block = codeElement.closest('pre');
    if (block) {
      // Re-apply container styles now that we have content
      const container = block.closest('.formatted-code-block-internal-container');
      if (container) {
        applyContainerStyles(container);
        stripAngularAttributes(container);
      }
      // Mark as done so we don't send it to the worker again
      block.dataset.processed = 'yes';

      // Remove the loading state (optional, if you added one)
      codeElement.style.opacity = '1';
    }
  }
};

// --- UTILS ---

function debounce(func, delay) {
  return function (...args) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(this, args), delay);
  };
}

// Generate a simple unique ID
function uuid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// --- MAIN LOGIC ---

async function updateTheme(themeName) {
  const oldStyle = document.getElementById('gemini-hl-style');
  if (oldStyle) oldStyle.remove();

  if (!isEnabled) return;

  try {
    const url = chrome.runtime.getURL(`themes/${themeName}.css`);
    const response = await fetch(url);
    let cssText = await response.text();

    // 1. Extract background color to apply it to the parent container later
    const bgMatch = cssText.match(/\.hljs\s*\{[^}]*background(?:-color)?:\s*([^;}]+)/i);
    activeThemeBackground = bgMatch && bgMatch[1] ? bgMatch[1].trim() : '#1e1e1e';

    // 2. Extract text color to apply it to the header (icons/text)
    // Using \b to ensure we match 'color:' and not 'background-color:'
    const colorMatch = cssText.match(/\.hljs\s*\{[^}]*\bcolor:\s*([^;}]+)/i);
    activeThemeColor = colorMatch && colorMatch[1] ? colorMatch[1].trim() : '#c9d1d9';

    // 3. Force overrides: Append !important to every CSS rule
    // This is necessary because Gemini uses Angular View Encapsulation which creates high-specificity selectors.
    cssText = cssText.replace(/;/g, ' !important;');

    const style = document.createElement('style');
    style.id = 'gemini-hl-style';
    style.textContent = cssText;

    // Inject global overrides to reset Gemini's default pre/code styling
    // allowing the injected theme to take precedence.
    style.textContent += `
          pre { background-color: transparent !important; border: none !important; margin: 0 !important; padding: 0 !important; }
          code.hljs { font-family: 'Fira Code', 'Consolas', monospace !important; display: block !important; overflow-x: auto !important; background-color: transparent !important; padding: 1em !important; border-radius: 0 !important; }
        `;
    document.head.appendChild(style);

    // Force re-check
    highlightCodeBlocks();
  } catch (err) {
    console.error(err);
  }
}

function highlightCodeBlocks() {
  if (!isEnabled) return;

  // Select unprocessed blocks
  const codeBlocks = document.querySelectorAll('pre:not([data-processed="yes"])');

  codeBlocks.forEach((block) => {
    // Check if we already assigned an ID (pending state)
    let codeElement = block.querySelector('code');
    if (!codeElement) return;

    // Check content
    const textContent = codeElement.textContent;
    if (!textContent.trim()) return;

    // If already has an ID, it means it's currently being processed by the worker.
    // However, if the text changed (Gemini streaming), we might need to update.
    // For simplicity with streaming: We simply check if it has an ID.
    // If we want to support live streaming updates perfectly, we'd update the worker.
    // Given our debounce, we treat each debounce cycle as a "fresh" look.

    let id = codeElement.dataset.hlId;
    if (!id) {
      id = uuid();
      codeElement.dataset.hlId = id;
    }

    // Attempt to guess language from Gemini header
    let languageHint = null;
    const headerSpan = block.closest('.code-block')?.querySelector('.code-block-decoration span');
    if (headerSpan) {
      languageHint = headerSpan.textContent.trim().toLowerCase();
    }

    // Send job to worker
    highlightWorker.postMessage({
      id: id,
      code: textContent,
      language: languageHint,
    });

    // Note: We do NOT set block.dataset.processed = "yes" here immediately.
    // We wait for the worker to reply (in onmessage).
  });
}

function applyContainerStyles(container) {
  if (!activeThemeBackground) return;

  // Apply background to the main container
  container.style.setProperty('background-color', activeThemeBackground, 'important');
  container.style.borderRadius = '8px';
  container.style.border = '1px solid rgba(128,128,128, 0.2)';

  // Find and style the header (where the language name and copy button are located)
  const header = container.parentElement?.querySelector('.code-block-decoration');

  if (header) {
    header.style.setProperty('background-color', activeThemeBackground, 'important');

    if (activeThemeColor) {
      header.style.setProperty('color', activeThemeColor, 'important');
      // Add a subtle bottom border using the text color
      header.style.borderBottom = `1px solid ${activeThemeColor}`;
      header.style.opacity = '0.95';

      // Style the language label specifically
      const langSpan = header.querySelector('span');
      if (langSpan) langSpan.style.setProperty('color', activeThemeColor, 'important');

      // Style Material Icons (e.g., Copy button)
      const icons = header.querySelectorAll('mat-icon');
      icons.forEach((icon) => icon.style.setProperty('color', activeThemeColor, 'important'));
    }
  }
}

function stripAngularAttributes(element) {
  if (!element) return;
  const attributes = Array.from(element.attributes);
  attributes.forEach((attr) => {
    if (attr.name.startsWith('_ng')) element.removeAttribute(attr.name);
  });
}

// --- INITIALIZATION ---

chrome.storage.local.get(['enabled', 'theme'], (result) => {
  isEnabled = result.enabled !== false;
  currentTheme = result.theme || 'default';

  if (isEnabled) {
    updateTheme(currentTheme);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.enabled) {
      isEnabled = changes.enabled.newValue;
      location.reload();
    }
    if (changes.theme) {
      currentTheme = changes.theme.newValue;
      // Reset processed flags to force re-highlighting
      document.querySelectorAll('pre').forEach((b) => {
        b.removeAttribute('data-processed');
        const code = b.querySelector('code');
        if (code) code.removeAttribute('data-hl-id'); // Clear ID to force new worker job
      });
      updateTheme(currentTheme);
    }
  }
});

// Debounce: Wait 150ms after DOM changes stop before triggering the worker
const debouncedHighlight = debounce(highlightCodeBlocks, 150);

const observer = new MutationObserver(() => {
  if (!isEnabled) return;
  debouncedHighlight();
});

observer.observe(document.body, { childList: true, subtree: true });
