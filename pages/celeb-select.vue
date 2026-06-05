<script setup>
// 연예인 궁합 — 상대 선택 — ported from 연예인 선택.html.
// Header/tabbar come from the default layout. The prototype's demo switcher
// (preview-only) is dropped: `service` comes from ?service=, login state from
// real Supabase auth. Celebrities are real DB data (/api/celebs); the 내 지인
// tab reads the user's saved `people`. Selecting a partner routes to /checkout
// (the PRO payment screen — next to build), preserving the designed flow.
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const PER_PAGE = 11
const MBTI_TYPES = ['ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP', 'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ']
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const REL_KEYS = ['partner', 'friend', 'family', 'crush', 'colleague']

const service = computed(() => (route.query.service === 'mbti' ? 'mbti' : 'celeb'))
const isMbti = computed(() => service.value === 'mbti')

// SEO (title mirrors the head; brand suffix kept like other pages)
const pageTitle = computed(() => (isMbti.value ? t('cel.title.mbti') : t('cel.title.celeb')))
const pageSub = computed(() => (isMbti.value ? t('cel.sub.mbti') : t('cel.sub.celeb')))
useSeoMeta({
  title: () => `${pageTitle.value} · ${t('seo.titleSuffix')}`,
  description: () => pageSub.value,
  ogTitle: () => `${pageTitle.value} · ${t('seo.titleSuffix')}`,
  ogDescription: () => pageSub.value,
})

/* ---- celebrities (real data) ---- */
const { data: celebData } = await useFetch('/api/celebs', {
  query: { lang: locale },
})
const celebs = computed(() => celebData.value?.celebs || [])

/* ---- tab / search / paging state ---- */
const tab = ref('celeb') // celeb | friends
const page = ref(1)
const query = ref('')

const filteredCelebs = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return celebs.value
  return celebs.value.filter((c) => Object.values(c.names || {}).some((n) => String(n).toLowerCase().includes(q)))
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredCelebs.value.length / PER_PAGE)))
const pageItems = computed(() => {
  const p = Math.min(page.value, totalPages.value)
  const start = (p - 1) * PER_PAGE
  return filteredCelebs.value.slice(start, start + PER_PAGE)
})
const pagerNums = computed(() => Array.from({ length: totalPages.value }, (_, i) => i + 1))
watch([query, tab, service], () => { page.value = 1 })

function gotoPage(p) {
  if (p < 1 || p > totalPages.value) return
  page.value = p
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}

/* ---- friends (saved people, logged-in only) ---- */
const friends = ref([])
async function loadFriends() {
  if (!user.value) { friends.value = []; return }
  const { data } = await supabase
    .from('people')
    .select('id, name, gender, calendar, birth_date, mbti, rel_key, tint')
    .eq('owner_id', user.value.id)
    .order('created_at', { ascending: false })
  friends.value = (data || []).map((p) => ({
    id: p.id,
    name: p.name,
    mbti: p.mbti || '',
    relKey: p.rel_key || 'friend',
    tint: p.tint || 'gold',
    gender: p.gender,
    birth: p.birth_date
      ? { y: +p.birth_date.slice(0, 4), m: +p.birth_date.slice(5, 7), d: +p.birth_date.slice(8, 10), cal: p.calendar === 'lunar' ? 'lunar' : 'solar' }
      : null,
  }))
}
onMounted(loadFriends)
watch(user, loadFriends)
const friendCount = computed(() => (user.value ? friends.value.length : 0))

/* ---- display helpers ---- */
function mono(name) { return (name || '').trim().charAt(0) }
const imgErr = ref(new Set())
function onImgErr(id) { imgErr.value = new Set(imgErr.value).add(id) }
function fmtBirth(b) {
  if (!b) return ''
  const lg = locale.value
  if (lg === 'en') return `${MONTHS_EN[b.m - 1]} ${b.d}, ${b.y}`
  if (lg === 'ja' || lg === 'zh') return `${b.y}年${b.m}月${b.d}日${t('cel.born.suffix')}`
  return `${b.y}년 ${b.m}월 ${b.d}일${t('cel.born.suffix')}`
}

