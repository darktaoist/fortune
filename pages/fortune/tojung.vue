<script setup>
// 2026 토정비결 색인용 공개 랜딩. 결과는 /result/free?service=toJung(무료, noindex).
// 한국특화 상품 — 검색 노출은 한국어만(ko+x-default). 외국어 페이지는 noindex+사이트맵 제외.
// (메뉴/내부 링크는 전 언어 그대로 유지 — SEO 레이어만 한정)
definePageMeta({ seoLocales: ['ko'] })
usePageSeo('landing.tojung', { suffix: false })
</script>
<template>
  <FortuneLanding landing-key="tojung" glyph="秘" :cta-to="{ path: '/result/free', query: { service: 'toJung' } }" />
</template>
