import {api,esc} from './api.js';

const roleNames={patient:'Patient:in',doctor:'Arzt/Ärztin',practitioner:'Arzt/Ärztin',reception:'Empfang / MFA',billing:'Abrechnung','practice-admin':'Praxisverwaltung','platform-admin':'Plattformverwaltung','feedback-admin':'Feedback-Verwaltung','integration-admin':'Schnittstellenverwaltung',operations:'Betrieb', 'security-audit':'Sicherheit / Audit',personnel:'Personalplanung',support:'Support'};
export function roleName(me){return roleNames[me.medone_role||me.role]||'Konto';}
export function ownArea(me){
 if(me.medone_role==='doctor'&&me.role==='practitioner')return {href:'/hno-praxis-nord-vorschau/hno/praxis.html',label:'Mein Behandlerkalender'};
 if(me.medone_role==='patient'&&me.role==='patient')return {href:'/hno-praxis-nord-vorschau/hno/konto.html',label:'Meine Termine'};
 return {href:'/hno-praxis-nord-vorschau/hno/testrollen.html',label:'Mein Konto'};
}

const renderVersions=new WeakMap();
export async function initAccountAccess(root){
 const links=root?.querySelector('[data-account-links]');
 if(!links)return;
 const version=(renderVersions.get(root)||0)+1;renderVersions.set(root,version);
 const active=()=>renderVersions.get(root)===version&&root.isConnected&&links.isConnected;
 const patientOnly=root.dataset.accountAudience==='patient';
 const practiceOnly=root.dataset.accountAudience==='practice';
 const button=root.querySelector('[data-disclosure="Konto"]');
 function clearStatus(){
  root.querySelectorAll('.session-status').forEach(el=>{el.textContent='';el.hidden=true;});
  root.querySelectorAll('.session-dot').forEach(el=>{el.hidden=true;});
  if(button){delete button.dataset.sessionLabel;button.setAttribute('aria-label','Konto öffnen');button.title='';}
 }
 function signedOut(error){
  clearStatus();
  links.innerHTML=patientOnly?'<a href="/hno-praxis-nord-vorschau/hno/konto.html">Login für Patienten</a>':practiceOnly?'<a href="/hno-praxis-nord-vorschau/hno/praxis.html">Login für Ärzte</a><a href="/hno-praxis-nord-vorschau/hno/testrollen.html">Login für MFA und Verwaltung</a>':error?.status===401?'<a href="/hno-praxis-nord-vorschau/hno/konto.html">Patientenanmeldung</a><a href="/hno-praxis-nord-vorschau/hno/praxis.html">Arztanmeldung</a><a href="/hno-praxis-nord-vorschau/hno/testrollen.html">Anmeldung für MFA und Verwaltung</a>':'<a href="/hno-praxis-nord-vorschau/hno/testrollen.html">Eigenes Konto prüfen</a>';
 }
 clearStatus();links.innerHTML='<p class="small" role="status">Konto wird geladen …</p>';
 try{
  const me=await api('/me');if(!active())return;
  if(me.authenticated!==true)throw new Error('Keine bestätigte Anmeldung.');
  const isPatient=me.role==='patient'&&me.medone_role==='patient';
  if((practiceOnly&&isPatient)||(patientOnly&&!isPatient))throw Object.assign(new Error('Bitte im passenden Bereich anmelden.'),{status:401});
  const area=ownArea(me);
  let displayName=me.name,label=roleName(me),practiceName='';
  if(isPatient){
   const profile=await api('/patient/profile');if(!active())return;
   displayName=[profile.first_name,profile.last_name].filter(part=>typeof part==='string'&&part.trim()).join(' ').trim()||'Dein Konto';
   label=profile.gender==='male'?'Patient':profile.gender==='female'?'Patientin':'Patient*in';
  }else if(practiceOnly&&me.role==='practitioner'&&me.medone_role==='doctor'){
   const practice=await api('/practice/me');if(!active())return;
   if(!['self','practice'].includes(practice.calendar_scope)||practice.doctor_id!==me.user_id||practice.medone_role!=='doctor'||practice.role!=='practitioner'||typeof practice.practice_name!=='string')throw new Error('Praxiszuordnung nicht bestätigt.');
   practiceName=practice.practice_name;
  }
  links.innerHTML=`<div class="account-menu-identity"><strong>${esc(displayName)}</strong><span>${esc(label)}</span>${practiceName?`<span>${esc(practiceName)}</span>`:''}</div><a href="${area.href}">${area.label}</a><button type="button" class="text-button" data-account-logout>Abmelden</button><p class="small" role="alert" data-account-error></p>`;
  root.querySelectorAll('.session-dot').forEach(el=>{el.hidden=false;});
  if(button){button.dataset.sessionLabel=displayName+' – '+label;button.setAttribute('aria-label',`Konto öffnen – ${button.dataset.sessionLabel}`);}
  links.querySelector('[data-account-logout]').onclick=async()=>{
   if(!active())return;
   // Clear personally identifying content before waiting for the logout reply.
   const logoutVersion=version+1;renderVersions.set(root,logoutVersion);
   clearStatus();links.innerHTML='<p class="small" role="status">Abmeldung wird abgeschlossen …</p>';
   try{await api('/logout',{});if(renderVersions.get(root)===logoutVersion&&root.isConnected)location.reload();}
   catch(error){
    if(renderVersions.get(root)!==logoutVersion||!root.isConnected)return;
    signedOut(error);
   }
  };
 }catch(error){if(active())signedOut(error);}
}
