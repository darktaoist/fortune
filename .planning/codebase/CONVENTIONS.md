# Coding Conventions

**Analysis Date:** 2026-08-27

## Naming Patterns

**Files:**
- Vue components: `PascalCase.vue` — e.g. `components/FortuneCard.vue`, `components/FortuneLanding.vue`, `components/AuraLangSwitch.vue`
- Pages: `kebab-case.vue` (Nuxt file-based routing) — e.g. `pages/celeb-select.vue`, `pages/reset-password.vue`, `pages/fortune/newyear.vue`
- Composables: `useXxx.ts` camelCase, one export per file matching filename — `composables/useSeo.ts` → `usePageSeo()`, `composables/useSajuInput.ts`, `composables/usePersonLabel.ts`
- Server API routes: Nuxt/Nitro convention `<name>.<method>.ts` — e.g. `server/api/fortune/premium-stream.post.ts`, `server/api/celebs.get.ts`, `server/api/pay/confirm.post.ts`. Non-REST utility endpoints omit the method suffix (`server/api/__sitemap__/urls.ts`). Private/experimental endpoints are prefixed `_` (`server/api/fortune/_ssetest.get.ts`).
- Server utils: `camelCase.ts` or lowercase single-word — `server/utils/celebFree.ts`, `server/utils/paywall.ts`, `server/utils/zh.ts`, `server/utils/ai.ts`
- Scripts: `kebab-case.mjs` grouped by domain directory — `scripts/db/validate-today.mjs`, `scripts/i18n/check-leaks.mjs`, `scripts/seo/render-og.mjs`
- Shared cross-boundary modules (used by both client and server): `shared/prices.ts`, `shared/premiumService.ts`, `shared/dailySeo.ts`

**Functions:**
- camelCase, verb-first: `resolveProvider`, `requirePaidPurchase`, `reserveCelebQuota`, `toPurchaseKey`, `toTraditional`
- Boolean predicates prefixed `is`/`has`: `isFreeService`, (client-side) `isKo`
- Composables always prefixed `use`: `usePageSeo`, `useSajuInput`

**Variables:**
- camelCase throughout. Constants that are effectively enums/config use `UPPER_SNAKE_CASE`: `CELEB_FREE_DAILY_LIMIT`, `FREE_SERVICES`, `SERVICE_PRICES`, `HANGUL`, `ALLOW_TRAD`, `SIMPLIFIED_BLACKLIST`

**Types:**
- PascalCase interfaces/types, declared with `export interface` or `export type` near their usage — `PriceInfo` (`server/utils/pricing.ts`), `PaidGate` (`server/utils/paywall.ts`), `MyeongsikInput` (`server/utils/myeongsik.ts`)
- `any` is used pragmatically at Supabase client boundaries (`admin: any`) and in a handful of server utils (`server/utils/deepseek.ts`, `server/utils/partner.ts`, `server/utils/paywall.ts`, `server/utils/ai.ts`, `server/utils/myeongsik.ts`, `server/utils/celebFree.ts`, `server/utils/notify.ts`, `server/utils/claude.ts`, `server/api/celebs.get.ts`, `server/api/pay/confirm.post.ts`) — this is accepted practice here, not flagged as debt, because the Supabase JS client's generic typing is unwieldy for this project's scale. Prefer typed interfaces for domain data (prices, purchases, myeongsik) even where the surrounding Supabase call uses `any`.

## Code Style

**Formatting:**
- No Prettier or ESLint config present in the repo (no `.eslintrc*`, `eslint.config.*`, `.prettierrc*`, `biome.json`). No `lint` or `format` script in `package.json`. Style consistency is maintained by convention/habit, not tooling.
- No semicolons (verified: zero trailing `;` across `server/utils/*.ts`).
- Single quotes for strings.
- 2-space indentation.
- Dense/compact statement style is common in server logic — multiple short statements chained with `;` on one line where it aids scanability, e.g. `if (!hasNext && !final) continue`, `emitted.add(key); bodies[key] = text` (`server/api/fortune/premium-stream.post.ts:184`). Do not "fix" this into more verbose multi-line form; it is the house style for tight control-flow blocks.
- No `tsconfig.json` committed at the project root — Nuxt generates one into `.nuxt/tsconfig.json` at dev/build time. Do not hand-edit or add a root `tsconfig.json`; extend via `nuxt.config.ts` (`typescript` key) if stricter settings are ever needed.

**Linting:**
- None configured. Treat `npm run build` (which chains `prebuild` → `i18n:check`) as the sole automated correctness gate — see TESTING.md.

