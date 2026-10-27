export function distanceKm(a,b){
  const rad=Math.PI/180,lat=(b.lat-a.lat)*rad,lon=(b.lon-a.lon)*rad;
  const h=Math.sin(lat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(lon/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
export function rankPractices(practices,origin){
  return practices.filter(p=>p.coordinates&&Number.isFinite(Date.parse(p.next_slot_iso))&&Date.parse(p.next_slot_iso)>Date.now())
    .map(p=>({...p,distance:distanceKm(origin,p.coordinates)})).sort((a,b)=>a.distance-b.distance);
}

export function locateDevice(button,input,status,onLocation){
  if(!window.isSecureContext){status.textContent='Die automatische Standorterkennung benötigt HTTPS. Bitte gib deinen Ort oder deine PLZ ein.';return;}
  if(!navigator.geolocation){status.textContent='Dieser Browser bietet keine Standorterkennung. Bitte gib deinen Ort oder deine PLZ ein.';return;}
  const previous=input.value;
  button.disabled=true;status.textContent='Standort wird ermittelt …';
  navigator.geolocation.getCurrentPosition(position=>{
    button.disabled=false;
    if(input.value!==previous){status.textContent='Deine eingegebene Ortsangabe bleibt erhalten.';return;}
    const origin={label:'Aktueller Standort',lat:position.coords.latitude,lon:position.coords.longitude};
    onLocation(origin);
    status.textContent='Standort übernommen';
  },error=>{
    button.disabled=false;
    status.textContent=error.code===1
      ?'Standortzugriff nicht erlaubt. Erlaube ihn in den Website- und Geräte-Einstellungen oder gib Ort bzw. PLZ ein.'
      :error.code===3?'Die Standorterkennung dauert zu lange. Bitte erneut versuchen oder Ort bzw. PLZ eingeben.'
      :'Das Gerät konnte den Standort nicht bestimmen. Bitte gib Ort oder PLZ ein.';
  },{enableHighAccuracy:false,timeout:10000,maximumAge:60000});
}
