import { navigationMarkup, initNavigation } from '/hno-praxis-nord-vorschau/hno/site-navigation.js';
import { PRIVATE_BOOKING, loadPrivate } from '/hno-praxis-nord-vorschau/hno/praxisnord-availability.js';

document.querySelector('#navigation').innerHTML = navigationMarkup();
document.querySelector('[data-account-links]').innerHTML = '<a href="/hno-praxis-nord-vorschau/hno/konto.html">Mein Konto</a><a href="/hno-praxis-nord-vorschau/hno/praxis.html">Praxislogin</a>';
const practiceNavigation = document.querySelector('#site-navigation');
practiceNavigation.innerHTML = `<div class="practice-menu-group">
    <button class="practice-menu-toggle" type="button" aria-expanded="false" aria-controls="nord-practice-menu">HNO Praxis Nord</button>
    <div class="practice-submenu" id="nord-practice-menu" hidden>
      <a href="https://www.hno-praxis-nord.de/#c443">Ärzte</a>
      <a href="https://www.hno-praxis-nord.de/#c444">Behandlungen</a>
      <a href="https://www.hno-praxis-nord.de/#c59">Adresse</a>
      <a href="https://www.hno-praxis-nord.de/#c60">Öffnungszeiten</a>
      <a href="https://www.hno-praxis-nord.de/#c58">Kontakt</a>
    </div>
  </div>
  <div class="practice-menu-group practice-menu-private">
    <button class="practice-menu-toggle" type="button" aria-expanded="false" aria-controls="private-practice-menu">Privat Praxis Nord</button>
    <div class="practice-submenu" id="private-practice-menu" hidden>
      <a href="/hno-praxis-nord-vorschau/hno/nord.html#team">Ärzte</a>
      <a href="/hno-praxis-nord-vorschau/hno/nord.html#leistungen">Behandlungen</a>
      <a href="/hno-praxis-nord-vorschau/hno/nord.html#anfahrt">Adresse</a>
      <a href="/hno-praxis-nord-vorschau/hno/nord.html#anfahrt">Öffnungszeiten</a>
      <a href="/hno-praxis-nord-vorschau/hno/nord.html#anfahrt">Kontakt</a>
      <a class="practice-record-link" href="/hno-praxis-nord-vorschau/hno/konto.html">Meine Akte</a>
    </div>
  </div>`;
initNavigation({ accountAccess: false });

const practiceGroups = [...practiceNavigation.querySelectorAll('.practice-menu-group')];
function showPracticeMenu(activeGroup) {
  practiceGroups.forEach(group => {
    const open = group === activeGroup;
    group.querySelector('button').setAttribute('aria-expanded', String(open));
    group.querySelector('.practice-submenu').hidden = !open;
  });
}
practiceGroups.forEach(group => {
  const button = group.querySelector('button');
  button.addEventListener('click', event => {
    const mouse = event.pointerType === 'mouse' && matchMedia('(hover:hover) and (pointer:fine)').matches;
    showPracticeMenu(mouse || button.getAttribute('aria-expanded') !== 'true' ? group : null);
  });
  group.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse' && matchMedia('(hover:hover) and (pointer:fine)').matches) showPracticeMenu(group);
  });
  group.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse' && !group.contains(document.activeElement)) {
      button.setAttribute('aria-expanded', 'false');
      group.querySelector('.practice-submenu').hidden = true;
    }
  });
  group.addEventListener('focusout', event => {
    if (!group.contains(event.relatedTarget)) {
      button.setAttribute('aria-expanded', 'false');
      group.querySelector('.practice-submenu').hidden = true;
    }
  });
  group.addEventListener('keydown', event => {
    if (event.target === button && ['ArrowDown', 'ArrowRight'].includes(event.key)) {
      event.preventDefault(); showPracticeMenu(group); group.querySelector('a').focus();
    } else if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      event.preventDefault(); event.stopPropagation(); button.focus(); showPracticeMenu(null);
    }
  });
});
document.addEventListener('click', event => {
  if (!practiceNavigation.contains(event.target) || event.target.closest('a')) showPracticeMenu(null);
});

// Only fixed click categories are transmitted, never URLs, identity or form values.
document.addEventListener('click', event => {
  const link = event.target.closest?.('a[data-stat-event], button[data-stat-event]');
  if (!link || event.defaultPrevented || !event.isTrusted) return;
  fetch('/hno-praxis-nord-vorschau/hno/api/site-stats/event', {
    method: 'POST', credentials: 'omit', keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: link.dataset.statEvent })
  }).catch(() => {});
});

const dateFormat = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'long' });
const timeFormat = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });
function element(tag, className, text) { const node = document.createElement(tag); node.className = className; node.textContent = text; return node; }

function mountAvailability(id, load, fallback) {
  const box = document.getElementById(id);
  let loading = false, slot = null, checked = 0, signature = '';
  const expired = () => Date.now() - checked > 90000 || (slot && (Date.parse(slot.start) <= Date.now() || (slot.expiresAt && Date.now() > slot.expiresAt)));
  function render(state) {
    const nextSignature = JSON.stringify([state, slot]);
    if (signature === nextSignature) return;
    signature = nextSignature;
    const content = [];
    const card = element('div', 'slot-card', '');
    const primary = element('div', 'slot-primary', '');
    const details = element('div', 'slot-details', '');
    const category = id === 'statutory-slot' ? 'kasse' : 'private';
    if (state === 'available') {
      const date = element('time', 'slot-date', dateFormat.format(new Date(slot.start))); date.dateTime = slot.start;
      date.append(element('span', 'slot-time', timeFormat.format(new Date(slot.start)) + ' Uhr'));
      primary.append(date);
      details.append(element('p', 'slot-person', slot.name));
    } else {
      card.append(element('p', 'availability-state', state === 'empty' ? 'Aktuell keine freien Termine in den nächsten 14 Tagen.' : 'Verfügbarkeit gerade nicht abrufbar.'));
      if (state === 'error') { const retry = element('button', '', 'Erneut prüfen'); retry.type = 'button'; retry.onclick = refresh; card.append(retry); }
    }
    const link = element('a', 'slot-action', ''); link.href = state === 'available' ? slot.href : fallback;
    link.textContent = state === 'available' ? 'Termin buchen' : 'Terminkalender öffnen';
    link.dataset.statEvent = category + (state === 'available' ? '_book' : '_more');
    link.onclick = event => { if (state === 'available' && expired()) { event.preventDefault(); slot = null; render('error'); refresh(); } };
    primary.append(link);
    if (state === 'available') {
      const more = element('a', 'slot-action slot-more', 'Weitere Termine'); more.href = fallback;
      more.dataset.statEvent = category + '_more';
      details.append(more);
    }
    card.append(primary, details); content.push(card); box.replaceChildren(...content);
  }
  async function refresh() {
    if (loading || document.hidden) return;
    loading = true; box.setAttribute('aria-busy', 'true');
    try { slot = await load(); checked = Date.now(); render(slot ? 'available' : 'empty'); }
    catch { slot = null; checked = 0; render('error'); }
    finally { loading = false; box.setAttribute('aria-busy', 'false'); }
  }
  refresh();
  setInterval(() => { if (!document.hidden) refresh(); }, 60000);
  setInterval(() => { if (slot && expired()) { slot = null; render('error'); } }, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (expired()) { slot = null; render('error'); } refresh(); } });
}
mountAvailability('private-slot', loadPrivate, PRIVATE_BOOKING);
