// Isolated conference demo. Booking requests are answered in this browser only.
(() => {
  const nativeFetch = window.fetch.bind(window);
  const practice = 'hno-praxis-nord-tgq6sni';
  const doctors = [
    {id:'2805ba8a-1e5f-4e0c-84f3-7752de8bf0c3',name:'Olaf Kripke'},
    {id:'054b56bb-8592-4696-8e83-b283a585b135',name:'Dr. med. Alexander Loch'},
    {id:'2a49d7a3-9669-41f1-ba04-ca1b72d3cf7c',name:'Dr. Douty Keita'}
  ];
  const profile = {first_name:'Demo',last_name:'Person',gender:'unknown',birthdate:'1990-01-01',email:'demo@example.test',phone:'+4915100000000',complete:true};
  let authenticated = false;
  let challenge = '';
  const bookings = new Map();
  function reply(data, status = 200) {
    return new Response(JSON.stringify({...data,demo:true}), {
      status, headers:{'Content-Type':'application/json','Cache-Control':'no-store'}
    });
  }
  function slots() {
    return Array.from({length:5}, (_, offset) => {
      const day = new Date();
      day.setUTCDate(day.getUTCDate() + offset + 1);
      day.setUTCHours(8,0,0,0);
      return {slots:Array.from({length:6}, (_, i) => ({start:new Date(day.getTime()+i*1800000).toISOString()}))};
    });
  }
  window.fetch = async (input, init = {}) => {
    const url = new URL(input instanceof Request ? input.url : String(input), location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/hno-praxis-nord-vorschau/hno/api/')) {
      if (url.origin === location.origin && url.pathname.startsWith('/hno-praxis-nord-vorschau/termine/api/')) {
        return reply({error:'Nur das private Buchungsfenster ist Teil dieser Demo.'}, 503);
      }
      return nativeFetch(input, init);
    }
    const path = url.pathname.slice('/hno-praxis-nord-vorschau/hno/api'.length);
    const method = (init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    let body = {};
    if (init.body && typeof init.body === 'string') {
      try { body = JSON.parse(init.body); } catch { return reply({error:'Ungültiges JSON'}, 400); }
    }
    if (path === '/config') return reply({csrf:'browser-demo-only'});
    if (path === '/registration/status') return reply({enabled:true,authenticated,role:'patient'});
    if (path === '/locations') return reply({locations:[{lat:52.52,lon:13.405,label:'Berlin'}]});
    if (path === '/practices') return reply({practices:[{slug:practice,name:'HNO Privat Praxis (Berlin Nord)',street:'Artemisstraße 9',zip:'13469',city:'Berlin',coordinates:{lat:52.605,lon:13.321}}]});
    if (path === '/doctors') return reply({doctors});
    if (path === '/slots') return reply({days:slots()});
    if (path === '/login') { authenticated = true; return reply({authenticated:true,role:'patient'}); }
    if (path === '/registration/sms/start') {
      challenge = crypto.randomUUID();
      return reply({challenge_id:challenge,expires_at:Date.now()/1000+300,resend_at:Date.now()/1000+60});
    }
    if (path === '/registration/patient') {
      if (body.code !== '123456' || body.challenge_id !== challenge) return reply({error:'Demo-Code: 123456'},400);
      authenticated = true;
      return reply({authenticated:true,role:'patient'});
    }
    if (path === '/account/password/request') return reply({ok:true});
    if (['/me','/patient/profile','/patient/book'].includes(path) && !authenticated) return reply({error:'Bitte melde dich an.'},401);
    if (path === '/me') return reply({authenticated:true,role:'patient',username:'demo@example.test'});
    if (path === '/patient/profile') return reply(method === 'POST' ? {ok:true} : profile);
    if (path === '/patient/book') {
      if (!body.request_id) return reply({error:'request_id fehlt'},400);
      if (!bookings.has(body.request_id)) bookings.set(body.request_id, {practice_name:'HNO Privat Praxis (Berlin Nord)',starts_at:body.starts_at,id:crypto.randomUUID()});
      return reply(bookings.get(body.request_id));
    }
    if (path === '/site-stats/event') return reply({ok:true});
    return reply({error:'Dieser Endpunkt gehört nicht zur Demo.'},404);
  };
})();
