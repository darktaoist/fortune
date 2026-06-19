<script setup>
// 데이트운세 색인용 공개 랜딩. 결과는 /result/free?service=date(무료, noindex).
usePageSeo('landing.date', { suffix: false })
</script>
<template>
  <FortuneLanding landing-key="date" glyph="情" :cta-to="{ path: '/result/free', query: { service: 'date' } }" />
</template>
