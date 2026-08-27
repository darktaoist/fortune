# CLAUDE.md — 타오운세 (taounse2)

Nuxt 3 사주·운세 사이트. 라이브: https://taoist.co.kr · 4개 언어 `ko`(prefix 없음)/`en`/`ja`/`zh`.

---

## 1. 절대 규칙

- **Claude는 배포하지 않는다.** `rsync` / `ssh` / `pm2` / 서버 접속 일체 금지. 빌드 성공까지가 Claude의 끝이고, 배포는 사람이 한다.
- **`.env`를 읽거나 수정하지 않는다.** 코드가 참조하는 env 변수 *이름*은 언급해도 되지만 값은 보지 않는다.
- **Supabase 라이브 테이블 쓰기 금지.** `scripts/db/validate-*` · `verify-*` 같은 읽기·검증 스크립트만 허용.
- **유료 LLM API 호출 스크립트 금지.** (Claude/Anthropic·DeepSeek 등. 과거 `gen-today.mjs`로 $22 과금 사고 발생.) 대량 생성이 필요하면 세션이 직접 처리한다.
- **디자인 토큰 변경 금지** — `assets/css/design-system.css`:
  - `--bg-primary: #0A0A0F`
  - `--gold-primary: #C9A84C`
  - 이 두 값은 브랜드 락. 파생 변수 추가는 가능하나 원값 수정은 금지.

## 2. 검증 게이트

```bash
npm run build     # ← 이것 하나가 게이트
```

`package.json`의 `prebuild`가 `i18n:check`를 **자동으로 먼저 돌린다**. 따라서 `npm run i18n:check && npm run build`는 검사를 두 번 하는 것이고, 실질 게이트는 `npm run build` 하나다. 커밋 전 반드시 통과시킨다.

`scripts/i18n/check-leaks.mjs`가 잡는 것:
1. **zh 간체 누수** — `zh`는 반드시 **번체(zh-TW)**. 서버 출력은 `server/utils/zh.ts`의 `toTraditional(text, lang)`을 통과시킨다.
2. **한국어 누수** — 공용 컴포넌트/컴포저블/페이지에 **하드코딩된 한글 금지**. 사용자 노출 문자열은 전부 `t()`. (주석의 한글은 허용.)
   → 공용 컴포넌트에 문자열을 넣을 땐 예외 없이 `t('...')`. 이걸 어기면 빌드가 죽는다.
   → 단, `ko` 원본 로케일 파일은 이 스크립트가 건드리지 않는다(검출만, 수정 안 함).

## 3. i18n / SEO 메커니즘

- **`seoLocales`** (`types/page-meta.d.ts`, 적용은 `layouts/default.vue`): 페이지가 `definePageMeta({ seoLocales: ['ko','ja','zh'] })`를 선언하면 그 로케일만 색인되고 나머지는 `noindex` + 사이트맵 제외 + hreflang에서 빠진다. 선언이 없는 페이지는 4개 언어 전부 색인(기존 동작).
- 표준 호스트는 **non-www** (`https://taoist.co.kr`). www는 301.
- 개인화 결과 페이지(`/result/free`, `/saju`)는 `noindex`가 **의도된 설계**다. 검색 유입은 `/fortune/*` 공개 랜딩이 받는다.

## 4. 유료 랜딩 · 가격 (Product/Offer 작업 시 필독)

`components/FortuneLanding.vue` 하나를 **6개 랜딩이 공유**한다:

| landingKey | 페이지 | 유료? |
|---|---|---|
| `newyear` | `pages/fortune/newyear.vue` | **유료** 9,900원 / $9.99 |
| `lifetime` | `pages/fortune/lifetime.vue` | **유료** 19,800원 / $19.99 |
| `tojung` | `pages/fortune/tojung.vue` | 무료 |
| `lotto` | `pages/fortune/lotto.vue` | 무료 |
| `month` | `pages/fortune/month.vue` | 무료 |
| `date` | `pages/fortune/date.vue` | 무료 |

- **가격의 단일 원천은 `shared/prices.ts`** (`SERVICE_PRICES`). 화면·서버 청구(`server/utils/pricing.ts`)가 모두 여기를 본다. 가격을 다른 곳에 하드코딩하지 않는다.
- `shared/prices.ts`에 항목이 있는 건 **`lifetime`과 `newyear` 둘뿐**. 나머지 4개는 가격이 없다.
- ⚠️ **Product/Offer JSON-LD를 공용 컴포넌트에 무조건 넣으면 안 된다.** 무료 랜딩 4개가 offer 없는 Product 스키마를 뱉어 Rich Results에서 깨진다. **반드시 `landingKey` 가드**를 걸어 유료 2종에만 출력한다.
- 랜딩 6개는 **이미 JSON-LD를 3블록 내보낸다** (2026-08-27 실측): `app.vue`의 Organization, `FortuneLanding.vue`의 FAQPage, 그리고 Article + BreadcrumbList. 따라서 `grep -c 'application/ld+json' ≥ 1` 류의 검증은 **작업 전에도 통과**하므로 게이트로 쓰면 안 된다.
- 직렬화 형태 실측: `useHead`의 `innerHTML`은 **이스케이프 없이** 그대로 나온다(`&quot;` 아님, 키-값 사이 공백 없음). 즉 `grep '"@type":"Product"'` 리터럴이 맞다.
- 작업 전 베이스라인(6개 랜딩 전부): `"@type":"Product"` 0건, `9900`/`19800` 0건.

