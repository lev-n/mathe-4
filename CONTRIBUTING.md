# Contributing to Mathe 4

Thanks for helping! Bug reports, content corrections (maths, German wording, curriculum fit) and pull requests are welcome.

## Before you start

- For larger changes (new skills, new answer types, design or learning-flow changes), please open an issue first.
- The design follows the research in [`docs/research.md`](docs/research.md). Every change must pass the banned-patterns checklist in §6.4: no timers by default, no streaks, leaderboards, currencies or pop-ups during a round, no "Falsch!" feedback, no third-party requests, no storage before opt-in.
- Student-facing text is German, short and friendly. Code, comments and docs are English.

## Setup

Requirements: Node.js 22.22+, 24.15+ or 26+ (CI uses 26) and npm.

```bash
npm ci
npm run dev         # http://localhost:5173
npm run typecheck
npm test
npm run build
```

CI runs `npm run typecheck`, `npm test` and `npm run build` on every push and pull request. All three must pass.

## Guidelines

- **Generators stay pure.** A skill's `generate(rng, stufe, ctx)` uses only `rng` for randomness and the formatting helpers for numbers. Never rename a skill id, because progress is stored by id. See "Adding a skill" in the README.
- **Tests.** Every new skill gets a `<slug>.test.ts` with `describeSkill(skill)`. UI changes need jsdom tests, including keyboard use.
- **Privacy.** Keep the app free of tracking, analytics, ads, cookies, external fonts and CDNs. `scripts/check-dist.mjs` fails the build on third-party hosts and inline scripts. Do not add runtime dependencies without discussing it first.
- **Accessibility.** Keep WCAG 2.2 AA: contrast from `src/styles/tokens.css`, touch targets ≥ 48 px (answer controls ≥ 64 px), full keyboard support, visible focus, screen-reader text for every task.
- **Operator data.** Do not put real names or addresses into `src/config/operator.ts` in a pull request. Each deployment fills in its own.

## License

Mathe 4 is licensed under the [GNU Affero General Public License v3.0 or later](LICENSE). By submitting a contribution, you agree that it is licensed under the same terms (`AGPL-3.0-or-later`).
