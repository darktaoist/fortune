<script setup>
// App shell shared by every page: fixed header + page slot + mobile tab bar.
// useLocaleHead emits SEO head data for the active locale on every page:
//   - <html lang> + dir
//   - <link rel="canonical"> and rel="alternate" hreflang for all 4 locales
//   - og:locale / og:url
const head = useLocaleHead({ seo: true })
useHead(() => ({
  htmlAttrs: {
    lang: head.value.htmlAttrs?.lang,
    dir: head.value.htmlAttrs?.dir,
  },
  link: head.value.link ?? [],
  meta: head.value.meta ?? [],
}))
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
