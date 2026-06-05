<script setup>
// 무료 운세 결과 — ported from 운세 결과.html.
// Hero varies by ?service=; body (총운/월별) uses a localized SAMPLE dataset
// (real per-type content from DB/AI is wired later). 만세력 via <SajuChart>.
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const user = useSupabaseUser()
const { current } = useSajuInput()

usePageSeo('result')

const isToday = computed(() => ftKey.value === 'today')
const isTojung = computed(() => ftKey.value === 'tojung')
const isMonth = computed(() => ftKey.value === 'month')
const isDate = computed(() => ftKey.value === 'date')
const isLotto = computed(() => ftKey.value === 'lotto')
const isHour = computed(() => ftKey.value === 'hour')

const FREE_TYPE = {
  today: { stamp: '日', titleKey: 'free.today.title', ganji: false },
  tojung: { stamp: '秘', titleKey: 'free.tojung.title', ganji: true },
  date: { stamp: '情', titleKey: 'free.date.title', ganji: false },
  lotto: { stamp: '財', titleKey: 'free.lotto.title', ganji: false },
  month: { stamp: '月', titleKey: 'free.month.title', ganji: false },
  hour: { stamp: '平', titleKey: 'free.hour.title', ganji: false },
}
const ftKey = computed(() => {
  const raw = String(route.query.service || route.query.type || '').toLowerCase()
  return FREE_TYPE[raw] ? raw : null
})
const cfg = computed(() => (ftKey.value ? FREE_TYPE[ftKey.value] : null))
const stamp = computed(() => cfg.value?.stamp || '午')
const heroTitle = computed(() => (cfg.value ? t(cfg.value.titleKey) : t('result.title')))
const showGanji = computed(() => (cfg.value ? cfg.value.ganji : true))

/* ---- 입력값(사주) 표시용 헬퍼 ---- */
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
function fmtBirth(u) {
  const calKey = u.calendar === 'lunar' ? 'saju.cal.lunar' : u.calendar === 'lunar-leap' ? 'saju.cal.leap' : 'saju.cal.solar'
  const cal = t(calKey)
  let date
  if (locale.value === 'en') date = `${EN_MONTHS[u.mo - 1]} ${u.d}, ${u.y}`
  else if (locale.value === 'ko') date = `${u.y}년 ${u.mo}월 ${u.d}일`
  else date = `${u.y}年${u.mo}月${u.d}日`
  return `${date} (${cal})`
}
function fmtHour(hhmm) {
  const [h, m] = hhmm.split(':')
  if (locale.value === 'ko') return `${h}시 ${m}분`
  if (locale.value === 'ja' || locale.value === 'zh') return `${h}時${m}分`
  return `${h}:${m}`
}
// 입력한 사주가 있을 때만 표시한다(없으면 각 분기가 needInput 안내를 띄움).
const pad2 = (n) => String(n).padStart(2, '0')
const viewUser = computed(() => {
  const c = current.value
  if (c && c.year) {
    return { name: c.name || t('saju.preview.guest'), gender: c.gender, calendar: c.calendar, y: c.year, mo: c.month, d: c.day, hh: c.hour, mm: c.minute }
  }
  return null
})
const hourDisplay = computed(() => {
  const v = viewUser.value
  if (!v) return t('saju.save.none')
  if (v.hh != null) return fmtHour(`${pad2(v.hh)}:${pad2(v.mm ?? 0)}`)
  return t('saju.save.none')
})
const userGrid = computed(() => {
  const v = viewUser.value
  if (!v) return []
  return [
  [t('result.name'), v.name],
  [t('result.birth'), fmtBirth(v)],
  [t('result.hour'), hourDisplay.value],
  [t('saju.field.gender'), t(v.gender === 'f' ? 'saju.field.female' : 'saju.field.male')],
  ]
})

