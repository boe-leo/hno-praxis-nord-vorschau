(() => {
  const host = document.querySelector('.practice-widget-host');
  if (!host) return;
  const fallback = host.querySelector('a');
  const url = new URL('/hno-praxis-nord-vorschau/widget/', location.origin);
  fallback.href = url.href;
  url.searchParams.set('embed', '1');
  const stateKey = 'praxis-nord:widget-state';
  let initialState = host.dataset.widgetInitial || 'expanded';
  try { initialState = sessionStorage.getItem(stateKey) || initialState; } catch {}
  url.searchParams.set('initial', initialState);
  const frame = document.createElement('iframe');
  frame.title = 'Terminbuchung für Privatversicherte und Selbstzahlende';
  frame.className = 'practice-widget-frame';
  frame.referrerPolicy = 'origin';
  frame.src = url.href;
  // Keep layout measurable during the handshake without covering the fallback.
  frame.style.visibility = 'hidden';
  frame.style.position = 'absolute';
  frame.style.right = '0';
  frame.style.bottom = '0';
  let ready = false;
  let pendingOpen = false;
  let activeBooking = false;
  let pageOpener = null;
  let expandedSinceOpen = false;
  let requestedWidth = 340;
  let requestedHeight = 180;
  let lastAvailableHeight;
  const mobile = matchMedia('(max-width:650px)');
  const pageRegions = [...document.querySelectorAll('body > header, body > nav, body > main, body > .contact, body > .skip, body > .preview-note, body > footer, #account-menu')];

  function availableHeight() {
    const notice = parseFloat(getComputedStyle(document.body).getPropertyValue('--demo-notice-height')) || 0;
    return Math.max(120, Math.floor((window.visualViewport?.height || innerHeight) - notice - (mobile.matches ? 24 : 56)));
  }
  function layout() {
    frame.style.width = `${Math.min(requestedWidth, document.documentElement.clientWidth - 24)}px`;
    frame.style.height = `${Math.min(requestedHeight, availableHeight())}px`;
    const modal = activeBooking && mobile.matches;
    document.body.classList.toggle('practice-booking-active', modal);
    pageRegions.forEach(region => { region.inert = modal; });
  }
  function sendViewport() {
    layout();
    const height = availableHeight();
    if (height === lastAvailableHeight) return;
    lastAvailableHeight = height;
    frame.contentWindow?.postMessage({type:'medone:viewport', height}, url.origin);
  }
  function openWidget(event) {
    const opener = event?.detail?.opener;
    if (opener instanceof HTMLElement && !host.contains(opener)) {
      pageOpener = opener;
      expandedSinceOpen = ready && (activeBooking || requestedWidth > 280);
    }
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    if (!ready) {
      pendingOpen = true;
      fallback.focus();
      return;
    }
    frame.contentWindow.postMessage({type:'medone:open'}, url.origin);
  }
  window.addEventListener('message', event => {
    if (event.source !== frame.contentWindow || event.origin !== url.origin || event.data?.type !== 'medone:resize') return;
    const {width, height, booking} = event.data;
    if (![width, height].every(value => Number.isFinite(value) && value > 0)) return;
    requestedWidth = Math.min(width, 520);
    requestedHeight = Math.min(height, 1600);
    activeBooking = booking === true;
    // The existing frame protocol uses 280px only for the compact start card;
    // choices/contact use 310px+, booking 520px. Prefer explicit state when supplied.
    const compact = event.data.expanded === false ||
      (event.data.expanded === undefined && !activeBooking && width === 280);
    try { sessionStorage.setItem(stateKey, compact ? 'compact' : 'expanded'); } catch {}
    if (!compact) expandedSinceOpen = true;
    ready = true;
    fallback.hidden = true;
    frame.style.visibility = '';
    frame.style.position = '';
    layout();
    sendViewport();
    if (compact && expandedSinceOpen && pageOpener) {
      const opener = pageOpener;
      pageOpener = null;
      expandedSinceOpen = false;
      requestAnimationFrame(() => {
        if (opener.isConnected && !opener.closest('[inert]')) opener.focus({preventScroll:true});
      });
    }
    if (pendingOpen) { pendingOpen = false; openWidget(); }
  });
  document.addEventListener('practice:book', openWidget);
  frame.addEventListener('load', () => { lastAvailableHeight = undefined; sendViewport(); });
  window.addEventListener('resize', sendViewport);
  window.visualViewport?.addEventListener('resize', sendViewport);
  new ResizeObserver(sendViewport).observe(document.body);
  new MutationObserver(sendViewport).observe(document.body, {attributes:true, attributeFilter:['style']});
  host.append(frame);
})();
