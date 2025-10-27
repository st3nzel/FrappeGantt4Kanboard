(function () {
  'use strict';
  if (window.__FG_PDF_VECT_V2__) return; window.__FG_PDF_VECT_V2__ = true;

  const A4 = { orientation: 'landscape', unit: 'pt', format: 'a4' };
  const MARGIN = 24;

  // List of selectors used to locate typical Frappe Gantt SVG elements
  const SVG_SELECTORS = [
    '#frappe-gantt svg', '.gantt svg', '.gantt-target svg', '#gantt svg', 'svg.frappe-gantt'
  ];

  function pickSvg() {
    for (const s of SVG_SELECTORS) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    return null;
  }

  function logFatal(msg, extra) {
    console.error('[Gantt PDF]', msg, extra || '');
    alert('PDF-Export fehlgeschlagen: ' + msg + ' (Details in Konsole)');
  }

  // Abmessungen aus Grid/Viewport
  function measureSvg(svg) {
    const grid = svg.querySelector('.grid-background, .grid .background, .grid rect');
    if (grid) {
      const w = parseFloat(grid.getAttribute('width')) || 0;
      const h = parseFloat(grid.getAttribute('height')) || 0;
      if (w && h) return { width: w, height: h };
    }
    const vb = svg.getAttribute('viewBox');
    if (vb) {
      const [ , , w, h ] = vb.trim().split(/[,\s]+/).map(Number);
      if (w && h) return { width: w, height: h };
    }
    const r = svg.getBoundingClientRect();
    return { width: r.width || 1200, height: r.height || 600 };
  }

  // Write computed styles inline (fonts, fill, stroke, etc.) and add a white background
  function inlineStyles(svgEl) {
    const props = [
      'fill','fill-opacity','stroke','stroke-width','stroke-dasharray','stroke-opacity',
      'font-family','font-size','font-weight','font-style','text-anchor','opacity'
    ];
    const walker = document.createTreeWalker(svgEl, NodeFilter.SHOW_ELEMENT);
    let n = svgEl;
    while (n) {
      const cs = getComputedStyle(n);
      for (const p of props) {
        const v = cs.getPropertyValue(p);
        if (v) n.setAttribute(p, v.trim());
      }
      n = walker.nextNode();
    }
    // Apply a white background to avoid “black window” artifacts in some PDF viewers
    const size = measureSvg(svgEl);
    let bg = svgEl.querySelector('.grid-background, .grid .background');
    if (!bg) {
      bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bg.setAttribute('x','0'); bg.setAttribute('y','0');
      bg.setAttribute('width', String(size.width));
      bg.setAttribute('height', String(size.height));
      bg.setAttribute('fill', '#ffffff');
      svgEl.insertBefore(bg, svgEl.firstChild);
    } else {
      bg.setAttribute('fill', '#ffffff');
    }
    return svgEl;
  }

  // Clone the entire SVG and translate its contents using <g transform="translate(-x,0)">
  function makeSliceElement(srcSvg, xOffset, totalW, totalH, sliceW) {
    const clone = srcSvg.cloneNode(true);
    inlineStyles(clone);

    // Normalize the clone’s width and height
    clone.setAttribute('width',  String(totalW));
    clone.setAttribute('height', String(totalH));
    clone.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`);
    clone.setAttribute('preserveAspectRatio', 'xMinYMin meet');

    // Move all children into a wrapper group and translate them
    const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    while (clone.firstChild) wrapper.appendChild(clone.firstChild);
    wrapper.setAttribute('transform', `translate(${-xOffset},0)`);
    clone.appendChild(wrapper);

    // Optionally clip to the visible portion of the slice
    const clipId = 'fgClip_' + Math.random().toString(36).slice(2);
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const clip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
    clip.setAttribute('id', clipId);
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(xOffset));
    rect.setAttribute('y', '0');
    rect.setAttribute('width',  String(sliceW));
    rect.setAttribute('height', String(totalH));
    clip.appendChild(rect);
    defs.appendChild(clip);
    clone.appendChild(defs);
    wrapper.setAttribute('clip-path', `url(#${clipId})`);

    return clone;
  }

  async function exportPdf() {
    try {
      const { jsPDF } = window.jspdf || {};
      if (!jsPDF) return logFatal('jsPDF nicht gefunden (jspdf.umd.min.js laden)');
      // svg2pdf attaches the .svg() method to jsPDF – verify that it is available
      const probe = new jsPDF({ unit: 'pt', format: 'a4' });
      if (typeof probe.svg !== 'function') return logFatal('svg2pdf fehlt (svg2pdf.umd.min.js nach jsPDF laden)');

      // Wait for web fonts to load to ensure accurate text measurements
      if (document.fonts?.ready) { try { await document.fonts.ready; } catch(e){} }

      const source = pickSvg();
      if (!source) return logFatal('Kein Frappe-Gantt-SVG gefunden');

      const { width: totalW, height: totalH } = measureSvg(source);

      const pdf = new jsPDF(A4);
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const innerW = pageW - 2 * MARGIN;
      const innerH = pageH - 2 * MARGIN;

      // Scale the chart to fit the page height and compute the width of each slice (in SVG coordinates)
      const scaleToFitH = innerH / totalH;
      const sliceW = innerW / Math.max(0.001, scaleToFitH); // width of the visible slice in SVG units
      const pages = Math.max(1, Math.ceil(totalW / sliceW));

      for (let i = 0; i < pages; i++) {
        const x = Math.round(i * sliceW);
        const w = Math.min(sliceW, totalW - x);

        const sliceEl = makeSliceElement(source, x, totalW, totalH, w);

        // Render the vector slice into the PDF page.
        // According to the svg2pdf README: doc.svg(DOMElement, {x,y,width,height}).then(...)
        // (The UMD build is supported.)  We specify the target dimensions
        // (innerW/innerH) and svg2pdf will scale accordingly.  Setting removeInvalid=true
        // suppresses exotic SVG attributes that are not valid for PDF output.
        await pdf.svg(sliceEl, {
          x: MARGIN,
          y: MARGIN,
          width: innerW,
          height: innerH,
          preserveAspectRatio: 'xMinYMin meet',
          removeInvalid: true
        });

        if (i < pages - 1) pdf.addPage();
      }

      const title = (document.querySelector('.page-header h2, h2')?.textContent || 'Gantt').trim().replace(/\s+/g, '_');
      pdf.save(`${title}_gantt.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('PDF-Export fehlgeschlagen (Details in der Konsole).');
    }
  }

  // Button-Handler (#fg-export-pdf beliebig anpassen)
  document.addEventListener('click', function (ev) {
    const btn = ev.target.closest('#fg-export-pdf');
    if (!btn) return;
    ev.preventDefault();
    exportPdf();
  });
})();
