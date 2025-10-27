// Bootstraps the Gantt chart when the DOM is ready

// Declare shared variables used across helper modules. These are assigned
// during the DOMContentLoaded handler below but declared here so that
// functions defined in other files can close over them.
var cfg;
var currentView;
var showNoDate;
var containerSel;
var container;
var panel;

// Wire up all user interface elements when the DOM is ready. This attaches
// click handlers for view switching, toggles for showing tasks without
// dates, loads the initial data set and sets up global search handling.
document.addEventListener('DOMContentLoaded', function () {
  containerSel = '#frappe-gantt';
  container = document.querySelector(containerSel);
  if (!container) return;
  // Ensure the v1 UMD library is present
  if (typeof Gantt === 'undefined') {
    console.error('Frappe Gantt v1 UMD not loaded – 404 auf plugins/FrappeGantt/Assets/js/frappe-gantt.umd.js?');
    showToast('Gantt library not loaded', 'error');
    return;
  }
  cfg = parseConfigFromDataAttr(container);
  currentView = cfg.defaultViewMode || 'Week';
  showNoDate = normalizeBool(cfg.showNoDate);
  // Create the persistent task panel adjacent to the Gantt container
  panel = document.getElementById('fg-task-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'fg-task-panel';
    panel.className = 'fg-task-panel';
container.insertAdjacentElement('beforebegin', panel);

  }

// Helper function to hide the task panel
function hideTaskPanel() {
  if (!panel) return;
  panel.innerHTML = '';
  panel.classList.remove('is-visible');
}

// 3a) Click inside the Gantt area: if the click is not on a task or handle, hide the panel
container.addEventListener('click', function (ev) {
  if (panel && panel.contains(ev.target)) return; // Klick im Panel: ignorieren

  // Determine whether the click occurred on a task bar, label, arrow or handle
  const onTask = ev.target.closest('.bar-wrapper, .bar, .bar-label, .arrow, .handle');

  // Only clicks on empty areas should trigger closing
  if (!onTask) hideTaskPanel();
}, true);

// 3b) The ESC key also closes the panel
document.addEventListener('keydown', function (ev) {
  if (ev.key === 'Escape') hideTaskPanel();
}, true);


  // Hook up search on toolbar (outside the task panel)
  fgWireSearch();
  // View mode buttons (Day/Week/Month/Year etc.)
  var btns = document.querySelectorAll('.gantt-mode-btn, .gantt-toolbar [data-view]');
  btns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var mode = this.getAttribute('data-mode') || this.getAttribute('data-view');
      if (!mode) return;
      currentView = mode;
      btns.forEach(function (b) {
        if (b.classList) b.classList.remove('active');
      });
      if (this.classList) this.classList.add('active');
      if (window._frappeGantt && typeof window._frappeGantt.change_view_mode === 'function') {
        window._frappeGantt.change_view_mode(currentView);
      }
    });
  });
  // Toggle for showing tasks without dates
  var toggleNoDate = document.getElementById('toggle-show-no-date') || document.getElementById('show-no-date');
  if (toggleNoDate) {
    toggleNoDate.checked = !!showNoDate;
    toggleNoDate.addEventListener('change', function () {
      showNoDate = !!this.checked;
      loadChart();
    });
  }

// --- Cleanly manage the modal open/close state ---
(function () {
  const setOpen = () => document.body.classList.add('fg-modal-open');
  const clearOpen = () => document.body.classList.remove('fg-modal-open');

  // 1) When any Kanboard modal link is clicked, add the open class
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest('a.js-modal-large, a.js-modal-medium, a.js-modal-small');
    if (a) setOpen();
  }, true);

  // 2) Close via the overlay or any close buttons
  document.addEventListener('click', (ev) => {
    if (
      ev.target.id === 'modal-overlay' ||
      ev.target.closest('#modal-close-button, .js-modal-close, .modal-close, .ui-dialog-titlebar-close')
    ) {
      clearOpen();
    }
  }, true);

  // 3) Close via the ESC key
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') clearOpen();
  }, true);

  // 4) Close in response to the Kanboard event (if fired)
  document.addEventListener('kb.modal.closed', clearOpen);

  // 5) Fallback: remove the open class when the overlay element is removed from the DOM
  const mo = new MutationObserver(() => {
    if (!document.getElementById('modal-overlay')) clearOpen();
  });
  mo.observe(document.body, { childList: true, subtree: true });

  // 6) On form submit inside the modal, clear the open state shortly afterwards
  document.addEventListener('submit', (ev) => {
    if (ev.target.closest('#modal-box')) {
      setTimeout(clearOpen, 300);
    }
  }, true);
})();

  // Kick off the initial load
  loadChart();
});

