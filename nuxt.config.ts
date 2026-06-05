// https://nuxt.com/docs/api/configuration/nuxt-config
const SITE_URL = process.env.NUXT_PUBLIC_SITE_URL || 'https://taoist.co.kr'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  // Order matters: i18n before sitemap so the sitemap picks up localized routes.
  modules: ['@nuxtjs/supabase', '@nuxtjs/i18n', '@nuxtjs/sitemap', '@nuxtjs/robots'],

  supabase: {
    redirect: false,
  },

  // Design tokens (ported verbatim from the design prototype) loaded globally.
  css: ['~/assets/css/design-system.css'],

  // Site-wide config consumed by i18n (canonical/hreflang baseUrl), sitemap, robots.
  // Override the domain in production with NUXT_PUBLIC_SITE_URL.
  site: {
    url: SITE_URL,
    name: '타오운세',
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
    },
  },
})
