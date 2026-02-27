// Service worker: captures response headers for all tabs and stores them in
// chrome.storage.session, keyed by tabId. Keeps the last MAX_REQUESTS requests
// per tab (newest first) so the popup can search across page loads and API calls.

const MAX_REQUESTS_PER_TAB = 50;

chrome.webRequest.onCompleted.addListener(
  (details) => {
    // Ignore requests not tied to a real tab (tabId -1 = background/extension requests)
    if (!details.responseHeaders || details.tabId < 0) return;

    const headers = details.responseHeaders.map((h) => ({
      name: h.name.toLowerCase(),
      value: h.value || '',
    }));

    const key = `tab_${details.tabId}`;

    chrome.storage.session.get(key, (result) => {
      const requests = result[key] || [];
      requests.unshift({ url: details.url, headers }); // newest first
      if (requests.length > MAX_REQUESTS_PER_TAB) {
        requests.length = MAX_REQUESTS_PER_TAB;
      }
      chrome.storage.session.set({ [key]: requests });
    });
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders', 'extraHeaders']
);

// Clean up stored headers when a tab is closed.
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(`tab_${tabId}`);
});
