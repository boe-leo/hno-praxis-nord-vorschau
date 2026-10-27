import {mountBooking} from '/hno-praxis-nord-vorschau/hno/booking-flow.js?v=20261026-selfpay-return';
import { SELF_PAY_SERVICES } from '/hno-praxis-nord-vorschau/hno/selfpay-services.js?v=20261026-refined';
import '/hno-praxis-nord-vorschau/widget/landing.js?v=20261026-flow1';
import { createDictation } from '/hno-praxis-nord-vorschau/hno/practice-speech.js?v=20261003-standard1';
const root = document.querySelector('.private-widget');
const panel = document.querySelector('#widget-actions');
const privateSlot = document.querySelector('#private-slot');
const previewTimes = document.querySelectorAll('#private-widget-expanded-time');
const catalogue = document.querySelector('#selfpay-catalogue').content;
const mobileWidgetViewport = matchMedia('(max-width:650px)');
const previewDate = new Intl.DateTimeFormat('de-DE', {timeZone:'Europe/Berlin',weekday:'short',day:'2-digit',month:'2-digit'});
const previewClock = new Intl.DateTimeFormat('de-DE', {timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit'});
const previewAccessibleDate = new Intl.DateTimeFormat('de-DE', {timeZone:'Europe/Berlin',dateStyle:'full',timeStyle:'short'});
function formatAppointmentPreview(start) {
  const parts = Object.fromEntries(previewDate.formatToParts(start).map(part => [part.type, part.value]));
  return `${parts.weekday.replace(/\.$/, '')} ${parts.day}.${parts.month}. · `;
}
const doctorDisclosures = [...panel.querySelectorAll('[data-doctor-disclosure]')].map(button => ({button, options:document.getElementById(button.getAttribute('aria-controls'))}));
function syncNextAppointment() {
  const date = privateSlot.querySelector('time.slot-date');
  previewTimes.forEach(previewTime => {
    if (date && Date.parse(date.dateTime) > Date.now()) {
      const start = new Date(date.dateTime);
      previewTime.dateTime = date.dateTime;
      previewTime.setAttribute('aria-label', previewAccessibleDate.format(start));
      const clock = document.createElement('span');
      clock.textContent = previewClock.format(start);
      previewTime.replaceChildren(document.createTextNode(formatAppointmentPreview(start)), clock);
    } else {
      previewTime.removeAttribute('datetime');
      previewTime.removeAttribute('aria-label');
      previewTime.textContent = privateSlot.getAttribute('aria-busy') === 'true' ? 'Wird geladen …' : 'Zurzeit kein freier Termin';
    }
  });
}
new MutationObserver(syncNextAppointment).observe(privateSlot, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-busy'] });
syncNextAppointment();
const overviewBack = document.querySelector('#widget-overview-back');
const entryBook = document.querySelector('#widget-entry-book');
const bookingChoices = document.querySelector('#widget-private-body');
let choicesOpen = false;
function setBookingChoicesOpen(open, focus = false) {
  choicesOpen = open;
  root.classList.toggle('booking-choices', open);
  bookingChoices.hidden = !open;
  entryBook.hidden = open;
  entryBook.setAttribute('aria-expanded', String(open));
  overviewBack.hidden = !open;
  document.querySelector('#widget-resume').hidden = !open || !booking.hasDraft;
  if (!open) setDoctorOptionsOpen();
  panel.scrollTop = 0;
  if (focus) (open ? document.querySelector('#widget-private-toggle') : entryBook).focus({preventScroll:true});
}
entryBook.addEventListener('click', () => setBookingChoicesOpen(true, true));


const selfServiceOptions = document.querySelector('#widget-service-options');
const selfSelected = document.querySelector('#widget-self-selected');
const selfSelectedTitle = document.querySelector('#widget-service-selected');
let selectedSelfServiceButton;
let openServiceInfo;
function closeServiceInfo() {
  if (!openServiceInfo) return;
  openServiceInfo.content.hidden = true;
  openServiceInfo.button.setAttribute('aria-expanded', 'false');
  openServiceInfo = null;
}
Object.entries(SELF_PAY_SERVICES).forEach(([id, service]) => {
  const source = catalogue.getElementById(id);
  const item = document.createElement('li');
  item.dataset.selfpayService = id;
  const name = document.createElement('strong'); name.textContent = service.name;
  name.id = `widget-${id}-title`;
  item.setAttribute('aria-labelledby', name.id);
  const description = document.createElement('span'); description.textContent = service.description;
  const price = document.createElement('small'); price.textContent = service.price;
  const actions = document.createElement('div'); actions.className = 'widget-service-actions';
  const infoButton = document.createElement('button');
  infoButton.type = 'button'; infoButton.textContent = 'Mehr Infos';
  infoButton.setAttribute('aria-label', `Mehr Infos zu ${service.name}`);
  infoButton.setAttribute('aria-expanded', 'false');
  const info = document.createElement('div');
  info.className = 'widget-service-info'; info.id = `widget-${id}-info`; info.hidden = true;
  info.append(source.querySelector('.service-details > p').cloneNode(true));
  infoButton.setAttribute('aria-controls', info.id);
  infoButton.addEventListener('click', () => {
    const show = info.hidden;
    closeServiceInfo();
    if (show) {
      info.hidden = false;
      infoButton.setAttribute('aria-expanded', 'true');
      openServiceInfo = { button: infoButton, content: info };
    }
  });
  const bookButton = document.createElement('button');
  bookButton.type = 'button'; bookButton.className = 'widget-service-book';
  bookButton.textContent = 'Termin buchen';
  bookButton.setAttribute('aria-label', `Termin buchen: ${service.name}`);
  actions.append(infoButton, bookButton);
  item.append(name);
  if (source.querySelector('summary > span:not(.service-price)')) item.append(description);
  item.append(price, actions, info); selfServiceOptions.append(item);
  bookButton.addEventListener('click', () => {
    selectedSelfServiceButton=bookButton;
    openBooking({insurance:'self',service:id});
  });
});
const serviceFilterLabel=document.createElement('label');
serviceFilterLabel.className='widget-service-filter-label';
serviceFilterLabel.htmlFor='widget-service-filter';
serviceFilterLabel.textContent='Leistungen nach Anliegen';
const serviceFilter=document.createElement('select');
serviceFilter.id='widget-service-filter';serviceFilter.className='widget-service-filter';
serviceFilter.add(new Option('Alle Leistungen',''));
[...new Set(Object.values(SELF_PAY_SERVICES).map(service=>service.topic))].forEach(topic=>serviceFilter.add(new Option(topic,topic)));
selfServiceOptions.before(serviceFilterLabel,serviceFilter);
serviceFilter.onchange=()=>{
 closeServiceInfo();
 selfServiceOptions.querySelectorAll('[data-selfpay-service]').forEach(item=>{item.hidden=Boolean(serviceFilter.value&&SELF_PAY_SERVICES[item.dataset.selfpayService].topic!==serviceFilter.value);});
};
function resetSelfServiceSelection(returnFocus = false) {
  selfServiceOptions.hidden = false; selfSelected.hidden = true;
  if (returnFocus) selectedSelfServiceButton?.focus({ preventScroll: true });
  else { closeServiceInfo(); selfServiceOptions.scrollTop = 0; }
}
document.querySelector('#widget-service-back').addEventListener('click', () => resetSelfServiceSelection(true));

const inquiry = document.querySelector('#widget-inquiry');
const contactToggle = document.querySelector('#widget-contact-toggle');
function setInquiryOpen(open, focus = false) {
  inquiry.hidden = !open;
  contactToggle?.setAttribute('aria-expanded', String(open));
  root.classList.toggle('contact-view',open);
  if (open) { resizeChatInput(); contactStatus.hidden=false; inquiry.tabIndex=-1;inquiry.focus({preventScroll:true}); }
  else { closeChatResults(); if (focus) (contactToggle || (choicesOpen ? document.querySelector('#widget-private-toggle') : entryBook)).focus({preventScroll:true}); }
}
function setOpen(open) { setInquiryOpen(open); }
function setDoctorOptionsOpen(activeButton = null) {
  if(activeButton?.id==='widget-private-toggle'){openBooking({insurance:'private'});return;}
  closeChatResults();
  const selfpayOpen = activeButton?.id === 'widget-self-toggle';
  if (activeButton) setInquiryOpen(false);
  overviewBack.hidden = !choicesOpen && !activeButton;
  root.classList.toggle('selfpay-selection', selfpayOpen);
  doctorDisclosures.forEach(({button, options}) => {
    const open = button === activeButton;
    options.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    if (open && selfpayOpen) resetSelfServiceSelection();
  });
  panel.scrollTop = 0;
}
document.querySelector('#widget-private-toggle').addEventListener('click',()=>openBooking({insurance:'private'}));
doctorDisclosures.forEach(({button,options}) => button.addEventListener('click', () => setDoctorOptionsOpen(options.hidden ? button : null)));
overviewBack.addEventListener('click', () => {
  if (root.classList.contains('selfpay-selection')) {
    setDoctorOptionsOpen(); document.querySelector('#widget-self-toggle').focus({preventScroll:true});
  } else setBookingChoicesOpen(false, true);
});
contactToggle?.addEventListener('click', () => {const open = inquiry.hidden; setDoctorOptionsOpen(); setInquiryOpen(open);});
document.querySelector('#widget-inquiry-back').addEventListener('click', () => setInquiryOpen(false,true));
root.addEventListener('keydown', event => {
 if(event.key !== 'Escape' || event.defaultPrevented) return;
 event.preventDefault();
 if(root.classList.contains('booking-view')){return closeBooking();}
 if (!inquiry.hidden) setInquiryOpen(false,true);
 else if (!selfSelected.hidden) resetSelfServiceSelection(true);
 else if (root.classList.contains('selfpay-selection')) {setDoctorOptionsOpen();document.querySelector('#widget-self-toggle').focus({preventScroll:true});}
 else if (choicesOpen) setBookingChoicesOpen(false, true);
});
// Reuse the existing menu links so the header and hamburger stay in sync.
const headerMenus = [...document.querySelectorAll('.header-practice-disclosure')];
const navigationControls = [...document.querySelectorAll('#navigation [data-disclosure]')];
function showHeaderMenu(active) {
  if (active) navigationControls.forEach(button => {
    if (button.getAttribute('aria-expanded') === 'true') button.click();
  });
  headerMenus.forEach(group => {
    const open = group === active;
    group.querySelector('button').setAttribute('aria-expanded', String(open));
    group.querySelector('.header-practice-dropdown').hidden = !open;
  });
}
headerMenus.forEach(group => {
  const button = group.querySelector('button');
  const dropdown = group.querySelector('.header-practice-dropdown');
  const source = document.getElementById(group.dataset.menuSource);
  dropdown.replaceChildren(...[...source.children].map(link => link.cloneNode(true)));
  if (group.dataset.menuSource === 'nord-practice-menu') {
    const login = document.createElement('a');
    login.href = '/hno-praxis-nord-vorschau/hno/praxis.html'; login.textContent = 'Praxislogin'; login.className = 'practice-record-link';
    dropdown.append(login);
  }
  group.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse' && matchMedia('(hover:hover) and (pointer:fine)').matches) showHeaderMenu(group);
  });
  group.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse' && !group.contains(document.activeElement)) {
      button.setAttribute('aria-expanded', 'false');
      dropdown.hidden = true;
    }
  });
  button.addEventListener('click', event => {
    const mouse = event.pointerType === 'mouse' && matchMedia('(hover:hover) and (pointer:fine)').matches;
    showHeaderMenu(mouse || dropdown.hidden ? group : null);
  });
  group.addEventListener('keydown', event => {
    if (event.target === button && event.key === 'ArrowDown') {
      event.preventDefault(); showHeaderMenu(group); dropdown.querySelector('a').focus();
    } else if (event.key === 'Escape' && !dropdown.hidden) {
      event.preventDefault(); showHeaderMenu(null); button.focus();
    }
  });
  group.addEventListener('focusout', event => {
    if (event.relatedTarget && !group.contains(event.relatedTarget)) {
      button.setAttribute('aria-expanded', 'false');
      dropdown.hidden = true;
    }
  });
});
navigationControls.forEach(button => button.addEventListener('click', () => showHeaderMenu(null)));
document.addEventListener('click', event => {
  if (!event.target.closest('.header-practice-disclosure') || event.target.closest('.header-practice-dropdown a')) showHeaderMenu(null);
});

