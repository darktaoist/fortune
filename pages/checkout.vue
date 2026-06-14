<script setup>
// 결제(상품 상세) 페이지 — 결제.html 디자인 포팅.
// 좌: 상품 소개(서비스별)+카테고리 그리드+환불정책 / 우: 사용자 정보+가격+결제수단+CTA.
// service(lifetime/celeb/mbti/newyear)는 ?service= 로 분기. 사용자 정보는 /api/saju/manse(양/음력 변환) 재사용.
// 결제는 서버 주문 생성(/api/pay/order) → Toss 결제창. 금액은 서버가 결정, 화면은 표시만.
import SERVICES from '~/data/checkout-services.js'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const config = useRuntimeConfig()
const user = useSupabaseUser()
const { current, hasInput } = useSajuInput()

const service = computed(() => {
  const s = route.query.service
  return typeof s === 'string' && SERVICES[s] ? s : 'lifetime'
})
const svc = computed(() => SERVICES[service.value])
const partnerName = computed(() => (typeof route.query.partnerName === 'string' ? route.query.partnerName : ''))
const partnerId = computed(() => (typeof route.query.partnerId === 'string' ? route.query.partnerId : ''))
const partnerKind = computed(() => (route.query.partnerKind === 'friend' ? 'friend' : 'celeb'))
const partnerMbti = computed(() => (typeof route.query.partnerMbti === 'string' ? route.query.partnerMbti : ''))

const isKorea = computed(() => locale.value === 'ko')
const pick = (obj) => (obj && (obj[locale.value] ?? obj.ko)) ?? ''

useSeoMeta({ title: () => `${pick(svc.value.title)} · ${t('seo.titleSuffix')}`, robots: 'noindex, nofollow' })

// ── 가격(로케일 적응) ──
const priceOld = computed(() => (isKorea.value ? `${svc.value.orig}${t('pay.won')}` : `$${svc.value.origUsd}`))

// ── 결제 수단(한국=국내 PG / 그 외=PayPal 중심). 시각 표시이며 실제 처리는 Toss. ──
const PM_KR = [['naver', 'N'], ['kakao', 'k'], ['toss', 't'], ['payco', 'P'], ['samsung', 'S'], ['apple', ''], ['vbank', '₩'], ['card', '▭']]
const PM_INTL = [['paypal', 'P'], ['card', '▭'], ['apple', ''], ['googlepay', 'G']]
const methods = computed(() => (isKorea.value ? PM_KR : PM_INTL))
const buyLabel = computed(() => (isKorea.value ? t('pay.buy') : t('pay.buyPaypal')))

// ── 사용자 정보(/api/saju/manse: 양/음력·시 변환) ──
const info = ref(null)
const infoLoading = ref(false)
async function loadInfo() {
  if (!hasInput.value || !current.value) { info.value = null; return }
  infoLoading.value = true
  try {
    const c = current.value
    const res = await $fetch('/api/saju/manse', {
      method: 'POST',
      body: { year: c.year, month: c.month, day: c.day, hour: c.hour, minute: c.minute, calendar: c.calendar, gender: c.gender, name: c.name },
    })
    info.value = res?.user
      ? { name: res.user.name || c.name || '', solar: res.user.solar, lunar: res.user.lunar, hour: res.user.hour, gender: c.gender }
      : { name: c.name || '', solar: '', lunar: '', hour: '', gender: c.gender }
  } catch {
    info.value = null
  } finally {
    infoLoading.value = false
  }
}
onMounted(loadInfo)
watch(current, loadInfo, { deep: true })

// ── 샘플 보기: 무료 버전이 있는 서비스만 결과 미리보기로 이동 ──
const SAMPLE_FREE = { lifetime: 'hour', newyear: 'toJung' }
const sampleNote = ref('')
function onSample() {
  const m = SAMPLE_FREE[service.value]
  if (m) navigateTo(localePath({ path: '/result/free', query: { service: m } }))
  else sampleNote.value = t('pay.alert.sample')
}

// ── 환불정책 아코디언 ──
const refundOpen = ref(false)

// ── 결제 ──
// 국내(ko)=카드(API 개별연동 ck 키), 해외=PayPal(토스 위젯 gck 키) — 레거시 1.0과 동일 이원화.
const clientKey = computed(() => config.public.tossClientKey)
const widgetKey = computed(() => config.public.tossWidgetKey)
const payConfigured = computed(() => (isKorea.value ? !!clientKey.value : !!widgetKey.value))
const busy = ref(false)
const errorMsg = ref('')

