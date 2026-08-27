# Testing Patterns

**Analysis Date:** 2026-08-27

## No Automated Test Framework

**This is a confirmed, deliberate gap — not an artifact of incomplete exploration.**

- `package.json` has no `test` script and no test-runner dependency (no `vitest`, `jest`, `@nuxt/test-utils`, `playwright`, `cypress`, etc. in `dependencies` or `devDependencies`).
- No `*.test.*` / `*.spec.*` files exist anywhere in the repo (excluding `node_modules`).
- No `vitest.config.*`, `jest.config.*`, or `playwright.config.*` files exist.
- The project's own `CLAUDE.md` states this explicitly (§7 "테스트"): *"테스트 프레임워크 없음 (vitest/playwright 미설치, `test` 스크립트 없음). 따라서 현재 자동 검증은 §2의 빌드 게이트가 전부다."* ("No test framework. The build gate is the entirety of automated verification.")

**Implication for anyone adding code:** there is no unit/integration/e2e suite to run or extend. Do not assume one exists, and do not silently add a test framework as a side effect of an unrelated task — if automated testing is ever introduced, it should be a deliberate, scoped decision (tooling choice, CI wiring, coverage baseline), not a byproduct.

## The Actual Verification Gate: `npm run build`

```json
"scripts": {
  "i18n:check": "node scripts/i18n/check-leaks.mjs",
  "prebuild": "node scripts/i18n/check-leaks.mjs",
  "build": "nuxt build"
}
```
(`package.json:6-9`)

`npm run build` is the single real gate before committing. npm automatically runs `prebuild` before `build`, and `prebuild` runs `i18n:check` — so `npm run build` alone already runs the i18n leak check plus the Nuxt/Vite/TypeScript compile. Running `npm run i18n:check && npm run build` manually duplicates the check; it is not wrong, just redundant.

**What `npm run build` catches:**
1. TypeScript/Vue template compile errors (via Nuxt's build pipeline — there is no separate `tsc --noEmit` or `vue-tsc` script; type errors surface only if they fail the Nuxt/Vite build itself, so some type issues that don't break the build can slip through).
2. The two i18n leak classes described below.

**What it does NOT catch:** runtime/business-logic correctness, API behavior, database state, visual regressions. There is no substitute for manual verification via `npm run dev` + browser for anything with UI or request/response impact — `CLAUDE.md` explicitly instructs against concluding "it works" from code inspection alone for screen-affecting changes.

## Gate 1: i18n Leak Check (`scripts/i18n/check-leaks.mjs`)

Run via `node scripts/i18n/check-leaks.mjs` or `npm run i18n:check`; chained automatically before every `npm run build`. Exits `1` (fails the build) on any leak.

**Detects two recurring bug classes:**

1. **zh Simplified-Chinese leakage** — `i18n/locales/zh.json` must be Traditional Chinese (zh-TW) only. The script runs every string value through an OpenCC `cn→tw` converter (`Converter({ from: 'cn', to: 'tw' })`) and flags any character that differs from its converted form, except a small allowlist of characters that are legitimately Traditional but that OpenCC over-corrects (`ALLOW_TRAD = new Set(['祕','台','了','占','凶','干'])`, `scripts/i18n/check-leaks.mjs:27`). If a new character triggers a false positive, add it to this allowlist rather than working around the check elsewhere.

2. **Korean text leakage in shared code** — scans `components/`, `composables/`, `pages/`, `layouts/` (`.vue`/`.ts`/`.js`) for any line containing Hangul (`/[가-힣ㄱ-ㅎㅏ-ㅣ]/`) after stripping comments. All user-facing strings in these directories must go through `t('...')`; hardcoded Korean fails the build. **The `ko` locale JSON files themselves are explicitly exempt** — the script only detects Korean *outside* the `ko` locale source, never modifies anything (detection-only).

**Recognized false-positive patterns** (`SKIP_LINE`, `scripts/i18n/check-leaks.mjs:71-79`) — lines matching these are not flagged even though they contain Hangul:
- Locale-keyed object literals: `{ ko: '쥐', en: 'Rat' }`
- Locale branch guards: `locale.value === 'ko'`, `isKo`, `locale === 'ko'`
- Diagnostic logging: `console.log/warn/error/info/debug(...)`
- Regex character classes containing Hangul (matching patterns, not rendered output)
- `.replace('한글검색어', ...)` calls (replacement target, not output)
- Brand/language self-references: `타오운세`, `한국어`

**Manual override:** a line containing the literal token `i18n-ok` anywhere is skipped (treated as reviewed-safe). Use only after confirming the Korean text truly cannot reach non-`ko` rendered output.