/* ===== 오늘의 운세 — real data from /api/fortune/today ===== */
const TODAY_CATS = [
  { key: 'total', glyph: '總', col: 'total' }, { key: 'money', glyph: '財', col: 'money' },
  { key: 'biz', glyph: '業', col: 'biz' }, { key: 'job', glyph: '職', col: 'job' },
  { key: 'love', glyph: '情', col: 'love' }, { key: 'wish', glyph: '願', col: 'wish' },
  { key: 'hope', glyph: '望', col: 'hope' },
]
const todayFortune = ref(null)
const todayLoading = ref(false)
const todayCats = computed(() => {
  const fr = todayFortune.value
  if (!fr) return []
  return TODAY_CATS.filter((c) => fr[c.col]).map((c) => ({ glyph: c.glyph, title: t('today.' + c.key), body: fr[c.col] }))
})
async function loadToday() {
  const c = current.value
  if (!isToday.value || !c || !c.year) return
  todayLoading.value = true
  const now = new Date()
  const target = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  try {
    const res = await $fetch('/api/fortune/today', {
      method: 'POST',
      body: { year: c.year, month: c.month, day: c.day, hour: c.hour, calendar: c.calendar, lang: locale.value, target },
    })
    todayFortune.value = res?.fortune || null
  } catch {
    todayFortune.value = null
  } finally {
    todayLoading.value = false
  }
}

/* ===== 토정비결 — real data from /api/fortune/tojung ===== */
const TOJUNG_MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const tojungFortune = ref(null)
const tojungLoading = ref(false)
const tojungMonths = computed(() => {
  const fr = tojungFortune.value
  if (!fr) return []
  return TOJUNG_MONTHS.map((k, i) => ({
    n: i + 1,
    label: locale.value === 'en' ? EN_MONTHS[i] : (locale.value === 'ko' ? `${i + 1}월` : `${i + 1}月`),
    body: fr[k],
  })).filter((m) => m.body)
})
async function loadTojung() {
  const c = current.value
  if (!isTojung.value || !c || !c.year) return
  tojungLoading.value = true
  try {
    const res = await $fetch('/api/fortune/tojung', {
      method: 'POST',
      body: { year: c.year, month: c.month, day: c.day, gender: c.gender, calendar: c.calendar, lang: locale.value },
    })
    tojungFortune.value = res?.fortune || null
  } catch {
    tojungFortune.value = null
  } finally {
    tojungLoading.value = false
  }
}

/* ===== 이달의 운세 — real data from /api/fortune/month ===== */
const MONTH_CATS = [
  { key: 'total', glyph: '總', col: 'total' }, { key: 'manwoman', glyph: '緣', col: 'manwoman' },
  { key: 'date', glyph: '日', col: 'date_unse' }, { key: 'kind', glyph: '分', col: 'kind_unse' },
]
const monthFortune = ref(null)
const monthLoading = ref(false)
const monthCats = computed(() => {
  const fr = monthFortune.value
  if (!fr) return []
  return MONTH_CATS.filter((c) => fr[c.col]).map((c) => ({ glyph: c.glyph, title: t('month.' + c.key), body: fr[c.col] }))
})
async function loadMonth() {
  const c = current.value
  if (!isMonth.value || !c || !c.year) return
  monthLoading.value = true
  const now = new Date()
  const target = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  try {
    const res = await $fetch('/api/fortune/month', {
      method: 'POST',
      body: { year: c.year, month: c.month, day: c.day, lang: locale.value, target },
    })
    monthFortune.value = res?.fortune || null
  } catch {
    monthFortune.value = null
  } finally {
    monthLoading.value = false
  }
}

/* ===== 데이트 운세 — real data from /api/fortune/date ===== */
const DATE_CATS = [
  { key: 'total', glyph: '情', col: 'datetotal' },
  { key: 'place', glyph: '所', col: 'dateplace' },
  { key: 'wish', glyph: '願', col: 'datewish' },
]
const dateFortune = ref(null)
const dateLoading = ref(false)
const dateCats = computed(() => {
  const fr = dateFortune.value
  if (!fr) return []
  return DATE_CATS.filter((c) => fr[c.col]).map((c) => ({ glyph: c.glyph, title: t('date.' + c.key), body: fr[c.col] }))
})
async function loadDate() {
  const c = current.value
  if (!isDate.value || !c || !c.year) return
  dateLoading.value = true
  const now = new Date()
  const target = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  try {
    const res = await $fetch('/api/fortune/date', {
      method: 'POST',
      body: { year: c.year, month: c.month, day: c.day, hour: c.hour, gender: c.gender, calendar: c.calendar, lang: locale.value, target },
    })
    dateFortune.value = res?.fortune || null
  } catch {
    dateFortune.value = null
  } finally {
    dateLoading.value = false
  }
}

