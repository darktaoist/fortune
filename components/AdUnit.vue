<script setup>
// Google AdSense 광고 유닛 — 무료 결과 페이지에서만 사용(유료 결과는 광고 없음).
// 1.0에서 포팅: 슬롯 5610413079(본문/하단), 1831451172(사이드바). 퍼블리셔 ID는 runtimeConfig.
// 클라이언트에서만 렌더·초기화(SSR 금지). 각 <ins>는 마운트 시 1회 push.
// 개발 환경(localhost)에서는 AdSense가 광고를 못 채워 영역이 접히므로 placeholder로 자리만 표시.
const props = defineProps({
  // 'slot'은 Vue 예약 속성이라 adSlot 사용.
  adSlot: { type: String, required: true },
  // 'fixed'면 고정 크기(사이드바 160x600 등), 아니면 반응형 자동.
  fixed: { type: Object, default: null }, // { width, height }
  format: { type: String, default: 'auto' },
})

const isDev = import.meta.dev
const client = useRuntimeConfig().public.adsenseClient

const insStyle = computed(() =>
  props.fixed
    ? `display:inline-block;width:${props.fixed.width}px;height:${props.fixed.height}px`
    : 'display:block',
)
const phStyle = computed(() =>
  props.fixed
    ? `width:${props.fixed.width}px;height:${props.fixed.height}px`
    : 'width:100%;min-height:90px',
)
const phSize = computed(() => (props.fixed ? `${props.fixed.width} × ${props.fixed.height}` : 'responsive'))

onMounted(() => {
  if (isDev || typeof window === 'undefined') return
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({})
  } catch { /* AdSense 미승인 도메인(로컬 등)에서는 조용히 무시 */ }
})
</script>

<template>
  <ClientOnly>
    <!-- 개발: 자리 표시 placeholder(운영에선 렌더 안 됨) -->
    <div v-if="isDev" class="ad-ph" :style="phStyle">
      <span class="ad-ph-tag">AD</span>
      <span class="ad-ph-glyph">廣</span>
      <span class="ad-ph-size">{{ phSize }}</span>
    </div>
    <!-- 운영: 실제 AdSense -->
    <ins
      v-else
      class="adsbygoogle ad-unit"
      :style="insStyle"
      :data-ad-client="client"
      :data-ad-slot="adSlot"
      :data-ad-format="fixed ? undefined : format"
      :data-full-width-responsive="fixed ? undefined : 'true'"
    />
  </ClientOnly>
</template>

<style scoped>
.ad-unit { display: block; }
.ad-ph {
  position: relative;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  background: repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.012) 0 10px, transparent 10px 20px), var(--bg-secondary);
  border: 1px dashed var(--gold-border); border-radius: var(--radius-md);
  color: var(--text-muted); overflow: hidden;
}
.ad-ph-tag { position: absolute; top: 8px; left: 8px; font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.18em; color: var(--text-muted); border: 1px solid var(--gold-border); border-radius: 4px; padding: 2px 6px; background: var(--bg-primary); }
.ad-ph-glyph { font-family: var(--font-display); font-size: 26px; color: var(--gold-deep); opacity: 0.7; }
.ad-ph-size { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.1em; }
</style>
