<script setup>
// 서비스 이용약관 — ported from 이용약관.html. Layout/render in <LegalDoc>.
import TERMS from '~/data/terms.js'
</script>

<template>
  <LegalDoc doc-key="terms" stamp="約" :data="TERMS" />
</template>
