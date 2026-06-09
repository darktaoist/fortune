<script setup>
// 띠별 오늘의 운세 — daily_horoscope 실연동. 입력/로그인 없이 보는 공개 운세.
// 복사(클립보드) + 공유(Web Share API → 모바일은 카톡 포함 네이티브 시트, PC는 URL 복사).
// 레거시 DailyHoroscope.vue 구조를 2.0 디자인 언어로 포팅.
const { t, locale } = useI18n()

// 12지 정적 메타(이모지·언어별 이름). zodiac_ko가 키. 생년은 API값 우선, 폴백용 보유.
const ZODIAC = [
  { ko: '쥐', emoji: '🐭', years: '1948, 1960, 1972, 1984, 1996, 2008, 2020', name: { ko: '쥐띠', en: 'Rat', ja: 'ねずみ年', zh: '鼠' } },
  { ko: '소', emoji: '🐮', years: '1949, 1961, 1973, 1985, 1997, 2009, 2021', name: { ko: '소띠', en: 'Ox', ja: 'うし年', zh: '牛' } },
  { ko: '호랑이', emoji: '🐯', years: '1950, 1962, 1974, 1986, 1998, 2010, 2022', name: { ko: '호랑이띠', en: 'Tiger', ja: 'とら年', zh: '虎' } },
  { ko: '토끼', emoji: '🐰', years: '1951, 1963, 1975, 1987, 1999, 2011, 2023', name: { ko: '토끼띠', en: 'Rabbit', ja: 'うさぎ年', zh: '兔' } },
  { ko: '용', emoji: '🐲', years: '1952, 1964, 1976, 1988, 2000, 2012, 2024', name: { ko: '용띠', en: 'Dragon', ja: 'たつ年', zh: '龍' } },
  { ko: '뱀', emoji: '🐍', years: '1953, 1965, 1977, 1989, 2001, 2013, 2025', name: { ko: '뱀띠', en: 'Snake', ja: 'へび年', zh: '蛇' } },
  { ko: '말', emoji: '🐴', years: '1954, 1966, 1978, 1990, 2002, 2014', name: { ko: '말띠', en: 'Horse', ja: 'うま年', zh: '馬' } },
  { ko: '양', emoji: '🐑', years: '1955, 1967, 1979, 1991, 2003, 2015', name: { ko: '양띠', en: 'Goat', ja: 'ひつじ年', zh: '羊' } },
  { ko: '원숭이', emoji: '🐵', years: '1956, 1968, 1980, 1992, 2004, 2016', name: { ko: '원숭이띠', en: 'Monkey', ja: 'さる年', zh: '猴' } },
  { ko: '닭', emoji: '🐔', years: '1957, 1969, 1981, 1993, 2005, 2017', name: { ko: '닭띠', en: 'Rooster', ja: 'とり年', zh: '雞' } },
  { ko: '개', emoji: '🐶', years: '1958, 1970, 1982, 1994, 2006, 2018', name: { ko: '개띠', en: 'Dog', ja: 'いぬ年', zh: '狗' } },
  { ko: '돼지', emoji: '🐷', years: '1959, 1971, 1983, 1995, 2007, 2019', name: { ko: '돼지띠', en: 'Pig', ja: 'いのしし年', zh: '豬' } },
]
const ORDER = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지']

useSeoMeta({
  title: () => `${t('daily.title')} · ${t('seo.titleSuffix')}`,
  description: () => t('daily.subtitle'),
  ogTitle: () => `${t('daily.title')} · ${t('seo.titleSuffix')}`,
  ogDescription: () => t('daily.subtitle'),
})

const { data } = await useFetch('/api/horoscope', { query: { lang: locale } })
const byZodiac = computed(() => data.value?.byZodiac || {})
const zname = (z) => z.name[locale.value] || z.name.ko
const contentOf = (z) => byZodiac.value[z.ko]?.content || ''
const yearsOf = (z) => byZodiac.value[z.ko]?.birth_years || z.years
const luckyOf = (z) => byZodiac.value[z.ko] || null

const dateLabel = computed(() => {
  const d = data.value?.date
  if (!d) return ''
  const [y, m, day] = d.split('-').map(Number)
  const lg = locale.value
  if (lg === 'en') return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
  if (lg === 'ja' || lg === 'zh') return `${y}年${m}月${day}日`
  return `${y}년 ${m}월 ${day}일`
})

