// API helpers for loading and removing Kanboard task links

/**
 * Loads a task's links and link types from the server. Returns a promise
 * resolving to an object with `links` and `types` arrays. If the server
 * response is not ok, both arrays will be empty.
 *
 * @param {string|number} taskId The ID of the task whose links to fetch.
 * @returns {Promise<{links:Array,types:Array}>} Promise resolving to link data.
 */
async function fgLoadLinks(taskId) {
  const url = new URL((cfg.links && cfg.links.list) || '', window.location.origin);
  url.searchParams.set('task_id', String(taskId));
  const r = await fetch(url, { credentials: 'same-origin' });
  const j = await r.json();
  if (!j || !j.ok) return { links: [], types: [] };
  return { links: j.links || [], types: j.types || [] };
}

/**
 * Click handler for removing a task link. Reads the task_link_id from the
 * clicked row, sends a POST request to remove the link, and upon success
 * removes the row from the DOM. Debug output and error handling mirror
 * the original implementation.
 *
 * @param {MouseEvent} ev The click event
 */
function fgOnRemoveLink(ev) {
  var row = ev.currentTarget.closest('.fg-link-row');
  var tlid = row && row.getAttribute('data-task-link-id');
  if (!tlid) {
    console.error('[FG][remove] ABORT: kein task_link_id in .fg-link-row');
    return;
  }
  var form = new URLSearchParams();
  form.set('task_link_id', tlid);
  form.set('csrf_token', cfg.csrfToken || '');
  form.set('csrf', cfg.csrfToken || '');
  var urlStr = String((cfg && cfg.links && cfg.links.remove) || '');
  var hasProjectCtx = false;
  try {
    var u = new URL(urlStr, window.location.origin);
    hasProjectCtx = u.searchParams.has('project_id') || /\/project\/\d+\//.test(u.pathname);
  } catch (e) {
    hasProjectCtx = /project_id=\d+/.test(urlStr) || /\/project\/\d+\//.test(urlStr);
  }
  var token = String((cfg && cfg.csrfToken) || '');
  var maskedToken = token
    ? token.length > 12
      ? token.slice(0, 6) + '…' + token.slice(-6)
      : '***'
    : '(leer)';
  var bodyStr = form.toString().replace(token, maskedToken);
  var t0 = (window.performance && performance.now()) || Date.now();
  fetch(cfg.links.remove, {
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
    .then(async function (r) {
      var t1 = (window.performance && performance.now()) || Date.now();
      var ct = r.headers.get('content-type') || '';
      var txt = '';
      try {
        txt = await r.text();
      } catch (e) {}
      var preview = txt.slice(0, 800);
      console.error('[FG][remove][RESP]', {
        status: r.status,
        statusText: r.statusText,
        redirected: r.redirected,
        finalUrl: r.url,
        contentType: ct,
        dur_ms: Math.round(t1 - t0),
        bodyPreview: preview
      });
      var j = null;
      if (ct.indexOf('application/json') !== -1) {
        try {
          j = JSON.parse(txt);
        } catch (e) {
          j = null;
        }
      }
      if (!r.ok) {
        if (r.status === 403) {
          console.error('[FG][remove] HINWEIS: 403 → meist CSRF oder Projekt-Rechte. Prüfe:', {
            sentCsrfParam: !!token,
            sentHeader: !!(cfg && cfg.csrfToken),
            hasProjectCtx: hasProjectCtx,
            jsonEcho: j
          });
        }
        throw new Error('HTTP ' + r.status + ' ' + r.statusText);
      }
      return j || {};
    })
    .then(function (j) {
      if (j && j.ok) {
        console.error('[FG][remove] OK → Zeile entfernen');
        row.remove();
      } else {
        console.warn('[FG][remove] NOK payload', j);
      }
    })
    .catch(function (e) {
      console.error('[FG][remove] ERR', e);
    });

}


 async function fgSetRelSeed(taskLinkId, active, seedTaskId) {
  const url = (cfg.links && cfg.links.seed) || '';
  const body = new URLSearchParams();
  body.set('task_link_id', String(taskLinkId));
  body.set('active', active ? '1' : '0');
  body.set('seed_task_id', String(seedTaskId));
  body.set('csrf_token', cfg.csrfToken || '');
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-Token': cfg.csrfToken || '',
      'Accept': 'application/json'
    },
    credentials: 'same-origin',
    body: body.toString()
  });
  return r.json().catch(() => ({}));
}
