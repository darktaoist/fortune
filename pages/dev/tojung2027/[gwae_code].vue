<script setup>
/**
 * 2027 토정비결 파일럿 미리보기 — 개발 서버 전용(nuxt.config $production.ignore로
 * production 빌드에서 제외 → 404). 데이터는 /api/dev/tojung2027/:gwae 가 service role로
 * draft까지 읽어 내려준다. 디자인은 pages/result/free.vue 토정비결 섹션을 재사용.
 * 라벨은 기존 i18n 키를 쓰고, 키가 없는 것(좋은 달/조심할 달/조언)은 한자 글리프로 대신한다.
 */
definePageMeta({ seoLocales: [] }) // 전 로케일 noindex(layouts/default.vue)

const { t, locale } = useI18n()
const route = useRoute()
const code = computed(() => String(route.params.gwae_code || ''))

const { data, error } = await useFetch(() => `/api/dev/tojung2027/${code.value}`, { query: { lang: computed(() => String(route.query.lang || 'ko')) } })
const y = computed(() => data.value?.yearly)
const months = computed(() => data.value?.months || [])

const monthLabel = (n) => (locale.value === 'ko' ? `${n}월` : `${n}月`)
const stars = (g) => '★'.repeat(g || 0) + '☆'.repeat(5 - (g || 0))
const sections = computed(() => {
  if (!y.value) return []
  return [
    { glyph: '財', title: t('pro.sec.wealth'), body: y.value.wealth },
    { glyph: '職', title: t('pro.sec.career'), body: y.value.career },
    { glyph: '愛', title: t('pro.sec.love'), body: y.value.love },
    { glyph: '健', title: t('pro.sec.health'), body: y.value.health },
    { glyph: '家', title: t('cel.rel.family'), body: y.value.family },
    { glyph: '戒', title: t('pro.sec.caution'), body: y.value.caution },
  ].filter((s) => s.body)
})
const subRows = (m) => [
  ['財', m.wealth], ['職', m.career], ['愛', m.love], ['健', m.health],
].filter(([, v]) => v)
</script>

<template>
  <main class="result container">
    <div class="result-hero">
      <div class="dev-tag">DEV PREVIEW · draft · 2027 · {{ code }}</div>
      <div class="stamp">秘</div>
      <h1 v-if="y">{{ y.headline }}</h1>
      <span v-if="y" class="ganji">丁未 2027 · {{ stars(y.grade) }}</span>
    </div>

    <div class="main-col">
      <div v-if="error" class="need-input"><p>{{ error.statusCode }} · {{ error.statusMessage || error.message }}</p></div>

      <template v-else-if="y">
        <div class="info-card">
          <p class="summary">{{ y.summary }}</p>
          <div class="month-tags">
            <div class="mt-row"><span class="mt-k good">吉</span><span v-for="n in y.good_months" :key="'g' + n" class="mt-chip good">{{ monthLabel(n) }}</span></div>
            <div class="mt-row"><span class="mt-k bad">凶</span><span v-for="n in y.bad_months" :key="'b' + n" class="mt-chip bad">{{ monthLabel(n) }}</span></div>
          </div>
          <div v-if="y.lucky" class="lucky">
            <span><b>{{ t('result.lucky.color') }}</b> {{ (y.lucky.colors || []).join(', ') }}</span>
            <span><b>{{ t('result.lucky.num') }}</b> {{ (y.lucky.numbers || []).join(', ') }}</span>
            <span><b>{{ t('lotto.aura.direction') }}</b> {{ y.lucky.direction }}</span>
            <span><b>物</b> {{ y.lucky.item }}</span>
          </div>
        </div>

        <section>
          <div class="section-head">
            <div class="eyebrow">{{ t('result.overall') }}</div>
            <h2>{{ t('result.overall') }}</h2>
          </div>
          <div class="overall-list">
            <article class="ov-card">
              <div class="ov-glyph">總</div>
              <div class="ov-body"><p class="ov-text pre">{{ y.total }}</p></div>
            </article>
            <article v-for="s in sections" :key="s.glyph" class="ov-card">
              <div class="ov-glyph">{{ s.glyph }}</div>
              <div class="ov-body"><h3 class="ov-title">{{ s.title }}</h3><p class="ov-text pre">{{ s.body }}</p></div>
            </article>
          </div>
        </section>

        <section v-if="months.length">
          <div class="section-head">
            <div class="eyebrow">{{ t('result.monthly') }}</div>
            <h2>{{ t('result.monthly') }}</h2>
          </div>
          <div class="month-list">
            <article v-for="m in months" :key="m.month" class="mo-card" :class="`g${m.grade}`">
              <div class="mo-head">
                <span class="mo-chip">{{ monthLabel(m.month) }}</span>
                <span class="mo-grade">{{ stars(m.grade) }}</span>
                <span class="mo-bar" />
              </div>
              <p class="mo-summary">{{ m.summary }}</p>
              <p class="mo-text pre">{{ m.body }}</p>
              <dl class="mo-sub">
                <template v-for="[g, v] in subRows(m)" :key="g"><dt>{{ g }}</dt><dd>{{ v }}</dd></template>
              </dl>
              <p v-if="m.advice" class="mo-advice"><span>訓</span>{{ m.advice }}</p>
            </article>
          </div>
        </section>
      </template>
    </div>
  </main>
</template>

