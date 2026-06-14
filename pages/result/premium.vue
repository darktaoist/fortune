<script setup>
// 프리미엄 운세 통합 결과 — 모든 프리미엄 타입을 하나의 페이지에서 렌더.
// ?service= 로 타입 결정 → POST /api/fortune/premium 에서 명식 계산 + Claude 생성(섹션 JSON).
// 섹션은 제네릭 카드로 렌더(무료 결과 카드 스타일 재사용). 결제/인증 게이트는 v1 미적용.
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const user = useSupabaseUser()
const supabase = useSupabaseClient()
const { current, hasInput, save } = useSajuInput()

const SERVICE = {
  lifetime: { glyph: '命', titleKey: 'premium.life.title' },
  newyear: { glyph: '秘', titleKey: 'premium.newyear.title' },
  gunghap: { glyph: '緣', titleKey: 'premium.celeb.title' },
  mbti: { glyph: '合', titleKey: 'premium.mbti.title' },
}
const service = computed(() => {
  const raw = String(route.query.service || '').toLowerCase()
  return SERVICE[raw] ? raw : null
})
const cfg = computed(() => (service.value ? SERVICE[service.value] : null))
const heroTitle = computed(() => (cfg.value ? t(cfg.value.titleKey) : t('result.title')))

// 궁합 상대(연예인/지인) — 식별자만 받고 명식은 서버가 조회. partnerName은 meta로 갱신될 수 있음.
const partnerRef = computed(() => {
  const id = String(route.query.partner || '')
  const mbti = String(route.query.partnerMbti || '')
  if (!id && !mbti) return null
  return { id, kind: route.query.partnerKind === 'friend' ? 'friend' : 'celeb', name: String(route.query.partnerName || ''), mbti: mbti || undefined }
})
const partnerName = ref(String(route.query.partnerName || ''))
const partnerMbti = ref(String(route.query.partnerMbti || '').toUpperCase())
// 보관함에서 진입(?saved=id) — 저장된 결과를 그대로 표시(재계산 X)
const savedId = computed(() => String(route.query.saved || ''))
import { toPurchaseKey } from '~/shared/premiumService'
// 게이트를 통과한 주문번호 — 생성 요청에 함께 보내 서버가 결제를 검증/리플레이.
const orderRef = ref('')
// 화면에 쓸 본인 정보: 저장본이면 그 subject, 아니면 현재 입력
const displaySubject = computed(() => result.value?.subject || current.value)
// 본인 MBTI(사주 입력의 배열/문자열 → 4글자)
const myMbti = computed(() => {
  const m = displaySubject.value?.mbti
  return (Array.isArray(m) ? m.filter(Boolean).join('') : String(m || '')).toUpperCase()
})

// NOTE: useSeoMeta는 heroTitle 정의 "뒤"에 와야 함. title 게터가 SPA 전환 시
// setup 도중 즉시 평가돼, 위에 두면 heroTitle TDZ(ReferenceError)로 페이지가 깨진다.
useSeoMeta({ title: () => `${heroTitle.value} · ${t('seo.titleSuffix')}`, robots: 'noindex, nofollow' })
const stamp = computed(() => result.value?.glyph || cfg.value?.glyph || '命')

/* ---- 사주 표시 헬퍼 (무료 결과와 동일) ---- */
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const pad2 = (n) => String(n).padStart(2, '0')
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
const userGrid = computed(() => {
  const c = displaySubject.value
  if (!c) return []
  // MBTI 궁합: 사주 정보 대신 두 사람의 MBTI 유형만 표시(사용자 요구 — 사주 미노출)
  if (service.value === 'mbti') {
    const rows = [[t('result.name'), c.name || t('saju.preview.guest')]]
    if (myMbti.value) rows.push([t('premium.mbtigh.mine'), myMbti.value])
    if (partnerName.value || partnerMbti.value) rows.push([partnerName.value || t('premium.gunghap.vs'), partnerMbti.value || '—'])
    return rows
  }
  if (!c.year) return []
  const hour = c.hour != null ? fmtHour(`${pad2(c.hour)}:${pad2(c.minute ?? 0)}`) : t('saju.save.none')
  const rows = [
    [t('result.name'), c.name || t('saju.preview.guest')],
    [t('result.birth'), fmtBirth({ calendar: c.calendar, y: c.year, mo: c.month, d: c.day })],
    [t('result.hour'), hour],
    [t('saju.field.gender'), t(c.gender === 'f' ? 'saju.field.female' : 'saju.field.male')],
  ]
  // 궁합: 상대 표시(본인 ↔ 상대)
  if (service.value === 'gunghap' && partnerName.value) rows.push([t('premium.gunghap.vs'), partnerName.value])
  return rows
})

