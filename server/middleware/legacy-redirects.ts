/**
 * 1.0 → 2.0 레거시 URL 301 영구 리다이렉트 (SEO).
 *
 * - locale prefix(`/en` `/ja` `/zh`)를 보존한 채 매핑한다: `/en/tojung` → `/en/fortune/tojung`.
 * - 명시 매핑에 없는 경로는 그대로 통과시킨다(catch-all 금지 — `/` 일괄 리다이렉트는
 *   soft-404 를 유발하므로 채택하지 않음). 존재하지 않는 경로는 정상 404 처리한다.
 * - 신규 `/fortune/*` 및 현행 라우트와 충돌하지 않는 옛 경로만 대상으로 한다.
 */
const LOCALES = ['en', 'ja', 'zh'] // ko 는 prefix 없음

// 정확 일치 매핑(쿼리 없는 옛 경로 → 새 경로). 값에 쿼리스트링 포함 가능.
const EXACT: Record<string, string> = {
  // 정보/유틸리티
  '/dosaprivacy': '/privacy',
  '/dosaterms': '/terms',
  '/ask': '/support',
  '/replay': '/library',
  '/borninfo': '/saju',
  '/intro': '/',
  // 궁합(연예인)
  '/celebrity': '/celeb-select?service=celeb',
  '/celebrity-detail': '/celeb-select?service=celeb',
  '/paycelebrity': '/celeb-select?service=celeb',
  // 궁합(MBTI)
  '/celebritymbti': '/celeb-select?service=mbti',
  '/celebritymbtidetail': '/celeb-select?service=mbti',
  '/mbtipay': '/celeb-select?service=mbti',
  // 운세 — 오늘류
  '/today': '/daily',
  '/daily-horoscope': '/daily',
  '/todaydate': '/daily',
  // 운세 — 색인 랜딩으로
  '/tojung': '/fortune/tojung',
  '/aitojung': '/fortune/tojung',
  '/tojungpay': '/fortune/tojung',
  '/lotto': '/fortune/lotto',
  '/month': '/fortune/month',
  '/lifeall': '/fortune/lifetime',
  '/ailifeall': '/fortune/lifetime',
  // 기타
  '/aimoney': '/',
}

/** 경로에서 locale prefix 를 분리한다. 반환: [prefix(''|'/en'..), restPath('/...')] */
function splitLocale(path: string): [string, string] {
  for (const l of LOCALES) {
    if (path === `/${l}`) return [`/${l}`, '/']
    if (path.startsWith(`/${l}/`)) return [`/${l}`, path.slice(l.length + 1)]
  }
  return ['', path]
}

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const [prefix, rest] = splitLocale(url.pathname)

  // 트레일링 슬래시 정규화(루트 제외)는 건드리지 않음 — i18n/nitro 기본에 위임.
  const target = EXACT[rest]
  if (!target) return

  // 새 경로에 쿼리가 있으면 그대로, 없으면 원 요청 쿼리는 버린다(옛 파라미터는 의미 없음).
  const [targetPath, targetQuery] = target.split('?')
  // prefix 보존: 단, 새 경로가 루트('/')면 prefix 만 남긴다(ko 는 '/').
  let dest = prefix + (targetPath === '/' ? '' : targetPath)
  if (dest === '') dest = '/'
  if (targetQuery) dest += `?${targetQuery}`

  return sendRedirect(event, dest, 301)
})
