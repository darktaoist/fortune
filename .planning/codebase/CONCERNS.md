# Codebase Concerns

**Analysis Date:** 2026-08-27

**Calibration note:** This is a solo-operator indie site (taoist.co.kr), not an enterprise product. Findings below are scoped to what could actually cost this operator money, break a paying user's flow, or waste their own future debugging time — not generic best-practice gaps. Constraints already documented in root `CLAUDE.md` (no test framework, manual rsync+pm2 deploy, design token lock, i18n leak gate, the historical `gen-today.mjs` $22 overrun) are treated as known baseline, not re-reported here except where a *new, specific* angle on them was found (see Tech Debt #3).

## Tech Debt

**1. Live diagnostic endpoint makes real, unauthenticated AI API calls:**
- File: `server/api/fortune/_ssetest.get.ts`
- Issue: Comment self-describes it as "임시 진단용...게이트 없이" (temporary diagnostic, no gate). Every `GET /api/fortune/_ssetest` triggers a real DeepSeek streaming completion (`max_tokens: 24000`, full "신년운세" generation) with no auth check, no `rateLimit()` call, and no request-body validation — it's a fixed hardcoded prompt, but it still spends real API budget on every hit.
- Impact: Any bot/scraper/curl loop hitting this path repeatedly burns DeepSeek spend with zero ceiling. Low per-call cost (DeepSeek, not Claude) but genuinely unbounded — the exact failure shape the operator already got burned by once (see CLAUDE.md §1 `gen-today.mjs` incident), just via a different door.
- Fix approach: Delete the file (it appears to be leftover from SSE debugging), or at minimum gate it behind `rateLimit()` + require `NODE_ENV !== 'production'` / an admin check before the next deploy.

**2. Orphaned server endpoint still live and reachable:**
- File: `server/api/fortune/premium.post.ts` (80 lines, imports `generateStructured`, gated by `requirePaidPurchase`)
- Issue: No frontend code calls `/api/fortune/premium` anymore. `pages/result/premium.vue` actually calls `/api/fortune/premium-stream` (confirmed via grep — only match for `/api/fortune/premium-stream` is in that page; `/api/fortune/premium` has zero callers anywhere in `pages/`, `components/`, `composables/`). The comment at `pages/result/premium.vue:6` is stale, still describing the old non-stream endpoint.
- Impact: Unlike `premium-stream.post.ts`, this endpoint has **no rate limit and no saved-reading replay/dedupe** — it just checks `requirePaidPurchase` (does the user have *any* paid purchase for this service) and then unconditionally calls the AI on every hit. A user with a single $9.99/$19.99 purchase could script repeated `POST /api/fortune/premium` calls and trigger unlimited paid-tier AI generations per purchase. Since it's dead code from the frontend's perspective, it's unlikely to be discovered accidentally, but it's a live, unguarded cost surface reachable by anyone who reads the API from network tab or source.
- Fix approach: Delete `server/api/fortune/premium.post.ts` if `premium-stream.post.ts` fully superseded it (looks that way), and fix the stale comment in `pages/result/premium.vue:6`.

**3. The exact script that caused the past $22 overrun is still present and unguarded:**
- File: `scripts/db/gen-today.mjs`
- Issue: CLAUDE.md §1 documents the incident as a known constraint ("과거 `gen-today.mjs`로 $22 과금 사고 발생") and bans future paid-API scripts. This is not a new discovery — but the *file itself* is still sitting in the repo, fully functional: it reads `ANTHROPIC_API_KEY` straight out of `.env`, defaults to regenerating all 120 `today` rows (`node scripts/db/gen-today.mjs` with no args = full run) at concurrency 6, with no dry-run default and no interactive confirmation.
- Impact: A future Claude session (or the operator, in a hurry) could re-run it without arguments and re-trigger the exact same cost pattern. The rule in CLAUDE.md prevents *new* scripts like this from being written, but doesn't neutralize this specific loaded one.
- Fix approach: Either delete it now that the one-time 480-row regen is done (per `MEMORY.md`, that migration is already complete and shipped), or add a hard `--i-know-this-costs-money` flag requirement / rename it into a `_dangerous/` subfolder so it can't be run by accident.

**4. Static FX approximations can silently go stale:**
- File: `shared/prices.ts` (`jpyApprox`, `twdApprox` fields on `SERVICE_PRICES`)
- Issue: `(約¥2,900)` / `(約NT$620)` etc. are hardcoded strings, not computed from a live or periodically-refreshed exchange rate. Comment acknowledges these are "참고 환산 표기" (reference only, actual billing is USD), so there's no billing-correctness risk — but the displayed approximation will drift from real FX rates over time with nothing to prompt a review.
- Impact: Low — cosmetic accuracy only, doesn't affect what's actually charged. Worth a periodic manual glance (e.g., alongside any future price change to `SERVICE_PRICES`).
- Fix approach: No urgency; if touching `shared/prices.ts` for a price change, sanity-check the FX strings against current rates at the same time.

