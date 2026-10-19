/**
 * Versioned storage schema for key 'mathe4.v1': validation, migration and serialisation.
 * (The key name stays 'mathe4.v1'; the document inside carries its own `version`.)
 *
 * Everything that comes from storage or from an imported file is untrusted. Each field is
 * type-checked; unknown fields are dropped; lists are cut to their documented length.
 * Anything structurally wrong makes the whole document invalid (it is then ignored safely).
 * The store only ever writes data that passes this validation.
 */
import { isDay } from './dates';
import { isFactKey } from './facts';
import { ERROR_MIN_SEEN, GROWTH_WINDOW, OVERCOME_RUN, capTracks, emptyGrowth, normalizeTag } from './growth';
import { CHECKS_SIZE, MAX_BOX, RECENT_SIZE, TOPIC_IDS, parseSkillKey } from './mastery';
import type { StoredStufeProgress } from './mastery';
import { DEFAULT_SETTINGS } from './types';
import type { Day, ErrorTrack, FactProgress, Growth, GrowthStufe, MasteryState, ProgressState, Settings } from './types';

export const CURRENT_VERSION = 3;
/** Marker that identifies a Mathe-4 backup file. */
export const APP_MARKER = 'mathe4';
export const MAX_IMPORT_CHARS = 2_000_000;
const MAX_SKILL_ENTRIES = 5_000;
const MAX_FACT_ENTRIES = 1_000;
const MAX_DAYS = 20_000;
const MAX_COUNT = 1_000_000_000;

type Obj = Record<string, unknown>;

export type SchemaError = 'empty' | 'too-large' | 'not-json' | 'not-mathe4' | 'newer-version' | 'invalid';

/** Friendly German messages for "Fortschritt laden" (shown to children and adults). */
export const IMPORT_MESSAGES: Record<SchemaError, string> = {
  empty: 'Die Datei ist leer. Wähle die Datei, die du mit „Fortschritt sichern“ gespeichert hast.',
  'too-large': 'Diese Datei ist zu groß für eine Sicherung von Mathe 4.',
  'not-json': 'Diese Datei kann ich nicht lesen. Wähle die Datei, die du mit „Fortschritt sichern“ gespeichert hast.',
  'not-mathe4': 'Das ist keine Sicherung von Mathe 4. Wähle die Datei, die du mit „Fortschritt sichern“ gespeichert hast.',
  'newer-version': 'Diese Sicherung kommt aus einer neueren Version von Mathe 4. Lade die Seite neu und versuche es noch einmal.',
  invalid: 'Die Sicherung ist beschädigt. Dein Fortschritt bleibt so, wie er war.',
};

export type Migration = (data: Obj) => Obj;

/** Limits of the v1 `sessions` lists (only needed to read old documents). */
const V1_SESSION_ID_MAX = 64;
const V1_SESSIONS_KEPT = 5;

/**
 * v1 → v2: v1 stored the last ≤ 5 session ids per skill-Stufe. Those ids contained the start time of
 * each session (P1 allows no ids and dates at day granularity only), so v2 keeps just a count
 * (`practiceDays`). The number of distinct v1 sessions becomes that count, so a Stufe close to
 * 'Gemeistert' stays close. Entries that are not shaped like v1 entries are left alone, so the
 * strict validation afterwards still rejects them.
 */
export function migrateV1toV2(data: Obj): Obj {
  if (!isObj(data.skills)) return { ...data, version: 2 };
  // Object.fromEntries keeps a '__proto__' key as an own key, so validation still sees (and rejects) it.
  const skills = Object.fromEntries(
    Object.entries(data.skills).map(([key, entry]): [string, unknown] => {
      if (!isObj(entry)) return [key, entry];
      const { sessions, ...rest } = entry;
      const valid =
        Array.isArray(sessions) &&
        sessions.length <= 1_000 &&
        sessions.every((x) => typeof x === 'string' && x.length > 0 && x.length <= V1_SESSION_ID_MAX);
      return [key, valid ? { ...rest, practiceDays: Math.min(new Set(sessions).size, V1_SESSIONS_KEPT) } : rest];
    }),
  );
  return { ...data, version: 2, skills };
}