// Presentation-only channels: never load an SDK or launch another application.
const contactButtons=[...panel.querySelectorAll('[data-superchat-channel]')];
const contactStatus=document.querySelector('#widget-contact-status');
contactStatus.textContent='Demo – diese Kontaktkanäle versenden keine Nachrichten.';
contactStatus.hidden=false;
contactButtons.forEach(button=>{button.disabled=false;button.setAttribute('aria-describedby','widget-contact-status');button.addEventListener('click',()=>{contactStatus.textContent=button.textContent.trim()+' · Demo: Es wurde keine Nachricht versendet.';});});

const chatForm = document.querySelector('#widget-chat-form');
const chatInput = document.querySelector('#widget-chat-input');
const chatMic = document.querySelector('#widget-chat-mic');
const chatSubmit = chatForm.querySelector('[type="submit"]');
const chatStatus = document.querySelector('#widget-chat-status');
const chatResults = document.querySelector('#widget-chat-results');
const chatMatches = document.querySelector('#widget-chat-matches');
const chatMicIcon = chatMic.innerHTML;
const chatStopIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/></svg>';
const chatSendIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 3-7 18-4-7-7-4 18-7ZM10 14 21 3"/></svg>';
let chatRecording = false, chatVoiceReady = false, chatEngaged = false, chatPrefix = '', chatTranscript = '';
function engageChat() {
  if (!chatEngaged) root.style.setProperty('--widget-chat-top', `${root.getBoundingClientRect().top}px`);
  const enteringChat = !chatEngaged;
  chatEngaged = true;
  renderChatVoiceAction();
  if (enteringChat && mobileWidgetViewport.matches) panel.scrollTop = 0;
}
function syncMobileChatViewport() {
  if (document.documentElement.classList.contains('widget-embed')) return;
  if (mobileWidgetViewport.matches && !panel.hidden && (root.classList.contains('chat-focus')||root.classList.contains('booking-view'))) {
    const viewport = window.visualViewport;
    root.style.setProperty('--widget-visible-top', `${viewport?.offsetTop || 0}px`);
    root.style.setProperty('--widget-visible-height', `${viewport?.height || window.innerHeight}px`);
  } else {
    root.style.removeProperty('--widget-visible-top');
    root.style.removeProperty('--widget-visible-height');
  }
}
window.visualViewport?.addEventListener('resize', syncMobileChatViewport);
window.visualViewport?.addEventListener('scroll', syncMobileChatViewport);
window.addEventListener('resize', syncMobileChatViewport);
mobileWidgetViewport.addEventListener('change', syncMobileChatViewport);
function resizeChatInput() {
  if (!chatInput.clientWidth) return;
  chatInput.style.height = '0px';
  chatInput.style.height = `${Math.max(38, chatInput.scrollHeight)}px`;
  if (chatRecording || document.activeElement === chatInput) {
    const bottom = chatInput.getBoundingClientRect().bottom;
    const visibleBottom = root.getBoundingClientRect().bottom - 12;
    if (bottom > visibleBottom) panel.scrollTop += bottom - visibleBottom;
  }
}
function renderChatVoiceAction() {
  const label = chatRecording ? 'Aufnahme stoppen' : chatVoiceReady ? 'Frage abschicken' : 'Spracheingabe starten';
  chatMic.dataset.voiceState = chatRecording ? 'recording' : chatVoiceReady ? 'ready' : 'idle';
  chatMic.setAttribute('aria-label', label);
  chatMic.setAttribute('aria-pressed', String(chatRecording));
  chatMic.title = label;
  chatMic.innerHTML = chatRecording ? chatStopIcon : chatVoiceReady ? chatSendIcon : chatMicIcon;
  chatInput.readOnly = chatRecording;
  chatSubmit.disabled = chatRecording;
  root.classList.toggle('chat-focus', chatEngaged || chatRecording || chatVoiceReady || !chatResults.hidden);
  syncMobileChatViewport();
}
const chatSpeech = createDictation({
  Recognition: window.SpeechRecognition || window.webkitSpeechRecognition,
  // Use the existing continuous-message dictation mode, ending on the explicit stop action.
  purpose: 'feedback',
  limit: chatInput.maxLength,
  onText: text => {
    chatTranscript = text;
    chatInput.value = (chatPrefix + text).slice(0, chatInput.maxLength);
    resizeChatInput();
  },
  onState: active => {
    chatRecording = active;
    chatVoiceReady = !active && Boolean(chatTranscript.trim() && chatInput.value.trim());
    renderChatVoiceAction();
  },
  onStatus: text => {
    chatStatus.textContent = text.replace('mit dem Pfeil suchen', 'abschicken').replace('auf das Mikrofon tippen', 'auf das Stoppzeichen tippen');
    chatStatus.hidden = !text;
  }
});
function cancelChatSpeech() {
  chatSpeech.cancel();
  chatVoiceReady = false; chatTranscript = '';
  renderChatVoiceAction();
}
function closeChatResults(restoreFocus = false) {
  chatResults.hidden = true;
  chatEngaged = false;
  root.style.removeProperty('--widget-chat-top');
  cancelChatSpeech();
  chatStatus.hidden = true;
  if (restoreFocus) chatInput.focus({ preventScroll: true });
}
chatMic.addEventListener('click', () => {
  if (chatVoiceReady) { chatForm.requestSubmit(); return; }
  if (!chatRecording) {
    setDoctorOptionsOpen();
    engageChat();
    chatPrefix = chatInput.value.trim() ? chatInput.value.trim() + ' ' : '';
    chatTranscript = '';
  }
  chatSpeech.toggle();
});
chatInput.addEventListener('input', () => {
  engageChat();
  resizeChatInput();
  if (chatVoiceReady && !chatInput.value.trim()) { chatVoiceReady = false; renderChatVoiceAction(); }
});
chatInput.addEventListener('focus', () => { engageChat(); resizeChatInput(); });
chatInput.addEventListener('keydown', event => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.isComposing) {
    event.preventDefault();
    if (!chatRecording) chatForm.requestSubmit();
  }
});
let chatInputWidth = 0;
new ResizeObserver(([entry]) => {
  if (entry.contentRect.width !== chatInputWidth) {
    chatInputWidth = entry.contentRect.width;
    resizeChatInput();
  }
}).observe(chatForm);
document.querySelector('#widget-chat-close').addEventListener('click', () => closeChatResults(true));
document.querySelector('.widget-chat').addEventListener('keydown', event => {
  if (event.key === 'Escape' && (!chatResults.hidden || chatRecording || chatVoiceReady)) {
    event.preventDefault(); event.stopPropagation(); closeChatResults(true);
  }
});
window.addEventListener('pagehide', cancelChatSpeech);
document.addEventListener('visibilitychange', () => { if (document.hidden) cancelChatSpeech(); });
renderChatVoiceAction();

