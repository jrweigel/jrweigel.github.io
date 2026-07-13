import fs from 'node:fs';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const normalizedBasePath = String(readJson('data/trip.json').basePath || '').replace(/^\/+|\/+$/g, '');
const outputDirs = ['site', normalizedBasePath ? `site/${normalizedBasePath}` : null].filter(Boolean);
const errors = [];

for (const outputDir of outputDirs) {
  const htmlPath = `${outputDir}/index.html`;
  if (!fs.existsSync(htmlPath)) {
    errors.push(`Missing HTML output ${htmlPath}`);
    continue;
  }

  const html = fs.readFileSync(htmlPath, 'utf8');
  const allIdValues = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  const ids = new Set(allIdValues);

  // Detect duplicate id attributes
  const seen = new Set();
  const dupes = new Set();
  for (const id of allIdValues) {
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  if (dupes.size) errors.push(`Duplicate id attributes in ${htmlPath}: ${[...dupes].join(', ')}`);

  for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
    if (href.startsWith('#') && !ids.has(href.slice(1))) errors.push(`Missing internal anchor ${href} in ${htmlPath}`);
    if (href === 'Bordeaux_Portugal_Guide_2026.pdf' && !fs.existsSync(`${outputDir}/Bordeaux_Portugal_Guide_2026.pdf`)) errors.push(`Missing PDF in ${outputDir}`);
    if (href === 'manifest.webmanifest' && !fs.existsSync(`${outputDir}/manifest.webmanifest`)) errors.push(`Missing manifest in ${outputDir}`);
    if (href === 'styles.css' && !fs.existsSync(`${outputDir}/styles.css`)) errors.push(`Missing stylesheet in ${outputDir}`);
    if (href.includes('www.google.com/maps') && !href.startsWith('https://www.google.com/maps/')) errors.push(`Malformed Google Maps link ${href}`);
  }
  if (!fs.existsSync(`${outputDir}/sw.js`)) errors.push(`Missing service worker in ${outputDir}`);
  const expectedBase = normalizedBasePath ? `/${normalizedBasePath}/` : '/';
  if (!html.includes(`<base href="${expectedBase}">`)) errors.push(`Missing ${expectedBase} base path in ${htmlPath}`);
  if (!html.includes('aria-label="Trip sections"')) errors.push(`Missing accessible navigation label in ${htmlPath}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Internal links, Google Maps links, output files, accessibility hooks, and base path validated.');