/**
 * v2 → v3: adds the improvement tracking (`growth`, docs/research.md M16), seeded conservatively from what v2 kept,
 * and only for skill-Stufen that are still 'geuebt' (still being learned):
 * - the early window starts with their `recent` results (the closest to the start that v2 knows; when it is full,
 *   `last` is taken as the day it ended). v2 did not tell wrong attempts from help, so every miss there counts as
 *   a wrong attempt (`earlyWrong`);
 * - a miss in `recent` gives `miss = last`. The real miss was on that day or before, so a later "days after the
 *   miss" can only be underestimated, never overstated.
 * 'sicher'/'gemeistert' entries get nothing: their misses may be old or help only, and must not turn into a wave of
 * rewards right after the update. Errors (tags) and Einmaleins misses were not stored by v2 and start empty.
 * Entries that are not shaped like v2 entries are skipped; the strict validation afterwards still rejects them.
 */
export function migrateV2toV3(data: Obj): Obj {
  const growth = emptyGrowth();
  if (isObj(data.skills)) {
    for (const [key, entry] of Object.entries(data.skills)) {
      if (!parseSkillKey(key) || !isObj(entry)) continue;
      const recent = boolList(entry.recent, RECENT_SIZE);
      if (!recent || recent.length === 0) continue;
      if (entry.state !== 'geuebt') continue;
      const last = isDay(entry.last) ? entry.last : undefined;
      const g: GrowthStufe = { early: recent.slice(0, GROWTH_WINDOW), after: 0 };
      const misses = g.early.filter((r) => !r).length;
      if (misses > 0) g.earlyWrong = misses;
      if (g.early.length === GROWTH_WINDOW && last) g.earlyDay = last;
      if (misses > 0 && last) g.miss = last;
      growth.stufen[key] = g;
    }
  }
  return { ...data, version: 3, growth };
}

/**
 * MIGRATIONS[n] upgrades a document of version n to version n + 1.
 * When the schema changes: bump ProgressState.version, add the step and a unit test with a stored
 * document of the old version.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = { 1: migrateV1toV2, 2: migrateV2toV3 };

export type MigrateResult = { ok: true; data: Obj } | { ok: false; error: SchemaError };

/** Runs the migrations from data.version up to `target`. Unknown, newer or failing versions are rejected. */
export function migrate(data: Obj, migrations: Readonly<Record<number, Migration>> = MIGRATIONS, target = CURRENT_VERSION): MigrateResult {
  let version = data.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) return { ok: false, error: 'invalid' };
  if (version > target) return { ok: false, error: 'newer-version' };
  let current = data;
  while (version < target) {
    const step: Migration | undefined = Object.prototype.hasOwnProperty.call(migrations, version) ? migrations[version] : undefined;
    if (!step) return { ok: false, error: 'invalid' };
    try {
      current = step(current);
    } catch {
      return { ok: false, error: 'invalid' };
    }
    if (!isObj(current) || current.version !== version + 1) return { ok: false, error: 'invalid' };
    version += 1;
  }
  return { ok: true, data: current };
}

// ─── Field validators ───────────────────────────────────────────────────────

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isCount(v: unknown, max = MAX_COUNT): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max;
}

function boolList(v: unknown, keep: number): boolean[] | null {
  if (!Array.isArray(v) || v.length > 1_000 || !v.every((b) => typeof b === 'boolean')) return null;
  return (v as boolean[]).slice(-keep);
}

function optionalDay(v: unknown): { ok: boolean; day?: Day } {
  if (v === undefined) return { ok: true };
  return isDay(v) ? { ok: true, day: v } : { ok: false };
}

const MASTERY: readonly MasteryState[] = ['neu', 'geuebt', 'sicher', 'gemeistert'];

