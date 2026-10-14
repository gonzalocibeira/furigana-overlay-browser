// The isolated script supplies this installation's public ID, not document text
// or extension capabilities. Page scripts can spoof this event, so never treat it
// as an authenticated channel or accept commands/data through it.
const initialize = (event: Event) => {
  const id = (event as CustomEvent).detail;
  if (typeof id === 'string' && /^[a-p]{32}$/.test(id)) {
    (window as unknown as Record<string, unknown>)._docs_annotate_canvas_by_ext = id;
    window.removeEventListener('ko-docs-init', initialize);
  }
};
window.addEventListener('ko-docs-init', initialize);
