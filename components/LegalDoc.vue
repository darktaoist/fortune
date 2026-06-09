<script setup>
// 법적 문서(이용약관/개인정보처리방침) 공용 레이아웃 — ported from
// 이용약관.html / 개인정보처리방침.html. 헤더/탭바는 레이아웃의 AppHeader가 제공.
// 본문은 다국어 데이터(data/terms.js·privacy.js)에서 렌더. 한국어가 정본.
//
// 두 문서의 구조 차이를 정규화해 흡수한다:
//   - terms:   { lead, chapters[{ id,title,articles[{id,title(+emphasize),blocks}] }] }
//   - privacy: { intro[], sections[{ id,title,blocks }] }  → 각 섹션을 제목 없는
//              article 하나로 감싼 chapter로 정규화(섹션 제목이 h2가 됨).
const props = defineProps({
  docKey: { type: String, required: true }, // 'terms' | 'privacy' (i18n prefix)
  stamp: { type: String, required: true }, // 約 / 私
  data: { type: Object, required: true },
})
const { t, locale } = useI18n()

function pick(o) {
  if (o == null) return ''
  if (typeof o === 'string') return o
  return o[locale.value] ?? o.ko ?? ''
}

useSeoMeta({
  title: () => `${t(props.docKey + '.title')} · ${t('seo.titleSuffix')}`,
  description: () => t(props.docKey + '.sub'),
})

// intro paragraphs (terms: [lead], privacy: intro[])
const intro = computed(() => {
  if (props.data.intro) return props.data.intro
  if (props.data.lead) return [props.data.lead]
  return []
})

// normalized groups: [{ id, title, articles:[{ id, title|null, emph, blocks }] }]
const groups = computed(() => {
  const d = props.data
  if (Array.isArray(d.chapters)) {
    return d.chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      articles: ch.articles.map((a) => ({ id: a.id, title: a.title, emph: !!(a.title && a.title.emphasize), blocks: a.blocks })),
    }))
  }
  // privacy: sections → single titleless article (section title is the group h2)
  return (d.sections || []).map((s) => ({
    id: s.id,
    title: s.title,
    articles: [{ id: s.id + '-body', title: null, emph: false, blocks: s.blocks }],
  }))
})

// TOC: chapters with titled article links; sections (no titled articles) link themselves
const toc = computed(() =>
  groups.value.map((g) => {
    const links = g.articles.filter((a) => a.title).map((a) => ({ id: a.id, title: a.title }))
    return { id: g.id, title: g.title, links }
  }),
)
// scroll-spy / scroll targets
const targetIds = computed(() => toc.value.flatMap((g) => (g.links.length ? g.links.map((l) => l.id) : [g.id])))

const dates = computed(() => props.data.dates || null)
const closing = computed(() => props.data.dates && props.data.dates.closing)

const active = ref('')
function go(id) {
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - 100
  window.scrollTo({ top, behavior: 'smooth' })
  history.replaceState(null, '', '#' + id)
}

let observer = null
onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      for (const en of entries) if (en.isIntersecting) active.value = en.target.id
    },
    { rootMargin: '-100px 0px -65% 0px', threshold: 0 },
  )
  for (const id of targetIds.value) {
    const el = document.getElementById(id)
    if (el) observer.observe(el)
  }
})
onBeforeUnmount(() => observer && observer.disconnect())
</script>

