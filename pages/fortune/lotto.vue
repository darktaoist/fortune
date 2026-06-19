<script setup>
// 로또운세 색인용 공개 랜딩. 결과는 /result/free?service=lotto(무료, noindex).
usePageSeo('landing.lotto', { suffix: false })
</script>
<template>
  <FortuneLanding landing-key="lotto" glyph="財" :cta-to="{ path: '/result/free', query: { service: 'lotto' } }" />
</template>
