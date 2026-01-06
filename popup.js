document.addEventListener('DOMContentLoaded', () => {
    const enableToggle = document.getElementById('enableToggle');
    const themeSelect = document.getElementById('themeSelect');

    chrome.storage.local.get(['enabled', 'theme'], (result) => {
        enableToggle.checked = result.enabled !== false;
        themeSelect.value = result.theme || 'default';
    });

    enableToggle.addEventListener('change', () => {
        const isEnabled = enableToggle.checked;
        chrome.storage.local.set({ enabled: isEnabled });
    });

    themeSelect.addEventListener('change', () => {
        const theme = themeSelect.value;
        chrome.storage.local.set({ theme: theme });
    });
});
