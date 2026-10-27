// Only public availability is read. Insurance groups keep their existing calendars.
export const PRACTICE = 'hno-praxis-nord-tgq6sni';
export const PUBLIC_BOOKING = '/hno-praxis-nord-vorschau/termine/widget?service=kasse';
export const PRIVATE_BOOKING = '/hno-praxis-nord-vorschau/hno/index.html?practice=' + PRACTICE;
const KASSE_DOCTORS = ['keita', 'kripke', 'loch'];
const fresh = (value, maxAge, now) => Number.isFinite(Date.parse(value)) && now >= Date.parse(value) && now - Date.parse(value) <= maxAge;

export function statutoryNext(snapshot, now = Date.now()) {
  const service = snapshot?.services?.find(s => s.id === 'kasse');
  if (service?.status !== 'available' || !fresh(service.checkedAt, 1200000, now)) throw new Error('Verfügbarkeit nicht bestätigt');
  const rows = service.practitioners;
  if (!Array.isArray(rows) || rows.length !== KASSE_DOCTORS.length || !KASSE_DOCTORS.every(id => rows.filter(d => d.id === id).length === 1)) throw new Error('Kalender unvollständig');
  const slots = rows.map(doctor => {
    if (doctor.status !== 'available' || !fresh(doctor.checkedAt, 1200000, now) || !doctor.name || !(Date.parse(doctor.next?.startsAt) > now)) throw new Error('Kalender nicht bestätigt');
    return { start: doctor.next.startsAt, name: doctor.name, doctor: doctor.id };
  }).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  return { ...slots[0], expiresAt: Math.min(Date.parse(service.checkedAt), ...rows.map(d => Date.parse(d.checkedAt))) + 1200000,
    href: PUBLIC_BOOKING + '&practitioner=' + encodeURIComponent(slots[0].doctor) };
}

export function privateNext(doctors, results, now = Date.now()) {
  if (!Array.isArray(doctors) || !doctors.length || new Set(doctors.map(d => d.id)).size !== doctors.length || doctors.length !== results.length) throw new Error('Kalender unvollständig');
  const slots = doctors.flatMap((doctor, index) => {
    const result = results[index];
    if (!doctor.id || typeof doctor.name !== 'string' || !Array.isArray(result?.days)) throw new Error('Kalender nicht bestätigt');
    if (result.booking_enabled === false) return [];
    return result.days.flatMap(day => {
      if (!Array.isArray(day.slots)) throw new Error('Kalender nicht bestätigt');
      return day.slots.map(slot => {
        if (!Number.isFinite(Date.parse(slot.start))) throw new Error('Terminzeit nicht bestätigt');
        return { start: slot.start, doctor: doctor.id, name: doctor.name };
      });
    });
  }).filter(slot => Date.parse(slot.start) > now && Date.parse(slot.start) < now + 14 * 86400000)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  if (!slots.length) return null;
  return { ...slots[0], href: PRIVATE_BOOKING + '&doctor=' + encodeURIComponent(slots[0].doctor) + '&start=' + encodeURIComponent(slots[0].start) };
}

async function getJson(path) {
  const response = await fetch(path, { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('Verfügbarkeit nicht erreichbar');
  return response.json();
}
export async function loadStatutory() { return statutoryNext(await getJson('/hno-praxis-nord-vorschau/termine/api/availability')); }
export async function loadPrivate() {
  const { doctors } = await getJson('/hno-praxis-nord-vorschau/hno/api/doctors?practice=' + PRACTICE);
  if (!Array.isArray(doctors) || !doctors.length || doctors.length > 20) throw new Error('Kalender nicht bestätigt');
  const results = await Promise.all(doctors.map(doctor => getJson('/hno-praxis-nord-vorschau/hno/api/slots?' + new URLSearchParams({ practice: PRACTICE, doctor: doctor.id }))));
  return privateNext(doctors, results);
}
