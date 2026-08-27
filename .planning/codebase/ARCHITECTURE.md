<!-- refreshed: 2026-08-27 -->
# Architecture

**Analysis Date:** 2026-08-27

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         Nuxt 3 SSR Application                       │
├───────────────────────────┬───────────────────────────────────────┤
│      Pages (routes)       │     Global shell / cross-cutting        │
│      `pages/**/*.vue`     │  `app.vue`, `layouts/default.vue`,      │
│                            │  `middleware/*.ts`, `plugins/*.ts`      │
└──────────────┬─────────────┴───────────────┬───────────────────────┘
               │ fetch (`$fetch` / `useFetch`)  │ composables
               ▼                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Nitro server routes (`server/api/**`)            │
│  file-based handlers, one responsibility per file (`*.post.ts` etc.) │
└──────────────┬─────────────────┬───────────────┬────────────────────┘
               │                 │                │
               ▼                 ▼                ▼
┌───────────────────┐  ┌──────────────────┐  ┌───────────────────────┐
│  Domain utils       │  │  AI dispatcher    │  │  Payment / paywall     │
│ `server/utils/       │  │ `server/utils/    │  │ `server/utils/paywall  │
│  fortune-registry,    │  │  ai.ts → claude.ts │  │  .ts, pricing.ts,      │
│  manse.ts, myeongsik  │  │  / deepseek.ts`    │  │  ratelimit.ts`         │
│  .ts, lotto.ts, zh.ts`│  │                    │  │                        │
└──────────┬─────────┘  └─────────┬────────┘  └───────────┬────────────┘
           │                       │                        │
           ▼                       ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│         Supabase (Postgres + Auth) — `@nuxtjs/supabase` module       │
│  `serverSupabaseUser` (RLS, session) / `serverSupabaseServiceRole`   │
│  (admin, bypasses RLS) · schema in `supabase/migrations/*.sql`       │
└─────────────────────────────────────────────────────────────────────┘
           ▲
           │ isomorphic helpers (imported by BOTH client pages and server)
┌─────────────────────────────────────────────────────────────────────┐
│  `shared/` — prices.ts, premiumService.ts, dailySeo.ts               │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Fortune type registry | Single source of truth for every premium fortune type (sections, prompts, token limits) | `server/utils/fortune-registry.ts` |
| AI dispatcher | Abstracts Claude vs DeepSeek behind one interface; auto-fallback chain | `server/utils/ai.ts` |
| Claude client | Anthropic SDK wrapper (structured + streaming) | `server/utils/claude.ts` |
| DeepSeek client | DeepSeek REST wrapper (structured + streaming) | `server/utils/deepseek.ts` |
| Paywall gate | Enforces login + paid purchase before generating premium content | `server/utils/paywall.ts` |
| Rate limiter | In-memory sliding-window IP rate limit | `server/utils/ratelimit.ts` |
| Pricing | Single source of truth for prices, used by client display and server billing | `shared/prices.ts`, `server/utils/pricing.ts` |
| Purchase↔service key mapping | Reconciles route `service` keys (e.g. `gunghap`) with DB `type_key` (e.g. `celeb`) | `shared/premiumService.ts` |
| Myeongsik (사주 4주) builder | Computes birth-chart data from manse-ryeok tables | `server/utils/myeongsik.ts`, `server/utils/manse.ts` |
| Free daily quota | Per-account daily free-usage quota (celeb/MBTI compatibility), atomic reserve/refund | `server/utils/celebFree.ts` |
| zh normalizer | Forces Simplified→Traditional Chinese on AI output | `server/utils/zh.ts` |
| Shared landing template | One component renders 6 public fortune landing pages | `components/FortuneLanding.vue` |
| App shell | Global header/footer/tab-bar wrapper + per-page SEO locale filtering | `layouts/default.vue` |
| Route guard | Redirects unauthenticated users away from protected pages | `middleware/auth.ts` |
| Global SEO defaults | Site-wide `<title>`/OG/JSON-LD (Organization + WebSite) | `app.vue` |