/* ===== 로또 운세 — real data from /api/fortune/lotto ===== */
const LOTTO_CATS = [
  { key: 'total', glyph: '財', col: 'unsetotal' },
  { key: 'luck', glyph: '福', col: 'lottolucky' },
  { key: 'wish', glyph: '願', col: 'wish' },
]
const lottoFortune = ref(null)
const lottoLoading = ref(false)
const lottoCats = computed(() => {
  const fr = lottoFortune.value
  if (!fr) return []
  return LOTTO_CATS.filter((c) => fr[c.col]).map((c) => ({ glyph: c.glyph, title: t('lotto.' + c.key), body: fr[c.col] }))
})
async function loadLotto() {
  const c = current.value
  if (!isLotto.value || !c || !c.year) return
  lottoLoading.value = true
  const now = new Date()
  const target = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  try {
    const res = await $fetch('/api/fortune/lotto', {
      method: 'POST',
      body: { year: c.year, month: c.month, day: c.day, lang: locale.value, target },
    })
    lottoFortune.value = res?.fortune || null
  } catch {
    lottoFortune.value = null
  } finally {
    lottoLoading.value = false
  }
}

/* ===== 정통 평생운세 — real data from /api/fortune/lifeall (service=hour) ===== */
const LIFE_CATS = [
  { key: 'saju', glyph: '命', col: 'sajuwoon' },
  { key: 'early', glyph: '初', col: 'earlyyear' },
  { key: 'middle', glyph: '中', col: 'middleyear' },
  { key: 'last', glyph: '末', col: 'lastyear' },
  { key: 'love', glyph: '情', col: 'lovewealth' },
  { key: 'job', glyph: '業', col: 'jobhealth' },
]
const lifeFortune = ref(null)
const lifeLoading = ref(false)
const lifeCats = computed(() => {
  const fr = lifeFortune.value
  if (!fr) return []
  return LIFE_CATS.filter((c) => fr[c.col]).map((c) => ({ glyph: c.glyph, title: t('life.' + c.key), body: fr[c.col] }))
})
async function loadLife() {
  const c = current.value
  if (!isHour.value || !c || !c.year) return
  lifeLoading.value = true
  try {
    const res = await $fetch('/api/fortune/lifeall', {
      method: 'POST',
      body: { year: c.year, month: c.month, day: c.day, hour: c.hour, gender: c.gender, calendar: c.calendar, lang: locale.value },
    })
    lifeFortune.value = res?.fortune || null
  } catch {
    lifeFortune.value = null
  } finally {
    lifeLoading.value = false
  }
}

/* ===== 사주 명식(만세력) — real data from /api/saju/manse ===== */
// today는 명식을 숨기므로 제외. 그 외 ganji 타입(현재 tojung)에서 입력값 기준 명식을 띄운다.
const manse = ref(null)
async function loadManse() {
  const c = current.value
  if (isToday.value || !c || !c.year) return
  try {
    manse.value = await $fetch('/api/saju/manse', {
      method: 'POST',
      body: { year: c.year, month: c.month, day: c.day, hour: c.hour, minute: c.minute, calendar: c.calendar, gender: c.gender, name: c.name },
    })
  } catch {
    manse.value = null
  }
}

function loadAll() { loadToday(); loadTojung(); loadMonth(); loadDate(); loadLotto(); loadLife(); loadManse() }
onMounted(loadAll)
watch(locale, loadAll)

