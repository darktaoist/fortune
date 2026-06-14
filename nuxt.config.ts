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

  // Order matters: i18n before sitemap so the sitemap picks up localized routes.
  modules: ['@nuxtjs/supabase', '@nuxtjs/i18n', '@nuxtjs/sitemap', '@nuxtjs/robots'],

  supabase: {
    redirect: false,
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
    public: {
      paymentMode: PAY_MODE.toLowerCase(),
      tossClientKey: payKey('TOSS_CLIENT_KEY') || process.env.NUXT_PUBLIC_TOSS_CLIENT_KEY || '',
      tossWidgetKey: payKey('TOSS_WIDGET_KEY'),
      adsenseClient: ADSENSE_CLIENT,
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
    exclude: ['/mypage', '/library', '/checkout', '/saju', '/login', '/confirm', '/reset-password', '/pay/**', '/result/**'],
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
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'taoist_lang',
      alwaysRedirect: false,
      fallbackLocale: 'ko',
      redirectOn: 'root',
    },
  },

  app: {
    head: {
      title: '타오운세 — Where Ancient Wisdom Meets AI',
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