## Pattern Overview

**Overall:** Nuxt 3 full-stack monolith (SSR + Nitro server routes) with a **config-driven "type registry" pattern** for the core premium-content generation engine, and a **provider-abstraction pattern** for LLM access.

**Key Characteristics:**
- File-based routing on both client (`pages/**`) and server (`server/api/**`) — Nuxt/Nitro convention, no manual router config.
- One server route (`server/api/fortune/premium.post.ts`, `premium-stream.post.ts`) handles ALL premium fortune types (`lifetime`, `newyear`, `gunghap`, `mbti`) by looking up behavior in `FORTUNE_TYPES` (`server/utils/fortune-registry.ts`). Adding a new fortune type means adding a registry entry, not a new route.
- Multi-provider LLM abstraction with automatic failover: `generateStructured()`/`streamText()` in `server/utils/ai.ts` try the configured provider first, then fall back to the other if the API key exists and the first fails before emitting output.
- No client-side global state store (no Pinia/Vuex). State lives in Nuxt composables (`composables/*`) and Supabase's own auth/session state (`useSupabaseUser()`).
- `shared/` directory holds isomorphic TypeScript imported by both Vue pages/components and Nitro server handlers (pricing, purchase-key mapping) — single source of truth to avoid client/server drift.
- Multi-locale (4 languages: ko/en/ja/zh) baked into routing (`prefix_except_default` strategy), SEO (`useLocaleHead`), and AI generation (per-language system prompts + post-generation traditional-Chinese normalization).

## Layers

**Presentation (pages + components):**
- Purpose: Route-level views and shared UI.
- Location: `pages/`, `components/`, `layouts/`
- Contains: `.vue` SFCs, `definePageMeta()` config (middleware, `seoLocales`).
- Depends on: `composables/`, Nitro API via `$fetch`/`useFetch`, `shared/`.
- Used by: End users (browser SSR/CSR).

**Composables (client-side logic):**
- Purpose: Reusable stateful/UX logic (SEO head building, saju input parsing, meta-pixel tracking, shortform video helpers).
- Location: `composables/`, `utils/shortform/`
- Depends on: Nuxt/Vue runtime, `shared/`.
- Used by: `pages/`, `components/`.

**Server API (Nitro routes):**
- Purpose: HTTP handlers — one file per endpoint, thin orchestration only.
- Location: `server/api/**/*.{get,post}.ts`
- Contains: Request validation, auth/paywall checks, calls into `server/utils/`.
- Depends on: `server/utils/`, `shared/`, Supabase client factories (`#supabase/server`).
- Used by: `pages/` via `$fetch`.

**Server utils (domain logic):**
- Purpose: All business logic — fortune generation, payment, saju math, quotas.
- Location: `server/utils/*.ts`
- Depends on: Supabase admin/user clients passed in by caller, `shared/`.
- Used by: `server/api/**`.

**Server middleware:**
- Purpose: Request-level cross-cutting concerns applied to every request before route handlers.
- Location: `server/middleware/legacy-redirects.ts`
- Pattern: Nitro auto-registers any file here; runs on every incoming request.

**Shared (isomorphic):**
- Purpose: Pure logic/constants safe to import from both client and server bundles.
- Location: `shared/*.ts`
- Contains: `prices.ts` (`SERVICE_PRICES`), `premiumService.ts` (service↔purchase key mapping), `dailySeo.ts`.
- Used by: both `pages/`/`components/` and `server/api/**`, `server/utils/**`.

**Data layer:**
- Purpose: Persistence and auth.
- Location: Supabase (Postgres) — schema in `supabase/migrations/*.sql` (13 migrations).
- Access pattern: `serverSupabaseUser(event)` for RLS-scoped reads on behalf of the logged-in user; `serverSupabaseServiceRole(event)` for admin writes that must bypass RLS (e.g. writing `purchases`, `saved_readings`).

## Data Flow

### Premium fortune generation (paid path)

