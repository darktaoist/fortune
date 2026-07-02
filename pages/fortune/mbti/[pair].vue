<script setup>
// MBTI×MBTI 궁합 — 프로그래매틱 SEO 랜딩(조합당 고정 URL 1개).
// URL 슬러그는 알파벳 오름차순 소문자(/fortune/mbti/intj-istp), 콘텐츠·메타는 각 언어로.
// 글로벌 자산이라 4언어(ko/en/ja/zh) 전부 색인 → seoLocales 미설정(레이아웃이 4언어 hreflang 발행).
// 데이터: 사전 생성된 mbti_compatibility(/api/mbti-compatibility) 조회.
const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()

const TYPES = ['ENFJ', 'ENFP', 'ENTJ', 'ENTP', 'ESFJ', 'ESFP', 'ESTJ', 'ESTP', 'INFJ', 'INFP', 'INTJ', 'INTP', 'ISFJ', 'ISFP', 'ISTJ', 'ISTP']
const TYPESET = new Set(TYPES)

// 슬러그 검증 + 정규화. 알파벳 오름차순 'INTJ-ISTP'만 유효(중복 URL 방지).
const rawSlug = String(route.params.pair || '').toLowerCase()
const parts = rawSlug.toUpperCase().split('-')
const valid = parts.length === 2 && TYPESET.has(parts[0]) && TYPESET.has(parts[1])
const canonical = valid ? [parts[0], parts[1]].sort().join('-') : null
// 비정규(순서 뒤바뀜·대문자·쓰레기) URL은 404 — 정규 슬러그 1개만 색인.
if (!canonical || rawSlug !== canonical.toLowerCase()) throw createError({ statusCode: 404, statusMessage: 'Unknown MBTI pair' })

const typeA = canonical.split('-')[0]
const typeB = canonical.split('-')[1]
const pairLabel = `${typeA} × ${typeB}`
const samePair = typeA === typeB

// 관련 궁합 — 현재 두 유형이 각각 포함된 다른 조합을 정적 계산(DB 조회 없음).
// A/B 목록을 교차로 뽑아 균형있게 6개. 슬러그는 정규형([a,b].sort()) → 역순 404 회피.
const relatedPairs = (() => {
  if (!canonical) return []
  const listFor = (base) => TYPES.map((x) => [base, x].sort().join('-')).filter((c) => c !== canonical)
  const a = listFor(typeA)
  const b = listFor(typeB)
  const seen = new Set()
  const out = []
  for (let i = 0; i < Math.max(a.length, b.length) && out.length < 6; i++) {
    for (const c of [a[i], b[i]]) {
      if (c && !seen.has(c) && out.length < 6) {
        seen.add(c)
        out.push({ slug: c.toLowerCase(), label: c.replace('-', ' × ') })
      }
    }
  }
  return out
})()

const { data } = await useFetch('/api/mbti-compatibility', {
  query: { pair: canonical, lang: locale },
  key: () => `mbti-${canonical}-${locale.value}`,
})
const sections = computed(() => data.value?.sections || [])
const score = computed(() => data.value?.score ?? null)
const found = computed(() => !!data.value?.found && sections.value.length > 0)

// 페이지별 고유 SEO 메타(조합 보간). canonical/hreflang은 레이아웃 useLocaleHead가 처리.
const seoTitle = computed(() => t('mbtiCompat.seoTitle', { pair: pairLabel }))
const seoDesc = computed(() => t('mbtiCompat.seoDesc', { pair: pairLabel }))
useSeoMeta({
  title: () => seoTitle.value,
  description: () => seoDesc.value,
  ogTitle: () => seoTitle.value,
  ogDescription: () => seoDesc.value,
  twitterTitle: () => seoTitle.value,
  twitterDescription: () => seoDesc.value,
})

const siteUrl = useSiteConfig().url.replace(/\/$/, '')
const pageUrl = computed(() => siteUrl + localePath(`/fortune/mbti/${canonical.toLowerCase()}`))
useHead(() => ({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          headline: seoTitle.value,
          description: seoDesc.value,
          inLanguage: locale.value,
          url: pageUrl.value,
          mainEntityOfPage: pageUrl.value,
          isPartOf: { '@type': 'WebSite', name: '타오운세', url: siteUrl },
          publisher: { '@type': 'Organization', name: '타오운세', url: siteUrl },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: t('nav.home'), item: siteUrl + localePath('/') },
            { '@type': 'ListItem', position: 2, name: t('mbtiCompat.h1', { pair: pairLabel }), item: pageUrl.value },
          ],
        },
      ],
    }),
  }],
}))
</script>

