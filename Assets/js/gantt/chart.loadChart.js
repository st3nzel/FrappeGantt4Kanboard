// Responsible for fetching, sanitising and rendering chart data

/**
 * Fetches task data from the server and prepares it for the Gantt chart. It
 * handles HTTP and parsing errors, sanitises custom_class values, filters
 * tasks based on the showNoDate toggle, injects colour CSS and finally
 * calls initGantt with the processed list. Errors are surfaced to the
 * user via toast notifications.
 */
function loadChart() {
  var url = buildDataUrl();
  if (!url) {
    console.error('Missing dataUrl');
    showToast('Failed to load Gantt data.', 'error');
    return;
  }
  fetch(url, {
    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    credentials: 'same-origin'
  })
    .then(function (r) {
      return r.text().then(function (t) {
        return { ok: r.ok, status: r.status, text: t };
      });
    })
    .then(function (res) {
      if (!res.ok) {
        console.error('Gantt data HTTP', res.status, res.text.slice(0, 400));
        throw new Error('HTTP ' + res.status);
      }
      var data;
      try {
        data = JSON.parse(res.text);
      } catch (e) {
        console.error('Gantt data not JSON. Preview:', res.text.slice(0, 400));
        throw e;
      }
      var tasks = Array.isArray(data) ? data.slice() : [];
      // Sanitize and decorate tasks
      tasks = tasks.map(function (t) {
        if (!t) return t;
        var tokens = String(t.custom_class || '')
          .trim()
          .split(/\s+/)
          .filter(Boolean);
        if (t.flags && t.flags.originally_no_dates) {
          if (!tokens.includes('bar-no-dates')) tokens.push('bar-no-dates');
        }
        var hasDates = Boolean(t.start && t.end);
        if (hasDates && !tokens.includes('bar-no-dates')) {
          var raw = (t.kb_color || t.color_id || t.color || '')
            .toString()
            .trim()
            .toLowerCase();
          var colorKey = raw.replace(/[^a-z0-9_-]/g, '');
          if (colorKey) tokens.push('kbcolor-' + colorKey);
        }
        t.custom_class = tokens.join(' ');
        return t;
      });
      if (!showNoDate) {
        tasks = tasks.filter(function (t) {
          return !(t && t.flags && t.flags.originally_no_dates);
        });
      }

tasks.sort(function(a, b) {
  const ai = (a && a._row_index != null) ? a._row_index : 1e9;
  const bi = (b && b._row_index != null) ? b._row_index : 1e9;
  if (ai !== bi) return ai - bi;
  return (parseInt(a.id, 10) || 0) - (parseInt(b.id, 10) || 0);
});



      injectKanboardColorCSS(tasks);
      initGantt(tasks);
    })
    .catch(function (e) {
      console.error(e);
      showToast('Failed to load Gantt data.', 'error');
    });
}
