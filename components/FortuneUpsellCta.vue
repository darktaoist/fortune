<script setup>
// 무료 결과 → 유료 상품 전환 CTA. 무료 운세 본문과 애드센스 사이에 삽입한다.
// copyKey로 i18n(upsell.<copyKey>.title/desc/cta)을 고르고, to로 대상 유료 상품
// 진입 경로를 받는다(useLocalePath 해석 + UTM 병합, 기존 service 쿼리 보존).
// 일반 컴포넌트(ClientOnly 미사용) → 마크업은 SSR로 렌더되어 내부링크로 나간다.
const props = defineProps({
  to: { type: [String, Object], required: true },
  copyKey: { type: String, required: true }, // newyear | lifetime | celeb | lotto | generic
  product: { type: String, required: true }, // 애널리틱스 상품 식별자
  source: { type: String, required: true }, // 출발 페이지 (utm_content + 이벤트)
  variant: { type: String, default: 'context' }, // 'context' | 'generic'
})
const { t } = useI18n()
const localePath = useLocalePath()

const UTM = { utm_source: 'internal', utm_medium: 'cta', utm_campaign: 'free_to_paid' }
const resolvedTo = computed(() => {
  const base = typeof props.to === 'string' ? { path: props.to } : { ...props.to }
  base.query = { ...(base.query || {}), ...UTM, utm_content: props.source }
  return localePath(base)
})

function onClick() {
  try {
    useTrackEvent('upsell_click', { product: props.product, source: props.source, variant: props.variant })
  } catch (e) {
    /* gtag 미초기화(프리뷰/차단) 환경은 조용히 무시 */
  }
}
</script>

<template>
  <NuxtLink class="upsell" :to="resolvedTo" @click="onClick">
    <span class="badge badge-pro upsell-badge">PRO</span>
    <div class="upsell-body">
      <h3 class="upsell-title">{{ t(`upsell.${copyKey}.title`) }}</h3>
      <p class="upsell-desc">{{ t(`upsell.${copyKey}.desc`) }}</p>
    </div>
    <span class="upsell-cta">
      {{ t(`upsell.${copyKey}.cta`) }}
      <span class="upsell-arrow">→</span>
    </span>
  </NuxtLink>
</template>

<style scoped>
.upsell {
  display: block;
  position: relative;
  text-decoration: none;
  color: inherit;
  margin: var(--space-6) 0;
  padding: var(--space-6);
  background:
    linear-gradient(135deg, rgba(201, 168, 76, 0.08) 0%, rgba(201, 168, 76, 0.02) 60%),
    var(--bg-secondary);
  border: 1px solid var(--gold-border-strong);
  border-radius: var(--radius-lg);
  transition: transform 0.3s var(--ease-out), border-color 0.3s var(--ease-out), box-shadow 0.3s var(--ease-out);
}
.upsell:hover {
  transform: translateY(-3px);
  border-color: var(--gold-primary);
  box-shadow: var(--shadow-glow);
}

.upsell-badge {
  margin-bottom: var(--space-3);
}

.upsell-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  letter-spacing: -0.01em;
  margin-bottom: var(--space-2);
  color: var(--gold-light);
}
.upsell-desc {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  line-height: 1.65;
}

.upsell-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: var(--space-5);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--gold-primary) 0%, var(--gold-light) 100%);
  color: var(--text-on-gold);
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--text-sm);
  box-shadow: 0 4px 16px rgba(201, 168, 76, 0.25);
}
.upsell-arrow {
  transition: transform 0.3s;
}
.upsell:hover .upsell-arrow {
  transform: translateX(4px);
}
</style>