/* ---- 데이터 ---- */
const resolving = ref(true)   // 게이트(사주 확보) 진행 중
const loading = ref(false)    // AI 생성 진행 중
const result = ref(null)
const errorMsg = ref('')
const comingSoon = ref(false)  // 아직 콘텐츠 미완성(준비 중)인 운세
const sections = computed(() => result.value?.sections || [])
const manse = computed(() => result.value?.myeongsik || null)
const partnerManse = computed(() => result.value?.partnerMyeongsik || null)

function handleEvent(evt) {
  if (!result.value) return
  if (evt.type === 'notready') {
    comingSoon.value = true
  } else if (evt.type === 'meta') {
    result.value.glyph = evt.glyph || result.value.glyph
    result.value.tint = evt.tint || result.value.tint
    result.value.myeongsik = evt.myeongsik || null
    result.value.partnerMyeongsik = evt.partnerMyeongsik || null
    if (evt.partnerName) partnerName.value = evt.partnerName
    if (evt.partnerMbti) partnerMbti.value = String(evt.partnerMbti).toUpperCase()
  } else if (evt.type === 'section') {
    const i = result.value.sections.findIndex((s) => s.key === evt.key)
    const sec = { key: evt.key, titleKey: evt.titleKey, glyph: evt.glyph, body: evt.body }
    if (i >= 0) result.value.sections[i] = sec
    else result.value.sections.push(sec)
  } else if (evt.type === 'error') {
    errorMsg.value = evt.message || t('premium.error')
  }
}

async function load() {
  const c = current.value
  if (!service.value || !c || !c.year) return
  loading.value = true
  errorMsg.value = ''
  comingSoon.value = false
  result.value = { glyph: cfg.value?.glyph || '命', tint: 'gold', myeongsik: null, sections: [] }
  try {
    const res = await fetch('/api/fortune/premium-stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ service: service.value, subject: { ...c }, lang: locale.value, partner: partnerRef.value || undefined, order: orderRef.value || undefined }),
    })
    if (!res.ok || !res.body) {
      let msg = t('premium.error')
      try { const j = await res.json(); msg = j?.statusMessage || j?.message || msg } catch { /* noop */ }
      errorMsg.value = msg
      return
    }
    // SSE 파싱: data: <json>\n\n 단위로 처리
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let sbuf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      sbuf += dec.decode(value, { stream: true })
      let idx
      while ((idx = sbuf.indexOf('\n\n')) >= 0) {
        const chunk = sbuf.slice(0, idx); sbuf = sbuf.slice(idx + 2)
        const dataLine = chunk.split('\n').find((l) => l.startsWith('data:'))
        if (!dataLine) continue
        try { handleEvent(JSON.parse(dataLine.slice(5).trim())) } catch { /* 무시 */ }
      }
    }
  } catch {
    if (!result.value?.sections.length) errorMsg.value = t('premium.error')
  } finally {
    loading.value = false
  }
}

