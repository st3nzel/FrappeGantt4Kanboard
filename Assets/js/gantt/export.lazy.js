(function(){
  function loadScript(src){
    return new Promise(function(resolve, reject){
      var s=document.createElement('script');
      s.src=src; s.defer=true; s.onload=resolve; s.onerror=reject;
      document.head.appendChild(s);
    });
  }
  document.addEventListener('DOMContentLoaded', function(){
    var btn = document.getElementById('fg-export-pdf');
    if(!btn) return;
    var loaded=false;
    btn.addEventListener('click', async function(e){
      e.preventDefault();
      try{
        if(!loaded){
          await loadScript('plugins/FrappeGantt/Assets/vendor/jspdf.umd.min.js');
          await loadScript('plugins/FrappeGantt/Assets/vendor/svg2pdf.umd.min.js');
          await loadScript('plugins/FrappeGantt/Assets/vendor/svg-export.umd.standalone.min.js');
          await loadScript('plugins/FrappeGantt/Assets/vendor/umd.js');
          await loadScript('plugins/FrappeGantt/Assets/js/gantt/export.pdf.js');
          loaded=true;
        }
        if(window.FG_exportPdf){ window.FG_exportPdf(); }
      }catch(err){
        console.error('Export-Module konnten nicht geladen werden', err);
        alert('Export derzeit nicht verfügbar.');
      }
    });
  });
})();