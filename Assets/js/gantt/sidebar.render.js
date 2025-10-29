// sidebar.render.js – renders and updates the task sidebar on the left
(function () {
  'use strict';

  var SIDEBAR_CLICK = 'link'; // 'link' | 'kb-modal' | 'popup'

  function ensureLayout() {
    var container = document.querySelector('#frappe-gantt');
    if (!container) return null;
    if (!container.parentElement.classList.contains('fg-layout')) {
      var wrap = document.createElement('div');
      wrap.className = 'fg-layout';
      container.parentNode.insertBefore(wrap, container);

      var side = document.createElement('div');
      side.id = 'fg-sidebar';
      side.innerHTML =
        '<div class="fg-side-header">Tasks</div>' +
        '<div class="fg-side-list" id="fg-side-list"></div>';

      wrap.appendChild(side);
      wrap.appendChild(container);
    }
    return {
      root: document.getElementById('frappe-gantt'),
      sidebar: document.getElementById('fg-sidebar'),
      list: document.getElementById('fg-side-list')
    };
  }

  // Compute the precise top of the grid area (top edge of the first row) in CSS pixels relative to #frappe-gantt
function getGridOffset(root) {
  const svg = root.querySelector('svg.gantt');
  const firstRow = svg && svg.querySelector('.grid .grid-row');
  if (!svg || !firstRow) return 0;
  const y = parseFloat(firstRow.getAttribute('y') || '0');        // e.g. 105
  // Get bar_height from the Gantt options (fallback to 30 if undefined)
  const gantt = window.__fg_last_gantt__;
  const barH  = (gantt && gantt.options && gantt.options.bar_height) || 30;
  // Adjustment: grid top minus half the bar height (e.g. 105 − 15 = 90)
  const relTop = svg.getBoundingClientRect().top - root.getBoundingClientRect().top;
  return Math.round(relTop + y - barH / 2);
}


  function renderSidebar(tasks, gantt) {
    var els = ensureLayout();
    if (!els) return;

    // === 1) Copy relevant options from the Gantt instance ===
    var barH = (gantt && gantt.options && gantt.options.bar_height) || 30;
    var pad  = (gantt && gantt.options && gantt.options.padding)    || 18;
    var rowH = barH + pad;

    // === 2) Add vertical padding to align the sidebar with the grid header ===
    //       This ensures the "Tasks" header sits directly above the list without a large gap
    var offset = getGridOffset(els.root);
    els.sidebar.style.paddingTop = Math.round(offset) + 'px';
    els.list.style.marginTop = '0'; // alte Variante entfernen

    // === 3) Order the entries to match the chart
    tasks = (tasks || []).slice().sort(function (a, b) {
      var ai = a && a._row_index != null ? a._row_index : 1e9;
      var bi = b && b._row_index != null ? b._row_index : 1e9;
      if (ai !== bi) return ai - bi;
      return (+a.id || 0) - (+b.id || 0);
    });

    // === 4) Build the list (no additional pad/2 adjustment needed)
    els.list.innerHTML = '';
    els.list.style.height = Math.ceil(tasks.length * rowH) + 'px';

    tasks.forEach(function (t, i) {
      var a = document.createElement('a');
      a.className = 'fg-side-item';
      a.dataset.id = t.id;
      a.textContent = t.name || ('#' + t.id);
      a.style.top = Math.round(i * rowH) + 'px';
      a.style.height = barH + 'px';
      a.style.paddingLeft = (12 + ((t._level || 0) * 16)) + 'px';
      // … innerhalb der Stelle, an der für jeden Task 'a' erzeugt wird

var safe = (t.name || ('#' + t.id)).replace(/[&<>"']/g, function (s) {
  return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]);
});

a.innerHTML =
  '<span class="fg-side-title">' + safe + '</span>' +
  '<button type="button" class="fg-side-edit btn-icon" ' +
  ' title="Task bearbeiten" aria-label="Task bearbeiten" data-id="' + String(t.id) + '">&#9998;</button>';
var editBtn = a.querySelector('.fg-side-edit');
if (editBtn) {
  editBtn.addEventListener('click', function (ev) {
    ev.preventDefault();
    ev.stopPropagation();
    if (typeof window.openTaskPopup === 'function') {
      window.openTaskPopup(t.id);
    }
  });
}

      if (SIDEBAR_CLICK === 'kb-modal') {
        a.href = t.url || '#';
        a.classList.add('js-modal-large');
      } else if (SIDEBAR_CLICK === 'popup') {
        a.href = '#';
        a.addEventListener('click', function (ev) {
          ev.preventDefault();
          var target = els.root.querySelector('.bar-wrapper[data-id="'+ t.id +'"] .bar-group');
          if (target) {
            var evName = (gantt && gantt.options && gantt.options.popup_on) || 'click'; // click/hover
            target.dispatchEvent(new MouseEvent(evName, { bubbles: true }));
          }
        });
      } else {
        a.href = t.url || '#';
      }

      els.list.appendChild(a);
    });
  }

  // This function is called by afterRender(...) in the plugin
  window.renderSidebar = renderSidebar;
})();