// ── PayPal 위젯(해외): 페이지 진입 시 미리 렌더 → CTA에서 requestPayment ──
const paypalWidget = ref(null)
async function initPaypal() {
  if (typeof window === 'undefined' || isKorea.value || !widgetKey.value) return
  paypalWidget.value = null
  try {
    const { loadTossPayments, ANONYMOUS } = await import('@tosspayments/tosspayments-sdk')
    const tossPayments = await loadTossPayments(widgetKey.value)
    const widgets = tossPayments.widgets({ customerKey: user.value?.id || ANONYMOUS })
    // 표시용 초기 금액($1) — 실제 청구액은 주문 생성 후 setAmount로 갱신.
    await widgets.setAmount({ currency: 'USD', value: 1 })
    const box = document.getElementById('paypal-widget')
    if (box) box.innerHTML = ''
    await widgets.renderPaymentMethods({ selector: '#paypal-widget', variantKey: 'PAYPAL' })
    paypalWidget.value = widgets
  } catch (e) {
    console.error('PayPal widget init failed:', e)
  }
}
onMounted(initPaypal)
watch([isKorea, user], initPaypal)

async function pay() {
  if (busy.value) return
  errorMsg.value = ''
  if (!user.value) {
    navigateTo(localePath({ path: '/login', query: { reason: 'pro', redirect: route.fullPath } }))
    return
  }
  if (!hasInput.value) {
    navigateTo(localePath({ path: '/saju', query: { service: service.value } }))
    return
  }
  if (!payConfigured.value) return // 안내는 config-note가 상시 표시

  busy.value = true
  try {
    const method = isKorea.value ? 'card' : 'paypal'
    // 서버 주문 생성 — 금액·통화는 서버가 결정(card=KRW, paypal=USD).
    const order = await $fetch('/api/pay/order', {
      method: 'POST',
      body: {
        service: service.value,
        method,
        subject: current.value,
        partner: (partnerName.value || partnerId.value || partnerMbti.value)
          ? { name: partnerName.value, id: partnerId.value || null, kind: partnerKind.value, mbti: partnerMbti.value || undefined }
          : null,
      },
    })
    const successUrl = window.location.origin + localePath('/pay/success')
    const failUrl = window.location.origin + localePath('/pay/fail')

    if (method === 'card') {
      // 국내: 카드 결제(API 개별 연동)
      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk')
      const tossPayments = await loadTossPayments(clientKey.value)
      const payment = tossPayments.payment({ customerKey: user.value.id })
      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: order.currency, value: order.amount },
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl,
        failUrl,
        customerEmail: user.value.email,
      })
    } else {
      // 해외: PayPal(토스 위젯) — 레거시 1.0에서 검증된 파라미터 구조 그대로.
      const widgets = paypalWidget.value
      if (!widgets) {
        errorMsg.value = t('checkout.err.paypal')
        busy.value = false
        return
      }
      await widgets.setAmount({ currency: 'USD', value: order.amount })
      await widgets.requestPayment({
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl,
        failUrl,
        customerEmail: user.value.email,
        customerName: info.value?.name || 'Customer',
        foreignEasyPay: {
          country: 'US',
          products: [
            {
              name: order.orderName,
              quantity: 1,
              unitAmount: order.amount,
              currency: 'USD',
              description: 'AI-powered fortune telling service',
            },
          ],
          shipping: {
            fullName: info.value?.name || 'Customer',
            address: { country: 'US', line1: 'Online Service', area1: 'CA', area2: 'Online', postalCode: '00000' },
          },
        },
      })
    }
  } catch (e) {
    if (e?.code !== 'USER_CANCEL') errorMsg.value = e?.message || t('checkout.err.generic')
    busy.value = false
  }
}
</script>

