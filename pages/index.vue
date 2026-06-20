<script setup>
// 타오운세 — main landing page. Ported from the design prototype
// (타오운세 메인.html). All copy comes through i18n ($t); the imperative
// prototype scripts (zodiac, locale-aware pricing, trust counters, ohaeng,
// starfield) are reimplemented as Vue reactivity.
const { t, locale } = useI18n()
const localePath = useLocalePath()

// Per-page SEO. Home uses its full title verbatim (no brand suffix); the title
// itself leads with "K-Fortune" for en/ja/zh. Site-level og/twitter defaults
// come from app.vue; hreflang/canonical from useLocaleHead in the layout.
usePageSeo('home', { suffix: false })

/* ===================== Featured testimonials ===================== */
// 관리자가 대시보드에서 featured 체크한 후기를 메인 "그들의 이야기"에 노출.
// 없으면 하드코딩 샘플(testi.t1~3)로 폴백 → 메인이 비지 않음.
const supabase = useSupabaseClient()
const FLAGS = { ko: '🇰🇷', en: '🇺🇸', ja: '🇯🇵', zh: '🇹🇼' }
const TESTI_TYPE = {
  today: 'free.today.title', tojung: 'free.tojung.title', date: 'free.date.title',
  lotto: 'free.lotto.title', month: 'free.month.title', hour: 'free.hour.title',
  lifetime: 'premium.life.title', celeb: 'premium.celeb.title', mbti: 'premium.mbti.title',
}
const { data: featuredReviews } = await useAsyncData('featured-reviews', async () => {
  const { data } = await supabase
    .from('reviews')
    .select('id,rating,text,author_name,locale,type_key')
    .eq('featured', true)
    .order('created_at', { ascending: false })
    .limit(3)
  return (data || []).filter((r) => r.text)
}, { default: () => [] })
function flagOf(code) { return FLAGS[code] || '🌐' }
function tagOf(k) { return TESTI_TYPE[k] ? t(TESTI_TYPE[k]) : k }

/* ===================== Zodiac quick reading ===================== */
const ZODIAC = [
  { h: '子', name: { ko: '쥐띠', en: 'Rat', ja: '子(ねずみ)', zh: '鼠' }, years: '1936·48·60·72·84·96·08·20',
    text: { ko: '오늘은 작은 결단이 큰 흐름을 바꿉니다. 직감을 따라 한 발 내디뎌도 좋은 날입니다.', en: 'A small decision today changes the larger flow. Trust your intuition.', ja: '今日は小さな決断が大きな流れを変えます。直感を信じて一歩踏み出して。', zh: '今天小決定能改變大局。跟隨直覺向前一步。' },
    color: { ko: '금색', en: 'Gold', ja: '金色', zh: '金色' }, colorHex: '#C9A84C', num: '7', dir: { ko: '북동', en: 'NE', ja: '北東', zh: '東北' } },
  { h: '丑', name: { ko: '소띠', en: 'Ox', ja: '丑(うし)', zh: '牛' }, years: '1937·49·61·73·85·97·09·21',
    text: { ko: '꾸준한 노력의 결실이 가까이 와 있습니다. 인내가 가장 큰 무기가 됩니다.', en: 'The fruit of steady effort is near. Patience is your strongest tool.', ja: '地道な努力の実りが近づいています。忍耐が最大の武器に。', zh: '穩定努力的成果近在眼前。耐心是最強武器。' },
    color: { ko: '흙빛', en: 'Earth', ja: '土色', zh: '土色' }, colorHex: '#A87D5A', num: '3', dir: { ko: '동', en: 'E', ja: '東', zh: '東' } },
  { h: '寅', name: { ko: '범띠', en: 'Tiger', ja: '寅(とら)', zh: '虎' }, years: '1938·50·62·74·86·98·10·22',
    text: { ko: '바람의 방향이 바뀝니다. 새로운 사람과의 만남이 길운을 부릅니다.', en: 'The wind shifts. A new encounter brings fortune.', ja: '風向きが変わります。新しい出会いが幸運を呼びます。', zh: '風向轉變。新的相遇帶來好運。' },
    color: { ko: '주홍', en: 'Crimson', ja: '朱', zh: '朱紅' }, colorHex: '#DC2626', num: '9', dir: { ko: '동남', en: 'SE', ja: '東南', zh: '東南' } },
  { h: '卯', name: { ko: '토끼띠', en: 'Rabbit', ja: '卯(うさぎ)', zh: '兔' }, years: '1939·51·63·75·87·99·11·23',
    text: { ko: '말 한마디로 분위기를 살릴 수 있습니다. 부드러움이 강함을 이깁니다.', en: 'A single word can lift the mood. Softness conquers strength.', ja: '一言で空気を変えられます。柔らかさが強さに勝ちます。', zh: '一句話可以改變氛圍。柔軟勝過剛強。' },
    color: { ko: '연녹', en: 'Sage', ja: '若草', zh: '淺綠' }, colorHex: '#86BC7A', num: '4', dir: { ko: '정동', en: 'E', ja: '真東', zh: '正東' } },
  { h: '辰', name: { ko: '용띠', en: 'Dragon', ja: '辰(たつ)', zh: '龍' }, years: '1940·52·64·76·88·00·12·24',
    text: { ko: '큰 그림을 그리기에 좋은 시점. 야망을 부끄러워하지 마세요.', en: 'A great time to dream big. Wear your ambition proudly.', ja: '大きな絵を描くのに最適な時。野心を恥じずに。', zh: '描繪大藍圖的好時機。莫為野心羞愧。' },
    color: { ko: '심청', en: 'Deep Blue', ja: '深青', zh: '深藍' }, colorHex: '#1E40AF', num: '6', dir: { ko: '남', en: 'S', ja: '南', zh: '南' } },
  { h: '巳', name: { ko: '뱀띠', en: 'Snake', ja: '巳(へび)', zh: '蛇' }, years: '1941·53·65·77·89·01·13·25',
    text: { ko: '눈에 보이는 것보다 보이지 않는 것이 더 큰 영향을 줍니다.', en: 'The unseen carries more weight than the seen.', ja: '見えるものより見えないものの方が大きな影響を。', zh: '看不見的比看得見的更具影響力。' },
    color: { ko: '자주', en: 'Purple', ja: '紫', zh: '紫' }, colorHex: '#8B5CF6', num: '2', dir: { ko: '남서', en: 'SW', ja: '南西', zh: '西南' } },
  { h: '午', name: { ko: '말띠', en: 'Horse', ja: '午(うま)', zh: '馬' }, years: '1942·54·66·78·90·02·14·26',
    text: { ko: '오늘은 당신의 해입니다. 무대가 당신을 기다립니다.', en: 'Today is yours. The stage awaits.', ja: '今日はあなたの日。舞台が待っています。', zh: '今天屬於你。舞台正在等候。' },
    color: { ko: '주황', en: 'Orange', ja: '橙', zh: '橙' }, colorHex: '#F97316', num: '8', dir: { ko: '정남', en: 'S', ja: '真南', zh: '正南' } },
  { h: '未', name: { ko: '양띠', en: 'Goat', ja: '未(ひつじ)', zh: '羊' }, years: '1943·55·67·79·91·03·15·27',
    text: { ko: '주변의 조언이 평소보다 값집니다. 귀를 더 크게 열어두세요.', en: 'Advice today is more precious than usual. Keep your ears wide open.', ja: '周りの助言が普段より価値ある一日。耳を大きく開けて。', zh: '周圍的建議今天格外珍貴。豎起耳朵聆聽。' },
    color: { ko: '미색', en: 'Beige', ja: '生成り', zh: '米色' }, colorHex: '#D4C19C', num: '5', dir: { ko: '서남', en: 'SW', ja: '南西', zh: '西南' } },
  { h: '申', name: { ko: '원숭이띠', en: 'Monkey', ja: '申(さる)', zh: '猴' }, years: '1944·56·68·80·92·04·16·28',
    text: { ko: '재치가 어려운 매듭을 풀어줍니다. 가벼운 농담이 협상의 묘약.', en: 'Wit untangles knots. A light joke is the secret to negotiation.', ja: '機転が難しい結び目を解きます。軽い冗談が交渉の妙薬。', zh: '機智解開難結。輕鬆玩笑是談判妙方。' },
    color: { ko: '은백', en: 'Silver', ja: '銀白', zh: '銀白' }, colorHex: '#E5E5E5', num: '1', dir: { ko: '서', en: 'W', ja: '西', zh: '西' } },
  { h: '酉', name: { ko: '닭띠', en: 'Rooster', ja: '酉(とり)', zh: '雞' }, years: '1945·57·69·81·93·05·17·29',
    text: { ko: '계획을 다시 점검하기에 좋은 날. 디테일이 운명을 가릅니다.', en: 'A good day to revisit plans. Details decide destiny.', ja: '計画を見直すのに良い日。細部が運命を決めます。', zh: '重新檢視計畫的好日。細節決定命運。' },
    color: { ko: '와인', en: 'Wine', ja: 'ワイン', zh: '酒紅' }, colorHex: '#7F1D1D', num: '6', dir: { ko: '정서', en: 'W', ja: '真西', zh: '正西' } },
  { h: '戌', name: { ko: '개띠', en: 'Dog', ja: '戌(いぬ)', zh: '狗' }, years: '1946·58·70·82·94·06·18·30',
    text: { ko: '신뢰의 가치를 깊이 느끼는 하루. 오랜 친구에게 연락해보세요.', en: 'A day to feel the depth of trust. Reach out to an old friend.', ja: '信頼の価値を深く感じる一日。古い友人に連絡を。', zh: '深刻感受信任價值的一天。聯絡老朋友吧。' },
    color: { ko: '갈색', en: 'Brown', ja: '茶', zh: '棕' }, colorHex: '#78350F', num: '9', dir: { ko: '서북', en: 'NW', ja: '北西', zh: '西北' } },
  { h: '亥', name: { ko: '돼지띠', en: 'Pig', ja: '亥(いのしし)', zh: '豬' }, years: '1947·59·71·83·95·07·19·31',
    text: { ko: '풍요로움이 작은 일상에서 시작됩니다. 감사가 더 큰 복을 부릅니다.', en: 'Abundance starts in small moments. Gratitude calls bigger blessings.', ja: '豊かさは小さな日常から始まります。感謝がより大きな福を呼びます。', zh: '豐盛從日常小事開始。感恩招來更大福氣。' },
    color: { ko: '쪽빛', en: 'Indigo', ja: '藍', zh: '靛藍' }, colorHex: '#1E3A8A', num: '4', dir: { ko: '북', en: 'N', ja: '北', zh: '北' } },
]
const zodiacIdx = ref(6) // 午 — Horse (2026 丙午)
const tr = (obj) => obj[locale.value] || obj.ko
const selZodiac = computed(() => ZODIAC[zodiacIdx.value])
// 띠별 오늘운세 실데이터(daily_horoscope). 운세 문구·행운 색/숫자/방위는 DB값을 쓰고,
// 띠 정체성(한자·이름·생년)은 정적 ZODIAC 유지. API가 비면 정적값으로 폴백.
const ZODIAC_ORDER = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지']
const { data: horoData } = await useFetch('/api/horoscope', { query: { lang: locale } })
const todayZodiac = computed(() => horoData.value?.byZodiac?.[ZODIAC_ORDER[zodiacIdx.value]] || null)
function zodiacGridLabel(z) {
  return locale.value === 'ko' ? z.name.ko.replace(/띠$/, '') : (z.name[locale.value] || z.name.ko)
}

