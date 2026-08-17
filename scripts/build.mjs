import fs from 'node:fs';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const trip = readJson('data/trip.json');
const days = readJson('data/days.json');
const locations = readJson('data/locations.json');
const reservations = readJson('data/reservations.json');
const routes = readJson('data/routes.json');
const travelResources = readJson('data/travel-resources.json');
const phraseGuides = readJson('data/phrases.json');

const locationById = new Map(locations.map((location) => [location.id, location]));
const routeById = new Map(routes.map((route) => [route.id, route]));
const normalizedBasePath = String(trip.basePath || '').replace(/^\/+|\/+$/g, '');
const outputDir = normalizedBasePath ? `static/${normalizedBasePath}` : 'static';
const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const formatDate = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
});
const tripDateRange = `${formatDate(trip.startDate)}–${formatDate(trip.endDate)}, ${trip.endDate.slice(0, 4)}`;
const statusBadge = (status) => `<span class="badge ${status}">${escapeHtml(status)}</span>`;
const actionButtons = (location) => location ? `
  <p class="buttons">
    <a href="${escapeHtml(location.mapsUrl)}" aria-label="Open ${escapeHtml(location.name)} in Google Maps">Maps</a>
    ${location.officialUrl ? `<a href="${escapeHtml(location.officialUrl)}" aria-label="Open official website for ${escapeHtml(location.name)}">Website</a>` : ''}
  </p>` : '';

const routeButtons = (ids = []) => ids.map((id) => {
  const route = routeById.get(id);
  if (!route) return '';
  return `<a class="route" href="${escapeHtml(route.url)}" aria-label="Open Google Maps ${escapeHtml(route.mode)} route: ${escapeHtml(route.label)}">${escapeHtml(route.mode)} route · ${escapeHtml(route.label)}</a>`;
}).join('');

const renderPracticalRequirements = (day) => {
  if (!day.practicalRequirements) return '';
  return `<section class="practical-requirements" aria-label="Practical requirements for ${escapeHtml(day.title)}">
          <h4>Practical requirements</h4>
          <p>${escapeHtml(day.practicalRequirements)}</p>
        </section>`;
};

const renderTime = (day, item) => {
  const label = `${item.start}${item.end ? `–${item.end}` : ''}`;
  const hasClockTime = /^\d{2}:\d{2}$/.test(item.start);
  return hasClockTime
    ? `<time datetime="${escapeHtml(day.date)}T${escapeHtml(item.start)}">${escapeHtml(label)}</time>`
    : `<time>${escapeHtml(label)}</time>`;
};

const renderDay = (day) => `
  <article class="day ${day.status}" id="${day.date}">
    <details open>
      <summary>
        <span><b>${formatDate(day.date)}</b><small>${escapeHtml(day.city)} · ${escapeHtml(day.subtitle)}</small></span>
        ${statusBadge(day.status)}
      </summary>
      <div class="daybody">
        ${(day.alerts || []).map((alert) => `<div class="alert ${alert.status}" role="note"><b>${escapeHtml(alert.title)}</b><p>${escapeHtml(alert.body)}</p></div>`).join('')}
        ${routeButtons(day.routeIds)}
        ${renderPracticalRequirements(day)}
        ${(day.notes || []).map((note) => `<p class="note">${escapeHtml(note)}</p>`).join('')}
        <ol class="timeline">
          ${day.items.map((item) => {
            const location = locationById.get(item.locationId);
            return `<li class="item ${item.status} ${item.type}">
              ${renderTime(day, item)}
              <div>
                <h3>${escapeHtml(item.title)} ${statusBadge(item.status)}</h3>
                <p>${escapeHtml(item.description)}</p>
                ${location ? `<p class="where">${escapeHtml(location.name)} · ${escapeHtml(location.address || '')}</p>${actionButtons(location)}` : ''}
              </div>
            </li>`;
          }).join('')}
        </ol>
      </div>
    </details>
  </article>`;

const renderLocationCard = (location) => `
  <article class="card">
    <h3>${escapeHtml(location.name)} ${statusBadge(location.reservationStatus)}</h3>
    <p>${escapeHtml(location.city)} · ${escapeHtml(location.category)}</p>
    ${location.address ? `<p>${escapeHtml(location.address)}</p>` : ''}
    ${location.notes ? `<p class="note">${escapeHtml(location.notes)}</p>` : ''}
    ${actionButtons(location)}
  </article>`;

const renderReservationCard = (reservation) => {
  const location = locationById.get(reservation.locationId);
  return `
    <article class="card">
      <h3>${escapeHtml(reservation.venue)} ${statusBadge(reservation.status)}</h3>
      <p><b>${escapeHtml(reservation.date)}</b> · ${escapeHtml(reservation.start)}${reservation.end ? `–${escapeHtml(reservation.end)}` : ''}${reservation.partySize ? ` · party of ${reservation.partySize}` : ''}</p>
      ${location ? `<p>${escapeHtml(location.name)} · ${escapeHtml(location.address || '')}</p>${actionButtons(location)}` : ''}
      ${reservation.cancellation ? `<p class="note">Cancellation: ${escapeHtml(reservation.cancellation)}</p>` : ''}
      ${reservation.celebration ? `<p class="note">${escapeHtml(reservation.celebration)}</p>` : ''}
      ${reservation.notes ? `<p>${escapeHtml(reservation.notes)}</p>` : ''}
    </article>`;
};

