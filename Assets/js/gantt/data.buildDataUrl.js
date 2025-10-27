 // Helper to assemble the URL used to fetch Gantt task data

/**
 * Builds the data URL based on global configuration and toggles. It
 * preserves existing query parameters and appends options controlled via
 * checkboxes and other configuration flags. The include_dependency_targets
 * flag ensures dependency targets are included in the payload.
 *
 * @returns {string} Fully qualified URL
 */
function buildDataUrl() {
  const base = cfg.dataUrl;
  const url = new URL(base, window.location.origin);
  if (typeof showNoDate !== 'undefined') {
    url.searchParams.set('show_no_date', showNoDate ? '1' : '0');
  }
  if (cfg.dependencyLinkIds) {
    url.searchParams.set('link_ids', cfg.dependencyLinkIds);
  }
  if (cfg.sameProjectOnly) {
    url.searchParams.set('same_project_only', '1');
  }
  url.searchParams.set('include_dependency_targets', '1');
  return url.toString();
  
}