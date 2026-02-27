const DEFAULT_CONFIG = [
  { name: 'Auth Token', header: 'Authorization', regex: '^Bearer\\s+(.+)$' },
  { name: 'Org ID',     header: 'X-Org-Id',       regex: '' },
];

function esc(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Render the current config array into the table body. */
function renderRows(config) {
  const tbody = document.getElementById('config-rows');
  tbody.innerHTML = '';

  config.forEach((item, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" class="f-name"   value="${esc(item.name)}"   placeholder="e.g. Auth Token"    /></td>
      <td><input type="text" class="f-header" value="${esc(item.header)}" placeholder="e.g. Authorization" /></td>
      <td><input type="text" class="f-regex"  value="${esc(item.regex)}"  placeholder="optional regex"      /></td>
      <td><button class="btn-delete" data-index="${i}" title="Remove">✕</button></td>
    `;
    tbody.appendChild(tr);
  });

  // Wire up delete buttons without re-rendering (to preserve unsaved edits in other rows)
  tbody.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      const current = readRows();
      current.splice(parseInt(btn.dataset.index, 10), 1);
      renderRows(current);
    });
  });
}

/** Read the current values from all table rows into a config array. */
function readRows() {
  return Array.from(document.querySelectorAll('#config-rows tr')).map((tr) => ({
    name:   tr.querySelector('.f-name').value.trim(),
    header: tr.querySelector('.f-header').value.trim(),
    regex:  tr.querySelector('.f-regex').value.trim(),
  }));
}

// ── Initialise ──────────────────────────────────────────────────────────────

chrome.storage.sync.get('buttons', (result) => {
  const config = result.buttons && result.buttons.length
    ? result.buttons.map((b) => ({ ...b }))   // clone so we can mutate freely
    : DEFAULT_CONFIG.map((b) => ({ ...b }));

  renderRows(config);

  document.getElementById('btn-add').addEventListener('click', () => {
    const current = readRows();
    current.push({ name: '', header: '', regex: '' });
    renderRows(current);
    // Focus the name field of the newly added row
    const rows = document.querySelectorAll('#config-rows tr');
    rows[rows.length - 1].querySelector('.f-name').focus();
  });

  document.getElementById('btn-save').addEventListener('click', () => {
    // Filter out rows with no name or header (incomplete entries)
    const data = readRows().filter((r) => r.name && r.header);
    chrome.storage.sync.set({ buttons: data }, () => {
      const status = document.getElementById('status');
      status.style.display = 'inline';
      setTimeout(() => { status.style.display = 'none'; }, 2000);
      // Re-render to remove blank rows that were filtered out
      renderRows(data);
    });
  });
});