## Import Organization

**Order:**
- No enforced import-sorting tool. Observed convention: external/module imports first, then relative/local imports, e.g. (`server/api/fortune/premium-stream.post.ts:1-10`):
  ```ts
  import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
  import { buildMyeongsik, type MyeongsikInput } from '../../utils/myeongsik'
  import { FORTUNE_TYPES } from '../../utils/fortune-registry'
  import { streamText, resolveProvider } from '../../utils/ai'
  import { toPurchaseKey } from '~/shared/premiumService'
  ```

**Path Aliases:**
- `~/` alias (Nuxt default, resolves to project root) is used specifically to cross the `server/` ↔ project-root boundary, e.g. importing `shared/*` modules from inside `server/utils/*.ts`: `import { SERVICE_PRICES } from '~/shared/prices'` (`server/utils/pricing.ts:5`).
- Within `server/`, sibling/parent modules are imported with plain relative paths (`../../utils/zh`, `../../utils/paywall`), not `~/server/...`. Follow this split: relative paths inside `server/`, `~/` only when reaching into `shared/` (or other root-level dirs) from server code.
- Vue SFCs and composables use Nuxt auto-imports (`useI18n`, `useLocalePath`, `useSeoMeta`, `computed`, `defineProps`) — no explicit import statements needed for these; do not add manual imports for auto-imported Nuxt/Vue APIs.

## Error Handling

**Server API (Nitro) pattern:**
- All request-level failures use H3's `createError({ statusCode, statusMessage })` and `throw` — never return an error shape in the response body:
  ```ts
  if (!type) throw createError({ statusCode: 400, statusMessage: 'unknown service' })
  if (!user) throw createError({ statusCode: 401, statusMessage: 'login required' })
  ```
  (`server/api/fortune/premium-stream.post.ts:35,65`, `server/utils/paywall.ts:24,35`)
- **Status code semantics used consistently across the codebase:** `400` invalid input, `401` not logged in, `402` payment required, `403` ownership/ownership-forgery mismatch, `404` not found, `422` unprocessable domain state (e.g. no myeongsik computable for given birth data), `429` rate-limited, `500` unexpected/DB error, `501` feature not yet ready.
- **Message language convention:** `statusMessage` is English short-code style for internal/programmatic errors intended for client-side branching (`'login required'`, `'payment required'`, `'invalid service'`). It is Korean when the message may be surfaced directly to an end user or describes a domain-specific failure (`'해당 생년월일의 명식을 찾을 수 없습니다.'`, `'상대방 정보를 찾을 수 없습니다.'`, `server/api/fortune/premium-stream.post.ts:135,146`). Follow this split — do not translate one style into the other.
- SSE/streaming endpoints do not throw past the point the stream has started; instead they `send({ type: 'error', message })` and close gracefully (`server/api/fortune/premium-stream.post.ts:233,298`). A stream is always closed in a `finally` block (`es.close()`), and any reserved quota is refunded in the same `finally` if the save did not succeed (`server/api/fortune/premium-stream.post.ts:299-303`).
- External calls whose failure should not break the caller (auth lookups, notification sends, quota refunds) are wrapped in local `try { } catch { }` with the catch body deliberately empty or a `console.warn`/`console.error`, e.g. `try { freeUser = await serverSupabaseUser(event) } catch { freeUser = null }` (`server/api/fortune/premium-stream.post.ts:64`), `catch { /* noop */ }` (`server/utils/celebFree.ts:46`). This "safe failure" pattern is intentional for non-critical paths — do not add rethrows there.
- **Fail-closed on cost-bearing paths:** quota/rate checks default to blocking on any read error rather than allowing free calls through — `remainingCelebQuota` returns `0` (exhausted) on RPC error, `reserveCelebQuota` returns `-1` (blocked) on RPC error (`server/utils/celebFree.ts:26,36`). When adding new cost-incurring gates (AI calls, paid actions), mirror this fail-closed default.
- Logging on caught errors uses structured `console.error`/`console.warn` with a bracketed source tag prefix: `console.error('[premium-stream] 생성 실패: status=', e?.statusCode, ...)` (`server/api/fortune/premium-stream.post.ts:297`). Use the `[moduleName]` prefix convention for any new server-side error logs.

## Comments

