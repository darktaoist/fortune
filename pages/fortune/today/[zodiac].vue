<script setup>
// 띠별 오늘의 운세 — 프로그래매틱 SEO 랜딩(띠당 고정 URL 1개).
// URL은 영문 slug(/fortune/today/rabbit), 콘텐츠·메타·H1은 현지화 한글/각 언어.
// 날짜는 URL에 넣지 않는다: 항상 "오늘(서버 KST)"의 daily_horoscope 행을 조회해 렌더.
// 데이터는 기존 /api/horoscope(오늘 KST 12띠 + 폴백)를 그대로 재사용.
// 부분글로벌 — 검색 노출은 ko·ja·zh. en 페이지는 noindex(사이트맵은 urls.ts가 ko·ja·zh만 발행).
// (메뉴/내부 링크는 전 언어 그대로 유지 — SEO 레이어만 한정)
definePageMeta({ seoLocales: ['ko', 'ja', 'zh'] })
const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()

// 12지 정적 메타: slug(URL용 영문) ↔ zodiac_ko(DB 키). 이름/이모지/폴백 생년 보유.
// daily.vue와 동일 구조 + slug 필드. ko 값은 i18n 누수가드의 { ko:'…' } 키맵 패턴.
const ZODIAC = [
  { ko: '쥐', slug: 'rat', emoji: '🐭', years: '1948, 1960, 1972, 1984, 1996, 2008, 2020', name: { ko: '쥐띠', en: 'Rat', ja: 'ねずみ年', zh: '鼠' } },
  { ko: '소', slug: 'ox', emoji: '🐮', years: '1949, 1961, 1973, 1985, 1997, 2009, 2021', name: { ko: '소띠', en: 'Ox', ja: 'うし年', zh: '牛' } },
  { ko: '호랑이', slug: 'tiger', emoji: '🐯', years: '1950, 1962, 1974, 1986, 1998, 2010, 2022', name: { ko: '호랑이띠', en: 'Tiger', ja: 'とら年', zh: '虎' } },
  { ko: '토끼', slug: 'rabbit', emoji: '🐰', years: '1951, 1963, 1975, 1987, 1999, 2011, 2023', name: { ko: '토끼띠', en: 'Rabbit', ja: 'うさぎ年', zh: '兔' } },
  { ko: '용', slug: 'dragon', emoji: '🐲', years: '1952, 1964, 1976, 1988, 2000, 2012, 2024', name: { ko: '용띠', en: 'Dragon', ja: 'たつ年', zh: '龍' } },
  { ko: '뱀', slug: 'snake', emoji: '🐍', years: '1953, 1965, 1977, 1989, 2001, 2013, 2025', name: { ko: '뱀띠', en: 'Snake', ja: 'へび年', zh: '蛇' } },
  { ko: '말', slug: 'horse', emoji: '🐴', years: '1954, 1966, 1978, 1990, 2002, 2014', name: { ko: '말띠', en: 'Horse', ja: 'うま年', zh: '馬' } },
  { ko: '양', slug: 'goat', emoji: '🐑', years: '1955, 1967, 1979, 1991, 2003, 2015', name: { ko: '양띠', en: 'Goat', ja: 'ひつじ年', zh: '羊' } },
  { ko: '원숭이', slug: 'monkey', emoji: '🐵', years: '1956, 1968, 1980, 1992, 2004, 2016', name: { ko: '원숭이띠', en: 'Monkey', ja: 'さる年', zh: '猴' } },
  { ko: '닭', slug: 'rooster', emoji: '🐔', years: '1957, 1969, 1981, 1993, 2005, 2017', name: { ko: '닭띠', en: 'Rooster', ja: 'とり年', zh: '雞' } },
  { ko: '개', slug: 'dog', emoji: '🐶', years: '1958, 1970, 1982, 1994, 2006, 2018', name: { ko: '개띠', en: 'Dog', ja: 'いぬ年', zh: '狗' } },
  { ko: '돼지', slug: 'pig', emoji: '🐷', years: '1959, 1971, 1983, 1995, 2007, 2019', name: { ko: '돼지띠', en: 'Pig', ja: 'いのしし年', zh: '豬' } },
]

