import fs from 'node:fs';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

const enhancementsPath = 'data/guide-enhancements.json';
if (!fs.existsSync(enhancementsPath)) process.exit(0);

const enhancements = readJson(enhancementsPath);
const trip = readJson('data/trip.json');
const days = readJson('data/days.json');
const locations = readJson('data/locations.json');
const routes = readJson('data/routes.json');

const upsertById = (array, values = []) => {
  for (const value of values) {
    const index = array.findIndex((entry) => entry.id === value.id);
    if (index >= 0) array[index] = value;
    else array.push(value);
  }
};

const normalizedLocations = (enhancements.locations || []).map((location) => ({
  ...location,
  mapsUrl: location.mapsUrl?.startsWith('https://www.google.com/maps/')
    ? location.mapsUrl
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.name} ${location.address || location.city}`)}`,
  officialUrl: location.officialUrl?.replace(/^http:/, 'https:'),
}));

upsertById(locations, normalizedLocations);
upsertById(routes, enhancements.routes);

for (const notice of enhancements.tripNotices || []) {
  const index = trip.globalNotices.findIndex((entry) => entry.title === notice.title);
  if (index >= 0) trip.globalNotices[index] = notice;
  else trip.globalNotices.push(notice);
}

for (const update of enhancements.dayUpdates || []) {
  const day = days.find((entry) => entry.date === update.date);
  if (!day) throw new Error(`Guide enhancement references unknown day ${update.date}`);

  if (update.subtitle) day.subtitle = update.subtitle;
  if (update.routeIds) day.routeIds = update.routeIds;

  for (const note of update.notes || []) {
    day.notes ||= [];
    if (!day.notes.includes(note)) day.notes.push(note);
  }

  for (const replacement of update.replaceItems || []) {
    const index = day.items.findIndex((item) => item.title === replacement.matchTitle);
    if (index < 0) {
      const alreadyApplied = day.items.some((item) => item.title === replacement.item.title);
      if (!alreadyApplied) throw new Error(`Could not replace '${replacement.matchTitle}' on ${update.date}`);
      continue;
    }
    day.items[index] = replacement.item;
  }

  for (const insertion of update.insertItems || []) {
    if (day.items.some((item) => item.title === insertion.item.title)) continue;
    let index = -1;
    if (insertion.afterTitle) {
      const anchor = day.items.findIndex((item) => item.title === insertion.afterTitle);
      if (anchor < 0) throw new Error(`Could not find afterTitle '${insertion.afterTitle}' on ${update.date}`);
      index = anchor + 1;
    } else if (insertion.beforeTitle) {
      const anchor = day.items.findIndex((item) => item.title === insertion.beforeTitle);
      if (anchor < 0) throw new Error(`Could not find beforeTitle '${insertion.beforeTitle}' on ${update.date}`);
      index = anchor;
    } else {
      index = day.items.length;
    }
    day.items.splice(index, 0, insertion.item);
  }
}

writeJson('data/trip.json', trip);
writeJson('data/days.json', days);
writeJson('data/locations.json', locations);
writeJson('data/routes.json', routes);
