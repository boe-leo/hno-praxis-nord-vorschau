'use strict';
const menuButton=document.querySelector('.menu-toggle');
const menu=document.querySelector('#mobile-nav');
function closeMenu(){menu.hidden=true;menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Menü öffnen');}
menuButton.addEventListener('click',()=>{const open=menu.hidden;menu.hidden=!open;menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Menü schließen':'Menü öffnen');});
menu.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
document.addEventListener('click',e=>{if(!e.target.closest('#mobile-nav,.menu-toggle'))closeMenu();const dd=document.querySelector('.nav-services');if(dd&&!e.target.closest('.nav-services'))dd.open=false;if(e.target.closest('[data-book]'))document.dispatchEvent(new CustomEvent('practice:book',{detail:{opener:e.target.closest('[data-book]')}}));});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){closeMenu();menuButton.focus();}if(e.key==='Escape'){const dd=document.querySelector('.nav-services');if(dd?.open){dd.open=false;dd.querySelector('summary').focus();}}});
matchMedia('(min-width:901px)').addEventListener('change',e=>{if(e.matches)closeMenu();});
const gallery=document.querySelector('#gallery-dialog');
const photos=[['empfang.jpg','Empfang'],['behandlung.jpg','Behandlungszimmer'],['rezeption.jpg','Rezeption'],['mikroskop.jpg','HNO-Untersuchungsplatz'],['warten.jpg','Wartebereich']];
let photoIndex=0,opener;
function showPhoto(index){photoIndex=(index+photos.length)%photos.length;const [file,label]=photos[photoIndex];document.querySelector('#gallery-image').src='/hno-praxis-nord-vorschau/assets/'+file;document.querySelector('#gallery-image').alt=label+' der HNO Praxis Nord';document.querySelector('#gallery-caption').textContent=label;document.querySelector('#gallery-count').textContent=`${photoIndex+1} / ${photos.length}`;}
document.querySelectorAll('[data-photo]').forEach(button=>button.addEventListener('click',()=>{opener=button;showPhoto(Number(button.dataset.photo));gallery.showModal();document.body.classList.add('modal-open');}));
gallery.querySelector('.gallery-close').addEventListener('click',()=>gallery.close());
document.querySelector('#gallery-prev').addEventListener('click',()=>showPhoto(photoIndex-1));
document.querySelector('#gallery-next').addEventListener('click',()=>showPhoto(photoIndex+1));
gallery.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();showPhoto(photoIndex-1);}if(e.key==='ArrowRight'){e.preventDefault();showPhoto(photoIndex+1);}});
gallery.addEventListener('click',e=>{if(e.target===gallery){const r=gallery.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)gallery.close();}});
gallery.addEventListener('close',()=>{document.body.classList.remove('modal-open');opener?.focus();});

// Three reviews per desktop page; one per page on narrow screens.
// Without JavaScript every stored review remains readable.
const reviewCollection = document.querySelector('.review-collection');
if (reviewCollection) {
  const list = reviewCollection.querySelector('.review-list');
  const reviews = [...list.querySelectorAll('.review')];
  const controls = reviewCollection.querySelector('.review-navigation');
  const previous = controls.querySelector('[data-review-prev]');
  const next = controls.querySelector('[data-review-next]');
  const counter = controls.querySelector('.review-count');
  const narrowScreen = matchMedia('(max-width:800px)');
  let pageSize = narrowScreen.matches ? 1 : 3;
  let currentPage = 0;
  const pageCount = () => Math.ceil(reviews.length / pageSize);

  function showPage(index) {
    currentPage = Math.max(0, Math.min(index, pageCount() - 1));
    const first = currentPage * pageSize;
    reviews.forEach((review, i) => { review.hidden = i < first || i >= first + pageSize; });
    previous.setAttribute('aria-disabled', String(currentPage === 0));
    next.setAttribute('aria-disabled', String(currentPage === pageCount() - 1));
    counter.textContent = `Seite ${currentPage + 1} von ${pageCount()}`;
    controls.hidden = pageCount() <= 1;
  }

  function fitPages() {
    const first = currentPage * pageSize;
    pageSize = narrowScreen.matches ? 1 : 3;
    // Measure the longest entry so paging does not move the controls.
    list.style.minHeight = '';
    reviews.forEach(review => { review.hidden = false; });
    list.style.minHeight = `${Math.ceil(Math.max(...reviews.map(review => review.getBoundingClientRect().height)))}px`;
    showPage(Math.floor(first / pageSize));
  }

  previous.addEventListener('click', () => showPage(currentPage - 1));
  next.addEventListener('click', () => showPage(currentPage + 1));
  controls.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showPage(currentPage + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  fitPages();
  let lastWidth = list.getBoundingClientRect().width;
  new ResizeObserver(([entry]) => {
    if (Math.abs(entry.contentRect.width - lastWidth) < 1) return;
    lastWidth = entry.contentRect.width;
    fitPages();
  }).observe(list);
  document.fonts.ready.then(fitPages);
}