1. User submits birth data on a landing page, e.g. `pages/fortune/lifetime.vue` (via shared `components/FortuneLanding.vue`).
2. Client creates a payment order: `POST /api/pay/order` (`server/api/pay/order.post.ts`) — looks up price from `server/utils/pricing.ts` (backed by `shared/prices.ts`), snapshots the subject/partner into `saved_readings`, inserts a `pending` row into `purchases`, returns a Toss order.
3. Toss widget completes payment client-side; client calls `POST /api/pay/confirm` (`server/api/pay/confirm.post.ts`) to verify and mark the purchase `paid`.
4. Client requests the result: `POST /api/fortune/premium-stream` (or `/premium` non-streaming) (`server/api/fortune/premium-stream.post.ts`, `premium.post.ts`).
5. Handler resolves `service` → `FORTUNE_TYPES[service]` (`server/utils/fortune-registry.ts`), then calls `requirePaidPurchase()` (`server/utils/paywall.ts`) — throws 401 if not logged in, 402 if no matching `paid` purchase.
6. Handler builds the birth chart via `buildMyeongsik()` (`server/utils/myeongsik.ts` → `server/utils/manse.ts`) for saju-based types, or resolves partner MBTI for MBTI-based types (`server/utils/partner.ts`).
7. Handler calls `generateStructured()`/`streamText()` (`server/utils/ai.ts`), which dispatches to Claude or DeepSeek per `resolveProvider()`, using the registry's `system()`/`buildPrompt()` for that fortune type.
8. Non-`ko` output is passed through `toTraditional()` (`server/utils/zh.ts`) to guarantee Traditional Chinese.
9. Result sections stream/return to `pages/result/premium.vue` for rendering.

### Free fortune generation (no-paywall path)

1. User submits birth data on a free landing page (e.g. `pages/fortune/today/[zodiac].vue`, `pages/daily.vue`, `pages/fortune/tojung.vue`).
2. Client calls a dedicated free-service Nitro route (e.g. `server/api/fortune/today.post.ts`, `tojung.post.ts`, `lotto.post.ts`, `month.post.ts`, `date.post.ts`) — each is a standalone handler (not registry-driven), pulling from pre-seeded content tables (e.g. `today` table) rather than calling the LLM live.
3. Result renders on `pages/result/free.vue` or inline on the fortune page.

### Free daily-quota compatibility path (celeb/MBTI)

1. `server/utils/celebFree.ts` implements an atomic reserve/refund quota (3 uses/day/account, KST reset) gating `server/api/mbti-compatibility.get.ts` / celeb-compatibility flows without requiring payment.

**State Management:**
- No global client store. Auth/session state lives in Supabase's reactive `useSupabaseUser()` (from `@nuxtjs/supabase`). Per-page ephemeral form state lives in local `ref()`s or `composables/useSajuInput.ts`. Server-side "state" (rate-limit buckets) lives in an in-process `Map` in `server/utils/ratelimit.ts` — does not survive restarts and is not shared across instances.

## Key Abstractions

**FortuneType registry entry:**
- Purpose: Fully describes one premium fortune product — its sections, glyph/tint theming, token budget, whether it needs saju math or a partner, and the prompt-building functions for both streaming and non-streaming generation.
- Examples: `lifetime`, `newyearType`, `gunghapType`, `mbtiType` in `server/utils/fortune-registry.ts`
- Pattern: Strategy/registry object map (`FORTUNE_TYPES: Record<string, FortuneType>`), looked up by a `service` string from the request body.

**AI provider abstraction:**
- Purpose: Uniform `generateStructured()`/`streamText()` calls regardless of underlying LLM vendor, with automatic failover.
- Examples: `server/utils/ai.ts` (dispatcher), `server/utils/claude.ts`, `server/utils/deepseek.ts` (implementations)
- Pattern: Adapter + chain-of-responsibility (`providerChain()` tries primary then fallback provider based on which API keys are configured).

