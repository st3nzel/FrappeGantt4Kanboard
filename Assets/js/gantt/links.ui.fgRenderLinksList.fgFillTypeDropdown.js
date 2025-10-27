// UI helpers for rendering and managing the internal links panel

/**
 * Renders a list of internal links into the designated container. Each row
 * includes a remove button wired up to fgOnRemoveLink. If no links are
 * provided, displays a fallback message.
 *
 * @param {Array<Object>} links Array of link objects
 */
function fgRenderLinksList(links) {
  const box = document.getElementById('fg-links-list');
  if (!box) return;

  // Current task ID (used as the starting point for directional arrows)
  const currentTaskId = Number(
    box.getAttribute('data-current-task-id') ||
    (window.FG && window.FG.currentTaskId) ||
    window.currentTaskId ||
    0
  );

  // IDs of the "relates to" link type from configuration (e.g. "1" or "1,7")
  const relatesIds = String(cfg && cfg.dependencyLinkIds || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  // Helper: detect whether a link is of type "relates to" (also check the label as a safety measure)
  const isRelates = (l) => {
    const byId = relatesIds.includes(String(l.link_id));
    const label = String(l.link_label || '').toLowerCase();
    const byLabel = (label === 'relates to' || label === 'relates');
    return byId || byLabel;
  };

  if (!Array.isArray(links) || links.length === 0) {
    // Display a message when there are no internal links (message remains in German pending translation)
    box.innerHTML = '<em>Keine internen Links</em>';
    return;
  }

  box.innerHTML = links.map(l => {
    const showSeed = isRelates(l);
    const checked  = l.seed_active ? 'checked' : '';
    const seedBox  = showSeed
      ? `
        <label class="fg-seed" style="margin-left:8px; white-space:nowrap;">
          <input type="checkbox"
                 class="fg-rel-seed"
                 data-tlid="${l.task_link_id}"
                 ${checked}>
          Pfeil von diesem Task
        </label>`
      : '';

    return `
      <div class="fg-link-row" data-task-link-id="${l.task_link_id}">
        <span class="fg-col-type">${esc(l.link_label || ('#' + l.link_id))}</span>
        <span class="fg-col-target">#${l.opposite_task_id} · ${esc(l.opposite_title || '')} (P:${l.opposite_project})</span>
        ${seedBox}
        <button class="btn fg-remove" style="margin-left:auto;">Remove</button>
      </div>
    `;
  }).join('');

  // Attach click handlers for each remove button
  box.querySelectorAll('.fg-remove').forEach(btn => {
    btn.addEventListener('click', fgOnRemoveLink);
  });

  // Seed checkboxes (only present for "relates to" links)
  box.querySelectorAll('input.fg-rel-seed').forEach(cb => {
    cb.addEventListener('change', async () => {
      const tlid   = cb.getAttribute('data-tlid');
      const active = cb.checked;

      // Persist or clear the seed on the server
      let ok = false;
      try {
        const res = await fgSetRelSeed(tlid, active, currentTaskId);
        ok = !!(res && res.ok);
      } catch (e) {
        ok = false;
      }

      if (!ok) {
        // Revert the checkbox state if the operation fails
        cb.checked = !active;
        return;
      }

      // After a successful update, rebuild the chart so arrows are refreshed
      if (typeof loadChart === 'function') loadChart();
    });
  });
}


/**
 * Populates a select element with the provided link types. Each type has
 * an id and label. The select is only populated once.
 *
 * @param {Array<Object>} types Array of type objects
 */
function fgFillTypeDropdown(types) {
  const sel = document.getElementById('fg-link-type');
  if (!sel || !Array.isArray(types)) return;
  if (sel.options.length) return; // only populate once
  types.forEach(t => {
    const opt = document.createElement('option');
    opt.value = String(t.id);
    opt.textContent = t.label;
    sel.appendChild(opt);
  });
}