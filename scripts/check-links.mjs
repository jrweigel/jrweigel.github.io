import fs from 'node:fs';

const html = fs.readFileSync('site/index.html', 'utf8');
const allIdValues = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
const ids = new Set(allIdValues);
const errors = [];

// Detect duplicate id attributes
const seen = new Set();
const dupes = new Set();
for (const id of allIdValues) {
  if (seen.has(id)) dupes.add(id);
  seen.add(id);
}
if (dupes.size) errors.push(`Duplicate id attributes: ${[...dupes].join(', ')}`);

for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
  if (href.startsWith('#') && !ids.has(href.slice(1))) errors.push(`Missing internal anchor ${href}`);
  if (href === 'Bordeaux_Portugal_Guide_2026.pdf' && !fs.existsSync('site/Bordeaux_Portugal_Guide_2026.pdf')) errors.push('Missing PDF');
  if (href.includes('www.google.com/maps') && !href.startsWith('https://www.google.com/maps/')) errors.push(`Malformed Google Maps link ${href}`);
}
if (!html.includes('<base href="/Europe2026/">')) errors.push('Missing /Europe2026/ base path');
if (!html.includes('aria-label="Trip sections"')) errors.push('Missing accessible navigation label');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Internal links, Google Maps links, PDF link, accessibility hooks, and /Europe2026/ base path validated.');
