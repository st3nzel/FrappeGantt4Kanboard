// Notification helpers for showing toast messages

/**
 * Displays a toast notification for a few seconds. Types influence the
 * appearance via CSS classes (e.g. 'error', 'success', 'info').
 *
 * @param {string} message The message to display.
 * @param {string} [type] Optional type class (e.g. 'success', 'error').
 */
function showToast(message, type) {
  var el = document.createElement('div');
  el.className = 'gantt-toast ' + (type || 'info');
  el.textContent = message || '';
  document.body.appendChild(el);
  requestAnimationFrame(function () {
    el.classList.add('show');
  });
  setTimeout(function () {
    el.classList.remove('show');
    setTimeout(function () {
      el.remove();
    }, 200);
  }, 3000);
}

/**
 * Convenience wrapper to show a success toast. Looks up translated strings
 * from the cfg.messages object if available.
 */
function toastOk() {
  if (window.showToast) {
    showToast((cfg && cfg.messages && cfg.messages.saved) || 'Saved', 'success');
  }
}

/**
 * Convenience wrapper to show an error toast. Looks up translated strings
 * from the cfg.messages object if available.
 */
function toastError() {
  if (window.showToast) {
    showToast((cfg && cfg.messages && cfg.messages.errorSave) || 'Unable to save changes.', 'error');
  }
}