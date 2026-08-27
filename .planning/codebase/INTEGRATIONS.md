# External Integrations

**Analysis Date:** 2026-08-27

## APIs & External Services

**AI Content Generation:**
- Anthropic Claude - premium fortune generation (structured JSON + streaming)
  - SDK: `@anthropic-ai/sdk` `^0.102.0`
  - Client wrapper: `server/utils/claude.ts`
  - Model: `runtimeConfig.premiumModel` (default `claude-sonnet-4-6`, env `PREMIUM_MODEL`)
  - Uses `output_config.format: json_schema` for guaranteed-parseable structured output, and `system` prompt caching (`cache_control: ephemeral`) to cut repeat-call cost
  - Auth: `ANTHROPIC_API_KEY`
- DeepSeek - default/primary fortune generation provider (cheaper than Claude)
  - No SDK - raw `fetch` against OpenAI-compatible endpoint `https://api.deepseek.com/chat/completions`
  - Client wrapper: `server/utils/deepseek.ts`
  - Model: `runtimeConfig.deepseekModel` (default `deepseek-chat`, env `DEEPSEEK_MODEL`)
  - Structured output via `response_format: json_object` (no native json_schema support) + prompt-injected key list
  - Supports SSE streaming (manual `data:` line parsing)
  - Auth: `DEEPSEEK_API_KEY`
  - Provider selection/fallback: `server/utils/ai.ts` — `resolveProvider()` picks provider per-request or from `AI_PROVIDER` env (default `deepseek`); `generateStructured`/`streamText` auto-fallback to the other provider if the primary has no key or the call fails (streaming fallback disabled once partial output has been emitted, to avoid duplicate content)

**Payments:**
- Toss Payments v2 - Korean card payments (API individual integration) + PayPal (via Toss widget)
  - SDK: `@tosspayments/tosspayments-sdk` `^2.7.1` (client-side widget)
  - Server confirm call: direct `$fetch` to `https://api.tosspayments.com/v1/payments/confirm` in `server/api/pay/confirm.post.ts`
  - Order creation: `server/api/pay/order.post.ts`
  - Two key pairs selected by currency: KRW/card uses `TOSS_CLIENT_KEY_*`/`TOSS_SECRET_KEY_*` (ck/sk), USD/PayPal uses `TOSS_WIDGET_KEY_*`/`TOSS_WIDGET_SECRET_KEY_*` (gck/gsk)
  - Test vs. live key set selected via `PAYMENT_MODE` env (`test`|`live`) - see `nuxt.config.ts` `payKey()` helper
  - Server never trusts client-submitted amount; always re-confirms using the amount stored in the `purchases` row (`server/api/pay/confirm.post.ts`)
  - Pricing source of truth: `shared/prices.ts` + `server/utils/pricing.ts`

