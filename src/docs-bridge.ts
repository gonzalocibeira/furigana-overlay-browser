// Keep page-world code minimal. The build replaces this with this installation's ID
// supplied by the isolated content script; no privileged APIs enter the page world.
window.addEventListener('fob-docs-init', (event) => {
  const id = (event as CustomEvent).detail;
  if (typeof id === 'string' && /^[a-p]{32}$/.test(id)) {
    (window as unknown as Record<string, unknown>)._docs_annotate_canvas_by_ext = id;
  }
});
