<script setup>
// 정확도 안내 — "왜 만세력 DB로 간지를 정확히 뽑아야 하는가".
// 간지(계산)가 틀리면 그 위의 모든 풀이가 엉터리가 된다는 핵심 메시지.
const { t } = useI18n()
const localePath = useLocalePath()

useSeoMeta({
  title: () => `${t('accuracy.title')} · ${t('seo.titleSuffix')}`,
  description: () => t('accuracy.sub'),
})

const WHY = [
  { glyph: '節', t: 'accuracy.why.1.t', d: 'accuracy.why.1.d' },
  { glyph: '朔', t: 'accuracy.why.2.t', d: 'accuracy.why.2.d' },
  { glyph: '算', t: 'accuracy.why.3.t', d: 'accuracy.why.3.d' },
  { glyph: '信', t: 'accuracy.why.4.t', d: 'accuracy.why.4.d' },
]
</script>

<template>
  <main class="acc">
    <!-- HEAD -->
    <header class="acc-head">
      <div class="stamp">曆</div>
      <div class="section-label"><span>{{ t('accuracy.eyebrow') }}</span></div>
      <h1>{{ t('accuracy.title') }}</h1>
      <p class="acc-sub">{{ t('accuracy.sub') }}</p>
    </header>

    <!-- 1) 사주는 두 단계 -->
    <section class="acc-sec">
      <h2 class="acc-h2">{{ t('accuracy.step.title') }}</h2>
      <div class="step-row">
        <div class="step-card">
          <div class="step-no">01</div>
          <div class="step-glyph">命</div>
          <h3>{{ t('accuracy.step.1.t') }}</h3>
          <p>{{ t('accuracy.step.1.d') }}</p>
        </div>
        <div class="step-arrow">→</div>
        <div class="step-card">
          <div class="step-no">02</div>
          <div class="step-glyph">文</div>
          <h3>{{ t('accuracy.step.2.t') }}</h3>
          <p>{{ t('accuracy.step.2.d') }}</p>
        </div>
      </div>
      <p class="acc-note">{{ t('accuracy.step.note') }}</p>
    </section>

    <!-- 2) 왜 AI는 간지를 자주 틀리나 -->
    <section class="acc-sec">
      <h2 class="acc-h2">{{ t('accuracy.why.title') }}</h2>
      <p class="acc-lead">{{ t('accuracy.why.lead') }}</p>
      <div class="why-grid">
        <article v-for="(w, i) in WHY" :key="i" class="why-card">
          <div class="why-glyph">{{ w.glyph }}</div>
          <h3>{{ t(w.t) }}</h3>
          <p>{{ t(w.d) }}</p>
        </article>
      </div>
    </section>

    <!-- 3) 타오운세의 방식 -->
    <section class="acc-sec our">
      <h2 class="acc-h2">{{ t('accuracy.our.title') }}</h2>
      <div class="our-row">
        <div class="our-card">
          <div class="our-glyph">曆</div>
          <h3>{{ t('accuracy.our.1.t') }}</h3>
          <p>{{ t('accuracy.our.1.d') }}</p>
        </div>
        <div class="our-card">
          <div class="our-glyph">文</div>
          <h3>{{ t('accuracy.our.2.t') }}</h3>
          <p>{{ t('accuracy.our.2.d') }}</p>
        </div>
      </div>
      <blockquote class="our-quote">{{ t('accuracy.our.quote') }}</blockquote>
    </section>

    <!-- CTA -->
    <section class="acc-cta">
      <h2>{{ t('accuracy.cta.title') }}</h2>
      <NuxtLink :to="localePath('/saju')" class="btn btn-primary btn-lg">
        <span>{{ t('accuracy.cta.btn') }}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
      </NuxtLink>
    </section>
  </main>
</template>

<style scoped>
.acc { max-width: 940px; margin: 0 auto; padding: 120px var(--space-6) var(--space-24); }

