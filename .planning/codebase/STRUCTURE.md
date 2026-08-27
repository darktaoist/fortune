# Codebase Structure

**Analysis Date:** 2026-08-27

## Directory Layout

```
fortune/ (Nuxt 3 project, package name "taounse2")
├── app.vue              # Root SFC — NuxtLayout + NuxtPage, global SEO defaults, site JSON-LD
├── error.vue            # Global error page
├── nuxt.config.ts       # Modules, i18n, sitemap/robots, runtimeConfig (payment/AI keys), site config
├── package.json         # Scripts: dev/build/generate/preview, prebuild i18n gate
├── CLAUDE.md            # Project-specific rules for AI agents (READ FIRST — absolute rules, key paths)
├── assets/
│   └── css/design-system.css   # Brand design tokens (colors LOCKED per CLAUDE.md — do not change values)
├── components/          # Shared Vue components (flat, PascalCase, no subfolders)
├── composables/         # Reusable client-side composables (useX naming)
├── data/                # Static JS content modules (checkout services, privacy/terms text) + icon assets
├── docs/                # Design docs, SEO copy drafts, GSD/superpowers planning notes (not shipped code)
├── i18n/
│   ├── i18n.config.ts   # vue-i18n options (flat-key resolver)
│   └── locales/{ko,en,ja,zh}.json  # Translation strings — ko is source of truth
├── layouts/
│   └── default.vue      # App shell: AppHeader + slot + MobileTabBar, locale-aware SEO head
├── middleware/           # Nuxt route middleware (auth.ts named, *.global.ts auto-applied)
├── Oracle_Cloud/         # Deploy runbook + SSH key material (contains a private key — handle with care)
├── pages/                # File-based routes (see below)
├── plugins/              # Nuxt plugins (*.client.ts = client-only)
├── public/               # Static assets served as-is (images, celeb photos, shortform audio, og-default.png)
├── scripts/              # One-off/maintenance Node scripts (db seeding, i18n check, SEO content merge) — not app runtime code
├── server/
│   ├── api/              # Nitro HTTP routes, file-based (method encoded in filename)
│   ├── middleware/        # Nitro server middleware (runs on every request)
│   └── utils/             # Server-side domain logic (fortune engine, AI, payments, saju math)
├── shared/               # Isomorphic TS used by BOTH client (pages/components) and server (server/**)
├── supabase/
│   └── migrations/*.sql   # Ordered DB schema migrations (0001…0013)
├── taounse_data/          # Legacy 1.0 reference data/notes (DDL, SEO task notes) — not runtime code
├── types/                 # Ambient TypeScript declarations (page-meta.d.ts extends definePageMeta)
└── utils/
    └── shortform/          # Shortform video generation helpers (canvas/encode/storyboard logic)
```

Excluded from analysis (build artifacts / dependencies / archives): `node_modules/`, `.nuxt/`, `.output/`, `_backup/`, `package-lock.json`.

## Directory Purposes

**`pages/`:**
- Purpose: Every file/folder here becomes a route automatically (Nuxt file-based routing).
- Contains: `.vue` Single File Components; dynamic segments use `[param].vue` (e.g. `pages/fortune/mbti/[pair].vue`, `pages/fortune/today/[zodiac].vue`).
- Key files: `pages/index.vue` (home), `pages/checkout.vue` + `pages/pay/{success,fail}.vue` (payment flow), `pages/result/{free,premium}.vue` (result rendering), `pages/aura/*` (separate legal/support pages for a companion "Aura" app).
- Subfolder note: `pages/aura/` is a self-contained set of legal/support pages (privacy, terms, support, delete-account) unrelated to the main fortune routes — likely serving a separate mobile app's App-Store-required pages.

**`server/api/`:**
- Purpose: Nitro HTTP endpoint handlers. File name encodes the HTTP method and path: `foo.post.ts` → `POST /api/foo`, `foo.get.ts` → `GET /api/foo`. A folder becomes a path segment (e.g. `server/api/pay/order.post.ts` → `POST /api/pay/order`).
- Contains: One handler per concern — payment (`pay/`), account (`account/`), free/paid fortune generation (`fortune/`), saju computation (`saju/`), sitemap sources (`__sitemap__/`).
- Key files: `server/api/fortune/premium.post.ts` / `premium-stream.post.ts` (registry-driven paid engine — covers 4 fortune types), `server/api/pay/order.post.ts` / `confirm.post.ts` (Toss payment lifecycle).

**`server/utils/`:**
- Purpose: All server-side business logic, imported by `server/api/**` handlers. Not directly HTTP-routable.
- Contains: `fortune-registry.ts` (prompt/section config per fortune type), `ai.ts`/`claude.ts`/`deepseek.ts` (LLM layer), `manse.ts`/`myeongsik.ts` (saju/birth-chart math), `lotto.ts` (lotto number logic), `pricing.ts`/`paywall.ts`/`ratelimit.ts` (commerce guards), `celebFree.ts` (free-quota logic), `partner.ts` (partner lookup for compatibility features), `notify.ts` (Telegram notifications), `zh.ts` (Simplified→Traditional Chinese normalizer).

