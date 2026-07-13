import fs from 'node:fs';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const statuses = new Set(['confirmed', 'planned', 'optional', 'tentative']);
const locations = readJson('data/locations.json');
const days = readJson('data/days.json');
const reservations = readJson('data/reservations.json');
const routes = readJson('data/routes.json');
const locationIds = new Set(locations.map((location) => location.id));
const routeIds = new Set(routes.map((route) => route.id));
const errors = [];

const minutes = (time) => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

for (const location of locations) {
  for (const field of ['id', 'name', 'city', 'mapsUrl', 'category', 'reservationStatus']) {
    if (!location[field]) errors.push(`location ${location.id || '?'} missing ${field}`);
  }
  if (!statuses.has(location.reservationStatus)) errors.push(`bad location status ${location.id}`);
  if (!location.mapsUrl.startsWith('https://www.google.com/maps/')) errors.push(`bad maps url ${location.id}`);
  if (location.officialUrl && !location.officialUrl.startsWith('https://')) errors.push(`official URL must be https for ${location.id}`);
}

for (const day of days) {
  for (const field of ['date', 'city', 'title', 'status', 'items']) {
    if (!day[field]) errors.push(`day missing ${field}`);
  }
  if (!statuses.has(day.status)) errors.push(`bad day status ${day.date}`);
  if (!day.attire?.male || !day.attire?.female) errors.push(`day ${day.date} missing male/female attire`);
  if (day.status === 'confirmed' && day.items.some((item) => item.status !== 'confirmed')) {
    errors.push(`day ${day.date} is confirmed but contains non-confirmed items`);
  }
  for (const routeId of day.routeIds || []) {
    if (!routeIds.has(routeId)) errors.push(`day ${day.date} references missing route ${routeId}`);
  }
  for (const item of day.items) {
    for (const field of ['start', 'title', 'type', 'status', 'description']) {
      if (!item[field]) errors.push(`item ${day.date} missing ${field}`);
    }
    if (!statuses.has(item.status)) errors.push(`bad item status ${item.title}`);
    if (item.locationId && !locationIds.has(item.locationId)) errors.push(`missing location ${item.locationId}`);
  }
}

for (const reservation of reservations) {
  for (const field of ['date', 'start', 'venue', 'status', 'locationId']) {
    if (!reservation[field]) errors.push(`reservation missing ${field}`);
  }
  if (reservation.status !== 'confirmed') errors.push(`reservation not confirmed: ${reservation.venue}`);
  if (!locationIds.has(reservation.locationId)) errors.push(`reservation missing location ${reservation.locationId}`);
}

for (const route of routes) {
  if (!route.url.startsWith('https://www.google.com/maps/dir/')) errors.push(`route ${route.id} is not Google directions`);
  if (!route.label || !route.mode) errors.push(`route ${route.id} missing label or mode`);
}

const september5 = days.find((day) => day.date === '2026-09-05');
if (!september5?.alerts?.some((alert) => alert.title.includes('Host schedule needs revision'))) {
  errors.push('September 5 must flag the host schedule conflict');
}
if (!september5?.items?.some((item) => item.title.includes('EasyJet U2 7606') && item.status === 'confirmed' && item.start === '22:00')) {
  errors.push('September 5 confirmed EasyJet flight is missing or altered');
}

const foodTour = days.flatMap((day) => day.items).find((item) => item.title.includes('Lisbon Food and Wine'));
if (!foodTour || foodTour.status !== 'confirmed' || minutes(foodTour.end) - minutes(foodTour.start) < 180) {
  errors.push('Lisbon food tour must be confirmed and blocked for at least three hours');
}

const monday = days.find((day) => day.date === '2026-09-07');
if (!monday?.notes?.some((note) => note.includes('closed Mondays'))) {
  errors.push('Lisbon Monday must clearly state Jerónimos and Belém Tower interiors are closed Mondays');
}

const yeatmanDay = days.find((day) => day.date === '2026-09-10');
if (!yeatmanDay?.items?.some((item) => item.title.includes('The Yeatman') && item.status === 'confirmed' && item.start === '19:30')) {
  errors.push('The Yeatman confirmed 7:30 PM dinner is missing or altered');
}
if (!yeatmanDay?.alerts?.some((alert) => alert.body.includes('5:35 AM'))) {
  errors.push('The Yeatman day must warn about next-morning 5:35 AM checkout');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Validated ${days.length} days, ${locations.length} locations, ${reservations.length} reservations, ${routes.length} routes.`);
