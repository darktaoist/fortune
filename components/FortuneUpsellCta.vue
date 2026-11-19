<script setup>
// 무료 결과 → 유료 상품 전환 CTA. 무료 운세 본문과 애드센스 사이에 삽입한다.
// copyKey로 i18n(upsell.<copyKey>.title/desc/cta)을 고르고, to로 대상 유료 상품
// 진입 경로를 받는다(useLocalePath 해석 + UTM 병합, 기존 service 쿼리 보존).
// 일반 컴포넌트(ClientOnly 미사용) → 마크업은 SSR로 렌더되어 내부링크로 나간다.
//
// dismissible=true면 닫기(escape hatch)가 붙고 sessionKey로 "세션당 1회"를 지킨다.
// 마킹 시점은 "첫 노출"이다(닫을 때가 아니라) — 무시하고 지나간 사용자가 세션 내
// 다른 무료 결과에서 같은 블록을 반복해 보지 않도록.
const props = defineProps({
  to: { type: [String, Object], required: true },
  copyKey: { type: String, required: true }, // newyear | lifetime | celeb | lotto | generic | *Gate
  product: { type: String, required: true }, // 애널리틱스 상품 식별자
  source: { type: String, required: true }, // 출발 페이지 (utm_content + 이벤트)
  variant: { type: String, default: 'context' }, // 'context' | 'generic'
  utm: { type: Object, default: null }, // UTM 오버라이드(미지정 시 기본 free_to_paid)
  eventParams: { type: Object, default: null }, // upsell_click에 병합할 추가 파라미터
  dismissible: { type: Boolean, default: false }, // 닫기 버튼 + 세션 가드 활성화
  sessionKey: { type: String, default: '' }, // sessionStorage 키(공유하면 세션 전체 1회)
  // >0이면 "닫기"에 기간 쿨다운이 붙는다(localStorage). 기본 0 = 기존 동작(세션 가드만).
  // 옵트인으로 둔 이유: 기본값을 바꾸면 today·tojung의 가드가 세션 1회에서 조용히 N일로 늘어난다.
  cooldownDays: { type: Number, default: 0 },
  // SERVICE_PRICES의 키. 주면 cta 라벨의 {price} 자리에 채운다(금액 원천은 shared/prices.ts 하나).
  priceKey: { type: String, default: '' },
  // 보조 버튼(선택). { to, labelKey, eventParams } — 주지 않으면(null) 기존 렌더·동작 그대로.
  // 주면 카드 전체 링크 대신 버튼 영역형으로 렌더하고 주/보조 두 링크를 나란히 둔다.
  // labelKey는 전체 i18n 키이며 {price} 자리는 priceKey 가격으로 채운다.
  // eventParams는 보조 버튼의 upsell_click에만, 카드 공통 eventParams 위에 병합된다.
  secondary: { type: Object, default: null },
})
const { t, te } = useI18n()
const localePath = useLocalePath()

const price = useServicePrice(() => props.priceKey)
const ctaLabel = computed(() => t(`upsell.${props.copyKey}.cta`, { price: price.value }))
// 근거 한 줄(선택). 해당 copyKey에 note 키가 있을 때만 렌더한다.
const noteKey = computed(() => `upsell.${props.copyKey}.note`)
const noteText = computed(() => (te(noteKey.value) ? t(noteKey.value) : ''))

const DEFAULT_UTM = { utm_source: 'internal', utm_medium: 'cta', utm_campaign: 'free_to_paid' }
function withUtm(to) {
  const base = typeof to === 'string' ? { path: to } : { ...to }
  base.query = { ...(base.query || {}), ...(props.utm || DEFAULT_UTM), utm_content: props.source }
  return localePath(base)
}
const resolvedTo = computed(() => withUtm(props.to))
const secondaryTo = computed(() => (props.secondary?.to ? withUtm(props.secondary.to) : null))
const secondaryLabel = computed(() => (props.secondary?.labelKey ? t(props.secondary.labelKey, { price: price.value }) : ''))
// 버튼 영역형: 닫기형이거나 보조 버튼이 있을 때(a 안에 또 다른 a/button은 무효 마크업).
const boxed = computed(() => props.dismissible || !!secondaryTo.value)

// SSR은 항상 노출(내부링크 유지). 클라이언트 부팅 후 세션 기록이 있으면 감춘다.
// 쿨다운(localStorage)도 여기서만 읽는다 — SSR에서 읽으면 내부링크를 잃고 하이드레이션이 어긋난다.
const hidden = ref(false)
const cooldownKey = computed(() => `${props.sessionKey}_until`)
onMounted(() => {
  if (!props.dismissible || !props.sessionKey) return
  try {
    if (props.cooldownDays > 0) {
      const until = Number(localStorage.getItem(cooldownKey.value) || 0)
      if (until > Date.now()) { hidden.value = true; return }
    }
    if (sessionStorage.getItem(props.sessionKey)) { hidden.value = true; return }
    sessionStorage.setItem(props.sessionKey, '1')
  } catch (e) {
    /* 시크릿 모드/쿼터 차단 — 가드 없이 그대로 노출 */
  }
})

