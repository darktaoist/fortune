# Technology Stack

**Analysis Date:** 2026-08-27

## Languages

**Primary:**
- TypeScript / Vue 3 SFCs (`.vue`) - all `pages/`, `components/`, `composables/`, `server/`, `middleware/`, `plugins/`
- SQL - `supabase/migrations/*.sql` (Postgres/Supabase schema, 13 migrations)

**Secondary:**
- JavaScript (`.mjs`/`.js`) - one-off data/build scripts in `scripts/db/`, `scripts/i18n/`, `scripts/seo/`
- No root `tsconfig.json` committed — Nuxt auto-generates `.nuxt/tsconfig.json` at prepare/build time (standard Nuxt 3 setup, no custom compiler overrides found)

## Runtime

**Environment:**
- Node.js v24.18.0 locally (per `node -v`); production server pinned to Node **v22.22.3** (see `Oracle_Cloud/SERVER-RUNBOOK.md`) — no `.nvmrc`/`.node-version` file exists to enforce this, version parity is manual
- Nitro server preset: `node-server` (Nuxt 3 SSR), built output run via `node .output/server/index.mjs`

**Package Manager:**
- npm (package-lock.json present, v2 lockfile format)
- `"type": "module"` in `package.json` — ESM throughout

## Frameworks

**Core:**
- Nuxt 3 `^3.17.0` (installed `3.21.7`) - full-stack framework (SSR pages + Nitro server API)
- Vue `^3.5.13` - component layer

**Nuxt Modules (registered in `nuxt.config.ts`, order matters):**
1. `@nuxtjs/supabase` `^1.5.0` - Supabase client/auth integration
2. `@nuxtjs/i18n` `^9.5.6` - 4-locale routing (ko/en/ja/zh), config at `i18n/i18n.config.ts`
3. `@nuxtjs/sitemap` `^8.0.15` - dynamic sitemap incl. custom sources
4. `@nuxtjs/robots` `^6.0.9` - robots.txt generation
5. `nuxt-gtag` `^3.0.3` - GA4 tag injection with SPA route tracking

**Testing:**
- No test framework detected (no jest/vitest config, no `*.test.*`/`*.spec.*` files found in repo)

**Build/Dev:**
- `cross-env` `^10.1.0` - sets `TMPDIR=/tmp` for `nuxt dev`
- `sass` `^1.101.0` - SCSS support for `assets/css/design-system.css` and component styles
- `tsx` `^4.22.4` (devDependency) - runs `.ts` scripts directly (e.g. `scripts/sf-preview.ts`)
- `@napi-rs/canvas` `^1.0.0` (devDependency) - native canvas bindings, used server-side for shortform image/video rendering pipeline

## Key Dependencies

**Critical:**
- `@nuxtjs/supabase` + `pg` `^8.21.0` (devDependency, used by `scripts/db/*.mjs` for direct Postgres access/migrations outside the Supabase client)
- `@anthropic-ai/sdk` `^0.102.0` - Claude API client (`server/utils/claude.ts`), premium fortune generation provider
- `@tosspayments/tosspayments-sdk` `^2.7.1` - Toss Payments client widget/SDK (Korean card + PayPal-via-widget checkout)

**Content/Media generation (fortune "shortform" video feature):**
- `mp4-muxer` `^5.2.2` - client-side MP4 muxing (`utils/shortform/encode.ts`) via WebCodecs
- `qrcode` `^1.5.4` - QR code generation for shortform share cards (`composables/useShortform.ts`)
- `@napi-rs/canvas` - native canvas for server/script-side image rendering (`scripts/db/wf-zh-s2t.mjs`, `scripts/sf-preview.ts`)

**Localization:**
- `opencc-js` `^1.3.1` - deterministic Simplified→Traditional Chinese conversion (`server/utils/zh.ts`), corrects AI output that ignores zh-TW instructions

**Infrastructure:**
- No Redis/queue/cache dependency — rate limiting is in-memory (`server/utils/ratelimit.ts`), explicitly noted as not distributed-safe

## Configuration

**Environment:**
- `.env` (gitignored, not committed) loaded via Nuxt's built-in env support; `.env.example` documents variable *names* only
- Config centralized in `nuxt.config.ts` `runtimeConfig` block — server-only keys (Toss secrets, AI keys, Telegram) vs. `runtimeConfig.public` (client-exposed: GA4 ID, AdSense client ID, Meta Pixel ID, Toss client/widget keys, payment mode)
- **Env vars referenced in code (names only):**
  - `NUXT_PUBLIC_SITE_URL`, `NUXT_PUBLIC_ADSENSE_CLIENT`, `NUXT_PUBLIC_GTAG_ID`, `NUXT_PUBLIC_META_PIXEL_ID`, `NUXT_PUBLIC_TOSS_CLIENT_KEY`
  - `PAYMENT_MODE` (`test`|`live`) - selects `_TEST`/`_LIVE` suffixed key sets
  - `TOSS_SECRET_KEY_TEST/LIVE`, `TOSS_WIDGET_SECRET_KEY_TEST/LIVE`, `TOSS_CLIENT_KEY_TEST/LIVE`, `TOSS_WIDGET_KEY_TEST/LIVE`
  - `AI_PROVIDER` (`deepseek`|`claude`), `ANTHROPIC_API_KEY`, `PREMIUM_MODEL` (default `claude-sonnet-4-6`), `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL` (default `deepseek-chat`)
  - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (admin payment/celeb-request notifications; feature silently no-ops if unset)
  - `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (consumed by `@nuxtjs/supabase` module conventions)
- **`.env` file exists locally** (contains environment configuration) — contents not read per security policy

**Build:**
- `nuxt.config.ts` (project root) - single source of build/runtime config, no separate webpack/vite override files
- `compatibilityDate: '2024-11-01'`
- `scripts/i18n/check-leaks.mjs` runs as `prebuild` hook - fails build on translation key leaks

## Platform Requirements

**Development:**
- Local Mac (per `Oracle_Cloud/SERVER-RUNBOOK.md`: "빌드는 항상 로컬 맥에서") - builds are never done on the production server
- `npm run dev` (uses `cross-env TMPDIR=/tmp nuxt dev`)

**Production:**
- Self-managed VM: Oracle Cloud (`64.110.97.120`, Oracle Linux 9, 1 OCPU/1GB RAM/30GB disk), app dir `/home/opc/taounse/`
- Deploy flow (manual, no CI/CD detected): local `PAYMENT_MODE=live` build → `.output/` rsync to server → `pm2 reload`
- Process manager: pm2 (per user memory; no `ecosystem.config.js` found in repo — likely managed directly on server, outside this repo)
- DNS/CDN: Cloudflare (apex + www → server IP)
- No `.github/` workflows or other CI config present in this repo

---

*Stack analysis: 2026-08-27*