**Product/Offer 작업의 실제 게이트** (`npm run dev` 띄운 상태에서):

```bash
curl -s localhost:3000/fortune/newyear  | grep -q '"@type":"Product"' && \
curl -s localhost:3000/fortune/newyear  | grep -qE '"price":"?9900"?'  && \
curl -s localhost:3000/fortune/lifetime | grep -q '"@type":"Product"' && \
curl -s localhost:3000/fortune/lifetime | grep -qE '"price":"?19800"?' && \
! curl -s localhost:3000/fortune/tojung | grep -q '"@type":"Product"' && \
! curl -s localhost:3000/fortune/lotto  | grep -q '"@type":"Product"' && \
echo GATE-PASS
```

가격은 맨숫자가 아니라 `"price"` 키에 고정해 검사한다 — 페이지 어딘가의 무관한 숫자에 걸려 **작업 없이 통과**하는 것을 막기 위함이다.

스키마의 `name`/`description`은 기존 Article이 쓰는 `t('seo.landing.<key>.title')` 패턴을 그대로 따른다(§2의 한글 누수 규칙).

## 5. 핵심 경로

| 경로 | 역할 |
|---|---|
| `server/utils/fortune-registry.ts` | 운세 종류별 프롬프트 레지스트리 |
| `server/utils/deepseek.ts` · `claude.ts` · `ai.ts` | LLM 호출 계층 |
| `server/utils/zh.ts` | 간체→번체 변환 (`toTraditional`) |
| `server/utils/pricing.ts` ← `shared/prices.ts` | 결제 금액 |
| `server/utils/celebFree.ts` | 궁합 무료 일일 쿼터(계정당 3회, KST). 원자적 예약/환불 |
| `server/utils/manse.ts` · `myeongsik.ts` | 만세력·명식 계산 |
| `components/FortuneLanding.vue` | 6개 공개 랜딩 공용 컴포넌트 |
| `scripts/i18n/check-leaks.mjs` | i18n 게이트 |
| `scripts/db/*` | DB 시드·검증 스크립트 (라이브 쓰기 주의) |

## 6. 배포 (사람만, 참고용)

로컬에서 `PAYMENT_MODE=live` 로 빌드 → `.output` 을 서버로 rsync → `pm2 reload`.
라이브: 오라클 클라우드, `taoist.co.kr`, pm2 앱 이름 `taounse`.
`nuxt.config.ts`가 `PAYMENT_MODE`(test|live)로 결제 키 세트를 고른다 — 기본값은 `test`.

## 7. 테스트

**테스트 프레임워크 없음** (vitest/playwright 미설치, `test` 스크립트 없음).
따라서 현재 자동 검증은 §2의 빌드 게이트가 전부다. 코드 인스펙션만으로 "동작한다"고 결론내지 말 것 — 화면에 영향이 있는 변경은 `npm run dev` + 브라우저로 실제 확인한다.

---

## 8. GSD (get-shit-done) 도입 현황

**PHASE 1 완료** (2026-08-27). `.planning/codebase/` 에 7개 문서(980줄)가 있다 — STACK / INTEGRATIONS / ARCHITECTURE / STRUCTURE / CONVENTIONS / TESTING / CONCERNS. 계획·실행 전에 레포를 처음부터 다시 읽지 말고 **이걸 먼저 읽어라.**

**다음**: PHASE 2 `/gsd:new-project` (마일스톤 정의, 사람 참여 필수) → PHASE 3 파일럿(Product/Offer JSON-LD, §4의 게이트 사용). 전체 계획은 `docs/2026-08-26-GSD-Ralph-적용-지시서.md`.

**운영 메모 — 알아두면 시간 아끼는 것들:**

- GSD 설치물(`.claude/agents`, `commands`, `hooks`, `get-shit-done`)은 **gitignore**돼 있다. 클론만으로는 복원되지 않는다.
- 복원용 tarball: `~/.local/share/gsd-tarball/get-shit-done-cc-1.42.3.tgz` (2.8MB).
  `npx ~/.local/share/gsd-tarball/get-shit-done-cc-1.42.3.tgz -l --claude`
  npm에서 `get-shit-done-cc`는 **deprecated**라 재설치가 항상 가능하다는 보장이 없어 떠둔 것이다.
- `settings.json`의 `env.GSD_AGENTS_DIR`를 **지우지 마라.** `gsd-sdk`가 npx 캐시(`~/.npm/_npx/<hash>/`)에서 실행돼 에이전트 디렉터리를 레포가 아닌 캐시 안에서 계산한다. 이 env가 없으면 `agents_installed:false`로 오판한다.
- GSD를 갓 설치한 세션에서는 에이전트 타입이 잠시 미등록일 수 있다(`Agent type not found`). 잠시 뒤 다시 시도하거나 세션을 재시작하면 잡힌다.
