// Only layout state crosses the frame boundary; booking and account data stay here.
export function initEmbedding(root, openChoices) {
  if (!document.documentElement.classList.contains('widget-embed')) return;
  const allowedOrigins = new Set([
    location.origin,
    'https://hno-privatpraxis-nord.de',
    'https://www.hno-privatpraxis-nord.de',
  ]);
  let parentOrigin;
  let previousSize = '';
  function reportSize() {
    if (!parentOrigin) return;
    const booking = root.classList.contains('booking-view');
    const expanded = root.classList.contains('booking-choices') || root.classList.contains('contact-view');
    const width = booking ? 520 : root.classList.contains('selfpay-selection') ? 380 : expanded ? 310 : 280;
    const height = Math.ceil(root.getBoundingClientRect().height);
    const signature = `${width}:${height}:${booking}`;
    if (signature === previousSize) return;
    previousSize = signature;
    window.parent.postMessage({type:'medone:resize', width, height, booking}, parentOrigin);
  }
  window.addEventListener('message', event => {
    if (event.source !== window.parent || !allowedOrigins.has(event.origin)) return;
    if (event.data?.type === 'medone:viewport') {
      const height = event.data.height;
      if (!Number.isFinite(height) || height <= 0) return;
      parentOrigin = event.origin;
      document.documentElement.style.setProperty('--embed-height', `${Math.min(height, 1600)}px`);
      previousSize = '';
      reportSize();
    } else if (event.data?.type === 'medone:open' && event.origin === parentOrigin) {
      openChoices();
    }
  });
  new ResizeObserver(reportSize).observe(root);
  new MutationObserver(reportSize).observe(root, {attributes:true, attributeFilter:['class']});
}
