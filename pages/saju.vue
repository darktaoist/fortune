<script setup>
// 사주 정보 입력 — ported from 사주 정보 입력.html.
// Real-time ganji preview via the prototype's approximate calcSaju (precise
// manse-ryeok recompute happens server-side later). Demo login switcher removed;
// login state now comes from Supabase auth. Header/tabbar come from the layout.
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const user = useSupabaseUser()
const supabase = useSupabaseClient()
const { current: savedSaju, save: saveSaju } = useSajuInput()

usePageSeo('saju')

/* ============ Saju constants ============ */
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const STEM_EL = { 甲: 'mok', 乙: 'mok', 丙: 'hwa', 丁: 'hwa', 戊: 'to', 己: 'to', 庚: 'geum', 辛: 'geum', 壬: 'su', 癸: 'su' }
const BRANCH_EL = { 寅: 'mok', 卯: 'mok', 巳: 'hwa', 午: 'hwa', 辰: 'to', 戌: 'to', 丑: 'to', 未: 'to', 申: 'geum', 酉: 'geum', 亥: 'su', 子: 'su' }

// 입력은 실제 시각(0~23시)으로 받고(1.0 parity), 지지(地支)는 시각에서 파생한다.
// 子 23~01, 丑 01~03 … 의 2시간 블록 → BRANCHES 인덱스.
function branchFromHour(h) {
  return BRANCHES[Math.floor(((h + 1) % 24) / 2)]
}
const pad2 = (n) => String(n).padStart(2, '0')
const fmtClock = (h, m) => `${pad2(h)}:${pad2(m ?? 0)}`
const minuteOpts = Array.from({ length: 60 }, (_, i) => i)
const hourOpts = Array.from({ length: 24 }, (_, i) => i)

const FTYPES = [
  { ft: 'today', glyph: '日', k: 'saju.ft.today', d: 'saju.ft.today.d', pro: false },
  { ft: 'toJung', glyph: '秘', k: 'saju.ft.tojung', d: 'saju.ft.tojung.d', pro: false },
  { ft: 'month', glyph: '月', k: 'saju.ft.month', d: 'saju.ft.month.d', pro: false },
  { ft: 'date', glyph: '情', k: 'saju.ft.date', d: 'saju.ft.date.d', pro: false },
  { ft: 'lotto', glyph: '財', k: 'saju.ft.lotto', d: 'saju.ft.lotto.d', pro: false },
  { ft: 'hour', glyph: '平', k: 'saju.ft.hour', d: 'saju.ft.hour.d', pro: false },
  { ft: 'lifetime', glyph: '命', k: 'saju.ft.life', d: 'saju.ft.life.d', pro: true },
  { ft: 'couple', glyph: '緣', k: 'saju.ft.couple', d: 'saju.ft.couple.d', pro: true },
  { ft: 'mbti', glyph: '合', k: 'saju.ft.mbti', d: 'saju.ft.mbti.d', pro: true },
]
const MBTI_AXES = [
  [{ v: 'E', k: 'saju.mbti.E.k' }, { v: 'I', k: 'saju.mbti.I.k' }],
  [{ v: 'N', k: 'saju.mbti.N.k' }, { v: 'S', k: 'saju.mbti.S.k' }],
  [{ v: 'T', k: 'saju.mbti.T.k' }, { v: 'F', k: 'saju.mbti.F.k' }],
  [{ v: 'J', k: 'saju.mbti.J.k' }, { v: 'P', k: 'saju.mbti.P.k' }],
]
const REL_KEYS = ['self', 'partner', 'friend', 'family', 'crush', 'colleague']
const CAL_LABEL = { solar: 'saju.cal.solar', lunar: 'saju.cal.lunar', 'lunar-leap': 'saju.cal.leap' }
const TINTS = ['gold', 'rose', 'purple', 'jade', 'blue']

/* ============ Reactive form state ============ */
const f = reactive({
  name: '', gender: 'm', calendar: 'solar',
  year: null, month: null, day: null,
  hour: null, minute: null, place: '',
  mbti: [null, null, null, null],
  fortuneType: route.query.service ? mapService(route.query.service) : 'today',
})
// 시간 모름: 체크 시 시각을 비워 시주(時柱)를 제외한다. number 산식에선 모름 → 11(서버 처리).
const hourUnknown = ref(false)
watch(hourUnknown, (v) => { if (v) { f.hour = null; f.minute = null } })
watch(() => f.hour, (v) => { if (v != null) hourUnknown.value = false })

function mapService(s) {
  const MAP = { today: 'today', toJung: 'toJung', tojung: 'toJung', month: 'month', date: 'date', lotto: 'lotto', hour: 'hour', lifetime: 'lifetime', life: 'lifetime', mbti: 'mbti', celeb: 'couple', couple: 'couple' }
  return MAP[s] || 'today'
}

/* ============ Selects ============ */
const thisYear = new Date().getFullYear()
const years = Array.from({ length: thisYear - 1929 }, (_, i) => thisYear - i)
const months = Array.from({ length: 12 }, (_, i) => i + 1)
const days = computed(() => {
  const max = f.year && f.month ? new Date(f.year, f.month, 0).getDate() : 31
  return Array.from({ length: max }, (_, i) => i + 1)
})
watch(() => [f.year, f.month], () => {
  if (f.day && f.day > days.value.length) f.day = null
})

/* ============ Approximate saju (prototype calcSaju) ============ */
function julianDay(y, m, d) {
  if (m <= 2) { y -= 1; m += 12 }
  const a = Math.floor(y / 100)
  const b = 2 - a + Math.floor(a / 4)
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524
}
function calcSaju(y, mo, d, hourChar) {
  let yearForPillar = y
  if (mo < 2 || (mo === 2 && d < 4)) yearForPillar = y - 1
  const yStem = STEMS[((yearForPillar - 4) % 10 + 10) % 10]
  const yBranch = BRANCHES[((yearForPillar - 4) % 12 + 12) % 12]
  let monthForPillar = mo
  if (d < 6) monthForPillar = mo - 1
  if (monthForPillar <= 0) monthForPillar += 12
  const mBranchIdx = (monthForPillar + 1) % 12
  const mBranch = BRANCHES[mBranchIdx]
  const yStemIdx = STEMS.indexOf(yStem)
  const mStemIdx = (((yStemIdx * 2 + 2) + (mBranchIdx - 2 + 12) % 12) % 10)
  const mStem = STEMS[mStemIdx]
  const jdn = julianDay(y, mo, d)
  const baseJdn = julianDay(2000, 1, 7)
  const dDiff = jdn - baseJdn
  const dStemIdx = ((dDiff % 10) + 10) % 10
  const dBranchIdx = ((dDiff % 12) + 12) % 12
  const dStem = STEMS[dStemIdx]
  const dBranch = BRANCHES[dBranchIdx]
  let hStem = null, hBranch = null
  if (hourChar && hourChar !== '?') {
    hBranch = hourChar
    const hBranchIdx = BRANCHES.indexOf(hBranch)
    const startStemIdx = (dStemIdx * 2) % 10
    hStem = STEMS[(startStemIdx + hBranchIdx) % 10]
  }
  return { year: [yStem, yBranch], month: [mStem, mBranch], day: [dStem, dBranch], hour: hStem ? [hStem, hBranch] : null, zodiac: yBranch }
}

