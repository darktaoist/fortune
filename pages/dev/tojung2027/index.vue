<script setup>
/**
 * 2027 토정비결 생성 현황 표 — 개발 서버 전용(nuxt.config $production.ignore → production 404).
 * 코드·언어·등급·헤드라인·검증 결과(out/ledger.json). 행을 누르면 [gwae_code] 미리보기.
 */
definePageMeta({ seoLocales: [] }) // 전 로케일 noindex(layouts/default.vue)

const localePath = useLocalePath()
const lang = ref('all')
const { data } = await useFetch('/api/dev/tojung2027')
const rows = computed(() => (data.value?.rows || []).filter((r) => lang.value === 'all' || r.lang === lang.value))
const counts = computed(() => {
  const c = {}
  for (const r of data.value?.rows || []) {
    c[r.lang] ??= { ok: 0, fail: 0, none: 0 }
    if (r.check === 'ok') c[r.lang].ok++
    else if (r.check) c[r.lang].fail++
    else c[r.lang].none++
  }
  return c
})
</script>

<template>
  <main class="dev container">
    <h1>tojung 2027 · legacy72</h1>
    <p class="meta">spent ${{ data?.spent_usd }} · <span v-for="(c, l) in counts" :key="l">{{ l }} {{ c.ok }}/{{ c.fail }}/{{ c.none }} </span>(ok/fail/none)</p>
    <div class="filters">
      <button v-for="l in ['all', 'ko', 'en', 'ja', 'zh']" :key="l" :class="{ on: lang === l }" @click="lang = l">{{ l }}</button>
    </div>
    <table>
      <thead><tr><th>code</th><th>lang</th><th>grade</th><th>headline</th><th>db</th><th>check</th><th>src</th><th>×</th></tr></thead>
      <tbody>
        <tr v-for="r in rows" :key="r.lang + r.code" :class="{ bad: r.check && r.check !== 'ok' }">
          <td><NuxtLink :to="localePath(`/dev/tojung2027/${r.code}`) + `?lang=${r.lang}`">{{ r.code }}</NuxtLink></td>
          <td>{{ r.lang }}</td>
          <td>{{ r.grade ?? '–' }}</td>
          <td class="hl">{{ r.headline ?? '–' }}</td>
          <td>{{ r.status ?? '–' }}</td>
          <td :title="r.errors || ''">{{ r.check ?? '–' }}</td>
          <td>{{ r.source ?? '' }}</td>
          <td>{{ r.submits || '' }}</td>
        </tr>
      </tbody>
    </table>
  </main>
</template>

<style scoped>
.dev { max-width: 1120px; margin: 0 auto; padding: 96px 0 var(--space-24); }
h1 { font-family: var(--font-mono); font-size: var(--text-xl); margin-bottom: var(--space-2); }
.meta { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--text-muted); margin-bottom: var(--space-4); }
.filters { display: flex; gap: var(--space-2); margin-bottom: var(--space-4); }
.filters button { font-family: var(--font-mono); padding: 4px 12px; border-radius: var(--radius-full); border: 1px solid var(--gold-border); background: transparent; color: var(--text-secondary); cursor: pointer; }
.filters button.on { border-color: var(--gold-primary); color: var(--gold-light); }
table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--gold-border); color: var(--text-secondary); }
th { font-family: var(--font-mono); color: var(--text-muted); }
td a { color: var(--gold-light); font-family: var(--font-mono); }
td.hl { color: var(--text-primary); }
tr.bad td { color: #e57373; }
</style>
