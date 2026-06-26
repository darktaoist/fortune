// MBTI×MBTI 궁합 프로그래매틱 SEO URL — 사이트맵 동적 소스.
// 동적 라우트 /fortune/mbti/[pair]는 빌드 시 자동수집되지 않으므로 136 조합을 명시 등록.
//
// 글로벌(🟢): MBTI는 전 세계 공통 개념이라 4언어(ko·en·ja·zh) 전부 색인 대상.
// _i18nTransform(4언어 자동확장)에 맡기지 않고 4개 URL을 직접 발행 + 대체언어(hreflang)도
// 수동 지정 → 4언어 상호참조 + x-default를 명확히 보장한다.
// (href 상대경로는 사이트맵 모듈이 사이트 URL로 절대화한다.)

const TYPES = ['ENFJ', 'ENFP', 'ENTJ', 'ENTP', 'ESFJ', 'ESFP', 'ESTJ', 'ESTP', 'INFJ', 'INFP', 'INTJ', 'INTP', 'ISFJ', 'ISFP', 'ISTJ', 'ISTP']

// 136개 조합(C(16,2)+16) 슬러그 — 알파벳 오름차순 소문자 'enfj-intj'.
const SLUGS: string[] = []
for (let i = 0; i < TYPES.length; i++)
  for (let j = i; j < TYPES.length; j++) SLUGS.push(`${TYPES[i]}-${TYPES[j]}`.toLowerCase())

const LOCALES = [
  { prefix: '', hreflang: 'ko-KR' }, // 기본 로케일(무프리픽스)
  { prefix: '/en', hreflang: 'en-US' },
  { prefix: '/ja', hreflang: 'ja-JP' },
  { prefix: '/zh', hreflang: 'zh-TW' },
]

export default defineSitemapEventHandler(() => {
  return SLUGS.flatMap((s) => {
    const alternatives = [
      { hreflang: 'x-default', href: `/fortune/mbti/${s}` },
      ...LOCALES.map((l) => ({ hreflang: l.hreflang, href: `${l.prefix}/fortune/mbti/${s}` })),
    ]
    return LOCALES.map((l) => ({
      loc: `${l.prefix}/fortune/mbti/${s}`,
      alternatives,
      changefreq: 'weekly',
      priority: 0.6,
    }))
  })
})
