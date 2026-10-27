// Appended to the existing widget module by the local preview server.
// Reuse its state functions so drafts, focus and the resize protocol stay intact.
if (document.documentElement.classList.contains('widget-embed')) {
  const audience = 'Privat und Selbstzahlende';
  root.querySelector('#widget-choice-title').textContent = audience;
  root.setAttribute('aria-label', `Termine für ${audience}`);
  bookingChoices.setAttribute('aria-label', audience);
  const home = bookingHost.querySelector('[data-widget-home]');
  function minimizeWidget() {
    if (root.classList.contains('booking-view') && !closeBooking()) return;
    setInquiryOpen(false);
    setBookingChoicesOpen(false, true);
  }
  function makeMinimizeButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'widget-minimize';
    button.setAttribute('aria-label', 'Widget minimieren');
    button.title = 'Zur kleinen Karte – deine Auswahl bleibt erhalten';
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg><span>Minimieren</span>';
    button.addEventListener('click', minimizeWidget);
    return button;
  }
  function toolbar(container, back) {
    const bar = document.createElement('div');
    bar.className = 'widget-window-controls';
    container.prepend(bar);
    if (back) bar.append(back);
    const minimize = makeMinimizeButton();
    bar.append(minimize);
    return minimize;
  }
  toolbar(root.querySelector('.widget-private-details'), overviewBack);
  toolbar(inquiry, document.querySelector('#widget-inquiry-back'));
  const bookingMinimize = toolbar(bookingHost.querySelector('.booking-header'), home);
  // The booking engine locks dismissal while a submission is in progress.
  new MutationObserver(() => { bookingMinimize.disabled = home.disabled; })
    .observe(home, {attributes:true, attributeFilter:['disabled']});
  if (new URLSearchParams(location.search).get('initial') === 'expanded') {
    setBookingChoicesOpen(true);
  }
}
