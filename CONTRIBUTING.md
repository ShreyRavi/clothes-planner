# Contributing

Thanks for helping. The easiest contribution is a new event template.

## Add a template

1. Copy `src/templates/wedding-weekend.json` to a new file, for example `src/templates/nikah.json`.
2. Give it a unique `id`, a `name`, a short `description`, an `order`, and lists of `functions` and `optional` functions. Each function has `name`, `timeOfDay` and `dressCode` (strings; empty is fine).
3. Run `npm run check:templates`. CI runs the same check.

## Code changes

- Read `docs/PRD.md` and the decisions in `docs/designs/trousseau.md` first.
- Style with the tokens in `src/styles/tokens.css`; they must match `DESIGN.md` (`npm run check:tokens`).
- Every mutation goes through `write()` in `src/db/write.ts`, and every destructive action uses the undo helper.
- Changing the share link format means a new version byte and a golden fixture; see `src/codec/FORMAT.md`.
- Changing the database schema means a new `this.version(n)` with an upgrade and a fixture.
- Run `npm test`, `npm run build`, `npm run e2e` and `npm run check:bundle` before opening a PR.
- No em dashes or en dashes in user-facing copy.