<template>
  <main class="mc container">
    <NuxtLink :to="localePath('/fortune/mbti')" class="mc-back">{{ t('mbtiHub.backToHub') }}</NuxtLink>

    <header class="mc-hero">
      <p class="mc-kicker">{{ t('mbtiCompat.title') }}</p>
      <h1>{{ t('mbtiCompat.h1', { pair: pairLabel }) }}</h1>
      <p class="mc-sub">{{ samePair ? t('mbtiCompat.subtitleSame', { type: typeA }) : t('mbtiCompat.subtitle', { a: typeA, b: typeB }) }}</p>
      <div v-if="score != null" class="mc-score">
        <span class="mc-score-num">{{ score }}</span>
        <span class="mc-score-unit">/ 100</span>
        <span class="mc-score-label">{{ t('mbtiCompat.scoreLabel') }}</span>
      </div>
    </header>

    <article v-if="found" class="mc-body">
      <section v-for="s in sections" :key="s.key" class="mc-sec">
        <h2>{{ t(`premium.mbtigh.${s.key}`) }}</h2>
        <p class="mc-text">{{ s.body }}</p>
      </section>
    </article>

    <p v-else class="mc-empty">{{ t('mbtiCompat.preparing') }}</p>

    <section v-if="relatedPairs.length" class="mc-related">
      <h2>{{ t('mbtiHub.relatedTitle') }}</h2>
      <div class="mc-related-links">
        <NuxtLink v-for="r in relatedPairs" :key="r.slug" :to="localePath(`/fortune/mbti/${r.slug}`)" class="mc-related-link">{{ r.label }}</NuxtLink>
      </div>
    </section>

    <div class="mc-cta">
      <NuxtLink :to="localePath('/saju')" class="btn btn-primary">{{ t('mbtiCompat.ctaSaju') }}</NuxtLink>
      <NuxtLink :to="localePath('/fortune/mbti')" class="btn btn-ghost">{{ t('mbtiHub.backToHub') }}</NuxtLink>
    </div>
  </main>
</template>

<style scoped>
.mc { padding: 112px var(--space-6) var(--space-24); max-width: 760px; }

.mc-hero { text-align: center; margin-bottom: var(--space-8); }
.mc-kicker { font-family: var(--font-mono); font-size: var(--text-sm); letter-spacing: 0.12em; color: var(--gold-primary); margin-bottom: var(--space-2); text-transform: uppercase; }
.mc-hero h1 { font-family: var(--font-display); font-size: clamp(1.8rem, 4.4vw, 2.5rem); font-weight: 700; letter-spacing: -0.02em; margin-bottom: var(--space-2); }
.mc-sub { color: var(--text-secondary); font-size: var(--text-base); }

.mc-score { display: inline-flex; align-items: baseline; gap: 6px; margin-top: var(--space-5); padding: var(--space-3) var(--space-6); border: 1px solid var(--gold-border); border-radius: var(--radius-full); background: var(--gold-soft); }
.mc-score-num { font-family: var(--font-display); font-size: 2.2rem; font-weight: 800; color: var(--gold-light); line-height: 1; }
.mc-score-unit { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--text-muted); }
.mc-score-label { font-size: var(--text-sm); color: var(--text-secondary); margin-left: var(--space-2); }

.mc-body { display: flex; flex-direction: column; gap: var(--space-6); }
.mc-sec { padding: var(--space-6); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); background: var(--bg-secondary); }
.mc-sec h2 { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 700; margin-bottom: var(--space-3); color: var(--gold-light); }
.mc-text { color: var(--text-secondary); font-size: var(--text-base); line-height: 1.85; white-space: pre-line; text-wrap: pretty; }

.mc-empty { text-align: center; color: var(--text-muted); font-style: italic; padding: var(--space-12) 0; }

.mc-back { display: inline-block; margin-bottom: var(--space-6); font-size: var(--text-sm); color: var(--text-muted); text-decoration: none; transition: color 0.15s; }
.mc-back:hover { color: var(--gold-primary); }

.mc-related { margin-top: var(--space-12); }
.mc-related h2 { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 700; color: var(--gold-light); margin-bottom: var(--space-4); text-align: center; }
.mc-related-links { display: flex; flex-wrap: wrap; gap: var(--space-2); justify-content: center; }
.mc-related-link { padding: var(--space-2) var(--space-4); border: 1px solid var(--gold-border); border-radius: var(--radius-full); background: var(--bg-secondary); color: var(--text-secondary); font-size: var(--text-sm); text-decoration: none; transition: border-color 0.15s, color 0.15s; }
.mc-related-link:hover { border-color: var(--gold-primary); color: var(--text-primary); }

.mc-cta { display: flex; gap: var(--space-3); justify-content: center; flex-wrap: wrap; margin-top: var(--space-12); }

@media (max-width: 520px) { .mc { padding-top: 96px; } }
</style>