/* ---- 게이트: 사주 없으면 입력 화면으로 (무료 결과와 동일 패턴) ---- */
function personToSubject(p) {
  const [y, mo, d] = String(p.birth_date || '').split('-').map(Number)
  let hour = null, minute = null
  if (p.birth_time) { const [hh, mm] = String(p.birth_time).split(':'); hour = Number(hh); minute = Number(mm) }
  return {
    name: p.name || '', gender: p.gender === 'f' ? 'f' : 'm', calendar: p.calendar || 'solar',
    year: y || null, month: mo || null, day: d || null,
    hour: Number.isFinite(hour) ? hour : null, minute: Number.isFinite(minute) ? minute : null,
    place: p.birth_place || '', mbti: [null, null, null, null],
  }
}
async function ensureSubject() {
  if (hasInput.value || !user.value) return
  // 자동 대상 기준 통일: 본인(self) 우선, 없으면 최근.
  const { data } = await supabase.from('people').select('*').eq('owner_id', user.value.id)
    .order('created_at', { ascending: false })
  const list = data || []
  const def = list.find((p) => p.rel_key === 'self') || list[0]
  if (def) save(personToSubject(def))
}
/* ---- 보관함 저장본 로드(재계산 없이 저장된 결과 그대로) ---- */
async function loadSaved() {
  loading.value = true
  errorMsg.value = ''
  comingSoon.value = false
  try {
    const { data, error } = await supabase.from('saved_readings').select('*').eq('id', savedId.value).maybeSingle()
    if (error || !data) { errorMsg.value = t('premium.error'); return }
    const p = data.payload || {}
    result.value = {
      glyph: data.glyph || cfg.value?.glyph || '命',
      tint: data.tint || 'gold',
      myeongsik: p.myeongsik || null,
      partnerMyeongsik: p.partnerMyeongsik || null,
      sections: p.sections || [],
      score: p.score ?? null,
      subject: data.subject || null,
    }
    partnerName.value = p.partnerName || ''
    partnerMbti.value = (p.partnerMbti || '').toUpperCase()
  } catch {
    errorMsg.value = t('premium.error')
  } finally {
    loading.value = false
  }
}
async function gateAndLoad() {
  if (!service.value) { resolving.value = false; return }
  // 보관함 진입: 저장본만 표시(게이트·생성·과금 없음 — RLS가 본인 소유만 허용)
  if (savedId.value) { resolving.value = false; return loadSaved() }
  // 1) 로그인 게이트
  if (!user.value) {
    return navigateTo(localePath({ path: '/login', query: { reason: 'pro', redirect: route.fullPath } }), { replace: true })
  }
  await ensureSubject()
  if (!hasInput.value) {
    return navigateTo(localePath({ path: '/saju', query: { service: service.value } }), { replace: true })
  }
  // 2) 결제 게이트: order(결제 직후/마이페이지/보관함 재생성)가 있을 때만 통과.
  //    자동 통과 금지 — 한 번 결제한 service라도 "새 대상"은 새 결제가 필요(과금 누수·옛 결과 리플레이 방지).
  const typeKey = toPurchaseKey(service.value)
  const orderNo = String(route.query.order || '')
  if (!orderNo) {
    const q = { service: typeKey }
    if (partnerRef.value?.id) { q.partnerId = partnerRef.value.id; q.partnerKind = partnerRef.value.kind }
    if (partnerName.value) q.partnerName = partnerName.value
    if (partnerMbti.value) q.partnerMbti = partnerMbti.value
    return navigateTo(localePath({ path: '/checkout', query: q }), { replace: true })
  }
  orderRef.value = orderNo
  resolving.value = false
  load()
}
onMounted(gateAndLoad)
// 저장본은 저장 당시 언어로 고정 — 생성 모드일 때만 언어 변경 시 재생성.
watch(locale, () => { if (hasInput.value && !savedId.value) load() })

function goEdit() { navigateTo(localePath({ path: '/saju', query: { service: service.value || 'lifetime' } })) }

// 뒤로가기 출발지: 보관함 진입(saved)→보관함, 결제건(order)→마이페이지, 그 외→사주 입력.
const backTo = computed(() => {
  if (savedId.value) return localePath('/library')
  if (orderRef.value) return localePath('/mypage')
  return localePath({ path: '/saju', query: { service: service.value || 'lifetime' } })
})

