<script setup>
// 만세력 명식 차트 — ported from saju-chart.js/css.
// 십신(十神)·지장간·음양 are computed deterministically from the day master;
// 오행 점수·신강신약·대운 come from `data` (sample here; server-generated later).
const { t, locale } = useI18n()

const SAJU_SAMPLE = {
  user: { name: '회원님', meta: '', solar: '1972.7.1', lunar: '1972.5.21', hour: '卯(05:31~07:30)시' },
  pillars: { year: ['壬', '子'], month: ['丙', '午'], day: ['癸', '巳'], hour: ['乙', '卯'] },
  ohaeng: { mok: 40, hwa: 46, to: 17, geum: 7, su: 40 },
  strongWeak: { type: 'weak', score: '47 : 103' },
  daeun: {
    startAge: 2, startNote: true, currentIndex: 5,
    sequence: [
      { age: 2, stem: '丁', branch: '未' }, { age: 12, stem: '戊', branch: '申' },
      { age: 22, stem: '己', branch: '酉' }, { age: 32, stem: '庚', branch: '戌' },
      { age: 42, stem: '辛', branch: '亥' }, { age: 52, stem: '壬', branch: '子' },
      { age: 62, stem: '癸', branch: '丑' }, { age: 72, stem: '甲', branch: '寅' },
      { age: 82, stem: '乙', branch: '卯' }, { age: 92, stem: '丙', branch: '辰' },
    ],
  },
}

// Default null + computed fallback below (defineProps is hoisted and can't
// reference the locally-declared SAJU_SAMPLE).
const props = defineProps({ data: { type: Object, default: null } })

const STEM_ELEM = { 甲: 'mok', 乙: 'mok', 丙: 'hwa', 丁: 'hwa', 戊: 'to', 己: 'to', 庚: 'geum', 辛: 'geum', 壬: 'su', 癸: 'su' }
const STEM_YANG = { 甲: 1, 丙: 1, 戊: 1, 庚: 1, 壬: 1, 乙: 0, 丁: 0, 己: 0, 辛: 0, 癸: 0 }
const HIDDEN = {
  子: ['壬', '癸'], 丑: ['癸', '辛', '己'], 寅: ['戊', '丙', '甲'], 卯: ['甲', '乙'],
  辰: ['乙', '癸', '戊'], 巳: ['戊', '庚', '丙'], 午: ['丙', '己', '丁'], 未: ['丁', '乙', '己'],
  申: ['戊', '壬', '庚'], 酉: ['庚', '辛'], 戌: ['辛', '丁', '戊'], 亥: ['戊', '甲', '壬'],
}
const BRANCH_ELEM = { 寅: 'mok', 卯: 'mok', 巳: 'hwa', 午: 'hwa', 辰: 'to', 戌: 'to', 丑: 'to', 未: 'to', 申: 'geum', 酉: 'geum', 亥: 'su', 子: 'su' }
const GEN = { mok: 'hwa', hwa: 'to', to: 'geum', geum: 'su', su: 'mok' }
const CTRL = { mok: 'to', to: 'su', su: 'hwa', hwa: 'geum', geum: 'mok' }
const EL_ORDER = ['mok', 'hwa', 'to', 'geum', 'su']
const EL_HAN = { mok: '木', hwa: '火', to: '土', geum: '金', su: '水' }
const GODS = {
  bigyeon: { ko: '비견', han: '比肩' }, geopjae: { ko: '겁재', han: '劫財' },
  siksin: { ko: '식신', han: '食神' }, sanggwan: { ko: '상관', han: '傷官' },
  pyeonjae: { ko: '편재', han: '偏財' }, jeongjae: { ko: '정재', han: '正財' },
  pyeongwan: { ko: '편관', han: '偏官' }, jeonggwan: { ko: '정관', han: '正官' },
  pyeonin: { ko: '편인', han: '偏印' }, jeongin: { ko: '정인', han: '正印' },
  ilwon: { ko: '일원', han: '日元' },
}
function tenGod(dm, ch) {
  const de = STEM_ELEM[dm], te = STEM_ELEM[ch]
  const same = STEM_YANG[dm] === STEM_YANG[ch]
  if (de === te) return same ? 'bigyeon' : 'geopjae'
  if (GEN[de] === te) return same ? 'siksin' : 'sanggwan'
  if (CTRL[de] === te) return same ? 'pyeonjae' : 'jeongjae'
  if (CTRL[te] === de) return same ? 'pyeongwan' : 'jeonggwan'
  if (GEN[te] === de) return same ? 'pyeonin' : 'jeongin'
  return 'bigyeon'
}
const godLabel = (code) => (locale.value === 'ko' ? GODS[code].ko : GODS[code].han)
const yy = (yang) => (yang ? '陽' : '陰')

