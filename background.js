// Service worker: captures both request and response headers for all tabs and
// stores them in chrome.storage.session, keyed by tabId. Keeps the last
// MAX_ENTRIES entries per tab (newest first) so the popup can search across
// page loads and XHR/fetch API calls.
//
// Request headers (e.g. Authorization, X-Org-Id) are captured via onSendHeaders.
// Response headers are captured via onCompleted. Each fires a separate store
// entry so that neither depends on the other surviving a service-worker restart.

const MAX_ENTRIES_PER_TAB = 100;

function storeHeaders(tabId, url, headers) {
  if (tabId < 0 || !headers.length) return;
  const key = `tab_${tabId}`;
  chrome.storage.session.get(key, (result) => {
    const entries = result[key] || [];
    entries.unshift({ url, headers }); // newest first
    if (entries.length > MAX_ENTRIES_PER_TAB) {
      entries.length = MAX_ENTRIES_PER_TAB;
    }
    chrome.storage.session.set({ [key]: entries });
  });
}

// Capture request headers (Authorization, X-Org-Id, etc. sent by the page).
// extraHeaders is required for Authorization – Chrome normally hides it.
chrome.webRequest.onSendHeaders.addListener(
  (details) => {
    if (!details.requestHeaders || details.tabId < 0) return;
    const headers = details.requestHeaders.map((h) => ({
      name: h.name.toLowerCase(),
      value: h.value || '',
    }));
    storeHeaders(details.tabId, details.url, headers);
  },
  { urls: ['<all_urls>'] },
  ['requestHeaders', 'extraHeaders']
);

// Capture response headers as well (in case a button targets a response header).
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (!details.responseHeaders || details.tabId < 0) return;
    const headers = details.responseHeaders.map((h) => ({
      name: h.name.toLowerCase(),
      value: h.value || '',
    }));
    storeHeaders(details.tabId, details.url, headers);
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders', 'extraHeaders']
);

// Clean up stored headers when a tab is closed.
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(`tab_${tabId}`);
});
