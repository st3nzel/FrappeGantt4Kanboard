// panel.renderTaskPanel.js
// Builds the task panel within the Frappe popup, supporting inline save,
// the add link button and the remove icon

function renderTaskPanel(t, host) {
  // Helpers
  const escapeHtml = (s) =>
    (s == null ? '' : String(s))
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  const ymd = (v) => {
    if (!v) return '';
    const d = new Date(v);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  };

  host.setAttribute('role', 'toolbar');
  host.setAttribute('aria-label', 'Task-Leiste');

  // --- MARKUP ---
  host.innerHTML = `
    <div class="fg-bar-grid" data-task-id="${t.id}">
      <div class="fg-area fg-header">
        <div class="fg-title-wrap">
          <a class="fg-title" href="${t.url || '#'}" title="${escapeHtml(t.title)}">
            ${escapeHtml(t.title)}
          </a>
          <div class="fg-id">#${t.id}</div>
        </div>
        <div class="fg-meta">
          ${t.status ? `<span class="chip">Status: ${escapeHtml(t.status)}</span>` : ''}
          ${t.priority != null ? `<span class="chip">Priorität: ${t.priority}</span>` : ''}
          ${t.assignee ? `<span class="chip chip--user">${escapeHtml(t.assignee)}</span>` : ''}
        </div>
      </div>

      <div class="fg-area fg-dates">
        <div class="row2">
          <div class="field">
            <label for="fg-start">Start</label>
            <input type="date" id="fg-start" value="${ymd(t.start)}">
          </div>
          <div class="field">
            <label for="fg-end">Ende</label>
            <input type="date" id="fg-end" value="${ymd(t.end)}">
          </div>
        </div>
        <div class="field field--narrow">
          <label for="fg-duration">Dauer</label>
          <input type="number" id="fg-duration" min="0" step="1" value="${t.duration || 0}">
        </div>
      </div>

      <div class="fg-area fg-relations">
        <div class="fg-rel-search">
          <div class="field">
            <label for="fg-link-type">Link</label>
            <select id="fg-link-type">
              <option value="1">relates to</option><option value="2">blocks</option>
              <option value="3">is blocked by</option><option value="4">duplicates</option>
              <option value="5">is duplicated by</option><option value="6">is a child of</option>
              <option value="7">is a parent of</option><option value="8">targets milestone</option>
              <option value="9">is a milestone of</option><option value="10">fixes</option>
              <option value="11">is fixed by</option>
            </select>
          </div>

          <div class="field fg-field-grow fg-search-with-add">
            <label for="fg-link-search">Ziel</label>

            <div class="fg-input-row">
              <input type="text" id="fg-link-search" placeholder="#ID · Titel (Projekt)" autocomplete="off">
              <button id="fg-link-add" class="btn-icon" type="button"
                      aria-label="Beziehung hinzufügen" title="Beziehung hinzufügen">
                <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
                  <path d="M7 1h2v6h6v2H9v6H7V9H1V7h6z"></path>
                </svg>
              </button>
            </div>

            <input type="hidden" id="fg-link-opp">
            <div id="fg-link-search-results" class="fg-search-results" hidden></div>
          </div>
        </div>

        <div id="fg-links-list" class="fg-rel-list" aria-live="polite"></div>
      </div>
    </div>
  `;

  // --- Populate the search field and fill the link list ---
  if (typeof wireLinkSearch === 'function') wireLinkSearch(t);
      if (typeof fgLoadLinks === 'function') {
    fgLoadLinks(t.id).then(function (res) {
      if (typeof fgRenderLinksList === 'function') fgRenderLinksList((res && res.links) || []);
      if (typeof fgFillTypeDropdown === 'function') fgFillTypeDropdown((res && res.types) || []);
      // Convert remove buttons to icon-only after the first render
      fgStyleRemoveButtons();
    });
  }

  // ========== AUTOSAVE ==========
  function saveFields(partial) {
    const saveUrl = (cfg.saveUrlPattern || '').replace('__TASK__', String(t.id));
    if (!saveUrl) return Promise.resolve();

    const body = new URLSearchParams();
    body.append('csrf_token', cfg.csrfToken || '');

    if (partial.start != null && partial.start !== (t.start || '')) body.append('start', partial.start);
    if (partial.end   != null && partial.end   !== (t.end   || '')) body.append('end', partial.end);
    if (partial.duration != null) {
      const n = parseInt(partial.duration, 10);
      const orig = parseInt(t.duration, 10) || 0;
      if (!Number.isNaN(n) && n >= 0 && n !== orig) body.append('duration', String(n));
    }
    if (Array.from(body.keys()).length === 1) return Promise.resolve(); // nur csrf_token

    return fetch(saveUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': cfg.csrfToken || ''
      },
      credentials: 'same-origin',
      body: body.toString()
    })
    .then(r => r.json().catch(() => ({})))
    .then(res => {
      if (!res || res.ok === false || res.success === false) {
        if (window.showToast) showToast((cfg.messages && cfg.messages.errorSave) || 'Unable to save changes.', 'error');
        return;
      }
      // Update the local baseline values so subsequent changes are compared correctly
      if (partial.start != null) t.start = partial.start;
      if (partial.end   != null) t.end   = partial.end;
      if (partial.duration != null) t.duration = parseInt(partial.duration, 10) || 0;

      // Set flags in sessionStorage to reopen this task after a reload
      try {
        sessionStorage.setItem('fg-reopen-task', String(t.id));
        const gc = document.querySelector('#frappe-gantt .gantt-container');
        if (gc) sessionStorage.setItem('fg-scroll-left', String(gc.scrollLeft || 0));
        if (window._frappeGantt && _frappeGantt.options) {
          const vm = _frappeGantt.options.view_mode || '';
          if (vm) sessionStorage.setItem('fg-view-mode', String(vm));
        }
      } catch {}

      if (window.showToast) showToast((cfg.messages && cfg.messages.saved) || 'Saved', 'success');

      if (typeof loadChart === 'function') {
        loadChart(); // rebuild the Gantt chart; the reopen logic runs there
      } else {
        window.location.reload();
      }
    })
    .catch(e => {
      console.error('[FG][autosave] ERR', e);
      if (window.showToast) showToast((cfg.messages && cfg.messages.errorSave) || 'Unable to save changes.', 'error');
    });
  }

  // Autosave: Inputs binden
  const startEl = host.querySelector('#fg-start');
  const endEl   = host.querySelector('#fg-end');
  const durEl   = host.querySelector('#fg-duration');

  if (startEl) startEl.addEventListener('change', () => {
    saveFields({ start: startEl.value.trim() });
  });
  if (endEl) endEl.addEventListener('change', () => {
    saveFields({ end: endEl.value.trim() });
  });
  if (durEl) durEl.addEventListener('change', () => {
    saveFields({ duration: durEl.value.trim() });
  });

  // --- Add relationships via the “+” button; auto‑create has been removed ---
  const typeSel = host.querySelector('#fg-link-type');
  const oppInp  = host.querySelector('#fg-link-opp');
  const addBtn  = host.querySelector('#fg-link-add');

  if (addBtn) addBtn.addEventListener('click', function () {
    if (!(cfg && cfg.links && cfg.links.create)) return;
    if (!oppInp || !oppInp.value) { if (window.showToast) showToast('Bitte ein Ziel aus der Suche wählen.', 'error'); return; }
    const linkId = String((typeSel && typeSel.value) || '');
    if (!linkId) { if (window.showToast) showToast('Bitte einen Link-Typ wählen.', 'error'); return; }

    const form = new URLSearchParams();
    form.set('task_id', String(t.id));
    form.set('opposite_task_id', String(oppInp.value));
    form.set('link_id', linkId);
    form.set('csrf_token', cfg.csrfToken || '');

    fetch(cfg.links.create, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': cfg.csrfToken || ''
      },
      credentials: 'same-origin',
      body: form.toString()
    })
    .then(r => r.json().catch(() => ({})))
    .then(j => {
      if (!j || j.ok === false) return;
      // Reset the input fields and reload the links list
      oppInp.value = '';
      const inp = host.querySelector('#fg-link-search'); if (inp) inp.value = '';
      if (typeof fgLoadLinks === 'function' && typeof fgRenderLinksList === 'function') {
        fgLoadLinks(t.id).then(function (res) {
          fgRenderLinksList((res && res.links) || []);
          fgStyleRemoveButtons(); // restyle the buttons after each re-render
        });
      }
      if (window.showToast) showToast('Beziehung hinzugefügt', 'success');
    })
    .catch(e => { console.error('create link failed', e); });
  });

  // --- Render remove buttons in the list as an “X” icon (avoid infinite recursion) ---
  function fgStyleRemoveButtons() {
  const list = host.querySelector('#fg-links-list');
  if (!list) return;

  list.querySelectorAll('button.fg-remove').forEach(btn => {
    // 1) Insert the X icon (idempotent)
    if (btn.dataset.iconized !== '1') {
      btn.classList.add('btn-icon');
      btn.setAttribute('aria-label', 'Beziehung entfernen');
      btn.setAttribute('title', 'Beziehung entfernen');
      btn.innerHTML = `
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
          <path d="M3.2 3.2l9.6 9.6M12.8 3.2L3.2 12.8"
                stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
      btn.dataset.iconized = '1';
    }

    // 2) Position the “seed” label to the right of the X if present; otherwise place the X at the far right
    const row = btn.closest('.fg-link-row');
    const seed = row ? row.querySelector('.fg-seed') : null;

    if (seed) {
      // Preserve the input element and set the label text on the “seed” container
      const input = seed.querySelector('input');
      if (input) {
        seed.innerHTML = '';          // clear the contents so we can set the text anew
        seed.appendChild(input);
        seed.append(' seed');
      }
      seed.classList.add('fg-seed-inline');
      seed.style.marginLeft = 'auto'; // push the seed block to the right (per flexbox auto margins)
      btn.style.marginLeft = '8px';   // place the X directly to its right
    } else {
      // If there is no checkbox, place the X at the far right
      btn.style.marginLeft = 'auto';
    }
  });
}

  fgStyleRemoveButtons();

  // When new list entries are added, reapply styling (observe only childList, not subtree/attributes)
  const listEl = host.querySelector('#fg-links-list');
  if (listEl && typeof MutationObserver !== 'undefined') {
    const mo = new MutationObserver(mList => {
      let hasAdded = false;
      for (let i = 0; i < mList.length; i++) {
        if (mList[i].addedNodes && mList[i].addedNodes.length) { hasAdded = true; break; }
      }
      if (hasAdded) fgStyleRemoveButtons();
    });
    mo.observe(listEl, { childList: true });
  }
}