const hasDate = computed(() => !!(f.year && f.month && f.day))
const saju = computed(() => (hasDate.value ? calcSaju(f.year, f.month, f.day, f.hour != null ? branchFromHour(f.hour) : null) : null))

const pillars = computed(() => {
  const s = saju.value
  const mk = (label, pair) => ({ label, pair, empty: !pair })
  return [
    mk('年柱', s?.year), mk('月柱', s?.month), mk('日柱', s?.day), mk('時柱', s?.hour),
  ]
})

const previewName = computed(() => f.name || t('saju.preview.guest'))
const previewBDate = computed(() => {
  if (!hasDate.value) return t('saju.preview.bdate')
  const base = `${f.year}.${String(f.month).padStart(2, '0')}.${String(f.day).padStart(2, '0')}`
  return f.hour != null ? `${base}  ·  ${fmtClock(f.hour, f.minute)}` : base
})
const mbtiComplete = computed(() => f.mbti.every((v) => v !== null))
const previewMbti = computed(() => (mbtiComplete.value ? f.mbti.join('') : '—'))
const previewZodiac = computed(() => {
  if (!saju.value) return '—'
  return `${t('zodiac.an.' + saju.value.zodiac)}${t('saju.preview.zodiacSuffix')} (${saju.value.zodiac})`
})
const previewOhaeng = computed(() => {
  if (!saju.value) return '—'
  const els = []
  ;[saju.value.year, saju.value.month, saju.value.day, saju.value.hour].forEach((p) => {
    if (!p) return
    els.push(STEM_EL[p[0]], BRANCH_EL[p[1]])
  })
  const count = { mok: 0, hwa: 0, to: 0, geum: 0, su: 0 }
  els.forEach((e) => { count[e]++ })
  return Object.entries(count).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${t('oh.' + k + '.ko')}${v}`).join(' ')
})

/* ============ Fortune type / CTA ============ */
const activeFtype = computed(() => FTYPES.find((x) => x.ft === f.fortuneType))
const needsLogin = computed(() => !!activeFtype.value?.pro)

/* ============ MBTI help popover ============ */
const mbtiHelpOpen = ref(false)
const mbtiHelpRoot = ref(null)
function onDocClick(e) { if (mbtiHelpRoot.value && !mbtiHelpRoot.value.contains(e.target)) mbtiHelpOpen.value = false }
const mbtiHighlight = ref(false)

/* ============ Saved persons (logged-in) ============ */
const loggedIn = computed(() => !!user.value)
const people = ref([])
const personSearch = ref('')
const activePersonId = ref(null)
const filteredPeople = computed(() => {
  const q = personSearch.value.trim().toLowerCase()
  return q ? people.value.filter((p) => (p.name || '').toLowerCase().includes(q)) : people.value
})
async function loadPeople() {
  if (!user.value) { people.value = []; return }
  const { data } = await supabase.from('people').select('*').eq('owner_id', user.value.id).order('created_at', { ascending: false })
  people.value = data || []
}
watch(user, loadPeople, { immediate: true })

function prefillFromPerson(p) {
  activePersonId.value = p.id
  f.name = p.name || ''
  f.gender = p.gender || 'm'
  f.calendar = p.calendar || 'solar'
  if (p.birth_date) {
    const [y, m, d] = p.birth_date.split('-').map(Number)
    f.year = y; f.month = m; f.day = d
  }
  if (p.birth_time) {
    const [h, mi] = String(p.birth_time).split(':').map(Number)
    f.hour = Number.isNaN(h) ? null : h
    f.minute = Number.isNaN(mi) ? null : mi
    hourUnknown.value = false
  } else {
    f.hour = null; f.minute = null; hourUnknown.value = false
  }
  f.mbti = p.mbti && p.mbti.length === 4 ? p.mbti.split('') : [null, null, null, null]
  f.place = p.birth_place || ''
}
function resetForm() {
  activePersonId.value = null
  Object.assign(f, { name: '', gender: 'm', calendar: 'solar', year: null, month: null, day: null, hour: null, minute: null, place: '', mbti: [null, null, null, null] })
  hourUnknown.value = false
}

/* ============ Save modal ============ */
const saveOpen = ref(false)
const saveName = ref('')
const saveRel = ref('self') // 기본은 '본인(나)'
const saveSummary = computed(() => {
  const dob = hasDate.value ? `${f.year}.${String(f.month).padStart(2, '0')}.${String(f.day).padStart(2, '0')} · ${t(CAL_LABEL[f.calendar])}` : '—'
  return [
    [t('saju.field.dob'), dob],
    [t('saju.field.gender'), t(f.gender === 'f' ? 'saju.field.female' : 'saju.field.male')],
    [t('saju.field.hour'), f.hour != null ? fmtClock(f.hour, f.minute) : t('saju.save.none')],
    ['MBTI', mbtiComplete.value ? f.mbti.join('') : t('saju.save.none')],
    [t('saju.field.place'), f.place || t('saju.save.none')],
  ]
})
function openSave() {
  if (!loggedIn.value) { gotoLogin('save'); return }
  if (!hasDate.value) { alert(t('saju.save.needBirth')); return }
  saveName.value = f.name || ''
  saveRel.value = 'self'
  saveOpen.value = true
}
async function confirmSave() {
  const name = saveName.value.trim()
  if (!name) { alert(t('saju.save.needName')); return }
  const tint = TINTS[Math.floor((f.year || 1) % TINTS.length)]
  const row = {
    owner_id: user.value.id,
    name,
    rel_key: saveRel.value || null,
    gender: f.gender,
    calendar: f.calendar,
    birth_date: hasDate.value ? `${f.year}-${String(f.month).padStart(2, '0')}-${String(f.day).padStart(2, '0')}` : null,
    birth_time: f.hour == null ? null : `${pad2(f.hour)}:${pad2(f.minute ?? 0)}:00`,
    mbti: mbtiComplete.value ? f.mbti.join('') : null,
    birth_place: f.place || null,
    tint,
  }
  // 본인(나)은 1명만 유지 — 기존 본인 행이 있으면 교체.
  if (saveRel.value === 'self') {
    await supabase.from('people').delete().eq('owner_id', user.value.id).eq('rel_key', 'self')
  }
  const { error } = await supabase.from('people').insert(row)
  if (error) { alert(error.message); return }
  saveOpen.value = false
  await loadPeople()
  alert(t('saju.save.done').replace('{name}', name))
}

/* ============ Navigation ============ */
function gotoLogin(reason) {
  return navigateTo(localePath({ path: '/login', query: { redirect: '/saju', service: f.fortuneType, ...(reason ? { reason } : {}) } }))
}
// Persist the current subject (guest → localStorage; logged-in cache too) so
// it survives navigation/refresh and the result page can read it.
function persistCurrent() {
  saveSaju({
    name: f.name, gender: f.gender, calendar: f.calendar,
    year: f.year, month: f.month, day: f.day,
    hour: f.hour, minute: f.minute, place: f.place, mbti: f.mbti.slice(),
  })
}
function prefillFromCurrent() {
  const c = savedSaju.value
  if (!c) return
  f.name = c.name || ''
  f.gender = c.gender || 'm'
  f.calendar = c.calendar || 'solar'
  f.year = c.year ?? null; f.month = c.month ?? null; f.day = c.day ?? null
  f.hour = c.hour ?? null; f.minute = c.minute ?? null
  hourUnknown.value = false
  f.place = c.place || ''
  f.mbti = c.mbti && c.mbti.length === 4 ? c.mbti.slice() : [null, null, null, null]
}

async function submit() {
  if (!hasDate.value) { alert(t('saju.alert.dob')); return }
  if (f.fortuneType === 'mbti' && f.mbti.some((v) => v === null)) {
    mbtiHighlight.value = false
    nextTick(() => { mbtiHighlight.value = true })
    alert(t('saju.alert.mbti'))
    return
  }
  persistCurrent()
  if (needsLogin.value) {
    if (!loggedIn.value) return gotoLogin('pro')
    if (f.fortuneType === 'couple') return navigateTo(localePath({ path: '/celeb-select', query: { service: 'celeb' } }))
    // 결제 스킵(v1): 평생운세는 바로 결과 페이지로. 궁합/MBTI는 추후 결제·상대선택 연결.
    if (f.fortuneType === 'lifetime') return navigateTo(localePath({ path: '/result/premium', query: { service: 'lifetime' } }))
    return navigateTo(localePath({ path: '/checkout', query: { service: 'mbti' } }))
  }
  return navigateTo(localePath({ path: '/result/free', query: { service: f.fortuneType } }))
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  // Restore previously-entered subject for guests (logged-in users use the person rail).
  if (!loggedIn.value && savedSaju.value) prefillFromCurrent()
})
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <main class="saju container">
    <!-- breadcrumb -->
    <nav class="crumb" :aria-label="t('common.home')">
      <NuxtLink :to="localePath('/')">{{ t('common.home') }}</NuxtLink>
      <span class="sep">›</span>
      <span class="current">{{ t('saju.crumb') }}</span>
    </nav>

    <div class="step-bar">
      <div class="step active"><span class="num">1</span><span>{{ t('saju.step1') }}</span></div>
      <div class="step-line" />
      <div class="step"><span class="num">2</span><span>{{ t('saju.step2') }}</span></div>
    </div>

    <div class="page-head">
      <h1 class="page-title">{{ t('saju.title') }}</h1>
      <p class="page-sub" v-html="t('saju.sub')" />
    </div>

    <!-- Guest banner (logged out) -->
    <div v-if="!loggedIn" class="guest-banner">
      <div class="icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
      </div>
      <div class="guest-banner-text">
        <strong>{{ t('saju.guest.title') }}</strong>
        <span>{{ t('saju.guest.desc') }}</span>
      </div>
      <button class="btn btn-secondary btn-sm" @click="gotoLogin()">{{ t('common.loginOrSignup') }}</button>
    </div>

    <!-- Saved person rail (logged in) -->
    <section v-else class="load-row">
      <div class="load-head">
        <span class="lt">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
          {{ t('saju.load.title') }}
        </span>
        <span class="lh">{{ t('saju.load.hint') }}</span>
        <span v-if="people.length > 6" class="load-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input v-model="personSearch" type="text" :placeholder="t('saju.load.search')" />
        </span>
      </div>
      <div class="person-rail">
        <button class="person new" @click="resetForm">
          <span class="plus"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg></span>
          <span>{{ t('saju.load.new') }}</span>
        </button>
        <button v-for="p in filteredPeople" :key="p.id" class="person" :class="{ active: activePersonId === p.id }" @click="prefillFromPerson(p)">
          <span class="av" :class="`tint-${p.tint || 'gold'}`">{{ (p.name || '?').trim().charAt(0) }}</span>
          <span class="pmeta">
            <span class="pname">{{ p.name }}</span>
            <span v-if="p.rel_key" class="prel">{{ t('cel.rel.' + p.rel_key) }}</span>
          </span>
        </button>
      </div>
      <p v-if="people.length === 0" class="load-empty">{{ t('saju.load.empty') }}</p>
    </section>

    <div class="layout">
      <!-- LEFT: form -->
      <div class="form-side">
        <!-- Panel 1: 기본 정보 -->
        <section class="panel">
          <div class="panel-head">
            <div class="panel-title"><span class="num">01</span><span>{{ t('saju.panel1') }}</span></div>
            <span class="panel-hint">BASIC</span>
          </div>

          <div class="field">
            <label class="lbl"><span>{{ t('saju.field.name') }}</span> <span class="opt">{{ t('common.optional') }}</span></label>
            <input v-model="f.name" type="text" class="input" :placeholder="t('saju.field.name.ph')" />
          </div>

          <div class="field-row">
            <div class="field" style="margin-bottom:0;">
              <label class="lbl"><span>{{ t('saju.field.gender') }}</span> <span class="req">{{ t('common.required') }}</span></label>
              <div class="gender-row">
                <button class="gender-chip" :class="{ active: f.gender === 'm' }" @click="f.gender = 'm'"><span class="h">男</span><span class="k">{{ t('saju.field.male') }}</span></button>
                <button class="gender-chip" :class="{ active: f.gender === 'f' }" @click="f.gender = 'f'"><span class="h">女</span><span class="k">{{ t('saju.field.female') }}</span></button>
              </div>
            </div>
            <div class="field" style="margin-bottom:0;">
              <label class="lbl"><span>{{ t('saju.field.calendar') }}</span> <span class="req">{{ t('common.required') }}</span></label>
              <div class="segment" style="display:flex;">
                <button :class="{ active: f.calendar === 'solar' }" @click="f.calendar = 'solar'">{{ t('saju.cal.solar') }}</button>
                <button :class="{ active: f.calendar === 'lunar' }" @click="f.calendar = 'lunar'">{{ t('saju.cal.lunar') }}</button>
                <button :class="{ active: f.calendar === 'lunar-leap' }" @click="f.calendar = 'lunar-leap'">{{ t('saju.cal.leap') }}</button>
              </div>
            </div>
          </div>

          <div class="field" :class="{ highlight: mbtiHighlight }" style="margin-bottom:0;">
            <div class="mbti-head">
              <label class="lbl" style="margin-bottom:0;">MBTI <span class="opt">{{ t('saju.field.mbti.sub') }}</span></label>
              <span class="mbti-pill" :class="{ complete: mbtiComplete }">
                <template v-if="mbtiComplete">{{ f.mbti.join('') }}</template>
                <template v-else><span v-for="(v, i) in f.mbti" :key="i" :class="{ dim: !v }">{{ v || '-' }}</span></template>
              </span>
            </div>
            <div class="mbti-row">
              <div v-for="(axis, ai) in MBTI_AXES" :key="ai" class="mbti-axis">
                <button v-for="opt in axis" :key="opt.v" :class="{ active: f.mbti[ai] === opt.v }" @click="f.mbti[ai] = opt.v">
                  <strong>{{ opt.v }}</strong><small>{{ t(opt.k) }}</small>
                </button>
              </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; gap:var(--space-3); flex-wrap:wrap;">
              <p style="font-size:var(--text-xs); color:var(--text-muted); line-height:1.6; flex:1; min-width:200px;">{{ t('saju.mbti.hint') }}</p>
              <div style="display:flex; align-items:center; gap:var(--space-2);">
                <div ref="mbtiHelpRoot" class="mbti-help" :class="{ open: mbtiHelpOpen }">
                  <button type="button" class="mbti-help-btn" @click.stop="mbtiHelpOpen = !mbtiHelpOpen">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                    <span>{{ t('saju.mbti.help') }}</span>
                  </button>
                  <div class="mbti-help-pop" role="menu">
                    <div class="pop-head">{{ t('saju.mbti.help.head') }}</div>
                    <a href="https://www.16personalities.com/ko" target="_blank" rel="noopener"><span class="flag">🇰🇷</span><span class="lang">한국어</span><span class="ext">↗</span></a>
                    <a href="https://www.16personalities.com/" target="_blank" rel="noopener"><span class="flag">🇺🇸</span><span class="lang">English</span><span class="ext">↗</span></a>
                    <a href="https://www.16personalities.com/ja" target="_blank" rel="noopener"><span class="flag">🇯🇵</span><span class="lang">日本語</span><span class="ext">↗</span></a>
                    <a href="https://www.16personalities.com/tw" target="_blank" rel="noopener"><span class="flag">🇹🇼</span><span class="lang">繁體中文</span><span class="ext">↗</span></a>
                    <p class="pop-foot">{{ t('saju.mbti.help.foot') }}</p>
                  </div>
                </div>
                <button type="button" class="mbti-clear" @click="f.mbti = [null, null, null, null]">{{ t('saju.mbti.clear') }}</button>
              </div>
            </div>
          </div>
        </section>

        <!-- Panel 2: 생년월일시 -->
        <section class="panel">
          <div class="panel-head">
            <div class="panel-title"><span class="num">02</span><span>{{ t('saju.panel2') }}</span></div>
            <span class="panel-hint">BIRTH</span>
          </div>
          <div class="field">
            <label class="lbl"><span>{{ t('saju.field.dob') }}</span> <span class="req">{{ t('common.required') }}</span></label>
            <div class="date-row">
              <select v-model.number="f.year" class="input"><option :value="null">{{ t('saju.year.ph') }}</option><option v-for="y in years" :key="y" :value="y">{{ y }}{{ t('saju.year.fmt') }}</option></select>
              <select v-model.number="f.month" class="input"><option :value="null">{{ t('saju.month.ph') }}</option><option v-for="m in months" :key="m" :value="m">{{ m }}{{ t('saju.month.fmt') }}</option></select>
              <select v-model.number="f.day" class="input"><option :value="null">{{ t('saju.day.ph') }}</option><option v-for="d in days" :key="d" :value="d">{{ d }}{{ t('saju.day.fmt') }}</option></select>
            </div>
          </div>
          <div class="field" style="margin-bottom:0;">
            <label class="lbl"><span>{{ t('saju.field.hour') }}</span> <span class="opt">{{ t('saju.field.hour.sub') }}</span></label>
            <div class="time-row">
              <select v-model.number="f.hour" class="input" :disabled="hourUnknown"><option :value="null">{{ t('saju.hour.ph') }}</option><option v-for="h in hourOpts" :key="h" :value="h">{{ pad2(h) }}{{ t('saju.field.hour.h') }}</option></select>
              <select v-model.number="f.minute" class="input" :disabled="hourUnknown"><option :value="null">{{ t('saju.min.ph') }}</option><option v-for="mi in minuteOpts" :key="mi" :value="mi">{{ pad2(mi) }}{{ t('saju.field.hour.m') }}</option></select>
            </div>
            <label class="hour-unknown"><input v-model="hourUnknown" type="checkbox"><span>{{ t('saju.hour.unknown') }}</span></label>
          </div>
        </section>

        <!-- Panel 3: 출생지 -->
        <section class="panel">
          <div class="panel-head">
            <div class="panel-title"><span class="num">03</span><span>{{ t('saju.panel3') }}</span> <span class="opt" style="margin-left:4px;">OPTIONAL</span></div>
            <span class="panel-hint">FINE-TUNE</span>
          </div>
          <div class="field">
            <label class="lbl"><span>{{ t('saju.field.place') }}</span> <span class="opt">{{ t('saju.field.place.sub') }}</span></label>
            <div class="birthplace-input">
              <svg class="pin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              <input v-model="f.place" type="text" class="input" :placeholder="t('saju.field.place.ph')" />
            </div>
            <p style="margin-top:8px; font-size:var(--text-xs); color:var(--text-muted); line-height:1.6;">{{ t('saju.field.place.note') }}</p>
          </div>
        </section>

        <!-- Panel 4: 운세 종류 -->
        <section class="panel">
          <div class="panel-head">
            <div class="panel-title"><span class="num">04</span><span>{{ t('saju.panel4') }}</span></div>
            <span class="panel-hint">CHOOSE</span>
          </div>
          <div class="ftype-grid">
            <div v-for="x in FTYPES" :key="x.ft" class="ftype" :class="{ active: f.fortuneType === x.ft }" @click="f.fortuneType = x.ft">
              <span class="ftype-tag" :class="x.pro ? 'pro' : 'free'">{{ x.pro ? t('saju.ft.pro') : t('saju.ft.free') }}</span>
              <div class="ftype-h">{{ x.glyph }}</div>
              <div class="ftype-k">{{ t(x.k) }}</div>
              <div class="ftype-d">{{ t(x.d) }}</div>
            </div>
          </div>
        </section>
      </div>

      <!-- RIGHT: preview -->
      <aside class="preview-side">
        <div class="preview-panel">
          <div class="preview-head">
            <div class="preview-eyebrow">{{ t('saju.preview.eyebrow') }}</div>
            <div class="preview-name">{{ previewName }}</div>
            <div class="preview-bdate">{{ previewBDate }}</div>
          </div>

          <div class="pillars">
            <div v-for="p in pillars" :key="p.label" class="pillar" :class="{ empty: p.empty, computed: !p.empty }">
              <div class="pillar-label">{{ p.label }}</div>
              <div class="pillar-cell">
                <span class="pillar-stem" :class="p.pair ? 'el-' + STEM_EL[p.pair[0]] : ''">{{ p.pair ? p.pair[0] : '?' }}</span>
                <span class="pillar-branch" :class="p.pair ? 'el-' + BRANCH_EL[p.pair[1]] : ''">{{ p.pair ? p.pair[1] : '?' }}</span>
              </div>
            </div>
          </div>

          <div class="preview-info">
            <div class="info-cell"><div class="info-label">{{ t('saju.preview.zodiac') }}</div><div class="info-value">{{ previewZodiac }}</div></div>
            <div class="info-cell"><div class="info-label">MBTI</div><div class="info-value">{{ previewMbti }}</div></div>
            <div class="info-cell" style="grid-column:span 2;"><div class="info-label">{{ t('saju.preview.oh') }}</div><div class="info-value">{{ previewOhaeng }}</div></div>
          </div>

          <p class="preview-note" v-html="t('saju.preview.note')" />

          <div class="actions">
            <div class="row-1">
              <button class="btn btn-primary" @click="submit">
                <span v-if="needsLogin">{{ loggedIn ? t('saju.cta.premiumIn') : t('saju.cta.premium') }}</span>
                <span v-else>{{ t('saju.cta.free') }}</span>
                <svg v-if="needsLogin && !loggedIn" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </button>
              <button class="btn btn-secondary" @click="openSave">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /><line x1="12" y1="8" x2="12" y2="14" /><line x1="9" y1="11" x2="15" y2="11" /></svg>
                <span>{{ t('saju.save.btn') }}</span>
              </button>
            </div>
            <p v-if="needsLogin && !loggedIn" class="actions-hint">{{ t('saju.hint.premium') }}</p>
            <p v-else-if="!needsLogin" class="actions-hint">{{ t('saju.hint.free') }}</p>
          </div>

          <div class="trust-strip">
            <div class="item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg><span>{{ t('saju.trust.ssl') }}</span></div>
            <div class="item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg><span>{{ t('saju.trust.nosave') }}</span></div>
            <div class="item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg><span>{{ t('saju.trust.fast') }}</span></div>
          </div>
        </div>
      </aside>
    </div>

    <!-- SAVE MODAL -->
    <div class="modal-overlay" :class="{ open: saveOpen }" @click.self="saveOpen = false">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <span class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg></span>
          <h2>{{ t('saju.save.title') }}</h2>
          <button class="modal-close" :aria-label="t('saju.save.cancel')" @click="saveOpen = false"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
        </div>
        <div class="modal-body">
          <p class="mdesc">{{ t('saju.save.desc') }}</p>
          <div class="mfield">
            <label>{{ t('saju.save.nameLabel') }}</label>
            <input v-model="saveName" type="text" class="input" :placeholder="t('saju.save.namePh')" />
          </div>
          <div class="mfield">
            <label>{{ t('saju.save.relLabel') }}</label>
            <select v-model="saveRel" class="input"><option v-for="r in REL_KEYS" :key="r" :value="r">{{ t('cel.rel.' + r) }}</option></select>
          </div>
          <div class="msummary">
            <div class="sh">{{ t('saju.save.summary') }}</div>
            <div><div v-for="([k, v], i) in saveSummary" :key="i" class="srow"><span class="sk">{{ k }}</span><span class="sv">{{ v }}</span></div></div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-secondary" @click="saveOpen = false">{{ t('saju.save.cancel') }}</button>
          <button class="btn btn-primary" @click="confirmSave"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12" /></svg><span>{{ t('saju.save.confirm') }}</span></button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.saju { padding-top: 104px; padding-bottom: var(--space-24); max-width: 1120px; margin: 0 auto; }

.crumb { display: flex; align-items: center; gap: var(--space-3); font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.2em; text-transform: uppercase; color: var(--text-muted); margin-top: var(--space-8); margin-bottom: var(--space-6); }
.crumb a { color: var(--text-muted); transition: color 0.2s; }
.crumb a:hover { color: var(--gold-primary); }
.crumb .sep { color: var(--gold-deep); }
.crumb .current { color: var(--gold-primary); }

.step-bar { display: flex; align-items: center; gap: var(--space-4); margin-bottom: var(--space-8); }
.step { display: flex; align-items: center; gap: var(--space-3); padding: 8px 14px; border-radius: var(--radius-full); font-size: var(--text-sm); color: var(--text-muted); }
.step .num { width: 24px; height: 24px; border-radius: 50%; border: 1px solid var(--gold-border); display: inline-flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-size: 12px; }
.step.active { color: var(--gold-light); }
.step.active .num { background: var(--gold-primary); color: var(--text-on-gold); border-color: var(--gold-primary); }
.step-line { flex: 0 0 60px; height: 1px; background: var(--gold-border); }

.page-head { margin-bottom: var(--space-12); }
.page-title { font-family: var(--font-display); font-size: clamp(1.875rem, 4vw, 2.75rem); font-weight: 600; line-height: 1.15; letter-spacing: -0.02em; margin-bottom: var(--space-3); }
.page-sub { color: var(--text-secondary); font-size: var(--text-lg); line-height: 1.7; max-width: 640px; }

.guest-banner { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4) var(--space-6); background: rgba(139, 92, 246, 0.06); border: 1px solid rgba(139, 92, 246, 0.25); border-radius: var(--radius-lg); margin-bottom: var(--space-8); flex-wrap: wrap; }
.guest-banner .icon { width: 40px; height: 40px; border-radius: 50%; background: rgba(139, 92, 246, 0.12); color: var(--accent-purple); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.guest-banner-text { flex: 1; min-width: 200px; }
.guest-banner-text strong { display: block; color: var(--text-primary); font-family: var(--font-display); font-size: var(--text-base); margin-bottom: 2px; }
.guest-banner-text span { color: var(--text-secondary); font-size: var(--text-sm); }
.guest-banner .btn-sm { white-space: nowrap; }

.layout { display: grid; grid-template-columns: 1.4fr 1fr; gap: var(--space-8); align-items: flex-start; }
@media (max-width: 1024px) { .layout { grid-template-columns: 1fr; } }

.panel { background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-xl); padding: var(--space-8); box-shadow: inset 0 1px 0 rgba(240, 208, 128, 0.1), 0 8px 32px rgba(0, 0, 0, 0.4); }
.panel + .panel { margin-top: var(--space-6); }
.panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-6); gap: var(--space-3); flex-wrap: wrap; }
.panel-title { display: flex; align-items: center; gap: var(--space-3); font-family: var(--font-display); font-size: var(--text-xl); font-weight: 600; }
.panel-title .num { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--gold-primary); padding: 3px 8px; border: 1px solid var(--gold-border); border-radius: var(--radius-sm); letter-spacing: 0.15em; }
.panel-hint { color: var(--text-muted); font-size: var(--text-xs); font-family: var(--font-mono); letter-spacing: 0.05em; }

.field { margin-bottom: var(--space-6); }
.field:last-child { margin-bottom: 0; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-6); }
@media (max-width: 640px) { .field-row { grid-template-columns: 1fr; } }
label.lbl { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); font-weight: 500; color: var(--text-secondary); margin-bottom: var(--space-3); letter-spacing: 0.02em; }
label.lbl .req { color: var(--gold-primary); font-family: var(--font-mono); font-size: 10px; }
label.lbl .opt { color: var(--text-muted); font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; }

.input { width: 100%; padding: 14px 16px; background: var(--bg-tertiary); border: 1px solid var(--gold-border); border-radius: var(--radius-md); color: var(--text-primary); font-family: var(--font-body); font-size: var(--text-base); transition: all 0.2s; appearance: none; -webkit-appearance: none; }
.input:focus { outline: none; border-color: var(--gold-primary); background: var(--bg-elevated); box-shadow: 0 0 0 3px rgba(201, 168, 76, 0.12); }
.input::placeholder { color: var(--text-muted); }
select.input { background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23C9A84C' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'/%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 14px center; background-size: 14px; padding-right: 40px; }

.segment { display: inline-flex; padding: 4px; background: var(--bg-tertiary); border: 1px solid var(--gold-border); border-radius: var(--radius-md); gap: 2px; }
.segment button { padding: 10px 18px; border-radius: 6px; font-size: var(--text-sm); color: var(--text-secondary); font-weight: 500; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; }
.segment button.active { background: var(--gold-primary); color: var(--text-on-gold); font-weight: 600; }
.segment button:not(.active):hover { color: var(--text-primary); }

.date-row { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: var(--space-3); }
@media (max-width: 480px) { .date-row { grid-template-columns: 1fr 1fr 1fr; } }

.time-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.input:disabled { opacity: 0.45; cursor: not-allowed; }
.hour-unknown { display: inline-flex; align-items: center; gap: 8px; margin-top: var(--space-3); font-size: var(--text-sm); color: var(--text-secondary); cursor: pointer; }
.hour-unknown input { width: 16px; height: 16px; accent-color: var(--gold-primary); cursor: pointer; }

.gender-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.gender-chip { padding: 16px; border: 1px solid var(--gold-border); border-radius: var(--radius-md); background: var(--bg-tertiary); cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; gap: var(--space-2); }
.gender-chip:hover { border-color: var(--gold-primary); }
.gender-chip.active { background: var(--gold-soft); border-color: var(--gold-primary); }
.gender-chip .h { font-family: var(--font-mono); font-size: var(--text-2xl); color: var(--gold-light); }
.gender-chip .k { font-size: var(--text-sm); color: var(--text-primary); }

.mbti-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3); gap: var(--space-3); }
.mbti-pill { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; font-family: var(--font-mono); font-size: var(--text-sm); letter-spacing: 0.2em; color: var(--gold-light); background: var(--bg-tertiary); border: 1px solid var(--gold-border); border-radius: var(--radius-sm); min-width: 76px; justify-content: center; transition: all 0.2s; }
.mbti-pill.complete { background: var(--gold-soft); border-color: var(--gold-primary); color: var(--gold-light); font-weight: 600; }
.mbti-pill .dim { opacity: 0.3; }
.mbti-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-2); }
@media (max-width: 480px) { .mbti-row { grid-template-columns: repeat(2, 1fr); } }
.mbti-axis { display: flex; background: var(--bg-tertiary); border: 1px solid var(--gold-border); border-radius: var(--radius-md); padding: 4px; gap: 2px; }
.mbti-axis button { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 8px 0 7px; border-radius: 6px; color: var(--text-secondary); font-weight: 500; transition: all 0.2s; }
.mbti-axis button strong { font-family: var(--font-mono); font-size: var(--text-lg); font-weight: 600; line-height: 1; }
.mbti-axis button small { font-size: 10px; letter-spacing: 0.05em; opacity: 0.6; }
.mbti-axis button.active { background: var(--gold-primary); color: var(--text-on-gold); }
.mbti-axis button.active small { opacity: 0.8; }
.mbti-axis button:not(.active):hover { color: var(--text-primary); }
.mbti-clear { font-size: var(--text-xs); font-family: var(--font-mono); color: var(--text-muted); letter-spacing: 0.1em; padding: 4px 8px; transition: color 0.2s; }
.mbti-clear:hover { color: var(--gold-primary); }
.mbti-help { position: relative; }
.mbti-help-btn { display: inline-flex; align-items: center; gap: 4px; font-size: var(--text-xs); font-family: var(--font-mono); color: var(--gold-primary); letter-spacing: 0.05em; padding: 4px 10px; border: 1px solid var(--gold-border); border-radius: var(--radius-sm); background: var(--bg-tertiary); transition: all 0.2s; }
.mbti-help-btn:hover { border-color: var(--gold-primary); color: var(--gold-light); background: var(--gold-soft); }
.mbti-help-pop { position: absolute; top: calc(100% + 8px); right: 0; min-width: 240px; background: var(--bg-elevated); border: 1px solid var(--gold-border-strong); border-radius: var(--radius-md); padding: var(--space-3); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(240, 208, 128, 0.15); z-index: 20; opacity: 0; transform: translateY(-6px); pointer-events: none; transition: opacity 0.2s, transform 0.2s; }
.mbti-help.open .mbti-help-pop { opacity: 1; transform: translateY(0); pointer-events: auto; }
.mbti-help-pop .pop-head { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--gold-primary); padding: 4px 8px 8px; border-bottom: 1px solid var(--gold-border); margin-bottom: 6px; }
.mbti-help-pop a { display: flex; align-items: center; gap: var(--space-3); padding: 8px 8px; border-radius: var(--radius-sm); font-size: var(--text-sm); color: var(--text-primary); transition: background 0.15s; }
.mbti-help-pop a:hover { background: var(--bg-tertiary); }
.mbti-help-pop a .flag { font-size: 16px; }
.mbti-help-pop a .lang { flex: 1; }
.mbti-help-pop a .ext { color: var(--gold-primary); font-family: var(--font-mono); }
.mbti-help-pop .pop-foot { font-size: var(--text-xs); color: var(--text-muted); padding: 6px 8px 0; border-top: 1px solid var(--gold-border); margin-top: 6px; line-height: 1.5; }

.field.highlight { animation: highlightFlash 1.6s var(--ease-out); }
@keyframes highlightFlash { 0%, 100% { box-shadow: none; } 30% { box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.25); } }

.birthplace-input { position: relative; }
.birthplace-input .input { padding-left: 44px; }
.birthplace-input .pin { position: absolute; top: 50%; left: 14px; transform: translateY(-50%); color: var(--gold-primary); }

.preview-panel { position: sticky; top: 104px; background: linear-gradient(180deg, var(--bg-secondary), var(--bg-primary)); border: 1px solid var(--gold-border); border-radius: var(--radius-xl); padding: var(--space-8); box-shadow: inset 0 1px 0 rgba(240, 208, 128, 0.15), 0 8px 32px rgba(0, 0, 0, 0.4); }
.preview-head { text-align: center; padding-bottom: var(--space-6); border-bottom: 1px solid var(--gold-border); margin-bottom: var(--space-6); }
.preview-eyebrow { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.3em; text-transform: uppercase; color: var(--gold-primary); margin-bottom: var(--space-2); }
.preview-name { font-family: var(--font-display); font-size: var(--text-xl); color: var(--text-primary); margin-bottom: 4px; }
.preview-bdate { font-size: var(--text-sm); color: var(--text-muted); font-family: var(--font-mono); letter-spacing: 0.05em; }

.pillars { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-2); margin-bottom: var(--space-6); }
.pillar { text-align: center; padding: var(--space-4) var(--space-2); background: var(--bg-tertiary); border: 1px solid var(--gold-border); border-radius: var(--radius-md); transition: all 0.3s var(--ease-out); }
.pillar.computed { background: var(--bg-elevated); border-color: var(--gold-border-strong); }
.pillar-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--text-muted); margin-bottom: var(--space-3); }
.pillar-cell { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.pillar-stem, .pillar-branch { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-family: var(--font-mono); font-size: var(--text-2xl); font-weight: 500; transition: all 0.3s; }
.pillar-stem { color: var(--text-primary); }
.pillar-branch { color: var(--gold-light); }
.pillar.empty .pillar-stem, .pillar.empty .pillar-branch { color: var(--text-muted); opacity: 0.3; }
.el-mok { background: rgba(91, 164, 104, 0.15); color: #86C39A !important; }
.el-hwa { background: rgba(220, 38, 38, 0.15); color: #F87171 !important; }
.el-to { background: rgba(212, 168, 87, 0.15); color: #F0D080 !important; }
.el-geum { background: rgba(232, 224, 208, 0.10); color: #E8E0D0 !important; }
.el-su { background: rgba(59, 130, 246, 0.15); color: #93C5FD !important; }

.preview-info { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3); padding: var(--space-4); background: var(--bg-tertiary); border-radius: var(--radius-md); margin-bottom: var(--space-6); }
.info-cell { text-align: center; }
.info-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px; }
.info-value { font-family: var(--font-display); font-size: var(--text-base); color: var(--gold-light); }
.preview-note { text-align: center; font-size: var(--text-xs); color: var(--text-muted); padding: var(--space-3); background: var(--bg-primary); border-radius: var(--radius-sm); margin-bottom: var(--space-6); line-height: 1.6; }

.actions { margin-top: var(--space-8); display: flex; flex-direction: column; gap: var(--space-3); }
.actions .row-1 { display: flex; gap: var(--space-3); }
/* 긴 CTA(예: ja "ログインしてプレミアム結果を取得")가 잘리지 않도록: 전역 .btn의
   nowrap+overflow:hidden을 이 행에서만 풀고, 폰트 축소 + min-width:0 + 프리미엄
   버튼에 더 큰 flex 가중치를 준다. word-break:keep-all은 쓰지 않는다 — 공백 없는
   일본어 CJK가 줄바꿈을 못 해 넘쳐 잘렸음. overflow-wrap:anywhere로 어느 언어든
   필요하면 문자 단위로 줄바꿈해 전체 글자가 보이게 한다. */
.actions .row-1 .btn { flex: 1; min-width: 0; padding: var(--space-4) var(--space-3); font-size: var(--text-sm); white-space: normal; line-height: 1.25; overflow-wrap: anywhere; }
.actions .row-1 .btn-primary { flex: 1.5; }
.actions-hint { text-align: center; font-size: var(--text-xs); color: var(--text-muted); padding-top: var(--space-2); }

.ftype-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); margin-top: var(--space-3); }
@media (max-width: 640px) { .ftype-grid { grid-template-columns: repeat(2, 1fr); } }
.ftype { position: relative; padding: var(--space-4); background: var(--bg-tertiary); border: 1px solid var(--gold-border); border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s; }
.ftype:hover { border-color: var(--gold-primary); transform: translateY(-2px); }
.ftype.active { background: var(--gold-soft); border-color: var(--gold-primary); box-shadow: 0 0 24px rgba(201, 168, 76, 0.2); }
.ftype-h { font-family: var(--font-mono); font-size: var(--text-2xl); color: var(--gold-light); margin-bottom: var(--space-2); line-height: 1; }
.ftype-k { font-family: var(--font-display); font-size: var(--text-base); color: var(--text-primary); margin-bottom: var(--space-1); }
.ftype-d { font-size: var(--text-xs); color: var(--text-muted); line-height: 1.4; }
.ftype-tag { position: absolute; top: 8px; right: 8px; font-size: 9px; font-family: var(--font-mono); letter-spacing: 0.1em; padding: 2px 6px; border-radius: 4px; }
.ftype-tag.free { background: rgba(16, 185, 129, 0.15); color: var(--accent-jade); border: 1px solid rgba(16, 185, 129, 0.3); }
.ftype-tag.pro { background: linear-gradient(135deg, var(--gold-primary), var(--gold-light)); color: var(--text-on-gold); }

.trust-strip { display: flex; gap: var(--space-6); justify-content: center; flex-wrap: wrap; margin-top: var(--space-8); padding-top: var(--space-8); border-top: 1px solid var(--gold-border); }
.trust-strip .item { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-xs); color: var(--text-muted); font-family: var(--font-mono); letter-spacing: 0.05em; }
.trust-strip svg { color: var(--gold-primary); }

.load-row { background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); padding: 1.25rem var(--space-6); margin-bottom: var(--space-8); }
.load-head { display: flex; align-items: baseline; gap: var(--space-3); margin-bottom: var(--space-4); flex-wrap: wrap; }
.load-head .lt { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-display); font-size: var(--text-base); font-weight: 600; color: var(--text-primary); }
.load-head .lt svg { color: var(--gold-primary); }
.load-head .lh { font-size: var(--text-xs); color: var(--text-muted); }
.load-search { position: relative; margin-left: auto; }
.load-search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.load-search input { width: 170px; padding: 8px 14px 8px 32px; border-radius: var(--radius-full); border: 1px solid var(--gold-border); background: var(--bg-tertiary); color: var(--text-primary); font-family: var(--font-body); font-size: var(--text-sm); transition: border-color 0.2s; }
.load-search input:focus { outline: none; border-color: var(--gold-primary); }
@media (max-width: 560px) { .load-search { margin-left: 0; width: 100%; } .load-search input { width: 100%; } }
.person-rail { display: flex; gap: var(--space-3); overflow-x: auto; padding: 6px 2px 8px; scrollbar-width: thin; }
.person { flex: 0 0 auto; display: flex; align-items: center; gap: 10px; padding: 8px 14px 8px 8px; border: 1px solid var(--gold-border); border-radius: var(--radius-full); background: var(--bg-tertiary); cursor: pointer; transition: all 0.18s; text-align: left; }
.person:hover { border-color: var(--gold-primary); transform: translateY(-2px); }
.person.active { border-color: var(--gold-primary); background: var(--gold-soft); }
.person .av { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 700; font-size: 15px; color: rgba(255, 255, 255, 0.95); border: 1px solid var(--gold-border); }
.person .av.tint-gold { background: radial-gradient(circle at 50% 35%, #4a3f1e, #1a160c); }
.person .av.tint-rose { background: radial-gradient(circle at 50% 35%, #4d2438, #1c0f17); }
.person .av.tint-purple { background: radial-gradient(circle at 50% 35%, #342a55, #14101f); }
.person .av.tint-jade { background: radial-gradient(circle at 50% 35%, #14402f, #0a1812); }
.person .av.tint-blue { background: radial-gradient(circle at 50% 35%, #1d3a55, #0b141d); }
.person .pmeta { display: flex; flex-direction: column; gap: 1px; line-height: 1.2; }
.person .pname { font-size: var(--text-sm); font-weight: 600; color: var(--text-primary); }
.person .prel { font-size: 10px; font-family: var(--font-mono); color: var(--gold-primary); letter-spacing: 0.04em; }
.person.new { border-style: dashed; color: var(--text-secondary); padding: 8px 16px; }
.person.new .plus { width: 34px; height: 34px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--gold-border-strong); color: var(--gold-light); background: var(--bg-secondary); }
.load-empty { font-size: var(--text-sm); color: var(--text-muted); line-height: 1.6; }

.modal-overlay { position: fixed; inset: 0; z-index: 300; background: rgba(8, 8, 12, 0.78); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); display: none; align-items: center; justify-content: center; padding: var(--space-6); }
.modal-overlay.open { display: flex; }
.modal { width: 100%; max-width: 460px; max-height: 90vh; overflow-y: auto; background: var(--bg-secondary); border: 1px solid var(--gold-border-strong); border-radius: var(--radius-xl); box-shadow: var(--shadow-deep); animation: pop 0.26s var(--ease-out); }
@keyframes pop { from { opacity: 0; transform: translateY(14px) scale(0.98); } to { opacity: 1; transform: none; } }
.modal-head { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-6) var(--space-6) var(--space-4); border-bottom: 1px solid var(--gold-border); }
.modal-head .ic { width: 34px; height: 34px; border-radius: var(--radius-sm); flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; background: var(--gold-soft); color: var(--gold-primary); }
.modal-head h2 { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 600; flex: 1; }
.modal-close { width: 34px; height: 34px; border-radius: var(--radius-sm); color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; }
.modal-close:hover { background: var(--bg-tertiary); color: var(--text-primary); }
.modal-body { padding: var(--space-6); display: flex; flex-direction: column; gap: 1.25rem; }
.modal-body .mdesc { font-size: var(--text-sm); color: var(--text-secondary); line-height: 1.6; margin-top: -4px; }
.mfield { display: flex; flex-direction: column; gap: 8px; }
.mfield > label { font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary); }
.msummary { background: var(--bg-tertiary); border: 1px solid var(--gold-border); border-radius: var(--radius-md); padding: var(--space-4); }
.msummary .sh { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-muted); margin-bottom: var(--space-3); }
.msummary .srow { display: flex; justify-content: space-between; gap: var(--space-4); font-size: var(--text-sm); padding: 4px 0; }
.msummary .srow .sk { color: var(--text-muted); }
.msummary .srow .sv { color: var(--text-primary); font-weight: 500; text-align: right; }
.modal-foot { display: flex; gap: var(--space-3); padding: 0 var(--space-6) var(--space-6); }
.modal-foot .btn { flex: 1; justify-content: center; }
.modal-foot .btn-primary { flex: 1.5; }
</style>