/* ---- selection → checkout (PRO) ---- */
function goCheckout(name, id) {
  const q = { service: service.value, partnerName: name || '' }
  if (id) q.partner = id
  navigateTo(localePath({ path: '/checkout', query: q }))
}
function selectCeleb(c) { goCheckout(c.name, c.id) }
function selectFriend(f) { goCheckout(f.name, f.id) }
function onRegister() {
  if (import.meta.client) window.alert(t('cel.alert.register'))
}

/* ---- modal (직접 입력 / 지인 추가) ---- */
const modalOpen = ref(false)
const m = reactive({ name: '', rel: '', cal: 'solar', year: '', month: '', day: '', gender: 'm', mbti: '', saveAlso: true })
const years = Array.from({ length: 2010 - 1940 + 1 }, (_, i) => 2010 - i)
const months = Array.from({ length: 12 }, (_, i) => i + 1)
const days = Array.from({ length: 31 }, (_, i) => i + 1)

function openModal() {
  m.name = ''; m.rel = ''; m.cal = 'solar'; m.year = ''; m.month = ''; m.day = ''
  m.gender = 'm'; m.mbti = ''; m.saveAlso = true
  modalOpen.value = true
}
function closeModal() { modalOpen.value = false }

async function saveAlsoPerson(birthDate) {
  if (!user.value) return
  try {
    await supabase.from('people').insert({
      owner_id: user.value.id,
      name: m.name.trim(),
      gender: m.gender,
      calendar: m.cal,
      birth_date: birthDate,
      mbti: m.mbti || null,
      rel_key: m.rel || null,
      tint: 'gold',
    })
    await loadFriends()
  } catch { /* best-effort; don't block checkout */ }
}

async function confirmModal() {
  const name = m.name.trim()
  if (!name) { window.alert(t('cel.alert.needName')); return }
  if (isMbti.value) {
    if (!m.mbti) { window.alert(t('cel.alert.needMbti')); return }
  } else if (!m.year || !m.month || !m.day) {
    window.alert(t('cel.alert.needBirth')); return
  }
  let birthDate = null
  if (!isMbti.value) {
    birthDate = `${m.year}-${String(m.month).padStart(2, '0')}-${String(m.day).padStart(2, '0')}`
    if (m.saveAlso && user.value) await saveAlsoPerson(birthDate)
  }
  closeModal()
  goCheckout(name)
}

if (import.meta.client) {
  const onKey = (e) => { if (e.key === 'Escape') closeModal() }
  onMounted(() => window.addEventListener('keydown', onKey))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
}
</script>