/* ===================== Premium carousel + locale pricing ===================== */
const PREMIUM = [
  { to: { path: '/saju', query: { service: 'lifetime' } }, glyph: '命', titleKey: 'premium.life.title', descKey: 'premium.life.desc', krwOld: '19,800', usdOld: '19.99' },
  { to: { path: '/saju', query: { service: 'newyear' } }, glyph: '秘', titleKey: 'premium.newyear.title', descKey: 'premium.newyear.desc', krwOld: '9,900', usdOld: '9.99' },
  { to: { path: '/celeb-select', query: { service: 'celeb' } }, glyph: '緣', titleKey: 'premium.celeb.title', descKey: 'premium.celeb.desc', krwOld: '5,000', usdOld: '4.99' },
  { to: { path: '/celeb-select', query: { service: 'mbti' } }, glyph: '合', titleKey: 'premium.mbti.title', descKey: 'premium.mbti.desc', krwOld: '5,000', usdOld: '4.99' },
]
const isKo = computed(() => locale.value === 'ko')
const priceOld = (p) => (isKo.value ? `${p.krwOld}원` : `$${p.usdOld}`)

const carousel = ref(null)
const scrollCarousel = (dx) => carousel.value?.scrollBy({ left: dx, behavior: 'smooth' })

/* ===================== Free grid ===================== */
// 홈 제품 카드는 결과로 직행한다(앱 내 동선 = 1클릭). 색인용 공개 랜딩(/fortune/*)은
// 푸터 '운세' 칼럼이 링크해 검색 유입·크롤을 받으므로 고아가 되지 않는다(관심사 분리).
// ⚠️ '오늘의 운세'는 개인 사주 기반 오늘운세(/result/free?service=today)다.
//    /daily 는 별개 상품(띠별 오늘운세)이므로 여기에 연결하면 안 된다.
const FREE = [
  { to: { path: '/result/free', query: { service: 'today' } }, glyph: '日', titleKey: 'free.today.title', descKey: 'free.today.desc', badge: 'free' },
  { to: { path: '/result/free', query: { service: 'tojung' } }, glyph: '秘', titleKey: 'free.tojung.title', descKey: 'free.tojung.desc', badge: 'free' },
  { to: { path: '/result/free', query: { service: 'date' } }, glyph: '情', titleKey: 'free.date.title', descKey: 'free.date.desc', badge: 'free' },
  { to: { path: '/result/free', query: { service: 'lotto' } }, glyph: '財', titleKey: 'free.lotto.title', descKey: 'free.lotto.desc', badge: 'free' },
  { to: { path: '/result/free', query: { service: 'month' } }, glyph: '月', titleKey: 'free.month.title', descKey: 'free.month.desc', badge: 'free' },
  { to: { path: '/result/free', query: { service: 'hour' } }, glyph: '平', titleKey: 'free.hour.title', descKey: 'free.hour.desc', badge: 'new' },
]

