// One visual source for public pages, patient accounts and the practice workspace.
export const ACCOUNT_ICON='<svg class="medone-navigation-icon account-outline" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="11"/><circle cx="13.5" cy="11" r="3.4"/><path d="M6 22a8 8 0 0 1 15 0"/></svg>';
export const MENU_ICON='<svg class="medone-navigation-icon" viewBox="0 0 24 24" aria-hidden="true"><g class="navigation-bars"><path d="M4 6h16M4 12h16M4 18h16"/></g><g class="navigation-cross"><path d="M6 6l12 12M6 18L18 6"/></g></svg>';
export function initNavigationIcons(root=document){
 if(!document.querySelector('#medone-navigation-icons')){
  const link=document.createElement('link');link.id='medone-navigation-icons';link.rel='stylesheet';link.href=new URL('./navigation-icons.css?v=20261004-1',import.meta.url).href;document.head.append(link);
 }
 for(const [selector,markup] of [['[data-disclosure="Konto"],#workspace-account-button',ACCOUNT_ICON],['[data-disclosure="Menü"],#workspace-menu-button',MENU_ICON]]){
  root.querySelectorAll(selector).forEach(button=>{button.classList.add('medone-navigation-control');const old=button.querySelector('svg');if(old)old.outerHTML=markup;});
 }
}
