import {practiceDisplayName} from './directory-display.js';

const API_BASE='/hno-praxis-nord-vorschau/hno/api';
function sessionContext(){
 const path=globalThis.location?.pathname||'';
 return /^\/hno\/(?:aerzte(?:\/|$)|praxis\.html$|testrollen\.html$)/.test(path)?'practice':'patient';
}
async function csrfForPost(context){
 const response=await fetch(API_BASE+'/config',{credentials:'same-origin',cache:'no-store',headers:{'X-MedOne-Context':context}});
 const config=await response.json().catch(()=>({}));
 if(!response.ok||typeof config.csrf!=='string'||!config.csrf)throw new Error('Die Sitzung konnte nicht vorbereitet werden. Bitte lade die Seite erneut.');
 return config.csrf;
}
export async function api(path,body,options={}){
 const writing=body!==undefined,context=sessionContext(),boundCsrf=options.csrf;
 if(boundCsrf!==undefined&&(typeof boundCsrf!=='string'||!boundCsrf.trim()))throw new Error('Deine Sitzung konnte nicht bestätigt werden. Bitte lade dein Konto neu.');
 const headers={'X-MedOne-Context':context,...(writing?{'Content-Type':'application/json','X-CSRF-Token':boundCsrf===undefined?await csrfForPost(context):boundCsrf}:{})};
 const response=await fetch(API_BASE+path,{method:writing?'POST':'GET',headers,credentials:'same-origin',cache:'no-store',body:writing?JSON.stringify(body):undefined});
 const data=await response.json().catch(()=>({error:'Die Verbindung ist unterbrochen. Bitte versuche es erneut.'}));
 if(!response.ok){const error=new Error(data.error||'Bitte versuche es erneut.');error.status=response.status;error.code=data.code;throw error;}
 if(data.practice_name)data.practice_name=practiceDisplayName(data.practice_name);
 if(Array.isArray(data.practices))data.practices.forEach(p=>{p.name=practiceDisplayName(p.name);});
 if(Array.isArray(data.appointments))data.appointments.forEach(a=>{a.practice_name=practiceDisplayName(a.practice_name);});
 return data;
}
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const dateText=start=>new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(start));
export const timeText=start=>new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit'}).format(new Date(start));
export const localDate=start=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(start));
export function normalizedDays(days){const groups=new Map();for(const day of days||[])for(const slot of day.slots||[]){if(!Number.isFinite(Date.parse(slot.start)))continue;const date=localDate(slot.start);if(!groups.has(date))groups.set(date,{date,label:dateText(slot.start),slots:[]});groups.get(date).slots.push({start:slot.start,time:timeText(slot.start)});}return [...groups.values()];}
export function loginForm({compact=false}={}){return `<form id="login-form">${compact?'':'<p class="small">Melde dich mit deinem persönlichen Konto an.</p>'}<label class="form-label" for="username">E-Mail-Adresse</label><input class="form-control" id="username" type="email" autocomplete="username" required maxlength="180"><label class="form-label" for="password">Passwort</label><input class="form-control" id="password" type="password" autocomplete="current-password" required maxlength="128"><p class="inline-error" id="login-error" role="alert"></p><button class="button full" type="submit">Anmelden${compact?'':' →'}</button></form>`;}
function errorAt(container,error){const el=container.querySelector('#login-error');if(el)el.textContent=error.message;}
export function bindLogin(container,onSuccess){
 const form=container.querySelector('#login-form');
 form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('button');button.disabled=true;
 try{const result=await api('/login',{username:form.querySelector('#username').value,password:form.querySelector('#password').value});
 form.querySelector('#password').value='';
 if(result.authenticated!==true||result.twofa_required)throw new Error('Die Anmeldung wurde nicht abgeschlossen. Bitte prüfe deine Zugangsdaten.');
 await onSuccess();
 }catch(error){form.querySelector('#password').value='';errorAt(container,error);button.disabled=false;}};
}
// Existing booking/account entry: password login, optional SMS-verified registration.
export function smsLogin(container,onSuccess){
 container.innerHTML=loginForm();bindLogin(container,onSuccess);
 const backToLogin=()=>{smsLogin(container,onSuccess);container.querySelector('#username').focus();};
 const actions=document.createElement('div');actions.className='login-actions';container.append(actions);
 const recovery=document.createElement('button');recovery.type='button';recovery.className='text-button';recovery.textContent='Passwort vergessen?';recovery.onclick=()=>passwordRecovery(container,backToLogin);actions.append(recovery);
 const form=container.querySelector('#login-form');
 api('/registration/status').then(status=>{
  if(!status.enabled||!form.isConnected||status.authenticated)return;
  const button=document.createElement('button');button.type='button';button.className='text-button';const registrationRow=document.createElement('div');registrationRow.className='login-registration';const prompt=document.createElement('span');prompt.textContent='Noch kein Konto? ';registrationRow.append(prompt);button.textContent='Registrieren';
  button.onclick=async()=>{button.disabled=true;try{const {startPatientRegistration}=await import('./registration.js');startPatientRegistration(container,onSuccess,backToLogin);}catch(error){errorAt(container,error);button.disabled=false;}};
  registrationRow.append(button);actions.prepend(registrationRow);
 }).catch(()=>{});
}
export function passwordRecovery(container,onBack){
 container.innerHTML='<h2>Passwort vergessen?</h2><p class="small">Wir schicken dir einen Link, mit dem du ein neues Passwort festlegen kannst.</p><form id="recovery-form"><label class="form-label" for="recovery-email">Anmelde-E-Mail-Adresse</label><input class="form-control" id="recovery-email" type="email" autocomplete="email" maxlength="254" required><p class="inline-error" role="alert"></p><button class="button full" type="submit">Link anfordern</button></form><button class="text-button" id="recovery-back" type="button">Zurück zur Anmeldung</button>';
 const form=container.querySelector('#recovery-form');let current=true;
 container.querySelector('#recovery-back').onclick=()=>{current=false;onBack();};
 form.onsubmit=async event=>{
  event.preventDefault();const button=form.querySelector('[type=submit]');if(button.disabled)return;button.disabled=true;
  const error=form.querySelector('[role=alert]');error.textContent='';
  try{
   await api('/account/password/request',{email:form.querySelector('input').value.trim()});
   if(!current||!form.isConnected)return;
   form.innerHTML='<p role="status">Falls zu dieser Adresse ein freigegebenes Konto besteht, erhältst du einen Link per E-Mail. Er gilt 30 Minuten. Bitte prüfe auch deinen Spam-Ordner.</p>';
  }catch(caught){if(current&&form.isConnected){error.textContent=caught.message;button.disabled=false;}}
 };
}
