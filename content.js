let isEnabled = true;
let currentTheme = 'default';
let activeThemeBackground = '';
let activeThemeColor = '';

// Performance: Store the timeout ID for debouncing
let debounceTimer = null;

/**
 * UTILITY: Debounce function
 * Prevents the highlighter from running 100x per second during streaming.
 * It waits until the DOM has stopped changing for a specific delay (e.g., 100ms).
 */
function debounce(func, delay) {
    return function (...args) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(this, args), delay);
    };
}

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
        activeThemeBackground = (bgMatch && bgMatch[1]) ? bgMatch[1].trim() : '#1e1e1e';

        // 2. Extract text color to apply it to the header (icons/text)
        // Using \b to ensure we match 'color:' and not 'background-color:'
        const colorMatch = cssText.match(/\.hljs\s*\{[^}]*\bcolor:\s*([^;}]+)/i);
        activeThemeColor = (colorMatch && colorMatch[1]) ? colorMatch[1].trim() : '#c9d1d9';

        // 3. Force overrides: Append !important to every CSS rule
        // This is necessary because Gemini uses Angular View Encapsulation which creates high-specificity selectors.
        cssText = cssText.replace(/;/g, ' !important;');

        const style = document.createElement('style');
        style.id = 'gemini-hl-style';
        style.textContent = cssText;

        // Inject global overrides to reset Gemini's default pre/code styling
        // allowing the injected theme to take precedence.
        style.textContent += `
      pre {
         background-color: transparent !important;
         border: none !important;
         margin: 0 !important;
         padding: 0 !important;
      }
      code.hljs {
         font-family: 'Fira Code', 'Consolas', monospace !important;
         display: block !important;
         overflow-x: auto !important;
         background-color: transparent !important; 
         padding: 1em !important;
         border-radius: 0 !important;
      }
    `;

        document.head.appendChild(style);

        // Trigger immediately after theme change
        highlightCodeBlocks();

    } catch (err) {
        console.error("Gemini Highlighter: Failed to load theme.", err);
    }
}

function highlightCodeBlocks() {
    if (!isEnabled) return;

    // Performance optimization:
    // We limit the scope to 'pre' tags that lack our 'processed' flag.
    // This reduces the workload significantly on large pages.
    const codeBlocks = document.querySelectorAll('pre:not([data-processed="yes"])');

    if (codeBlocks.length === 0) return;

    codeBlocks.forEach((block) => {
        const codeElement = block.querySelector('code');

        if (codeElement && codeElement.textContent.trim().length > 0) {

            codeElement.className = 'hljs';
            hljs.highlightElement(codeElement);

            // Find Gemini's internal wrapper container to apply the background color
            const container = block.closest('.formatted-code-block-internal-container');

            if (container) {
                applyContainerStyles(container);
                stripAngularAttributes(container);
            }

            block.dataset.processed = "yes";
        }
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
            header.style.opacity = "0.95";

            // Style the language label specifically
            const langSpan = header.querySelector('span');
            if (langSpan) langSpan.style.setProperty('color', activeThemeColor, 'important');

            // Style Material Icons (e.g., Copy button)
            const icons = header.querySelectorAll('mat-icon');
            icons.forEach(icon => icon.style.setProperty('color', activeThemeColor, 'important'));
        }
    }
}

function stripAngularAttributes(element) {
    if (!element) return;
    const attributes = Array.from(element.attributes);
    attributes.forEach(attr => {
        if (attr.name.startsWith('_ng')) {
            element.removeAttribute(attr.name);
        }
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

// Watch for setting changes from the popup
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.enabled) {
            isEnabled = changes.enabled.newValue;
            location.reload();
        }
        if (changes.theme) {
            currentTheme = changes.theme.newValue;
            document.querySelectorAll('pre').forEach(b => b.removeAttribute('data-processed'));
            updateTheme(currentTheme);
        }
    }
});

// PERFORMANCE FIX: Debounced Observer
// The observer now calls the debounced version of our function.
// It waits for 150ms of silence before running.
// This prevents lag while Gemini streams the text rapidly.
const debouncedHighlight = debounce(highlightCodeBlocks, 150);

const observer = new MutationObserver((mutations) => {
    if (!isEnabled) return;
    debouncedHighlight();
});

observer.observe(document.body, { childList: true, subtree: true });
