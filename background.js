// Service worker: captures request and response headers only for the currently
// active tab. All captured entries are stored under a single session key
// ('headers') so there's no per-tab accumulation. The entry list is cleared
// whenever the user switches to a different tab or window.

const MAX_ENTRIES = 100;
const STORAGE_KEY = 'headers';

// Track which tab is currently active. Initialised at startup and kept
// up-to-date via tab/window events below.
let activeTabId = null;

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs.length) activeTabId = tabs[0].id;
});

// Switched tab within a window → clear stored headers, track new tab.
chrome.tabs.onActivated.addListener((info) => {
  activeTabId = info.tabId;
  chrome.storage.session.set({ [STORAGE_KEY]: [] });
});

// Focused a different window → clear stored headers, track that window's active tab.
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  chrome.tabs.query({ active: true, windowId }, (tabs) => {
    if (!tabs.length) return;
    activeTabId = tabs[0].id;
    chrome.storage.session.set({ [STORAGE_KEY]: [] });
  });
});

function storeHeaders(tabId, url, headers) {
  if (tabId < 0 || tabId !== activeTabId || !headers.length) return;
  chrome.storage.session.get(STORAGE_KEY, (result) => {
    const entries = result[STORAGE_KEY] || [];
    entries.unshift({ url, headers }); // newest first
    if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
    chrome.storage.session.set({ [STORAGE_KEY]: entries });
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

// If the active tab is closed, clear the stored headers.
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeTabId) {
    activeTabId = null;
    chrome.storage.session.set({ [STORAGE_KEY]: [] });
  }
});