const SETTING_CHECKS: { [K in keyof Settings]: (v: unknown) => boolean } = {
  subtractionMethod: (v) => v === 'abziehen' || v === 'ergaenzen',
  nrwExtras: (v) => typeof v === 'boolean',
  blitzrunde: (v) => typeof v === 'boolean',
  weeklyGoal: (v) => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5,
  largeText: (v) => typeof v === 'boolean',
  wideSpacing: (v) => typeof v === 'boolean',
  reduceMotion: (v) => typeof v === 'boolean',
  schoolFont: (v) => typeof v === 'boolean',
  keypad: (v) => v === 'auto' || v === 'on' || v === 'off',
};
const SETTING_KEYS = Object.keys(SETTING_CHECKS) as (keyof Settings)[];

/** Valid fields of a settings patch (invalid or unknown fields are dropped). */
export function sanitizeSettingsPatch(patch: unknown): Partial<Settings> {
  const out: Partial<Settings> = {};
  if (!isObj(patch)) return out;
  for (const key of SETTING_KEYS) {
    if (key in patch && SETTING_CHECKS[key](patch[key])) (out as Record<string, unknown>)[key] = patch[key];
  }
  return out;
}

/**
 * Settings from untrusted data: null if missing or if any known field has an invalid value.
 * Missing fields (older files) are filled with defaults; unknown fields are dropped.
 */
export function parseSettings(raw: unknown): Settings | null {
  if (!isObj(raw)) return null;
  for (const key of SETTING_KEYS) {
    if (key in raw && !SETTING_CHECKS[key](raw[key])) return null;
  }
  return { ...DEFAULT_SETTINGS, ...sanitizeSettingsPatch(raw) };
}

function parseStufe(v: unknown): StoredStufeProgress | null {
  if (!isObj(v)) return null;
  const recent = boolList(v.recent, RECENT_SIZE);
  const checks = boolList(v.checks, CHECKS_SIZE);
  const since = optionalDay(v.sicherSince);
  const due = optionalDay(v.due);
  const last = optionalDay(v.last);
  if (
    !isCount(v.attempts) ||
    !recent ||
    !checks ||
    !isCount(v.practiceDays) ||
    !MASTERY.includes(v.state as MasteryState) ||
    !isCount(v.box, MAX_BOX) ||
    !since.ok ||
    !due.ok ||
    !last.ok ||
    (v.optional !== undefined && typeof v.optional !== 'boolean')
  ) {
    return null;
  }
  const p: StoredStufeProgress = { attempts: v.attempts, recent, practiceDays: v.practiceDays, state: v.state as MasteryState, box: v.box, checks };
  if (since.day) p.sicherSince = since.day;
  if (due.day) p.due = due.day;
  if (last.day) p.last = last.day;
  if (v.optional === true) p.optional = true;
  return p;
}

function parseFact(v: unknown): FactProgress | null {
  if (!isObj(v)) return null;
  const due = optionalDay(v.due);
  if (!isCount(v.box, MAX_BOX) || !isCount(v.seen) || !isCount(v.correct) || !due.ok) return null;
  const f: FactProgress = { box: v.box, seen: v.seen, correct: v.correct };
  if (due.day) f.due = due.day;
  return f;
}

const SKILL_ID_RE = /^([a-z]+)\.[A-Za-z0-9_.-]{1,60}$/;

function isSkillId(id: string): boolean {
  const m = SKILL_ID_RE.exec(id);
  return !!m && (TOPIC_IDS as readonly string[]).includes(m[1]);
}

function parseGrowthStufe(v: unknown): GrowthStufe | null {
  if (!isObj(v)) return null;
  // The early window is the *first* answers: a longer list keeps its beginning.
  const early = boolList(v.early, Number.MAX_SAFE_INTEGER)?.slice(0, GROWTH_WINDOW);
  const earlyDay = optionalDay(v.earlyDay);
  const miss = optionalDay(v.miss);
  const improved = optionalDay(v.improved);
  if (!early || !isCount(v.after, GROWTH_WINDOW) || !earlyDay.ok || !miss.ok || !improved.ok) return null;
  if (v.kept !== undefined && !isCount(v.kept)) return null;
  if (v.earlyWrong !== undefined && !isCount(v.earlyWrong, GROWTH_WINDOW)) return null;
  const g: GrowthStufe = { early, after: v.after };
  if (typeof v.earlyWrong === 'number' && v.earlyWrong > 0) g.earlyWrong = Math.min(v.earlyWrong, early.length);
  if (earlyDay.day) g.earlyDay = earlyDay.day;
  if (miss.day) g.miss = miss.day;
  if (improved.day) g.improved = improved.day;
  if (typeof v.kept === 'number' && v.kept > 0) g.kept = v.kept;
  return g;
}