const normalizeChatText = text => text.toLowerCase().replaceAll('ß', 'ss').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const chatStopwords = new Set(['ich','mir','mein','meine','einen','eine','der','die','das','den','dem','und','ist','sind','mit','fur','bei','wie','was','kann','habt','ihr','bitte','mich','mochte','haben','konnte','einem','einer','gibt','viel','praxis','nord']);
// Source: hno-praxis-nord.de opening-hours/contact blocks, checked 2026-10-11.
// The practice owner explicitly confirmed 2026-10-15 is OPEN despite a conflicting site notice.
const practiceFacts = {
  source: 'https://www.hno-praxis-nord.de/',
  hours: [
    ['Montag', '08:00–12:00 Uhr\n15:00–18:00 Uhr'],
    ['Dienstag', '08:00–12:00 Uhr\n15:00–18:00 Uhr (privat)'],
    ['Mittwoch', '08:00–12:00 Uhr'],
    ['Donnerstag', '08:00–12:00 Uhr\n15:00–18:00 Uhr'],
    ['Freitag', '08:00–12:00 Uhr'],
    ['Samstag', 'Privat nach Vereinbarung'],
    ['Sonntag', 'Geschlossen']
  ],
  privateHours: [
    ['Montag', '08:00–09:00 Uhr\n17:00–18:00 Uhr'],
    ['Dienstag', '08:00–09:00 Uhr\n15:00–18:00 Uhr'],
    ['Mittwoch', '08:00–09:00 Uhr'],
    ['Donnerstag', '08:00–09:00 Uhr\n17:00–18:00 Uhr'],
    ['Freitag', '08:00–09:00 Uhr'],
    ['Samstag', 'Nach Vereinbarung'],
    ['Sonntag', 'Geschlossen']
  ],
  exceptions: {
    '2026-10-14': 'Am Mittwoch, 14.10.2026, bleibt die Praxis wegen einer internen Fortbildung geschlossen.',
    '2026-10-15': 'Am Donnerstag, 15.10.2026, ist die Praxis geöffnet.'
  }
};
function directPracticeAnswer(query, now = new Date()) {
  const q = normalizeChatText(query);
  const privatePractice = /privat|selbstzahl/.test(q);
  const schedule = privatePractice ? practiceFacts.privateHours : practiceFacts.hours;
  const source = practiceFacts.source;
  const heading = privatePractice ? 'Privatsprechstunde' : 'Sprechzeiten · HNO Praxis Nord';
  const days = schedule.filter(([day]) => q.includes(normalizeChatText(day)));
  const hoursQuestion = /offnungs|sprechzeit|\b(?:geoffnet|geschlossen|offen|uhr|heute|morgen|ubermorgen)\b/.test(q) || days.length || (/wann/.test(q) && !/termin|buchen/.test(q));
  if (hoursQuestion) {
    const berlinDate = new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
    const numericDate = q.match(/\b(\d{1,2})\.\s*(\d{1,2})\.(?:\s*(20\d{2}))?/);
    const octoberDate = q.match(/\b(\d{1,2})\.?\s+oktober(?:\s+(20\d{2}))?/);
    let date;
    if (numericDate) date = `${numericDate[3] || berlinDate.slice(0,4)}-${numericDate[2].padStart(2,'0')}-${numericDate[1].padStart(2,'0')}`;
    else if (octoberDate) date = `${octoberDate[2] || berlinDate.slice(0,4)}-10-${octoberDate[1].padStart(2,'0')}`;
    else if (/\bheute\b/.test(q)) date = berlinDate;
    else if (/\b(?:morgen|ubermorgen)\b/.test(q)) {
      const next = new Date(berlinDate + 'T12:00:00Z');
      next.setUTCDate(next.getUTCDate() + (/ubermorgen/.test(q) ? 2 : 1));
      date = next.toISOString().slice(0,10);
    }
    if (date) {
      if (date >= '2026-12-24' && date <= '2027-01-01') return {title:heading,text:'Vom 24.12.2026 bis einschließlich 01.01.2027 ist die Praxis geschlossen.',source};
      const parsed = new Date(date + 'T12:00:00Z');
      if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10) !== date) return {title:heading,text:'Bitte gib ein gültiges Datum an.'};
      const exception = practiceFacts.exceptions[date];
      const day = schedule[(parsed.getUTCDay() + 6) % 7];
      if (date === '2026-10-14') return {title:heading,text:exception,source};
      return {title:heading,text:exception || `Reguläre Zeiten für den ${date.slice(8)}.${date.slice(5,7)}.${date.slice(0,4)}:`,rows:[day],source:date === '2026-10-15' ? undefined : source};
    }
    // A doctor's personal schedule is not the same as the practice's opening hours.
    if (/loch|kripke|keita/.test(q)) return {title:'Persönlicher Terminkalender',text:'Die freien Termine des gewünschten Arztes findest du in seinem Kalender.',...(privatePractice ? {action:'widget-private-toggle'} : {url:'/hno-praxis-nord-vorschau/termine/widget?service=kasse'})};
    return {title:heading,rows:days.length ? days : schedule,source};
  }
  if (/adresse|anfahrt|standort|wo (?:ist|finde|findet|liegt)|wie (?:komme|erreiche) ich .*praxis/.test(q)) {
    return {title:'Adresse und Anfahrt',text:'Artemisstraße 9\n13469 Berlin\nIn der Nähe des S-Bahnhofs Waidmannslust.',source};
  }
  if (/telefon|rufnummer|nummer|anrufen|e-?mail.?adresse/.test(q)) {
    return {title:privatePractice?'Kontakt · Privatpraxis':'Kontakt · HNO Praxis Nord',text:privatePractice?'Telefon: 0160 411 22 22\nE-Mail: privat@hno.de':'Telefon: 030 411 22 22\nE-Mail: praxisnord@hno.de',source};
  }
  if (/welche arzte|wer behandelt|behandler|arzteteam/.test(q)) return {title:'Unser Ärzteteam',text:'Dr. med. Alexander Loch\nOlaf Kripke\nDr. Douty Keita',source};
  if (/akut|notfall/.test(q)) return {title:'Akutsprechstunde',text:'Montag bis Freitag von 08:00 bis 10:00 Uhr. Bitte frage vorher beim Praxisteam an, da die Anzahl der Akuttermine begrenzt ist.',source};
  return null;
}
function chatEntries() {
  return [
    {title:'Termin in der HNO Praxis Nord', text:'Freie Termine bei Dr. med. Alexander Loch, Olaf Kripke und Dr. Douty Keita.', keywords:'termin buchen kasse gesetzlich arzt arzte kalender', url:'/hno-praxis-nord-vorschau/termine/widget?service=kasse'},
    {title:'Privat-Sprechstunde', text:'Behandler auswählen und einen Termin in der Privatpraxis buchen.', keywords:'termin buchen privat privatversichert arzt arzte kalender', action:'widget-private-toggle'},
    {title:'Leistungen für Selbstzahlende', text:'Terminarten und Preise ansehen.', keywords:'kosten kostet preis preise selbstzahler selbstzahlend leistungen', action:'widget-self-toggle'},
    {title:'Rezept, Überweisung und weitere Anfragen', text:'Nutze WhatsApp, E-Mail oder SMS direkt unter diesem Feld, um das Praxisteam zu erreichen.', keywords:'rezept uberweisung anfragen kontakt nachricht bescheinigung krankschreibung telefon', contact:true},
    ...Object.entries(SELF_PAY_SERVICES).map(([id, service]) => ({
      title:service.name,
      text:`${service.description} · ${catalogue.getElementById(id).querySelector('.service-price').textContent}`,
      keywords:service.name + ' ' + service.description,
      service:id
    }))
  ];
}
chatForm.addEventListener('submit', event => {
  event.preventDefault(); engageChat(); cancelChatSpeech();
  const query = chatInput.value.trim();
  if (!query) { closeChatResults(true); return; }
  const words = [...new Set(normalizeChatText(query).match(/[a-z0-9]+/g) || [])].filter(word => word.length > 2 && !chatStopwords.has(word));
  const direct = directPracticeAnswer(query);
  const found = direct ? [{entry:direct}] : chatEntries().map(entry => ({entry, score:words.reduce((score, word) => score + (normalizeChatText(entry.title).includes(word) ? 5 : 0) + (normalizeChatText(entry.keywords).includes(word) ? 2 : 0) + (normalizeChatText(entry.text).includes(word) ? 1 : 0), 0)}))
    .filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  chatMatches.replaceChildren();
  for (const {entry} of found) {
    const item = document.createElement('article'); item.className = 'widget-chat-answer';
    const title = document.createElement('strong'); title.textContent = entry.title;
    const text = document.createElement('p'); text.textContent = entry.text;
    item.append(title);
    if (entry.text) item.append(text);
    if (entry.rows) {
      const list = document.createElement('dl');
      entry.rows.forEach(([day, hours]) => {
        const row = document.createElement('div');
        const label = document.createElement('dt'); label.textContent = day;
        const value = document.createElement('dd'); value.textContent = hours;
        row.append(label, value); list.append(row);
      });
      item.append(list);
    }
    if (entry.source) {
      const source = document.createElement('a'); source.className = 'widget-chat-source';
      source.href = entry.source; source.textContent = 'Praxiswebseite'; item.append(source);
    }
    if (entry.action || entry.service || entry.contact || entry.url) {
      const action = document.createElement(entry.url ? 'a' : 'button'); if(entry.url) action.href = entry.url; else action.type = 'button'; action.className = 'widget-chat-answer-action';
      action.textContent = entry.contact ? 'Kontaktmöglichkeiten' : entry.service ? 'Mehr Infos & Termin buchen' : entry.action === 'widget-self-toggle' ? 'Terminarten ansehen' : 'Termin buchen';
      item.append(action);
      action.addEventListener('click', () => {
        if(entry.url) return;
        if (entry.contact) {
          contactButtons.find(button => !button.disabled)?.focus({ preventScroll: true });
          return;
        }
        const disclosure = document.getElementById(entry.service ? 'widget-self-toggle' : entry.action);
        setDoctorOptionsOpen(disclosure);
        if (entry.service) {
          const serviceItem = [...selfServiceOptions.children].find(li => li.dataset.selfpayService === entry.service);
          const infoButton = serviceItem.querySelector('[aria-controls]');
          infoButton.click(); infoButton.focus();
        } else {
          const options = document.getElementById(disclosure.getAttribute('aria-controls'));
          options.querySelector('a,button')?.focus();
        }
      });
    }
    chatMatches.append(item);
  }
  if (!found.length) {
    const empty = document.createElement('p'); empty.className = 'widget-chat-empty';
    empty.textContent = 'Dazu habe ich keine passende Praxisinfo gefunden. Du kannst die Praxis darunter über WhatsApp, E-Mail oder SMS fragen.';
    chatMatches.append(empty);
  }
  chatResults.hidden = false;
  renderChatVoiceAction();
  chatMatches.scrollTop = 0;
  chatStatus.hidden = true;
});

