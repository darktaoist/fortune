// 유료 신년운세(올해의 운세)의 판(연도) — 단일 원천.
// 프롬프트(server/utils/fortune-registry.ts)·결제 상품명(server/utils/pricing.ts)·분석 이벤트(pages/checkout.vue)·
// 결제 상세 문구(data/checkout-services.js)·화면 문구(i18n 로케일의 {ny…} 토큰, i18n/i18n.config.ts)가 모두 여기를 본다.
//
// 해가 바뀌면 NEWYEAR_EDITIONS 끝에 새 판을 추가만 한다(기존 줄은 지우지 않는다):
//   from 이전에 만든 주문(saved_readings.created_at)은 이전 판으로 생성·표시된다(미열람 결제 보호).
export const NEWYEAR_EDITIONS: { year: number; from: string }[] = [
  { year: 2026, from: '2000-01-01T00:00:00+09:00' },
  { year: 2027, from: '2026-10-01T00:00:00+09:00' },
]

/** 현재 판매 중인 판. */
export const NEWYEAR_YEAR = NEWYEAR_EDITIONS[NEWYEAR_EDITIONS.length - 1].year

/** 주문 시각(ISO)의 판 연도. 없거나 못 읽으면 현재 판. */
export function newyearYearFor(at?: string | null): number {
  const t = at ? Date.parse(at) : NaN
  if (Number.isNaN(t)) return NEWYEAR_YEAR
  let year = NEWYEAR_EDITIONS[0].year
  for (const e of NEWYEAR_EDITIONS) if (Date.parse(e.from) <= t) year = e.year
  return year
}

/** 결제·분석용 상품명(비-UI). */
export const NEWYEAR_ORDER_NAME = `${NEWYEAR_YEAR} 신년운세`

// ── 로케일 치환값 ──
// 서기 4년 = 甲子. 천간 오행 색 + 지지 띠 = "붉은 양" 같은 해 이름.
const STEMS = '甲乙丙丁戊己庚辛壬癸'
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥'
const STEM_KO = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계']
const BRANCH_KO = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']
const STEM_EN = ['Gap', 'Eul', 'Byeong', 'Jeong', 'Mu', 'Gi', 'Gyeong', 'Sin', 'Im', 'Gye']
const BRANCH_EN = ['ja', 'chuk', 'in', 'myo', 'jin', 'sa', 'o', 'mi', 'sin', 'yu', 'sul', 'hae']
// 오행 색(목·목·화·화·토·토·금·금·수·수) — 천간 index/2
const COLOR = {
  ko: ['푸른', '붉은', '누런', '흰', '검은'],
  en: ['Blue', 'Red', 'Yellow', 'White', 'Black'],
  ja: ['青い', '赤い', '黄色い', '白い', '黒い'],
  zh: ['青', '紅', '黃', '白', '黑'],
}
// 오행 이름(목·화·토·금·수 순) — 천간은 index/2, 지지는 BRANCH_EL
const ELEM = {
  ko: ['목(木)', '화(火)', '토(土)', '금(金)', '수(水)'],
  en: ['wood (木)', 'fire (火)', 'earth (土)', 'metal (金)', 'water (水)'],
  ja: ['木（もく）', '火（か）', '土（ど）', '金（ごん）', '水（すい）'],
  zh: ['木', '火', '土', '金', '水'],
}
const BRANCH_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4]
const ANIMAL = {
  ko: ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'],
  en: ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Sheep', 'Monkey', 'Rooster', 'Dog', 'Pig'],
  ja: ['鼠', '牛', '虎', '兎', '龍', '蛇', '馬', '羊', '猿', '鶏', '犬', '猪'],
  zh: ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'],
}

/**
 * 로케일 문구의 {ny…} 토큰 값. 언어마다 토큰 이름이 달라(nyGanjiKo는 ko 문구에만 등장) 언어 구분 없이 한 맵으로 쓴다.
 *   {nyYear} 2027 · {nyGanji} 丁未 · {nyGanjiKo} 정미 · {nyGanjiEn} Jeongmi
 *   {nyAnimalKo} 붉은 양 · {nyAnimalEn} Red Sheep · {nyAnimalJa} 赤い羊 · {nyAnimalZh} 紅羊
 *   {nyStem} 丁 · {nyBranch} 未 · {nyStemElKo} 화(火) · {nyBranchElKo} 토(土) (En/Ja/Zh도 같은 꼴)
 */
export function newyearParams(year: number = NEWYEAR_YEAR): Record<string, string> {
  const i = (((year - 4) % 60) + 60) % 60
  const s = i % 10, b = i % 12
  const en = STEM_EN[s] + (/^[aeiou]/.test(BRANCH_EN[b]) ? '-' : '') + BRANCH_EN[b]
  return {
    nyYear: String(year),
    nyGanji: STEMS[s] + BRANCHES[b],
    nyGanjiKo: STEM_KO[s] + BRANCH_KO[b],
    nyGanjiEn: en,
    nyAnimalKo: `${COLOR.ko[s >> 1]} ${ANIMAL.ko[b]}`,
    nyAnimalEn: `${COLOR.en[s >> 1]} ${ANIMAL.en[b]}`,
    nyAnimalJa: COLOR.ja[s >> 1] + ANIMAL.ja[b],
    nyAnimalZh: COLOR.zh[s >> 1] + ANIMAL.zh[b],
    nyStem: STEMS[s],
    nyBranch: BRANCHES[b],
    nyStemElKo: ELEM.ko[s >> 1], nyBranchElKo: ELEM.ko[BRANCH_EL[b]],
    nyStemElEn: ELEM.en[s >> 1], nyBranchElEn: ELEM.en[BRANCH_EL[b]],
    nyStemElJa: ELEM.ja[s >> 1], nyBranchElJa: ELEM.ja[BRANCH_EL[b]],
    nyStemElZh: ELEM.zh[s >> 1], nyBranchElZh: ELEM.zh[BRANCH_EL[b]],
  }
}
