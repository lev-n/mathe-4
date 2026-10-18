// Minimal typings for the few Node built-ins used by tests (vitest runs them in Node).
// The project deliberately ships without @types/node; keep this list tiny.
declare module 'node:fs' {
  export function readFileSync(path: string | URL, encoding: 'utf8'): string;
}