<template>
  <main class="checkout">
    <!-- HERO -->
    <div class="hero">
      <div class="hero-stamp">{{ svc.glyph }}</div>
      <h1>{{ pick(svc.title) }}</h1>
      <p>{{ pick(svc.tagline) }}</p>
    </div>

    <div class="checkout-grid">
      <!-- LEFT: 상품 상세 -->
      <div class="col-main">
        <section class="card-box">
          <div class="card-title">
            <span class="ic">{{ svc.glyph }}</span>
            <span>{{ pick(svc.aboutTitle) }}</span>
          </div>
          <p class="about-desc">{{ pick(svc.aboutDesc) }}</p>
          <div class="feat-grid">
            <div v-for="(f, i) in svc.features" :key="i" class="feat">
              <span class="gl">{{ f.gl }}</span>
              <div class="feat-body">
                <span class="feat-t">{{ pick(f.t) }}</span>
                <span class="feat-d">{{ pick(f.d) }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- 환불 정책 -->
        <div class="refund" :class="{ open: refundOpen }">
          <button class="refund-head" :aria-expanded="refundOpen ? 'true' : 'false'" @click="refundOpen = !refundOpen">
            <span class="ic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2" /><path d="M2 8h20v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" /><path d="M7 14h4" /></svg>
            </span>
            <span class="ttl">{{ t('refund.title') }}</span>
            <span class="upd">{{ t('refund.updated') }}</span>
            <svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <div class="refund-body">
            <div class="refund-inner">
              <div class="rf-group ok">
                <div class="rf-group-title">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="20 6 9 17 4 12" /></svg>
                  <span>{{ t('refund.ok.title') }}</span>
                </div>
                <div v-for="n in 3" :key="`ok${n}`" class="rf-item">
                  <span class="mk">✓</span>
                  <div class="tx"><div class="t">{{ t(`refund.ok${n}.t`) }}</div><div class="d">{{ t(`refund.ok${n}.d`) }}</div></div>
                </div>
              </div>
              <div class="rf-group no">
                <div class="rf-group-title">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  <span>{{ t('refund.no.title') }}</span>
                </div>
                <div v-for="n in 3" :key="`no${n}`" class="rf-item">
                  <span class="mk">✕</span>
                  <div class="tx"><div class="t">{{ t(`refund.no${n}.t`) }}</div><div class="d">{{ t(`refund.no${n}.d`) }}</div></div>
                </div>
              </div>
              <div class="rf-flow">
                <div class="rf-flow-title">{{ t('refund.flow.title') }}</div>
                <div v-for="n in 3" :key="`fl${n}`" class="rf-step">
                  <span class="n">{{ n }}</span>
                  <div class="tx"><div class="t">{{ t(`refund.flow${n}.t`) }}</div><div class="d">{{ t(`refund.flow${n}.d`) }}</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT: 사용자 정보 + 결제 -->
      <div class="col-side">
        <!-- 사용자 정보 -->
        <section class="card-box">
          <div class="card-title">
            <span class="ic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            </span>
            <span>{{ t('pay.userInfo') }}</span>
            <NuxtLink :to="localePath({ path: '/saju', query: { service } })" class="edit">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              <span>{{ t('pay.editInfo') }}</span>
            </NuxtLink>
          </div>

          <div v-if="info" class="info-list">
            <div class="info-row"><span class="k">{{ t('pay.name') }}</span><span class="v">{{ info.name || t('checkout.you') }}</span></div>
            <div class="info-row"><span class="k">{{ t('pay.solar') }}</span><span class="v"><span class="mono">{{ info.solar || '—' }}</span></span></div>
            <div class="info-row"><span class="k">{{ t('pay.lunar') }}</span><span class="v"><span class="mono">{{ info.lunar || '—' }}</span></span></div>
            <div class="info-row"><span class="k">{{ t('pay.hour') }}</span><span class="v"><span class="mono">{{ info.hour || '—' }}</span></span></div>
            <div class="info-row"><span class="k">{{ t('pay.gender') }}</span><span class="v">{{ t(info.gender === 'f' ? 'pay.female' : 'pay.male') }}</span></div>
            <div v-if="partnerName" class="info-row"><span class="k">{{ t('checkout.subject') }}</span><span class="v">↔ {{ partnerName }}</span></div>
          </div>
          <div v-else class="info-gate">
            <p>{{ t('result.needInput') }}</p>
            <NuxtLink class="gate-btn" :to="localePath({ path: '/saju', query: { service } })">{{ t('result.needInput.cta') }}</NuxtLink>
          </div>
        </section>

        <!-- 가격 + 결제 -->
        <section class="card-box">
          <div class="price-box">
            <div class="price-left">
              <span class="price-badge">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>
                <span>{{ t('pay.priceLabel') }}</span>
              </span>
              <span class="price-sub">{{ t('pay.oneTime') }}</span>
            </div>
            <div class="price-right">
              <span class="price-old">{{ priceOld }}</span>
              <span v-if="isKorea" class="price-new">1,000<span class="unit">{{ t('pay.won') }}</span></span>
              <span v-else class="price-new"><span class="unit">$</span>1</span>
            </div>
          </div>

          <div class="pay-methods-label">{{ t('pay.methods') }}</div>
          <div class="pay-methods">
            <span v-for="[cls, dot] in methods" :key="cls" class="pm" :class="cls">
              <span class="dot">{{ dot }}</span><span>{{ t('pay.method.' + cls) }}</span>
            </span>
          </div>

          <!-- 해외: PayPal 위젯(토스) — 국내에서는 숨김 -->
          <div v-show="!isKorea && widgetKey" id="paypal-widget" class="paypal-box" />

          <div class="cta-row">
            <button class="btn btn-primary" :disabled="busy" @click="pay">
              <span>{{ busy ? t('auth.processing') : buyLabel }}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </button>
            <button class="btn btn-secondary" @click="onSample">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
              <span>{{ t('pay.sample') }}</span>
            </button>
          </div>

          <p v-if="!payConfigured" class="config-note">{{ t('checkout.err.config') }}</p>
          <p v-if="errorMsg" class="err">{{ errorMsg }}</p>
          <p v-if="sampleNote" class="sample-note">{{ sampleNote }}</p>

          <div class="notes">
            <div class="note">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
              <span>{{ t('pay.note.redirect') }}</span>
            </div>
            <div class="note">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
              <span>{{ t('pay.note.discount') }}</span>
            </div>
          </div>
        </section>

        <div class="trust">
          <div class="item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            <span>{{ t('pay.secure') }}</span>
          </div>
          <div class="item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            <span>{{ t('pay.instant') }}</span>
          </div>
          <div class="item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
            <span>{{ t('pay.refund') }}</span>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.checkout { max-width: 1120px; margin: 0 auto; padding: 110px var(--space-6) var(--space-24); }

/* Hero */
.hero { text-align: center; margin-bottom: var(--space-8); }
.hero-stamp {
  width: 80px; height: 80px; margin: 0 auto var(--space-6);
  display: flex; align-items: center; justify-content: center; border-radius: 50%;
  font-family: var(--font-display); font-size: 38px; font-weight: 700; color: var(--gold-light);
  background: radial-gradient(circle at 35% 30%, rgba(220,38,38,0.30), rgba(201,168,76,0.10));
  border: 2px solid var(--gold-border-strong); box-shadow: var(--shadow-glow);
}
.hero h1 { font-family: var(--font-display); font-size: clamp(1.75rem, 5vw, 2.5rem); font-weight: 700; letter-spacing: -0.02em; line-height: 1.15; margin-bottom: var(--space-3); }
.hero p { color: var(--text-secondary); font-size: var(--text-base); line-height: 1.7; max-width: 520px; margin: 0 auto; }

/* Two-column */
.checkout-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: var(--space-8); align-items: flex-start; }
.col-main { order: 1; display: flex; flex-direction: column; gap: var(--space-6); }
.col-side { order: 2; position: sticky; top: 96px; display: flex; flex-direction: column; gap: var(--space-6); }
@media (max-width: 980px) {
  .checkout-grid { grid-template-columns: 1fr; gap: var(--space-6); }
  .col-main { order: 2; }
  .col-side { order: 1; position: static; top: auto; }
}

