# JR Weigel Site

This repository hosts the Docusaurus site at the root URL and several standalone apps at static subpaths.

## Published URLs

* Root blog/site: <https://jrweigel.github.io/>
* Europe travel guide: <https://jrweigel.github.io/Europe2026/>
* Move the Work: <https://jrweigel.github.io/move-the-work/>
* Which Tool: <https://jrweigel.github.io/which-tool/>
* Heist Table: <https://jrweigel.github.io/heist-table/>

## Source Layout

```text
data/
  trip.json             Europe guide settings, including base path
  days.json             Day-by-day itinerary
  locations.json        Places, addresses, maps, official URLs
  reservations.json     Confirmed reservations and logistics
  routes.json           Google Maps route links
scripts/
  build.mjs             Generates Europe guide files in static/Europe2026
  validate-content.mjs  Validates itinerary and reservation data
  check-links.mjs       Validates guide outputs and final built routes
static/
  Europe2026/           Generated Europe guide files
  move-the-work/        Standalone app
  which-tool/           Standalone app
src/
  pages/                Docusaurus root pages
.github/workflows/
  deploy.yml            GitHub Pages build and deploy workflow
```

## Build and Run

```bash
npm install
npm run start
```

`npm run start` first generates Europe guide content into `static/Europe2026`, then runs Docusaurus locally.

Use these commands for CI-style validation:

```bash
npm run validate
npm run build
npm run check:links
npm test
```

## Europe Guide Editing

Most itinerary edits happen in `data/days.json`.

1. Find the day by `date`.
2. Edit the `items` array.
3. Use one of: `confirmed`, `planned`, `optional`, `tentative`.
4. Use `locationId` references from `data/locations.json`.
5. Update attire guidance when plans change.
6. Run `npm test` before publishing.

Do not change confirmed dates, times, addresses, transportation, or reservations unless explicitly instructed.

## Deployment

GitHub Actions runs on pushes to `master` and manual dispatch.

1. Install dependencies.
2. Run `npm test`.
3. Upload the Docusaurus `build/` directory.
4. Deploy to GitHub Pages.

This keeps the root URL as the Docusaurus site while preserving standalone apps under their subpaths.

## Heist Table

Heist Table is a mobile-first, offline cooperative poker companion at
`static/heist-table/`. It stores the active game, recently used player names,
session statistics, and lifetime statistics in the browser's `localStorage`;
no data leaves the device.

### Develop and build

```bash
npm install
npm run start
# Open http://localhost:3000/heist-table/

npm run build
# Production files are emitted to build/heist-table/
```

Run its game-logic tests with `npm run test:heist`. To install on iPhone, open
the published HTTPS URL in Safari, tap **Share**, choose **Add to Home Screen**,
and launch it once online so the app shell is cached.

### Local data and reset

Use **Settings > Erase all saved data** to remove the active game, names, and
statistics. **Stats > Reset Stats** removes only statistics. Safari's
website-data controls can also clear all saved data.

### GitHub Pages deployment

The existing GitHub Actions workflow builds and publishes the complete
Docusaurus `build/` directory. Open a pull request, merge it to `master`, and
the workflow will publish Heist Table at `/heist-table/`; no paid service is
required.