<template>
  <main class="celeb-page">
    <!-- PAGE HEAD -->
    <div class="page-head">
      <h1><span class="stamp">{{ isMbti ? '合' : '緣' }}</span><span>{{ pageTitle }}</span></h1>
      <p>{{ pageSub }}</p>
    </div>

    <!-- CONTROLS -->
    <div class="controls">
      <div class="tabs">
        <button class="tab" :class="{ active: tab === 'celeb' }" @click="tab = 'celeb'">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15 9 22 9 16.5 13.5 18.5 21 12 16.5 5.5 21 7.5 13.5 2 9 9 9" /></svg>
          <span>{{ t('cel.tab.celeb') }}</span>
        </button>
        <button class="tab" :class="{ active: tab === 'friends' }" @click="tab = 'friends'">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          <span>{{ t('cel.tab.friends') }}</span>
          <span class="count">{{ friendCount }}</span>
        </button>
      </div>
      <div v-if="tab === 'celeb'" class="search">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <input v-model="query" type="text" :placeholder="t('cel.search')" />
      </div>
      <button class="btn btn-secondary btn-sm register-btn" @click="onRegister">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h1" /><line x1="18" y1="12" x2="18" y2="18" /><line x1="15" y1="15" x2="21" y2="15" /></svg>
        <span>{{ t('cel.register') }}</span>
      </button>
    </div>

    <!-- GRID -->
    <div class="grid">
      <!-- FRIENDS TAB -->
      <template v-if="tab === 'friends'">
        <div v-if="!user" class="state">
          <span class="ic"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></span>
          <h3>{{ t('cel.login.title') }}</h3>
          <p>{{ t('cel.login.sub') }}</p>
          <NuxtLink class="btn btn-primary" :to="localePath({ path: '/login', query: { reason: 'save', redirect: '/celeb-select' } })">{{ t('cel.login.btn') }}</NuxtLink>
        </div>
        <template v-else>
          <button class="card special" @click="openModal">
            <span class="kicker">{{ t('cel.friends.mine') }}</span>
            <span class="plus"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg></span>
            <span class="s-title">{{ t('cel.friends.add') }}</span>
            <span class="s-sub">{{ t('cel.friends.addSub') }}</span>
          </button>
          <button v-for="f in friends" :key="f.id" class="card" @click="selectFriend(f)">
            <div class="avatar" :class="`tint-${f.tint || 'gold'}`">
              <span v-if="isMbti && f.mbti" class="mbti-tag">{{ f.mbti }}</span>
              <span class="mono">{{ mono(f.name) }}</span>
              <span class="pick">{{ t('cel.modal.confirm') }}<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="20 6 9 17 4 12" /></svg></span>
            </div>
            <div class="card-body">
              <span class="card-name">{{ f.name }}<span class="rel">{{ t('cel.rel.' + f.relKey) }}</span></span>
              <span class="card-meta">&nbsp;</span>
              <span class="card-detail">
                <template v-if="isMbti">MBTI · {{ f.mbti }}</template>
                <template v-else>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>{{ fmtBirth(f.birth) }}<span v-if="f.birth && f.birth.cal === 'lunar'" class="lunar-tag"> ({{ t('cel.modal.lunar') }})</span>
                </template>
              </span>
            </div>
          </button>
          <div v-if="friends.length === 0" class="state" style="grid-column: 2 / -1;">
            <h3>{{ t('cel.friends.empty.title') }}</h3>
            <p>{{ t('cel.friends.empty.sub') }}</p>
          </div>
        </template>
      </template>

      <!-- CELEB TAB -->
      <template v-else>
        <button class="card special" @click="openModal">
          <span class="kicker">{{ t('cel.direct.kicker') }}</span>
          <span class="plus"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg></span>
          <span class="s-title">{{ t('cel.direct.title') }}</span>
          <span class="s-sub">{{ isMbti ? t('cel.direct.sub.mbti') : t('cel.direct.sub.celeb') }}</span>
        </button>
        <button v-for="c in pageItems" :key="c.id" class="card" @click="selectCeleb(c)">
          <div class="avatar" :class="`tint-${c.tint || 'gold'}`">
            <img v-if="c.image && !imgErr.has(c.id)" :src="c.image" :alt="c.name" class="photo" loading="lazy" @error="onImgErr(c.id)" />
            <span v-else class="mono">{{ mono(c.name) }}</span>
            <span v-if="isMbti && c.mbti" class="mbti-tag">{{ c.mbti }}</span>
            <span class="pick">{{ t('cel.modal.confirm') }}<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="20 6 9 17 4 12" /></svg></span>
          </div>
          <div class="card-body">
            <span class="card-name">{{ c.name }}</span>
            <span class="card-meta">{{ c.occupation }}</span>
            <span class="card-detail">
              <template v-if="isMbti">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11H1l8-8 8 8h-8v8z" /></svg>MBTI · {{ c.mbti }}
              </template>
              <template v-else>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>{{ fmtBirth(c.birth) }}
              </template>
            </span>
          </div>
        </button>
        <div v-if="filteredCelebs.length === 0" class="state" style="grid-column: 2 / -1;">
          <span class="ic"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg></span>
          <h3>{{ t('cel.searchEmpty') }}</h3>
          <p>{{ t('cel.searchEmptySub') }}</p>
        </div>
      </template>
    </div>

    <!-- PAGER -->
    <div v-if="tab === 'celeb' && totalPages > 1" class="pager">
      <button class="edge" :disabled="page === 1" @click="gotoPage(page - 1)">{{ t('cel.prev') }}</button>
      <button v-for="n in pagerNums" :key="n" :class="{ active: n === page }" @click="gotoPage(n)">{{ n }}</button>
      <button class="edge" :disabled="page === totalPages" @click="gotoPage(page + 1)">{{ t('cel.next') }}</button>
    </div>

    <!-- MODAL -->
    <div v-if="modalOpen" class="modal-overlay open" @click.self="closeModal">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <span class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg></span>
          <h2>{{ isMbti ? t('cel.modal.title.mbti') : t('cel.modal.title.celeb') }}</h2>
          <button class="modal-close" :aria-label="t('cel.modal.cancel')" @click="closeModal"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>{{ t('cel.modal.name') }}</label>
            <input v-model="m.name" type="text" class="inp" :placeholder="t('cel.modal.namePh')" />
          </div>
          <div class="field">
            <label><span>{{ t('cel.modal.rel') }}</span><span class="opt">{{ t('common.optional') }}</span></label>
            <select v-model="m.rel" class="sel">
              <option value="">—</option>
              <option v-for="r in REL_KEYS" :key="r" :value="r">{{ t('cel.rel.' + r) }}</option>
            </select>
          </div>

          <div v-if="!isMbti">
            <div class="field">
              <label>{{ t('cel.modal.birth') }}</label>
              <div class="seg">
                <button :class="{ active: m.cal === 'solar' }" @click="m.cal = 'solar'">{{ t('cel.modal.solar') }}</button>
                <button :class="{ active: m.cal === 'lunar' }" @click="m.cal = 'lunar'">{{ t('cel.modal.lunar') }}</button>
              </div>
              <div class="date-row" style="margin-top: var(--space-3);">
                <select v-model="m.year" class="sel"><option value="" disabled>{{ t('cel.modal.year') }}</option><option v-for="y in years" :key="y" :value="y">{{ y }}</option></select>
                <select v-model="m.month" class="sel"><option value="" disabled>{{ t('cel.modal.month') }}</option><option v-for="mo in months" :key="mo" :value="mo">{{ mo }}</option></select>
                <select v-model="m.day" class="sel"><option value="" disabled>{{ t('cel.modal.day') }}</option><option v-for="d in days" :key="d" :value="d">{{ d }}</option></select>
              </div>
            </div>
            <div class="field" style="margin-top: var(--space-5);">
              <label>{{ t('cel.modal.gender') }}</label>
              <div class="seg">
                <button :class="{ active: m.gender === 'm' }" @click="m.gender = 'm'">{{ t('saju.field.male') }}</button>
                <button :class="{ active: m.gender === 'f' }" @click="m.gender = 'f'">{{ t('saju.field.female') }}</button>
              </div>
            </div>
          </div>

          <div v-if="isMbti" class="field">
            <label>{{ t('cel.modal.mbti') }}</label>
            <div class="mbti-grid">
              <button v-for="ty in MBTI_TYPES" :key="ty" :class="{ active: m.mbti === ty }" @click="m.mbti = ty">{{ ty }}</button>
            </div>
          </div>

          <label v-if="user" class="check">
            <input v-model="m.saveAlso" type="checkbox" />
            <span>{{ t('cel.modal.saveAlso') }}</span>
          </label>
        </div>
        <div class="modal-foot">
          <button class="btn btn-secondary" @click="closeModal">{{ t('cel.modal.cancel') }}</button>
          <button class="btn btn-primary" @click="confirmModal">
            <span>{{ t('cel.modal.confirm') }}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.celeb-page { max-width: 1120px; margin: 0 auto; padding: 104px var(--space-6) var(--space-24); }