/* Cards */
.card-box { background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-xl); padding: var(--space-8); box-shadow: inset 0 1px 0 rgba(240,208,128,0.08), 0 8px 32px rgba(0,0,0,0.4); }
.card-title { display: flex; align-items: center; gap: var(--space-3); font-family: var(--font-display); font-size: var(--text-lg); font-weight: 600; margin-bottom: var(--space-6); }
.card-title .ic { width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); background: var(--gold-soft); color: var(--gold-primary); font-family: var(--font-mono); }
.card-title .edit { margin-left: auto; font-size: var(--text-xs); font-family: var(--font-mono); letter-spacing: 0.05em; color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px; transition: color 0.2s; }
.card-title .edit:hover { color: var(--gold-primary); }

/* About + features */
.about-desc { color: var(--text-secondary); font-size: var(--text-base); line-height: 1.8; margin-bottom: var(--space-6); }
.feat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3); }
@media (max-width: 560px) { .feat-grid { grid-template-columns: 1fr; } }
.feat { display: flex; gap: var(--space-3); padding: var(--space-4); background: var(--bg-tertiary); border: 1px solid var(--gold-border); border-radius: var(--radius-md); transition: all 0.25s var(--ease-out); }
.feat:hover { border-color: var(--gold-primary); transform: translateY(-2px); }
.feat .gl { flex-shrink: 0; width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); border: 1px solid var(--gold-border); background: var(--bg-elevated); font-family: var(--font-mono); font-size: var(--text-xl); color: var(--gold-light); }
.feat-body { display: flex; flex-direction: column; gap: 2px; }
.feat-t { font-family: var(--font-display); font-size: var(--text-base); color: var(--text-primary); font-weight: 600; }
.feat-d { font-size: var(--text-xs); color: var(--text-muted); line-height: 1.5; }

