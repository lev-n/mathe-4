// Blocks a deployment while the Impressum (§ 5 DDG, § 18 Abs. 2 MStV) and the controller details of the
// Datenschutzerklärung (Art. 13 DSGVO) still show '[Angaben zum Betreiber folgen]' (docs/research.md P5).
// The operator data lives in src/config/operator.ts and must be filled in by the operator; never invent it.
//
//   node scripts/check-operator.mjs          exit 1 if the minimum operator data is missing
//   node scripts/check-operator.mjs --warn   only print a warning (used by the build)
//
// ALLOW_MISSING_OPERATOR=1 turns the error into a warning for a private preview (e.g. a Firebase
// preview channel that is not shared publicly). Never use it for the public site.
import { readFileSync } from 'node:fs';

const REQUIRED = { name: 'Name', street: 'Straße und Hausnummer', postalCode: 'Postleitzahl', city: 'Ort', email: 'E-Mail-Adresse' };
const SOURCE = new URL('../src/config/operator.ts', import.meta.url);

/** Reads the OPERATOR object: via Node's TypeScript type stripping, or from the source text as a fallback. */
async function loadOperator() {
  try {
    const mod = await import(SOURCE.href);
    if (mod && typeof mod.OPERATOR === 'object') return mod.OPERATOR;
  } catch {
    // Older Node without type stripping: read the simple object literal instead.
  }
  const text = readFileSync(SOURCE, 'utf8');
  const block = /export const OPERATOR[^=]*=\s*\{([\s\S]*?)\n\};/.exec(text);
  if (!block) throw new Error('OPERATOR not found in src/config/operator.ts');
  const out = {};
  for (const m of block[1].matchAll(/^\s*(\w+)\s*:\s*(['"`])((?:\\.|(?!\2).)*)\2\s*,?\s*$/gm)) out[m[1]] = m[3];
  return out;
}

const warnOnly = process.argv.includes('--warn') || process.env.ALLOW_MISSING_OPERATOR === '1';
const operator = await loadOperator();
const missing = Object.entries(REQUIRED).filter(([key]) => typeof operator[key] !== 'string' || operator[key].trim() === '');

if (missing.length === 0) {
  console.log('✓ operator details for Impressum and Datenschutzerklärung are filled in');
} else {
  const list = missing.map(([, label]) => label).join(', ');
  const text = `Impressum/Datenschutz: operator details missing in src/config/operator.ts (${list}); the pages show "[Angaben zum Betreiber folgen]".`;
  if (warnOnly) {
    console.warn(`⚠ ${text} A public deployment is blocked until they are filled in.`);
  } else {
    console.error(`✗ ${text} Fill them in before deploying (a public site needs a complete Impressum, § 5 DDG).`);
    process.exit(1);
  }
}