/* ---- 저장 ---- */
const saving = ref(false)
async function onSave() {
  if (!user.value) {
    navigateTo(localePath({ path: '/login', query: { reason: 'save', redirect: route.fullPath } }))
    return
  }
  if (saving.value || !result.value) return
  saving.value = true
  const c = current.value
  const { error } = await supabase.from('saved_readings').insert({
    owner_id: user.value.id,
    type_key: service.value,
    tier: 'pro',
    subject: c ? { ...c } : null,
    payload: {
      sections: result.value.sections,
      score: result.value.score ?? null,
      myeongsik: result.value.myeongsik || null,
      partnerMyeongsik: result.value.partnerMyeongsik || null,
      partnerName: partnerName.value || '',
      partnerMbti: partnerMbti.value || '',
    },
    glyph: stamp.value,
    tint: result.value.tint || 'gold',
  })
  saving.value = false
  alert(error ? error.message : t('result.saved'))
}
</script>

<template>
  <main class="result container">
    <div class="result-hero">
      <NuxtLink :to="backTo" class="back-btn">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6" /></svg>
        <span>{{ t('common.back') }}</span>
      </NuxtLink>
      <div class="stamp">{{ stamp }}</div>
      <h1>{{ heroTitle }}</h1>
      <span class="ganji">{{ t('premium.badge') }}</span>
    </div>

    <div class="main-col">
      <p v-if="resolving" class="loading-note">{{ t('result.loading') }}</p>

      <div v-else-if="!service" class="need-input">
        <p>{{ t('result.unknown') }}</p>
        <NuxtLink class="btn btn-primary" :to="localePath('/')">{{ t('common.home') }}</NuxtLink>
      </div>

      <template v-else>
        <!-- 사용자 정보 -->
        <div v-if="current && current.year" class="info-card">
          <div class="info-card-head">
            <span class="dot" /><span>{{ t('result.userInfo') }}</span>
            <button class="edit-saju" @click="goEdit">{{ t('result.changeSaju') }}</button>
          </div>
          <div class="info-grid">
            <div v-for="([k, v], i) in userGrid" :key="i" class="info-item"><span class="k">{{ k }}</span><span class="v">{{ v }}</span></div>
          </div>
        </div>

        <!-- 만세력 명식 -->
        <div v-if="manse" class="info-card">
          <div class="info-card-head"><span class="dot" /><span>{{ t('sj.title') }}</span></div>
          <SajuChart :data="manse" />
        </div>

        <!-- 궁합: 상대방 명식 -->
        <div v-if="partnerManse" class="info-card">
          <div class="info-card-head"><span class="dot" /><span>{{ partnerName || t('premium.gunghap.vs') }}</span></div>
          <SajuChart :data="partnerManse" />
        </div>

        <!-- 결과 섹션 (도착하는 대로 점진 렌더) -->
        <template v-if="sections.length">
          <div class="section-head">
            <div class="eyebrow">{{ t('premium.eyebrow') }}</div>
            <h2>{{ heroTitle }}</h2>
          </div>
          <div class="overall-list">
            <article v-for="s in sections" :key="s.key" class="ov-card">
              <div class="ov-glyph">{{ s.glyph }}</div>
              <div class="ov-body">
                <h3 class="ov-title">{{ t(s.titleKey) }}</h3>
                <p class="ov-text pre">{{ s.body }}</p>
              </div>
            </article>
          </div>
        </template>

        <!-- 생성 중 (첫 진입=큰 스피너, 섹션 도착 후=하단 작은 표시) -->
        <div v-if="loading" class="gen-note" :class="{ inline: sections.length }">
          <span class="spinner" />
          <p>{{ t('premium.generating') }}</p>
          <span v-if="!sections.length" class="gen-sub">{{ t('premium.generating.sub') }}</span>
        </div>

        <!-- 곧 공개 (콘텐츠 준비 중) -->
        <div v-else-if="comingSoon" class="need-input coming-soon">
          <div class="cs-glyph">{{ result?.glyph || '秘' }}</div>
          <h2>{{ heroTitle }}</h2>
          <p class="cs-sub">{{ t('premium.comingSoon') }}</p>
          <p class="cs-desc">{{ t('premium.comingSoon.sub') }}</p>
          <NuxtLink class="btn btn-primary" :to="localePath({ path: '/', hash: '#premium' })">{{ t('premium.comingSoon.cta') }}</NuxtLink>
        </div>

        <!-- 에러 -->
        <div v-else-if="errorMsg" class="need-input">
          <p>{{ errorMsg }}</p>
          <button class="btn btn-primary" @click="load">{{ t('premium.retry') }}</button>
        </div>

        <!-- 저장 (완료 후) — 결제 생성분은 서버가 보관함에 자동 저장 -->
        <div v-else-if="sections.length && !savedId" class="result-actions">
          <p v-if="orderRef" class="save-hint">{{ t('premium.autoSaved') }}</p>
          <template v-else>
            <p class="save-hint">{{ t('premium.saveHint') }}</p>
            <button class="btn btn-secondary" :disabled="saving" @click="onSave">{{ t('result.save') }}</button>
          </template>
        </div>

        <!-- 후기 등록 (결과 완료 후) -->
        <ReviewForm v-if="!loading && sections.length && service && current && current.year" :type-key="service" />
      </template>
    </div>
  </main>
