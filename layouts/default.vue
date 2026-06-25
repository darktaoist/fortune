<script setup>
// App shell shared by every page: fixed header + page slot + mobile tab bar.
//
// useLocaleHead emits SEO head data for ALL 4 locales on every page:
//   <html lang> dir · rel="canonical" · hreflang ×4 (+x-default) · og:locale(:alternate)
//
// Per-page search scoping (SEO layer ONLY — site menus/navigation stay visible):
// a page may declare `definePageMeta({ seoLocales: ['ko'] })` to limit which
// language versions are exposed to search engines. We then
//   (1) drop hreflang / og:locale:alternate links for excluded locales, and
//   (2) mark the page noindex,follow when its own locale is not in the allow-list.
// Pages without seoLocales are untouched (all 4 locales, as before).
const head = useLocaleHead({ seo: true })
const route = useRoute()
const { locale } = useI18n()

// hreflang/og value → base locale code ('ko-KR'→'ko', 'en_US'→'en')
const baseCode = (v) => String(v || '').toLowerCase().split(/[-_]/)[0]

const keepLink = (link, allow) => {
  // Keep non-locale links untouched (canonical, preconnect, etc.)
  if (link.rel !== 'alternate' || !link.hreflang) return true
  // x-default points to the default locale (ko); keep while ko is allowed.
  if (link.hreflang === 'x-default') return allow.has('ko')
  return allow.has(baseCode(link.hreflang))
}
const keepMeta = (m, allow) => {
  if (m.property === 'og:locale:alternate') return allow.has(baseCode(m.content))
  return true
}

// noindex disallowed-locale versions of scoped pages. useRobotsRule sets both
// <meta name=robots> and the X-Robots-Tag header (SSR-authoritative for crawlers).
const allowList = route.meta.seoLocales
if (Array.isArray(allowList) && !allowList.includes(locale.value)) {
  useRobotsRule('noindex, follow')
}

useHead(() => {
  const raw = route.meta.seoLocales
  const allow = Array.isArray(raw) ? new Set(raw) : null
  const link = head.value.link ?? []
  const meta = head.value.meta ?? []
  return {
    htmlAttrs: {
      lang: head.value.htmlAttrs?.lang,
      dir: head.value.htmlAttrs?.dir,
    },
    link: allow ? link.filter((l) => keepLink(l, allow)) : link,
    meta: allow ? meta.filter((m) => keepMeta(m, allow)) : meta,
  }
})
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <main>
      <slot />
    </main>
    <MobileTabBar />
  </div>
</template>
