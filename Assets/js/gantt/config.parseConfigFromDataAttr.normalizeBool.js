// Configuration utilities

/**
 * Parses the JSON stored in the data-config attribute on a container element.
 * If the JSON cannot be parsed, returns an empty object and logs the error.
 *
 * @param {HTMLElement} el The element containing the data-config attribute.
 * @returns {Object} Parsed configuration object.
 */
function parseConfigFromDataAttr(el) {
  try {
    var raw = el.getAttribute('data-config') || '{}';
    return JSON.parse(raw);
  } catch (e) {
    console.error('Invalid data-config JSON:', e);
    return {};
  }
}

/**
 * Normalizes a value to boolean. Accepts booleans, truthy/falsey
 * strings ("true"/"false"), and falls back to the truthiness of the
 * provided value.
 *
 * @param {*} v The value to normalize.
 * @returns {boolean} Normalized boolean value.
 */
function normalizeBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.toLowerCase() === 'true';
  return !!v;
}