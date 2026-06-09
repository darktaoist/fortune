<script setup>
// 자주 묻는 질문 — ported from FAQ.html. Real data via /api/faq.
// Header/tabbar from the default layout. Category chips use DB category names.
const { t, locale } = useI18n()
const localePath = useLocalePath()

useSeoMeta({
  title: () => `${t('faq.title')} · ${t('seo.titleSuffix')}`,
  description: () => t('faq.sub'),
})

const { data } = await useFetch('/api/faq', { query: { lang: locale } })

const cat = ref('all')
const query = ref('')
const openIds = ref(new Set())
function toggle(id) {
  const s = new Set(openIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  openIds.value = s
}

const allFaqs = computed(() => data.value?.faqs || [])
const chips = computed(() => {
  const cats = data.value?.categories || []
  const countFor = (code) => (code === 'all' ? allFaqs.value.length : allFaqs.value.filter((f) => f.cat === code).length)
  return [{ code: 'all', name: t('faq.cat.all'), n: countFor('all') }, ...cats.map((c) => ({ code: c.code, name: c.name, n: countFor(c.code) }))]
})
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return allFaqs.value.filter((f) => {
    if (cat.value !== 'all' && f.cat !== cat.value) return false
    if (!q) return true
    return f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
  })
})
watch([cat, query], () => { openIds.value = new Set() })
</script>

<template>
  <main class="faq-layout">
    <!-- LEFT RAIL -->
    <aside class="rail">
      <div class="page-head">
        <div class="stamp">問</div>
        <h1>{{ t('faq.title') }}</h1>
        <p>{{ t('faq.sub') }}</p>
      </div>

      <div class="search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <input v-model="query" type="text" :placeholder="t('faq.search')" />
      </div>

      <nav class="cats">
        <span class="cats-label">{{ t('faq.cats.label') }}</span>
        <div>
          <button v-for="c in chips" :key="c.code" class="cat" :class="{ active: cat === c.code }" @click="cat = c.code">
            <span>{{ c.name }}</span>
            <span class="n">{{ c.n }}</span>
          </button>
        </div>
      </nav>

      <div class="contact">
        <div class="contact-text">
          <h3>{{ t('faq.contact.title') }}</h3>
          <p>{{ t('faq.contact.sub') }}</p>
        </div>
        <NuxtLink class="btn btn-primary" :to="localePath('/support')">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
          <span>{{ t('faq.contact.btn') }}</span>
        </NuxtLink>
      </div>
    </aside>

    <!-- RIGHT: FAQ LIST -->
    <section class="faq-main">
      <div class="faq-list">
        <div v-for="f in filtered" :key="f.id" class="qa" :class="{ open: openIds.has(f.id) }">
          <button class="qa-q" :aria-expanded="openIds.has(f.id) ? 'true' : 'false'" @click="toggle(f.id)">
            <span class="mark">Q</span>
            <span class="qt">{{ f.q }}</span>
            <svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <div class="qa-a">
            <div class="qa-a-inner">{{ f.a }}</div>
          </div>
        </div>
      </div>

      <div class="empty" :class="{ show: filtered.length === 0 }">
        <span class="ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg></span>
        <h3>{{ t('faq.empty.title') }}</h3>
        <p>{{ t('faq.empty.sub') }}</p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.faq-layout { max-width: 1120px; margin: 0 auto; padding: 112px var(--space-8) var(--space-24); display: grid; grid-template-columns: 340px 1fr; gap: var(--space-16); align-items: start; }
.rail { position: sticky; top: 108px; display: flex; flex-direction: column; gap: var(--space-6); }

.page-head { text-align: left; }
.page-head .stamp { width: 64px; height: 64px; margin: 0 0 var(--space-6); display: flex; align-items: center; justify-content: center; border-radius: 50%; font-family: var(--font-display); font-size: 30px; color: var(--gold-light); background: radial-gradient(circle at 35% 30%, rgba(201, 168, 76, 0.30), rgba(201, 168, 76, 0.05)); border: 2px solid var(--gold-border-strong); box-shadow: var(--shadow-glow); }
.page-head h1 { font-family: var(--font-display); font-size: clamp(1.8rem, 2.6vw, 2.3rem); font-weight: 700; letter-spacing: -0.02em; line-height: 1.2; margin-bottom: var(--space-3); }
.page-head p { color: var(--text-secondary); font-size: var(--text-base); line-height: 1.7; text-wrap: pretty; }