</template>

<style scoped>
.result { max-width: 1544px; margin: 0 auto; padding-top: 96px; padding-bottom: var(--space-24); }
.result-hero { text-align: center; padding: var(--space-8) 0; position: relative; }
.back-btn { position: absolute; left: 0; top: var(--space-8); display: inline-flex; align-items: center; gap: 5px; color: var(--text-secondary); font-size: var(--text-sm); }
.back-btn:hover { color: var(--gold-light); }
.stamp { width: 72px; height: 72px; margin: 0 auto var(--space-6); display: flex; align-items: center; justify-content: center; border-radius: 50%; font-family: var(--font-display); font-size: 34px; font-weight: 700; color: var(--gold-light); background: radial-gradient(circle at 35% 30%, rgba(220, 38, 38, 0.35), rgba(201, 168, 76, 0.12)); border: 2px solid var(--gold-border-strong); box-shadow: var(--shadow-glow); }
.result-hero h1 { font-family: var(--font-display); font-size: clamp(1.875rem, 4vw, 2.75rem); font-weight: 700; letter-spacing: -0.02em; line-height: 1.15; margin-bottom: var(--space-3); }
.result-hero .ganji { display: inline-block; font-family: var(--font-mono); font-size: var(--text-sm); letter-spacing: 0.16em; color: var(--gold-primary); padding: 6px 16px; border: 1px solid var(--gold-border); border-radius: var(--radius-full); }

.main-col { min-width: 0; max-width: 1120px; width: 100%; margin: 0 auto; }

.info-card { background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); padding: var(--space-6) var(--space-8); box-shadow: var(--shadow-card), var(--shadow-inset); margin-bottom: var(--space-8); }
.info-card-head { display: flex; align-items: center; gap: 10px; font-family: var(--font-display); font-size: var(--text-lg); font-weight: 600; padding-bottom: var(--space-4); margin-bottom: var(--space-4); border-bottom: 1px solid var(--gold-border); }
.info-card-head .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--gold-primary); box-shadow: 0 0 10px var(--gold-glow); }
.info-card-head .edit-saju { margin-left: auto; padding: 6px 12px; border-radius: var(--radius-full); border: 1px solid var(--gold-border); background: transparent; color: var(--text-secondary); font-size: var(--text-xs); font-weight: 600; cursor: pointer; transition: all 0.2s; }
.info-card-head .edit-saju:hover { border-color: var(--gold-primary); color: var(--gold-light); background: var(--gold-soft); }
.info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3) var(--space-6); }
.info-item { display: flex; justify-content: space-between; gap: var(--space-3); padding: var(--space-2) 0; border-bottom: 1px solid rgba(201, 168, 76, 0.1); }
.info-item .k { color: var(--text-muted); font-size: var(--text-sm); }
.info-item .v { color: var(--text-primary); font-size: var(--text-sm); font-weight: 500; }

