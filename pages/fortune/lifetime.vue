<script setup>
// 평생운세 색인용 공개 랜딩. 무료 요약은 /result/free?service=hour.
// 부분글로벌 — 검색 노출은 ko·ja·zh(영어권은 사주 수요 낮음). en 페이지는 noindex+사이트맵 제외.
// (메뉴/내부 링크는 전 언어 그대로 유지 — SEO 레이어만 한정)
definePageMeta({ seoLocales: ['ko', 'ja', 'zh'] })
usePageSeo('landing.lifetime', { suffix: false })
</script>
<template>
  <FortuneLanding landing-key="lifetime" glyph="命" :cta-to="{ path: '/result/free', query: { service: 'hour' } }" />
</template>