**Service key ↔ purchase key mapping:**
- Purpose: Some fortune "service" keys used in routes/UI (`gunghap`) differ from the "type_key" used in the `purchases`/`saved_readings` tables (`celeb`). Centralizes the translation so it's never duplicated.
- Examples: `shared/premiumService.ts` (`toPurchaseKey`, `toServiceKey`)
- Pattern: Bidirectional lookup table shared by client and server.

**Paid gate:**
- Purpose: Reusable "must be logged in AND have a paid purchase for this service" check.
- Examples: `server/utils/paywall.ts` (`requirePaidPurchase`)
- Pattern: Guard function called at the top of every premium-content route, throws `H3Error` (401/402) instead of returning a boolean.

## Entry Points

**Client SSR/CSR entry:**
- Location: `app.vue`
- Triggers: Every page load/navigation.
- Responsibilities: Wraps `<NuxtLayout><NuxtPage /></NuxtLayout>`, sets global SEO defaults (title/OG/twitter meta) and site-wide JSON-LD (`Organization` + `WebSite`).

**Layout shell:**
- Location: `layouts/default.vue`
- Triggers: Applied to every page via `NuxtLayout`.
- Responsibilities: Renders `AppHeader`/`MobileTabBar`, computes locale-aware `<head>` (hreflang, canonical, og:locale) via `useLocaleHead()`, and applies per-page `seoLocales` filtering (drop hreflang links / set `noindex` for excluded locales).

**Route middleware:**
- Location: `middleware/auth.ts` (named — opt-in via `definePageMeta({ middleware: 'auth' })`), `middleware/lang-query.global.ts` (global — runs on every navigation).
- Triggers: Nuxt router navigation.
- Responsibilities: `auth.ts` redirects unauthenticated users to `/login`; `lang-query.global.ts` normalizes `?lang=` query params into locale-prefixed paths.

**Server middleware:**
- Location: `server/middleware/legacy-redirects.ts`
- Triggers: Every incoming HTTP request to the Nitro server (auto-registered by file location).
- Responsibilities: 301-redirects legacy URL patterns to current routes.

**Nitro API routes:**
- Location: `server/api/**/*.{get,post}.ts` (file name encodes HTTP method: `foo.post.ts` → `POST /api/foo`).
- Triggers: `$fetch`/`useFetch` calls from pages, or the sitemap module for `__sitemap__/*` sources.
- Responsibilities: One HTTP endpoint each; thin — validates input, calls `server/utils/*`, returns JSON (or streams for `premium-stream.post.ts`).

## Architectural Constraints

- **Threading/scaling:** Single-instance assumption. `server/utils/ratelimit.ts` uses an in-process `Map` for rate-limit buckets — this state is lost on restart and NOT shared across multiple server instances/processes. The code comment explicitly flags this: acceptable for current single-instance deployment (pm2 app `taounse` on one Oracle Cloud VM), but would need an external store (Redis) before horizontal scaling.
- **No caching layer for premium generation:** `server/api/fortune/premium.post.ts` explicitly does not cache (`cached: false` always) — every premium request calls the LLM fresh. Only free-tier content (e.g. `today` table) is pre-seeded/cached in Postgres.
- **No global client state store:** No Pinia/Vuex. Relying on Supabase's own reactive auth state plus local component state; there is no cross-page client cache of previously fetched results beyond what Supabase-backed `saved_readings`/`library` provides server-side.
- **AI provider failover has a "no double-emit" constraint:** `streamText()` in `server/utils/ai.ts` will NOT fall back to a second provider mid-stream if the first provider already emitted partial text — only pre-emission (connection/auth) failures trigger fallback, to avoid duplicated/garbled output to the client.
- **Legacy secrets present in repo tree:** `Oracle_Cloud/ssh-key-2026-07-10.key` (SSH private key) and `.key.pub` exist in the working tree — check `.gitignore` before any commit touching this directory.
- **No automated test suite:** No vitest/playwright/jest configured (confirmed in `CLAUDE.md` §7). The only automated gate is `npm run build`, which runs `scripts/i18n/check-leaks.mjs` as a `prebuild` step (checks for hardcoded Korean strings in shared components and Simplified-Chinese leakage).

## Anti-Patterns

