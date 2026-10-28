import {SELF_PAY_SERVICES, SELF_PAY_PRICE_NOTE} from './selfpay-services.js?v=20261026-refined';
import {mountPaymentMethod} from './payment-method.js';
import {shuffled} from './directory-display.js';
import {profileFields,readProfile} from './patient-profile.js';
import {CLINICS,clinicForSlug,CLINIC_TOPICS} from './doctor-profiles.js';
import {portrait,openDoctor} from './doctor-ui.js';
import {rankPractices,locateDevice} from './location.js';
import {TOPICS} from './topics.js';
import {api,esc,dateText,timeText,normalizedDays,smsLogin} from './api.js';

/** One booking state per mounted surface; no page navigation in embedded mode. */
export function mountBooking(container, options = {}) {
const embedded = options.embedded === true;
const body=container.querySelector('[data-booking-body]'),heading=container.querySelector('[data-booking-title]'),description=container.querySelector('[data-booking-description]'),progress=container.querySelector('.booking-progress');
const dialog={get open(){return active;},showModal(){active=true;options.onOpen?.();},close(){active=false;searchVersion++;options.onClose?.();},set scrollTop(value){container.scrollTop=value;}};
let active=false,opening=false,opener=null,state={},practice=null,doctor=null,days=[],searchVersion=0,selectedLocation=null,currentStep=0,submitting=false,uncertain=false;
let profileDraft={},loginEmail='',authPanel=null;
const authParking=document.createElement('div');authParking.hidden=true;container.append(authParking);
const locationInput={value:''},topicInput={value:'HNO & allgemeine Beratung'};
const shortTopic=t=>t==='HNO & allgemeine Beratung'?'Allgemeine HNO':t;
function locate(button,input,status){locateDevice(button,input,status,origin=>{selectedLocation=origin;input.value=origin.label;locationInput.value=origin.label;});}
function saveDraft(){if(authPanel&&body.contains(authPanel)){authPanel.querySelectorAll('input[type=password]').forEach(input=>{input.value='';});authParking.append(authPanel);}const form=body.querySelector('#patient-booking-form');if(form)profileDraft=readProfile(form);loginEmail=authPanel?.querySelector('#username')?.value||loginEmail;}
function invalidateSlot(){state.start='';state.pendingStart='';state.requestId=null;days=[];}
function hasConcern(){return Boolean(state.insurance&&(!embedded||state.insurance!=='self'||state.selfpayService));}
function stepButtons(){
 progress.querySelectorAll('button').forEach((b,i)=>{b.disabled=submitting||uncertain||opening||(i===1&&!hasConcern())||(i===2&&!state.start);});
}
function go(step){
 if(submitting||uncertain||opening||step===currentStep)return;
 saveDraft();searchVersion++;
 if(step===1)concern();
 else if(step===2&&hasConcern()){if(doctor)loadSlots();else if(state.direct&&practice)chooseDoctor();else choosePractice();}
 else if(step===3&&state.start)phone();
 focus();
}
progress.innerHTML=['Anliegen','Termin','Bestätigung'].map((label,i)=>`<li><button type="button" data-step="${i+1}" aria-label="Schritt ${i+1}: ${label}"><span class="booking-step-number" aria-hidden="true">${i+1}</span><span class="booking-step-label">${label}</span></button></li>`).join('');
progress.querySelectorAll('button').forEach(b=>b.onclick=()=>go(Number(b.dataset.step)));
const icon=name=>`<svg class="icon" aria-hidden="true"><use href="/hno-praxis-nord-vorschau/hno/icons.svg#${name}"/></svg>`;
function title(step,text,copy){if(step!==3)checkoutStage(null);currentStep=step;heading.textContent=text;description.textContent=copy;progress.hidden=!step;progress.querySelectorAll('li').forEach((el,i)=>{el.classList.toggle('completed',i+1<step);const button=el.querySelector('button');if(i+1===step)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});stepButtons();}
// Keep the task scroll area separate from its actions, without losing form ownership.
function renderBody(markup){
 body.innerHTML=`<div class="booking-content">${markup}</div>`;
 const content=body.querySelector('.booking-content');
 let actions=content.querySelector('.booking-action-bar');
 const next=content.querySelector(':scope > #next');
 if(!actions&&next){actions=document.createElement('div');actions.className='booking-action-bar';next.before(actions);actions.append(next);}
 if(!actions)return;
 const form=actions.closest('form');
 if(form)actions.querySelectorAll('button').forEach(button=>button.setAttribute('form',form.id));
 body.append(actions);
}
function focus(){heading.focus({preventScroll:true});const content=body.querySelector('.booking-content');if(content)content.scrollTop=0;}
function checkoutStage(stage){
 const steps=container.querySelector('[data-checkout-progress]');if(!steps)return;
 steps.hidden=stage===null;
 steps.innerHTML=stage===null?'':['Anmeldung','Angaben','Buchung'].map((name,index)=>`<li ${index===stage?'aria-current="step"':''}>${name}</li>`).join('');
}
function focusNotice(element){element.tabIndex=-1;element.focus({preventScroll:true});element.scrollIntoView({block:'nearest'});}
function priceSummary(){return state.selfpayService?.price?`<span class="booking-price">${esc(state.selfpayService.price)}</span>`:'';}
function emptySlots(retry){
 title(2,'Zurzeit keine Termine',embedded?'Privatpraxis Nord':practice.name);
 renderBody(`<div class="booking-empty"><h3>Aktuell ist kein Online-Termin frei.</h3><p>Prüfe die Verfügbarkeit später erneut oder nutze die Kontaktmöglichkeiten der Praxis.</p><button class="button full" id="retry">Erneut prüfen</button>${options.onContact?'<button class="text-button" id="contact-practice">Kontakt zur Praxis</button>':''}<button class="dialog-back" id="back">Zurück zum Anliegen</button></div>`);
 body.querySelector('#retry').onclick=retry;
 body.querySelector('#back').onclick=()=>go(1);
 const contact=body.querySelector('#contact-practice');if(contact)contact.onclick=()=>options.onContact();
 focus();
}
function show(){if(!dialog.open){opener=document.activeElement;dialog.showModal();}focus();}
function start(topic,search={}){opening=false;locationInput.value=search.location||'';selectedLocation=search.origin||null;searchVersion++;doctor=null;practice=null;profileDraft={};loginEmail='';authPanel?.remove();authPanel=null;state={topic:topic||topicInput.value,insurance:'',start:'',day:0,location:locationInput.value.trim(),origin:selectedLocation};if(!state.location){title(1,'Wo suchst du deinen Termin?','Wähle eine Stadt, einen Stadtteil oder eine Postleitzahl.');renderBody('<form id="location-form"><label class="form-label" for="booking-location">Dein Standort</label><input id="booking-location" class="form-control" placeholder="Stadt, Stadtteil oder PLZ" list="locations" maxlength="80" required><button type="button" class="text-button" id="dialog-locate">Aktuellen Standort verwenden</button><p role="status" id="dialog-location-status" class="small"></p><div class="booking-action-bar"><button class="button full">Weiter</button></div></form>');const input=body.querySelector('#booking-location');input.oninput=()=>{selectedLocation=null;};body.querySelector('#dialog-locate').onclick=e=>locate(e.currentTarget,input,body.querySelector('#dialog-location-status'));body.querySelector('#location-form').onsubmit=e=>{e.preventDefault();state.location=input.value.trim();state.origin=selectedLocation;locationInput.value=state.location;concern();focus();};}else concern();show();}
function appointmentName(){return state.selfpayService?.name||state.topic;}
function selfpayConcern(){
 const services=Object.entries(SELF_PAY_SERVICES),selected=state.selfpayService;
 const categories=[...new Set(services.map(([,service])=>service.topic))];
 state.selfpayCategory??=selected?.topic||'';
 const category=state.selfpayCategory;
 title(1,'Leistung auswählen','Für Selbstzahlende · Privatpraxis Nord');
 const options=services.filter(([,service])=>!category||service.topic===category).map(([id,service])=>`<label class="booking-service-option"><input type="radio" name="selfpay-service" value="${esc(id)}" ${service===selected?'checked':''} aria-labelledby="booking-${id}-name booking-${id}-price" aria-describedby="booking-${id}-description"><span><span class="booking-service-heading"><strong id="booking-${id}-name">${esc(service.name)}</strong><span class="booking-service-price" id="booking-${id}-price">${esc(service.price)}</span></span><span class="booking-service-description" id="booking-${id}-description">${esc(service.description)}</span></span></label>`).join('');
 renderBody(`<label class="form-label" for="booking-service-category">Leistungen nach Anliegen</label><select class="form-control" id="booking-service-category"><option value="">Alle Leistungen</option>${categories.map(topic=>`<option value="${esc(topic)}" ${topic===category?'selected':''}>${esc(topic)}</option>`).join('')}</select>${selected&&category&&selected.topic!==category?`<p class="booking-selected-service" role="status">Aktuelle Auswahl: <strong>${esc(selected.name)}</strong> · ${esc(selected.price)}</p>`:''}<fieldset class="booking-service-list"><legend>Leistung auswählen</legend>${options}</fieldset><p class="booking-price-note">${esc(SELF_PAY_PRICE_NOTE)}</p><button class="button full" id="next" ${selected?'':'disabled'}>Weiter zum Termin ${icon('arrow-right')}</button>`);
 body.querySelector('#booking-service-category').onchange=event=>{
  state.selfpayCategory=event.target.value;
  selfpayConcern();body.querySelector('#booking-service-category').focus({preventScroll:true});
 };
 body.querySelectorAll('[name=selfpay-service]').forEach(input=>input.onchange=()=>{
  const service=SELF_PAY_SERVICES[input.value];
  if(service===state.selfpayService)return;
  const scroll=body.querySelector('.booking-content').scrollTop;
  state.selfpayService=service;state.topic=service.topic;invalidateSlot();
  concern();
  body.querySelector('.booking-content').scrollTop=scroll;
  const chosen=body.querySelector('[name=selfpay-service]:checked');
  chosen.focus({preventScroll:true});chosen.scrollIntoView({block:'nearest'});
 });
 body.querySelector('#next').onclick=()=>go(2);
}
function concern(){
 searchVersion++;
 if(embedded&&state.insurance==='self'){selfpayConcern();return;}
 title(1,embedded?'Dein Anliegen':state.selfpayService?.name||'Dein Anliegen',embedded?'Privatpraxis Nord · '+(state.insurance==='private'?'Privatsprechstunde':'Selbstzahlerleistung'):state.selfpayService?.description||'Wähle dein Anliegen und deine Versicherungsart.');
 const insurance=embedded&&state.insurance
  ? `<p class="booking-insurance-note">${icon('check')}<span>${state.insurance==='private'?'Privatversichert · Privatärztliche Abrechnung':'Selbstzahler:in · Privatärztliche Abrechnung'}</span></p>`
  : `<fieldset class="insurance"><legend>Wie möchtest du den Termin wahrnehmen?</legend><label><input type="radio" name="insurance" value="private" ${state.insurance==='private'?'checked':''}><span><strong>Privatversichert</strong><small>Privatärztliche Abrechnung</small></span></label><label><input type="radio" name="insurance" value="self" ${state.insurance==='self'?'checked':''}><span><strong>Selbstzahler:in</strong><small>Mit gesetzlicher Versicherung</small></span></label></fieldset>`;
 renderBody(`${!state.direct?`<label class="form-label" for="booking-search-location">Dein Standort</label><input class="form-control" id="booking-search-location" value="${esc(state.location)}" placeholder="Stadt, Stadtteil oder PLZ" maxlength="80" required>`:''}<label class="form-label" for="booking-topic">Dein Anliegen</label><select class="form-control" id="booking-topic">${state.selfpayService?`<option value="selfpay-selected" selected>${esc(state.selfpayService.name)}</option>`:''}${Object.keys(TOPICS).filter(t=>!state.direct||CLINIC_TOPICS.includes(t)).map(t=>`<option ${!state.selfpayService&&t===state.topic?'selected':''}>${esc(t)}</option>`).join('')}</select>${insurance}<p class="small">Für die Buchung benötigst du ein Patientenkonto. Du kannst dich im letzten Schritt anmelden oder registrieren.</p><button class="button full" id="next" ${state.insurance?'':'disabled'}>${embedded?'Weiter zum Termin':'Weiter zur Terminauswahl'} ${icon('arrow-right')}</button>`);
 body.querySelector('#booking-topic').onchange=e=>{if(e.target.value!=='selfpay-selected'){state.selfpayService=null;state.topic=e.target.value;invalidateSlot();}concern();body.querySelector('#booking-topic').focus({preventScroll:true});};
 body.querySelectorAll('[name=insurance]').forEach(r=>r.onchange=()=>{if(state.insurance!==r.value)invalidateSlot();state.insurance=r.value;body.querySelector('#next').disabled=false;stepButtons();});
 const searchInput=body.querySelector('#booking-search-location');
 if(searchInput)searchInput.oninput=()=>{state.location=searchInput.value.trim();state.origin=null;doctor=null;practice=null;invalidateSlot();stepButtons();};
 body.querySelector('#next').onclick=()=>{if(searchInput&&!searchInput.reportValidity())return;doctor?loadSlots():state.direct?chooseDoctor():choosePractice();};
}
async function choosePractice(){
  const version=++searchVersion;
  title(2,'Deine Praxis in der Nähe',state.location+' · '+shortTopic(state.topic));
  renderBody('<p role="status">Standort und freie Termine werden geprüft …</p>');focus();
  const change=()=>go(1);
  try{
    if(!state.origin){
      const result=await api('/locations',{query:state.location});
      if(version!==searchVersion||!dialog.open)return;
      if(!result.locations.length)throw new Error('Diesen Ort konnten wir nicht finden. Bitte gib einen Stadtteil mit Stadt oder eine Postleitzahl ein.');
      if(result.locations.length>1){
        title(2,'Welchen Standort meinst du?','Wähle den passenden Ort. Grenze bei Bedarf mit Stadt oder PLZ ein (maximal 10 Treffer).');
        renderBody('<button class="dialog-back" id="back">'+icon('arrow-left')+'Suche ändern</button><div class="practice-results">'+result.locations.map((p,i)=>`<button class="practice-result" data-location="${i}"><span>${icon('map-pin')}</span><span>${esc(p.label)}</span>${icon('arrow-right')}</button>`).join('')+'</div>'+locationCredit);
        body.querySelector('#back').onclick=change;
        body.querySelectorAll('[data-location]').forEach(b=>b.onclick=()=>{state.origin=result.locations[Number(b.dataset.location)];state.location=state.origin.label;selectedLocation=state.origin;locationInput.value=state.location;choosePractice();});
        return;
      }
      state.origin=result.locations[0];state.location=state.origin.label;
    }
    const directory=await api('/practices');
    // Slot lists are authoritative: a directory's next-slot hint can be stale.
    const checked=await Promise.all(directory.practices.filter(()=>CLINIC_TOPICS.includes(state.topic)).map(async p=>{
      const team=await availableDoctors(p.slug);
      const upcoming=team.flatMap(d=>d.availableDays.flatMap(day=>day.slots)).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));
      return {...p,team,next_slot_iso:upcoming[0]?.start};
    }));
    if(version!==searchVersion||!dialog.open)return;
    const practices=rankPractices(checked,state.origin);
    function results(mode='doctors'){
      title(2,mode==='doctors'?'Ärztin oder Arzt wählen':'Deine Praxis in der Nähe',state.location+(mode==='doctors'?' · zufällige Reihenfolge':' · nach Entfernung sortiert'));
      const clinicians=shuffled(practices.flatMap(p=>p.team.filter(d=>d.availableDays.length).map(d=>({...d,practice:p}))));
      renderBody(`<div class="booking-results-toolbar"><button class="dialog-back" id="back">${icon('arrow-left')}Suche ändern</button><div class="results-mode" role="group" aria-label="Suchergebnisse anzeigen"><button data-mode="doctors" aria-pressed="${mode==='doctors'}">Behandler (${clinicians.length})</button><button data-mode="practices" aria-pressed="${mode==='practices'}">Praxen (${practices.length})</button></div></div><div class="practice-results">${mode==='doctors'?clinicians.map(d=>doctorResult(d,d.practice)).join(''):practices.map(p=>`<article class="result-doctor"><h3>${esc(p.name)}</h3><p>${esc(p.street)} · ${esc(p.zip)} ${esc(p.city)}</p><span class="distance-label">${distanceText(p.distance)} km Luftlinie</span><span class="availability">Nächster Termin: ${esc(dateText(p.next_slot_iso))} · ${esc(timeText(p.next_slot_iso))}</span><div class="result-actions"><button class="button" data-practice="${esc(p.slug)}">Team & Termine →</button><a href="/hno-praxis-nord-vorschau/hno/${clinicKey(p.slug)}.html">Praxis kennenlernen ↗</a></div></article>`).join('')}${(mode==='doctors'?clinicians.length:practices.length)?'':'<p>Für dieses Anliegen sind derzeit keine passenden Online-Termine hinterlegt. Du kannst dein Anliegen ändern oder die Praxis direkt kontaktieren.</p>'}</div>${locationCredit}`);
      body.querySelector('#back').onclick=change;
      body.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>results(b.dataset.mode));
      body.querySelectorAll('[data-practice]').forEach(b=>b.onclick=()=>{practice=practices.find(p=>p.slug===b.dataset.practice);doctor=null;chooseDoctor();});
      bindDoctorResults(clinicians);
    }
    results();
  }catch(e){if(version!==searchVersion||!dialog.open)return;renderBody(`<p role="alert">${esc(e.message)}</p><button class="button full" id="retry">Erneut versuchen</button><button class="text-button" id="back">Standort ändern</button>`);body.querySelector('#retry').onclick=choosePractice;body.querySelector('#back').onclick=change;}
}
const locationCredit='<p class="location-credit">Ortsdaten: <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer">GeoNames</a> · Deutschland · Entfernungen ungefähr. Die aktuell verfügbaren Praxen liegen in Berlin.</p>';
async function availableDoctors(slug){
  const team=await api('/doctors?practice='+encodeURIComponent(slug));
  return Promise.all(team.doctors.map(async d=>{
    const result=await api('/slots?practice='+encodeURIComponent(slug)+'&doctor='+encodeURIComponent(d.id));
    const availableDays=normalizedDays(result.days).map(day=>({...day,slots:day.slots.filter(s=>Date.parse(s.start)>Date.now()&&Date.parse(s.start)<=Date.now()+14*86400000)})).filter(day=>day.slots.length);
    return {...d,availableDays};
  }));
}
const distanceText=value=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:1}).format(value);
const clinicKey=slug=>Object.keys(CLINICS).find(k=>CLINICS[k].slug===slug);
function doctorResult(d,p){const first=d.availableDays[0]?.slots[0];
 if(embedded)return `<button class="booking-doctor-row" data-book-doctor="${esc(d.id)}" aria-label="Termin auswählen bei ${esc(d.name)}" ${first?'':'disabled'}>${portrait(d.id,'result-portrait').replace('src="practice-media/', 'src="/hno-praxis-nord-vorschau/hno/practice-media/')}<span><strong>${esc(d.name)}</strong><small>${first?esc(dateText(first.start))+' · '+esc(timeText(first.start))+' Uhr':'Aktuell keine freien Termine'}</small></span>${icon('arrow-right')}</button>`;
 return `<article class="result-doctor"><div class="result-doctor-main">${portrait(d.id,'result-portrait').replace('src="practice-media/', 'src="/hno-praxis-nord-vorschau/hno/practice-media/')}<div><h3>${esc(d.name)}</h3><p>${esc(p.name)}${Number.isFinite(p.distance)?' · '+distanceText(p.distance)+' km Luftlinie':''}</p></div></div><span class="availability">${first?'Nächster Termin: '+esc(dateText(first.start))+' · '+esc(timeText(first.start)):'Aktuell keine freien Online-Termine'}</span><div class="result-actions"><button class="button" data-book-doctor="${d.id}" ${first?'':'disabled'}>Termin auswählen →</button>${embedded?'':`<button class="text-button" data-profile="${d.id}">Profil & Lebenslauf</button><a href="/hno-praxis-nord-vorschau/hno/${clinicKey(p.slug)}.html">Praxis ↗</a>`}</div></article>`;}
