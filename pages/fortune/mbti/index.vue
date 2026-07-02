<script setup>
// MBTI 궁합 허브(목차) — 136개 조합 페이지(/fortune/mbti/[pair])를 묶는 내부링크 허브.
// 핵심: 136개 고유 URL 전부가 SSR HTML에 <a href>로 존재해야 한다(크롤러 색인용).
//  - 링크는 정적 16×16 타입 매트릭스에서 무조건 렌더(점수 fetch 실패와 무관).
//  - 슬러그는 항상 알파벳 오름차순 정규형([a,b].sort()) → 역순은 [pair]에서 404.
//  - 점수 뱃지는 장식: /api/mbti-compatibility-all(로케일별 점수) 성공 시에만 v-if로 표시.
// 글로벌 자산 → 4언어(ko/en/ja/zh) 전부 색인.
definePageMeta({ seoLocales: ['ko', 'en', 'ja', 'zh'] })

const { t, locale } = useI18n()
const localePath = useLocalePath()

const TYPES = ['ENFJ', 'ENFP', 'ENTJ', 'ENTP', 'ESFJ', 'ESFP', 'ESTJ', 'ESTP', 'INFJ', 'INFP', 'INTJ', 'INTP', 'ISFJ', 'ISFP', 'ISTJ', 'ISTP']
const canon = (a, b) => [a, b].sort().join('-') // 대문자 정규 pair 'INTJ-ISTP'
const label = (c) => c.replace('-', ' × ')

// 유형별 16링크(총 256, 고유 URL 136). 정적 — fetch와 독립.
const grid = TYPES.map((type) => ({
  type,
  links: TYPES.map((x) => {
    const c = canon(type, x)
    return { canonical: c, slug: c.toLowerCase(), label: label(c) }
  }),
}))

// 고유 136조합(i<=j) — TOP10 산출용.
const allPairs = []
for (let i = 0; i < TYPES.length; i++)
  for (let j = i; j < TYPES.length; j++) {
    const c = `${TYPES[i]}-${TYPES[j]}`
    allPairs.push({ canonical: c, slug: c.toLowerCase(), label: label(c) })
  }

// 로케일별 점수맵 { 'INTJ-ISTP': 78 }. 실패 시 {} → 링크는 그대로, 뱃지만 생략.
const { data } = await useFetch('/api/mbti-compatibility-all', {
  query: { lang: locale },
  key: () => `mbti-all-${locale.value}`,
})
const scores = computed(() => data.value?.scores || {})

// 점수 내림차순, 동점은 슬러그 오름차순(결정적) TOP10.
const top10 = computed(() =>
  allPairs
    .map((p) => ({ ...p, score: scores.value[p.canonical] }))
    .filter((p) => p.score != null)
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug))
    .slice(0, 10),
)

// SEO 메타 — canonical/hreflang은 레이아웃 useLocaleHead가 처리.
useSeoMeta({
  title: () => t('mbtiHub.seoTitle'),
  description: () => t('mbtiHub.seoDesc'),
  ogTitle: () => t('mbtiHub.seoTitle'),
  ogDescription: () => t('mbtiHub.seoDesc'),
  twitterTitle: () => t('mbtiHub.seoTitle'),
  twitterDescription: () => t('mbtiHub.seoDesc'),
})

const siteUrl = useSiteConfig().url.replace(/\/$/, '')
const pageUrl = computed(() => siteUrl + localePath('/fortune/mbti'))
useHead(() => ({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          name: t('mbtiHub.h1'),
          description: t('mbtiHub.seoDesc'),
          inLanguage: locale.value,
          url: pageUrl.value,
          isPartOf: { '@type': 'WebSite', name: '타오운세', url: siteUrl },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: t('nav.home'), item: siteUrl + localePath('/') },
            { '@type': 'ListItem', position: 2, name: t('mbtiHub.h1'), item: pageUrl.value },
          ],
        },
      ],
    }),
  }],
}))
</script>

