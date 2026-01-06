document.addEventListener('DOMContentLoaded', () => {
  const enableToggle = document.getElementById('enableToggle');
  const themeSelect = document.getElementById('themeSelect');
  const statusDiv = document.getElementById('status');

  /**
   * Helper to show a temporary status message in the footer
   */
  function showStatus(msg) {
    statusDiv.textContent = msg;
    statusDiv.className = 'status-fade'; // Triggers the CSS animation

    // Reset after animation
    setTimeout(() => {
      statusDiv.className = '';
      statusDiv.textContent = 'Ready';
      statusDiv.style.opacity = '0.5';
    }, 2000);
  }

  // 1. Load saved settings on startup
  chrome.storage.local.get(['enabled', 'theme'], (result) => {
    // Default to true if not set
    enableToggle.checked = result.enabled !== false;
    // Default to 'default.min' if not set
    themeSelect.value = result.theme || 'default.min';
  });

  // 2. Handle Toggle Change
  enableToggle.addEventListener('change', () => {
    const isEnabled = enableToggle.checked;
    chrome.storage.local.set({ enabled: isEnabled }, () => {
      showStatus(isEnabled ? 'Extension Enabled' : 'Extension Disabled');
    });
  });

  // 3. Handle Theme Change
  themeSelect.addEventListener('change', () => {
    const theme = themeSelect.value;
    chrome.storage.local.set({ theme: theme }, () => {
      showStatus('Theme Saved');
    });
  });
});
