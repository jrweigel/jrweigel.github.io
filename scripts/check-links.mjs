import fs from 'node:fs';

const html = fs.readFileSync('site/index.html', 'utf8');
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]));
const errors = [];

for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
  if (href.startsWith('#') && !ids.has(href.slice(1))) errors.push(`Missing internal anchor ${href}`);
  if (href === 'Bordeaux_Portugal_Guide_2026.pdf' && !fs.existsSync('site/Bordeaux_Portugal_Guide_2026.pdf')) errors.push('Missing PDF');
  if (href.includes('www.google.com/maps') && !href.startsWith('https://www.google.com/maps/')) errors.push(`Malformed Google Maps link ${href}`);
}
if (!html.includes('<base href="/europe2027/">')) errors.push('Missing /europe2027/ base path');
if (!html.includes('aria-label="Trip sections"')) errors.push('Missing accessible navigation label');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Internal links, Google Maps links, PDF link, accessibility hooks, and /europe2027/ base path validated.');