<template>
  <main class="terms-layout">
    <!-- LEFT RAIL / TOC -->
    <aside class="rail">
      <div class="rail-head">
        <div class="stamp">{{ stamp }}</div>
        <h1>{{ t(docKey + '.title') }}</h1>
      </div>
      <nav class="toc">
        <div class="toc-label">{{ t(docKey + '.toc') }}</div>
        <div class="toc-scroll">
          <div v-for="g in toc" :key="g.id" class="toc-chapter">
            <a v-if="!g.links.length" class="toc-ch-link" :class="{ active: active === g.id }" :href="'#' + g.id" @click.prevent="go(g.id)">{{ pick(g.title) }}</a>
            <template v-else>
              <div class="toc-ch-title">{{ pick(g.title) }}</div>
              <div class="toc-links">
                <a v-for="l in g.links" :key="l.id" :class="{ active: active === l.id }" :href="'#' + l.id" @click.prevent="go(l.id)">{{ pick(l.title) }}</a>
              </div>
            </template>
          </div>
        </div>
      </nav>
    </aside>

    <!-- DOCUMENT -->
    <div class="doc">
      <p class="doc-sub">{{ t(docKey + '.sub') }}</p>

      <div class="disclaimer">
        <span class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg></span>
        <p>{{ t(docKey + '.disclaimer') }}</p>
      </div>

      <div class="intro">
        <p v-for="(p, i) in intro" :key="i">{{ pick(p) }}</p>
      </div>

      <section v-for="g in groups" :id="g.id" :key="g.id" class="chapter">
        <h2>{{ pick(g.title) }}</h2>
        <article v-for="a in g.articles" :id="a.id" :key="a.id" class="article" :class="{ emph: a.emph }">
          <h3 v-if="a.title">{{ pick(a.title) }}</h3>
          <template v-for="(b, bi) in a.blocks" :key="bi">
            <p v-if="b.t === 'p'">{{ pick(b.v) }}</p>
            <ul v-else-if="b.t === 'list'">
              <li v-for="(it, ii) in b.items" :key="ii">
                {{ pick(it.v) }}
                <ul v-if="it.sub && it.sub.length">
                  <li v-for="(s, si) in it.sub" :key="si">{{ pick(s.v) }}</li>
                </ul>
              </li>
            </ul>
            <ol v-else-if="b.t === 'olist'" class="olist">
              <li v-for="(it, ii) in b.items" :key="ii">{{ pick(it.v) }}</li>
            </ol>
            <div v-else-if="b.t === 'table'" class="table-wrap">
              <table class="ptable">
                <thead><tr><th v-for="(h, hi) in b.head" :key="hi">{{ pick(h) }}</th></tr></thead>
                <tbody><tr v-for="(r, ri) in b.rows" :key="ri"><td v-for="(c, ci) in r" :key="ci">{{ pick(c) }}</td></tr></tbody>
              </table>
            </div>
            <div v-else-if="b.t === 'kv'" class="kv">
              <template v-for="(row, ri) in b.rows" :key="ri">
                <span class="kvk">{{ pick(row.k) }}</span>
                <span class="kvv">{{ pick(row.v) }}</span>
              </template>
            </div>
          </template>
        </article>
      </section>

      <div v-if="dates" class="dates">
        <div class="date-rows">
          <div class="date-item"><span class="dl">{{ pick(dates.noticeLabel) }}</span><span class="dv">{{ pick(dates.noticeDate) }}</span></div>
          <div class="date-item"><span class="dl">{{ pick(dates.effectiveLabel) }}</span><span class="dv">{{ pick(dates.effectiveDate) }}</span></div>
        </div>
        <p v-if="closing" class="closing">{{ pick(closing) }}</p>
      </div>
    </div>
  </main>
</template>

<style scoped>
.terms-layout { max-width: 1120px; margin: 0 auto; padding: 112px var(--space-8) var(--space-24); display: grid; grid-template-columns: 300px 1fr; gap: var(--space-16); align-items: start; }

/* Left rail / TOC */
.rail { position: sticky; top: 108px; max-height: calc(100vh - 132px); display: flex; flex-direction: column; gap: var(--space-6); }
.rail-head { display: flex; align-items: center; gap: var(--space-4); }
.rail-head .stamp { width: 52px; height: 52px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-family: var(--font-display); font-size: 24px; color: var(--gold-light); background: radial-gradient(circle at 35% 30%, rgba(201, 168, 76, 0.30), rgba(201, 168, 76, 0.05)); border: 2px solid var(--gold-border-strong); box-shadow: var(--shadow-glow); }
.rail-head h1 { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 700; letter-spacing: -0.02em; line-height: 1.3; }
.toc { display: flex; flex-direction: column; min-height: 0; }
.toc-label { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.22em; text-transform: uppercase; color: var(--text-muted); padding: 0 0 var(--space-3); border-bottom: 1px solid var(--gold-border); margin-bottom: var(--space-3); }
.toc-scroll { overflow-y: auto; padding-right: 6px; display: flex; flex-direction: column; gap: var(--space-4); }
.toc-chapter > .toc-ch-title { font-family: var(--font-display); font-size: var(--text-sm); font-weight: 700; color: var(--gold-light); margin-bottom: var(--space-2); }
.toc-links { display: flex; flex-direction: column; gap: 1px; }
.toc-links a, .toc-ch-link { display: block; padding: 7px var(--space-3); border-radius: var(--radius-sm); border-left: 2px solid transparent; font-size: var(--text-sm); color: var(--text-secondary); line-height: 1.4; transition: all 0.15s; }
.toc-ch-link { font-family: var(--font-display); font-weight: 700; }
.toc-links a:hover, .toc-ch-link:hover { background: var(--bg-tertiary); color: var(--text-primary); }
.toc-links a.active, .toc-ch-link.active { color: var(--gold-light); border-left-color: var(--gold-primary); background: var(--gold-soft); }

/* Document body */
.doc { min-width: 0; }
.doc-sub { color: var(--text-secondary); font-size: var(--text-lg); line-height: 1.7; margin-bottom: var(--space-8); text-wrap: pretty; }
.disclaimer { display: flex; gap: var(--space-4); padding: var(--space-6); border-radius: var(--radius-lg); background: linear-gradient(150deg, rgba(201, 168, 76, 0.12), rgba(201, 168, 76, 0.02)); border: 1px solid var(--gold-border-strong); margin-bottom: var(--space-12); }
.disclaimer .ic { flex-shrink: 0; color: var(--gold-primary); margin-top: 2px; }
.disclaimer p { font-size: var(--text-sm); color: var(--text-secondary); line-height: 1.7; }