.search { position: relative; }
.search svg { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.search input { width: 100%; padding: 14px 18px 14px 48px; border-radius: var(--radius-full); border: 1px solid var(--gold-border); background: var(--bg-secondary); color: var(--text-primary); font-family: var(--font-body); font-size: var(--text-base); transition: all 0.2s; }
.search input::placeholder { color: var(--text-muted); }
.search input:focus { outline: none; border-color: var(--gold-primary); box-shadow: 0 0 0 3px var(--gold-soft); }

.cats { display: flex; flex-direction: column; gap: var(--space-1); border-top: 1px solid var(--gold-border); padding-top: var(--space-4); }
.cats-label { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.22em; text-transform: uppercase; color: var(--text-muted); padding: 0 var(--space-3) var(--space-2); }
.cat { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); width: 100%; padding: 11px var(--space-4); border-radius: var(--radius-md); border: 1px solid transparent; color: var(--text-secondary); font-size: var(--text-sm); font-weight: 600; white-space: nowrap; transition: all 0.18s; }
.cat > span:first-child { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; text-align: left; }
.cat:hover { background: var(--bg-tertiary); color: var(--text-primary); }
.cat.active { background: var(--gold-soft); border-color: var(--gold-border); color: var(--gold-light); }
.cat .n { flex-shrink: 0; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); background: var(--bg-tertiary); border-radius: var(--radius-full); min-width: 24px; text-align: center; padding: 2px 7px; }
.cat.active .n { color: var(--gold-primary); background: rgba(201, 168, 76, 0.12); }

.faq-list { display: flex; flex-direction: column; gap: var(--space-3); }
.faq-main { min-width: 0; }
.qa { border: 1px solid var(--gold-border); border-radius: var(--radius-lg); background: var(--bg-secondary); overflow: hidden; transition: border-color 0.25s; }
.qa.open { border-color: var(--gold-border-strong); }
.qa-q { width: 100%; display: flex; align-items: center; gap: var(--space-4); padding: var(--space-6); text-align: left; color: var(--text-primary); transition: background 0.2s; cursor: pointer; }
.qa-q:hover { background: var(--bg-tertiary); }
.qa-q .mark { flex-shrink: 0; font-family: var(--font-display); font-weight: 700; font-size: var(--text-lg); color: var(--gold-primary); width: 22px; text-align: center; }
.qa-q .qt { flex: 1; font-family: var(--font-display); font-size: var(--text-lg); font-weight: 600; line-height: 1.45; }
.qa-q .chev { flex-shrink: 0; color: var(--text-muted); transition: transform 0.3s var(--ease-out), color 0.2s; }
.qa.open .qa-q .chev { transform: rotate(180deg); color: var(--gold-primary); }
.qa-a { max-height: 0; overflow: hidden; transition: max-height 0.4s var(--ease-out); }
.qa.open .qa-a { max-height: 800px; }
.qa-a-inner { padding: 0 var(--space-6) var(--space-6) calc(var(--space-6) + 22px + var(--space-4)); color: var(--text-secondary); font-size: var(--text-base); line-height: 1.8; white-space: pre-line; }

.empty { display: none; flex-direction: column; align-items: center; text-align: center; gap: var(--space-3); padding: var(--space-16) var(--space-6); border: 1px dashed var(--gold-border); border-radius: var(--radius-lg); color: var(--text-secondary); }
.empty.show { display: flex; }
.empty .ic { width: 52px; height: 52px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; border: 1px solid var(--gold-border); color: var(--gold-primary); background: var(--gold-soft); }
.empty h3 { font-family: var(--font-display); font-size: var(--text-xl); color: var(--text-primary); font-weight: 600; }
.empty p { font-size: var(--text-sm); color: var(--text-muted); }

.contact { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-4); padding: var(--space-6); border-radius: var(--radius-lg); background: linear-gradient(150deg, rgba(201, 168, 76, 0.12), rgba(201, 168, 76, 0.02)); border: 1px solid var(--gold-border-strong); }
.contact-text h3 { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
.contact-text p { color: var(--text-secondary); font-size: var(--text-sm); line-height: 1.6; }
.contact .btn { width: 100%; }

@media (max-width: 880px) {
  .faq-layout { grid-template-columns: 1fr; gap: var(--space-12); padding: 96px var(--space-6) var(--space-16); max-width: 720px; }
  .rail { position: static; }
  .page-head { text-align: center; }
  .page-head .stamp { margin-left: auto; margin-right: auto; }
}
@media (max-width: 520px) {
  .qa-q { padding: var(--space-4); gap: var(--space-3); }
  .qa-a-inner { padding-left: var(--space-4); padding-right: var(--space-4); }
}
</style>