/* User info */
.info-list { display: flex; flex-direction: column; }
.info-row { display: flex; align-items: center; padding: var(--space-3) 0; border-bottom: 1px solid rgba(201,168,76,0.12); gap: var(--space-4); }
.info-row:last-child { border-bottom: none; }
.info-row .k { flex: 0 0 110px; color: var(--text-muted); font-size: var(--text-sm); }
.info-row .v { color: var(--text-primary); font-size: var(--text-base); font-weight: 500; }
.info-row .v .mono { font-family: var(--font-mono); }
.info-gate { text-align: center; padding: var(--space-4) 0; }
.info-gate p { color: var(--text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-4); }
.gate-btn { display: inline-block; padding: 10px 20px; border-radius: var(--radius-md); border: 1px solid var(--gold-primary); background: var(--gold-soft); color: var(--gold-light); font-size: var(--text-sm); font-weight: 600; }

/* Price */
.price-box { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding: var(--space-6); border-radius: var(--radius-lg); background: linear-gradient(135deg, rgba(201,168,76,0.10), rgba(201,168,76,0.02)); border: 1px solid var(--gold-border-strong); flex-wrap: wrap; margin-bottom: var(--space-6); }
.price-left { display: flex; flex-direction: column; gap: 4px; }
.price-badge { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; font-size: var(--text-xs); font-weight: 700; letter-spacing: 0.05em; color: var(--accent-red); background: rgba(220,38,38,0.12); border: 1px solid rgba(220,38,38,0.3); padding: 3px 10px; border-radius: var(--radius-full); }
.price-sub { color: var(--text-muted); font-size: var(--text-xs); }
.price-right { display: flex; align-items: baseline; gap: var(--space-3); }
.price-old { color: var(--text-muted); text-decoration: line-through; font-size: var(--text-base); font-family: var(--font-mono); }
.price-new { font-family: var(--font-display); font-size: var(--text-4xl); font-weight: 700; color: var(--gold-light); line-height: 1; }
.price-new .unit { font-size: 0.42em; color: var(--text-secondary); margin-left: 2px; font-weight: 500; }

