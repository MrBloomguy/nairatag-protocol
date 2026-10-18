/**
 * @file service-worker.js
 * Background Service Worker for NairaTag Manifest V3 Extension.
 */

const API_BASE = 'http://127.0.0.1:8787';

chrome.runtime.onInstalled.addListener(() => {
  console.log('[NairaTag] Extension installed. Initializing context menu & cache.');

  if (chrome.contextMenus) {
    chrome.contextMenus.create({
      id: 'nairatag-resolve-selection',
      title: 'Resolve "%s" with NairaTag',
      contexts: ['selection']
    });
  }
});

// Handle context menu clicks
if (chrome.contextMenus) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'nairatag-resolve-selection' && info.selectionText) {
      const clean = info.selectionText.replace(/^₦/, '').trim();
      chrome.tabs.create({
        url: `https://nairatag.ng/tag/${encodeURIComponent(clean)}`
      });
    }
  });
}

// Message handler between content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'RESOLVE_TAG') {
    const tag = (request.tag || '').replace(/^₦/, '').toLowerCase();
    fetch(`${API_BASE}/api/agent/wallet-info?tag=${encodeURIComponent(tag)}`)
      .then(res => res.json())
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // async
  }
});