/* Page head */
.page-head { text-align: center; margin-bottom: var(--space-8); }
.page-head h1 {
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  font-weight: 700; letter-spacing: -0.02em;
  margin-bottom: var(--space-3);
  display: inline-flex; align-items: center; gap: var(--space-3);
}
.page-head h1 .stamp {
  width: 46px; height: 46px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%;
  font-size: 24px; color: var(--gold-light);
  background: radial-gradient(circle at 35% 30%, rgba(232, 121, 166, 0.30), rgba(201, 168, 76, 0.10));
  border: 2px solid var(--gold-border-strong);
}
.page-head p { color: var(--text-secondary); font-size: var(--text-base); }

/* Controls bar */
.controls { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-6); flex-wrap: wrap; }
.tabs { display: inline-flex; gap: var(--space-2); background: var(--bg-tertiary); padding: 4px; border-radius: var(--radius-full); border: 1px solid var(--gold-border); }
.tab { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; border-radius: var(--radius-full); font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary); transition: all 0.2s; }
.tab svg { opacity: 0.8; }
.tab.active { background: var(--gold-soft); color: var(--gold-light); box-shadow: inset 0 0 0 1px var(--gold-border-strong); }
.tab .count { font-family: var(--font-mono); font-size: 11px; padding: 1px 6px; border-radius: var(--radius-full); background: var(--bg-elevated); color: var(--text-muted); }
.tab.active .count { color: var(--gold-light); }
.register-btn { white-space: nowrap; }

