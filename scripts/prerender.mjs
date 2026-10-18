// Writes the prerendered pages, 404.html, the app shell, sitemap.xml and robots.txt into dist/.
// Runs after `vite build` (client, template dist/index.html) and `vite build --ssr` (dist-ssr/, the
// renderer from src/seo/prerender.tsx). All logic lives there; this script only does the file I/O.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const { prerenderSite } = await import(pathToFileURL(resolve('dist-ssr/prerender.js')).href);
const template = readFileSync('dist/index.html', 'utf8');

for (const { file, content } of await prerenderSite(template)) {
  const target = join('dist', file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  console.log(`✓ prerendered ${file}`);
}