**Extending the gate:** when a new legitimate Hangul-in-code pattern emerges that isn't covered by `SKIP_LINE`, add a new pattern to that array (with a comment explaining why) rather than scattering `i18n-ok` annotations across the codebase.

## Gate 2 (Runtime, code-embedded): Language-Leak Guard in AI Generation

Not a build-time script, but a structurally identical pattern applied at request time in `server/api/fortune/premium-stream.post.ts:14-19,241-271`: for any non-`ko` generated result, if the response contains 8+ Hangul characters (`HANGUL = /[가-힣]/g`, threshold chosen to avoid false positives on shared Ganzhi/Sajusymbols), the system automatically re-generates once using a language-stricter model (`claude` instead of the default provider) before falling back to serving/saving the leaking result. This is the runtime analogue of Gate 1's Korean-leak check — same bug class (AI drifting into Korean for non-Korean output), guarded at generation time instead of at build time. When adding new AI-generation endpoints for non-`ko` output, replicate this self-healing retry pattern rather than only relying on the static `i18n:check`.

## Manual/Ad-hoc Verification Scripts (`scripts/db/`)

These are **not wired into `npm run build`, `prebuild`, or any CI** — they are run manually by a human/session as needed, typically before or after a data-seeding or migration operation. They fall into three groups:

**Content validators (exit 1 on failure, safe to treat as gates for their specific task):**
- `scripts/db/validate-today.mjs` — validates a generated batch (`scripts/db/_gen/today-generated.json`) before DB apply: checks all 120 rows × 7 columns × 4 languages are non-empty, that each language's text contains that language's script (Hangul for `ko`, Kana for `ja`, Latin for `en`), that `zh` content is Traditional (both an explicit simplified-character blacklist and an OpenCC round-trip check), and reports length/tone-distribution warnings. Run before `scripts/db/apply-today.mjs`.
- `scripts/db/verify-today-render.mjs` — a live-endpoint smoke test: POSTs to `/api/fortune/today` for 3 sample birthdates × 4 languages against a running server (local by default, or a URL passed as `argv[2]`, e.g. `node scripts/db/verify-today-render.mjs https://taoist.co.kr`) and asserts the returned text contains the expected script for that language. This is the closest thing in the repo to an integration/smoke test, but it is manual and targets one specific endpoint (`today`).

**Schema/DB introspection (read-only, no pass/fail assertion — informational):**
- `scripts/db/verify.mjs` — connects directly to Postgres (reads `SUPABASE_DATABASE_URL` from `.env` at run time) and prints RLS status, policy counts, and `auth.users` triggers for all `public` tables. Used to eyeball that RLS/migrations applied correctly after a schema change.
- `scripts/db/query.mjs` — runs an arbitrary ad-hoc read-only SQL query passed as a CLI arg and prints rows.
- `scripts/db/legacy-inventory.mjs` — lists tables/row counts/column counts from the legacy (pre-migration) database for reference during data migration work.

**Seed/generation scripts (not verification, but commonly paired with a validator above):**
- `scripts/db/seed-mbti.mjs`, `scripts/db/seed-horoscope.mjs`, `scripts/db/seed-horoscope-rich.mjs`, `scripts/db/gen-today.mjs`, `scripts/db/apply-today.mjs`, `scripts/db/merge-today.mjs` — generate or apply batches of AI-written or seeded content. **Per project rules (`CLAUDE.md` §1), scripts that call paid LLM APIs must never be run automatically** — any such generation is done interactively within a session, not via unattended script execution.

**None of these `scripts/db/*` scripts are run by `npm run build`.** Treat them as manual runbooks for specific data operations, not as part of the standard commit/build verification flow.

## Mocking

Not applicable — there is no test framework, so there are no mock/stub/spy conventions to document. Server code does use defensive `try { } catch { }` around external calls that should degrade gracefully at runtime (e.g. `try { user = await serverSupabaseUser(event) } catch { user = null }`, `server/utils/paywall.ts:23`) — this is a runtime resilience pattern, not a test double.

## Coverage

No coverage tooling configured. No coverage targets exist or are enforced.

## Recommendation Baseline for Future Work

If a phase's scope is "add automated testing," start from zero: there is no existing suite, config, or convention to extend. Any future test framework choice (Vitest is the natural fit for a Nuxt 3 project) should be introduced as its own scoped setup step — installing the dependency, adding a config, wiring a `test` script, and deciding whether/how it gates `prebuild`/`build` or CI — rather than assumed to already exist.

---

*Testing analysis: 2026-08-27*