## Known Bugs

No reproducible bugs identified from static inspection. TODO/FIXME/HACK/XXX markers: none found anywhere in `server/`, `pages/`, `components/`, `composables/`, `scripts/`, `shared/`, `middleware/`, `plugins/`, `utils/`, `types/`, `layouts/` — the codebase doesn't use inline markers to flag unfinished work, so absence of hits doesn't mean absence of gaps, just that this signal isn't used here.

## Security Considerations

**Payment flow — reviewed, looks sound:**
- Files: `server/api/pay/order.post.ts`, `server/api/pay/confirm.post.ts`, `server/utils/pricing.ts`
- Client-submitted amounts are never trusted — server always re-derives price from `shared/prices.ts` via `getPrice()`/`billingFor()`. `confirm.post.ts` re-confirms with Toss using the DB-stored amount, not any client-supplied value. Idempotency via `order_no` + `status === 'paid'` early-return. Ownership checked (`order.owner_id !== user.id` → 403). Stale pending-order cleanup with compensating delete of orphaned `saved_readings` snapshots on purchase-insert failure. No changes recommended here — flagged as reviewed-and-sound so future sessions don't need to re-audit it from scratch.

**Row Level Security — enabled correctly:**
- File: `supabase/migrations/0001_init.sql` (lines ~188-237) and `0013_celeb_free_usage.sql`
- All user-data tables (`profiles`, `people`, `saved_readings`, `purchases`, `payments`, `reviews`, `inquiries`, `celeb_free_usage`) have `enable row level security` plus scoped `auth.uid() = owner_id`-style policies (or, for `celeb_free_usage`, RLS-enabled-with-no-policy, which defaults to deny-all for non-service-role clients — correct for a table meant to be touched only via `SECURITY DEFINER` RPCs and the service-role admin client). No gap found.

**Endpoints without rate limiting — mostly fine, two exceptions already listed above:**
- `server/api/fortune/{date,lifeall,lotto,month,today,tojung}.post.ts` have no `rateLimit()` call, but none of them import the AI layer (`generateStructured`/`streamText`) — they're deterministic DB lookups (`fortuneNumber()` hash → `today` table select, etc.). Missing rate limiting here is a DB-load concern at worst, not a cost concern. No action needed.
- The two endpoints that *do* call the AI without rate limiting are `_ssetest.get.ts` and `premium.post.ts`, both covered under Tech Debt above.

**In-memory rate limiter is single-instance and resets on deploy:**
- File: `server/utils/ratelimit.ts`
- Already self-documented in the file's own comment ("분산/서버리스 다중 인스턴스에서는 완벽하지 않으므로..."). Confirmed appropriate for current pm2 single-instance deploy. Only becomes a real gap if the operator ever moves to pm2 cluster mode or multiple server instances — noting under Scaling Limits below, not re-flagging as a present-day issue.

**No secrets found leaked in tracked files:**
- `.gitignore` correctly excludes `.env`, `.env.*`, `Oracle_Cloud/*.key`, `scripts/db/_backup/`. Verified `git ls-files` has zero `.key`/`.pem`/`id_rsa` matches. `.mcp.json` only contains a public Supabase project ref (not a secret). `.env.example` lists variable names only, no values. Env values were not read (per task constraint) — noting only that the *handling* (gitignore coverage, key-name references) looks sound.

## Performance Bottlenecks

