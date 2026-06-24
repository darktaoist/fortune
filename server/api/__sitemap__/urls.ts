// 띠별 오늘의 운세 프로그래매틱 SEO URL — 사이트맵 동적 소스.
// 동적 라우트 /fortune/today/[zodiac]는 빌드 시 자동수집되지 않으므로 12 slug를 명시 등록.
// _i18nTransform: ko(무프리픽스) + en/ja/zh 변형과 hreflang 대체를 자동 생성.
const SLUGS = ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig']

export default defineSitemapEventHandler(() => {
  return SLUGS.map((s) => ({
    loc: `/fortune/today/${s}`,
    _i18nTransform: true,
    changefreq: 'daily',
    priority: 0.7,
  }))
})
