<script setup>
// Global default SEO — guarantees every page has a sane title/description/OG
// even if it forgets to call usePageSeo(). Pages override title/description
// via usePageSeo(); site-level og:site_name / og:type / twitter:card set here
// apply everywhere.
const { t } = useI18n()
useSeoMeta({
  title: () => t('seo.default.title'),
  description: () => t('seo.default.desc'),
  ogSiteName: '타오운세',
  ogType: 'website',
  ogTitle: () => t('seo.default.title'),
  ogDescription: () => t('seo.default.desc'),
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