/* Payment methods */
.pay-methods-label { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.15em; text-transform: uppercase; color: var(--gold-primary); margin-bottom: var(--space-3); }
.pay-methods { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-6); }
.pm { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: var(--radius-md); border: 1px solid var(--gold-border); background: var(--bg-tertiary); font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary); }
.pm .dot { width: 16px; height: 16px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: #fff; }
.pm.naver .dot { background: #03C75A; }
.pm.kakao .dot { background: #FEE500; color: #391B1B; }
.pm.payco .dot { background: #FF1717; }
.pm.toss .dot { background: #0064FF; }
.pm.samsung .dot { background: #1428A0; }
.pm.apple .dot { background: #111; }
.pm.paypal .dot { background: #fff; color: #003087; font-style: italic; }
.pm.googlepay .dot { background: #fff; color: #4285F4; }
.pm.vbank .dot { background: var(--gold-deep); }
.pm.card .dot { background: var(--text-muted); }

/* CTA */
/* PayPal 위젯(해외) — 토스 위젯이 내부 UI를 렌더 */
.paypal-box { margin-bottom: var(--space-4); border-radius: var(--radius-md); overflow: hidden; }
.paypal-box:empty { display: none; }

.cta-row { display: flex; flex-direction: column; gap: var(--space-3); }
.cta-row .btn { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2); border-radius: var(--radius-md); font-weight: 700; transition: transform 0.15s var(--ease-out), box-shadow 0.2s, border-color 0.2s; }
.cta-row .btn-primary { padding: var(--space-4) var(--space-6); font-size: var(--text-lg); border: 1px solid var(--gold-primary); background: var(--gold-primary); color: var(--text-on-gold); box-shadow: 0 4px 16px rgba(201,168,76,0.20); }
.cta-row .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(201,168,76,0.30); }
.cta-row .btn-primary:disabled { opacity: 0.6; cursor: progress; transform: none; box-shadow: none; }
.cta-row .btn-secondary { padding: var(--space-3) var(--space-6); font-size: var(--text-base); border: 1px solid var(--gold-border); background: var(--bg-tertiary); color: var(--text-secondary); }
.cta-row .btn-secondary:hover { border-color: var(--gold-primary); color: var(--gold-light); }

.config-note { margin-top: var(--space-4); padding: var(--space-3) var(--space-4); border: 1px solid var(--gold-border); border-radius: var(--radius-md); background: var(--gold-soft); color: var(--gold-light); font-size: var(--text-sm); line-height: 1.5; }
.err { color: #F87171; font-size: var(--text-sm); text-align: center; margin-top: var(--space-4); }
.sample-note { color: var(--text-muted); font-size: var(--text-sm); text-align: center; margin-top: var(--space-3); }

/* Notes */
.notes { display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-6); }
.note { display: flex; align-items: flex-start; gap: var(--space-3); font-size: var(--text-sm); line-height: 1.6; }
.note svg { flex-shrink: 0; margin-top: 3px; color: var(--gold-primary); }
.note span { color: var(--text-secondary); }

/* Trust */
.trust { display: flex; gap: var(--space-6); justify-content: center; flex-wrap: wrap; }
.trust .item { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-xs); color: var(--text-muted); font-family: var(--font-mono); letter-spacing: 0.05em; }
.trust svg { color: var(--gold-primary); }

/* Refund accordion */
.refund { border: 1px solid var(--gold-border); border-radius: var(--radius-xl); background: var(--bg-secondary); overflow: hidden; }
.refund-head { width: 100%; display: flex; align-items: center; gap: var(--space-3); padding: var(--space-6); background: transparent; color: var(--text-primary); text-align: left; transition: background 0.2s; cursor: pointer; }
.refund-head:hover { background: var(--bg-tertiary); }
.refund-head .ic { width: 30px; height: 30px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); background: var(--gold-soft); color: var(--gold-primary); }
.refund-head .ttl { font-family: var(--font-display); font-size: var(--text-base); font-weight: 600; }
.refund-head .upd { font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); margin-left: auto; }
.refund-head .chev { flex-shrink: 0; color: var(--text-muted); transition: transform 0.3s var(--ease-out); }
.refund.open .refund-head .chev { transform: rotate(180deg); }
@media (max-width: 480px) { .refund-head .upd { display: none; } }
.refund-body { max-height: 0; overflow: hidden; transition: max-height 0.45s var(--ease-out); }
.refund.open .refund-body { max-height: 1600px; }
.refund-inner { padding: 0 var(--space-6) var(--space-6); display: flex; flex-direction: column; gap: var(--space-6); }
.rf-group .rf-group-title { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); font-weight: 700; letter-spacing: 0.03em; margin-bottom: var(--space-3); padding-top: var(--space-2); }
.rf-group.ok .rf-group-title { color: var(--accent-jade); }
.rf-group.no .rf-group-title { color: var(--accent-red); }
.rf-item { display: flex; gap: var(--space-3); padding: var(--space-3) 0; border-top: 1px solid rgba(201,168,76,0.1); }
.rf-item .mk { flex-shrink: 0; width: 20px; height: 20px; margin-top: 1px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 11px; font-weight: 800; }
.rf-group.ok .mk { background: rgba(16,185,129,0.15); color: var(--accent-jade); }
.rf-group.no .mk { background: rgba(220,38,38,0.13); color: var(--accent-red); }
.rf-item .tx .t { font-size: var(--text-sm); font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
.rf-item .tx .d { font-size: var(--text-xs); color: var(--text-muted); line-height: 1.6; }
.rf-flow { display: flex; flex-direction: column; gap: var(--space-3); }
.rf-flow-title { font-family: var(--font-display); font-size: var(--text-sm); font-weight: 600; color: var(--gold-light); margin-bottom: var(--space-1); }
.rf-step { display: flex; gap: var(--space-3); align-items: flex-start; }
.rf-step .n { flex-shrink: 0; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; border: 1px solid var(--gold-border-strong); font-family: var(--font-mono); font-size: 12px; color: var(--gold-light); background: var(--bg-tertiary); }
.rf-step .tx .t { font-size: var(--text-sm); font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
.rf-step .tx .d { font-size: var(--text-xs); color: var(--text-muted); line-height: 1.6; }
</style>