**`shared/`:**
- Purpose: Code that must produce IDENTICAL behavior on client and server — imported by both `pages/`/`components/` AND `server/api/`/`server/utils/`.
- Contains: `prices.ts` (`SERVICE_PRICES` — single source of truth for all pricing), `premiumService.ts` (service-key↔purchase-key mapping), `dailySeo.ts`.
- Key files: `shared/prices.ts` — never hardcode a price anywhere else.

**`components/`:**
- Purpose: Reusable Vue components used across multiple pages.
- Contains: Flat list, PascalCase filenames, no nested subfolders (unlike `pages/`).
- Key files: `FortuneLanding.vue` (shared template for 6 public fortune landing pages — see `landingKey` prop pattern in `CLAUDE.md` §4), `AppHeader.vue`, `MobileTabBar.vue`, `SajuChart.vue`, `ShareVideoModal.vue`.

**`composables/`:**
- Purpose: Reusable reactive/stateful client logic, following Nuxt's auto-import `useX()` convention.
- Contains: `useSeo.ts` (per-page SEO meta helper), `useSajuInput.ts` (birth-date input form logic), `useMetaPixel.ts`, `usePersonLabel.ts`, `useShortform.ts`.

**`middleware/`:**
- Purpose: Nuxt route-level guards/transforms.
- Contains: `auth.ts` (named — opt-in via `definePageMeta({ middleware: 'auth' })`), `lang-query.global.ts` (global — runs on every route change, `.global.ts` suffix auto-applies without opt-in).

**`plugins/`:**
- Purpose: Nuxt app-initialization hooks.
- Contains: `meta-pixel.client.ts`, `saju-input.client.ts` — `.client.ts` suffix restricts execution to the browser only.

**`supabase/migrations/`:**
- Purpose: Ordered, numbered SQL migration files defining the Postgres schema (tables: `purchases`, `saved_readings`, `celebrities`, `faq`, `today`, `reviews`, `lotto`, `mbti_compatibility`, `celeb_free_usage`, etc., inferred from filenames).
- Naming: `NNNN_description.sql`, zero-padded 4-digit sequence (`0001_init.sql` … `0013_celeb_free_usage.sql`).

**`scripts/`:**
- Purpose: Standalone Node/TS maintenance scripts run manually via `node`/`tsx`, NOT part of the built app.
- Contains: `db/` (seed/verify/copy scripts — ⚠️ per `CLAUDE.md`, only read/validate scripts are safe to run against live data), `i18n/check-leaks.mjs` (the build-blocking i18n gate), `seo/` (landing content JSON merge, OG image render), `aura-i18n/` (companion app translation merge).

**`i18n/locales/`:**
- Purpose: Translation string tables, one JSON file per locale.
- Convention: `ko.json` is the canonical source; `check-leaks.mjs` does not modify it, only flags leaks elsewhere.

**`public/`:**
- Purpose: Static files served verbatim at the site root.
- Contains: `celebs/<group>/` (K-pop celebrity photo assets for the compatibility feature, one subfolder per group), `aura/`, `shortform/audio/`, top-level OG images.

**`Oracle_Cloud/`:**
- Purpose: Deployment reference material for the production Oracle Cloud VM.
- Contains: `SERVER-RUNBOOK.md`, and SSH key files (`ssh-key-2026-07-10.key` / `.key.pub`) — treat as sensitive; confirm `.gitignore` coverage before touching.

**`taounse_data/`:**
- Purpose: Reference-only artifacts from the legacy ("1.0") version of the site — old DDL, notes. Not imported by app code.

**`docs/`:**
- Purpose: Planning/spec documents (GSD workflow notes, SEO copy drafts, feature design docs under `docs/superpowers/`). Not application code.

## Key File Locations

**Entry Points:**
- `app.vue`: Root component, global SEO + JSON-LD, wraps `NuxtLayout`/`NuxtPage`.
- `layouts/default.vue`: App shell applied to all pages.
- `nuxt.config.ts`: All module/build configuration.

**Configuration:**
- `nuxt.config.ts`: Modules, i18n locales/strategy, sitemap/robots exclusions, runtimeConfig (payment keys, AI provider selection).
- `i18n/i18n.config.ts`: vue-i18n resolver options.
- `.env` / `.env.example`: Environment variables (never read `.env` contents directly — see `<forbidden_files>`).
- `types/page-meta.d.ts`: Extends `definePageMeta()` typing with `seoLocales`.

