<script setup>
// Toss 결제 성공 리다이렉트 착지. 쿼리의 paymentKey/orderId로 서버 승인(confirm)을 호출.
// 승인 성공 시에만 결제 완료로 간주(쿼리 amount는 신뢰하지 않음 — 서버가 DB금액으로 검증).
// PRO 결과 화면은 추후 — 지금은 완료 안내 + 마이페이지(구매내역)로 연결.
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

useSeoMeta({ title: () => `${t('pay.success.title')} · ${t('seo.titleSuffix')}`, robots: 'noindex, nofollow' })

const state = ref('loading') // loading | done | error
const errorMsg = ref('')

onMounted(async () => {
  const paymentKey = route.query.paymentKey
  const orderId = route.query.orderId
  if (!paymentKey || !orderId) { state.value = 'error'; errorMsg.value = t('pay.success.bad'); return }
  try {
    await $fetch('/api/pay/confirm', { method: 'POST', body: { paymentKey, orderId } })
    state.value = 'done'
  } catch (e) {
    state.value = 'error'
    errorMsg.value = e?.statusMessage || e?.data?.statusMessage || t('pay.success.failed')
  }
})
</script>

<template>
  <main class="pay">
    <div class="card">
      <template v-if="state === 'loading'">
        <div class="spinner" />
        <p class="muted">{{ t('pay.success.confirming') }}</p>
      </template>

      <template v-else-if="state === 'done'">
        <div class="glyph ok">謝</div>
        <h1>{{ t('pay.success.title') }}</h1>
        <p class="muted">{{ t('pay.success.desc') }}</p>
        <div class="actions">
          <NuxtLink :to="localePath('/mypage')" class="btn primary">{{ t('pay.success.mypage') }}</NuxtLink>
          <NuxtLink :to="localePath('/')" class="btn">{{ t('pay.success.home') }}</NuxtLink>
        </div>
      </template>

      <template v-else>
        <div class="glyph err">!</div>
        <h1>{{ t('pay.success.errTitle') }}</h1>
        <p class="muted">{{ errorMsg }}</p>
        <div class="actions">
          <NuxtLink :to="localePath('/mypage')" class="btn primary">{{ t('pay.success.mypage') }}</NuxtLink>
          <NuxtLink :to="localePath('/')" class="btn">{{ t('pay.success.home') }}</NuxtLink>
        </div>
      </template>
    </div>
  </main>
</template>

<style scoped>
.pay { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 110px var(--space-6) var(--space-16); }
.card { width: 100%; max-width: 420px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: var(--space-4); padding: var(--space-10) var(--space-8); background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-xl); box-shadow: var(--shadow-deep); }
.glyph { width: 64px; height: 64px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; font-family: var(--font-display); font-size: 1.7rem; font-weight: 700; }
.glyph.ok { background: var(--gold-soft); color: var(--gold-light); }
.glyph.err { background: rgba(220,38,38,0.12); color: #F87171; }
.card h1 { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 600; }
.muted { color: var(--text-secondary); font-size: var(--text-sm); line-height: 1.7; }
.spinner { width: 38px; height: 38px; border-radius: 50%; border: 3px solid var(--gold-border); border-top-color: var(--gold-primary); animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.actions { display: flex; gap: var(--space-3); margin-top: var(--space-2); }
.btn { padding: 11px 20px; border-radius: var(--radius-md); border: 1px solid var(--gold-border); color: var(--text-secondary); font-size: var(--text-sm); font-weight: 600; transition: all 0.2s; }
.btn:hover { border-color: var(--gold-primary); color: var(--gold-light); }
.btn.primary { background: var(--gold-primary); border-color: var(--gold-primary); color: var(--text-on-gold); }
</style>
