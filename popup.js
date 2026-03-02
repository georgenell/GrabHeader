/** Load button config from sync storage, falling back to defaults. */
function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('buttons', (result) => {
      resolve(result.buttons && result.buttons.length ? result.buttons : DEFAULT_CONFIG);
    });
  });
}

/** Load captured request records for the active tab from session storage. */
function getRequestsForTab(tabId) {
  return new Promise((resolve) => {
    const key = `headers_${tabId}`;
    chrome.storage.session.get(key, (result) => {
      resolve(result[key] || []);
    });
  });
}

/**
 * Apply an optional regex to a header value.
 * - If the regex has a capture group, returns group 1 of the first match.
 * - If no capture group, returns the full match.
 * - If no match or regex is empty, returns the original value.
 */
function applyRegex(value, regexStr) {
  if (!regexStr) return value;
  try {
    const re = new RegExp(regexStr);
    const match = re.exec(value);
    if (!match) return value;
    return match[1] !== undefined ? match[1] : match[0];
  } catch {
    // Invalid regex – return raw value
    return value;
  }
}

/**
 * Search captured requests (newest first) for a header by name (case-insensitive).
 * Returns the value string, or null if not found in any request.
 */
function findHeader(requests, headerName) {
  const lower = headerName.toLowerCase();
  for (const req of requests) {
    for (const h of req.headers) {
      if (h.name === lower) return h.value;
    }
  }
  return null;
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [config, requests] = await Promise.all([
    getConfig(),
    tab ? getRequestsForTab(tab.id) : Promise.resolve([]),
  ]);

  const container = document.getElementById('buttons');

  if (!config.length) {
    container.innerHTML =
      '<p class="empty-msg">No buttons configured. <a href="#" id="go-options">Open Options</a>.</p>';
    document.getElementById('go-options').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  for (const btn of config) {
    const el = document.createElement('button');
    el.className = 'grab-btn';
    el.textContent = `Grab ${btn.name}`;

    el.addEventListener('click', async () => {
      const raw = findHeader(requests, btn.header);

      if (raw === null) {
        el.textContent = `✗ ${btn.header} not found`;
        el.classList.add('missing');
        setTimeout(() => {
          el.textContent = `Grab ${btn.name}`;
          el.classList.remove('missing');
        }, 2000);
        return;
      }

      const value = applyRegex(raw, btn.regex);
      await navigator.clipboard.writeText(value);

      el.textContent = `✓ Copied!`;
      el.classList.add('copied');
      setTimeout(() => {
        el.textContent = `Grab ${btn.name}`;
        el.classList.remove('copied');
      }, 1500);
    });

    container.appendChild(el);
  }

  document.getElementById('options-link').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

init();
