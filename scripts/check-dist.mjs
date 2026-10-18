// Fails the build if the production bundle references any third-party origin
// (DSGVO: no external fonts, CDNs, analytics or embeds) or contains inline scripts.
// Also checks the performance budget from docs/research.md (P15): initial JS ≤ 150 KiB gzip (enforced);
// each lazily loaded topic chunk should stay ≤ 30 KiB gzip (target, reported as a warning) and must stay
// ≤ 40 KiB gzip (hard limit, fails the build) so that content growth stays visible.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BANNED = [
  'fonts.googleapis', 'fonts.gstatic', 'googletagmanager', 'google-analytics', 'doubleclick',
  'jsdelivr', 'unpkg.com', 'cdnjs', 'cloudflare', 'facebook', 'hotjar', 'sentry', 'firebaseio', 'gstatic.com',
];
const INITIAL_JS_BUDGET = 150 * 1024;
const TOPIC_CHUNK_TARGET = 30 * 1024;
const TOPIC_CHUNK_LIMIT = 40 * 1024;
const TOPICS = ['zahlen', 'schriftlich', 'kopfrechnen', 'groessen', 'geometrie', 'daten', 'sachaufgaben'];

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(html|js|css|svg|json|webmanifest)$/.test(name)) files.push(p);
  }
})('dist');

let failed = false;
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  for (const b of BANNED) {
    if (text.includes(b)) { console.error(`✗ ${f} references banned host "${b}"`); failed = true; }
  }
  if (f.endsWith('.html') && /<script(?![^>]*\bsrc=)[^>]*>/i.test(text)) {
    console.error(`✗ ${f} contains an inline <script> (blocked by CSP)`); failed = true;
  }
}

// ─── Performance budget ──────────────────────────────────────────────────────
const gz = (p) => gzipSync(readFileSync(p)).length;
const kib = (n) => `${(n / 1024).toFixed(1)} KiB`;
const html = readFileSync('dist/index.html', 'utf8');
const initial = [...html.matchAll(/<(?:script[^>]*\bsrc|link[^>]*rel="modulepreload"[^>]*\bhref)="\/?([^"]+\.js)"/g)].map((m) => join('dist', m[1]));
const initialGz = initial.reduce((s, p) => s + gz(p), 0);
if (initialGz > INITIAL_JS_BUDGET) {
  console.error(`✗ initial JS ${kib(initialGz)} gzip exceeds the budget of ${kib(INITIAL_JS_BUDGET)}`); failed = true;
} else {
  console.log(`✓ initial JS ${kib(initialGz)} gzip (budget ${kib(INITIAL_JS_BUDGET)})`);
}
const assets = readdirSync('dist/assets');
for (const t of TOPICS) {
  const chunk = assets.find((n) => n.startsWith(`${t}-`) && n.endsWith('.js'));
  if (!chunk) { console.error(`✗ no lazily loaded chunk for topic "${t}"`); failed = true; continue; }
  const size = gz(join('dist/assets', chunk));
  if (size > TOPIC_CHUNK_LIMIT) {
    console.error(`✗ topic ${t}: ${kib(size)} gzip exceeds the hard limit of ${kib(TOPIC_CHUNK_LIMIT)} (target ${kib(TOPIC_CHUNK_TARGET)})`);
    failed = true;
  } else if (size > TOPIC_CHUNK_TARGET) {
    console.warn(`⚠ topic ${t}: ${kib(size)} gzip (over the ${kib(TOPIC_CHUNK_TARGET)} target, limit ${kib(TOPIC_CHUNK_LIMIT)})`);
  } else {
    console.log(`✓ topic ${t}: ${kib(size)} gzip`);
  }
}

if (failed) process.exit(1);
console.log(`✓ dist check: ${files.length} files, no third-party origins, no inline scripts`);
