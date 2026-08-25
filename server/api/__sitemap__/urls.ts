// 띠별 오늘의 운세 프로그래매틱 SEO URL — 사이트맵 동적 소스.
// 동적 라우트 /fortune/today/[zodiac]는 빌드 시 자동수집되지 않으므로 12 slug를 명시 등록.
//
// 부분글로벌(🟡): 검색 노출은 ko·ja·zh만(영어 제외). 영어 today 페이지는 페이지단 noindex.
// _i18nTransform(4언어 자동확장)은 exclude를 우회해 en을 강제 생성하므로 사용하지 않고,
// ko·ja·zh 3개 URL을 직접 발행 + 대체언어(hreflang)도 수동 지정 → en이 사이트맵/alternates에
// 절대 새지 않도록 보장한다. (href 상대경로는 사이트맵 모듈이 사이트 URL로 절대화한다.)
const SLUGS = ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig']

const LOCALES = [
  { prefix: '', hreflang: 'ko-KR' }, // 기본 로케일(무프리픽스)
  { prefix: '/ja', hreflang: 'ja-JP' },
  { prefix: '/zh', hreflang: 'zh-TW' },
]

export default defineSitemapEventHandler(() => {
  // 매일 갱신되는 페이지라 lastmod 가 오늘(KST)이어야 재수집이 붙는다.
  // 하드코딩·빌드시점 고정이면 의미가 없으므로 요청 시점에 계산한다
  // (사이트맵 응답 캐시는 모듈 기본 10분 — 하루 단위 값엔 영향 없음).
  const lastmod = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)

  // (1) 띠별 상세 12 slug × ko·ja·zh
  const zodiac = SLUGS.flatMap((s) => {
    const alternatives = [
      { hreflang: 'x-default', href: `/fortune/today/${s}` },
      ...LOCALES.map((l) => ({ hreflang: l.hreflang, href: `${l.prefix}/fortune/today/${s}` })),
    ]
    return LOCALES.map((l) => ({
      loc: `${l.prefix}/fortune/today/${s}`,
      alternatives,
      changefreq: 'daily',
      priority: 0.7,
      lastmod,
    }))
  })

  // (2) /daily 인덱스는 자동수집 라우트라 여기서 lastmod 만 얹는다.
  //     사이트맵은 loc 기준으로 엔트리를 병합하므로 alternatives(i18n 자동생성)는 그대로 남는다.
  //     en(/en/daily)은 색인 대상이 아니므로 발행하지 않는다.
  const dailyIndex = LOCALES.map((l) => ({
    loc: `${l.prefix}/daily`,
    changefreq: 'daily',
    lastmod,
  }))

  return [...zodiac, ...dailyIndex]
})