.intro { padding-bottom: var(--space-10); margin-bottom: var(--space-10); border-bottom: 1px solid var(--gold-border); }
.intro p { font-size: var(--text-lg); line-height: 1.85; color: var(--text-primary); text-wrap: pretty; }
.intro p + p { margin-top: var(--space-5); }

.chapter { margin-bottom: var(--space-12); scroll-margin-top: 104px; }
.chapter > h2 { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 700; letter-spacing: -0.01em; color: var(--text-primary); padding-bottom: var(--space-4); margin-bottom: var(--space-6); border-bottom: 2px solid var(--gold-border-strong); }
.article { scroll-margin-top: 104px; margin-bottom: var(--space-8); }
.article > h3 { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 700; color: var(--gold-light); margin-bottom: var(--space-4); }
.article.emph { padding: var(--space-6) var(--space-6) var(--space-2); border: 1px solid var(--gold-border-strong); border-radius: var(--radius-lg); background: var(--bg-secondary); }
.article.emph > h3::before { content: '★'; color: var(--gold-primary); margin-right: 8px; font-size: 0.85em; }
.article p { color: var(--text-secondary); font-size: var(--text-base); line-height: 1.85; margin-bottom: var(--space-4); text-wrap: pretty; }
.article > ul { list-style: none; margin: 0 0 var(--space-4); padding: 0; display: flex; flex-direction: column; gap: 10px; }
.article > ul > li { position: relative; padding-left: var(--space-6); color: var(--text-secondary); font-size: var(--text-base); line-height: 1.75; }
.article > ul > li::before { content: ''; position: absolute; left: 8px; top: 0.7em; width: 5px; height: 5px; border-radius: 50%; background: var(--gold-primary); }
.article ul ul { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.article ul ul > li { position: relative; padding-left: var(--space-6); color: var(--text-muted); font-size: var(--text-sm); line-height: 1.7; }
.article ul ul > li::before { content: ''; position: absolute; left: 9px; top: 0.7em; width: 6px; height: 1.5px; background: var(--text-muted); }
.article ol.olist { list-style: none; counter-reset: oi; margin: 0 0 var(--space-4); padding: 0; display: flex; flex-direction: column; gap: 12px; }
.article ol.olist > li { position: relative; padding-left: var(--space-8); color: var(--text-secondary); font-size: var(--text-base); line-height: 1.75; counter-increment: oi; }
.article ol.olist > li::before { content: counter(oi); position: absolute; left: 0; top: 0.1em; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--gold-soft); border: 1px solid var(--gold-border-strong); color: var(--gold-light); font-family: var(--font-mono); font-size: 11px; font-weight: 600; }

/* table */
.table-wrap { overflow-x: auto; margin: 0 0 var(--space-4); border: 1px solid var(--gold-border); border-radius: var(--radius-md); }
table.ptable { width: 100%; border-collapse: collapse; min-width: 520px; font-size: var(--text-sm); }
table.ptable th, table.ptable td { padding: var(--space-3) var(--space-4); text-align: left; border-bottom: 1px solid var(--gold-border); vertical-align: top; line-height: 1.6; }
table.ptable thead th { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.08em; text-transform: uppercase; color: var(--gold-light); background: var(--bg-tertiary); }
table.ptable tbody td { color: var(--text-secondary); }
table.ptable tbody td:first-child { color: var(--text-primary); font-weight: 500; white-space: nowrap; }
table.ptable tbody tr:last-child td { border-bottom: none; }
table.ptable tbody tr:nth-child(even) td { background: rgba(255, 255, 255, 0.012); }

/* key-value */
.kv { display: grid; grid-template-columns: max-content 1fr; gap: var(--space-3) var(--space-8); padding: var(--space-6); margin: 0 0 var(--space-4); background: var(--bg-secondary); border: 1px solid var(--gold-border-strong); border-radius: var(--radius-lg); }
.kv .kvk { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); align-self: center; }
.kv .kvv { color: var(--text-primary); font-size: var(--text-base); font-weight: 500; }

/* dates footer */
.dates { margin-top: var(--space-16); padding-top: var(--space-8); border-top: 1px solid var(--gold-border); display: flex; flex-direction: column; gap: var(--space-5); }
.date-rows { display: flex; flex-wrap: wrap; gap: var(--space-8); }
.date-item { display: flex; flex-direction: column; gap: 4px; }
.date-item .dl { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.18em; text-transform: uppercase; color: var(--text-muted); }
.date-item .dv { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 600; color: var(--gold-light); }
.dates .closing { font-size: var(--text-sm); color: var(--text-muted); line-height: 1.7; }

@media (max-width: 920px) {
  .terms-layout { grid-template-columns: 1fr; gap: var(--space-8); padding: 96px var(--space-6) var(--space-16); max-width: 760px; }
  .rail { position: static; max-height: none; }
  .toc-scroll { max-height: 320px; }
}
</style>