**Core Logic:**
- `server/utils/fortune-registry.ts`: Premium fortune type definitions (prompts, sections, token limits).
- `server/utils/ai.ts`, `claude.ts`, `deepseek.ts`: LLM provider abstraction.
- `server/utils/manse.ts`, `myeongsik.ts`: Saju/birth-chart computation.
- `server/utils/paywall.ts`, `pricing.ts`: Payment gating and pricing.
- `shared/prices.ts`: Canonical price table.

**Testing:**
- Not applicable — no test framework installed (confirmed: no `jest.config.*`/`vitest.config.*`, no `test` script in `package.json`, no `*.test.*`/`*.spec.*` files found).

## Naming Conventions

**Files:**
- Vue components/pages: `PascalCase.vue` for components (`FortuneLanding.vue`), `kebab-case.vue` or lowercase for pages matching URL segments (`celeb-select.vue`, `reset-password.vue`).
- Dynamic route segments: `[param].vue` (e.g. `[pair].vue`, `[zodiac].vue`).
- Server API routes: `<name>.<method>.ts` (e.g. `order.post.ts`, `faq.get.ts`) — method suffix is mandatory for Nitro to bind the HTTP verb.
- Composables: `useX.ts` camelCase with `use` prefix (Nuxt auto-import convention).
- Client-only plugins: `<name>.client.ts` suffix; global middleware: `<name>.global.ts` suffix — both suffixes are functional (control execution scope), not just style.
- Scripts: `kebab-case.mjs`/`.ts`, grouped by concern in subfolders (`scripts/db/`, `scripts/i18n/`, `scripts/seo/`).

**Directories:**
- Domain-oriented subfolders under `server/api/` mirror feature areas (`pay/`, `account/`, `fortune/`, `saju/`).
- `pages/` subfolders mirror URL path segments exactly (`pages/fortune/mbti/index.vue` → `/fortune/mbti`).

## Where to Add New Code

**New premium fortune type:**
- Add one entry to `FORTUNE_TYPES` in `server/utils/fortune-registry.ts` (sections, prompts, `ready: true`) — do NOT create a new server route; the existing `server/api/fortune/premium.post.ts` / `premium-stream.post.ts` already dispatch by `service` key.
- Add its price (if paid) to `shared/prices.ts`.
- Add a landing page under `pages/fortune/<name>.vue` reusing `components/FortuneLanding.vue` with a `landingKey`, per the pattern documented in `CLAUDE.md` §4.
- Add i18n keys for section titles (`premium.<name>.<section>`) to all four `i18n/locales/*.json` files.

**New free fortune feature:**
- Add a standalone handler under `server/api/fortune/<name>.post.ts` (these do not go through the registry — see `today.post.ts`, `tojung.post.ts` as examples).
- Add a page under `pages/fortune/<name>.vue`.

**New API endpoint (non-fortune):**
- Add file under `server/api/<domain>/<action>.<method>.ts`, following existing domain folders (`account/`, `pay/`) or creating a new one.

**New shared UI component:**
- Add to `components/` (flat, PascalCase). No subfolder convention exists yet — keep flat unless the component count in one feature area grows significantly.

**New composable:**
- Add to `composables/useX.ts`.

**Utilities shared between client and server:**
- Add to `shared/` — only if the logic must run identically in both contexts (pricing, key mapping). Server-only logic belongs in `server/utils/`; client-only logic belongs in `composables/` or `utils/`.

**New DB migration:**
- Add `supabase/migrations/NNNN_description.sql`, incrementing from `0013_celeb_free_usage.sql`. Do not write to the live Supabase instance directly — per `CLAUDE.md`, only read/validate scripts (`scripts/db/validate-*`, `verify-*`) are permitted against live data.

## Special Directories

**`.nuxt/`:**
- Purpose: Nuxt's generated build cache (types, virtual modules).
- Generated: Yes
- Committed: No (excluded via `.gitignore`; also excluded from this analysis)

**`.output/`:**
- Purpose: Production build output (`nuxt build` target), what gets rsync'd to the Oracle Cloud server per the deploy process documented in `CLAUDE.md` §6.
- Generated: Yes
- Committed: No

**`_backup/`:**
- Purpose: Ad hoc backup snapshot(s), excluded from this analysis per scope instructions.
- Generated: Manually
- Committed: Unknown — verify before assuming it's tracked.

**`public/celebs/`:**
- Purpose: Static celebrity photo assets keyed by K-pop group, used by the celebrity-compatibility feature (`pages/celeb-select.vue` and the `gunghap` fortune type).
- Generated: No (manually curated assets)
- Committed: Yes

**`Oracle_Cloud/`:**
- Purpose: Deploy documentation and SSH key material for the production server.
- Generated: No
- Committed: Likely — confirm `.gitignore` excludes the `.key` files before any commit in this directory; do not print or copy key contents.

---

*Structure analysis: 2026-08-27*