function track(event, extra) {
  try {
    useTrackEvent(event, {
      product: props.product, source: props.source, variant: props.variant,
      ...(props.eventParams || {}), ...(extra || {}),
    })
  } catch (e) {
    /* gtag 미초기화(프리뷰/차단) 환경은 조용히 무시 */
  }
}
function onClick() { track('upsell_click') }
function onSecondaryClick() { track('upsell_click', props.secondary?.eventParams || null) }
function onDismiss() {
  hidden.value = true
  // 쿨다운은 "닫을 때" 기록한다(첫 노출 마킹과 별개) — 직접 닫은 사람만 N일 쉬게 한다.
  if (props.cooldownDays > 0 && props.sessionKey) {
    try {
      localStorage.setItem(cooldownKey.value, String(Date.now() + props.cooldownDays * 86400000))
    } catch (e) {
      /* 시크릿 모드/쿼터 차단 — 쿨다운 없이 세션 가드만 */
    }
  }
  track('upsell_dismiss')
}
</script>

<template>
  <!-- 닫기형·보조 버튼형: 카드 전체를 링크로 감싸지 않는다(a 안에 button/a는 무효 마크업) -->
  <div v-if="boxed" v-show="!hidden" class="upsell upsell-box">
    <span class="badge badge-pro upsell-badge">PRO</span>
    <div class="upsell-body">
      <h3 class="upsell-title">{{ t(`upsell.${copyKey}.title`) }}</h3>
      <p class="upsell-desc">{{ t(`upsell.${copyKey}.desc`) }}</p>
      <p v-if="noteText" class="upsell-note">{{ noteText }}</p>
    </div>
    <div class="upsell-actions">
      <NuxtLink class="upsell-cta" :to="resolvedTo" @click="onClick">
        {{ ctaLabel }}
        <span class="upsell-arrow">→</span>
      </NuxtLink>
      <NuxtLink v-if="secondaryTo" class="upsell-cta upsell-cta-secondary" :to="secondaryTo" @click="onSecondaryClick">
        {{ secondaryLabel }}
      </NuxtLink>
      <button v-if="dismissible" type="button" class="upsell-dismiss" @click="onDismiss">{{ t('upsell.dismiss') }}</button>
    </div>
  </div>

  <!-- 기존(상시 노출)형: 카드 전체가 링크 -->
  <NuxtLink v-else class="upsell" :to="resolvedTo" @click="onClick">
    <span class="badge badge-pro upsell-badge">PRO</span>
    <div class="upsell-body">
      <h3 class="upsell-title">{{ t(`upsell.${copyKey}.title`) }}</h3>
      <p class="upsell-desc">{{ t(`upsell.${copyKey}.desc`) }}</p>
      <p v-if="noteText" class="upsell-note">{{ noteText }}</p>
    </div>
    <span class="upsell-cta">
      {{ ctaLabel }}
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
a.upsell:hover {
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

.upsell-note {
  margin-top: var(--space-2);
  color: var(--text-muted);
  font-size: var(--text-xs);
  line-height: 1.6;
}
.upsell-note::before {
  content: '·';
  margin-right: 6px;
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

/* 보조 버튼 — 주 버튼보다 한 단계 낮은 위계(테두리형) */
.upsell-box .upsell-cta-secondary {
  background: none;
  color: var(--gold-light);
  border: 1px solid var(--gold-border-strong);
  box-shadow: none;
}
.upsell-box .upsell-cta-secondary:hover {
  border-color: var(--gold-primary);
  box-shadow: none;
}

/* 닫기형·보조 버튼형 — 주(CTA) / 종(보조·닫기) 위계 */
.upsell-box .upsell-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-4);
}
.upsell-box .upsell-cta {
  text-decoration: none;
  transition: box-shadow 0.2s var(--ease-out), transform 0.15s var(--ease-out);
}
.upsell-box .upsell-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(201, 168, 76, 0.32);
}
.upsell-dismiss {
  margin-top: var(--space-5);
  padding: var(--space-3) var(--space-4);
  background: none;
  border: none;
  color: var(--text-muted);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  cursor: pointer;
  border-bottom: 1px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}
.upsell-dismiss:hover {
  color: var(--text-secondary);
  border-bottom-color: var(--gold-border);
}
</style>