/* ---- actions ---- */
function onSave() {
  if (!user.value) {
    navigateTo(localePath({ path: '/login', query: { reason: 'save', redirect: route.fullPath } }))
    return
  }
  alert(t('result.savedMock'))
}
function onShare() {
  const url = typeof window !== 'undefined' ? window.location.href : ''
  if (typeof navigator !== 'undefined' && navigator.share) navigator.share({ title: heroTitle.value, url }).catch(() => {})
  else if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(url).then(() => alert(t('result.shareMock')))
}
function onPrint() { if (typeof window !== 'undefined') window.print() }
</script>

<template>
  <main class="result container">
    <div class="result-hero">
      <NuxtLink :to="localePath('/saju')" class="back-btn">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6" /></svg>
        <span>{{ t('common.back') }}</span>
      </NuxtLink>
      <div class="stamp">{{ stamp }}</div>
      <h1>{{ heroTitle }}</h1>
      <span v-show="showGanji" class="ganji">{{ t('result.ganji') }}</span>
    </div>

    <div class="result-layout">
      <aside class="ad-rail">
        <div class="ad-slot"><span class="ad-tag">{{ t('result.ad') }}</span><span class="ad-glyph">廣</span><span class="ad-size">160 × 600</span></div>
      </aside>

      <div class="main-col">
        <!-- user info (입력값이 있을 때만) -->
        <div v-if="current && current.year" class="info-card">
          <div class="info-card-head"><span class="dot" /><span>{{ t('result.userInfo') }}</span></div>
          <div class="info-grid">
            <div v-for="([k, v], i) in userGrid" :key="i" class="info-item"><span class="k">{{ k }}</span><span class="v">{{ v }}</span></div>
          </div>
        </div>

        <!-- 만세력 명식 (today에서는 숨김, 입력값이 있을 때만) -->
        <div v-if="!isToday && current && current.year" class="info-card">
          <div class="info-card-head"><span class="dot" /><span>{{ t('sj.title') }}</span></div>
          <SajuChart :data="manse" />
        </div>

        <!-- ===== 오늘의 운세 (실데이터) ===== -->
        <template v-if="isToday">
          <div v-if="!current || !current.year" class="need-input">
            <p>{{ t('result.needInput') }}</p>
            <NuxtLink class="btn btn-primary" :to="localePath('/saju')">{{ t('result.needInput.cta') }}</NuxtLink>
          </div>
          <template v-else>
            <div class="section-head">
              <div class="eyebrow">{{ t('free.today.title') }}</div>
              <h2>{{ t('free.today.title') }}</h2>
              <p>{{ t('free.today.desc') }}</p>
            </div>
            <p v-if="todayLoading" class="loading-note">{{ t('result.loading') }}</p>
            <div v-else class="overall-list">
              <article v-for="(c, i) in todayCats" :key="i" class="ov-card">
                <div class="ov-glyph">{{ c.glyph }}</div>
                <div class="ov-body"><h3 class="ov-title">{{ c.title }}</h3><p class="ov-text">{{ c.body }}</p></div>
              </article>
            </div>
          </template>
        </template>

        <!-- ===== 토정비결 (실데이터: 총운 + 월별 12개월) ===== -->
        <template v-else-if="isTojung">
          <div v-if="!current || !current.year" class="need-input">
            <p>{{ t('result.needInput') }}</p>
            <NuxtLink class="btn btn-primary" :to="localePath('/saju')">{{ t('result.needInput.cta') }}</NuxtLink>
          </div>
          <template v-else>
            <p v-if="tojungLoading" class="loading-note">{{ t('result.loading') }}</p>
            <template v-else-if="tojungFortune">
              <section v-if="tojungFortune.total">
                <div class="section-head">
                  <div class="eyebrow">{{ t('result.overall') }}</div>
                  <h2>{{ t('result.overall') }}</h2>
                </div>
                <div class="overall-list">
                  <article class="ov-card">
                    <div class="ov-glyph">總</div>
                    <div class="ov-body"><p class="ov-text pre">{{ tojungFortune.total }}</p></div>
                  </article>
                </div>
              </section>
              <section v-if="tojungMonths.length">
                <div class="section-head">
                  <div class="eyebrow">{{ t('result.monthly') }}</div>
                  <h2>{{ t('result.monthly') }}</h2>
                </div>
                <div class="month-list">
                  <template v-for="(mo, i) in tojungMonths" :key="mo.n">
                    <article class="mo-card">
                      <div class="mo-head"><span class="mo-chip">{{ mo.label }}</span><span class="mo-bar" /></div>
                      <p class="mo-text pre">{{ mo.body }}</p>
                    </article>
                    <div v-if="i === 3 || i === 7" class="ad-slot ad-inline"><span class="ad-tag">{{ t('result.ad') }}</span><span class="ad-glyph">廣</span><span class="ad-size">970 × 90</span></div>
                  </template>
                </div>
              </section>
            </template>
          </template>
        </template>

        <!-- ===== 이달의 운세 (실데이터: 총운/남녀운/날짜별/분야별) ===== -->
        <template v-else-if="isMonth">
          <div v-if="!current || !current.year" class="need-input">
            <p>{{ t('result.needInput') }}</p>
            <NuxtLink class="btn btn-primary" :to="localePath('/saju')">{{ t('result.needInput.cta') }}</NuxtLink>
          </div>
          <template v-else>
            <div class="section-head">
              <div class="eyebrow">{{ t('free.month.title') }}</div>
              <h2>{{ t('free.month.title') }}</h2>
              <p>{{ t('free.month.desc') }}</p>
            </div>
            <p v-if="monthLoading" class="loading-note">{{ t('result.loading') }}</p>
            <div v-else class="overall-list">
              <article v-for="(c, i) in monthCats" :key="i" class="ov-card">
                <div class="ov-glyph">{{ c.glyph }}</div>
                <div class="ov-body"><h3 class="ov-title">{{ c.title }}</h3><p class="ov-text pre">{{ c.body }}</p></div>
              </article>
            </div>
          </template>
        </template>

        <!-- ===== 데이트 운세 (실데이터: 총운/장소/희망) ===== -->
        <template v-else-if="isDate">
          <div v-if="!current || !current.year" class="need-input">
            <p>{{ t('result.needInput') }}</p>
            <NuxtLink class="btn btn-primary" :to="localePath('/saju')">{{ t('result.needInput.cta') }}</NuxtLink>
          </div>
          <template v-else>
            <div class="section-head">
              <div class="eyebrow">{{ t('free.date.title') }}</div>
              <h2>{{ t('free.date.title') }}</h2>
              <p>{{ t('free.date.desc') }}</p>
            </div>
            <p v-if="dateLoading" class="loading-note">{{ t('result.loading') }}</p>
            <div v-else class="overall-list">
              <article v-for="(c, i) in dateCats" :key="i" class="ov-card">
                <div class="ov-glyph">{{ c.glyph }}</div>
                <div class="ov-body"><h3 class="ov-title">{{ c.title }}</h3><p class="ov-text pre">{{ c.body }}</p></div>
              </article>
            </div>
          </template>
        </template>

        <!-- ===== 로또 운세 (실데이터: 총운/로또운/희망) ===== -->
        <template v-else-if="isLotto">
          <div v-if="!current || !current.year" class="need-input">
            <p>{{ t('result.needInput') }}</p>
            <NuxtLink class="btn btn-primary" :to="localePath('/saju')">{{ t('result.needInput.cta') }}</NuxtLink>
          </div>
          <template v-else>
            <div class="section-head">
              <div class="eyebrow">{{ t('free.lotto.title') }}</div>
              <h2>{{ t('free.lotto.title') }}</h2>
              <p>{{ t('free.lotto.desc') }}</p>
            </div>
            <p v-if="lottoLoading" class="loading-note">{{ t('result.loading') }}</p>
            <div v-else class="overall-list">
              <article v-for="(c, i) in lottoCats" :key="i" class="ov-card">
                <div class="ov-glyph">{{ c.glyph }}</div>
                <div class="ov-body"><h3 class="ov-title">{{ c.title }}</h3><p class="ov-text pre">{{ c.body }}</p></div>
              </article>
            </div>
          </template>
        </template>

        <!-- ===== 정통 평생운세 (실데이터: 사주/초년/중년/말년/애정재물/직업건강) ===== -->
        <template v-else-if="isHour">
          <div v-if="!current || !current.year" class="need-input">
            <p>{{ t('result.needInput') }}</p>
            <NuxtLink class="btn btn-primary" :to="localePath('/saju')">{{ t('result.needInput.cta') }}</NuxtLink>
          </div>
          <template v-else>
            <div class="section-head">
              <div class="eyebrow">{{ t('free.hour.title') }}</div>
              <h2>{{ t('free.hour.title') }}</h2>
              <p>{{ t('free.hour.desc') }}</p>
            </div>
            <p v-if="lifeLoading" class="loading-note">{{ t('result.loading') }}</p>
            <div v-else class="overall-list">
              <article v-for="(c, i) in lifeCats" :key="i" class="ov-card">
                <div class="ov-glyph">{{ c.glyph }}</div>
                <div class="ov-body"><h3 class="ov-title">{{ c.title }}</h3><p class="ov-text pre">{{ c.body }}</p></div>
              </article>
            </div>
          </template>
        </template>

        <!-- ===== 알 수 없는/누락된 service ===== -->
        <template v-else>
          <div class="need-input">
            <p>{{ t('result.notFound') }}</p>
            <NuxtLink class="btn btn-primary" :to="localePath({ path: '/', hash: '#free' })">{{ t('result.notFound.cta') }}</NuxtLink>
          </div>
        </template>

        <div class="disclaimer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <span>{{ t('result.disclaimer') }}</span>
        </div>

        <div class="actions">
          <button class="btn btn-primary" @click="onSave"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg><span>{{ t('result.save') }}</span></button>
          <button class="btn btn-ghost" @click="onShare"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg><span>{{ t('result.share') }}</span></button>
          <button class="btn btn-ghost" @click="onPrint"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg><span>{{ t('result.print') }}</span></button>
          <NuxtLink class="btn btn-secondary" :to="localePath({ path: '/', hash: '#free' })"><span>{{ t('result.more') }}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></NuxtLink>
        </div>
      </div>

      <aside class="ad-rail">
        <div class="ad-slot"><span class="ad-tag">{{ t('result.ad') }}</span><span class="ad-glyph">廣</span><span class="ad-size">160 × 600</span></div>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.result { max-width: 1544px; padding-top: 96px; padding-bottom: var(--space-24); margin: 0 auto; }

