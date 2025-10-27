/*
 * chart.initGantt.js – patched module
 *
 *  - Fixes an InvalidCharacterError thrown by classList.add when
 *    task.custom_class contains spaces.
 *  - Normalizes task.custom_class so that only a single token is passed
 *    into the Gantt chart library.
 *  - Additional CSS classes are appended to the bar wrapper after the chart
 *    has finished rendering.
 *  - Adds red/white stripe overlays on bars to indicate blocked-start and
 *    blocker-end statuses.
 *  - Applies re‑decoration after the initial render, after drag/resize
 *    interactions, when switching views, and after chart refreshes.
 */

(function () {
  'use strict';

  // ------------------------------------------------------------
  // Helpers: normalize classes and apply them after rendering
  // ------------------------------------------------------------
  function normalizeTaskClasses(list) {
    return (Array.isArray(list) ? list : []).map(function (t) {
      if (!t) return t;
      var tokens = String(t.custom_class || '').split(/\s+/).filter(Boolean);
      // Capture any additional CSS classes beyond the first
      t._extra_classes = tokens.slice(1);
      // Only pass a single token into the Gantt library; the first token is treated as the primary class
      t.custom_class   = tokens[0] || '';
      return t;
    });
  }

  function applyExtraClasses(root, gantt) {
    var host = root || document;
    var items = (gantt && Array.isArray(gantt.tasks)) ? gantt.tasks : [];
    for (var i = 0; i < items.length; i++) {
      var t = items[i];
      if (!t || !t._extra_classes || !t._extra_classes.length) continue;
      var sel = '.bar-wrapper[data-id="' + String(t.id) + '"]';
      var w = host.querySelector(sel);
      if (!w) continue;
      for (var k = 0; k < t._extra_classes.length; k++) {
        var cls = t._extra_classes[k];
        if (cls) w.classList.add(cls);
      }
    }
  }

  // ------------------------------------------------------------
  // Stripe pattern and overlay edges
  // ------------------------------------------------------------
  function ensureStripePattern(svg) {
    var svgNS = 'http://www.w3.org/2000/svg';
    if (!svg) return;
    if (svg.querySelector('#fg-stripe-redwhite')) return;

    var defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS(svgNS, 'defs');
      svg.insertBefore(defs, svg.firstChild);
    }

    var pattern = document.createElementNS(svgNS, 'pattern');
    pattern.setAttribute('id', 'fg-stripe-redwhite');
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    pattern.setAttribute('width', '6');
    pattern.setAttribute('height', '6');
    pattern.setAttribute('patternTransform', 'rotate(45)');

    var bg = document.createElementNS(svgNS, 'rect');
    bg.setAttribute('width', '6');
    bg.setAttribute('height', '6');
    bg.setAttribute('fill', '#fff');

    var line = document.createElementNS(svgNS, 'path');
    line.setAttribute('d', 'M0 0 L0 6');
    line.setAttribute('stroke', '#d00');
    line.setAttribute('stroke-width', '3');

    pattern.appendChild(bg);
    pattern.appendChild(line);
    defs.appendChild(pattern);
  }

  function decorateBlockedEdges() {
    var root = (typeof containerSel === 'string' && document.querySelector(containerSel)) ||
               document.querySelector('#frappe-gantt') ||
               document.querySelector('#gantt') ||
               document;
    var svg = root.querySelector('svg.gantt');
    if (!svg) return;

    ensureStripePattern(svg);

    // Remove old overlay rectangles before drawing new ones
    var old = svg.querySelectorAll('.fg-edge');
    for (var i = 0; i < old.length; i++) {
      var n = old[i]; if (n && n.parentNode) n.parentNode.removeChild(n);
    }

    var wrappers = root.querySelectorAll('.bar-wrapper');
    for (var j = 0; j < wrappers.length; j++) {
      var w = wrappers[j];
      var bar = w.querySelector('rect.bar');
      if (!bar) continue;

      var hasBlockedStart = w.classList.contains('fg-blocked-start') || bar.classList.contains('fg-blocked-start');
      var hasBlockerEnd   = w.classList.contains('fg-blocker-end')   || bar.classList.contains('fg-blocker-end');
      if (!hasBlockedStart && !hasBlockerEnd) continue;

      var x  = parseFloat(bar.getAttribute('x')) || 0;
      var y  = parseFloat(bar.getAttribute('y')) || 0;
      var h  = parseFloat(bar.getAttribute('height')) || 0;
      var bw = parseFloat(bar.getAttribute('width')) || 0;
      if (!(h > 0 && bw > 0)) continue;

      var ew = Math.min(8, Math.max(4, Math.round(h / 4))); // edge width (min 4, max 8)
      var svgNS = 'http://www.w3.org/2000/svg';

      if (hasBlockedStart) {
        var r1 = document.createElementNS(svgNS, 'rect');
        r1.setAttribute('x', String(x));
        r1.setAttribute('y', String(y));
        r1.setAttribute('width', String(ew));
        r1.setAttribute('height', String(h));
        r1.setAttribute('fill', 'url(#fg-stripe-redwhite)');
        r1.setAttribute('class', 'fg-edge fg-edge-start');
        r1.setAttribute('pointer-events', 'none');
        w.appendChild(r1);
      }
      if (hasBlockerEnd) {
        var r2 = document.createElementNS(svgNS, 'rect');
        r2.setAttribute('x', String(x + bw - ew));
        r2.setAttribute('y', String(y));
        r2.setAttribute('width', String(ew));
        r2.setAttribute('height', String(h));
        r2.setAttribute('fill', 'url(#fg-stripe-redwhite)');
        r2.setAttribute('class', 'fg-edge fg-edge-end');
        r2.setAttribute('pointer-events', 'none');
        w.appendChild(r2);
      }
    }
  }

  function afterRender(root, gantt) {
    applyExtraClasses(root, gantt);
    decorateBlockedEdges();
      if (window.renderSidebar && gantt && Array.isArray(gantt.tasks)) {
    window.renderSidebar(gantt.tasks, gantt);   // <— HIER
  }
  }

  // ------------------------------------------------------------
  // Main initializer (uses global variables containerSel, container, cfg, currentView)
  // ------------------------------------------------------------
  function initGantt(tasks) {
    // Clear any previous content
    container.innerHTML = '';

    var rows = (Array.isArray(tasks) ? tasks.length : 0);
    var bar_height = 30;
    var padding = 18;

    // *** IMPORTANT ***: Normalize classes to prevent InvalidCharacterError
    var tasksNormalized = normalizeTaskClasses(Array.isArray(tasks) ? tasks : []);

    var opts = {
      bar_height: bar_height,
      upper_header_height: 45,
      lower_header_height: 50,
      padding: padding,
      column_width: 140,
      container_height: ((rows + 1) * (bar_height + padding)),
      maintain_pos: true,
      infinite_padding: false,
      arrow_curve: 5,
      move_dependencies: true,
      view_mode: currentView,
      date_format: 'YYYY-MM-DD',
      is_weekend: function (d) { return d.getDay() === 0 || d.getDay() === 6; },
      holidays: { 'rgba(210,216,224,.55)': 'weekend' },

      on_progress_change: function () {
        requestAnimationFrame(function () { afterRender(null, gantt); });
      },

      on_date_change: function (task, start, end) {
        if (!task || !task.id) return;
        var saveUrl = (cfg.saveUrlPattern || '').replace('__TASK__', String(task.id));
        if (!saveUrl) return;
        var body = 'start=' + encodeURIComponent(toYMD(start)) +
                   '&end=' + encodeURIComponent(toYMD(end)) +
                   '&csrf_token=' + encodeURIComponent(cfg.csrfToken || '');
        fetch(saveUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-Token': cfg.csrfToken || ''
          },
          credentials: 'same-origin',
          body: body
        })
          .then(function (r) { return r.text().then(function (t) { return { ok: r.ok, status: r.status, text: t }; }); })
          .then(function (res) {
            if (!res.ok) {
              console.error('Gantt save HTTP', res.status, res.text.slice(0, 400));
              showToast((cfg.messages && cfg.messages.errorSave) || 'Unable to save changes.', 'error');
              return;
            }
            var data = {}; try { data = JSON.parse(res.text); } catch (e) {}
            if (data && (data.success === true || data.ok === true || typeof data.success === 'undefined')) {
              showToast((cfg.messages && cfg.messages.saved) || 'Saved', 'success');
            } else {
              showToast((cfg.messages && cfg.messages.errorSave) || 'Unable to save changes.', 'error');
            }
          })
          .catch(function (e) {
            console.error(e);
            showToast((cfg.messages && cfg.messages.errorSave) || 'Unable to save changes.', 'error');
          });
        requestAnimationFrame(function () { afterRender(null, gantt); });
      },

      custom_popup_html: function (task) {
        return (
          '<div class="fg-popup">' +
            '<div id="fg-popup-host" class="fg-popup-host" data-task-id="' + String(task.id) + '">' +
              '<div class="fg-loading">Lade…</div>' +
            '</div>' +
          '</div>'
        );
      },

      on_click: function (task) {
        try { sessionStorage.setItem('fg-reopen-task', String(task.id)); } catch (e) {}
        var bar = null;
        if (Array.isArray(gantt.bars)) {
          var idStr = String(task && task.id);
          bar = gantt.bars.find(function (b) { return b && b.task && String(b.task.id) === idStr; }) || null;
        }
        if (bar && typeof gantt.show_popup === 'function') {
          gantt.show_popup(bar);
        } else {
          console.warn('[Gantt] Kein Bar-Objekt für Task', task && task.id);
        }
        var wrap = container.querySelector('.popup-wrapper');
        if (wrap && !wrap.querySelector('#fg-popup-host')) {
          wrap.innerHTML =
            '<div class="fg-popup">' +
              '<div id="fg-popup-host" class="fg-popup-host" data-task-id="' + String(task.id) + '">' +
                '<div class="fg-loading">Lade…</div>' +
              '</div>' +
            '</div>';
        }
        var url = (cfg.detailUrlPattern || '').replace('__TASK__', String(task.id));
        if (!url) return;
        fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (!data || !data.ok) return;
            var host = container.querySelector('.popup-wrapper #fg-popup-host');
            if (!host) return; renderTaskPanel(data.task, host);
            var wrap2 = container.querySelector('.popup-wrapper');
            if (wrap2) {
              var rect = wrap2.getBoundingClientRect();
              var left = parseFloat(wrap2.style.left || 0);
              if (rect.right > window.innerWidth - 8) left -= (rect.right - (window.innerWidth - 8));
              if (rect.left < 8) left += (8 - rect.left);
              wrap2.style.left = Math.round(left) + 'px';
            }
          })
          .catch(console.error);
      }
    };

    // Create the Gantt instance
    var gantt = new Gantt(containerSel, tasksNormalized, opts);
    window._frappeGantt = gantt;

    // Decorate the chart after the first render
    requestAnimationFrame(function () { afterRender(null, gantt); });

    // Hook methods that trigger a re‑render so we can decorate afterwards
    if (gantt && typeof gantt.change_view_mode === 'function') {
      var _change = gantt.change_view_mode.bind(gantt);
      gantt.change_view_mode = function (vm, keep) {
        var r = _change(vm, keep);
        requestAnimationFrame(function () { afterRender(null, gantt); });
        return r;
      };
    }
    if (gantt && gantt.tasks && typeof gantt.tasks.refresh === 'function') {
      var _tasksRefresh = gantt.tasks.refresh.bind(gantt.tasks);
      gantt.tasks.refresh = function () {
        var r = _tasksRefresh();
        requestAnimationFrame(function () { afterRender(null, gantt); });
        return r;
      };
    }
    if (gantt && typeof gantt.refresh === 'function') {
      var _refresh = gantt.refresh.bind(gantt);
      gantt.refresh = function () {
        var r = _refresh();
        requestAnimationFrame(function () { afterRender(null, gantt); });
        return r;
      };
    }

    // Optionally reopen the popup (this is the original code, kept unchanged)
    (function reopenLastPopupOnce() {
      var reopenId = sessionStorage.getItem('fg-reopen-task');
      if (!reopenId) return;
      sessionStorage.removeItem('fg-reopen-task');
      try {
        var sc = parseInt(sessionStorage.getItem('fg-scroll-left') || '0', 10);
        var gc = document.querySelector('#frappe-gantt .gantt-container');
        if (gc && !Number.isNaN(sc)) gc.scrollLeft = sc;
        sessionStorage.removeItem('fg-scroll-left');
        var vm = sessionStorage.getItem('fg-view-mode');
        if (vm && typeof gantt.change_view_mode === 'function') {
          gantt.change_view_mode(vm, true);
        }
        sessionStorage.removeItem('fg-view-mode');
      } catch (e) {}

      var tries = 0;
      var targetId = String(reopenId);
      (function tryOpen() {
        tries++;
        if (!Array.isArray(gantt.bars) || !gantt.bars.length) {
          if (tries < 50) return setTimeout(tryOpen, 60);
          return;
        }
        var bar = gantt.bars.find(function (b) { return b && b.task && String(b.task.id) === targetId; });
        if (!bar) {
          if (tries < 50) return setTimeout(tryOpen, 60);
          return;
        }
        if (typeof gantt.show_popup === 'function') gantt.show_popup(bar);
        var wrap = container.querySelector('.popup-wrapper');
        if (wrap && !wrap.querySelector('#fg-popup-host')) {
          wrap.innerHTML =
            '<div class="fg-popup">' +
              '<div id="fg-popup-host" class="fg-popup-host" data-task-id="' + targetId + '">' +
                '<div class="fg-loading">Lade…</div>' +
              '</div>' +
            '</div>';
        }
        var url = (cfg.detailUrlPattern || '').replace('__TASK__', targetId);
        fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (!data || !data.ok) return;
            var host = container.querySelector('.popup-wrapper #fg-popup-host');
            if (host) renderTaskPanel(data.task, host);
            if (wrap) {
              var rect = wrap.getBoundingClientRect();
              var left = parseFloat(wrap.style.left || 0);
              if (rect.right > window.innerWidth - 8) left -= (rect.right - (window.innerWidth - 8));
              if (rect.left  < 8)                     left += (8 - rect.left);
              wrap.style.left = Math.round(left) + 'px';
              var top = parseFloat(wrap.style.top || 0);
              if (rect.bottom > window.innerHeight - 16) top -= (rect.bottom - (window.innerHeight - 16));
              if (rect.top    < 8)                        top += (8 - rect.top);
              wrap.style.top = Math.round(top) + 'px';
            }
          });
      })();
    })();

    // Debug
    if (typeof window !== 'undefined') {
      window.decorateBlockedEdges = decorateBlockedEdges;
      window._frappeGantt = gantt;
    }

    return gantt;
  }

  // Expose
  if (typeof window !== 'undefined') {
    window.initGantt = initGantt;
  }
})();
