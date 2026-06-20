# 타오운세 2.0 — 검색 노출(SEO) 개선 작업 지시서

> 이 문서를 그대로 Claude Code에 전달하거나, 레포 루트에 `SEO-TASKS.md`로 저장한 뒤 "이 문서대로 작업해줘"라고 지시하세요.

---

## 0. 배경 / 컨텍스트 (먼저 읽을 것)

- **사이트:** `https://taoist.co.kr` (Nuxt 기반, i18n 4개 언어 `ko`/`en`/`ja`/`zh`, 기본 `ko`는 URL prefix 없음, 나머지는 `/en` `/ja` `/zh`)
- **표준 호스트:** non-www (`https://taoist.co.kr`). www는 non-www로 301 통일됨.
- **현재 상태:** 도메인 속성 등록·사이트맵·canonical·다국어 사이트맵 구조는 **정상**. 기술 기반은 문제 없음.
- **핵심 문제:** 운세 상품 페이지가 전부 **noindex 결과 페이지**라, "2026 토정비결", "로또운세", "이달의 운세" 같은 핵심 키워드로 **검색 유입이 구조적으로 0**임.
  - 확인된 예: `/result/free?service=toJung` → `robots: noindex, nofollow`, `canonical: /result/free` (모든 service 파라미터가 한 페이지로 통합됨)
- **작업 시 주의:** 아래 명세는 목표/요건이며, **실제 라우팅·i18n 설정은 레포 코드에 맞춰 구현**할 것. URL 패턴 예시(`/fortune/...`)는 팀 컨벤션에 맞게 조정 가능.

---

## 작업 1. 옛 1.0 URL → 2.0 301 리다이렉트

옛 1.0 경로가 현재 404 또는 미정리 상태. 아래 매핑대로 **301 영구 리다이렉트** 설정.
구현은 Nuxt `routeRules`(`redirect`) 또는 서버 미들웨어 사용. 언어 prefix(`/en` `/ja` `/zh`)에도 동일 적용.

### 정확 매핑 (유틸리티/정보 페이지)

| 옛 1.0 | → 2.0 |
|---|---|
| `/dosaprivacy` | `/privacy` |
| `/dosaterms` | `/terms` |
| `/ask` | `/support` |
| `/replay` | `/library` |
| `/borninfo` | `/saju` |
| `/intro` | `/` |

### 궁합

| 옛 1.0 | → 2.0 |
|---|---|
| `/celebrity`, `/celebrity-detail`, `/paycelebrity` | `/celeb-select?service=celeb` |
| `/celebritymbti`, `/celebritymbtidetail`, `/mbtipay` | `/celeb-select?service=mbti` |

### 운세 상품

| 옛 1.0 | → 2.0 |
|---|---|
| `/today`, `/daily-horoscope`, `/todaydate` | `/daily` |
| `/tojung`, `/aitojung`, `/tojungpay` | **작업 2의 토정비결 랜딩** (없으면 임시로 `/`) |
| `/lotto` | **작업 2의 로또 랜딩** (없으면 `/`) |
| `/month` | **작업 2의 이달운세 랜딩** (없으면 `/`) |
| `/lifeall`, `/ailifeall`, `/zh/lifeall` | **작업 2의 평생운 랜딩** (없으면 `/`) |
| `/aimoney` | `/` |

- **catch-all:** 위에 없는 옛 경로 중 404 나는 것은 `/`(홈)으로 301. (soft-404 최소화를 위해 가능하면 가장 가까운 카테고리로)

---

## 작업 2. 운세별 "색인용 공개 랜딩 페이지" 신설 ⭐ (가장 중요)

현재 운세 결과 페이지(`/result/free?service=*`, `/saju?service=*`)는 개인화라 noindex가 맞음. **이건 그대로 둔다.**
대신, 각 운세 키워드로 검색 유입을 받을 **공개·색인 가능한 랜딩 페이지**를 신설한다. (결과 페이지와 분리)

### 대상 운세 (각각 1개 랜딩)

- 2026 토정비결 (toJung)
- 2026 올해의운세 / 신년운세 (newyear)
- 평생운세 (lifetime / hour)
- 로또 운세 (lotto)
- 이달의 운세 (month)
- 데이트 운세 (date)

> 오늘의 운세(`/daily`)와 궁합(`/celeb-select`)은 이미 색인 가능하므로 제외.

### URL 패턴 (예시 — 조정 가능)

```
/fortune/tojung
/fortune/newyear
/fortune/lifetime
/fortune/lotto
/fortune/month
/fortune/date
```

