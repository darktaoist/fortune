<script setup>
/**
 * 색인용 공개 운세 랜딩(SEO). 결과 페이지(noindex)와 분리된, 검색 유입을 받는 공개 페이지.
 * 본문은 i18n 키 `landing.<key>.*`에서 렌더하고, 가시 FAQ와 동일한 텍스트로
 * FAQPage JSON-LD를 emit한다(구조화 데이터 위반 회피). hreflang/canonical은
 * default 레이아웃의 useLocaleHead가 자동 주입하므로 여기서 손대지 않는다.
 *
 *   <FortuneLanding landing-key="tojung" glyph="秘" :cta-to="{ path:'/result/free', query:{ service:'toJung' } }" />
 */
const props = defineProps({
  landingKey: { type: String, required: true },
  glyph: { type: String, required: true },
  ctaTo: { type: [String, Object], required: true },
  // ISO 날짜(추첨 1회일)를 주면 히어로에 '제N회 이번주' 라인을 노출. 미지정 시 기능 off.
  // 회차는 base로부터 다가오는 토요일 추첨분을 결정적으로 계산(주간 자동 갱신, 별도 인프라 불필요).
  weeklyRoundBase: { type: String, default: '' },
  // { count, min, max }를 주면 미리보기 sampleBody의 {numbers} 자리에 날짜 시드 번호를 채운다.
  // 매일 결정적으로 바뀌며(신선도 신호), 서버·클라 같은 날짜 → 동일 결과(하이드레이션 안전).
  previewDraw: { type: Object, default: null },
})

const { t, locale } = useI18n()
const localePath = useLocalePath()

const k = (suffix) => `landing.${props.landingKey}.${suffix}`

// 미리보기 번호: previewDraw({count,min,max})가 있으면 오늘 날짜를 시드로 결정적 생성.
// 날짜(UTC) 기반이라 매일 바뀌고, 서버·클라가 같은 날이면 동일 → 하이드레이션 안전.
const previewNumbers = computed(() => {
  const d = props.previewDraw
  if (!d) return ''
  const now = new Date()
  const seedStr = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}#${props.landingKey}`
  let h = 1779033703 ^ seedStr.length
  for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19) }
  const rng = () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296 }
  const set = new Set()
  while (set.size < d.count) set.add(d.min + Math.floor(rng() * (d.max - d.min + 1)))
  return [...set].sort((a, b) => a - b).join(', ')
})

// 본문 블록: '\n'(빈 줄) 기준으로 문단 분리. 빈 문단은 버린다.
// {numbers}는 previewNumbers로 치환(해당 키가 없는 문단은 파라미터 무시).
const paras = (suffix) => t(k(suffix), { numbers: previewNumbers.value }).split('\n').map((s) => s.trim()).filter(Boolean)

const faq = computed(() =>
  [1, 2, 3, 4]
    .map((i) => ({ q: t(k(`faqQ${i}`)), a: t(k(`faqA${i}`)) }))
    // 비어있거나 키 미해석(키 문자열 그대로 반환) 항목 제외
    .filter((x) => x.q && x.a && !x.q.startsWith('landing.')),
)

const ctaLink = computed(() => localePath(props.ctaTo))
const sajuLink = computed(() => localePath('/saju'))

// 주간 회차(제N회) — weeklyRoundBase(추첨 1회일)로부터 '이번 주(다가오는) 토요일 추첨' 회차를
// 결정적으로 계산한다. 날짜 파생이라 매주 자동 갱신되며 외부 데이터/인프라가 필요 없다.
const weeklyRound = computed(() => {
  if (!props.weeklyRoundBase) return null
  const [by, bm, bd] = props.weeklyRoundBase.split('-').map(Number)
  const base = Date.UTC(by, (bm || 1) - 1, bd || 1)
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const dow = new Date(today).getUTCDay() // 0=일 … 6=토
  const sat = today + ((6 - dow + 7) % 7) * 86400000 // 이번 주 토요일(오늘이 토면 오늘)
  return Math.floor((sat - base) / (7 * 86400000)) + 1
})

// FAQPage JSON-LD — 가시 FAQ 텍스트를 그대로 미러링.
useHead(() => ({
  script: faq.value.length
    ? [{
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.value.map((x) => ({
            '@type': 'Question',
            name: x.q,
            acceptedAnswer: { '@type': 'Answer', text: x.a },
          })),
        }),
      }]
    : [],
}))
</script>