.search { position: relative; flex: 1; min-width: 220px; max-width: 420px; }
.search svg { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.search input { width: 100%; padding: 13px 16px 13px 44px; border-radius: var(--radius-full); border: 1px solid var(--gold-border); background: var(--bg-secondary); color: var(--text-primary); font-family: var(--font-body); font-size: var(--text-sm); transition: border-color 0.2s; }
.search input::placeholder { color: var(--text-muted); }
.search input:focus { outline: none; border-color: var(--gold-primary); }
@media (max-width: 560px) { .search { max-width: none; order: 3; width: 100%; } }

/* Grid */
.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; }
@media (max-width: 980px) { .grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 680px) { .grid { grid-template-columns: repeat(2, 1fr); } }

/* Card base */
.card { position: relative; display: flex; flex-direction: column; background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); overflow: hidden; cursor: pointer; transition: transform 0.22s var(--ease-out), border-color 0.22s, box-shadow 0.22s; text-align: left; }
.card:hover { transform: translateY(-4px); border-color: var(--gold-primary); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45), 0 0 0 1px var(--gold-border-strong); }
.card:hover .avatar .pick { opacity: 1; transform: translateY(0); }

/* Avatar */
.avatar { position: relative; aspect-ratio: 1 / 1; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.avatar .mono { position: relative; z-index: 2; font-family: var(--font-display); font-size: 3.4rem; font-weight: 700; color: rgba(255, 255, 255, 0.92); text-shadow: 0 2px 18px rgba(0, 0, 0, 0.4); }
/* 레거시 인물 사진 — 블랙/골드 테마에 맞게 톤 다운(약간 탈채도 + 따뜻한 세피아 + 어둡게) */
.avatar .photo {
  position: absolute; inset: 0; z-index: 0;
  width: 100%; height: 100%;
  object-fit: cover; object-position: center 22%;
  filter: grayscale(0.45) sepia(0.18) brightness(0.84) contrast(1.06);
  transition: filter 0.25s var(--ease-out), transform 0.3s var(--ease-out);
}
.card:hover .avatar .photo { filter: grayscale(0.2) sepia(0.1) brightness(0.95) contrast(1.04); transform: scale(1.04); }
/* 상단 골드 비네팅 + 하단 암부 페이드(이름/픽 가독성) */
.avatar::before {
  content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    radial-gradient(120% 90% at 50% 10%, transparent 42%, rgba(10, 10, 15, 0.5) 100%),
    linear-gradient(180deg, rgba(201, 168, 76, 0.08), transparent 38%);
}
.avatar::after { content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none; background: linear-gradient(to top, rgba(10, 10, 15, 0.62), transparent 55%); }
.avatar.tint-gold { background: radial-gradient(circle at 50% 35%, #4a3f1e, #1a160c); }
.avatar.tint-rose { background: radial-gradient(circle at 50% 35%, #4d2438, #1c0f17); }
.avatar.tint-purple { background: radial-gradient(circle at 50% 35%, #342a55, #14101f); }
.avatar.tint-jade { background: radial-gradient(circle at 50% 35%, #14402f, #0a1812); }
.avatar.tint-blue { background: radial-gradient(circle at 50% 35%, #1d3a55, #0b141d); }
.avatar .pick { position: absolute; bottom: 10px; left: 50%; transform: translate(-50%, 8px); z-index: 2; display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: var(--radius-full); background: linear-gradient(135deg, var(--gold-primary), var(--gold-light)); color: var(--text-on-gold); font-size: 12px; font-weight: 700; opacity: 0; transition: all 0.22s var(--ease-out); }
.avatar .mbti-tag { position: absolute; top: 10px; right: 10px; z-index: 2; font-family: var(--font-mono); font-size: 12px; font-weight: 700; letter-spacing: 0.04em; padding: 4px 9px; border-radius: var(--radius-sm); background: rgba(10, 10, 15, 0.6); border: 1px solid var(--gold-border-strong); color: var(--gold-light); backdrop-filter: blur(4px); }

.card-body { padding: var(--space-4); display: flex; flex-direction: column; gap: 5px; flex: 1; }
.card-name { font-family: var(--font-display); font-weight: 600; font-size: var(--text-lg); color: var(--text-primary); line-height: 1.2; display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.card-name .rel { font-family: var(--font-body); font-size: 10px; font-weight: 700; letter-spacing: 0.04em; padding: 2px 8px; border-radius: var(--radius-full); background: var(--gold-soft); color: var(--gold-primary); border: 1px solid var(--gold-border); }
.card-meta { font-size: var(--text-xs); color: var(--text-muted); line-height: 1.5; }
.card-detail { margin-top: auto; padding-top: 8px; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-secondary); display: flex; align-items: center; gap: 6px; }
.card-detail svg { color: var(--gold-primary); opacity: 0.8; }
.card-detail .lunar-tag { color: var(--text-muted); }

/* Direct / Add card */
.card.special { border-style: dashed; border-color: var(--gold-border-strong); background: linear-gradient(160deg, var(--gold-soft), transparent 70%); align-items: center; justify-content: center; text-align: center; padding: var(--space-6) var(--space-4); gap: var(--space-3); }
.card.special:hover { background: linear-gradient(160deg, rgba(201, 168, 76, 0.14), transparent 70%); }
.card.special .plus { width: 52px; height: 52px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; border: 1.5px solid var(--gold-border-strong); color: var(--gold-light); background: var(--bg-tertiary); }
.card.special .kicker { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold-primary); }
.card.special .s-title { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 600; color: var(--text-primary); }
.card.special .s-sub { font-size: var(--text-xs); color: var(--text-muted); line-height: 1.55; }

/* Empty / login states */
.state { grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: var(--space-3); padding: var(--space-16) var(--space-6); border: 1px dashed var(--gold-border); border-radius: var(--radius-lg); background: var(--bg-secondary); }
.state .ic { width: 56px; height: 56px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: var(--gold-soft); color: var(--gold-primary); margin-bottom: var(--space-2); }
.state h3 { font-family: var(--font-display); font-size: var(--text-xl); color: var(--text-primary); }
.state p { color: var(--text-secondary); font-size: var(--text-sm); max-width: 380px; line-height: 1.7; }
.state .btn { margin-top: var(--space-3); }

/* Pagination */
.pager { display: flex; align-items: center; justify-content: center; gap: var(--space-2); margin-top: var(--space-12); flex-wrap: wrap; }
.pager button { min-width: 40px; height: 40px; padding: 0 12px; border-radius: var(--radius-md); border: 1px solid var(--gold-border); background: var(--bg-secondary); color: var(--text-secondary); font-family: var(--font-mono); font-size: var(--text-sm); transition: all 0.18s; }
.pager button:hover:not(:disabled) { border-color: var(--gold-primary); color: var(--gold-light); }
.pager button.active { background: linear-gradient(135deg, var(--gold-primary), var(--gold-light)); color: var(--text-on-gold); border-color: transparent; font-weight: 700; }
.pager button:disabled { opacity: 0.35; cursor: not-allowed; }
.pager .edge { padding: 0 16px; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(8, 8, 12, 0.78); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: var(--space-6); }
.modal { width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; background: var(--bg-secondary); border: 1px solid var(--gold-border-strong); border-radius: var(--radius-xl); box-shadow: var(--shadow-deep); animation: pop 0.28s var(--ease-out); }
@keyframes pop { from { opacity: 0; transform: translateY(14px) scale(0.98); } to { opacity: 1; transform: none; } }
.modal-head { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-6) var(--space-6) var(--space-4); border-bottom: 1px solid var(--gold-border); }
.modal-head .ic { width: 34px; height: 34px; border-radius: var(--radius-sm); display: inline-flex; align-items: center; justify-content: center; background: var(--gold-soft); color: var(--gold-primary); flex-shrink: 0; }
.modal-head h2 { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 600; flex: 1; }
.modal-close { width: 34px; height: 34px; border-radius: var(--radius-sm); color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; }
.modal-close:hover { background: var(--bg-tertiary); color: var(--text-primary); }
.modal-body { padding: var(--space-6); display: flex; flex-direction: column; gap: 1.25rem; }
.field { display: flex; flex-direction: column; gap: 8px; }
.field > label { font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary); }
.field > label .opt { font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); margin-left: 6px; letter-spacing: 0.06em; }
.inp, .sel { width: 100%; padding: 12px 14px; border-radius: var(--radius-md); border: 1px solid var(--gold-border); background: var(--bg-tertiary); color: var(--text-primary); font-family: var(--font-body); font-size: var(--text-base); transition: border-color 0.2s; }
.inp:focus, .sel:focus { outline: none; border-color: var(--gold-primary); }
.sel { appearance: none; -webkit-appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B6557' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px; }
.seg { display: inline-flex; gap: 4px; background: var(--bg-tertiary); padding: 4px; border-radius: var(--radius-md); border: 1px solid var(--gold-border); align-self: flex-start; }
.seg button { padding: 8px 18px; border-radius: var(--radius-sm); font-size: var(--text-sm); color: var(--text-secondary); transition: all 0.18s; }
.seg button.active { background: var(--gold-soft); color: var(--gold-light); }
.date-row { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: var(--space-2); }
.check { display: flex; align-items: center; gap: var(--space-3); cursor: pointer; font-size: var(--text-sm); color: var(--text-secondary); }
.check input { width: 18px; height: 18px; accent-color: var(--gold-primary); }
.modal-foot { display: flex; gap: var(--space-3); padding: 0 var(--space-6) var(--space-6); }
.modal-foot .btn { flex: 1; justify-content: center; }
.modal-foot .btn-primary { flex: 1.6; }

.mbti-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-2); }
.mbti-grid button { padding: 11px 0; border-radius: var(--radius-sm); border: 1px solid var(--gold-border); background: var(--bg-tertiary); color: var(--text-secondary); font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 600; transition: all 0.16s; }
.mbti-grid button:hover { border-color: var(--gold-primary); color: var(--text-primary); }
.mbti-grid button.active { background: linear-gradient(135deg, var(--gold-primary), var(--gold-light)); color: var(--text-on-gold); border-color: transparent; }
</style>