/* ===================== Trust counters ===================== */
// 과장된 사용자/만족도 수치 대신 실제로 검증되는 데이터 자산 수치를 노출한다.
// (만세력=calenda_data 행수, 연예인=celebrities, 언어=지원 로케일, 명리=브랜드 연혁)
const STATS = [
  { labelKey: 'trust.manse', target: 73442, decimals: 0, unitKey: 'trust.manse.unit' },
  { labelKey: 'trust.celebs', target: 84, decimals: 0, unitKey: 'trust.celebs.unit' },
  { labelKey: 'trust.langs', target: 4, decimals: 0, unitKey: 'trust.langs.unit' },
  { labelKey: 'trust.heritage', target: 40, decimals: 0, unitKey: 'trust.heritage.unit' },
]
const unitText = (s) => (s.unitKey ? t(s.unitKey) : s.unit)
function fmt(v, decimals) {
  if (decimals) return (v / Math.pow(10, decimals)).toFixed(decimals)
  // 결정적 천단위 콤마(서버/클라 동일) — toLocaleString은 환경별 차이로 하이드레이션 불일치 유발.
  return Math.floor(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
// SSR/크롤러가 최종 숫자를 보도록 처음부터 목표값으로 렌더. 카운트업은 스크롤 진입 시 재생(0→목표).
const counts = ref(STATS.map((s) => fmt(s.target, s.decimals)))
const trustGrid = ref(null)
function animateCounts() {
  STATS.forEach((s, i) => {
    const dur = 1800
    const start = performance.now()
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      counts.value[i] = fmt(s.target * eased, s.decimals)
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })
}

/* ===================== Ohaeng (five elements) ===================== */
const ELEMENTS = [
  { el: 'mok', han: '木', koKey: 'oh.mok.ko', sub: 'WOOD' },
  { el: 'hwa', han: '火', koKey: 'oh.hwa.ko', sub: 'FIRE' },
  { el: 'to', han: '土', koKey: 'oh.to.ko', sub: 'EARTH' },
  { el: 'geum', han: '金', koKey: 'oh.geum.ko', sub: 'METAL' },
  { el: 'su', han: '水', koKey: 'oh.su.ko', sub: 'WATER' },
]
// 오행 동적 데이터(on-the-fly /api/ohaeng): 오늘 일진 오행 + 5원소 상생상극 해석.
const { data: ohData } = await useFetch('/api/ohaeng', { query: { lang: locale } })
const ohSelected = ref(ohData.value?.todayEl || null) // 기본은 오늘의 지배 오행
const ohText = computed(() => {
  const el = ohSelected.value
  if (!el) return t('oh.placeholder')
  return ohData.value?.byEl?.[el]?.content || t('oh.placeholder')
})

/* ===================== Starfield (client only) ===================== */
const starfield = ref(null)
let rafId = null
let onResize = null
onMounted(() => {
  // Trust counters: animate when scrolled into view.
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          animateCounts()
          io.disconnect()
        }
      })
    },
    { threshold: 0.3 },
  )
  if (trustGrid.value) io.observe(trustGrid.value)

  // Starfield canvas.
  const canvas = starfield.value
  if (canvas) {
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let stars = []
    let w = 0
    let h = 0
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      w = canvas.width = Math.max(1, rect.width) * dpr
      h = canvas.height = Math.max(1, rect.height) * dpr
      const count = Math.min(180, Math.floor((rect.width * rect.height) / 6000))
      stars = []
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: (Math.random() * 1.2 + 0.3) * dpr,
          o: Math.random() * 0.7 + 0.3,
          tw: Math.random() * 0.002 + 0.0005,
          phase: Math.random() * Math.PI * 2,
        })
      }
    }
    const frame = (time) => {
      ctx.clearRect(0, 0, w, h)
      for (const a of stars) {
        const alpha = a.o * (0.55 + 0.45 * Math.sin(time * a.tw + a.phase))
        ctx.beginPath()
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(240, 208, 128, ${alpha})`
        ctx.fill()
      }
      rafId = requestAnimationFrame(frame)
    }
    onResize = resize
    window.addEventListener('resize', resize)
    resize()
    rafId = requestAnimationFrame(frame)
  }
})
onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
  if (onResize) window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div class="home">
    <!-- ============ HERO ============ -->
    <section class="hero">
      <div class="hero-bg">
        <canvas ref="starfield" id="starfield" />
        <div class="hero-glow" />
        <div class="hero-vignette" />
      </div>

      <div class="hero-content">
        <div class="hero-eyebrow">
          <span>{{ t('hero.eyebrow') }}</span>
        </div>

        <h1 class="hero-title">
          <span class="ko">{{ t('hero.title.ko') }}</span>
          <span class="hanja">{{ t('hero.title.hanja') }}</span>
        </h1>

        <p class="hero-subtitle">{{ t('hero.subtitle') }}</p>
        <p class="hero-tagline" v-html="t('hero.tagline')" />

        <div class="hero-cta">
          <NuxtLink :to="localePath('/saju')" class="btn btn-primary btn-lg">
            <span>{{ t('common.start') }}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </NuxtLink>
          <NuxtLink :to="localePath({ path: '/', hash: '#premium' })" class="btn btn-secondary btn-lg">{{ t('common.viewPremium') }}</NuxtLink>
        </div>
      </div>

      <div class="scroll-indicator">
        <span>{{ t('common.scroll') }}</span>
        <div class="scroll-line" />
      </div>
    </section>

    <!-- ============ ACCURACY BAND ============ -->
    <section class="accuracy-band container">
      <div class="ab-inner">
        <div class="ab-glyph">曆</div>
        <div class="ab-text">
          <div class="ab-eyebrow">{{ t('accuracy.eyebrow') }}</div>
          <h2 class="ab-title">{{ t('accuracy.band.title') }}</h2>
          <p class="ab-desc">{{ t('accuracy.band.desc') }}</p>
        </div>
        <NuxtLink :to="localePath('/accuracy')" class="ab-link">
          <span>{{ t('accuracy.band.more') }}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </NuxtLink>
      </div>
    </section>

    <!-- ============ ZODIAC ============ -->
    <section class="zodiac-section container">
      <div class="zodiac-card">
        <div class="zodiac-head">
          <div class="section-label"><span>{{ t('zodiac.eyebrow') }}</span></div>
          <h2 class="section-title">{{ t('zodiac.title') }}</h2>
          <p class="section-subtitle">{{ t('zodiac.subtitle') }}</p>
        </div>

        <div class="zodiac-grid">
          <div
            v-for="(z, i) in ZODIAC"
            :key="z.h"
            class="zodiac-item"
            :class="{ active: i === zodiacIdx }"
            @click="zodiacIdx = i"
          >
            <span class="zodiac-hanja">{{ z.h }}</span>
            <span class="zodiac-name">{{ zodiacGridLabel(z) }}</span>
          </div>
        </div>

        <div class="zodiac-result show">
          <div class="zodiac-result-head">
            <div class="zodiac-result-hanja">{{ selZodiac.h }}</div>
            <div class="zodiac-result-title">
              <span>{{ tr(selZodiac.name) }}</span>
              <span class="sub">{{ selZodiac.years }}</span>
            </div>
          </div>
          <p class="zodiac-result-text">{{ todayZodiac ? todayZodiac.content : tr(selZodiac.text) }}</p>
          <div class="zodiac-lucky">
            <div class="lucky-item">
              <div class="lucky-label">{{ t('zodiac.luckyColor') }}</div>
              <div class="lucky-value">
                <span class="lucky-color-swatch" :style="{ background: todayZodiac ? todayZodiac.colorHex : selZodiac.colorHex }" /><span>{{ todayZodiac ? todayZodiac.color : tr(selZodiac.color) }}</span>
              </div>
            </div>
            <div class="lucky-item">
              <div class="lucky-label">{{ t('zodiac.luckyNumber') }}</div>
              <div class="lucky-value">{{ todayZodiac ? todayZodiac.num : selZodiac.num }}</div>
            </div>
            <div class="lucky-item">
              <div class="lucky-label">{{ t('zodiac.luckyDir') }}</div>
              <div class="lucky-value">{{ todayZodiac ? todayZodiac.dir : tr(selZodiac.dir) }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ PREMIUM CAROUSEL ============ -->
    <section id="premium" class="premium-section container">
      <div class="section-head">
        <div class="left">
          <div class="section-label"><span>{{ t('premium.eyebrow') }}</span></div>
          <h2 class="section-title" v-html="t('premium.title.html')" />
          <p class="section-subtitle">{{ t('premium.subtitle') }}</p>
          <p class="premium-pitch" v-html="t('premium.pitch.html')" />
        </div>
        <div class="nav-arrows">
          <button class="arrow-btn" type="button" :aria-label="t('common.prev')" @click="scrollCarousel(-400)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button class="arrow-btn" type="button" :aria-label="t('common.next')" @click="scrollCarousel(400)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </div>

      <div ref="carousel" class="premium-carousel">
        <NuxtLink v-for="p in PREMIUM" :key="p.glyph" class="premium-card" :to="localePath(p.to)">
          <div class="premium-visual">
            <div class="premium-hanja">{{ p.glyph }}</div>
            <span class="badge badge-pro premium-badge">PRO</span>
          </div>
          <div class="premium-body">
            <h3 class="premium-title">{{ t(p.titleKey) }}</h3>
            <p class="premium-desc">{{ t(p.descKey) }}</p>
            <div class="premium-foot">
              <div class="premium-price">
                <span class="price-old">{{ priceOld(p) }}</span>
                <span v-if="isKo" class="price-new">2,000<span class="unit">원</span></span>
                <span v-else class="price-new"><span class="unit">$</span>2</span>
              </div>
              <span class="premium-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- ============ FREE GRID ============ -->
    <section id="free" class="free-section">
      <div class="container">
        <div class="text-center" style="margin-bottom: var(--space-12);">
          <div class="section-label"><span>{{ t('free.eyebrow') }}</span></div>
          <h2 class="section-title">{{ t('free.title') }}</h2>
          <p class="section-subtitle">{{ t('free.subtitle') }}</p>
        </div>

        <div class="free-grid">
          <FortuneCard
            v-for="f in FREE"
            :key="f.glyph"
            :to="f.to"
            :glyph="f.glyph"
            :title-key="f.titleKey"
            :desc-key="f.descKey"
            :badge="f.badge"
          />
        </div>
      </div>
    </section>

    <!-- ============ TRUST STATS ============ -->
    <section class="trust-section container">
      <div class="text-center" style="margin-bottom: var(--space-12);">
        <div class="section-label"><span>{{ t('trust.eyebrow') }}</span></div>
        <h2 class="section-title">{{ t('trust.title') }}</h2>
      </div>
      <div ref="trustGrid" class="trust-grid">
        <div v-for="(s, i) in STATS" :key="s.labelKey" class="trust-item">
          <div class="trust-value"><span>{{ counts[i] }}</span><span class="unit">{{ unitText(s) }}</span></div>
          <div class="trust-label">{{ t(s.labelKey) }}</div>
        </div>
      </div>
    </section>

    <!-- ============ TESTIMONIALS ============ -->
    <section class="testi-section container">
      <div class="text-center" style="margin-bottom: var(--space-12);">
        <div class="section-label"><span>{{ t('testi.eyebrow') }}</span></div>
        <h2 class="section-title">{{ t('testi.title') }}</h2>
      </div>
      <!-- 관리자가 featured 지정한 실제 후기. 없으면 아래 샘플로 폴백. -->
      <div v-if="featuredReviews.length" class="testi-grid">
        <article v-for="r in featuredReviews" :key="r.id" class="testi-card">
          <div class="testi-rating">{{ '★'.repeat(r.rating) }}</div>
          <p class="testi-text">{{ r.text }}</p>
          <div class="testi-meta">
            <div class="testi-who"><span class="testi-flag">{{ flagOf(r.locale) }}</span><span class="testi-name">{{ r.author_name || t('testi.anon') }}</span></div>
            <span class="testi-tag">{{ tagOf(r.type_key) }}</span>
          </div>
        </article>
      </div>
      <div v-else class="testi-grid">
        <article class="testi-card">
          <div class="testi-rating">★★★★★</div>
          <p class="testi-text">{{ t('testi.t1') }}</p>
          <div class="testi-meta">
            <div class="testi-who"><span class="testi-flag">🇰🇷</span><span class="testi-name">{{ t('testi.t1.who') }}</span></div>
            <span class="testi-tag">{{ t('premium.life.title') }}</span>
          </div>
        </article>
        <article class="testi-card">
          <div class="testi-rating">★★★★★</div>
          <p class="testi-text">{{ t('testi.t2') }}</p>
          <div class="testi-meta">
            <div class="testi-who"><span class="testi-flag">🇺🇸</span><span class="testi-name">{{ t('testi.t2.who') }}</span></div>
            <span class="testi-tag">{{ t('premium.mbti.title') }}</span>
          </div>
        </article>
        <article class="testi-card">
          <div class="testi-rating">★★★★★</div>
          <p class="testi-text">{{ t('testi.t3') }}</p>
          <div class="testi-meta">
            <div class="testi-who"><span class="testi-flag">🇯🇵</span><span class="testi-name">{{ t('testi.t3.who') }}</span></div>
            <span class="testi-tag">{{ t('premium.celeb.title') }}</span>
          </div>
        </article>
      </div>
      <div class="testi-more">
        <NuxtLink :to="localePath('/reviews')" class="testi-more-btn">
          <span>{{ t('reviews.more') }}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </NuxtLink>
      </div>
    </section>

    <!-- ============ OHAENG ============ -->
    <section class="ohhaeng-section container">
      <div class="ohhaeng-card">
        <div class="section-label"><span>{{ t('oh.eyebrow') }}</span></div>
        <h2 class="section-title">{{ t('oh.title') }}</h2>
        <p class="section-subtitle">{{ t('oh.subtitle') }}</p>

        <p v-if="ohData" class="oh-today">{{ ohData.todayLabel }}</p>

        <div class="ohhaeng-orbit">
          <div
            v-for="e in ELEMENTS"
            :key="e.el"
            class="element"
            :class="{ active: e.el === ohSelected, today: ohData && e.el === ohData.todayEl }"
            :data-el="e.el"
            @click="ohSelected = e.el"
          >
            <div class="element-circle">{{ e.han }}</div>
            <div class="element-name"><span>{{ t(e.koKey) }}</span> <span class="ko-sub">{{ e.sub }}</span></div>
          </div>
        </div>

        <div class="ohhaeng-readout active" v-html="ohText" />
      </div>
    </section>

    <!-- ============ AURA BANNER ============ -->
    <section id="aura" class="aura-section container">
      <div class="aura-card">
        <div class="aura-text">
          <div class="aura-label">{{ t('aura.label') }}</div>
          <h2 class="aura-title" v-html="t('aura.title.html')" />
          <p class="aura-desc">{{ t('aura.desc') }}</p>
          <div class="aura-features">
            <span class="aura-feat">{{ t('aura.feat.face') }}</span>
            <span class="aura-feat">{{ t('aura.feat.palm') }}</span>
            <span class="aura-feat">{{ t('aura.feat.local') }}</span>
          </div>
          <a href="https://taoist.co.kr/aura" target="_blank" rel="noopener" class="aura-cta">
            <span>{{ t('aura.cta') }}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17L17 7" /><polyline points="7 7 17 7 17 17" /></svg>
          </a>
        </div>

        <div class="aura-visual">
          <div class="aura-phone">
            <div class="aura-phone-screen">
              <div class="aura-phone-label">A U R A</div>
              <div class="aura-tile">
                <span class="aura-tile-hanja">相</span>
                <div>
                  <div class="aura-tile-title">{{ t('aura.tile.face') }}</div>
                  <div class="aura-tile-face" />
                </div>
                <div class="aura-tile-desc">{{ t('aura.tile.face.desc') }}</div>
              </div>
              <div class="aura-tile">
                <span class="aura-tile-hanja">掌</span>
                <div>
                  <div class="aura-tile-title">{{ t('aura.tile.palm') }}</div>
                </div>
                <div class="aura-tile-desc">{{ t('aura.tile.palm.desc') }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ FOOTER ============ -->
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <NuxtLink :to="localePath('/')" class="logo">
              <span class="logo-mark">道</span>
              <span class="logo-text">타오운세<span class="hanja">悟運勢</span></span>
            </NuxtLink>
            <p class="footer-slogan">{{ t('footer.slogan') }}</p>
            <div class="footer-socials">
              <a href="#" class="social-btn" aria-label="Instagram"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg></a>
              <a href="#" class="social-btn" aria-label="X"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg></a>
              <a href="#" class="social-btn" aria-label="YouTube"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" /></svg></a>
            </div>
          </div>

          <div class="footer-col">
            <h4>{{ t('footer.col.fortune') }}</h4>
            <ul>
              <li><NuxtLink :to="localePath({ path: '/result/free', query: { service: 'today' } })">{{ t('footer.link.today') }}</NuxtLink></li>
              <li><NuxtLink :to="localePath('/fortune/tojung')">{{ t('footer.link.tojung') }}</NuxtLink></li>
              <li><NuxtLink :to="localePath('/fortune/lifetime')">{{ t('footer.link.life') }}</NuxtLink></li>
              <li><NuxtLink :to="localePath('/fortune/lotto')">{{ t('footer.link.lotto') }}</NuxtLink></li>
              <li><NuxtLink :to="localePath('/fortune/month')">{{ t('free.month.title') }}</NuxtLink></li>
              <li><NuxtLink :to="localePath('/fortune/newyear')">{{ t('premium.newyear.title') }}</NuxtLink></li>
            </ul>
          </div>

          <div class="footer-col">
            <h4>{{ t('footer.col.match') }}</h4>
            <ul>
              <li><NuxtLink :to="localePath({ path: '/celeb-select', query: { service: 'celeb' } })">{{ t('footer.link.celeb') }}</NuxtLink></li>
              <li><NuxtLink :to="localePath({ path: '/celeb-select', query: { service: 'mbti' } })">{{ t('footer.link.mbti') }}</NuxtLink></li>
              <li><NuxtLink :to="localePath('/fortune/date')">{{ t('footer.link.date') }}</NuxtLink></li>
              <li><a href="https://taoist.co.kr/aura" target="_blank" rel="noopener"><span>{{ t('nav.aura') }}</span> ↗</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h4>{{ t('footer.col.support') }}</h4>
            <ul>
              <li><NuxtLink :to="localePath('/accuracy')">{{ t('footer.link.accuracy') }}</NuxtLink></li>
              <li><NuxtLink :to="localePath('/library')">{{ t('footer.link.library') }}</NuxtLink></li>
              <li><NuxtLink :to="localePath('/faq')">{{ t('footer.link.faq') }}</NuxtLink></li>
              <li><NuxtLink :to="localePath('/support')">{{ t('footer.link.contact') }}</NuxtLink></li>
              <li><NuxtLink :to="localePath('/terms')">{{ t('footer.link.terms') }}</NuxtLink></li>
              <li><NuxtLink :to="localePath('/privacy')">{{ t('footer.link.privacy') }}</NuxtLink></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <div class="footer-legal">
            <span>{{ t('footer.copyright') }}</span>
            <span class="biz">{{ t('footer.bizinfo') }}</span>
          </div>
          <div class="langs">
            <LangSwitcher />
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ============ HERO ============ */
.hero {
  position: relative;
  min-height: 78vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 118px 0 48px;
}
.hero-bg { position: absolute; inset: 0; z-index: 0; }
#starfield { position: absolute; inset: 0; width: 100%; height: 100%; }
.hero-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 800px;
  height: 800px;
  background: radial-gradient(circle, rgba(201, 168, 76, 0.12) 0%, transparent 60%);
  pointer-events: none;
}
.hero-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 30%, rgba(10, 10, 15, 0.6) 80%, var(--bg-primary) 100%);
  pointer-events: none;
}
.hero-content {
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
  padding: 0 var(--space-6);
}
.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: var(--gold-primary);
  margin-bottom: var(--space-8);
}
.hero-eyebrow::before,
.hero-eyebrow::after {
  content: '';
  width: 40px;
  height: 1px;
  background: linear-gradient(to right, transparent, var(--gold-primary), transparent);
}
.hero-title {
  font-family: var(--font-display);
  font-size: clamp(3rem, 9vw, 6.5rem);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.04em;
  margin-bottom: var(--space-6);
}
.hero-title .ko {
  display: block;
  background: linear-gradient(180deg, #f0d080 0%, #c9a84c 50%, #8b7330 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 30px rgba(201, 168, 76, 0.3));
}
.hero-title .hanja {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.32em;
  color: var(--gold-primary);
  letter-spacing: 0.6em;
  margin-top: var(--space-4);
  opacity: 0.7;
  font-weight: 400;
}
.hero-subtitle {
  font-family: var(--font-display);
  font-style: italic;
  font-size: clamp(1.125rem, 2vw, 1.5rem);
  color: var(--text-secondary);
  margin-bottom: var(--space-4);
  letter-spacing: 0.02em;
}
.hero-tagline {
  font-size: var(--text-lg);
  color: var(--text-secondary);
  max-width: 580px;
  margin: 0 auto var(--space-12);
  line-height: 1.7;
}
.hero-cta {
  display: inline-flex;
  gap: var(--space-4);
  flex-wrap: wrap;
  justify-content: center;
}
.scroll-indicator {
  position: absolute;
  bottom: var(--space-12);
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.3em;
  text-transform: uppercase;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}
.scroll-line {
  width: 1px;
  height: 40px;
  background: var(--gold-primary);
  position: relative;
  overflow: hidden;
}
.scroll-line::after {
  content: '';
  position: absolute;
  top: -40px;
  left: 0;
  width: 100%;
  height: 40px;
  background: linear-gradient(to bottom, transparent, var(--gold-light));
  animation: scrollDown 2.2s ease-in-out infinite;
}
@keyframes scrollDown {
  0% { top: -40px; }
  100% { top: 40px; }
}

/* ============ ZODIAC ============ */
/* ACCURACY BAND */
.accuracy-band { padding: var(--space-4) var(--space-8) 0; }
.ab-inner { display: flex; align-items: center; gap: var(--space-6); padding: var(--space-6) var(--space-8); background: linear-gradient(120deg, rgba(201, 168, 76, 0.10), var(--bg-secondary)); border: 1px solid var(--gold-border-strong); border-radius: var(--radius-xl); box-shadow: var(--shadow-card), var(--shadow-inset); }
.ab-glyph { flex-shrink: 0; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-family: var(--font-display); font-size: 32px; color: var(--gold-light); background: radial-gradient(circle at 35% 30%, rgba(201, 168, 76, 0.30), rgba(201, 168, 76, 0.05)); border: 2px solid var(--gold-border-strong); }
.ab-text { flex: 1; min-width: 0; }
.ab-eyebrow { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.22em; text-transform: uppercase; color: var(--gold-primary); margin-bottom: 6px; }
.ab-title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 600; line-height: 1.35; margin-bottom: 6px; text-wrap: balance; }
.ab-desc { color: var(--text-secondary); font-size: var(--text-sm); line-height: 1.7; text-wrap: pretty; }
.ab-link { flex-shrink: 0; display: inline-flex; align-items: center; gap: 7px; padding: 11px 18px; border-radius: var(--radius-full); border: 1px solid var(--gold-border-strong); color: var(--gold-light); font-weight: 600; font-size: var(--text-sm); white-space: nowrap; transition: background 0.2s, border-color 0.2s; }
.ab-link:hover { background: var(--gold-soft); border-color: var(--gold-primary); }
@media (max-width: 760px) {
  .accuracy-band { margin-top: 0; padding: var(--space-4) var(--space-4) 0; }
  .ab-inner { flex-direction: column; align-items: flex-start; gap: var(--space-4); padding: var(--space-6); }
  .ab-link { align-self: stretch; justify-content: center; }
}

.zodiac-section { padding: var(--space-24) 0; position: relative; }
.zodiac-card {
  background: linear-gradient(180deg, var(--bg-secondary), var(--bg-primary));
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-2xl);
  padding: var(--space-12);
  position: relative;
  overflow: hidden;
}
.zodiac-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -10%;
  width: 120%;
  height: 200%;
  background: radial-gradient(circle, var(--gold-soft) 0%, transparent 50%);
  pointer-events: none;
}
.zodiac-head { text-align: center; margin-bottom: var(--space-12); position: relative; }
.zodiac-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-3);
  position: relative;
}
.zodiac-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-2);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: var(--bg-tertiary);
  cursor: pointer;
  transition: all 0.25s var(--ease-out);
}
.zodiac-item:hover {
  border-color: var(--gold-primary);
  background: var(--gold-soft);
  transform: translateY(-3px);
}
.zodiac-item.active {
  border-color: var(--gold-primary);
  background: var(--gold-soft);
  box-shadow: var(--shadow-glow);
}
.zodiac-hanja {
  font-family: var(--font-mono);
  font-size: var(--text-2xl);
  color: var(--gold-light);
  font-weight: 500;
  line-height: 1;
}
.zodiac-name {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  letter-spacing: 0.05em;
}
.zodiac-item.active .zodiac-name { color: var(--gold-light); }
.zodiac-result {
  margin-top: var(--space-8);
  padding: var(--space-8);
  background: var(--bg-tertiary);
  border-radius: var(--radius-lg);
  border-left: 3px solid var(--gold-primary);
  animation: fadeIn 0.5s var(--ease-out);
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.zodiac-result-head {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}
.zodiac-result-hanja {
  width: 56px;
  height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--gold-primary);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--text-3xl);
  color: var(--gold-light);
}
.zodiac-result-title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  color: var(--text-primary);
}
.zodiac-result-title .sub {
  display: block;
  font-size: var(--text-sm);
  color: var(--text-muted);
  font-family: var(--font-body);
  margin-top: 2px;
  letter-spacing: 0.05em;
}
.zodiac-result-text {
  color: var(--text-primary);
  font-size: var(--text-lg);
  line-height: 1.7;
  margin-bottom: var(--space-6);
}
.zodiac-lucky {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}
.lucky-item {
  padding: var(--space-4);
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  border: 1px solid var(--gold-border);
  text-align: center;
}
.lucky-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--gold-primary);
  margin-bottom: var(--space-2);
}
.lucky-value {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--text-primary);
}
.lucky-color-swatch {
  display: inline-block;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  margin-right: 8px;
  vertical-align: middle;
  border: 2px solid var(--gold-border);
}
@media (max-width: 1024px) { .zodiac-grid { grid-template-columns: repeat(6, 1fr); } }
@media (max-width: 640px) {
  .zodiac-grid { grid-template-columns: repeat(4, 1fr); }
  .zodiac-card { padding: var(--space-8) var(--space-4); }
  .zodiac-lucky { grid-template-columns: 1fr; }
}

/* ============ PREMIUM CAROUSEL ============ */
.premium-section { padding: var(--space-24) 0; }
.premium-pitch {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  margin-top: var(--space-4);
  padding: 0.5em 1.1em;
  border: 1px solid rgba(201, 168, 76, 0.35);
  border-radius: 999px;
  background: rgba(201, 168, 76, 0.07);
  font-size: var(--text-sm);
  line-height: 1.45;
  color: var(--text-secondary);
}
.premium-pitch::before {
  content: '✦';
  color: var(--gold-primary);
  font-size: 0.85em;
}
.premium-pitch em {
  font-style: normal;
  font-weight: 700;
  color: var(--gold-light);
}
@media (max-width: 640px) {
  .premium-pitch { font-size: var(--text-xs); padding: 0.45em 0.9em; }
}
.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-6);
  margin-bottom: var(--space-12);
  flex-wrap: wrap;
}
.section-head .left { flex: 1; min-width: 280px; }
.section-head .nav-arrows { display: flex; gap: var(--space-2); }
.arrow-btn {
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--gold-border);
  border-radius: 50%;
  color: var(--gold-primary);
  background: var(--bg-secondary);
  transition: all 0.2s;
}
.arrow-btn:hover { background: var(--gold-primary); color: var(--text-on-gold); }
.premium-carousel {
  display: flex;
  gap: var(--space-6);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  padding: var(--space-3) var(--space-6) var(--space-6);
  margin: 0 calc(-1 * var(--space-6));
  scrollbar-width: none;
}
.premium-carousel::-webkit-scrollbar { display: none; }
.premium-card {
  flex: 0 0 380px;
  scroll-snap-align: start;
  display: block;
  text-decoration: none;
  color: inherit;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  border: 1px solid var(--gold-border-strong);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: all 0.4s var(--ease-out);
  cursor: pointer;
  position: relative;
  box-shadow: inset 0 1px 0 rgba(240, 208, 128, 0.25), 0 8px 32px rgba(0, 0, 0, 0.5);
}
.premium-card:hover {
  border-color: var(--gold-primary);
  box-shadow: var(--shadow-glow);
  transform: translateY(-4px);
}
.premium-visual {
  height: 220px;
  position: relative;
  overflow: hidden;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
}
.premium-visual::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 40%, var(--bg-secondary) 100%);
}
.premium-hanja {
  font-family: var(--font-mono);
  font-size: 9rem;
  font-weight: 700;
  color: var(--gold-primary);
  opacity: 0.18;
  transition: all 0.6s var(--ease-out);
}
.premium-card:hover .premium-hanja { opacity: 0.35; transform: scale(1.08); }
.premium-badge { position: absolute; top: var(--space-4); left: var(--space-4); z-index: 2; }
.premium-body { padding: var(--space-6); position: relative; z-index: 1; }
.premium-title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 600;
  margin-bottom: var(--space-3);
  letter-spacing: -0.01em;
}
.premium-desc {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  line-height: 1.7;
  margin-bottom: var(--space-6);
  min-height: 60px;
}
.premium-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--space-4);
  border-top: 1px solid var(--gold-border);
}
.premium-price { display: flex; flex-direction: column; gap: 2px; }
.price-old { font-size: var(--text-xs); color: var(--text-muted); text-decoration: line-through; }
.price-new {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--gold-light);
  font-weight: 600;
}
.price-new .unit { font-size: 0.7em; color: var(--text-secondary); margin-left: 2px; }
.premium-arrow {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--gold-soft);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--gold-primary);
  transition: all 0.3s;
}
.premium-card:hover .premium-arrow { background: var(--gold-primary); color: var(--text-on-gold); transform: translateX(4px); }
@media (max-width: 640px) { .premium-card { flex: 0 0 85%; } }

/* ============ FREE GRID ============ */
.free-section {
  padding: var(--space-24) 0;
  background: linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, var(--bg-primary) 100%);
}
.free-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-6);
}

/* ============ TRUST STATS ============ */
.trust-section { padding: var(--space-24) 0; position: relative; }
.trust-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  background: var(--bg-secondary);
}
.trust-item {
  padding: var(--space-12) var(--space-6);
  text-align: center;
  border-right: 1px solid var(--gold-border);
  position: relative;
}
.trust-item:last-child { border-right: none; }
.trust-value {
  font-family: var(--font-display);
  font-size: var(--text-5xl);
  font-weight: 700;
  background: linear-gradient(180deg, var(--gold-light), var(--gold-primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
  margin-bottom: var(--space-2);
  line-height: 1;
}
.trust-value .unit {
  font-size: 0.4em;
  color: var(--gold-primary);
  -webkit-text-fill-color: var(--gold-primary);
  margin-left: 4px;
  letter-spacing: 0;
}
.trust-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--text-secondary);
}
@media (max-width: 768px) {
  .trust-grid { grid-template-columns: repeat(2, 1fr); }
  .trust-item:nth-child(2) { border-right: none; }
  .trust-item:nth-child(-n + 2) { border-bottom: 1px solid var(--gold-border); }
}

/* ============ TESTIMONIALS ============ */
.testi-section { padding: var(--space-24) 0; }
.testi-more { display: flex; justify-content: center; margin-top: var(--space-12); }
.testi-more-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 26px; border-radius: var(--radius-md); border: 1px solid var(--gold-border); background: var(--bg-secondary); color: var(--text-secondary); font-size: var(--text-sm); font-weight: 600; transition: all 0.2s; }
.testi-more-btn:hover { border-color: var(--gold-primary); color: var(--gold-light); background: var(--gold-soft); transform: translateY(-2px); }
.testi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-6); }
.testi-card {
  background: var(--bg-secondary);
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  transition: all 0.3s;
  position: relative;
}
.testi-card:hover { border-color: var(--gold-primary); transform: translateY(-3px); }
.testi-card::before {
  content: '"';
  position: absolute;
  top: -10px;
  left: var(--space-6);
  font-family: var(--font-display);
  font-size: 6rem;
  line-height: 1;
  color: var(--gold-primary);
  opacity: 0.25;
}
.testi-rating {
  display: flex;
  gap: 2px;
  margin-bottom: var(--space-4);
  color: var(--gold-light);
  font-size: var(--text-lg);
}
.testi-text {
  color: var(--text-primary);
  font-size: var(--text-base);
  line-height: 1.7;
  margin-bottom: var(--space-6);
  min-height: 90px;
}
.testi-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--space-4);
  border-top: 1px solid var(--gold-border);
}
.testi-who { display: flex; align-items: center; gap: var(--space-3); }
.testi-flag {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  border: 1px solid var(--gold-border);
}
.testi-name { font-size: var(--text-sm); color: var(--text-secondary); }
.testi-tag {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--gold-primary);
  letter-spacing: 0.1em;
  padding: 3px 8px;
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-sm);
}
@media (max-width: 1024px) { .testi-grid { grid-template-columns: 1fr; } }

/* ============ OHAENG ============ */
.ohhaeng-section { padding: var(--space-24) 0; }
.ohhaeng-card {
  background: linear-gradient(180deg, var(--bg-secondary), var(--bg-primary));
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-2xl);
  padding: var(--space-16) var(--space-8);
  text-align: center;
  position: relative;
  overflow: hidden;
}
.ohhaeng-orbit {
  display: flex;
  gap: var(--space-6);
  justify-content: center;
  flex-wrap: wrap;
  margin: var(--space-12) auto var(--space-8);
  max-width: 800px;
}
.element { width: 130px; cursor: pointer; text-align: center; transition: transform 0.3s var(--ease-out); }
.element:hover { transform: translateY(-6px); }
.element-circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  margin: 0 auto var(--space-3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-5xl);
  font-weight: 700;
  border: 2px solid;
  transition: all 0.3s;
  position: relative;
}
.element[data-el='mok'] .element-circle { color: #5ba468; border-color: #5ba468; box-shadow: 0 0 30px rgba(91, 164, 104, 0.25); }
.element[data-el='hwa'] .element-circle { color: #dc2626; border-color: #dc2626; box-shadow: 0 0 30px rgba(220, 38, 38, 0.25); }
.element[data-el='to'] .element-circle { color: #d4a857; border-color: #d4a857; box-shadow: 0 0 30px rgba(212, 168, 87, 0.25); }
.element[data-el='geum'] .element-circle { color: #e8e0d0; border-color: #e8e0d0; box-shadow: 0 0 30px rgba(232, 224, 208, 0.25); }
.element[data-el='su'] .element-circle { color: #3b82f6; border-color: #3b82f6; box-shadow: 0 0 30px rgba(59, 130, 246, 0.25); }
.element:hover .element-circle { transform: scale(1.05); }
.element.active .element-circle { transform: scale(1.08); }
.element.today .element-circle { box-shadow: 0 0 0 2px var(--gold-primary), 0 0 34px var(--gold-glow); }
.element.today .element-name { color: var(--gold-light); }
.element-name { font-family: var(--font-display); font-size: var(--text-lg); color: var(--text-primary); }
.oh-today { text-align: center; font-family: var(--font-mono); font-size: var(--text-sm); letter-spacing: 0.04em; color: var(--gold-light); margin: 0 0 var(--space-6); }
.element-name .ko-sub {
  display: block;
  font-size: var(--text-xs);
  color: var(--text-muted);
  letter-spacing: 0.2em;
  margin-top: 2px;
  text-transform: uppercase;
  font-family: var(--font-mono);
}
.ohhaeng-readout {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-8);
  background: var(--bg-tertiary);
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-lg);
  min-height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-secondary);
  font-size: var(--text-base);
  line-height: 1.75;
  text-wrap: pretty;
  transition: all 0.3s;
}
.ohhaeng-readout.active { color: var(--text-primary); border-color: var(--gold-primary); }
.ohhaeng-readout :deep(strong) {
  display: block;
  margin-bottom: var(--space-2);
  color: var(--gold-light);
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 600;
}
/* 제목(strong) 뒤의 <br>는 블록 제목과 중복되므로 숨겨 빈 줄 방지 */
.ohhaeng-readout :deep(strong + br) { display: none; }

/* ============ AURA BANNER ============ */
.aura-section { padding: var(--space-24) 0; }
.aura-card {
  background: #000;
  background-image:
    radial-gradient(circle at 20% 50%, rgba(201, 168, 76, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 30%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
  border: 1px solid rgba(201, 168, 76, 0.3);
  border-radius: var(--radius-2xl);
  padding: var(--space-16) var(--space-12);
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: var(--space-12);
  align-items: center;
  position: relative;
  overflow: hidden;
}
.aura-label {
  font-family: var(--font-display);
  letter-spacing: 0.6em;
  color: var(--gold-primary);
  font-size: var(--text-sm);
  margin-bottom: var(--space-6);
}
.aura-title {
  font-family: var(--font-display);
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: var(--space-6);
  letter-spacing: -0.02em;
}
.aura-title :deep(.accent) { color: var(--gold-light); }
.aura-desc {
  color: var(--text-secondary);
  font-size: var(--text-lg);
  line-height: 1.7;
  margin-bottom: var(--space-8);
}
.aura-features { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-bottom: var(--space-8); }
.aura-feat {
  padding: 8px 16px;
  border: 1px solid rgba(201, 168, 76, 0.3);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  letter-spacing: 0.05em;
}
.aura-cta {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-8);
  border: 1px solid var(--gold-primary);
  border-radius: var(--radius-md);
  color: var(--gold-light);
  font-weight: 600;
  transition: all 0.3s;
}
.aura-cta:hover { background: var(--gold-primary); color: var(--text-on-gold); }
.aura-visual { position: relative; display: flex; align-items: center; justify-content: center; min-height: 320px; }
.aura-phone {
  width: 240px;
  aspect-ratio: 9 / 19;
  border-radius: 36px;
  border: 8px solid #1a1a1a;
  background: #000;
  position: relative;
  overflow: hidden;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.7), 0 0 60px rgba(201, 168, 76, 0.2);
}
.aura-phone-screen { position: absolute; inset: 0; padding: 28px 20px; display: flex; flex-direction: column; gap: 14px; }
.aura-phone-label { font-family: var(--font-display); color: var(--gold-primary); font-size: 13px; letter-spacing: 0.2em; text-align: center; }
.aura-tile {
  flex: 1;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(201, 168, 76, 0.2);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}
.aura-tile-hanja {
  position: absolute;
  top: 10px;
  right: 12px;
  font-family: var(--font-mono);
  color: var(--gold-light);
  font-size: 14px;
  padding: 3px 7px;
  border: 1px solid var(--gold-primary);
  border-radius: 4px;
}
.aura-tile-title { color: #fff; font-family: var(--font-display); font-size: 18px; font-weight: 600; }
.aura-tile-desc { color: rgba(255, 255, 255, 0.5); font-size: 10px; line-height: 1.5; }
.aura-tile-face {
  width: 60px;
  height: 60px;
  border: 1px solid var(--gold-primary);
  border-radius: 50%;
  margin: 4px auto;
  position: relative;
}
.aura-tile-face::before {
  content: '';
  position: absolute;
  inset: 18% 30%;
  border: 1px dashed rgba(201, 168, 76, 0.5);
  border-radius: 40% 40% 50% 50%;
}
@media (max-width: 900px) { .aura-card { grid-template-columns: 1fr; padding: var(--space-12) var(--space-6); } }

/* ============ FOOTER ============ */
.footer {
  background: var(--bg-secondary);
  border-top: 1px solid var(--gold-border);
  padding: var(--space-24) 0 var(--space-8);
}
.footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: var(--space-8); margin-bottom: var(--space-16); }
.footer-brand .logo { margin-bottom: var(--space-4); }
.footer-brand .logo {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
}
.footer-brand .logo-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1.5px solid var(--gold-primary);
  border-radius: 50%;
  font-family: var(--font-mono);
  font-size: 18px;
  color: var(--gold-light);
  background: radial-gradient(circle, var(--gold-soft), transparent);
}
.footer-brand .logo-text { color: var(--text-primary); }
.footer-brand .logo-text .hanja { font-size: 0.7em; color: var(--gold-primary); margin-left: 4px; font-family: var(--font-mono); }
.footer-slogan { color: var(--text-secondary); max-width: 360px; line-height: 1.7; margin-bottom: var(--space-6); }
.footer-socials { display: flex; gap: var(--space-3); }
.social-btn {
  width: 40px;
  height: 40px;
  border: 1px solid var(--gold-border);
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.2s;
}
.social-btn:hover { background: var(--gold-soft); color: var(--gold-primary); border-color: var(--gold-primary); }
.footer-col h4 {
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold-primary);
  margin-bottom: var(--space-4);
  letter-spacing: 0.05em;
}
.footer-col ul { list-style: none; display: flex; flex-direction: column; gap: var(--space-3); }
.footer-col a { color: var(--text-secondary); font-size: var(--text-sm); transition: color 0.2s; }
.footer-col a:hover { color: var(--gold-light); }
.footer-bottom {
  padding-top: var(--space-8);
  border-top: 1px solid var(--gold-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-muted);
  font-size: var(--text-xs);
  flex-wrap: wrap;
  gap: var(--space-4);
}
.footer-bottom .footer-legal { display: flex; flex-direction: column; gap: 4px; }
.footer-bottom .footer-legal .biz { color: var(--text-muted); opacity: 0.85; }
@media (max-width: 900px) { .footer-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 600px) { .footer-grid { grid-template-columns: 1fr; } }
</style>