**AI provider auto-fallback has no cost ceiling:**
- File: `server/utils/ai.ts` (`providerChain`, `generateStructured`, `streamText`)
- Design: default provider is `deepseek` (cheap); on failure, automatically retries via `claude` (materially more expensive per token) if a Claude key is configured — intentional reliability tradeoff, well-guarded against duplicate output (won't fall back mid-stream after partial tokens emitted).
- Concern: there's no request-volume or spend cap on the fallback path itself. If DeepSeek has an extended outage during a traffic spike, every request in that window silently upgrades to Claude pricing with no circuit breaker or alerting. For current traffic this is unlikely to matter, but worth knowing if DeepSeek reliability degrades.

**Language-leak regeneration can repeat on every page revisit for a "stuck" order:**
- File: `server/api/fortune/premium-stream.post.ts` (lines ~237-293)
- Design: if non-Korean output leaks Korean text (`hangulLeak`), the code force-regenerates once via Claude. If regeneration *still* leaks, the result is deliberately **not saved** to `saved_readings` — this is intentional (documented: "저장하지 않아 리플레이 영구 고착을 막는다") to avoid permanently serving broken output.
- Concern: the flip side of that safety choice is that if a specific prompt/subject combination reliably triggers persistent leaks (e.g., a name or birth-data edge case the model can't stay in-language for), the *paid* user revisiting that result page regenerates the full AI call every single time, with cost on both the DeepSeek attempt and the Claude leak-fix attempt, indefinitely. No monitoring/alerting exists to surface a stuck order like this to the operator.
- Fix approach: not urgent without evidence it's actually happening; if it becomes visible in AI spend, add a max-retry-then-flag-for-manual-review path instead of silent infinite regeneration.

## Fragile Areas

**Large "kitchen sink" single-file page components:**
- Files (by line count): `pages/index.vue` (1507), `pages/aura/index.vue` (1189), `pages/result/free.vue` (868), `pages/saju.vue` (823), `pages/result/premium.vue` (767), `pages/login.vue` (725), `pages/checkout.vue` (598), `pages/mypage.vue` (463), `pages/celeb-select.vue` (699)
- Why fragile: each mixes markup, business logic, and (implicitly, via scoped styles) presentation in one file, with no component decomposition. Combined with **no test framework** (per CLAUDE.md — genuinely no automated safety net, not just "low coverage"), any edit to these files is verified only by manual `npm run dev` + browser check.
- Safe modification: for these specific files, always do the CLAUDE.md-mandated manual dev-server check — code inspection alone is not sufficient given their size and the total absence of automated tests. Treat `pages/index.vue` and `pages/aura/index.vue` as the two highest-risk files to touch blind, since they're both the largest and the most SEO/conversion-critical (homepage, standalone product landing).
- Test coverage gap: none of these files have any test coverage (none exist anywhere in the repo). If test infrastructure is ever introduced, these + the payment flow (`server/api/pay/*.ts`) and quota logic (`server/utils/celebFree.ts`) are the highest-value places to start, since they're both large/complex and directly tied to revenue.

**Custom video-encoding pipeline (shortform share feature):**
- Files: `utils/shortform/renderer.ts` (462 lines), `utils/shortform/encode.ts` (214 lines, uses `mp4-muxer`)
- Why fragile: hand-rolled canvas-to-MP4 encoding logic with no test coverage, browser API-dependent (WebCodecs/canvas), and no fallback path visible from a quick read. Isolated blast radius (only affects the shortform-share feature, not core fortune generation or payment), so lower priority than payment/quota code, but worth knowing before touching it blind.

## Scaling Limits

**In-memory rate limiter (`server/utils/ratelimit.ts`) and quota checks are correctly scoped to current single-pm2-instance deploy.** If the operator ever moves to pm2 cluster mode (multiple Node processes sharing one port) or multi-server deployment, the `Map`-based bucket in `ratelimit.ts` would no longer coordinate across instances, silently loosening the effective rate limit (each instance gets its own independent counter). The Supabase-RPC-based `celebFree.ts` quota (atomic increment via RPC) does **not** have this problem — it's already correctly centralized in the DB, so only the plain rate limiter (not the paid-quota system) would need revisiting if scaling out.

## Dependencies at Risk

No dependency currently looks abandoned or critically vulnerable from a version-name read (`@anthropic-ai/sdk`, `@nuxtjs/supabase`, `@tosspayments/tosspayments-sdk`, `nuxt-gtag`, `opencc-js` are all actively maintained ecosystem packages). Not deeply audited for CVEs (no `npm audit` run as part of this pass) — a periodic `npm audit` before major releases would be a reasonable low-effort habit rather than a current fire.

## Missing Critical Features

None identified as blocking within this pass's scope — this document covers technical debt/concerns, not feature gaps. `server/api/fortune/premium.post.ts` being dead/orphaned (Tech Debt #2) is closer to "stale code" than "missing feature."

## Test Coverage Gaps

**Highest-risk untested surfaces, ranked by blast radius if broken:**

1. **Payment flow** — `server/api/pay/order.post.ts`, `server/api/pay/confirm.post.ts`, `server/utils/pricing.ts`. Zero automated coverage of amount-trust logic, idempotency, or ownership checks. Currently correct by code inspection (see Security Considerations), but any future edit here is unverified except by manual `PAYMENT_MODE=test` clickthrough.
2. **Free-quota reservation/refund** — `server/utils/celebFree.ts` + the Supabase RPCs it calls (`consume_celeb_quota`, `refund_celeb_quota`, `celeb_quota_remaining` — defined in `supabase/migrations/0013_celeb_free_usage.sql`, not re-inspected at SQL level in this pass). This is the only thing preventing unlimited free-tier AI cost exposure on the celeb/MBTI compatibility features; worth a manual quota-exhaustion test pass (hit the limit, confirm refund-on-failure works) after any change near it.
3. **i18n leak gate itself** — `scripts/i18n/check-leaks.mjs` is the sole automated gate in the whole project (per CLAUDE.md); it has no test of its own detection logic beyond "does the current codebase pass." A bug in the gate script would fail silently (false negative = leak ships; false positive = blocks all commits until fixed).

---

*Concerns audit: 2026-08-27*
