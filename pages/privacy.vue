<script setup>
// 개인정보 처리방침 — ported from 개인정보처리방침.html. Layout/render in <LegalDoc>.
import PRIVACY from '~/data/privacy.js'
</script>

<template>
  <LegalDoc doc-key="privacy" stamp="私" :data="PRIVACY" />
</template>