/** An error track, or null if it is unusable (then it is dropped; counts above today's limits are clamped). */
function parseTrack(v: unknown): ErrorTrack | null {
  if (!isObj(v) || !isDay(v.day) || !isCount(v.run) || !isCount(v.seen) || v.seen < 1) return null;
  const done = optionalDay(v.done);
  if (!done.ok) return null;
  const t: ErrorTrack = { day: v.day, seen: Math.min(v.seen, ERROR_MIN_SEEN), run: Math.min(v.run, OVERCOME_RUN) };
  if (done.day) t.done = done.day;
  return t;
}

/** Two tracks of tags that normalise to the same tag: the later error, the more evidence, overcome if either was. */
function mergeTracks(a: ErrorTrack, b: ErrorTrack): ErrorTrack {
  const t: ErrorTrack = { day: a.day > b.day ? a.day : b.day, seen: Math.max(a.seen, b.seen), run: Math.max(a.run, b.run) };
  const done = a.done && b.done ? (a.done < b.done ? a.done : b.done) : (a.done ?? b.done);
  if (done) t.done = done;
  return t;
}

/** `growth` of a v3 document (null if anything is malformed). */
function parseGrowth(raw: unknown): Growth | null {
  if (!isObj(raw) || !isObj(raw.stufen) || !isObj(raw.errors) || !isObj(raw.facts)) return null;
  const out = emptyGrowth();
  const stufenKeys = Object.keys(raw.stufen);
  if (stufenKeys.length > MAX_SKILL_ENTRIES) return null;
  for (const key of stufenKeys) {
    const g = parseSkillKey(key) ? parseGrowthStufe(raw.stufen[key]) : null;
    if (!g) return null;
    out.stufen[key] = g;
  }
  const skillIds = Object.keys(raw.errors);
  if (skillIds.length > MAX_SKILL_ENTRIES) return null;
  for (const skillId of skillIds) {
    const tracks = raw.errors[skillId];
    if (!isSkillId(skillId) || !isObj(tracks)) return null;
    const tags = Object.keys(tracks);
    if (tags.length > 1_000) return null;
    // Tags are a detail of the improvement tracking: a tag that a later version normalises differently is merged,
    // an unusable one is dropped and the list is trimmed, so a changed rule never makes stored progress unloadable.
    const parsed: Record<string, ErrorTrack> = {};
    for (const stored of tags) {
      const tag = normalizeTag(stored);
      const t = tag ? parseTrack(tracks[stored]) : null;
      if (!tag || !t) continue;
      parsed[tag] = Object.prototype.hasOwnProperty.call(parsed, tag) ? mergeTracks(parsed[tag], t) : t;
    }
    if (Object.keys(parsed).length > 0) out.errors[skillId] = capTracks(parsed);
  }
  const factKeys = Object.keys(raw.facts);
  if (factKeys.length > MAX_FACT_ENTRIES) return null;
  for (const key of factKeys) {
    const day = raw.facts[key];
    if (!isFactKey(key) || !isDay(day)) return null;
    out.facts[key] = day;
  }
  return out;
}

