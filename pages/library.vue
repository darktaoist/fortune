<script setup>
// 보관함(/library) — 저장한 운세 결과(saved_readings) 목록. 로그인 필수.
// 대상(내/지인)·종류(일반/PRO) 필터 + 정렬 + 검색. "다시 보기"는 저장된 사주
// 주체를 복원해 해당 결과 화면으로 이동(무료 타입). 삭제는 행 단위.
const { t } = useI18n()
const localePath = useLocalePath()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { save: saveSubject } = useSajuInput()

useSeoMeta({ title: () => `${t('lib.title')} · ${t('seo.titleSuffix')}`, robots: 'noindex, nofollow' })

const FREE_TYPES = new Set(['today', 'tojung', 'date', 'lotto', 'month', 'hour'])
// 궁합은 결제 시 type_key='celeb'로 저장되지만 결과 라우트 service 키는 'gunghap' — 둘 다 인식.
const PREMIUM_TYPES = new Set(['lifetime', 'newyear', 'gunghap', 'celeb', 'mbti'])
import { toServiceKey } from '~/shared/premiumService'
const TYPE_LABELS = {
  today: 'free.today.title', tojung: 'free.tojung.title', date: 'free.date.title',
  lotto: 'free.lotto.title', month: 'free.month.title', hour: 'free.hour.title',
  lifetime: 'premium.life.title', newyear: 'premium.newyear.title',
  celeb: 'premium.celeb.title', gunghap: 'premium.celeb.title', mbti: 'premium.mbti.title',
}
function typeLabel(k) { return TYPE_LABELS[k] ? t(TYPE_LABELS[k]) : k }

const readings = ref([])
const peopleNames = ref(new Set())
const loading = ref(true)

// 보관함에 보일 완성본 판정: 무료는 항상(사주로 재계산), 프리미엄은 AI 생성 완료(payload.sections)만.
// 결제 전 미리 만든 스냅샷·결제 실패로 남은 미완성 pro 행은 숨긴다.
function isComplete(r) {
  if (r.tier !== 'pro') return true
  return Array.isArray(r.payload?.sections) && r.payload.sections.length > 0
}

async function loadAll() {
  if (!user.value) { loading.value = false; return }
  loading.value = true
  const uid = user.value.id
  const [rd, pe] = await Promise.all([
    supabase.from('saved_readings').select('*').eq('owner_id', uid).order('created_at', { ascending: false }),
    supabase.from('people').select('name, rel_key').eq('owner_id', uid),
  ])
  readings.value = (rd.data || []).filter(isComplete)
  // 지인 이름 집합(본인 제외) — 저장된 운세의 대상이 여기 있으면 '지인'으로 분류.
  peopleNames.value = new Set(
    (pe.data || []).filter((p) => p.rel_key !== 'self').map((p) => (p.name || '').trim()).filter(Boolean),
  )
  loading.value = false
}
onMounted(loadAll)
watch(user, loadAll)

// 대상 분류: subject.name 이 저장된 지인과 일치하면 '지인', 아니면 '내 운세'
function targetOf(r) {
  const n = (r.subject?.name || '').trim()
  return n && peopleNames.value.has(n) ? 'friend' : 'me'
}

// filters / sort / search
const fTarget = ref('all')
const fTier = ref('all')
const sort = ref('newest')
const q = ref('')

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  const list = readings.value.filter((r) => {
    if (fTarget.value !== 'all' && targetOf(r) !== fTarget.value) return false
    if (fTier.value !== 'all' && (r.tier || 'free') !== fTier.value) return false
    if (s) {
      const hay = `${typeLabel(r.type_key)} ${r.subject?.name || ''}`.toLowerCase()
      if (!hay.includes(s)) return false
    }
    return true
  })
  const byDate = (a, b) => new Date(b.created_at) - new Date(a.created_at)
  if (sort.value === 'newest') return [...list].sort(byDate)
  if (sort.value === 'oldest') return [...list].sort((a, b) => -byDate(a, b))
  return [...list].sort((a, b) => typeLabel(a.type_key).localeCompare(typeLabel(b.type_key)))
})