<template>
  <main class="mh container">
    <header class="mh-hero">
      <p class="mh-kicker">{{ t('mbtiCompat.title') }}</p>
      <h1>{{ t('mbtiHub.h1') }}</h1>
      <div class="mh-intro">
        <p>{{ t('mbtiHub.intro1') }}</p>
        <p>{{ t('mbtiHub.intro2') }}</p>
        <p>{{ t('mbtiHub.intro3') }}</p>
      </div>
    </header>

    <!-- 인기 궁합 TOP 10 (점수 조회 성공 시에만) -->
    <section v-if="top10.length" class="mh-top">
      <h2>{{ t('mbtiHub.topTitle') }}</h2>
      <ol class="mh-top-list">
        <li v-for="(p, i) in top10" :key="p.slug">
          <NuxtLink :to="localePath(`/fortune/mbti/${p.slug}`)" class="mh-top-item">
            <span class="mh-rank">{{ i + 1 }}</span>
            <span class="mh-top-pair">{{ p.label }}</span>
            <span class="mh-score">{{ p.score }}</span>
          </NuxtLink>
        </li>
      </ol>
    </section>

    <!-- 전체 136조합 — 유형별 16링크(전부 SSR 렌더) -->
    <section class="mh-all">
      <h2>{{ t('mbtiHub.allTitle') }}</h2>
      <p class="mh-all-desc">{{ t('mbtiHub.allDesc') }}</p>
      <div class="mh-grid">
        <details v-for="g in grid" :key="g.type" class="mh-type">
          <summary class="mh-type-head">{{ g.type }}</summary>
          <ul class="mh-links">
            <li v-for="link in g.links" :key="link.slug">
              <NuxtLink :to="localePath(`/fortune/mbti/${link.slug}`)" class="mh-link">
                <span class="mh-link-label">{{ link.label }}</span>
                <span v-if="scores[link.canonical] != null" class="mh-badge">{{ scores[link.canonical] }}</span>
              </NuxtLink>
            </li>
          </ul>
        </details>
      </div>
    </section>
  </main>
</template>

<style scoped>
.mh { padding: 112px var(--space-6) var(--space-24); max-width: 880px; }

.mh-hero { text-align: center; margin-bottom: var(--space-10); }
.mh-kicker { font-family: var(--font-mono); font-size: var(--text-sm); letter-spacing: 0.12em; color: var(--gold-primary); margin-bottom: var(--space-2); text-transform: uppercase; }
.mh-hero h1 { font-family: var(--font-display); font-size: clamp(1.9rem, 4.6vw, 2.6rem); font-weight: 700; letter-spacing: -0.02em; margin-bottom: var(--space-5); }
.mh-intro { max-width: 640px; margin: 0 auto; display: flex; flex-direction: column; gap: var(--space-3); }
.mh-intro p { color: var(--text-secondary); font-size: var(--text-base); line-height: 1.85; text-wrap: pretty; }

.mh-top { margin-bottom: var(--space-12); }
.mh-top h2, .mh-all h2 { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 700; color: var(--gold-light); margin-bottom: var(--space-4); }
.mh-top-list { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-2); }
.mh-top-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); background: var(--bg-secondary); text-decoration: none; transition: border-color 0.15s; }
.mh-top-item:hover { border-color: var(--gold-primary); }
.mh-rank { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gold-primary); min-width: 1.4em; }
.mh-top-pair { flex: 1; font-family: var(--font-display); font-weight: 600; color: var(--text-primary); }
.mh-score { font-family: var(--font-mono); font-weight: 700; color: var(--gold-light); }

.mh-all-desc { color: var(--text-muted); font-size: var(--text-sm); margin-bottom: var(--space-5); }
.mh-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3); }
.mh-type { border: 1px solid var(--gold-border); border-radius: var(--radius-lg); background: var(--bg-secondary); overflow: hidden; }
.mh-type-head { cursor: pointer; padding: var(--space-4) var(--space-5); font-family: var(--font-display); font-weight: 700; letter-spacing: 0.04em; color: var(--gold-light); user-select: none; }
.mh-links { list-style: none; padding: 0 var(--space-3) var(--space-3); margin: 0; display: flex; flex-direction: column; gap: 2px; }
.mh-link { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); text-decoration: none; color: var(--text-secondary); transition: background 0.12s, color 0.12s; }
.mh-link:hover { background: var(--gold-soft); color: var(--text-primary); }
.mh-link-label { font-size: var(--text-sm); }
.mh-badge { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gold-primary); }

@media (max-width: 640px) {
  .mh { padding-top: 96px; }
  .mh-top-list, .mh-grid { grid-template-columns: 1fr; }
}
</style>