**Admin Notifications:**
- Telegram Bot API - `https://api.telegram.org/bot<token>/sendMessage`
  - Wrapper: `server/utils/notify.ts` (`notifyPaid()`, `notifyCelebRequest()`)
  - Auth: `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (both required; silently no-ops if either is unset — never blocks the payment/request flow on failure)
  - Uses MarkdownV2 with manual character escaping
  - Fired on: successful payment confirm, celebrity registration requests (`server/api/celeb-request.post.ts`)

## Data Storage

**Databases:**
- Supabase (managed PostgreSQL) - sole datastore, no self-hosted DB (per `Oracle_Cloud/SERVER-RUNBOOK.md`: "서버엔 DB 없음")
  - Module: `@nuxtjs/supabase` `^1.5.0`
  - Client access patterns:
    - `serverSupabaseUser(event)` - authenticated user from request (server API routes)
    - `serverSupabaseServiceRole(event)` - privileged admin client bypassing RLS (used for payment writes, PII-holding tables like `customer_inquiries`, quota RPCs)
    - `useSupabaseUser()` - client-side reactive auth state (`middleware/auth.ts`)
  - Connection: `SUPABASE_URL`, `SUPABASE_KEY` (anon), `SUPABASE_SERVICE_ROLE_KEY`
  - Direct `pg` (`^8.21.0`, devDependency) used only in offline `scripts/db/*.mjs` batch/seed/migration scripts, not in the running app
  - Schema: 13 migrations in `supabase/migrations/` covering: core user/auth (`0001`), 만세력/perpetual calendar reference (`0002_calenda_data.sql`), languages (`0003`), celebrities (`0004`), FAQ (`0005`), fortune content pools incl. `lotto`/`today` (`0006`), customer inquiries — PII, RLS-locked with no public policies (`0007`), daily horoscope lucky elements (`0008`), curated reviews (`0009`), lotto revamp/daily variants (`0010`, `0011`), MBTI compatibility content — 544 pre-generated rows (`0012`), celebrity free-tier daily usage quota (`0013`)
  - RLS pattern: public-read reference/content tables; PII and transactional tables (`customer_inquiries`, `purchases`, `celeb_free_usage`) locked with no public policies — accessed only via service-role from server API routes

**File Storage:**
- Not detected as a separate service — no Supabase Storage bucket usage or S3/GCS client found in `server/`. Static assets served from `public/`.

**Caching:**
- None (external). In-process only: `server/utils/ratelimit.ts` uses an in-memory `Map` for rate limiting, explicitly documented as not safe across multiple server instances (single-instance deployment assumption, matches the single-VM Oracle Cloud deploy).

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (via `@nuxtjs/supabase` module)
  - Route protection: `middleware/auth.ts` — `definePageMeta({ middleware: 'auth' })` redirects unauthenticated users to `/login?redirect=...&reason=save`
  - Server-side gating: `server/utils/paywall.ts` (`requirePaidPurchase()`) requires login + a `paid` row in `purchases` matching the service; `server/utils/celebFree.ts` requires login + under daily quota (RPC-based atomic reserve/refund against `celeb_free_usage` table, `supabase/migrations/0013_celeb_free_usage.sql`)
  - Account deletion: `server/api/account/delete.post.ts`

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry/Bugsnag/similar SDK in `package.json`)

**Logs:**
- `console.warn`/`console.error` only, captured via pm2 process output on the production VM (per `Oracle_Cloud/SERVER-RUNBOOK.md`); no structured/centralized logging service

## CI/CD & Deployment

**Hosting:**
- Self-managed Oracle Cloud VM (`64.110.97.120`, Oracle Linux 9), app directory `/home/opc/taounse/`, run via pm2 + `start.sh` wrapping `node .output/server/index.mjs`
- DNS/CDN: Cloudflare (A records for apex + www; MX kept on legacy Cafe24 mail — explicitly not to be touched)
- Legacy secondary host: Cafe24 VPS `1.234.20.119` (bridge server, expires 2026-07-14 per runbook — likely decommissioned by the time this doc is read)

**CI Pipeline:**
- None — no `.github/workflows`, no other CI config in repo. Deployment is manual: local build (`PAYMENT_MODE=live nuxt build`) → rsync `.output/` to server → `pm2 reload`

## Client-Side Tracking / Ads (also "integrations" in the analytics sense)

**Google Analytics 4:**
- `nuxt-gtag` `^3.0.3` module, measurement ID via `NUXT_PUBLIC_GTAG_ID` (falls back to a hardcoded production ID `G-7TR1J714E8` in `nuxt.config.ts`)
- Auto-fires `page_view` on every SPA route change (avoids the manual-snippet first-load-only limitation)

**Meta (Facebook) Pixel:**
- Manually embedded standard snippet, client-only plugin `plugins/meta-pixel.client.ts` (`.client` suffix — never runs during SSR)
- Pixel ID via `NUXT_PUBLIC_META_PIXEL_ID` (fallback hardcoded `2470955410072045`)
- Fires `PageView` on init + on every SPA route change (dedup guard against double-counting first load); standard e-commerce events (ViewContent/InitiateCheckout/Purchase/CompleteRegistration) dispatched via `composables/useMetaPixel.ts`

**Google AdSense:**
- Loaded globally via a `<script>` tag in `nuxt.config.ts` `app.head.script` pointing at `pagead2.googlesyndication.com`, client ID via `NUXT_PUBLIC_ADSENSE_CLIENT` (fallback `ca-pub-4183772800767937`)
- Ads render only on free-result pages (never on paid content), via an `<AdUnit>` component

## Environment Configuration

**Required env vars (names only — see STACK.md for full list):**
- Supabase: `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- AI: `AI_PROVIDER`, `ANTHROPIC_API_KEY`, `PREMIUM_MODEL`, `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`
- Payments: `PAYMENT_MODE`, `TOSS_CLIENT_KEY_TEST/LIVE`, `TOSS_WIDGET_KEY_TEST/LIVE`, `TOSS_SECRET_KEY_TEST/LIVE`, `TOSS_WIDGET_SECRET_KEY_TEST/LIVE`
- Notifications: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- Tracking: `NUXT_PUBLIC_GTAG_ID`, `NUXT_PUBLIC_META_PIXEL_ID`, `NUXT_PUBLIC_ADSENSE_CLIENT`
- Site: `NUXT_PUBLIC_SITE_URL`

**Secrets location:**
- Local dev: `.env` at repo root (gitignored; `.env.example` documents names only, no values)
- Production: `.env` on the Oracle VM at `/home/opc/taounse/.env`, loaded by `start.sh` via `source` before launching the node process — explicitly never overwritten by deploys (only `.output/` is synced)

## Webhooks & Callbacks

**Incoming:**
- None detected as true async webhooks. Toss Payments uses a client-redirect flow (`successUrl`) rather than a server webhook — the client is redirected back to the app after payment, which then calls `server/api/pay/confirm.post.ts` to synchronously confirm with Toss's API (query params like `amount` are treated as untrusted; server re-derives amount from the DB `purchases` row)

**Outgoing:**
- `server/utils/notify.ts` → Telegram Bot API `sendMessage` calls (payment confirmation, celebrity request submissions) — fire-and-forget, errors swallowed and logged only

---

*Integration audit: 2026-08-27*