// Embed the same booking engine used on /hno/ into this persistent panel.
const bookingHost=document.querySelector('#widget-booking');
let bookingOpener=null;
const booking=mountBooking(bookingHost,{
 embedded:true,
 onOpen(){root.classList.add('booking-view');document.body.classList.add('widget-booking-active');bookingHost.hidden=false;panel.scrollTop=0;syncMobileChatViewport();},
 onClose(){closeBooking();},
 onContact(){if(closeBooking()){setInquiryOpen(true);}},
 onBusy(busy){bookingHost.querySelector('[data-widget-home]').disabled=busy;}
});
function openBooking(selection){
 bookingOpener=document.activeElement;
 setBookingChoicesOpen(true);
 setInquiryOpen(false);setDoctorOptionsOpen();
 booking.open({practice:'hno-praxis-nord-tgq6sni',...selection});
}
function closeBooking(){
 if(!booking.cancel())return false;
 bookingHost.hidden=true;root.classList.remove('booking-view');
 document.body.classList.remove('widget-booking-active');
 document.querySelector('#widget-resume').hidden=!booking.hasDraft;
 setDoctorOptionsOpen(bookingOpener?.classList.contains('widget-service-book') ? document.querySelector('#widget-self-toggle') : null);
 (bookingOpener?.isConnected?bookingOpener:document.querySelector('#widget-private-toggle')).focus({preventScroll:true});
 syncMobileChatViewport();
 return true;
}
bookingHost.querySelector('[data-widget-home]').onclick=closeBooking;
document.querySelector('#widget-resume').onclick=()=>{bookingOpener=document.querySelector('#widget-resume');booking.resume();};
// Legacy links in the local catalogue are intercepted before navigation.
root.addEventListener('click',event=>{
 const link=event.target.closest('a[href]');if(!link)return;
 const url=new URL(link.href);
 if(url.origin===location.origin&&url.pathname==='/hno-praxis-nord-vorschau/hno/index.html'){
  event.preventDefault();openBooking(Object.fromEntries(url.searchParams));
 }
});

// Keep keyboard interaction in the near-fullscreen mobile booking panel.
function mobileBookingActive(){return mobileWidgetViewport.matches&&root.classList.contains('booking-view');}
function bookingFocusTargets(){return [...bookingHost.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length);}
bookingHost.addEventListener('keydown',event=>{
 if(event.key!=='Tab'||!mobileBookingActive())return;
 const targets=bookingFocusTargets(),first=targets[0],last=targets.at(-1);
 if(!first)return;
 if(event.shiftKey&&(document.activeElement===first||!targets.includes(document.activeElement))){event.preventDefault();last.focus();}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});
document.addEventListener('focusin',event=>{
 if(mobileBookingActive()&&!bookingHost.contains(event.target))bookingHost.querySelector('[data-booking-title]').focus({preventScroll:true});
});

import { initEmbedding } from './embed.js?v=20261027-compact-b';
initEmbedding(root, () => {
  if (root.classList.contains('booking-view')) {
    bookingHost.querySelector('[data-booking-title]').focus({preventScroll:true});
  } else {
    setInquiryOpen(false);
    setBookingChoicesOpen(true, true);
  }
});

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