/** Strict validation of a current-version document. `knownBadge` filters badge ids (unknown ones are dropped). */
export function validateState(data: Obj, knownBadge: (id: string) => boolean = () => true): { state: ProgressState; settingsValid: boolean } | null {
  if (data.version !== CURRENT_VERSION) return null;
  const { skills, facts, days, badges, totals, blitzBest, reviewed, lastPlayed } = data;
  const growth = parseGrowth(data.growth);
  if (!growth) return null;
  if (!isObj(skills) || !isObj(facts) || !Array.isArray(days) || !isObj(badges) || !isObj(totals)) return null;

  const skillKeys = Object.keys(skills);
  if (skillKeys.length > MAX_SKILL_ENTRIES) return null;
  const outSkills: Record<string, StoredStufeProgress> = {};
  for (const key of skillKeys) {
    const p = parseSkillKey(key) ? parseStufe(skills[key]) : null;
    if (!p) return null;
    outSkills[key] = p;
  }

  const factKeys = Object.keys(facts);
  if (factKeys.length > MAX_FACT_ENTRIES) return null;
  const outFacts: Record<string, FactProgress> = {};
  for (const key of factKeys) {
    const f = isFactKey(key) ? parseFact(facts[key]) : null;
    if (!f) return null;
    outFacts[key] = f;
  }

  if (days.length > MAX_DAYS || !days.every(isDay)) return null;
  const outDays = [...new Set(days as Day[])].sort();

  const outBadges: Record<string, Day> = {};
  for (const [id, day] of Object.entries(badges)) {
    if (!isDay(day)) return null;
    if (knownBadge(id)) outBadges[id] = day;
  }

  const t = totals;
  if (!isCount(t.answered) || !isCount(t.firstTry) || !isCount(t.afterHint) || !isCount(t.rounds) || !isCount(t.checksPassed)) return null;
  if (blitzBest !== undefined && !isCount(blitzBest, 100_000)) return null;
  if (reviewed !== undefined && !(isObj(reviewed) && isDay(reviewed.day) && isCount(reviewed.count))) return null;
  // lastPlayed is a convenience: a malformed value is dropped instead of rejecting the whole document.
  const last = isObj(lastPlayed) && typeof lastPlayed.skillId === 'string' ? parseSkillKey(`${lastPlayed.skillId}#${String(lastPlayed.stufe)}`) : null;

  const settings = parseSettings(data.settings);
  const state: ProgressState = {
    version: CURRENT_VERSION,
    skills: outSkills,
    facts: outFacts,
    days: outDays,
    badges: outBadges,
    totals: { answered: t.answered, firstTry: t.firstTry, afterHint: t.afterHint, rounds: t.rounds, checksPassed: t.checksPassed },
    growth,
    settings: settings ?? { ...DEFAULT_SETTINGS },
  };
  if (blitzBest !== undefined) state.blitzBest = blitzBest;
  if (isObj(reviewed)) state.reviewed = { day: reviewed.day as Day, count: reviewed.count as number };
  if (last) state.lastPlayed = { skillId: last.skillId, stufe: last.stufe };
  return { state, settingsValid: settings !== null };
}

export type ParseResult = { ok: true; state: ProgressState; settingsValid: boolean } | { ok: false; error: SchemaError };

/** Parse a stored or exported document (already JSON-parsed). */
export function parseDocument(raw: unknown, knownBadge?: (id: string) => boolean): ParseResult {
  if (!isObj(raw)) return { ok: false, error: 'not-mathe4' };
  if ('app' in raw && raw.app !== APP_MARKER) return { ok: false, error: 'not-mathe4' };
  // Every document we write carries the marker; without it, accept only something that looks like a state.
  if (!('version' in raw) || (!('app' in raw) && !('skills' in raw))) return { ok: false, error: 'not-mathe4' };
  const migrated = migrate(raw);
  if (!migrated.ok) return migrated;
  const valid = validateState(migrated.data, knownBadge);
  return valid ? { ok: true, ...valid } : { ok: false, error: 'invalid' };
}

/** Parse JSON text (storage value or imported file). */
export function parseText(text: unknown, knownBadge?: (id: string) => boolean): ParseResult {
  if (typeof text !== 'string' || text.trim() === '') return { ok: false, error: 'empty' };
  if (text.length > MAX_IMPORT_CHARS) return { ok: false, error: 'too-large' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'not-json' };
  }
  return parseDocument(raw, knownBadge);
}

/** The stored/exported form: the state plus the app marker. */
export function serializeState(state: ProgressState): string {
  return JSON.stringify({ app: APP_MARKER, ...state });
}
