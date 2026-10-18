/**
 * Lenient parsing of what children type. Never says "falsch" for input it cannot read —
 * returns a friendly German reason instead (counted as "invalid", not as an attempt).
 *
 * Accepts: '345678', '345 678', '345.678' (dot + groups of 3 = thousands), '3,5', '3,50', '3.5' (decimal tasks).
 */

export type ParseResult = { ok: true; value: number } | { ok: false; reason: string };

const SPACES = /[\s    ]/g;

export function parseNumber(raw: string, decimals = 0): ParseResult {
  let text = raw.replace(SPACES, '').replace(/−/g, '-');
  if (text === '') return { ok: false, reason: 'Gib zuerst eine Zahl ein.' };

  let negative = false;
  if (text.startsWith('-')) {
    negative = true;
    text = text.slice(1);
  }
  if (!/^[0-9.,]+$/.test(text)) {
    return { ok: false, reason: 'Schreibe nur Ziffern (und bei Kommazahlen ein Komma).' };
  }

  const sign = negative ? -1 : 1;
  const commas = (text.match(/,/g) ?? []).length;
  const dots = (text.match(/\./g) ?? []).length;

  if (commas > 1) {
    if (decimals === 0 && /^\d{1,3}(,\d{3})+$/.test(text)) {
      return { ok: false, reason: 'Schreibe große Zahlen ohne Komma, zum Beispiel 345 678.' };
    }
    return { ok: false, reason: 'Eine Zahl hat höchstens ein Komma.' };
  }

  if (commas === 1) {
    const [intPart, frac] = text.split(',');
    if (decimals === 0) {
      if (/^\d{1,3}$/.test(intPart) && /^\d{3}$/.test(frac)) {
        return { ok: false, reason: 'Schreibe große Zahlen ohne Komma, zum Beispiel 345 678.' };
      }
      return { ok: false, reason: 'Hier ist eine ganze Zahl gesucht – ohne Komma.' };
    }
    if (frac === '' || intPart === '') return { ok: false, reason: 'Vor und nach dem Komma muss eine Ziffer stehen.' };
    if (!/^\d+$/.test(frac)) return { ok: false, reason: 'Nach dem Komma dürfen nur Ziffern stehen.' };
    if (frac.length > decimals) {
      return { ok: false, reason: `Hier gibt es höchstens ${decimals} ${decimals === 1 ? 'Stelle' : 'Stellen'} nach dem Komma.` };
    }
    const intValue = parseIntPart(intPart);
    if (intValue === null) return { ok: false, reason: 'Diese Zahl kann ich nicht lesen. Prüfe die Punkte.' };
    return { ok: true, value: sign * (intValue + Number('0.' + frac)) };
  }

  if (dots === 0) {
    return { ok: true, value: sign * Number(text) };
  }

  // Only dots.
  if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    if (decimals >= 3 && dots === 1) {
      return { ok: false, reason: 'Meinst du ein Komma? Schreibe Kommazahlen mit Komma, zum Beispiel 1,500.' };
    }
    return { ok: true, value: sign * Number(text.replace(/\./g, '')) };
  }
  if (dots === 1 && /^\d+\.\d+$/.test(text)) {
    if (decimals === 0) return { ok: false, reason: 'Hier ist eine ganze Zahl gesucht – ohne Punkt oder Komma.' };
    const frac = text.split('.')[1];
    if (frac.length > decimals) {
      return { ok: false, reason: `Hier gibt es höchstens ${decimals} ${decimals === 1 ? 'Stelle' : 'Stellen'} nach dem Komma.` };
    }
    return { ok: true, value: sign * Number(text) };
  }
  return { ok: false, reason: 'Diese Zahl kann ich nicht lesen. Schreibe sie ohne Punkte, zum Beispiel 345 678.' };
}

function parseIntPart(intPart: string): number | null {
  if (/^\d+$/.test(intPart)) return Number(intPart);
  if (/^\d{1,3}(\.\d{3})+$/.test(intPart)) return Number(intPart.replace(/\./g, ''));
  return null;
}

/** Digits-only input of written calculations ('' allowed for empty leading places). */
export function parseDigits(raw: string): ParseResult {
  const text = raw.replace(SPACES, '');
  if (text === '') return { ok: false, reason: 'Trage zuerst das Ergebnis ein.' };
  // WrittenInput sends an empty box between filled ones as '_'.
  if (/^[\d_]+$/.test(text) && text.includes('_')) return { ok: false, reason: 'Ein Kästchen im Ergebnis ist noch leer.' };
  if (!/^\d+$/.test(text)) return { ok: false, reason: 'In jedes Kästchen kommt genau eine Ziffer.' };
  return { ok: true, value: Number(text) };
}
