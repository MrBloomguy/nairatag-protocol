document.addEventListener('DOMContentLoaded', async () => {
  const tagEl = document.getElementById('pop-tag');
  const addrEl = document.getElementById('pop-addr');
  const inputEl = document.getElementById('pop-inspect-input');
  const btnInspect = document.getElementById('pop-btn-inspect');

  // Load from local storage or defaults
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['activeTag', 'activeAddress'], (data) => {
      if (data.activeTag) tagEl.textContent = `₦${data.activeTag.replace(/^₦/, '').toUpperCase()}`;
      if (data.activeAddress) addrEl.textContent = `${data.activeAddress.slice(0, 6)}...${data.activeAddress.slice(-4)}`;
    });
  }

  btnInspect?.addEventListener('click', () => {
    const val = inputEl?.value.trim().replace(/^₦/, '').toUpperCase();
    if (!val) return;
    chrome.tabs.create({ url: `http://127.0.0.1:8088/tag/${encodeURIComponent(val)}` });
  });
});