.result-hero { text-align: center; padding: var(--space-8) 0; position: relative; }
.back-btn { position: absolute; left: 0; top: var(--space-6); display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: var(--radius-md); border: 1px solid var(--gold-border); background: var(--bg-secondary); color: var(--text-secondary); font-size: var(--text-sm); transition: all 0.2s; }
.back-btn:hover { border-color: var(--gold-primary); color: var(--gold-light); }
.stamp { width: 72px; height: 72px; margin: 0 auto var(--space-6); display: flex; align-items: center; justify-content: center; border-radius: 50%; font-family: var(--font-display); font-size: 34px; font-weight: 700; color: var(--gold-light); background: radial-gradient(circle at 35% 30%, rgba(220, 38, 38, 0.35), rgba(201, 168, 76, 0.12)); border: 2px solid var(--gold-border-strong); box-shadow: var(--shadow-glow); }
.result-hero h1 { font-family: var(--font-display); font-size: clamp(1.875rem, 4vw, 2.75rem); font-weight: 700; letter-spacing: -0.02em; line-height: 1.15; margin-bottom: var(--space-3); }
.result-hero .ganji { display: inline-block; font-family: var(--font-mono); font-size: var(--text-sm); letter-spacing: 0.16em; color: var(--gold-primary); padding: 6px 16px; border: 1px solid var(--gold-border); border-radius: var(--radius-full); }