// slug 검증: 매핑에 없는 slug는 404(쓰레기 URL 색인 차단).
const current = ZODIAC.find((z) => z.slug === String(route.params.zodiac).toLowerCase())
if (!current) throw createError({ statusCode: 404, statusMessage: 'Unknown zodiac' })

const zname = computed(() => current.name[locale.value] || current.name.ko)

// 오늘(KST) 12띠 운세 — 기존 API 재사용 후 해당 띠 1개만 사용.
const { data } = await useFetch('/api/horoscope', {
  query: { lang: locale },
  key: () => `horoscope-${locale.value}`,
})
const row = computed(() => data.value?.byZodiac?.[current.ko] || null)
const content = computed(() => row.value?.content || '')
const years = computed(() => row.value?.birth_years || current.years)

const dateLabel = computed(() => {
  const d = data.value?.date
  if (!d) return ''
  const [y, m, day] = d.split('-').map(Number)
  const lg = locale.value
  if (lg === 'en') return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
  if (lg === 'ja' || lg === 'zh') return `${y}年${m}月${day}日`
  return `${y}년 ${m}월 ${day}일` // i18n-ok: ko fallback (en/ja/zh 위에서 처리)
})

// 페이지별 고유 SEO 메타(띠 이름 보간). canonical/hreflang은 레이아웃 useLocaleHead가 처리.
const seoTitle = computed(() => t('todayZodiac.seoTitle', { z: zname.value }))
const seoDesc = computed(() => t('todayZodiac.seoDesc', { z: zname.value }))
useSeoMeta({
  title: () => seoTitle.value,
  description: () => seoDesc.value,
  ogTitle: () => seoTitle.value,
  ogDescription: () => seoDesc.value,
  twitterTitle: () => seoTitle.value,
  twitterDescription: () => seoDesc.value,
})

// JSON-LD: Article + BreadcrumbList(홈 > 띠별 오늘의 운세 > 해당 띠).
const siteUrl = useSiteConfig().url.replace(/\/$/, '')
const pageUrl = computed(() => siteUrl + localePath(`/fortune/today/${current.slug}`))
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
          ...(data.value?.date ? { datePublished: data.value.date, dateModified: data.value.date } : {}),
          url: pageUrl.value,
          mainEntityOfPage: pageUrl.value,
          isPartOf: { '@type': 'WebSite', name: '타오운세', url: siteUrl },
          publisher: { '@type': 'Organization', name: '타오운세', url: siteUrl },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: t('nav.home'), item: siteUrl + localePath('/') },
            { '@type': 'ListItem', position: 2, name: t('daily.title'), item: siteUrl + localePath('/daily') },
            { '@type': 'ListItem', position: 3, name: t('todayZodiac.h1', { z: zname.value }), item: pageUrl.value },
          ],
        },
      ],
    }),
  }],
}))
</script>