### Hardcoded strings in shared components (build-blocking, by design)

**What happens:** Occasionally new code adds a hardcoded Korean string directly into a shared component/composable/page instead of routing it through `t()`.
**Why it's wrong:** Breaks the 4-language i18n guarantee; the string won't translate for `en`/`ja`/`zh` visitors.
**Do this instead:** All user-facing strings go through `t('...')` with keys added to `i18n/locales/{ko,en,ja,zh}.json`. This is enforced by `scripts/i18n/check-leaks.mjs`, which runs automatically before every `npm run build` (as `prebuild`) and fails the build if violated. Comments in Korean are fine; only user-facing rendered text is checked.

### Route-level price hardcoding

**What happens:** A temptation to hardcode a price value (e.g. `9900`) directly in a page or a new server route.
**Why it's wrong:** `shared/prices.ts` (`SERVICE_PRICES`) is the single declared source of truth for pricing, consumed by both the checkout UI and `server/utils/pricing.ts` for server-side billing verification. Duplicating a price elsewhere risks the UI and server billing amount drifting apart (a security/trust issue for a payment flow).
**Do this instead:** Add/modify prices only in `shared/prices.ts`; both `pages/checkout.vue` and `server/api/pay/order.post.ts` (via `server/utils/pricing.ts`) already read from it.

## Error Handling

**Strategy:** Nitro/H3's `createError({ statusCode, statusMessage })` thrown from handlers, caught by Nuxt's default error boundary (`error.vue`). No custom global error-handling middleware beyond this convention.

**Patterns:**
- Auth/paywall failures use specific status codes the client branches on: `401` (not logged in) vs `402` (payment required) in `server/utils/paywall.ts`; client code inspects the status to redirect to `/login` vs the checkout page.
- Rate-limit violations throw `429` from `server/utils/ratelimit.ts`.
- AI provider errors are caught internally by `server/utils/ai.ts` and retried on the fallback provider before finally propagating the last error upward as an unhandled exception (converted to a 500 by Nitro unless the handler wraps it).

## Cross-Cutting Concerns

**Logging:** `console.warn`/`console.error` at call sites (e.g. AI provider fallback warnings in `server/utils/ai.ts`). No structured logging framework or external log aggregation detected in dependencies.

**Validation:** Manual, per-handler (`String(body?.x || '')`, `Number(...)`, regex checks like date-format validation in `server/api/fortune/today.post.ts`) — no schema validation library (e.g. zod) in `package.json` dependencies. AI structured-output validation instead relies on `sectionSchema()` (`server/utils/fortune-registry.ts`) passed to the LLM call as a JSON-schema constraint on generation.

**Authentication:** Supabase Auth via `@nuxtjs/supabase` module. Client: `useSupabaseUser()` reactive session. Server: `serverSupabaseUser(event)` (RLS-scoped, "am I logged in / who am I") vs `serverSupabaseServiceRole(event)` (admin, bypasses RLS — used deliberately for writes like `purchases`/`saved_readings` inserts that must succeed regardless of RLS policy).

**Internationalization:** `@nuxtjs/i18n` with `prefix_except_default` strategy (`ko` at `/`, others at `/en`, `/ja`, `/zh`). Locale-aware SEO built centrally in `layouts/default.vue` via `useLocaleHead()`. AI-generated content is language-directed per-request via `LANG_DIRECTIVE` constants in `server/utils/fortune-registry.ts`, with a deterministic post-pass (`toTraditional()`, `server/utils/zh.ts`) to guarantee Traditional (not Simplified) Chinese output.

**SEO:** Centralized per-page composable `composables/useSeo.ts`; global defaults in `app.vue`; per-page locale-indexing control via `definePageMeta({ seoLocales: [...] })` consumed in `layouts/default.vue` and `types/page-meta.d.ts`. Sitemap sources are partly dynamic (`server/api/__sitemap__/urls.ts`, `mbti.ts`) for programmatic SEO routes (zodiac-daily, MBTI-pair pages).

---

*Architecture analysis: 2026-08-27*
