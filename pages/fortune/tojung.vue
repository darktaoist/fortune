<script setup>
// 2026 토정비결 색인용 공개 랜딩. 결과는 /result/free?service=toJung(무료, noindex).
usePageSeo('landing.tojung', { suffix: false })
</script>
<template>
  <FortuneLanding landing-key="tojung" glyph="秘" :cta-to="{ path: '/result/free', query: { service: 'toJung' } }" />
</template>
