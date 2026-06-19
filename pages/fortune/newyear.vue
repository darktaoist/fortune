<script setup>
// 2026 신년운세/올해의운세 색인용 공개 랜딩. 결제 흐름은 /saju?service=newyear.
usePageSeo('landing.newyear', { suffix: false })
</script>
<template>
  <FortuneLanding landing-key="newyear" glyph="秘" :cta-to="{ path: '/saju', query: { service: 'newyear' } }" />
</template>