/* 내 띠 찾기 */
const birthYear = ref('')
const myZodiacKo = ref('')
function findZodiac() {
  const y = parseInt(birthYear.value, 10)
  if (!y || y < 1900 || y > 2100) return
  myZodiacKo.value = ORDER[(((y - 2020) % 12) + 12) % 12]
  if (import.meta.client) {
    const el = document.getElementById('z-' + myZodiacKo.value)
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' })
  }
}
const myZodiac = computed(() => ZODIAC.find((z) => z.ko === myZodiacKo.value) || null)
function scrollToZodiac(ko) {
  myZodiacKo.value = ko
  if (!import.meta.client) return
  const el = document.getElementById('z-' + ko)
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' })
}

/* 복사 / 공유 + 토스트 */
const toast = ref('')
let toastTimer
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 1800)
}
async function copyAll() {
  const lines = ZODIAC.map((z) => `${z.emoji} ${zname(z)}\n${contentOf(z) || t('daily.noData')}`)
  const text = `📅 ${dateLabel.value}\n${t('daily.title')}\n\n${lines.join('\n\n')}`
  try { await navigator.clipboard.writeText(text); showToast(t('daily.copied')) }
  catch { showToast(t('daily.copyFail')) }
}
async function share() {
  const url = import.meta.client ? window.location.href : ''
  if (import.meta.client && navigator.share) {
    try { await navigator.share({ title: t('daily.title'), text: `${dateLabel.value} · ${t('daily.subtitle')}`, url }) } catch { /* cancelled */ }
  } else {
    try { await navigator.clipboard.writeText(url); showToast(t('daily.linkCopied')) }
    catch { showToast(t('daily.copyFail')) }
  }
}
onBeforeUnmount(() => clearTimeout(toastTimer))
</script>

<template>
  <main class="daily container">
    <div class="dh-head">
      <div class="stamp">運</div>
      <div class="dh-date">{{ dateLabel }}</div>
      <h1>{{ t('daily.title') }}</h1>
      <p>{{ t('daily.subtitle') }}</p>
    </div>

    <!-- 내 띠 찾기 -->
    <div class="find-card">
      <div class="find-row">
        <span class="find-label">🔍 {{ t('daily.findLabel') }}</span>
        <input v-model="birthYear" type="number" inputmode="numeric" :placeholder="t('daily.yearPh')" @keyup.enter="findZodiac" />
        <button class="btn btn-secondary btn-sm" @click="findZodiac">{{ t('daily.find') }}</button>
      </div>
      <p v-if="myZodiac" class="find-result">
        {{ t('daily.yourZodiac') }} <strong>{{ myZodiac.emoji }} {{ zname(myZodiac) }}</strong>
      </p>
    </div>

    <!-- 액션 -->
    <div class="dh-actions">
      <button class="action-btn" @click="copyAll">📋 {{ t('daily.copy') }}</button>
      <button class="action-btn" @click="share">🔗 {{ t('daily.share') }}</button>
    </div>

    <!-- 띠 빠른 이동 -->
    <nav class="z-nav">
      <a v-for="z in ZODIAC" :key="z.ko" :href="'#z-' + z.ko" class="z-chip" :class="{ mine: z.ko === myZodiacKo }" @click.prevent="scrollToZodiac(z.ko)">{{ z.emoji }}</a>
    </nav>

    <!-- 12띠 목록 -->
    <div class="z-list">
      <article v-for="z in ZODIAC" :id="'z-' + z.ko" :key="z.ko" class="z-card" :class="{ mine: z.ko === myZodiacKo }">
        <div class="z-card-head">
          <span class="z-emoji">{{ z.emoji }}</span>
          <div class="z-meta">
            <h3>{{ zname(z) }}</h3>
            <p class="z-years">{{ yearsOf(z) }}</p>
          </div>
        </div>
        <p class="z-content" :class="{ muted: !contentOf(z) }">{{ contentOf(z) || t('daily.noData') }}</p>
        <div v-if="luckyOf(z) && luckyOf(z).color" class="z-lucky">
          <span class="lk"><i class="swatch" :style="{ background: luckyOf(z).colorHex }" />{{ t('zodiac.luckyColor') }} · {{ luckyOf(z).color }}</span>
          <span class="lk">{{ t('zodiac.luckyNumber') }} · {{ luckyOf(z).num }}</span>
          <span class="lk">{{ t('zodiac.luckyDir') }} · {{ luckyOf(z).dir }}</span>
        </div>
      </article>
    </div>

    <transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </main>
</template>

