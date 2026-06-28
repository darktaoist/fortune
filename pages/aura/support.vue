<script setup>
// AURA 앱 지원/문의 — 1.0 AuraSupport.vue 포팅(options API → script setup).
// 4개국어: FAQ는 aura.support.q1~q7/a1~a7 키 쌍, 섹션·연락처도 키.
definePageMeta({ layout: false })
const { t } = useI18n()
const localePath = useLocalePath()
useSeoMeta({ title: () => t('aura.support.seoTitle'), robots: 'noindex, nofollow' })
const router = useRouter()

const openIdx = ref(null)
function toggle(i) { openIdx.value = openIdx.value === i ? null : i }

const faqs = computed(() =>
  Array.from({ length: 7 }, (_, i) => ({
    q: t(`aura.support.q${i + 1}`),
    a: t(`aura.support.a${i + 1}`),
  })),
)
</script>

<template>
  <div class="legal-page">
    <AuraLangSwitch />
    <div class="legal-header">
      <span class="back-btn" @click="router.back()">{{ t('aura.legal.back') }}</span>
      <h1>{{ t('aura.support.h1') }}</h1>
      <span class="app-badge">{{ t('aura.legal.badge') }}</span>
    </div>

    <div class="legal-body">
      <section>
        <h2>{{ t('aura.support.faqTitle') }}</h2>

        <div
          v-for="(item, i) in faqs"
          :key="i"
          class="faq-item"
          @click="toggle(i)"
        >
          <div class="faq-q">
            <span class="faq-icon">{{ openIdx === i ? '▲' : '▼' }}</span>
            {{ item.q }}
          </div>
          <div v-if="openIdx === i" class="faq-a">{{ item.a }}</div>
        </div>
      </section>

      <section>
        <h2>{{ t('aura.support.emailTitle') }}</h2>
        <div class="contact-box">
          <p>{{ t('aura.support.contactIntro') }}</p>
          <p style="margin-top:12px">
            <strong>{{ t('aura.support.emailLabel') }}</strong>:
            <a href="mailto:help@taoist.co.kr">help@taoist.co.kr</a>
          </p>
          <p>{{ t('aura.support.hours') }}</p>
        </div>
      </section>

      <div class="footer-links">
        <NuxtLink :to="localePath('/aura')">{{ t('aura.nav.home') }}</NuxtLink>
        <NuxtLink :to="localePath('/aura/privacy')">{{ t('aura.nav.privacy') }}</NuxtLink>
        <NuxtLink :to="localePath('/aura/terms')">{{ t('aura.nav.terms') }}</NuxtLink>
        <NuxtLink :to="localePath('/aura/delete-account')">{{ t('aura.nav.delete') }}</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style src="~/assets/css/aura-legal.css"></style>

<style scoped>
.faq-item {
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  margin-bottom: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s;
}
.faq-item:hover { border-color: #bbb; }

.faq-q {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  font-size: 15px;
  font-weight: 600;
  color: #333;
  background: #fafafa;
}

.faq-icon { font-size: 11px; color: #888; }

.faq-a {
  padding: 14px 18px 16px;
  font-size: 14px;
  line-height: 1.8;
  color: #555;
  background: #fff;
  border-top: 1px solid #eee;
}
</style>
