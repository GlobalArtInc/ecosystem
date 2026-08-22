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

A release covers every package at once — never `npm publish` a single package by hand, that leaves
the shared version inconsistent. It takes two commands:

```bash
pnpm publish:npm        # bump, build, commit, tag, push
pnpm publish:packages   # publish every package to npm
```

`pnpm publish:npm` runs `release-it` over the chain in `.release-it.json`:

1. bumps the version in the root `package.json`
2. `after:bump` → `scripts/sync-versions.mjs` writes that version into every `packages/*/package.json`
   and rewrites their `@globalart/*` dependency ranges to it
3. `before:release` → `pnpm build`
4. commits `release v<version>`, tags `v<version>` and pushes

It does not publish: `npm.publish` is off, and the `before:git:commit` hook that was meant to call
`scripts/publish-packages.mjs` is not a hook name release-it recognises, so it is silently skipped.
Run `pnpm publish:packages` afterwards — it publishes every non-private package in dependency order,
so a dependency always lands on the registry before its dependents.

Requirements: a clean working tree (`requireCleanWorkingDir`), a branch with an upstream, and working
npm auth — the publish script aborts when `npm whoami` fails. Non-interactive runs need an explicit
increment, for example `npx release-it minor --ci`.

`verifyDepsBeforeRun: false` in `pnpm-workspace.yaml` is what keeps the release build working: after
the bump the internal `@globalart/*` ranges point at a version that is not on the registry yet, and
pnpm would otherwise try to install it before running the build.

`pnpm publish:dev` releases the same way under the `dev` dist-tag as a prerelease.

## Conventions

- Source is TypeScript with double quotes, formatted by `prettier`; run `pnpm format` before pushing
- Keep public options documented in the package's page under `docs/content/packages/`, including the
  defaults table — consumers read that page, not the source
- New options on existing modules must keep the previous behaviour when unset
- Documentation, code comments and commit messages are written in English