**When to Comment:**
- Comments are written primarily in Korean and are used heavily to explain *why*, not *what* — business rules, edge cases, prior bugs being guarded against, and non-obvious invariants. E.g. `server/utils/celebFree.ts:12-13` explains the daily quota is a merged celeb+mbti limit set by "운영자 확정" (operator decision) with a specific cost ceiling.
- File/function-level doc comments use a `/** ... */` block immediately above the export, describing purpose, gating rules, and caveats in prose — not formal `@param`/`@returns` JSDoc tags. See `server/utils/paywall.ts:5-10`, `server/utils/ratelimit.ts:3-7`, `composables/useSeo.ts:1-14`.
- Inline comments explain the *reason* for a defensive check right where it happens, e.g. `// 저장본이 zh인데 간체로 저장된 과거 행은 리플레이 시 번체로 보정(자가치유)` (`server/api/fortune/premium-stream.post.ts:105`).
- `i18n-ok` is a recognized magic comment token that suppresses the Korean-leak linter (`scripts/i18n/check-leaks.mjs:98`) for a specific line that has been manually reviewed as safe (e.g. a `ko`-only fallback). Use it sparingly and only after confirming the line truly cannot leak Korean into non-`ko` output.
- The `check-leaks.mjs` script's `SKIP_LINE` patterns (`scripts/i18n/check-leaks.mjs:71-79`) document exactly which Korean-containing code patterns are considered safe (locale-keyed objects, `locale.value === 'ko'` guards, `console.*` diagnostics, regex character classes, brand self-references). Any new pattern that legitimately contains Korean but isn't user-facing should be added there rather than sprinkling `i18n-ok` everywhere.

**JSDoc/TSDoc:**
- Not used in the formal `@param`/`@returns` sense. Prose block comments above exports are the norm (see above).

## Function Design

**Size:** No enforced limit. Server API handlers for streaming/complex flows (e.g. `server/api/fortune/premium-stream.post.ts`) are large (300+ lines) and organized internally with `// ── section ──` banner comments delimiting phases (gate → replay → generate → save). Follow this banner-comment sectioning for any similarly complex handler rather than splitting into many tiny files.

**Parameters:** Small utility functions take positional params (`reserveCelebQuota(admin, ownerId, date)`); functions with more than ~3 conceptual inputs, or where call-site readability matters, take a single options object (`rateLimit(event, { key, limit, windowMs })`, `usePageSeo(key, { suffix })`).

**Return Values:** Functions that can fail softly return sentinel values documented in the surrounding comment rather than throwing — e.g. `reserveCelebQuota` returns a `Promise<number>` where `-1` means blocked (`server/utils/celebFree.ts:32-38`). Functions used as request gates throw `createError` instead (see Error Handling above). Choose sentinel-return for internal helpers and throw-based for request-boundary gates.

## Module Design

**Exports:** Named exports throughout (`export function`, `export const`, `export interface`) — no default exports for utility modules. Vue SFCs use `<script setup>` with no explicit export (Nuxt/Vue convention).

**Barrel Files:** Not used. No `index.ts` re-export aggregators found under `server/utils/`, `composables/`, or `shared/`. Import directly from the specific file.

**Single source of truth pattern:** Cross-cutting values (pricing, purchase-key mapping, daily quota limits) are defined once in a `shared/` or `server/utils/` module and imported everywhere they're needed, rather than duplicated — e.g. `shared/prices.ts` (`SERVICE_PRICES`) is the only place a price is defined; `server/utils/pricing.ts` re-exports it for server billing, and UI components read the same source for display. When adding a new price, quota, or gating constant, add it to the existing single-source module — do not hardcode a duplicate value in a component or page.

## Vue Component Conventions

- `<script setup>` without `lang="ts"` is the norm for components (props are declared with runtime `defineProps({...})` objects with `type`/`required`/`default`, not TS generics) — see `components/FortuneCard.vue:1-14`. Only a minority of components use `lang="ts"`; match the surrounding file's existing style rather than converting.
- All user-facing strings go through `t('key')` from `useI18n()` — this is enforced by the `i18n:check` build gate (see TESTING.md). Never hardcode Korean (or any language) text in a shared component, composable, page, or layout.
- Internal routing uses `localePath()` (from `useLocalePath()`) to wrap route targets so locale prefixes are applied correctly — `const resolvedTo = computed(() => localePath(props.to))` (`components/FortuneCard.vue:12-13`).
- `<style scoped>` is standard per-component; shared visual tokens come from CSS custom properties defined in `assets/css/design-system.css` (e.g. `var(--gold-primary)`, `var(--space-6)`, `var(--radius-lg)`) — never hardcode raw color/spacing values in component styles, and never modify the two brand-locked tokens `--bg-primary` / `--gold-primary` (see project `CLAUDE.md`).

---

*Convention analysis: 2026-08-27*
