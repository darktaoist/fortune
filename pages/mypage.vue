<script setup>
// 마이페이지 — 계정·구매·저장 정보 허브. 로그인 필수(미로그인 시 게이트 표시).
// 모든 데이터는 Supabase RLS로 본인 소유만 조회/수정. 1.0에 없던 2.0 신규 페이지.
// 회원 탈퇴는 service role 서버 엔드포인트(/api/account/delete)로 위임.
const { t, locale, locales, setLocale } = useI18n()
const localePath = useLocalePath()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

useSeoMeta({
  title: () => `${t('mypage.title')} · ${t('seo.titleSuffix')}`,
  robots: 'noindex, nofollow',
})

// ── state ──
const profile = ref(null)
const people = ref([])
const purchases = ref([])
const reviews = ref([])
const readingCount = ref(0)
const loading = ref(true)

const toast = ref('')
let toastTimer
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2200)
}

async function loadAll() {
  if (!user.value) { loading.value = false; return }
  loading.value = true
  const uid = user.value.id
  const [pf, pe, pu, rv, rc] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', uid).single(),
    supabase.from('people').select('*').eq('owner_id', uid).order('created_at', { ascending: false }),
    supabase.from('purchases').select('*').eq('owner_id', uid).neq('status', 'pending').order('paid_at', { ascending: false }),
    supabase.from('reviews').select('*').eq('owner_id', uid).order('created_at', { ascending: false }),
    supabase.from('saved_readings').select('id', { count: 'exact', head: true }).eq('owner_id', uid),
  ])
  profile.value = pf.data || null
  people.value = pe.data || []
  purchases.value = pu.data || []
  reviews.value = rv.data || []
  readingCount.value = rc.count || 0
  loading.value = false
}
onMounted(loadAll)
watch(user, loadAll)

// ── derived ──
const displayName = computed(() => profile.value?.nickname || user.value?.email?.split('@')[0] || '')
const initial = computed(() => (displayName.value.trim()[0] || '?').toUpperCase())
const loginMethod = computed(() => profile.value?.login_method || 'email')
const sinceDate = computed(() => fmtDate(profile.value?.created_at))
const daysTogether = computed(() => {
  const c = profile.value?.created_at
  if (!c) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(c).getTime()) / 86400000))
})