/* HEAD */
.acc-head { text-align: center; margin-bottom: var(--space-16); }
.acc-head .stamp { width: 72px; height: 72px; margin: 0 auto var(--space-6); display: flex; align-items: center; justify-content: center; border-radius: 50%; font-family: var(--font-display); font-size: 34px; color: var(--gold-light); background: radial-gradient(circle at 35% 30%, rgba(201, 168, 76, 0.30), rgba(201, 168, 76, 0.05)); border: 2px solid var(--gold-border-strong); box-shadow: var(--shadow-glow); }
.section-label { display: inline-flex; justify-content: center; margin-bottom: var(--space-4); }
.section-label span { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.25em; text-transform: uppercase; color: var(--gold-primary); }
.acc-head h1 { font-family: var(--font-display); font-size: clamp(1.9rem, 3.4vw, 2.8rem); font-weight: 700; line-height: 1.25; letter-spacing: -0.02em; margin-bottom: var(--space-4); text-wrap: balance; }
.acc-sub { color: var(--text-secondary); font-size: var(--text-lg); line-height: 1.7; max-width: 620px; margin: 0 auto; text-wrap: pretty; }

/* SECTION */
.acc-sec { margin-bottom: var(--space-20); }
.acc-h2 { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 600; text-align: center; margin-bottom: var(--space-4); }
.acc-lead, .acc-note { color: var(--text-secondary); font-size: var(--text-base); line-height: 1.75; text-align: center; max-width: 640px; margin: 0 auto; }
.acc-note { margin-top: var(--space-6); color: var(--gold-light); font-weight: 500; }

/* STEP */
.step-row { display: flex; align-items: stretch; justify-content: center; gap: var(--space-4); margin-top: var(--space-8); }
.step-card { flex: 1; max-width: 360px; background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); padding: var(--space-8); text-align: center; box-shadow: var(--shadow-card), var(--shadow-inset); position: relative; }
.step-no { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.2em; color: var(--text-muted); }
.step-glyph { font-family: var(--font-display); font-size: 40px; color: var(--gold-primary); margin: var(--space-3) 0 var(--space-4); }
.step-card h3 { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 600; margin-bottom: var(--space-2); }
.step-card p { color: var(--text-secondary); font-size: var(--text-sm); line-height: 1.65; }
.step-arrow { display: flex; align-items: center; color: var(--gold-primary); font-size: 28px; }

/* WHY */
.why-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4); margin-top: var(--space-8); }
.why-card { background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); padding: var(--space-6); }
.why-glyph { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-family: var(--font-display); font-size: 22px; color: var(--gold-light); background: var(--gold-soft); border: 1px solid var(--gold-border); margin-bottom: var(--space-4); }
.why-card h3 { font-family: var(--font-display); font-size: var(--text-base); font-weight: 600; margin-bottom: var(--space-2); }
.why-card p { color: var(--text-secondary); font-size: var(--text-sm); line-height: 1.7; }

/* OUR */
.our-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4); margin-top: var(--space-8); }
.our-card { background: linear-gradient(160deg, rgba(201, 168, 76, 0.08), var(--bg-secondary)); border: 1px solid var(--gold-border-strong); border-radius: var(--radius-lg); padding: var(--space-8); text-align: center; }
.our-glyph { font-family: var(--font-display); font-size: 38px; color: var(--gold-primary); margin-bottom: var(--space-4); }
.our-card h3 { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 600; margin-bottom: var(--space-2); }
.our-card p { color: var(--text-secondary); font-size: var(--text-sm); line-height: 1.7; }
.our-quote { margin: var(--space-10) auto 0; max-width: 600px; text-align: center; font-family: var(--font-display); font-size: var(--text-xl); line-height: 1.6; color: var(--text-primary); padding: var(--space-6); border-top: 1px solid var(--gold-border); border-bottom: 1px solid var(--gold-border); }

/* CTA */
.acc-cta { text-align: center; padding: var(--space-12) var(--space-6); background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-xl); }
.acc-cta h2 { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 600; margin-bottom: var(--space-6); }

@media (max-width: 720px) {
  .acc { padding: 96px var(--space-4) var(--space-16); }
  .step-row { flex-direction: column; align-items: center; }
  .step-arrow { transform: rotate(90deg); }
  .why-grid, .our-row { grid-template-columns: 1fr; }
}
</style>