function bindDoctorResults(team){
 const select=d=>{if(doctor?.id!==d.id)invalidateSlot();doctor=d;practice=d.practice;loadSlots();};
 body.querySelectorAll('[data-book-doctor]').forEach(b=>b.onclick=()=>select(team.find(d=>d.id===b.dataset.bookDoctor)));
 body.querySelectorAll('[data-profile]').forEach(b=>b.onclick=()=>{const d=team.find(d=>d.id===b.dataset.profile);openDoctor(d.id,d.availableDays.length?()=>select(d):undefined);});
}
async function chooseDoctor(){
  const version=++searchVersion;
  title(2,'Ärztin oder Arzt wählen',embedded?appointmentName():practice.name);
  renderBody('<p role="status">Ärzteteam und freie Termine werden geladen …</p>');focus();
  try{
    const team=shuffled(await availableDoctors(practice.slug)).map(d=>({...d,practice}));
    if(version!==searchVersion||!dialog.open)return;
    if(!team.some(d=>d.availableDays.length)){emptySlots(chooseDoctor);return;}
    renderBody(`${embedded&&state.selfpayService?`<p class="small">${esc(state.selfpayService.price)} · Abrechnung nach GOÄ</p>`:''}<button class="dialog-back" id="back">${icon('arrow-left')}Zurück zum Anliegen</button><div class="doctor-list">${team.map(d=>doctorResult(d,practice)).join('')||'<p>Aktuell sind keine Ärztinnen oder Ärzte online buchbar.</p>'}</div>${embedded?'':`<a class="practice-website" href="/hno-praxis-nord-vorschau/hno/${clinicKey(practice.slug)}.html">Praxis kennenlernen ${icon('arrow-up-right')}</a>`}`);
    body.querySelector('#back').onclick=()=>go(1);bindDoctorResults(team);
  }catch(e){if(version!==searchVersion||!dialog.open)return;renderBody(`<p role="alert">${esc(e.message)}</p><button class="button full" id="retry">Erneut versuchen</button><button class="text-button" id="back">Suche ändern</button>`);body.querySelector('#retry').onclick=chooseDoctor;body.querySelector('#back').onclick=()=>go(1);}
}
async function loadSlots(){
 const version=++searchVersion, selected=state.pendingStart||state.start;
 title(2,'Zeit für deine Gesundheit','Wir laden die verfügbaren Termine der Praxis.');
 renderBody('<p role="status">Verfügbarkeit wird geprüft …</p>');focus();
 try{
  const result=await api('/slots?practice='+encodeURIComponent(practice.slug)+'&doctor='+encodeURIComponent(doctor.id));
  if(version!==searchVersion||!active)return;
  days=normalizedDays(result.days).map(d=>({...d,slots:d.slots.filter(s=>Date.parse(s.start)>Date.now()&&Date.parse(s.start)<=Date.now()+14*86400000)})).filter(d=>d.slots.length);
  state.day=0;state.start='';state.pendingStart='';
  const index=days.findIndex(d=>d.slots.some(s=>s.start===selected));
  if(index>=0){state.day=index;state.start=selected;}else if(selected){state.requestId=null;}
  slots();
  if(selected&&index<0){const note=document.createElement('p');note.className='inline-error';note.setAttribute('role','alert');note.textContent='Der bisherige Termin ist nicht mehr verfügbar. Bitte wähle einen anderen.';(body.querySelector('.booking-content')||body).prepend(note);}
 }catch(error){if(version!==searchVersion||!active)return;renderBody(`<p role="alert">${esc(error.message)}</p><button class="button" id="retry">Erneut versuchen</button><button class="dialog-back" id="back">Zurück zum Anliegen</button>`);body.querySelector('#retry').onclick=loadSlots;body.querySelector('#back').onclick=()=>go(1);}
}
const weekday=new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',weekday:'long'});
const dayDate=new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',day:'2-digit',month:'2-digit'});
function dayLabel(day){const date=new Date(day.slots[0].start);return `<strong>${weekday.format(date)}</strong><span>${dayDate.format(date)}</span>`;}
function summary(){
 const location=embedded?'Privatpraxis Nord':practice?.name||'Deine Praxis';
 return `<section class="appointment-summary" aria-label="Deine Auswahl"><div class="booking-summary-main"><strong>${esc(doctor?.name||location)}</strong><p>${esc(appointmentName())}</p>${!embedded&&doctor?`<span class="booking-summary-practice">${esc(location)}</span>`:''}</div>${state.start?`<div class="booking-summary-time">${icon('calendar')}<span>${esc(dateText(state.start))}<strong>${esc(timeText(state.start))} Uhr</strong></span></div>`:''}${priceSummary()}</section>`;
}
function slots(){
 if(!days.length){emptySlots(loadSlots);return;}
 title(2,'Dein Wunschtermin','Wähle Tag und Uhrzeit. Alle Zeiten gelten für Berlin.');
 renderBody(`<button class="dialog-back" id="back">${icon('arrow-left')}Ärztin oder Arzt ändern</button>${summary()}<h3 class="booking-section-title">Tag auswählen</h3><div class="date-strip" role="group" aria-label="Verfügbare Tage">${days.map((d,i)=>`<button class="date-button" data-day="${i}" aria-pressed="${state.day===i}">${dayLabel(d)}</button>`).join('')}</div><h3 class="booking-section-title times-heading">Uhrzeit auswählen</h3><div class="slots live-slots" role="group" aria-label="Verfügbare Zeiten">${days[state.day].slots.map(s=>`<button class="slot" data-start="${esc(s.start)}" aria-pressed="${state.start===s.start}">${esc(s.time)}</button>`).join('')}</div><div class="booking-action-bar"><button class="button full" id="next" ${state.start?'':'disabled'}>Weiter zur Bestätigung ${icon('arrow-right')}</button></div>`);
 body.querySelector('#back').onclick=chooseDoctor;
 body.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{
  if(state.day===Number(b.dataset.day))return;
  const scroll=body.querySelector('.date-strip').scrollLeft;
  state.day=Number(b.dataset.day);state.start='';state.requestId=null;slots();
  body.querySelector('.date-strip').scrollLeft=scroll;
  const selected=body.querySelector(`[data-day="${state.day}"]`);
  selected.focus({preventScroll:true});selected.scrollIntoView({block:'nearest',inline:'nearest'});
 });
 body.querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>{state.start=b.dataset.start;state.requestId=null;body.querySelectorAll('[data-start]').forEach(x=>x.setAttribute('aria-pressed',x===b));body.querySelector('#next').disabled=false;stepButtons();});
 body.querySelector('#next').onclick=()=>{phone();focus();};
}
async function phone(notice=''){
 if(typeof notice!=='string')notice='';
 if(!state.start)return go(2);
 saveDraft();
 const version=++searchVersion;
 title(3,'Anmelden oder registrieren',notice||'Danach prüfst du deine Angaben und bestätigst den Termin.');checkoutStage(0);
 renderBody('<p role="status">Dein Konto wird geladen …</p>');focus();
 try{await api('/me');const profile=await api('/patient/profile');if(version!==searchVersion||!active)return;authPanel?.remove();authPanel=null;bookingProfile({...profile,...profileDraft});}
 catch(error){
  if(version!==searchVersion||!active)return;
  renderBody(`<button class="dialog-back" id="back">Zurück zur Terminauswahl</button>${summary()}<div id="booking-login"></div>`);
  body.querySelector('#back').onclick=()=>go(2);
  if(error.status===401){
   const login=body.querySelector('#booking-login');
   if(authPanel){login.replaceWith(authPanel);}else{
    authPanel=login;
    smsLogin(login,async()=>{if(!active||currentStep!==3)return;await phone();});
    login.querySelector('#username').value=loginEmail;
   }
  }else{body.querySelector('#booking-login').innerHTML=`<p role="alert">${esc(error.message)}</p><button class="button" id="retry-account">Erneut versuchen</button>`;body.querySelector('#retry-account').onclick=phone;}
 }
}
function bookingProfile(profile,review=profile.complete===true){
 title(3,review?'Deinen Termin prüfen':'Deine Angaben',review?'Prüfe deine Auswahl vor der verbindlichen Buchung.':'Ergänze die Angaben für deine Praxis.');
 checkoutStage(review?2:1);
 state.requestId=state.requestId||crypto.randomUUID();
 const birthdate=Number.isFinite(Date.parse(profile.birthdate+'T12:00:00Z'))?new Intl.DateTimeFormat('de-DE',{timeZone:'UTC'}).format(new Date(profile.birthdate+'T12:00:00Z')):'';
 renderBody(`<button class="dialog-back" id="back">Termin ändern</button>${summary()}<form id="patient-booking-form"><div class="patient-review" ${review?'':'hidden'}><div><strong>${esc([profile.title,profile.first_name,profile.last_name].filter(Boolean).join(' '))}</strong><p>${birthdate?'Geboren am '+esc(birthdate):''}</p>${profile.email?`<p>${esc(profile.email)}</p>`:''}</div><button class="text-button" id="edit-patient" type="button">Angaben ändern</button></div><fieldset class="booking-profile-fields" ${review?'hidden':''}>${profileFields(profile)}</fieldset><p class="small">Mobilnummer: ${esc(profile.phone)}</p>${state.selfpayService?`<p class="booking-price-note">${esc(SELF_PAY_PRICE_NOTE)}</p>`:''}<p class="inline-error" id="confirm-error" role="alert" tabindex="-1"></p><div class="booking-action-bar"><button class="button full" type="submit">${review?'Termin verbindlich buchen':'Angaben prüfen'} ${icon(review?'check':'arrow-right')}</button></div></form>`);
 const form=body.querySelector('#patient-booking-form');
 body.querySelector('#back').onclick=()=>go(2);
 body.querySelector('#edit-patient').onclick=()=>{saveDraft();bookingProfile({...profile,...profileDraft},false);focus();};
 // A stale "complete" flag must never hide fields the patient still needs to fill.
 if(review&&!form.checkValidity()){bookingProfile(profile,false);return;}
 form.addEventListener('invalid',()=>{if(review){body.querySelector('.booking-profile-fields').hidden=false;body.querySelector('.patient-review').hidden=true;}},true);
 form.onsubmit=async event=>{
  event.preventDefault();if(submitting)return;
  saveDraft();
  if(!review){bookingProfile({...profile,...profileDraft},true);focus();return;}
  const version=searchVersion,button=body.querySelector('[type=submit]');
  const payload={practice:practice.slug,doctor_id:doctor.id,starts_at:state.start,reason:appointmentName()+' · '+(state.insurance==='private'?'Privatversichert':'Selbstzahler'),request_id:state.requestId};
  submitting=true;button.disabled=true;body.querySelector('#back').disabled=true;body.querySelector('#edit-patient').disabled=true;stepButtons();options.onBusy?.(true);
  body.querySelector('#confirm-error').textContent='';
  let attempted=false;
  try{
   await api('/patient/profile',readProfile(form));
   attempted=true;
   const result=await api('/patient/book',payload);
   uncertain=false;
   if(version!==searchVersion||!active)return;
   success(result);focus();
  }catch(error){
   if(version!==searchVersion||!active)return;
   if(error.status===401){uncertain=false;await phone('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an; deine Auswahl bleibt erhalten.');return;}
   const message=body.querySelector('#confirm-error');message.textContent=error.message;
   if(error.status===409){state.start='';state.requestId=null;const retry=document.createElement('button');retry.type='button';retry.className='button';retry.textContent='Andere Uhrzeit auswählen';retry.onclick=()=>go(2);message.append(document.createElement('br'),retry);button.hidden=true;}
   if(attempted&&(!error.status||error.status>=500)){uncertain=true;message.textContent='Die Buchungsantwort ist nicht angekommen. Bitte prüfe dieselbe Bestätigung erneut. Deine Buchungskennung bleibt erhalten.';button.textContent='Bestätigung erneut prüfen';}
   focusNotice(message);
  }finally{
   submitting=false;options.onBusy?.(uncertain);
   if(button.isConnected)button.disabled=false;
   const back=body.querySelector('#back');if(back)back.disabled=uncertain;
   const edit=body.querySelector('#edit-patient');if(edit)edit.disabled=uncertain;
   stepButtons();
  }
 };
}
function success(result){
 title(0,result.demo?'Terminauswahl abgeschlossen.':'Dein Termin steht.',result.demo?'Hier findest du deine Termindaten.':'Deine Buchung wurde gespeichert.');
 renderBody(`<div class="success-mark">${icon('check')}</div>${summary()}<p><strong>${embedded?'Privatpraxis Nord':esc(practice?.name||result.practice_name)}</strong><br>${esc(practice?.street||'')}<br>${esc([practice?.zip,practice?.city].filter(Boolean).join(' '))}</p>${result.demo?'':'<p class="small">Du findest deinen Termin in deinem Patientenkonto.</p>'}<div id="booking-payment-method"></div>${embedded?'':'<a class="button full" href="/hno-praxis-nord-vorschau/hno/konto.html">Zu meinen Terminen</a>'}<div class="booking-action-bar"><button class="button full" id="done">Fertig</button></div>`);
 state.completed=true;
 body.querySelector('#done').onclick=()=>{state={};profileDraft={};loginEmail='';authPanel?.remove();authPanel=null;dialog.close();};
 if(practice?.slug==='hno-praxis-nord-tgq6sni')mountPaymentMethod(body.querySelector('#booking-payment-method'));
 options.onComplete?.(result);
}
async function openDirectBooking(selection){
 const params=new URLSearchParams(selection),slug=params.get('practice'),id=params.get('doctor');
 if(!slug)return;
 const c=clinicForSlug(slug);if(!c)return;
 opening=true;practice=null;doctor=null;
 profileDraft={};loginEmail='';authPanel?.remove();authPanel=null;
 state={topic:topicInput.value,insurance:['private','self'].includes(params.get('insurance'))?params.get('insurance'):'',start:'',day:0,location:c.zip+' Berlin',origin:null,direct:true,pendingStart:params.get('start')||''};
 if(slug==='hno-praxis-nord-tgq6sni'&&state.insurance==='self'){const id=params.get('service');if(Object.hasOwn(SELF_PAY_SERVICES,id)){state.selfpayService=SELF_PAY_SERVICES[id];state.topic=state.selfpayService.topic;}}
 locationInput.value=state.location;title(embedded&&state.selfpayService?2:1,'Dein Termin','Wir laden deine Auswahl …');renderBody('<p role="status">Deine Auswahl wird geladen …</p>');show();const version=++searchVersion;
 try{const directory=await api('/practices');if(version!==searchVersion||!dialog.open)return;practice=directory.practices.find(p=>p.slug===slug);if(!practice)throw new Error('Diese Praxis ist aktuell nicht online buchbar.');state.origin={...practice.coordinates,label:state.location};doctor=null;
 if(id){const data=await api('/doctors?practice='+encodeURIComponent(slug));if(version!==searchVersion||!dialog.open)return;doctor=data.doctors.find(d=>d.id===id);if(!doctor)throw new Error('Dieses Arztprofil ist aktuell nicht online buchbar.');}
 opening=false;
 if(embedded&&state.selfpayService){if(doctor)await loadSlots();else await chooseDoctor();}else{concern();focus();}
 }catch(e){if(version!==searchVersion||!active)return;opening=false;renderBody(`<p role="alert">${esc(e.message)}</p><button class="button" id="direct-reset">Erneut versuchen</button>`);body.querySelector('#direct-reset').onclick=()=>openDirectBooking(selection);}
}
return {start,open:openDirectBooking,cancel(){if(submitting||uncertain)return false;saveDraft();active=false;searchVersion++;return true;},resume(){
 if(!state.insurance||state.completed)return false;
 show();
 if(currentStep===3&&state.start)phone();
 else if(currentStep===2){if(doctor)loadSlots();else chooseDoctor();}
 else concern();
 return true;
},get hasDraft(){return Boolean(state.insurance&&practice&&!state.completed);},get busy(){return submitting||uncertain;}};
}
