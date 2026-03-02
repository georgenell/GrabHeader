// Service worker: captures request and response headers per tab.
// Headers are stored under a per-tab key ('headers_<tabId>') so switching
// between tabs never clears another tab's captured data. Entries are cleared
// only when the tab navigates to a new URL or is closed.

const MAX_ENTRIES = 100;

// Firefox exposes sensitive headers without extraHeaders; Chrome requires it.
const isFirefox = typeof globalThis.browser !== 'undefined';
const reqSpec  = isFirefox ? ['requestHeaders']  : ['requestHeaders',  'extraHeaders'];
const respSpec = isFirefox ? ['responseHeaders'] : ['responseHeaders', 'extraHeaders'];

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

// Track the last-known origin per tab so we can detect cross-origin navigations.
const tabOrigins = new Map();

// Clear per-tab headers only when the tab navigates to a different origin.
// Same-origin navigation (SPA route changes, multi-page apps on the same host)
// keeps the headers so tokens captured at initial page-load remain available.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading' && changeInfo.url) {
    try {
      const newOrigin = new URL(changeInfo.url).origin;
      const prevOrigin = tabOrigins.get(tabId);
      if (prevOrigin && prevOrigin !== newOrigin) {
        chrome.storage.session.remove(tabKey(tabId));
      }
      tabOrigins.set(tabId, newOrigin);
    } catch {
      chrome.storage.session.remove(tabKey(tabId)); // unparseable URL – clear to be safe
    }
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
  reqSpec
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
  respSpec
);

// Clear per-tab headers and origin tracking when the tab is closed.
chrome.tabs.onRemoved.addListener((tabId) => {
  tabOrigins.delete(tabId);
  chrome.storage.session.remove(tabKey(tabId));
});
