# Europe 2026 Travel Guide

Mobile-first living travel guide for Bordeaux, Lisbon, and Porto, published at:

<https://jrweigel.github.io/Europe2026/>

The site is generated from structured JSON content in `data/` into the published files in `site/`.

## Repository structure

```text
data/
  trip.json          Trip-wide settings, philosophy, notices, base path
  days.json          Daily itinerary, timeline items, attire, notes, route refs
  locations.json     Stable venue/location IDs, addresses, Maps links, websites
  reservations.json  Confirmed logistics and reservations
  routes.json        One-tap Google Maps route links
scripts/
  build.mjs          Static site generator for site/index.html and PDF summary
  validate-content.mjs Required content validation
  check-links.mjs    Internal anchor, PDF, and base-path validation
public/
  styles.css         Mobile-first print-friendly styling
  manifest.webmanifest
  sw.js
site/
  index.html         Published guide
  Bordeaux_Portugal_Guide_2026.pdf Downloadable PDF generated from itinerary summary
.github/workflows/deploy.yml GitHub Pages deployment
```

## Run locally

```bash
npm install
npm run build
npm run dev
```

`npm run dev` builds the site and serves `site/` at <http://localhost:4321>. The production URL uses the `/Europe2026/` base path.

## Edit itinerary content

Most changes should happen in `data/days.json`.

1. Find the day by `date`.
2. Edit the `items` array.
3. Use a valid `status`: `confirmed`, `planned`, `optional`, or `tentative`.
4. Reference places with `locationId` rather than duplicating addresses or URLs.
5. Update the daily `attire` if the activity mix changes.
6. Run `npm test` before finishing.

Do not change confirmed dates, times, addresses, transportation, or reservations unless explicitly instructed.

## Add a location

Add one object to `data/locations.json`:

```json
{
  "id": "stable-human-readable-id",
  "name": "Venue Name",
  "city": "Lisbon",
  "address": "Known address only",
  "mapsUrl": "https://www.google.com/maps/search/?api=1&query=Venue+Name+Lisbon",
  "officialUrl": "https://official-site.example/",
  "category": "restaurant",
  "reservationStatus": "planned",
  "notes": "Optional context."
}
```

Omit `officialUrl` when an official website has not been verified. Then reference the location from a day with `locationId`.

## Change a reservation

Confirmed logistics live in `data/reservations.json`. Keep confirmed reservations distinct from planned meals or tentative host activities. Do not add confirmation numbers, private traveler details, emails, phone numbers, or booking codes.

## Deployment

GitHub Actions runs on pushes to `master` and manual workflow dispatches. The workflow installs Node, runs `npm test`, uploads the generated `site/` directory as the Pages artifact, and deploys with `actions/deploy-pages@v4`.

Once merged to `master`, GitHub Pages publishes the guide at:

<https://jrweigel.github.io/Europe2026/>

## Checks

```bash
npm run validate
npm run build
npm run check:links
npm test
```

The checks validate required dates, times, labels, links, statuses, location references, the downloadable PDF link, and `/Europe2026/` base-path handling.

## Assumptions and content gaps

- Bordeaux activities are marked tentative unless listed as confirmed logistics.
- Planned Lisbon and Porto dinners are clearly not confirmed unless included in confirmed logistics.
- Official website buttons are included only where a likely official site was identified; otherwise only Google Maps is shown.
- Weather-specific attire is based on likely late-summer conditions and planned activities, not a live forecast.
- Laundry is planned for the end of Bordeaux or beginning of Lisbon, so attire guidance assumes repeatable, washable outfits.
