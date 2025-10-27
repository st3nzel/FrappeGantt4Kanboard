// Functions related to color parsing and manipulation for Kanboard integration

/**
 * Parses a CSS rgb() or hexadecimal color string into an object with r, g, b
 * properties. Returns null for unrecognized formats.
 *
 * @param {string} str The colour string to parse.
 * @returns {{r:number,g:number,b:number}|null} Parsed RGB object or null.
 */
function parseRgb(str) {
  if (!str) return null;
  var m = String(str).match(/^\s*rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)\s*$/i);
  if (m) {
    return {
      r: Math.min(255, parseInt(m[1], 10)),
      g: Math.min(255, parseInt(m[2], 10)),
      b: Math.min(255, parseInt(m[3], 10))
    };
  }
  var h = String(str).trim();
  if (/^#([0-9a-f]{6})$/i.test(h)) {
    var v = h.slice(1);
    return {
      r: parseInt(v.slice(0, 2), 16),
      g: parseInt(v.slice(2, 4), 16),
      b: parseInt(v.slice(4, 6), 16)
    };
  }
  return null;
}

/**
 * Darkens an RGB colour by a given amount. The amount should be between 0
 * (no change) and 1 (black). Values outside this range are clamped.
 *
 * @param {{r:number,g:number,b:number}} rgb Original colour
 * @param {number} amt Amount to darken (0–1)
 * @returns {{r:number,g:number,b:number}} Darkened colour
 */
function darkenRgb(rgb, amt) {
  amt = Math.max(0, Math.min(1, amt || 0.15));
  return {
    r: Math.max(0, Math.round(rgb.r * (1 - amt))),
    g: Math.max(0, Math.round(rgb.g * (1 - amt))),
    b: Math.max(0, Math.round(rgb.b * (1 - amt)))
  };
}

/**
 * Converts an RGB object back into an rgb() string.
 *
 * @param {{r:number,g:number,b:number}} rgb Colour object
 * @returns {string} CSS rgb() representation
 */
function toRgbString(rgb) {
  return 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')';
}

/**
 * Injects CSS rules into the document head for each unique Kanboard colour
 * encountered in the provided task list. The generated rules style Gantt
 * bars and their progress rectangles according to Kanboard colour values.
 *
 * @param {Array<Object>} tasks Array of task objects with colour info
 */
function injectKanboardColorCSS(tasks) {
  var map = {};
  (tasks || []).forEach(function (t) {
    if (!t || !t.color_id || !t.color || !t.color.background) return;
    var id = String(t.color_id).replace(/\s+/g, '-').toLowerCase();
    if (map[id]) return;
    var bg = t.color.background;
    var bd = t.color.border || t.color.background;
    var rgbBg = parseRgb(bg) || parseRgb('#ffffff');
    var rgbBd = parseRgb(bd) || rgbBg;
    var prog = toRgbString(darkenRgb(rgbBd, 0.22));
    map[id] = { bg: bg, border: bd, progress: prog };
  });
  var css = '';
  Object.keys(map).forEach(function (id) {
    var c = map[id];
    css += '.gantt .bar-wrapper:not(.bar-no-dates)[class*="kbcolor-' + id + '"] rect.bar{fill:' + c.bg + ';stroke:' + c.border + ';stroke-width:1px;}\n';
    css += '.gantt .bar-wrapper:not(.bar-no-dates)[class*="kbcolor-' + id + '"] rect.bar-progress{fill:' + c.progress + ';}\n';
  });
  var styleId = 'fg-kbcolor-style';
  var tag = document.getElementById(styleId);
  if (!tag) {
    tag = document.createElement('style');
    tag.id = styleId;
    document.head.appendChild(tag);
  }
  tag.textContent = css;
}