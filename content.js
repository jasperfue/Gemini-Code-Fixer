let isEnabled = true;
let currentTheme = 'default';
let activeThemeBackground = '';
let activeThemeColor = '';

/**
 * Fetches the selected CSS theme, extracts colors for the container/header,
 * and injects the styles with '!important' to override Gemini's default styling.
 */
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

        // Trigger re-render to apply extracted colors immediately
        setTimeout(highlightCodeBlocks, 50);

    } catch (err) {
        console.error("Gemini Highlighter: Failed to load theme.", err);
    }
}

/**
 * Main logic loop: Finds code blocks, applies syntax highlighting,
 * and fixes container/header styling.
 */
function highlightCodeBlocks() {
    if (!isEnabled) return;

    const codeBlocks = document.querySelectorAll('pre');

    codeBlocks.forEach((block) => {
        // Skip if already processed to save performance
        if (block.dataset.processed === "yes") return;

        const codeElement = block.querySelector('code');
        if (codeElement) {

            // Apply Highlight.js
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

/**
 * Applies the extracted theme colors to the container and the header.
 */
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
            if (langSpan) {
                langSpan.style.setProperty('color', activeThemeColor, 'important');
            }

            // Style Material Icons (e.g., Copy button)
            const icons = header.querySelectorAll('mat-icon');
            icons.forEach(icon => {
                icon.style.setProperty('color', activeThemeColor, 'important');
            });
        }
    }
}

/**
 * Removes Angular's _ngcontent attributes to break style isolation,
 * allowing our CSS to override Gemini's defaults easily.
 */
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
        // Fallback interval to catch nodes that MutationObserver might miss during heavy streaming
        setInterval(highlightCodeBlocks, 1000);
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
            // Reset processed flag to force re-highlighting
            document.querySelectorAll('pre').forEach(b => b.dataset.processed = "");
            updateTheme(currentTheme);
        }
    }
});

// Observe DOM changes (Gemini streaming responses)
const observer = new MutationObserver(() => {
    if (isEnabled) highlightCodeBlocks();
});
observer.observe(document.body, { childList: true, subtree: true });
