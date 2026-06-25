<script setup>
// 2026 신년운세/올해의운세 색인용 공개 랜딩. 결제 흐름은 /saju?service=newyear.
// 부분글로벌 — 검색 노출은 ko·ja·zh. en 페이지는 noindex+사이트맵 제외.
// (메뉴/내부 링크는 전 언어 그대로 유지 — SEO 레이어만 한정)
definePageMeta({ seoLocales: ['ko', 'ja', 'zh'] })
usePageSeo('landing.newyear', { suffix: false })
</script>
<template>
  <FortuneLanding landing-key="newyear" glyph="秘" :cta-to="{ path: '/saju', query: { service: 'newyear' } }" />
</template>