const d = computed(() => props.data || SAJU_SAMPLE)
const dm = computed(() => d.value.pillars.day[0])

const pillars = computed(() =>
  ['year', 'month', 'day', 'hour'].filter((key) => Array.isArray(d.value.pillars[key])).map((key) => {
    const [stem, branch] = d.value.pillars[key]
    const stemGod = stem === dm.value ? 'ilwon' : tenGod(dm.value, stem)
    const hid = HIDDEN[branch] || []
    const main = hid[hid.length - 1] || branch
    return {
      key, stem, branch, stemGod,
      stemEl: STEM_ELEM[stem], stemYy: yy(STEM_YANG[stem]),
      branchEl: BRANCH_ELEM[branch], branchYy: yy(STEM_YANG[main]),
      branchGod: tenGod(dm.value, main),
      hidden: hid.map((h) => ({ ch: h, el: STEM_ELEM[h], yy: yy(STEM_YANG[h]), god: h === dm.value ? 'ilwon' : tenGod(dm.value, h) })),
    }
  }),
)
const ohCells = computed(() => EL_ORDER.map((k) => ({ k, han: EL_HAN[k], num: d.value.ohaeng?.[k] ?? '–' })))
const sw = computed(() => d.value.strongWeak || {})
const swLabel = computed(() => (sw.value.type === 'strong' ? t('sj.strong') : t('sj.weak')))
const daeun = computed(() => d.value.daeun || {})
const seq = computed(() => daeun.value.sequence || [])
const elHan = (ch, isBranch) => EL_HAN[isBranch ? BRANCH_ELEM[ch] : STEM_ELEM[ch]]
const elCls = (ch, isBranch) => 'el-' + (isBranch ? BRANCH_ELEM[ch] : STEM_ELEM[ch])
</script>