.section-head { margin: var(--space-12) 0 var(--space-8); }
.section-head .eyebrow { display: inline-flex; align-items: center; gap: var(--space-2); font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.25em; text-transform: uppercase; color: var(--gold-primary); margin-bottom: var(--space-3); }
.section-head .eyebrow::before { content: ''; width: 22px; height: 1px; background: var(--gold-primary); opacity: 0.6; }
.section-head h2 { font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 600; letter-spacing: -0.02em; }

.overall-list { display: flex; flex-direction: column; gap: var(--space-4); }
.ov-card { display: grid; grid-template-columns: 56px 1fr; gap: var(--space-4); background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); padding: var(--space-6); box-shadow: var(--shadow-card), var(--shadow-inset); transition: border-color 0.3s var(--ease-out); }
.ov-card:hover { border-color: var(--gold-border-strong); }
.ov-glyph { width: 56px; height: 56px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 28px; font-weight: 700; color: var(--gold-light); background: var(--bg-tertiary); border: 1px solid var(--gold-border); }
.ov-title { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 600; margin-bottom: var(--space-3); }
.ov-text { color: var(--text-secondary); font-size: var(--text-base); line-height: 1.85; }
.ov-text.pre { white-space: pre-wrap; }

.gen-note { text-align: center; padding: var(--space-16) var(--space-6); background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); display: flex; flex-direction: column; align-items: center; gap: var(--space-4); }
.gen-note p { color: var(--text-primary); font-size: var(--text-lg); font-weight: 600; }
.gen-note .gen-sub { color: var(--text-muted); font-size: var(--text-sm); }
.gen-note.inline { flex-direction: row; justify-content: center; gap: var(--space-3); padding: var(--space-5); margin-top: var(--space-4); }
.gen-note.inline p { font-size: var(--text-base); font-weight: 500; color: var(--text-secondary); }
.gen-note.inline .spinner { width: 22px; height: 22px; border-width: 2px; }
.spinner { width: 34px; height: 34px; border-radius: 50%; border: 3px solid var(--gold-border); border-top-color: var(--gold-primary); animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.need-input { text-align: center; padding: var(--space-16) var(--space-6); background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); display: flex; flex-direction: column; align-items: center; gap: var(--space-6); }
.need-input p { color: var(--text-secondary); font-size: var(--text-lg); }
.coming-soon { gap: var(--space-4); }
.coming-soon .cs-glyph { width: 84px; height: 84px; display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 40px; color: var(--gold-primary); border: 1px solid var(--gold-border-strong); border-radius: 50%; background: radial-gradient(circle at 50% 35%, rgba(240, 208, 128, 0.18), transparent 70%); margin-bottom: var(--space-2); }
.coming-soon h2 { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 600; }
.coming-soon .cs-sub { color: var(--gold-primary); font-size: var(--text-lg); font-weight: 600; }
.coming-soon .cs-desc { color: var(--text-secondary); font-size: var(--text-base); max-width: 460px; }
.loading-note { color: var(--text-muted); text-align: center; padding: var(--space-12); font-family: var(--font-mono); letter-spacing: 0.05em; }
.result-actions { display: flex; flex-direction: column; align-items: center; gap: var(--space-4); margin-top: var(--space-12); }
.result-actions .action-row { display: flex; gap: var(--space-3); flex-wrap: wrap; justify-content: center; }
.result-actions .save-hint { display: inline-flex; align-items: center; gap: 7px; color: var(--text-muted); font-size: var(--text-sm); text-align: center; }
.result-actions .save-hint::before { content: '🔖'; font-size: var(--text-base); opacity: 0.85; }

@media (max-width: 560px) { .info-grid { grid-template-columns: 1fr; } .ov-card { grid-template-columns: 1fr; } .ov-glyph { width: 48px; height: 48px; font-size: 24px; } }
</style>