function fmtDate(s) {
  if (!s) return '—'
  const d = new Date(s)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`
}
function subjectName(r) { return (r.subject?.name || '').trim() || t('lib.tag.me') }

function replay(r) {
  const isFree = FREE_TYPES.has(r.type_key)
  const isPremium = PREMIUM_TYPES.has(r.type_key)
  if (!r.subject || (!isFree && !isPremium)) {
    alert(t('lib.alert.again'))
    return
  }
  // 프리미엄(AI)은 저장된 결과를 그대로 불러온다(재계산·재과금·상대 유실 방지).
  if (isPremium) {
    const routeKey = toServiceKey(r.type_key)
    return navigateTo(localePath({ path: '/result/premium', query: { service: routeKey, saved: r.id } }))
  }
  // 무료 운세는 DB 텍스트라 결정적 → 본인 사주로 재조회.
  saveSubject({ place: '', mbti: [], ...r.subject })
  navigateTo(localePath({ path: '/result/free', query: { service: r.type_key } }))
}

async function remove(id) {
  if (!confirm(t('lib.confirm.delete'))) return
  await supabase.from('saved_readings').delete().eq('id', id)
  readings.value = readings.value.filter((r) => r.id !== id)
}
</script>

<template>
  <main class="library">
    <!-- 미로그인: 게이트 -->
    <section v-if="!user" class="gate">
      <div class="gate-card">
        <div class="gate-icon">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        </div>
        <h1>{{ t('mypage.gate.title') }}</h1>
        <p>{{ t('mypage.gate.desc') }}</p>
        <NuxtLink :to="localePath({ path: '/login', query: { redirect: '/library' } })" class="btn-primary">{{ t('mypage.gate.login') }}</NuxtLink>
      </div>
    </section>

    <div v-else class="container">
      <header class="page-head">
        <h1 class="page-title">{{ t('lib.title') }}</h1>
        <p class="page-sub">{{ t('lib.sub') }}</p>
        <span class="count">{{ t('lib.count').replace('{n}', readings.length) }}</span>
      </header>

      <!-- 필터 바 -->
      <div class="toolbar">
        <div class="filters">
          <label class="fl">
            <span>{{ t('lib.filter.target') }}</span>
            <select v-model="fTarget">
              <option value="all">{{ t('lib.target.all') }}</option>
              <option value="me">{{ t('lib.target.me') }}</option>
              <option value="friend">{{ t('lib.target.friend') }}</option>
            </select>
          </label>
          <label class="fl">
            <span>{{ t('lib.filter.tier') }}</span>
            <select v-model="fTier">
              <option value="all">{{ t('lib.tier.all') }}</option>
              <option value="free">{{ t('lib.tier.free') }}</option>
              <option value="pro">{{ t('lib.tier.pro') }}</option>
            </select>
          </label>
          <label class="fl">
            <span>{{ t('lib.sort') }}</span>
            <select v-model="sort">
              <option value="newest">{{ t('lib.sort.newest') }}</option>
              <option value="oldest">{{ t('lib.sort.oldest') }}</option>
              <option value="type">{{ t('lib.sort.type') }}</option>
            </select>
          </label>
        </div>
        <label class="search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input v-model="q" type="text" :placeholder="t('lib.search')">
        </label>
      </div>

      <!-- 비었음 -->
      <div v-if="!filtered.length" class="empty">
        <div class="empty-glyph">空</div>
        <h2>{{ t('lib.empty.title') }}</h2>
        <p>{{ readings.length ? t('lib.empty.sub') : t('mypage.purchase.empty') }}</p>
        <NuxtLink :to="localePath({ path: '/', hash: '#free' })" class="btn-primary">{{ t('mypage.quick.new') }}</NuxtLink>
      </div>

      <!-- 카드 그리드 -->
      <ul v-else class="grid">
        <li v-for="r in filtered" :key="r.id" class="rcard">
          <div class="rcard-top">
            <span class="glyph" :class="`tint-${r.tint || 'gold'}`">{{ r.glyph || typeLabel(r.type_key).charAt(0) }}</span>
            <span class="badge" :class="r.tier">{{ r.tier === 'pro' ? t('lib.badge.pro') : t('lib.badge.free') }}</span>
          </div>
          <div class="rcard-body">
            <div class="rtype">{{ typeLabel(r.type_key) }}</div>
            <div class="rname">{{ subjectName(r) }}<span v-if="targetOf(r) === 'me'" class="me-tag">· {{ t('lib.tag.me') }}</span></div>
            <div v-if="r.ganji" class="rganji">{{ r.ganji }}</div>
          </div>
          <div class="rcard-foot">
            <span class="viewed">{{ t('lib.viewed') }} {{ fmtDate(r.created_at) }}</span>
            <div class="acts">
              <button class="link-btn" @click="replay(r)">{{ t('lib.again') }}</button>
              <button class="ico-btn danger" :aria-label="t('lib.delete')" @click="remove(r.id)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </main>
</template>

<style scoped>
.library { min-height: 100vh; padding: 110px 0 var(--space-16); }
.container { max-width: 1080px; margin: 0 auto; padding: 0 var(--space-6); }

/* gate (mypage와 동일 스타일) */
.gate { min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 0 var(--space-6); }
.gate-card { max-width: 420px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: var(--space-4); padding: var(--space-10) var(--space-8); background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-xl); box-shadow: var(--shadow-deep); }
.gate-icon { width: 64px; height: 64px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--gold-soft); color: var(--gold-primary); }
.gate-card h1 { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 600; }
.gate-card p { color: var(--text-secondary); font-size: var(--text-sm); line-height: 1.7; }

/* head */
.page-head { margin-bottom: var(--space-6); position: relative; }
.page-title { font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 600; letter-spacing: -0.02em; margin-bottom: var(--space-2); }
.page-sub { color: var(--text-secondary); font-size: var(--text-base); }
.count { display: inline-block; margin-top: var(--space-2); font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); }

/* toolbar */
.toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-6); padding-bottom: var(--space-5); border-bottom: 1px solid var(--gold-border); }
.filters { display: flex; flex-wrap: wrap; gap: var(--space-4); }
.fl { display: flex; align-items: center; gap: 8px; font-size: var(--text-xs); color: var(--text-muted); }
.fl select { padding: 8px 12px; border-radius: var(--radius-md); border: 1px solid var(--gold-border); background: var(--bg-primary); color: var(--text-primary); font-size: var(--text-sm); cursor: pointer; }
.search { display: flex; align-items: center; gap: 8px; padding: 9px 14px; border-radius: var(--radius-md); border: 1px solid var(--gold-border); background: var(--bg-primary); color: var(--text-muted); min-width: 220px; }
.search input { flex: 1; min-width: 0; background: transparent; border: none; outline: none; color: var(--text-primary); font-size: var(--text-sm); }

/* empty */
.empty { text-align: center; padding: var(--space-16) var(--space-6); display: flex; flex-direction: column; align-items: center; gap: var(--space-3); }
.empty-glyph { font-family: var(--font-display); font-size: 3rem; color: var(--gold-border); margin-bottom: var(--space-2); }
.empty h2 { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 600; }
.empty p { color: var(--text-muted); font-size: var(--text-sm); margin-bottom: var(--space-4); }

/* grid */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--space-4); }
.rcard { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-5); background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); transition: border-color 0.2s, transform 0.2s; }
.rcard:hover { border-color: var(--gold-primary); transform: translateY(-2px); }
.rcard-top { display: flex; align-items: center; justify-content: space-between; }
.glyph { width: 46px; height: 46px; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-md); font-family: var(--font-display); font-size: 1.3rem; font-weight: 700; color: var(--text-on-gold); }
.badge { font-size: var(--text-xs); padding: 3px 10px; border-radius: 999px; background: var(--bg-tertiary); color: var(--text-muted); border: 1px solid var(--gold-border); }
.badge.pro { background: var(--gold-soft); color: var(--gold-light); border-color: var(--gold-primary); }
.rcard-body { flex: 1; }
.rtype { font-family: var(--font-display); font-size: var(--text-base); font-weight: 600; }
.rname { font-size: var(--text-sm); color: var(--text-secondary); margin-top: 3px; }
.me-tag { color: var(--text-muted); }
.rganji { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--gold-primary); margin-top: 4px; }
.rcard-foot { display: flex; align-items: center; justify-content: space-between; padding-top: var(--space-3); border-top: 1px solid var(--gold-border); }
.viewed { font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); }
.acts { display: flex; align-items: center; gap: 6px; }
.link-btn { font-size: var(--text-sm); font-weight: 600; color: var(--gold-primary); padding: 4px 8px; border-radius: var(--radius-sm); transition: all 0.2s; }
.link-btn:hover { color: var(--gold-light); background: var(--gold-soft); }
.ico-btn { width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); color: var(--text-muted); transition: all 0.2s; }
.ico-btn.danger:hover { color: #F87171; background: rgba(220,38,38,0.10); }

/* tints */
.tint-gold { background: linear-gradient(135deg, #c9a84c, #f0d080); }
.tint-rose { background: linear-gradient(135deg, #c97a8c, #f0b0c0); }
.tint-purple { background: linear-gradient(135deg, #8b5cf6, #c4b5fd); }
.tint-jade { background: linear-gradient(135deg, #4ca87a, #a0e0c0); }
.tint-blue { background: linear-gradient(135deg, #4c7ac9, #a0c0f0); }

/* buttons */
.btn-primary { display: inline-flex; align-items: center; justify-content: center; padding: 11px 20px; border-radius: var(--radius-md); background: var(--gold-primary); color: var(--text-on-gold); font-size: var(--text-sm); font-weight: 700; transition: all 0.2s; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(201,168,76,0.30); }

@media (max-width: 560px) {
  .toolbar { flex-direction: column; align-items: stretch; }
  .search { min-width: 0; }
}
</style>