<style scoped>
/* pages/result/free.vue 토정비결 섹션 스타일 재사용 + 미리보기용 추가분 */
.result { max-width: 1120px; padding-top: 96px; padding-bottom: var(--space-24); margin: 0 auto; }
.result-hero { text-align: center; padding: var(--space-8) 0; position: relative; }
.stamp { width: 72px; height: 72px; margin: 0 auto var(--space-6); display: flex; align-items: center; justify-content: center; border-radius: 50%; font-family: var(--font-display); font-size: 34px; font-weight: 700; color: var(--gold-light); background: radial-gradient(circle at 35% 30%, rgba(220, 38, 38, 0.35), rgba(201, 168, 76, 0.12)); border: 2px solid var(--gold-border-strong); box-shadow: var(--shadow-glow); }
.result-hero h1 { font-family: var(--font-display); font-size: clamp(1.875rem, 4vw, 2.75rem); font-weight: 700; letter-spacing: -0.02em; line-height: 1.15; margin-bottom: var(--space-3); }
.result-hero .ganji { display: inline-block; font-family: var(--font-mono); font-size: var(--text-sm); letter-spacing: 0.16em; color: var(--gold-primary); padding: 6px 16px; border: 1px solid var(--gold-border); border-radius: var(--radius-full); }
.main-col { min-width: 0; width: 100%; }
.info-card { background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); padding: var(--space-6) var(--space-8); box-shadow: var(--shadow-card), var(--shadow-inset); margin-bottom: var(--space-12); }
.need-input { text-align: center; color: var(--text-secondary); padding: var(--space-12) 0; }

.section-head { margin-bottom: var(--space-8); }
.section-head .eyebrow { display: inline-flex; align-items: center; gap: var(--space-2); font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.25em; text-transform: uppercase; color: var(--gold-primary); margin-bottom: var(--space-3); }
.section-head .eyebrow::before { content: ''; width: 22px; height: 1px; background: var(--gold-primary); opacity: 0.6; }
.section-head h2 { font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 600; letter-spacing: -0.02em; margin-bottom: 6px; }

.overall-list { display: flex; flex-direction: column; gap: var(--space-4); margin-bottom: var(--space-16); }
.ov-card { display: grid; grid-template-columns: 56px 1fr; gap: var(--space-4); background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); padding: var(--space-6); box-shadow: var(--shadow-card), var(--shadow-inset); transition: border-color 0.3s var(--ease-out); }
.ov-card:hover { border-color: var(--gold-border-strong); }
.ov-glyph { width: 56px; height: 56px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 28px; font-weight: 700; color: var(--gold-light); background: var(--bg-tertiary); border: 1px solid var(--gold-border); }
.ov-body .ov-title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 600; margin-bottom: 10px; color: var(--text-primary); }
.ov-body .ov-text { color: var(--text-secondary); font-size: var(--text-base); line-height: 1.85; }
.pre { white-space: pre-line; }

.month-list { display: flex; flex-direction: column; gap: var(--space-4); }
.mo-card { background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); padding: var(--space-6); box-shadow: var(--shadow-card), var(--shadow-inset); }
.mo-head { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4); }
.mo-chip { min-width: 52px; height: 32px; padding: 0 12px; border-radius: var(--radius-full); display: inline-flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 700; font-size: var(--text-sm); color: var(--text-on-gold); background: linear-gradient(135deg, var(--gold-primary), var(--gold-light)); }
.mo-head .mo-bar { flex: 1; height: 1px; background: var(--gold-border); }
.mo-text { color: var(--text-secondary); font-size: var(--text-base); line-height: 1.85; margin-bottom: var(--space-4); }

/* 미리보기 추가분 */
.dev-tag { display: inline-block; margin-bottom: var(--space-6); font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.18em; color: var(--text-muted); border: 1px dashed var(--gold-border); border-radius: var(--radius-full); padding: 4px 12px; }
.summary { color: var(--text-primary); font-size: var(--text-lg); line-height: 1.8; margin-bottom: var(--space-6); }
.month-tags { display: flex; flex-direction: column; gap: var(--space-3); margin-bottom: var(--space-6); }
.mt-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.mt-k { font-family: var(--font-display); font-weight: 700; width: 32px; }
.mt-k.good { color: var(--gold-light); } .mt-k.bad { color: #e57373; }
.mt-chip { font-size: var(--text-sm); padding: 4px 12px; border-radius: var(--radius-full); border: 1px solid var(--gold-border); color: var(--text-secondary); }
.mt-chip.good { border-color: var(--gold-border-strong); color: var(--gold-light); }
.mt-chip.bad { border-color: rgba(229, 115, 115, 0.5); color: #e57373; }
.lucky { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-6); color: var(--text-secondary); font-size: var(--text-sm); }
.lucky b { color: var(--gold-primary); font-weight: 600; margin-right: 6px; }
.mo-grade { font-size: var(--text-sm); letter-spacing: 0.1em; color: var(--gold-primary); }
.mo-card.g1 .mo-grade, .mo-card.g2 .mo-grade { color: #e57373; }
.mo-summary { color: var(--text-primary); font-weight: 600; margin-bottom: var(--space-3); }
.mo-sub { display: grid; grid-template-columns: 28px 1fr; gap: 6px var(--space-3); margin-bottom: var(--space-4); font-size: var(--text-sm); }
.mo-sub dt { font-family: var(--font-display); font-weight: 700; color: var(--gold-primary); }
.mo-sub dd { color: var(--text-secondary); margin: 0; }
.mo-advice { display: flex; gap: var(--space-3); padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); background: var(--bg-tertiary); color: var(--text-primary); font-size: var(--text-sm); }
.mo-advice span { font-family: var(--font-display); font-weight: 700; color: var(--gold-light); }

@media (max-width: 640px) {
  .ov-card { grid-template-columns: 1fr; }
  .ov-glyph { width: 48px; height: 48px; font-size: 24px; }
  .info-card { padding: var(--space-6); }
}
</style>
