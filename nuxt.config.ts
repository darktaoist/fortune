// https://nuxt.com/docs/api/configuration/nuxt-config
const SITE_URL = process.env.NUXT_PUBLIC_SITE_URL || 'https://taoist.co.kr'

// Google AdSense — 무료 결과 페이지에만 노출(유료 결과는 광고 없음). 1.0에서 그대로 포팅.
const ADSENSE_CLIENT = process.env.NUXT_PUBLIC_ADSENSE_CLIENT || 'ca-pub-4183772800767937'

// 결제 키는 PAYMENT_MODE(test|live)에 따라 _TEST/_LIVE 세트에서 선택한다.
// 레거시(payment.js)의 hostname 분기를 env 분기로 대체 — 배포 환경에서 PAYMENT_MODE=live.
const PAY_MODE = (process.env.PAYMENT_MODE || 'test').toLowerCase() === 'live' ? 'LIVE' : 'TEST'
const payKey = (name: string) => process.env[`${name}_${PAY_MODE}`] || process.env[name] || ''

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  // 개발 전용 미리보기(/dev/*, /api/dev/*)는 production 빌드에서 파일째 제외 → 404.
  $production: {
    ignore: ['pages/dev/**', 'server/api/dev/**'],
  },

  // Order matters: i18n before sitemap so the sitemap picks up localized routes.
  modules: ['@nuxtjs/supabase', '@nuxtjs/i18n', '@nuxtjs/sitemap', '@nuxtjs/robots', 'nuxt-gtag'],

  supabase: {
    redirect: false,
  },

  // Google Analytics 4. 측정 ID는 public(클라이언트 노출 정상) — env 우선, 미설정 시 운영 ID 기본값.
  // nuxt-gtag 가 SPA 라우트 이동마다 page_view 를 자동 전송한다(수동 스니펫의 첫진입-only 한계 회피).
  gtag: {
    id: process.env.NUXT_PUBLIC_GTAG_ID || 'G-7TR1J714E8',
  },

  // 결제(Toss Payments v2) 키. 시크릿은 서버 전용, 클라이언트/위젯 키만 public.
  // 국내 카드=API 개별연동(ck/sk), 해외 PayPal=위젯 연동(gck/gsk) — 레거시와 동일 구조.
  // 미설정 시 결제 페이지가 "결제 설정 필요" 상태로 안전하게 표시된다.
  runtimeConfig: {
    tossSecretKey: payKey('TOSS_SECRET_KEY'),
    tossWidgetSecretKey: payKey('TOSS_WIDGET_SECRET_KEY'),
    // AI 프로바이더 선택: 'deepseek' | 'claude' (기본 deepseek). 요청별 provider로 개별 강제 가능.
    aiProvider: process.env.AI_PROVIDER || 'deepseek',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    premiumModel: process.env.PREMIUM_MODEL || 'claude-sonnet-4-6',
    deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
    deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    // 결제 알림(텔레그램 봇) — 둘 다 있어야 발송. 없으면 조용히 skip.
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
    public: {
      paymentMode: PAY_MODE.toLowerCase(),
      tossClientKey: payKey('TOSS_CLIENT_KEY') || process.env.NUXT_PUBLIC_TOSS_CLIENT_KEY || '',
      tossWidgetKey: payKey('TOSS_WIDGET_KEY'),
      adsenseClient: ADSENSE_CLIENT,
      metaPixelId: process.env.NUXT_PUBLIC_META_PIXEL_ID || '2470955410072045',
      // 토정비결 연도판: '2027'(tojung_yearly/monthly, 코드·언어가 없으면 2026 폴백) | '2026'(기존 tojung 테이블).
      // 빌드 시 TOJUNG_YEAR로 고정되고, 실행 시 NUXT_PUBLIC_TOJUNG_YEAR로 덮어쓸 수 있다.
      tojungYear: process.env.TOJUNG_YEAR || '2027',
    },
  },

  // Design tokens (ported verbatim from the design prototype) loaded globally.
  css: ['~/assets/css/design-system.css'],

  // Site-wide config consumed by i18n (canonical/hreflang baseUrl), sitemap, robots.
  // Override the domain in production with NUXT_PUBLIC_SITE_URL.
  site: {
    url: SITE_URL,
    name: '타오운세',
  },

  // 개인화·결제·인증 경로는 색인 제외(개별 페이지의 robots:noindex와 함께 이중 방어).
  // 공개 색인 대상: 홈/무료운세 소개/띠별운세/FAQ/약관·개인정보 등.
  sitemap: {
    exclude: [
      '/mypage', '/library', '/checkout', '/saju', '/login', '/confirm', '/reset-password', '/pay/**', '/result/**',
      // 한국특화(🔴): 로또·토정비결은 한국어만 색인. 외국어 버전은 사이트맵 제외 + 페이지 noindex.
      // exclude는 i18n 대체언어 생성보다 먼저 적용되므로, 살아남는 ko 엔트리의 alternates에서도 자동 제거됨.
      '/en/fortune/lotto', '/ja/fortune/lotto', '/zh/fortune/lotto',
      '/en/fortune/tojung', '/ja/fortune/tojung', '/zh/fortune/tojung',
      // 부분글로벌(🟡): 평생·신년·이달의운세·오늘운세(daily) 인덱스는 ko·ja·zh만 색인 → en만 제외.
      // (자동수집 페이지. today/[zodiac]는 사이트맵 소스 urls.ts가 ko·ja·zh만 발행하므로 제외 불필요.)
      '/en/fortune/lifetime', '/en/fortune/newyear', '/en/fortune/month', '/en/daily',
    ],
    // 동적 라우트는 자동수집되지 않으므로 명시 소스로 등록:
    //  urls = 띠별 오늘의 운세 12 URL(ko·ja·zh), mbti = MBTI 궁합 544 URL(ko·en·ja·zh).
    sources: ['/api/__sitemap__/urls', '/api/__sitemap__/mbti'],
  },
  robots: {
    disallow: ['/mypage', '/library', '/checkout', '/saju', '/login', '/confirm', '/reset-password', '/pay/', '/result/'],
  },

  i18n: {
    // vue-i18n options (flat-key resolver + literal compiler) live in i18n/i18n.config.ts
    vueI18n: './i18n.config.ts',
    bundle: { optimizeTranslationDirective: false },
    defaultLocale: 'ko',
    // Per-language URLs for SEO: ko at '/', others at '/en' '/ja' '/zh'.
    // This is what makes all 4 languages independently indexable.
    strategy: 'prefix_except_default',
    baseUrl: SITE_URL,
    locales: [
      { code: 'ko', language: 'ko-KR', name: '한국어', flag: '🇰🇷', short: 'KO' },
      { code: 'en', language: 'en-US', name: 'English', flag: '🇺🇸', short: 'EN' },
      { code: 'ja', language: 'ja-JP', name: '日本語', flag: '🇯🇵', short: 'JP' },
      { code: 'zh', language: 'zh-TW', name: '繁體中文', flag: '🇹🇼', short: 'ZH' },
    ],
    // 루트(/) 브라우저 언어 자동 리디렉션 끔. 구글봇은 en-US 헤더로(또는 헤더 없이) 오기
    // 때문에 이게 켜져 있으면 홈이 항상 /en 으로 302 되고, 구글은 taoist.co.kr 을 영어
    // 사이트로 색인한다 — 2026-09-07 GSC 실측: 크롤된 홈 HTML 이 lang="en-US",
    // canonical=/en. ko 홈의 h1·title 은 이미 "타오운세"인데 구글이 그걸 못 봐서
    // 브랜드 검색("타오운세")이 "타로운세"로 자동정정되던 원인.
    //
    // redirectOn 을 좁히는 걸로는 해결 안 된다. 'root' 가 이미 최소값이고,
    // 'no prefix' 는 @nuxtjs/i18n/dist/runtime/internal.js:79 에서 *prefix 가 있는*
    // 경로만 리디렉션을 건너뛰므로, prefix_except_default 에서는 한국어 전체
    // (/, /daily, /fortune/*)가 리디렉션 대상이 되어 오히려 악화된다.
    // false 는 internal.js:61 게이트에서 서버·클라이언트 감지를 한꺼번에 막는다.
    // 구글 공식 가이드도 언어 기반 자동 리디렉션을 권장하지 않는다.
    detectBrowserLanguage: false,
  },

  app: {
    head: {
      title: '타오운세 — 만세력으로 계산하는 사주·운세',
      meta: [
        { charset: 'UTF-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;600;700;900&family=Noto+Sans+KR:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;600&display=swap',
        },
      ],
      script: [
        // Google AdSense 로더(사이트 전역 1회). 광고 렌더는 무료 결과 페이지의 <AdUnit>에서만.
        {
          async: true,
          src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`,
          crossorigin: 'anonymous',
        },
      ],
    },
  },
})