function fmtDate(s) {
  if (!s) return '—'
  const d = new Date(s)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`
}
function fmtAmount(a, cur) {
  if (a == null) return ''
  if (cur === 'USD') return `$${(a / 100).toFixed(2)}`
  return `₩${a.toLocaleString()}`
}
function personBirth(p) {
  return p.birth_date ? p.birth_date.replaceAll('-', '.') : ''
}

import { toServiceKey } from '~/shared/premiumService'

// 서비스 type_key → 라벨(매핑 없으면 키 그대로)
const TYPE_LABELS = {
  today: 'free.today.title', tojung: 'free.tojung.title', date: 'free.date.title',
  lotto: 'free.lotto.title', month: 'free.month.title', hour: 'free.hour.title',
  lifetime: 'premium.life.title', newyear: 'premium.newyear.title', celeb: 'premium.celeb.title', mbti: 'premium.mbti.title',
}
function typeLabel(k) { return TYPE_LABELS[k] ? t(TYPE_LABELS[k]) : k }

const availableLocales = computed(() =>
  locales.value.map((l) => (typeof l === 'string' ? { code: l, name: l } : l)),
)

// ── profile edit ──
const editing = ref(false)
const editName = ref('')
function startEdit() { editName.value = profile.value?.nickname || ''; editing.value = true }
async function saveEdit() {
  const n = editName.value.trim()
  await supabase.from('profiles').update({ nickname: n || null }).eq('id', user.value.id)
  if (profile.value) profile.value.nickname = n || null
  editing.value = false
  showToast(t('mypage.edit.saved'))
}

// ── people ──
async function deletePerson(id) {
  await supabase.from('people').delete().eq('id', id)
  people.value = people.value.filter((p) => p.id !== id)
  showToast(t('mypage.people.deleted'))
}

// ── reviews ──
async function toggleReviewPublic(r) {
  const next = !r.is_public
  await supabase.from('reviews').update({ is_public: next }).eq('id', r.id)
  r.is_public = next
}
async function deleteReview(id) {
  await supabase.from('reviews').delete().eq('id', id)
  reviews.value = reviews.value.filter((r) => r.id !== id)
  showToast(t('mypage.reviews.deleted'))
}

// ── settings ──
async function changeLocale(code) {
  if (profile.value) supabase.from('profiles').update({ locale: code }).eq('id', user.value.id)
  await setLocale(code)
}
async function copyOrder(no) {
  try { await navigator.clipboard.writeText(no); showToast(t('mypage.copied')) } catch { /* noop */ }
}
async function logout() {
  await supabase.auth.signOut()
  navigateTo(localePath('/'))
}

// ── withdraw ──
const withdrawOpen = ref(false)
const withdrawing = ref(false)
async function confirmWithdraw() {
  withdrawing.value = true
  try {
    await $fetch('/api/account/delete', { method: 'POST' })
    await supabase.auth.signOut()
    navigateTo(localePath('/'))
  } catch {
    withdrawing.value = false
    withdrawOpen.value = false
    showToast(t('auth.err.generic'))
  }
}
</script>

<template>
  <main class="mypage">
    <!-- 미로그인: 게이트 -->
    <section v-if="!user" class="gate">
      <div class="gate-card">
        <div class="gate-icon">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        </div>
        <h1>{{ t('mypage.gate.title') }}</h1>
        <p>{{ t('mypage.gate.desc') }}</p>
        <NuxtLink :to="localePath({ path: '/login', query: { redirect: '/mypage' } })" class="btn-primary">{{ t('mypage.gate.login') }}</NuxtLink>
      </div>
    </section>

    <div v-else class="container">
      <header class="page-head">
        <h1 class="page-title">{{ t('mypage.title') }}</h1>
        <p class="page-sub">{{ t('mypage.sub') }}</p>
      </header>

      <div class="grid">
        <!-- LEFT -->
        <div class="col-main">
          <!-- profile -->
          <section class="card profile-card">
            <div class="avatar" :class="`tint-${profile?.tint || 'gold'}`">{{ initial }}</div>
            <div class="profile-info">
              <template v-if="!editing">
                <div class="profile-name">{{ displayName }}</div>
                <div class="profile-email">{{ user.email }}</div>
                <div class="profile-meta">
                  <span class="chip">{{ t('mypage.loginmethod') }} · {{ loginMethod }}</span>
                  <span class="chip">{{ t('mypage.since') }} {{ sinceDate }}</span>
                </div>
              </template>
              <template v-else>
                <input v-model="editName" class="edit-input" maxlength="40" @keyup.enter="saveEdit">
                <div class="edit-actions">
                  <button class="btn-sm primary" @click="saveEdit">{{ t('mypage.edit.save') }}</button>
                  <button class="btn-sm" @click="editing = false">{{ t('mypage.edit.cancel') }}</button>
                </div>
              </template>
            </div>
            <button v-if="!editing" class="edit-btn" @click="startEdit">{{ t('mypage.edit') }}</button>
          </section>

          <!-- stats -->
          <section class="stats">
            <div class="stat"><div class="stat-n">{{ readingCount }}</div><div class="stat-l">{{ t('mypage.stat.readings') }}</div></div>
            <div class="stat"><div class="stat-n">{{ people.length }}</div><div class="stat-l">{{ t('mypage.stat.people') }}</div></div>
            <div class="stat"><div class="stat-n">{{ daysTogether }}<span class="unit">{{ t('mypage.stat.dayunit') }}</span></div><div class="stat-l">{{ t('mypage.stat.days') }}</div></div>
          </section>

          <!-- quick -->
          <section class="quick">
            <NuxtLink :to="localePath('/library')" class="quick-btn">{{ t('mypage.quick.library') }}</NuxtLink>
            <NuxtLink :to="localePath({ path: '/', hash: '#premium' })" class="quick-btn">{{ t('mypage.quick.new') }}</NuxtLink>
          </section>

          <!-- purchases -->
          <section class="card">
            <h2 class="card-title">{{ t('mypage.purchase.title') }}</h2>
            <p v-if="!purchases.length" class="empty">{{ t('mypage.purchase.empty') }}</p>
            <ul v-else class="plist">
              <li v-for="p in purchases" :key="p.id" class="prow">
                <div class="prow-main">
                  <span class="prow-type">{{ typeLabel(p.type_key) }}</span>
                  <button v-if="p.order_no" class="prow-order" @click="copyOrder(p.order_no)">{{ t('mypage.purchase.order') }} {{ p.order_no }}</button>
                </div>
                <div class="prow-side">
                  <span class="amount">{{ fmtAmount(p.amount, p.currency) }}</span>
                  <span class="badge" :class="p.status">{{ p.status === 'refunded' ? t('mypage.status.refunded') : t('mypage.status.paid') }}</span>
                  <NuxtLink
                    v-if="p.status === 'paid' && p.order_no"
                    :to="localePath({ path: '/result/premium', query: { service: toServiceKey(p.type_key), order: p.order_no } })"
                    class="btn-sm primary"
                  >{{ t('mypage.purchase.view') }}</NuxtLink>
                </div>
              </li>
            </ul>
          </section>
        </div>

        <!-- RIGHT -->
        <div class="col-side">
          <!-- people -->
          <section class="card">
            <div class="card-head">
              <h2 class="card-title">{{ t('mypage.people.title') }}</h2>
              <NuxtLink :to="localePath('/saju')" class="link-add">+ {{ t('mypage.people.add') }}</NuxtLink>
            </div>
            <p v-if="!people.length" class="empty">{{ t('mypage.people.empty') }}</p>
            <ul v-else class="people">
              <li v-for="p in people" :key="p.id" class="person">
                <span class="av" :class="`tint-${p.tint || 'gold'}`">{{ (p.name || '?').trim().charAt(0) }}</span>
                <span class="pmeta">
                  <span class="pname">{{ p.name }}<span v-if="p.rel_key" class="prel"> · {{ t('cel.rel.' + p.rel_key) }}</span></span>
                  <span v-if="personBirth(p)" class="pbirth">{{ personBirth(p) }}</span>
                </span>
                <span class="pact">
                  <NuxtLink :to="localePath('/saju')" class="ico-btn" :aria-label="t('mypage.people.edit')">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                  </NuxtLink>
                  <button class="ico-btn danger" :aria-label="t('mypage.people.delete')" @click="deletePerson(p.id)">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </button>
                </span>
              </li>
            </ul>
          </section>

          <!-- reviews -->
          <section class="card">
            <h2 class="card-title">{{ t('mypage.reviews.title') }}</h2>
            <p v-if="!reviews.length" class="empty">{{ t('mypage.reviews.empty') }}</p>
            <ul v-else class="rlist">
              <li v-for="r in reviews" :key="r.id" class="rrow">
                <div class="rrow-top">
                  <span class="stars">{{ '★'.repeat(r.rating) }}<span class="dim">{{ '★'.repeat(5 - r.rating) }}</span></span>
                  <span class="rtype">{{ typeLabel(r.type_key) }}</span>
                </div>
                <p v-if="r.text" class="rtext">{{ r.text }}</p>
                <div class="rrow-act">
                  <button class="toggle" :class="{ on: r.is_public }" @click="toggleReviewPublic(r)">{{ r.is_public ? t('mypage.reviews.public') : t('mypage.reviews.private') }}</button>
                  <button class="ico-btn danger" :aria-label="t('mypage.people.delete')" @click="deleteReview(r.id)">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                  </button>
                </div>
              </li>
            </ul>
          </section>

          <!-- settings -->
          <section class="card">
            <h2 class="card-title">{{ t('mypage.settings.title') }}</h2>
            <div class="setrow">
              <div class="set-info"><div class="set-l">{{ t('mypage.settings.lang') }}</div><div class="set-d">{{ t('mypage.settings.langdesc') }}</div></div>
              <select class="lang-select" :value="locale" @change="changeLocale($event.target.value)">
                <option v-for="l in availableLocales" :key="l.code" :value="l.code">{{ l.flag }} {{ l.name || l.code }}</option>
              </select>
            </div>
            <div class="setrow border-top">
              <button class="set-action" @click="logout">{{ t('mypage.settings.logout') }}</button>
            </div>
            <div class="setrow">
              <button class="set-action danger" @click="withdrawOpen = true">{{ t('mypage.settings.withdraw') }}</button>
            </div>
          </section>
        </div>
      </div>
    </div>

    <!-- 회원 탈퇴 확인 -->
    <div v-if="withdrawOpen" class="modal-back" @click.self="withdrawOpen = false">
      <div class="modal">
        <h3>{{ t('mypage.settings.withdraw') }}</h3>
        <p>{{ t('mypage.withdraw.confirm') }}</p>
        <div class="modal-act">
          <button class="btn-sm" :disabled="withdrawing" @click="withdrawOpen = false">{{ t('mypage.edit.cancel') }}</button>
          <button class="btn-sm danger" :disabled="withdrawing" @click="confirmWithdraw">{{ withdrawing ? t('auth.processing') : t('mypage.settings.withdraw') }}</button>
        </div>
      </div>
    </div>

    <transition name="toast"><div v-if="toast" class="toast">{{ toast }}</div></transition>
  </main>
</template>

<style scoped>
.mypage { min-height: 100vh; padding: 110px 0 var(--space-16); }
.container { max-width: 1080px; margin: 0 auto; padding: 0 var(--space-6); }

/* gate */
.gate { min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 0 var(--space-6); }
.gate-card { max-width: 420px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: var(--space-4); padding: var(--space-10) var(--space-8); background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-xl); box-shadow: var(--shadow-deep); }
.gate-icon { width: 64px; height: 64px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--gold-soft); color: var(--gold-primary); }
.gate-card h1 { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 600; }
.gate-card p { color: var(--text-secondary); font-size: var(--text-sm); line-height: 1.7; }

/* head */
.page-head { margin-bottom: var(--space-8); }
.page-title { font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 600; letter-spacing: -0.02em; margin-bottom: var(--space-2); }
.page-sub { color: var(--text-secondary); font-size: var(--text-base); }

/* grid */
.grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: var(--space-6); align-items: start; }
.col-main, .col-side { display: flex; flex-direction: column; gap: var(--space-6); }

/* card */
.card { background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); padding: var(--space-6); }
.card-title { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 600; margin-bottom: var(--space-4); }
.card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); }
.card-head .card-title { margin-bottom: 0; }
.link-add { font-size: var(--text-sm); color: var(--gold-primary); font-weight: 600; }
.link-add:hover { color: var(--gold-light); }
.empty { color: var(--text-muted); font-size: var(--text-sm); line-height: 1.7; padding: var(--space-4) 0; }

/* avatar tints (shared) */
.avatar, .av { display: inline-flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 700; color: var(--text-on-gold); }
.tint-gold { background: linear-gradient(135deg, #c9a84c, #f0d080); }
.tint-rose { background: linear-gradient(135deg, #c97a8c, #f0b0c0); }
.tint-purple { background: linear-gradient(135deg, #8b5cf6, #c4b5fd); }
.tint-jade { background: linear-gradient(135deg, #4ca87a, #a0e0c0); }
.tint-blue { background: linear-gradient(135deg, #4c7ac9, #a0c0f0); }

/* profile */
.profile-card { display: flex; align-items: center; gap: var(--space-4); }
.avatar { width: 60px; height: 60px; border-radius: 50%; font-size: 1.6rem; flex-shrink: 0; }
.profile-info { flex: 1; min-width: 0; }
.profile-name { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 600; }
.profile-email { color: var(--text-secondary); font-size: var(--text-sm); margin: 2px 0 8px; word-break: break-all; }
.profile-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font-size: var(--text-xs); color: var(--text-muted); padding: 3px 10px; border: 1px solid var(--gold-border); border-radius: 999px; }
.edit-btn { flex-shrink: 0; align-self: flex-start; font-size: var(--text-sm); color: var(--text-secondary); padding: 6px 12px; border: 1px solid var(--gold-border); border-radius: var(--radius-md); transition: all 0.2s; }
.edit-btn:hover { border-color: var(--gold-primary); color: var(--gold-light); }
.edit-input { width: 100%; padding: 10px 12px; border-radius: var(--radius-md); border: 1px solid var(--gold-primary); background: var(--bg-primary); color: var(--text-primary); font-size: var(--text-base); }
.edit-actions { display: flex; gap: 8px; margin-top: 8px; }

/* stats */
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); }
.stat { background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); padding: var(--space-5) var(--space-4); text-align: center; }
.stat-n { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 700; color: var(--gold-light); }
.stat-n .unit { font-size: var(--text-base); margin-left: 2px; color: var(--text-secondary); }
.stat-l { font-size: var(--text-xs); color: var(--text-muted); margin-top: 4px; }

/* quick */
.quick { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.quick-btn { text-align: center; padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--gold-border); background: var(--bg-secondary); color: var(--text-secondary); font-size: var(--text-sm); font-weight: 600; transition: all 0.2s; }
.quick-btn:hover { border-color: var(--gold-primary); color: var(--gold-light); background: var(--gold-soft); }

/* buttons */
.btn-primary { display: inline-flex; align-items: center; justify-content: center; padding: 11px 20px; border-radius: var(--radius-md); background: var(--gold-primary); color: var(--text-on-gold); font-size: var(--text-sm); font-weight: 700; white-space: nowrap; transition: all 0.2s; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(201,168,76,0.30); }
.btn-sm { padding: 8px 16px; border-radius: var(--radius-md); border: 1px solid var(--gold-border); color: var(--text-secondary); font-size: var(--text-sm); font-weight: 600; transition: all 0.2s; }
.btn-sm:hover { border-color: var(--gold-primary); color: var(--gold-light); }
.btn-sm.primary { background: var(--gold-primary); border-color: var(--gold-primary); color: var(--text-on-gold); }
.btn-sm.danger { border-color: rgba(220,38,38,0.5); color: #F87171; }
.btn-sm.danger:hover { background: rgba(220,38,38,0.12); }
.btn-sm:disabled { opacity: 0.6; cursor: progress; }

/* purchases */
.plist { display: flex; flex-direction: column; gap: var(--space-3); }
.prow { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-3) 0; border-bottom: 1px solid var(--gold-border); }
.prow:last-child { border-bottom: none; }
.prow-type { font-weight: 600; font-size: var(--text-sm); }
.prow-order { display: block; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); margin-top: 3px; cursor: pointer; }
.prow-order:hover { color: var(--gold-primary); }
.prow-side { display: flex; align-items: center; gap: var(--space-3); flex-shrink: 0; }
.amount { font-weight: 600; font-size: var(--text-sm); }
.badge { font-size: var(--text-xs); padding: 3px 10px; border-radius: 999px; background: var(--gold-soft); color: var(--gold-light); }
.badge.refunded { background: rgba(220,38,38,0.12); color: #F87171; }

/* people */
.people { display: flex; flex-direction: column; gap: var(--space-2); }
.person { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) 0; }
.av { width: 40px; height: 40px; border-radius: 50%; font-size: var(--text-base); flex-shrink: 0; }
.pmeta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.pname { font-size: var(--text-sm); font-weight: 600; }
.prel { color: var(--text-muted); font-weight: 400; }
.pbirth { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); }
.pact { display: flex; gap: 4px; flex-shrink: 0; }
.ico-btn { width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); color: var(--text-muted); transition: all 0.2s; }
.ico-btn:hover { background: var(--bg-tertiary); color: var(--gold-light); }
.ico-btn.danger:hover { color: #F87171; background: rgba(220,38,38,0.10); }

/* reviews */
.rlist { display: flex; flex-direction: column; gap: var(--space-4); }
.rrow { padding-bottom: var(--space-4); border-bottom: 1px solid var(--gold-border); }
.rrow:last-child { border-bottom: none; padding-bottom: 0; }
.rrow-top { display: flex; align-items: center; justify-content: space-between; }
.stars { color: var(--gold-primary); letter-spacing: 1px; font-size: var(--text-sm); }
.stars .dim { color: var(--gold-border); }
.rtype { font-size: var(--text-xs); color: var(--text-muted); }
.rtext { font-size: var(--text-sm); color: var(--text-secondary); line-height: 1.6; margin: 8px 0; }
.rrow-act { display: flex; align-items: center; justify-content: space-between; }
.toggle { font-size: var(--text-xs); font-weight: 600; padding: 4px 12px; border-radius: 999px; border: 1px solid var(--gold-border); color: var(--text-muted); transition: all 0.2s; }
.toggle.on { background: var(--gold-soft); border-color: var(--gold-primary); color: var(--gold-light); }

/* settings */
.setrow { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding: var(--space-3) 0; }
.setrow.border-top { border-top: 1px solid var(--gold-border); margin-top: var(--space-2); }
.set-l { font-size: var(--text-sm); font-weight: 600; }
.set-d { font-size: var(--text-xs); color: var(--text-muted); margin-top: 2px; }
.lang-select { padding: 8px 12px; border-radius: var(--radius-md); border: 1px solid var(--gold-border); background: var(--bg-primary); color: var(--text-primary); font-size: var(--text-sm); cursor: pointer; }
.set-action { width: 100%; text-align: left; font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary); padding: 4px 0; }
.set-action:hover { color: var(--gold-light); }
.set-action.danger { color: #F87171; }

/* modal */
.modal-back { position: fixed; inset: 0; z-index: 300; display: flex; align-items: center; justify-content: center; padding: var(--space-6); background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); }
.modal { max-width: 400px; width: 100%; background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-xl); padding: var(--space-8); box-shadow: var(--shadow-deep); }
.modal h3 { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 600; margin-bottom: var(--space-3); }
.modal p { color: var(--text-secondary); font-size: var(--text-sm); line-height: 1.7; margin-bottom: var(--space-6); }
.modal-act { display: flex; justify-content: flex-end; gap: var(--space-3); }

/* toast */
.toast { position: fixed; bottom: var(--space-8); left: 50%; transform: translateX(-50%); z-index: 400; padding: 12px 22px; border-radius: var(--radius-md); background: var(--bg-elevated, var(--bg-tertiary)); border: 1px solid var(--gold-border); color: var(--text-primary); font-size: var(--text-sm); box-shadow: var(--shadow-deep); }
.toast-enter-active, .toast-leave-active { transition: opacity 0.25s, transform 0.25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 10px); }

/* responsive */
@media (max-width: 900px) {
  .grid { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .profile-card { flex-wrap: wrap; }
  .stats { gap: var(--space-3); }
  .stat { padding: var(--space-4) var(--space-2); }
  .stat-n { font-size: var(--text-xl); }
}
</style>