<style scoped>
.daily { padding: 112px var(--space-6) var(--space-24); max-width: 860px; }

.dh-head { text-align: center; margin-bottom: var(--space-8); }
.dh-head .stamp { width: 60px; height: 60px; margin: 0 auto var(--space-4); display: flex; align-items: center; justify-content: center; border-radius: 50%; font-family: var(--font-display); font-size: 28px; color: var(--gold-light); background: radial-gradient(circle at 35% 30%, rgba(201, 168, 76, 0.30), rgba(201, 168, 76, 0.05)); border: 2px solid var(--gold-border-strong); box-shadow: var(--shadow-glow); }
.dh-date { font-family: var(--font-mono); font-size: var(--text-sm); letter-spacing: 0.1em; color: var(--gold-primary); margin-bottom: var(--space-2); }
.dh-head h1 { font-family: var(--font-display); font-size: clamp(1.7rem, 4vw, 2.3rem); font-weight: 700; letter-spacing: -0.02em; margin-bottom: var(--space-2); }
.dh-head p { color: var(--text-secondary); font-size: var(--text-base); }

.find-card { padding: var(--space-5) var(--space-6); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); background: var(--bg-secondary); margin-bottom: var(--space-5); }
.find-row { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
.find-label { font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary); white-space: nowrap; }
.find-row input { flex: 1; min-width: 140px; padding: 11px 14px; border-radius: var(--radius-md); border: 1px solid var(--gold-border); background: var(--bg-primary); color: var(--text-primary); font-family: var(--font-body); font-size: var(--text-base); }
.find-row input:focus { outline: none; border-color: var(--gold-primary); box-shadow: 0 0 0 3px var(--gold-soft); }
.find-result { margin-top: var(--space-3); font-size: var(--text-sm); color: var(--text-secondary); }
.find-result strong { color: var(--gold-light); }

.dh-actions { display: flex; gap: var(--space-3); justify-content: center; margin-bottom: var(--space-6); }
.action-btn { padding: 10px 20px; border-radius: var(--radius-full); border: 1px solid var(--gold-border); background: var(--bg-secondary); color: var(--text-secondary); font-size: var(--text-sm); font-weight: 600; transition: all 0.2s; }
.action-btn:hover { border-color: var(--gold-primary); color: var(--gold-light); background: var(--gold-soft); }

.z-nav { position: sticky; top: 84px; z-index: 10; display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; padding: var(--space-3); margin-bottom: var(--space-6); background: rgba(10, 10, 15, 0.8); backdrop-filter: blur(10px); border: 1px solid var(--gold-border); border-radius: var(--radius-full); }
.z-chip { width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center; font-size: 20px; border-radius: 50%; border: 1px solid transparent; transition: all 0.18s; }
.z-chip:hover { background: var(--bg-tertiary); }
.z-chip.mine { border-color: var(--gold-primary); background: var(--gold-soft); }

.z-list { display: flex; flex-direction: column; gap: var(--space-4); }
.z-card { padding: var(--space-6); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); background: var(--bg-secondary); scroll-margin-top: 140px; transition: border-color 0.2s; }
.z-card.mine { border-color: var(--gold-primary); box-shadow: 0 0 0 1px var(--gold-border-strong), var(--shadow-glow); }
.z-card-head { display: flex; align-items: center; gap: var(--space-4); margin-bottom: var(--space-4); }
.z-emoji { font-size: 32px; flex-shrink: 0; }
.z-meta h3 { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 700; }
.z-years { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); margin-top: 2px; }
.z-content { color: var(--text-secondary); font-size: var(--text-base); line-height: 1.85; text-wrap: pretty; }
.z-content.muted { color: var(--text-muted); font-style: italic; }
.z-lucky { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-5); margin-top: var(--space-4); padding-top: var(--space-3); border-top: 1px solid var(--gold-border); }
.z-lucky .lk { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); }
.z-lucky .swatch { width: 12px; height: 12px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.18); }

.toast { position: fixed; left: 50%; bottom: 40px; transform: translateX(-50%); z-index: 200; padding: 12px 22px; border-radius: var(--radius-full); background: var(--gold-primary); color: var(--text-on-gold); font-size: var(--text-sm); font-weight: 600; box-shadow: var(--shadow-deep); }
.toast-enter-active, .toast-leave-active { transition: opacity 0.25s, transform 0.25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

@media (max-width: 520px) { .daily { padding-top: 96px; } .z-nav { top: 72px; } }
</style>