### 각 랜딩 페이지 요건

1. **공개 접근** — 로그인·사주입력 없이 누구나 열람 가능
2. **indexable** — `robots` 메타에 noindex 절대 금지 (기본 index,follow)
3. **canonical = 자기 자신** — `/result/free` 같은 곳으로 통합 금지. 각 랜딩이 고유 canonical.
4. **고유 title / meta description** — 키워드 포함
   - 예) `<title>2026 토정비결 - 무료 AI 사주 운세 | 타오운세</title>`
   - 예) description: "2026년 토정비결을 AI가 사주명리로 분석. 재물·애정·건강 흐름을 무료로 확인하세요."
5. **본문 콘텐츠** — 색인 가치가 있도록 충분한 텍스트:
   - H1(키워드 포함), 이 운세가 무엇인지, 보는 법, 샘플 결과 일부, FAQ 등
6. **CTA** — 실제 운세 흐름(`/saju` 또는 해당 `/result/...`)으로 연결하는 버튼
7. **4개 언어(hreflang)** — ko/en/ja/zh 각 언어 버전 + 상호 alternate 연결 (작업 3)
8. **사이트맵 등록** — 작업 4

---

## 작업 3. hreflang 적용 (다국어 중복 해결)

현재 `/en/`이 한국어 홈의 중복으로 잡힘("중복 페이지, Google이 다른 표준 선택") → **hreflang 미적용 신호.**

- 모든 **색인 대상 페이지**의 `<head>`에 4개 언어 + x-default를 alternate로 상호 연결:
  ```html
  <link rel="alternate" hreflang="ko" href="https://taoist.co.kr/daily" />
  <link rel="alternate" hreflang="en" href="https://taoist.co.kr/en/daily" />
  <link rel="alternate" hreflang="ja" href="https://taoist.co.kr/ja/daily" />
  <link rel="alternate" hreflang="zh" href="https://taoist.co.kr/zh/daily" />
  <link rel="alternate" hreflang="x-default" href="https://taoist.co.kr/daily" />
  ```
- 각 언어 페이지의 canonical은 **자기 언어 자신**을 가리킬 것 (en이 ko를 canonical로 두지 않기).
- 사이트맵에도 hreflang annotation(`xhtml:link`) 포함 권장.

---

## 작업 4. 사이트맵 갱신

- 작업 2에서 만든 **운세 랜딩 페이지들을 4개 언어 사이트맵 전부에 추가** (`__sitemap__/ko-KR.xml`, `en-US.xml`, `ja-JP.xml`, `zh-TW.xml`).
- `/library`, `/mypage`는 성격에 따라: 개인화/로그인 페이지면 사이트맵 제외 + noindex, 공개 안내 페이지면 포함.
- 결과 페이지(`/result/*`, `/saju?service=*`)는 사이트맵에 **넣지 않음** (noindex 유지).
- 사이트맵은 표준 host(non-www) URL만 사용 (현재 정상).

---

## 검수 기준 (완료 조건)

- [ ] 작업 1의 모든 옛 URL이 301로 새 경로 이동 — 404 없음
- [ ] 운세 랜딩(작업 2): HTTP 200 + `index,follow` + 자기 canonical + 고유 title/description + 본문 텍스트 존재
- [ ] 운세 랜딩이 4개 언어 사이트맵에 모두 포함됨
- [ ] 결과 페이지(`/result/*`, `/saju?service=*`)는 noindex 유지 (변경 없음)
- [ ] 색인 대상 페이지 `<head>`에 ko/en/ja/zh + x-default hreflang 존재
- [ ] 각 언어 페이지 canonical이 자기 언어 자신을 가리킴 (en→ko 통합 없음)
- [ ] `sitemap_index.xml` 및 언어별 사이트맵이 유효한 XML이고 신규 랜딩 포함

---

## 작업 우선순위

1. **작업 2 (운세 랜딩 신설)** — 검색 유입의 핵심. 최우선.
2. **작업 3 (hreflang)** — 다국어 색인 정상화.
3. **작업 1 (301)** — 옛 URL 정리(저비용). 작업 2 랜딩이 생긴 뒤 운세 URL 타겟 확정.
4. **작업 4 (사이트맵)** — 작업 2·3 반영 후 갱신.

> 반영 완료 후, Google Search Console 도메인 속성에서 `https://taoist.co.kr/sitemap.xml` 재제출 + 주요 신규 랜딩 URL 검사 → 색인 요청.