.result-layout { display: grid; grid-template-columns: 180px minmax(0, 1fr) 180px; gap: var(--space-8); align-items: start; max-width: 1544px; margin: 0 auto; }
.main-col { min-width: 0; max-width: 1120px; margin: 0 auto; width: 100%; }
.ad-rail { position: sticky; top: 104px; }

.ad-slot { position: relative; background: repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.012) 0 10px, transparent 10px 20px), var(--bg-secondary); border: 1px dashed var(--gold-border); border-radius: var(--radius-md); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--text-muted); overflow: hidden; }
.ad-slot .ad-tag { position: absolute; top: 8px; left: 8px; font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--text-muted); border: 1px solid var(--gold-border); border-radius: 4px; padding: 2px 6px; background: var(--bg-primary); }
.ad-slot .ad-glyph { font-family: var(--font-display); font-size: 26px; color: var(--gold-deep); opacity: 0.7; }
.ad-slot .ad-size { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.1em; }
.ad-rail .ad-slot { height: 600px; width: 100%; }
.ad-inline { width: 100%; height: 110px; margin: var(--space-8) 0; }

.info-card { background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); padding: var(--space-6) var(--space-8); box-shadow: var(--shadow-card), var(--shadow-inset); margin-bottom: var(--space-12); }
.info-card-head { display: flex; align-items: center; gap: 10px; font-family: var(--font-display); font-size: var(--text-lg); font-weight: 600; padding-bottom: var(--space-4); margin-bottom: var(--space-4); border-bottom: 1px solid var(--gold-border); }
.info-card-head .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--gold-primary); box-shadow: 0 0 10px var(--gold-glow); }
.info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4) var(--space-8); }
.info-item { display: flex; flex-direction: column; gap: 4px; }
.info-item .k { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); }
.info-item .v { font-size: var(--text-base); color: var(--text-primary); font-weight: 500; }

