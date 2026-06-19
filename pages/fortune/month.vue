<script setup>
// 이달의 운세 색인용 공개 랜딩. 결과는 /result/free?service=month(무료, noindex).
usePageSeo('landing.month', { suffix: false })
</script>
<template>
  <FortuneLanding landing-key="month" glyph="月" :cta-to="{ path: '/result/free', query: { service: 'month' } }" />
</template>