<template>
  <main class="landing container">
    <!-- HERO -->
    <header class="lp-hero">
      <div class="lp-stamp">{{ glyph }}</div>
      <h1 class="lp-h1">{{ t(k('h1')) }}</h1>
      <p v-for="(p, i) in paras('intro')" :key="'in' + i" class="lp-intro">{{ p }}</p>
      <p v-if="weeklyRound" class="lp-weekly">{{ t(k('weekly'), { round: weeklyRound }) }}</p>
      <div class="lp-cta">
        <NuxtLink :to="ctaLink" class="btn btn-primary btn-lg">{{ t(k('ctaLabel')) }}</NuxtLink>
        <NuxtLink :to="sajuLink" class="btn btn-secondary btn-lg">{{ t('landing.common.sajuCta') }}</NuxtLink>
      </div>
    </header>

    <!-- 이 운세란 -->
    <section class="lp-section">
      <h2 class="lp-h2">{{ t(k('whatTitle')) }}</h2>
      <p v-for="(p, i) in paras('whatBody')" :key="'wh' + i" class="lp-body">{{ p }}</p>
    </section>

    <!-- 보는 법 -->
    <section class="lp-section">
      <h2 class="lp-h2">{{ t(k('howTitle')) }}</h2>
      <p v-for="(p, i) in paras('howBody')" :key="'ho' + i" class="lp-body">{{ p }}</p>
    </section>

    <!-- 샘플 미리보기 -->
    <section class="lp-section lp-sample">
      <h2 class="lp-h2">{{ t(k('sampleTitle')) }}</h2>
      <div class="lp-sample-card">
        <p v-for="(p, i) in paras('sampleBody')" :key="'sa' + i" class="lp-body">{{ p }}</p>
      </div>
    </section>

    <!-- FAQ (가시 텍스트 = JSON-LD) -->
    <section v-if="faq.length" class="lp-section">
      <h2 class="lp-h2">{{ t('landing.common.faqTitle') }}</h2>
      <details v-for="(x, i) in faq" :key="'fq' + i" class="lp-faq">
        <summary>{{ x.q }}</summary>
        <p>{{ x.a }}</p>
      </details>
    </section>

    <!-- 하단 CTA -->
    <section class="lp-bottom">
      <h2 class="lp-h2">{{ t(k('h1')) }}</h2>
      <p class="lp-body">{{ t('landing.common.bottomCta') }}</p>
      <div class="lp-cta">
        <NuxtLink :to="ctaLink" class="btn btn-primary btn-lg">{{ t(k('ctaLabel')) }}</NuxtLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
.landing { padding: 112px var(--space-6) var(--space-24); max-width: 880px; }

.lp-hero { text-align: center; margin-bottom: var(--space-16); }
.lp-stamp { width: 64px; height: 64px; margin: 0 auto var(--space-5); display: flex; align-items: center; justify-content: center; border-radius: 50%; font-family: var(--font-display); font-size: 30px; color: var(--gold-light); background: radial-gradient(circle at 35% 30%, rgba(201, 168, 76, 0.30), rgba(201, 168, 76, 0.05)); border: 2px solid var(--gold-border-strong); box-shadow: var(--shadow-glow); }
.lp-h1 { font-family: var(--font-display); font-size: clamp(1.9rem, 4.5vw, 2.6rem); font-weight: 700; letter-spacing: -0.02em; line-height: 1.25; margin-bottom: var(--space-5); }
.lp-intro { color: var(--text-secondary); font-size: var(--text-lg); line-height: 1.8; max-width: 680px; margin: 0 auto var(--space-3); text-wrap: pretty; }
.lp-weekly { display: inline-block; margin: var(--space-2) auto 0; padding: var(--space-2) var(--space-5); border: 1px solid var(--gold-border-strong); border-radius: 999px; background: rgba(201, 168, 76, 0.08); color: var(--gold-light); font-size: var(--text-sm); font-weight: 600; line-height: 1.5; }
.lp-cta { display: flex; gap: var(--space-3); justify-content: center; flex-wrap: wrap; margin-top: var(--space-8); }

.lp-section { margin-bottom: var(--space-12); }
.lp-h2 { font-family: var(--font-display); font-size: clamp(1.3rem, 3vw, 1.7rem); font-weight: 700; letter-spacing: -0.01em; margin-bottom: var(--space-4); padding-bottom: var(--space-3); border-bottom: 1px solid var(--gold-border); }
.lp-body { color: var(--text-secondary); font-size: var(--text-base); line-height: 1.85; margin-bottom: var(--space-3); text-wrap: pretty; }

.lp-sample-card { padding: var(--space-6); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); background: var(--bg-secondary); }

.lp-faq { padding: var(--space-4) 0; border-bottom: 1px solid var(--gold-border); }
.lp-faq summary { font-family: var(--font-display); font-size: var(--text-base); font-weight: 600; color: var(--text-primary); cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); }
.lp-faq summary::after { content: '+'; color: var(--gold-primary); font-size: var(--text-xl); flex-shrink: 0; }
.lp-faq[open] summary::after { content: '−'; }
.lp-faq summary::-webkit-details-marker { display: none; }
.lp-faq p { margin-top: var(--space-3); color: var(--text-secondary); font-size: var(--text-base); line-height: 1.8; }

.lp-bottom { text-align: center; padding: var(--space-12) var(--space-6); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); background: var(--bg-secondary); }
.lp-bottom .lp-h2 { border-bottom: none; padding-bottom: 0; }
.lp-bottom .lp-body { max-width: 560px; margin: 0 auto var(--space-2); }

@media (max-width: 520px) { .landing { padding-top: 96px; } }
</style>
