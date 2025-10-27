// Utility functions for date formatting and escaping HTML

/**
 * Pads a number to two digits (e.g. 9 → "09").
 *
 * @param {number} n The number to pad.
 * @returns {string} The padded string.
 */
function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

/**
 * Formats a Date object as YYYY-MM-DD.
 *
 * @param {Date} date The date to format.
 * @returns {string} The formatted date string.
 */
function toYMD(date) {
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
}

/**
 * Escapes special characters for safe insertion into HTML. Used primarily
 * inside template strings to avoid XSS when rendering untrusted data.
 *
 * @param {string} s Input string
 * @returns {string} Escaped string
 */
function esc(s) {
  return String(s || '').replace(/[&<>"']/g, function (m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}

/**
 * Another name for esc() maintained for backward compatibility. Both
 * functions perform the same escaping and can be used interchangeably.
 *
 * @param {string} s Input string
 * @returns {string} Escaped string
 */
function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, function (m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}