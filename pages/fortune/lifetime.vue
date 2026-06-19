<script setup>
// 평생운세 색인용 공개 랜딩. 무료 요약은 /result/free?service=hour.
usePageSeo('landing.lifetime', { suffix: false })
</script>
<template>
  <FortuneLanding landing-key="lifetime" glyph="命" :cta-to="{ path: '/result/free', query: { service: 'hour' } }" />
</template>