<template>
  <div class="sj">
    <div v-if="d.user" class="sj-info">
      <div class="sj-info-name">{{ d.user.name || t('sj.member') }}<span v-if="d.user.meta">({{ d.user.meta }})</span></div>
      <div class="sj-info-meta">
        <span v-if="d.user.solar"><b>{{ t('sj.solar') }}</b> {{ d.user.solar }}</span>
        <span v-if="d.user.lunar"><b>{{ t('sj.lunar') }}</b> {{ d.user.lunar }}</span>
        <span v-if="d.user.hour"><b>{{ t('sj.born') }}</b> {{ d.user.hour }}</span>
      </div>
    </div>

    <div class="sj-table">
      <div v-for="p in pillars" :key="p.key" class="sj-pillar">
        <div class="sj-col-head">{{ t('sj.col.' + p.key) }}</div>
        <div class="sj-god sj-god-top" :class="{ 'is-self': p.stemGod === 'ilwon' }">{{ godLabel(p.stemGod) }}</div>
        <div class="sj-cell sj-stem">
          <span class="sj-yy">{{ p.stemYy }}</span>
          <span class="sj-char" :class="'el-' + p.stemEl">{{ p.stem }}</span>
          <span class="sj-el">{{ EL_HAN[p.stemEl] }}</span>
        </div>
        <div class="sj-cell sj-branch">
          <span class="sj-yy">{{ p.branchYy }}</span>
          <span class="sj-char" :class="'el-' + p.branchEl">{{ p.branch }}</span>
          <span class="sj-el">{{ EL_HAN[p.branchEl] }}</span>
        </div>
        <div class="sj-god">{{ godLabel(p.branchGod) }}</div>
        <div class="sj-hidden">
          <div class="sj-hid-label">{{ t('sj.jijanggan') }}</div>
          <div v-for="(h, i) in p.hidden" :key="i" class="sj-hid-row">
            <span class="sj-hid-char" :class="'el-' + h.el">{{ h.ch }}</span>
            <span class="sj-hid-el">{{ EL_HAN[h.el] }}</span>
            <span class="sj-hid-yy">{{ h.yy }}</span>
            <span class="sj-hid-god">{{ godLabel(h.god) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="sj-oh">
      <div v-for="c in ohCells" :key="c.k" class="sj-oh-cell">
        <span class="sj-oh-name" :class="'el-' + c.k">{{ c.han }}</span>
        <span class="sj-oh-num">{{ c.num }}</span>
      </div>
      <div class="sj-oh-cell sj-oh-sw">
        <span class="sj-oh-name">{{ t('sj.iljuStrength') }}</span>
        <span class="sj-oh-num">{{ sw.score || '' }}<small>{{ swLabel }}</small></span>
      </div>
    </div>

    <div class="sj-daeun-wrap">
      <p class="sj-daeun-note">{{ t('sj.daeun') }}<template v-if="daeun.startNote"> : {{ t('sj.daeunNote', { age: daeun.startAge }) }}</template></p>
      <div class="sj-daeun-scroll">
        <table class="sj-daeun">
          <tbody>
            <tr>
              <th>{{ t('sj.age') }}</th>
              <td v-for="(s, i) in seq" :key="i" :class="{ 'sj-du-cur': i === daeun.currentIndex }">{{ s.age }}{{ t('sj.ageUnit') }}~</td>
            </tr>
            <tr>
              <th>{{ t('sj.ganji') }}</th>
              <td v-for="(s, i) in seq" :key="i" :class="{ 'sj-du-cur': i === daeun.currentIndex }">
                <span :class="elCls(s.stem)">{{ s.stem }}</span>{{ elHan(s.stem) }}<br>
                <span :class="elCls(s.branch, true)">{{ s.branch }}</span>{{ elHan(s.branch, true) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="sj-foot-note">{{ t('sj.dateNote') }}</p>
    </div>
  </div>
</template>

<style scoped>
.el-mok { color: #86C39A; }
.el-hwa { color: #F08A7A; }
.el-to { color: #F0D080; }
.el-geum { color: #E8E0D0; }
.el-su { color: #93C5FD; }

.sj-info { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-3); padding: var(--space-4) var(--space-6); margin-bottom: 1.25rem; background: var(--bg-tertiary); border: 1px solid var(--gold-border); border-radius: var(--radius-md); }
.sj-info-name { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 700; color: var(--text-primary); }
.sj-info-name span { color: var(--text-secondary); font-weight: 500; font-size: var(--text-sm); margin-left: 4px; }
.sj-info-meta { display: flex; flex-wrap: wrap; gap: 1.25rem; font-size: var(--text-sm); color: var(--text-secondary); }
.sj-info-meta b { color: var(--text-muted); font-weight: 500; margin-right: 6px; }

.sj-table { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-3); }
@media (max-width: 640px) { .sj-table { grid-template-columns: repeat(2, 1fr); } }
.sj-pillar { display: flex; flex-direction: column; border: 1px solid var(--gold-border); border-radius: var(--radius-md); overflow: hidden; background: var(--bg-secondary); }
.sj-col-head { text-align: center; padding: 8px; font-family: var(--font-display); font-weight: 600; font-size: var(--text-sm); color: var(--gold-light); background: var(--gold-soft); border-bottom: 1px solid var(--gold-border); }
.sj-god { text-align: center; padding: 6px 4px; font-size: var(--text-xs); color: var(--text-secondary); background: var(--bg-tertiary); border-bottom: 1px solid var(--gold-border); }
.sj-god-top { border-top: none; }
.sj-god.is-self { color: var(--gold-primary); font-weight: 600; }
.sj-cell { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding: var(--space-4) 4px; position: relative; }
.sj-cell .sj-char { font-family: var(--font-mono); font-size: 2.4rem; font-weight: 700; line-height: 1; }
.sj-cell .sj-yy { font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); }
.sj-cell .sj-el { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); }
.sj-stem { background: linear-gradient(180deg, rgba(201, 168, 76, 0.06), transparent); }
.sj-branch { border-top: 1px dashed var(--gold-border); }

.sj-hidden { border-top: 1px solid var(--gold-border); padding: var(--space-3) var(--space-2); background: var(--bg-primary); }
.sj-hid-label { text-align: center; font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.08em; color: var(--text-muted); margin-bottom: 6px; }
.sj-hid-row { display: grid; grid-template-columns: 1.2em 1.2em 1.2em 1fr; align-items: center; gap: 4px; font-size: 11px; padding: 2px 4px; color: var(--text-secondary); }
.sj-hid-char { font-family: var(--font-mono); font-weight: 600; }
.sj-hid-el, .sj-hid-yy { font-family: var(--font-mono); color: var(--text-muted); font-size: 10px; }
.sj-hid-god { text-align: right; color: var(--text-secondary); }

.sj-oh { display: grid; grid-template-columns: repeat(6, 1fr); gap: var(--space-2); margin-top: 1.25rem; }
@media (max-width: 560px) { .sj-oh { grid-template-columns: repeat(3, 1fr); } }
.sj-oh-cell { text-align: center; padding: var(--space-3) 4px; background: var(--bg-tertiary); border: 1px solid var(--gold-border); border-radius: var(--radius-sm); }
.sj-oh-name { display: block; font-family: var(--font-mono); font-weight: 600; font-size: var(--text-base); }
.sj-oh-num { display: block; font-family: var(--font-display); font-size: var(--text-lg); font-weight: 700; color: var(--text-primary); margin-top: 4px; }
.sj-oh-num small { display: block; font-size: 11px; font-weight: 500; color: var(--text-muted); margin-top: 2px; }
.sj-oh-sw { background: var(--gold-soft); border-color: var(--gold-border-strong); }
.sj-oh-sw .sj-oh-name { color: var(--gold-light); font-size: var(--text-xs); }

.sj-daeun-wrap { margin-top: var(--space-6); }
.sj-daeun-note { font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: var(--space-3); }
.sj-daeun-scroll { overflow-x: auto; border: 1px solid var(--gold-border); border-radius: var(--radius-md); }
.sj-daeun { width: 100%; border-collapse: collapse; min-width: 600px; }
.sj-daeun th, .sj-daeun td { text-align: center; padding: 10px 6px; border-right: 1px solid var(--gold-border); border-bottom: 1px solid var(--gold-border); font-size: var(--text-sm); }
.sj-daeun tr:last-child td, .sj-daeun tr:last-child th { border-bottom: none; }
.sj-daeun td:last-child, .sj-daeun th:last-child { border-right: none; }
.sj-daeun th { background: var(--gold-soft); color: var(--gold-light); font-family: var(--font-display); font-weight: 600; white-space: nowrap; }
.sj-daeun td { font-family: var(--font-mono); color: var(--text-secondary); white-space: nowrap; line-height: 1.5; }
.sj-daeun .sj-du-cur { background: rgba(201, 168, 76, 0.14); color: var(--gold-light); font-weight: 700; }
.sj-foot-note { font-size: var(--text-xs); color: #C0623A; margin-top: var(--space-3); }
</style>
