<script setup>
// Toss 결제 실패/취소 리다이렉트 착지. 쿼리의 code/message를 안내로 표시.
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

useSeoMeta({ title: () => `${t('pay.fail.title')} · ${t('seo.titleSuffix')}`, robots: 'noindex, nofollow' })

const code = computed(() => (typeof route.query.code === 'string' ? route.query.code : ''))
const message = computed(() => (typeof route.query.message === 'string' && route.query.message) || t('pay.fail.desc'))
</script>

<template>
  <main class="pay">
    <div class="card">
      <div class="glyph">⨯</div>
      <h1>{{ t('pay.fail.title') }}</h1>
      <p class="muted">{{ message }}</p>
      <p v-if="code" class="code">code: {{ code }}</p>
      <div class="actions">
        <NuxtLink :to="localePath('/')" class="btn primary">{{ t('pay.fail.home') }}</NuxtLink>
      </div>
    </div>
  </main>
</template>

<style scoped>
.pay { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 110px var(--space-6) var(--space-16); }
.card { width: 100%; max-width: 420px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: var(--space-4); padding: var(--space-10) var(--space-8); background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-xl); box-shadow: var(--shadow-deep); }
.glyph { width: 64px; height: 64px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(220,38,38,0.12); color: #F87171; font-size: 1.8rem; }
.card h1 { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 600; }
.muted { color: var(--text-secondary); font-size: var(--text-sm); line-height: 1.7; }
.code { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); opacity: 0.8; }
.actions { margin-top: var(--space-2); }
.btn { padding: 11px 20px; border-radius: var(--radius-md); border: 1px solid var(--gold-primary); background: var(--gold-primary); color: var(--text-on-gold); font-size: var(--text-sm); font-weight: 700; }
</style>
