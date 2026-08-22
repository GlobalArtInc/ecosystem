# CLAUDE.md

pnpm monorepo of `@globalart/*` packages for NestJS. Everything under `packages/` is published to npm
under one shared version number — there is no per-package versioning.

## Layout

- `packages/*` — published packages, each built with `tsdown` into `dist/`
- `docs/` — the site behind https://globalart.js.org, one `.mdx` page per package under
  `docs/content/packages/`
- `scripts/sync-versions.mjs` — copies the root version into every package
- `scripts/publish-packages.mjs` — publishes every non-private package in dependency order

## Build

```bash
pnpm install
pnpm build
```

`pnpm -r build` runs `tsdown` per package. A single package builds with
`pnpm --filter @globalart/<name> build`.

## Release

One command releases the whole monorepo — never `npm publish` a single package by hand, that leaves
the shared version inconsistent:

```bash
pnpm publish:npm
```

`release-it` drives the chain defined in `.release-it.json`:

1. bumps the version in the root `package.json`
2. `after:bump` → `scripts/sync-versions.mjs` writes that version into every `packages/*/package.json`
   and rewrites their `@globalart/*` dependency ranges to it
3. `before:release` → `pnpm build`
4. `before:git:commit` → `scripts/publish-packages.mjs` publishes every package to npm, ordered so a
   dependency is always published before its dependents
5. release-it commits `release v<version>`, tags `v<version>` and pushes

Requirements: a clean working tree (`requireCleanWorkingDir`) and working npm auth — the publish
script aborts when `npm whoami` fails. Non-interactive runs need an explicit increment, for example
`npx release-it minor --ci`.

`pnpm publish:dev` does the same under the `dev` dist-tag as a prerelease.

## Conventions

- Source is TypeScript with double quotes, formatted by `prettier`; run `pnpm format` before pushing
- Keep public options documented in the package's page under `docs/content/packages/`, including the
  defaults table — consumers read that page, not the source
- New options on existing modules must keep the previous behaviour when unset
- Documentation, code comments and commit messages are written in English
