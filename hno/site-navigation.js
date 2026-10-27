import {initNavigationIcons,ACCOUNT_ICON,MENU_ICON} from './navigation-icons.js';
import {initAccountAccess} from './account-access.js';
import {initAnimatedBrand} from './animated-brand.js';
export function navigationMarkup(){return `<div class="site-controls" data-site-navigation>
  <div class="site-disclosure">
    <button class="site-control" type="button" aria-label="Konto öffnen" aria-expanded="false" aria-controls="account-navigation" data-disclosure="Konto">
      ${ACCOUNT_ICON}<span class="session-dot" hidden></span>
    </button>
    <div class="site-dropdown" id="account-navigation" hidden><p>Konto</p><div class="session-status" role="status" hidden></div><div data-account-links><a href="/hno-praxis-nord-vorschau/hno/testrollen.html">Eigenes Konto prüfen</a></div></div>
  </div>
  <div class="site-disclosure">
    <button class="site-control site-menu-toggle" type="button" aria-label="Menü öffnen" aria-expanded="false" aria-controls="site-navigation" data-disclosure="Menü">
      ${MENU_ICON}
    </button>
    <div class="site-dropdown" role="navigation" aria-label="Hauptnavigation" id="site-navigation" hidden><p>Entdecke med.one</p><a href="index.html#themen">Deine Gesundheit</a><a href="index.html#praxen-entdecken">Praxen</a><a href="index.html#behandler">Behandler</a><a href="index.html#ablauf">So funktioniert’s</a><a href="index.html#praxen">Für Praxen</a><div class="site-legal-links" aria-label="Über uns"><p>Über uns</p><a href="/hno-praxis-nord-vorschau/hno/impressum.html">Impressum</a><a href="/hno-praxis-nord-vorschau/hno/datenschutz.html">Datenschutz</a></div></div>
  </div>
</div>`;}

export function initNavigation({accountAccess=true}={}){
 initAnimatedBrand();
 const root=document.querySelector('[data-site-navigation]');
 if(!root)return;
 initNavigationIcons(root);
 if(accountAccess)initAccountAccess(root);
 const buttons=[...root.querySelectorAll('[data-disclosure]')];
 function setOpen(button,open){
  button.setAttribute('aria-expanded',String(open));
  button.setAttribute('aria-label',`${button.dataset.disclosure} ${open?'schließen':'öffnen'}${button.dataset.sessionLabel?' – '+button.dataset.sessionLabel:''}`);
  document.getElementById(button.getAttribute('aria-controls')).hidden=!open;
 }
 function closeAll(){buttons.forEach(button=>setOpen(button,false));}
 buttons.forEach(button=>{
  button.addEventListener('click',()=>{
   const open=button.getAttribute('aria-expanded')!=='true';
   closeAll();setOpen(button,open);
  });
  button.addEventListener('keydown',event=>{
   if(event.key==='ArrowDown'){
    event.preventDefault();closeAll();setOpen(button,true);
    document.getElementById(button.getAttribute('aria-controls')).querySelector('a, button:not([disabled])')?.focus();
   }
  });
 });
 root.addEventListener('click',event=>{if(event.target.closest('a'))closeAll();});
 document.addEventListener('click',event=>{if(!root.contains(event.target))closeAll();});
 document.addEventListener('focusin',event=>{if(!root.contains(event.target))closeAll();});
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  const active=buttons.find(button=>button.getAttribute('aria-expanded')==='true');
  if(active){closeAll();active.focus();event.preventDefault();}
 });
 return closeAll;
}
