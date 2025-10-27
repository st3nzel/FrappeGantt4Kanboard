// Search helpers for linking tasks from the panel and toolbar

/**
 * Wires up the search inputs outside the task panel. It binds input
 * listeners to trigger a remote search after a short debounce and
 * displays results in a dropdown. Selecting a suggestion populates
 * hidden form fields accordingly. This function should be called once
 * after the DOM has loaded.
 */
function fgWireSearch() {
  const input = document.getElementById('fg-link-search');
  const hidden = document.getElementById('fg-link-opp');
  const results = document.getElementById('fg-link-search-results');
  if (!input || !hidden || !results) return;
  let timer = null;
  input.addEventListener('input', () => {
    hidden.value = '';
    if (timer) clearTimeout(timer);
    const q = input.value.trim();
    if (!q) {
      results.style.display = 'none';
      results.innerHTML = '';
      return;
    }
    timer = setTimeout(async () => {
      const url = new URL((cfg.links && cfg.links.search) || '#', window.location.origin);
      url.searchParams.set('q', q);
      // allow cross-project search
      url.searchParams.set('cross', '1');
      const r = await fetch(url, { credentials: 'same-origin' });
      const j = await r.json().catch(() => ({}));
      const items = (j && j.items) || [];
      results.innerHTML = items
        .map(
          it => `
        <div class="fg-sug" data-id="${it.id}">#${it.id} · ${esc(it.title)} (P:${it.project_id})</div>
      `
        )
        .join('');
      results.style.display = items.length ? 'block' : 'none';
      results.querySelectorAll('.fg-sug').forEach(n => {
        n.addEventListener('click', () => {
          hidden.value = n.getAttribute('data-id');
          input.value = n.textContent;
          results.style.display = 'none';
        });
      });
    }, 180);
  });
}

/**
 * Wires up the search input inside the task panel. Similar to fgWireSearch
 * but scoped to a specific task; project_id will be passed if available.
 *
 * @param {Object} t The current task being edited.
 */
function wireLinkSearch(t) {
  var input = document.getElementById('fg-link-search');
  var hidden = document.getElementById('fg-link-opp');
  var results = document.getElementById('fg-link-search-results');
  if (!input || !hidden || !results) return;
  var timer = null;
  input.addEventListener('input', function () {
    hidden.value = '';
    if (timer) clearTimeout(timer);
    var q = input.value.trim();
    if (!q) {
      results.style.display = 'none';
      results.innerHTML = '';
      return;
    }
    timer = setTimeout(function () {
      var url = new URL((cfg.links && cfg.links.search) || '#', window.location.origin);
      url.searchParams.set('q', q);
      if (t && t.project_id != null) url.searchParams.set('project_id', String(t.project_id));
      url.searchParams.set('cross', '1');
      fetch(url.toString(), { credentials: 'same-origin' })
        .then(function (r) {
          return r.json();
        })
        .then(function (j) {
          var items = (j && j.items) || [];
          results.innerHTML = items
            .map(function (it) {
              return '<div class="fg-sug" data-id="' + it.id + '">#' + it.id + ' · ' + escapeHtml(it.title) + ' (P:' + it.project_id + ')</div>';
            })
            .join('');
          results.style.display = items.length ? 'block' : 'none';
          Array.prototype.forEach.call(results.querySelectorAll('.fg-sug'), function (n) {
            n.addEventListener('click', function () {
              hidden.value = n.getAttribute('data-id');
              input.value = n.textContent;
              results.style.display = 'none';
            });
          });
        })
        .catch(function (e) {
          console.error('[FG][search] ERR', e);
        });
    }, 180);
  });
}