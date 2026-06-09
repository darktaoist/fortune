<script setup>
// 공개 후기 게시판(/reviews) — is_public=true 후기를 목록으로. 누구나 열람(SEO 색인).
// 첫 페이지는 SSR, "리뷰 더보기"로 client에서 다음 페이지 append. 서비스별 필터.
const { t } = useI18n()
const localePath = useLocalePath()
const supabase = useSupabaseClient()

useSeoMeta({
  title: () => `${t('reviews.title')} · ${t('seo.titleSuffix')}`,
  description: () => t('reviews.sub'),
  ogTitle: () => `${t('reviews.title')} · ${t('seo.titleSuffix')}`,
  ogDescription: () => t('reviews.sub'),
})

const FLAGS = { ko: '🇰🇷', en: '🇺🇸', ja: '🇯🇵', zh: '🇹🇼' }
const TYPE_LABELS = {
  today: 'free.today.title', tojung: 'free.tojung.title', date: 'free.date.title',
  lotto: 'free.lotto.title', month: 'free.month.title', hour: 'free.hour.title',
  lifetime: 'premium.life.title', celeb: 'premium.celeb.title', mbti: 'premium.mbti.title',
}
const SERVICE_OPTIONS = ['all', 'today', 'tojung', 'date', 'lotto', 'month', 'hour', 'lifetime', 'celeb', 'mbti']
function tagOf(k) { return TYPE_LABELS[k] ? t(TYPE_LABELS[k]) : k }
function flagOf(code) { return FLAGS[code] || '🌐' }
function fmtDate(s) {
  if (!s) return ''
  const d = new Date(s)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`
}

const PAGE = 12
const filterType = ref('all')

async function fetchPage(from) {
  let qb = supabase
    .from('reviews')
    .select('id,rating,text,author_name,locale,type_key,created_at', { count: 'exact' })
    .eq('is_public', true)
  if (filterType.value !== 'all') qb = qb.eq('type_key', filterType.value)
  const { data, count } = await qb.order('created_at', { ascending: false }).range(from, from + PAGE - 1)
  return { rows: data || [], count: count ?? 0 }
}

// 첫 페이지(필터 변경 시 재조회) — SSR 색인 가능.
const { data: first } = await useAsyncData('reviews-board', () => fetchPage(0), {
  default: () => ({ rows: [], count: 0 }),
  watch: [filterType],
})

const items = ref([])
const total = ref(0)
watchEffect(() => { items.value = (first.value?.rows || []).slice(); total.value = first.value?.count || 0 })

const loadingMore = ref(false)
async function loadMore() {
  if (loadingMore.value) return
  loadingMore.value = true
  const { rows } = await fetchPage(items.value.length)
  items.value.push(...rows)
  loadingMore.value = false
}
const hasMore = computed(() => items.value.length < total.value)
</script>

<template>
  <main class="reviews">
    <div class="container">
      <header class="page-head">
        <div class="eyebrow">{{ t('testi.eyebrow') }}</div>
        <h1 class="page-title">{{ t('reviews.title') }}</h1>
        <p class="page-sub">{{ t('reviews.sub') }}</p>
        <span class="count">{{ t('reviews.count').replace('{n}', total) }}</span>
      </header>

      <!-- 서비스 필터 -->
      <div class="filter-row">
        <button
          v-for="s in SERVICE_OPTIONS" :key="s" type="button" class="chip"
          :class="{ on: filterType === s }" @click="filterType = s"
        >{{ s === 'all' ? t('reviews.filter.all') : tagOf(s) }}</button>
      </div>

      <!-- 목록 -->
      <p v-if="!items.length" class="empty">{{ t('reviews.empty') }}</p>
      <ul v-else class="rlist">
        <li v-for="r in items" :key="r.id" class="rrow">
          <div class="rrow-left">
            <span class="flag">{{ flagOf(r.locale) }}</span>
          </div>
          <div class="rrow-body">
            <div class="rrow-top">
              <span class="stars">{{ '★'.repeat(r.rating) }}<span class="dim">{{ '★'.repeat(5 - r.rating) }}</span></span>
              <span class="tag">{{ tagOf(r.type_key) }}</span>
            </div>
            <p v-if="r.text" class="rtext">{{ r.text }}</p>
            <div class="rmeta">
              <span class="who">{{ r.author_name || t('testi.anon') }}</span>
              <span class="dot">·</span>
              <span class="date">{{ fmtDate(r.created_at) }}</span>
            </div>
          </div>
        </li>
      </ul>

      <!-- 더보기 -->
      <div v-if="hasMore" class="more-wrap">
        <button class="more-btn" :disabled="loadingMore" @click="loadMore">
          {{ loadingMore ? t('auth.processing') : t('reviews.more') }}
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.reviews { min-height: 100vh; padding: 110px 0 var(--space-16); }
.container { max-width: 820px; margin: 0 auto; padding: 0 var(--space-6); }

.page-head { text-align: center; margin-bottom: var(--space-8); }
.eyebrow { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold-primary); margin-bottom: var(--space-3); }
.page-title { font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 600; letter-spacing: -0.02em; margin-bottom: var(--space-2); }
.page-sub { color: var(--text-secondary); font-size: var(--text-base); }
.count { display: inline-block; margin-top: var(--space-3); font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); }

/* filter chips */
.filter-row { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: var(--space-8); }
.chip { padding: 7px 14px; border-radius: 999px; border: 1px solid var(--gold-border); background: var(--bg-secondary); color: var(--text-secondary); font-size: var(--text-sm); transition: all 0.2s; }
.chip:hover { border-color: var(--gold-primary); color: var(--gold-light); }
.chip.on { background: var(--gold-soft); border-color: var(--gold-primary); color: var(--gold-light); font-weight: 600; }

.empty { text-align: center; color: var(--text-muted); font-size: var(--text-sm); padding: var(--space-16) 0; }

/* list */
.rlist { display: flex; flex-direction: column; gap: var(--space-4); }
.rrow { display: flex; gap: var(--space-4); padding: var(--space-6); background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); }
.rrow-left { flex-shrink: 0; }
.flag { font-size: 1.6rem; line-height: 1; }
.rrow-body { flex: 1; min-width: 0; }
.rrow-top { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-2); }
.stars { color: var(--gold-primary); letter-spacing: 1px; font-size: var(--text-sm); }
.stars .dim { color: var(--gold-border); }
.tag { font-size: var(--text-xs); color: var(--text-muted); padding: 3px 10px; border: 1px solid var(--gold-border); border-radius: 999px; white-space: nowrap; }
.rtext { font-size: var(--text-base); color: var(--text-primary); line-height: 1.7; margin-bottom: var(--space-3); }
.rmeta { display: flex; align-items: center; gap: 8px; font-size: var(--text-xs); color: var(--text-muted); }
.rmeta .who { font-weight: 600; color: var(--text-secondary); }
.dot { opacity: 0.5; }

/* more */
.more-wrap { display: flex; justify-content: center; margin-top: var(--space-8); }
.more-btn { padding: 12px 28px; border-radius: var(--radius-md); border: 1px solid var(--gold-border); background: var(--bg-secondary); color: var(--text-secondary); font-size: var(--text-sm); font-weight: 600; transition: all 0.2s; }
.more-btn:hover { border-color: var(--gold-primary); color: var(--gold-light); background: var(--gold-soft); }
.more-btn:disabled { opacity: 0.6; cursor: progress; }

@media (max-width: 560px) {
  .rrow { padding: var(--space-5); }
  .rtext { font-size: var(--text-sm); }
}
</style>