const renderTravelResource = (resource) => `
  <li class="resource">
    <div><a href="${escapeHtml(resource.url)}"><b>${escapeHtml(resource.name)}</b></a><small>${escapeHtml(resource.regions)}</small></div>
    <p>${escapeHtml(resource.use)}</p>
    ${resource.caveat ? `<p class="note"><b>Good to know:</b> ${escapeHtml(resource.caveat)}</p>` : ''}
  </li>`;

const renderPhraseGuide = (guide) => `
  <details class="phrase-guide">
    <summary><span><b>${escapeHtml(guide.language)}</b><small>${escapeHtml(guide.regions)}</small></span></summary>
    <div class="phrase-body">
      <p class="note">${escapeHtml(guide.note)}</p>
      <dl class="phrases">
        ${guide.phrases.map((phrase) => `<div class="phrase"><dt>${escapeHtml(phrase.english)}</dt><dd><b>${escapeHtml(phrase.local)}</b><span>${escapeHtml(phrase.pronunciation)}</span></dd></div>`).join('')}
      </dl>
    </div>
  </details>`;

const citySections = trip.cities.map((city) => `
  <section id="${city.toLowerCase()}">
    <h2>${escapeHtml(city)}</h2>
    ${days.filter((day) => day.city.split(' / ')[0].trim() === city).map(renderDay).join('')}
  </section>`).join('');
const foodLocations = locations.filter((location) => ['food', 'restaurant', 'bar', 'cafe', 'market'].includes(location.category));

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <base href="${trip.basePath}">
  <title>${escapeHtml(trip.title)}</title>
  <meta name="theme-color" content="#5b1027">
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="hero" id="home">
    <p class="eyebrow">Bordeaux · Lisbon · Porto</p>
    <h1>${escapeHtml(trip.title)}</h1>
    <p>${escapeHtml(tripDateRange)} · ${escapeHtml(trip.travelers)}</p>
    <p class="rule">${escapeHtml(trip.operationalRule)}</p>
  </header>
  <nav class="nav" aria-label="Trip sections"><a href="#home">Home</a><a href="#bordeaux">Bordeaux</a><a href="#lisbon">Lisbon</a><a href="#porto">Porto</a><a href="#reservations">Reservations</a><a href="#food">Food</a><a href="#tools">Tools</a><a href="#phrases">Phrases</a><a href="#practical">Practical</a></nav>
  <main>
    <section><h2>Trip philosophy</h2><ul class="pillars">${trip.philosophy.map((pillar) => `<li>${escapeHtml(pillar)}</li>`).join('')}</ul>${trip.globalNotices.map((notice) => `<div class="alert ${notice.status}" role="note"><b>${escapeHtml(notice.title)}</b><p>${escapeHtml(notice.body)}</p></div>`).join('')}${trip.itinerarySource ? `<div class="card"><h3>Bordeaux itinerary source</h3><p><a href="${escapeHtml(trip.itinerarySource.url)}">${escapeHtml(trip.itinerarySource.label)}</a></p><p class="note">Last reconciled ${escapeHtml(trip.itinerarySource.reconciledDate)}.</p></div>` : ''}</section>
    ${citySections}
    <section id="reservations"><h2>Confirmed reservations & logistics</h2>${reservations.map(renderReservationCard).join('')}</section>
    <section id="food"><h2>Food & drink</h2>${foodLocations.map(renderLocationCard).join('')}</section>
    <section id="tools"><h2>Travel tools</h2><div class="resource-groups"><div><h3>Download before departure</h3><ul class="resources">${travelResources.filter((resource) => resource.kind === 'download').map(renderTravelResource).join('')}</ul></div><div><h3>Bookmark</h3><ul class="resources">${travelResources.filter((resource) => resource.kind === 'bookmark').map(renderTravelResource).join('')}</ul></div></div></section>
    <section id="phrases"><h2>Useful phrases</h2>${phraseGuides.map(renderPhraseGuide).join('')}</section>
    <section id="practical"><h2>Practical information</h2><div class="card"><h3>Status definitions</h3><p><b>Confirmed</b>: booking is held. <b>Planned</b>: intended but unbooked. <b>Optional</b>: only if energy/timing/weather allow. <b>Tentative</b>: supplied by another party and still being revised.</p><p>Pack for repeat outfits and plan laundry at the end of Bordeaux or beginning of Lisbon.</p></div></section>
  </main>
  <script>const today=new Date().toISOString().slice(0,10);document.querySelectorAll('.day').forEach((day)=>{if(day.id===today)day.classList.add('today')});if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');</script>
</body>
</html>`;

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(`${outputDir}/index.html`, html);
fs.copyFileSync('public/styles.css', `${outputDir}/styles.css`);
fs.copyFileSync('public/manifest.webmanifest', `${outputDir}/manifest.webmanifest`);
fs.copyFileSync('public/sw.js', `${outputDir}/sw.js`);
