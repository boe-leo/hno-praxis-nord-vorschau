// One explicitly started dictation session. Never submits a search or books a slot.
export function createDictation({Recognition, language = 'de-DE', onText, onState, onStatus, limit = 150, purpose = 'search'}) {
  const report = onStatus;
  onStatus = message => report(purpose === 'feedback' ? message.replaceAll('deine Frage', 'deine Nachricht').replace('und mit dem Pfeil suchen', 'und anschließend senden').replace('und suchen', 'und anschließend senden') : message);
  let active = null, timeout;
  const reset = session => {
    if (active !== session) return;
    clearTimeout(timeout);
    active = null;
    onState(false);
  };
  const cancel = () => {
    const session = active;
    if (!session) return;
    // Ignore results/end events delivered after closing or starting another session.
    reset(session);
    try { session.abort(); } catch { /* Already disconnected. */ }
  };
  const toggle = () => {
    if (active) {
      try { active.stop(); } catch { cancel(); }
      return;
    }
    if (!Recognition) {
      onStatus('Dein Browser unterstützt hier keine Spracheingabe. Bitte tippe deine Frage oder nutze die Diktierfunktion deiner Tastatur.');
      return;
    }
    let session;
    try {
      session = new Recognition();
      active = session;
      session.lang = language;
      session.continuous = purpose === 'feedback';
      session.interimResults = true;
      session.maxAlternatives = 1;
      let received = false;
      session.onstart = () => {
        if (active === session) onStatus(purpose === 'feedback' ? 'Aufnahme läuft …' : 'Ich höre zu … Zum Beenden erneut auf das Mikrofon tippen.');
      };
      session.onresult = event => {
        if (active !== session) return;
        const text = Array.from(event.results, result => result[0].transcript).join(' ').trim().slice(0, limit);
        received = Boolean(text);
        onText(text);
      };
      session.onerror = event => {
        if (active !== session) return;
        const errors = {
          'not-allowed': 'Mikrofon nicht freigegeben. Erlaube es in den Website-Einstellungen oder tippe deine Frage.',
          'service-not-allowed': 'Die Spracheingabe ist in diesem Browser nicht freigegeben. Bitte tippe deine Frage.',
          'audio-capture': 'Kein Mikrofon verfügbar. Prüfe dein Mikrofon oder tippe deine Frage.',
          'no-speech': 'Keine Sprache erkannt. Versuche es erneut oder tippe deine Frage.',
          'network': 'Die Spracherkennung ist gerade nicht erreichbar. Bitte tippe deine Frage.'
        };
        onStatus(errors[event.error] || 'Spracheingabe nicht möglich. Bitte versuche es erneut oder tippe deine Frage.');
        cancel();
      };
      session.onend = () => {
        if (active !== session) return;
        reset(session);
        onStatus(received ? (purpose === 'feedback' ? '' : 'Text übernommen. Du kannst ihn bearbeiten und mit dem Pfeil suchen.') : 'Keine Sprache erkannt. Du kannst es erneut versuchen oder tippen.');
      };
      onState(true);
      onStatus('Mikrofon wird gestartet …');
      timeout = setTimeout(() => {
        if (active !== session) return;
        cancel();
        onStatus('Spracheingabe beendet. Du kannst den Text bearbeiten und suchen.');
      }, 30000);
      session.start();
    } catch {
      if (session && active === session) cancel();
      onStatus('Spracheingabe derzeit nicht verfügbar. Bitte tippe deine Frage.');
    }
  };
  return {toggle, cancel};
}
