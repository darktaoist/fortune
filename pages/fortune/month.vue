<script setup>
// 이달의 운세 색인용 공개 랜딩. 결과는 /result/free?service=month(무료, noindex).
// 부분글로벌 — 검색 노출은 ko·ja·zh. en 페이지는 noindex+사이트맵 제외.
// (메뉴/내부 링크는 전 언어 그대로 유지 — SEO 레이어만 한정)
definePageMeta({ seoLocales: ['ko', 'ja', 'zh'] })
usePageSeo('landing.month', { suffix: false })
</script>
<template>
  <FortuneLanding landing-key="month" glyph="月" :cta-to="{ path: '/result/free', query: { service: 'month' } }" />
</template>
