<script setup>
// AURA 앱 개인정보처리방침 — 1.0 AuraPrivacy.vue 포팅. 플레이스토어 필수 URL(/aura/privacy).
// 4개국어: prose 본문은 단일 HTML 키(aura.privacy.body), 헤더/푸터는 nav 키.
definePageMeta({ layout: false })
const { t } = useI18n()
const localePath = useLocalePath()
useSeoMeta({ title: () => t('aura.privacy.seoTitle'), robots: 'noindex, nofollow' })
const router = useRouter()
</script>

<template>
  <div class="legal-page">
    <AuraLangSwitch />
    <div class="legal-header">
      <span class="back-btn" @click="router.back()">{{ t('aura.legal.back') }}</span>
      <h1>{{ t('aura.privacy.h1') }}</h1>
      <span class="app-badge">{{ t('aura.legal.badge') }}</span>
    </div>

    <div class="legal-body" v-html="t('aura.privacy.body')"></div>

    <div class="legal-body">
      <div class="footer-links">
        <NuxtLink :to="localePath('/aura')">{{ t('aura.nav.home') }}</NuxtLink>
        <NuxtLink :to="localePath('/aura/terms')">{{ t('aura.nav.terms') }}</NuxtLink>
        <NuxtLink :to="localePath('/aura/support')">{{ t('aura.nav.support') }}</NuxtLink>
        <NuxtLink :to="localePath('/aura/delete-account')">{{ t('aura.nav.delete') }}</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style src="~/assets/css/aura-legal.css"></style>