.section-head { margin-bottom: var(--space-8); }
.section-head .eyebrow { display: inline-flex; align-items: center; gap: var(--space-2); font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.25em; text-transform: uppercase; color: var(--gold-primary); margin-bottom: var(--space-3); }
.section-head .eyebrow::before { content: ''; width: 22px; height: 1px; background: var(--gold-primary); opacity: 0.6; }
.section-head h2 { font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 600; letter-spacing: -0.02em; margin-bottom: 6px; }
.section-head p { color: var(--text-secondary); font-size: var(--text-base); }

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
.mo-text { color: var(--text-secondary); font-size: var(--text-base); line-height: 1.85; margin-bottom: var(--space-6); }

.disclaimer { margin: var(--space-16) 0 var(--space-8); padding: var(--space-6); background: var(--bg-tertiary); border: 1px solid var(--gold-border); border-radius: var(--radius-md); font-size: var(--text-sm); color: var(--text-muted); line-height: 1.7; display: flex; gap: var(--space-3); align-items: flex-start; }
.disclaimer svg { color: var(--gold-deep); flex-shrink: 0; margin-top: 2px; }
.actions { display: flex; flex-wrap: wrap; gap: var(--space-3); justify-content: center; }
.actions .btn svg { width: 16px; height: 16px; }
.actions .btn-ghost { border: 1px solid var(--gold-border); }

.need-input { text-align: center; padding: var(--space-16) var(--space-6); background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); display: flex; flex-direction: column; align-items: center; gap: var(--space-6); margin-bottom: var(--space-12); }
.need-input p { color: var(--text-secondary); font-size: var(--text-lg); }
.loading-note { color: var(--text-muted); text-align: center; padding: var(--space-12); font-family: var(--font-mono); letter-spacing: 0.05em; }

@media (max-width: 1100px) { .result-layout { grid-template-columns: minmax(0, 1fr); } .ad-rail { display: none; } }
@media (max-width: 640px) {
  .result-hero { padding-top: var(--space-16); }
  .back-btn { position: static; display: inline-flex; margin-bottom: var(--space-6); }
  .info-grid { grid-template-columns: 1fr; }
  .ov-card { grid-template-columns: 1fr; }
  .ov-glyph { width: 48px; height: 48px; font-size: 24px; }
}
</style>
