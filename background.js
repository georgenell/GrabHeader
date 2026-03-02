// Service worker: captures request and response headers per tab.
// Headers are stored under a per-tab key ('headers_<tabId>') so switching
// between tabs never clears another tab's captured data. Entries are cleared
// only when the tab navigates to a new URL or is closed.

const MAX_ENTRIES = 100;

function tabKey(tabId) {
  return `headers_${tabId}`;
}

function storeHeaders(tabId, url, headers) {
  if (tabId < 0 || !headers.length) return;
  const key = tabKey(tabId);
  chrome.storage.session.get(key, (result) => {
    const entries = result[key] || [];
    entries.unshift({ url, headers }); // newest first
    if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
    chrome.storage.session.set({ [key]: entries });
  });
}

// Clear per-tab headers when the tab navigates to a new page.
// changeInfo.url is only present on a real navigation (not XHR/fragment).
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading' && changeInfo.url) {
    chrome.storage.session.remove(tabKey(tabId));
  }
});

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

// Clear per-tab headers when the tab is closed.
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(tabKey(tabId));
});
