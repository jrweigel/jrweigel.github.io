# jrweigel.github.io

This repository contains the source for the personal GitHub Pages site at `jrweigel.github.io`, including the Europe 2026 travel guide and other static tools/content.

## Europe 2026 Travel Guide

The Europe 2026 guide is generated from structured trip data and published at:

`https://jrweigel.github.io/Europe2026/`

### Source files

- `data/trip.json` — trip-level metadata, philosophy, and notices
- `data/days.json` — day-by-day itinerary
- `data/locations.json` — places, Maps links, websites, and recommendation status
- `data/reservations.json` — confirmed bookings and logistics
- `data/routes.json` — Google Maps walking/driving routes
- `data/travel-resources.json` — useful travel tools and bookmarks
- `data/phrases.json` — practical language references
- `scripts/build.mjs` — generates the mobile guide into `static/Europe2026/`
- `public/styles.css` — Europe guide presentation and responsive navigation/search styles

### Navigation behavior

The mobile guide includes:

- persistent section navigation
- client-side search across agenda items, recommended locations, reservations, travel tools, and phrase guides
- a persistent **Jump to day** selector for direct navigation to any agenda date
- `Cmd/Ctrl + K` as a keyboard shortcut to focus search

### Build and validation

```bash
npm run build:europe
npm run check:links
```

The Europe build validates the structured content before generating the static guide. The full repository test/deploy path is:

```bash
npm test
```

GitHub Pages deploys from `master` through `.github/workflows/deploy.yml` after tests pass.

## Other site content

The repository also contains the Docusaurus site, blog content, Move the Work, Heist Table, and other static projects under `static/` and `src/`.
