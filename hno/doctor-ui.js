import {DOCTORS,CLINICS,bookingLink} from './doctor-profiles.js';
import {esc} from './api.js';
export function portrait(id,className='doctor-portrait'){
 const d=DOCTORS[id];if(!d)return '';
 return d.photo?`<img class="${className}" src="${d.photo}" alt="${esc(d.name)}" loading="lazy" width="660" height="660">`:`<span class="${className} portrait-initials" aria-label="${esc(d.name)}">DK</span>`;
}
let dialog,opener;
export function openDoctor(id,onBook){
 const d=DOCTORS[id];if(!d)return;
 if(!dialog){dialog=document.createElement('dialog');dialog.className='doctor-profile-dialog';dialog.setAttribute('aria-labelledby','doctor-profile-name');document.body.append(dialog);dialog.addEventListener('close',()=>opener?.isConnected&&opener.focus());}
 opener=document.activeElement;
 dialog.innerHTML=`<button class="icon-button profile-close" aria-label="Arztprofil schließen">×</button><div class="doctor-profile-head">${portrait(id)}<div><p class="profile-kicker">${esc(CLINICS[d.practice].name)}</p><h2 id="doctor-profile-name" tabindex="-1">${esc(d.name)}</h2><p>${esc(d.title)}</p></div></div><div class="doctor-profile-content"><p class="profile-intro">${esc(d.intro)}</p><h3>Schwerpunkte</h3><div class="focus-tags">${d.focus.map(f=>`<span>${esc(f)}</span>`).join('')}</div><h3>Beruflicher Weg</h3>${d.cv.length?`<ol class="cv-timeline">${d.cv.map(([date,title,copy])=>`<li><span>${esc(date)}</span><div><strong>${esc(title)}</strong><p>${esc(copy)}</p></div></li>`).join('')}</ol>`:'<p>Weitere Stationen des Lebenslaufs sind auf der Praxiswebseite noch nicht veröffentlicht.</p>'}${d.extra?`<p>${esc(d.extra)}</p>`:''}<a class="profile-source" href="${d.source}" target="_blank" rel="noopener">Angaben der Praxis ansehen ↗</a></div><div class="doctor-profile-footer">${onBook?'<button class="button" id="profile-book">Termin auswählen →</button>':`<a class="button" href="${bookingLink(d.practice,id)}">Termin auswählen →</a>`}<a href="${d.practice}.html">Praxis kennenlernen ↗</a></div>`;
 dialog.querySelector('.profile-close').onclick=()=>dialog.close();
 if(onBook)dialog.querySelector('#profile-book').onclick=()=>{dialog.close();onBook();};
 dialog.showModal();dialog.querySelector('h2').focus({preventScroll:true});
}