<template>
  <main class="tz container">
    <!-- 히어로 -->
    <header class="tz-hero">
      <div class="tz-emoji">{{ current.emoji }}</div>
      <p class="tz-date">{{ dateLabel }}</p>
      <h1>{{ t('todayZodiac.h1', { z: zname }) }}</h1>
      <p class="tz-sub">{{ t('todayZodiac.subtitle', { z: zname }) }}</p>
    </header>

    <!-- 오늘 운세 본문 -->
    <article class="tz-card">
      <div class="tz-card-head">
        <span class="tz-card-emoji">{{ current.emoji }}</span>
        <div>
          <h2>{{ zname }}</h2>
          <p class="tz-years">{{ years }}</p>
        </div>
      </div>
      <p class="tz-content" :class="{ muted: !content }">{{ content || t('daily.noData') }}</p>
      <div v-if="row && row.color" class="tz-lucky">
        <span class="lk"><i class="swatch" :style="{ background: row.colorHex }" />{{ t('zodiac.luckyColor') }} · {{ row.color }}</span>
        <span class="lk">{{ t('zodiac.luckyNumber') }} · {{ row.num }}</span>
        <span class="lk">{{ t('zodiac.luckyDir') }} · {{ row.dir }}</span>
      </div>
    </article>

    <!-- CTA -->
    <div class="tz-cta">
      <NuxtLink :to="localePath('/saju')" class="btn btn-primary">{{ t('todayZodiac.ctaSaju') }}</NuxtLink>
      <NuxtLink :to="localePath('/daily')" class="btn btn-secondary">{{ t('todayZodiac.ctaAll') }}</NuxtLink>
    </div>

    <!-- 다른 띠(내부 링크 메시: 12 페이지 상호 연결) -->
    <nav class="tz-others" :aria-label="t('todayZodiac.others')">
      <p class="tz-others-label">{{ t('todayZodiac.others') }}</p>
      <div class="tz-chips">
        <NuxtLink
          v-for="z in ZODIAC"
          :key="z.slug"
          :to="localePath(`/fortune/today/${z.slug}`)"
          class="tz-chip"
          :class="{ active: z.slug === current.slug }"
        >{{ z.emoji }} {{ z.name[locale] || z.name.ko }}</NuxtLink>
      </div>
    </nav>
  </main>
</template>

<style scoped>
.tz { padding: 112px var(--space-6) var(--space-24); max-width: 760px; }

.tz-hero { text-align: center; margin-bottom: var(--space-8); }
.tz-emoji { font-size: 52px; line-height: 1; margin-bottom: var(--space-3); }
.tz-date { font-family: var(--font-mono); font-size: var(--text-sm); letter-spacing: 0.1em; color: var(--gold-primary); margin-bottom: var(--space-2); }
.tz-hero h1 { font-family: var(--font-display); font-size: clamp(1.7rem, 4vw, 2.3rem); font-weight: 700; letter-spacing: -0.02em; margin-bottom: var(--space-2); }
.tz-sub { color: var(--text-secondary); font-size: var(--text-base); }

.tz-card { padding: var(--space-6); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); background: var(--bg-secondary); margin-bottom: var(--space-6); }
.tz-card-head { display: flex; align-items: center; gap: var(--space-4); margin-bottom: var(--space-4); }
.tz-card-emoji { font-size: 32px; flex-shrink: 0; }
.tz-card-head h2 { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 700; }
.tz-years { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); margin-top: 2px; }
.tz-content { color: var(--text-secondary); font-size: var(--text-base); line-height: 1.85; text-wrap: pretty; }
.tz-content.muted { color: var(--text-muted); font-style: italic; }
.tz-lucky { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-5); margin-top: var(--space-4); padding-top: var(--space-3); border-top: 1px solid var(--gold-border); }
.tz-lucky .lk { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); }
.tz-lucky .swatch { width: 12px; height: 12px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.18); }

.tz-cta { display: flex; gap: var(--space-3); justify-content: center; flex-wrap: wrap; margin-bottom: var(--space-12); }

.tz-others { border-top: 1px solid var(--gold-border); padding-top: var(--space-6); }
.tz-others-label { font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary); margin-bottom: var(--space-4); text-align: center; }
.tz-chips { display: flex; flex-wrap: wrap; gap: var(--space-2); justify-content: center; }
.tz-chip { display: inline-flex; align-items: center; gap: 4px; padding: 8px 14px; border-radius: var(--radius-full); border: 1px solid var(--gold-border); background: var(--bg-secondary); color: var(--text-secondary); font-size: var(--text-sm); transition: all 0.18s; }
.tz-chip:hover { border-color: var(--gold-primary); color: var(--gold-light); background: var(--gold-soft); }
.tz-chip.active { border-color: var(--gold-primary); color: var(--text-on-gold); background: var(--gold-primary); font-weight: 600; }

@media (max-width: 520px) { .tz { padding-top: 96px; } }
</style>
