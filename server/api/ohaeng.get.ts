import { serverSupabaseClient } from '#supabase/server'

/**
 * 오행으로 읽는 오늘 — on-the-fly(저장 없음). 오늘(KST) 일진의 천간 오행을 "지배
 * 오행"으로 잡고, 5원소 각각을 오늘 오행과의 상생/상극 관계로 해석한다. 절차적이라
 * 어떤 날짜든 동작. 날짜가 바뀌면 일진이 바뀌어 내용도 매일 달라진다.
 *
 * 오행 인덱스: 목0 화1 토2 금3 수4
 *   상생(生): (i+1)%5  (木→火→土→金→水→木)
 *   상극(剋): (i+2)%5  (木→土→水→火→金→木)
 */
const LANGS = ['ko', 'en', 'ja', 'zh']
const STEM_OH = { 갑: 0, 을: 0, 병: 1, 정: 1, 무: 2, 기: 2, 경: 3, 신: 3, 임: 4, 계: 4 } // 천간→오행 index
const ELS = ['mok', 'hwa', 'to', 'geum', 'su']
const HAN = ['木', '火', '土', '金', '水']
const HEX = ['#5BA85B', '#DC2626', '#C9A84C', '#D4D4D8', '#3B82F6']

const META = {
  ko: {
    name: ['목', '화', '토', '금', '수'],
    mean: ['성장과 시작', '열정과 표현', '안정과 신뢰', '결단과 정리', '지혜와 흐름'],
    dir: ['동쪽', '남쪽', '중앙', '서쪽', '북쪽'],
    rel: { same: '의 기운이 가장 강한 날이에요', gen_out: '의 기운이 오늘의 흐름을 북돋아 줘요', gen_in: '오늘의 기운이 당신을 살려 주는 날이에요', ctrl_out: '의 기운으로 오늘을 다스리기 좋아요', ctrl_in: '오늘의 기운에 눌리기 쉬우니 절제가 필요해요' },
    advice: ['작은 시도가 좋은 결실로 이어져요', '서두르지 말고 흐름을 타세요', '솔직함이 길을 엽니다', '버릴 것을 정리하면 가벼워져요', '귀 기울이면 답이 보여요'],
    today: (n) => `오늘은 ${n}(${HAN[0]}) `, line: (nm, han, mean, relTxt, adv, dir) => `${nm}(${han}) — ${mean}의 기운. ${relTxt}. ${adv}. 길한 방위는 ${dir}이에요.`,
    todayLabel: (nm) => `오늘은 ${nm}의 기운이 강한 날`,
  },
  en: {
    name: ['Wood', 'Fire', 'Earth', 'Metal', 'Water'],
    mean: ['growth and beginnings', 'passion and expression', 'stability and trust', 'decision and order', 'wisdom and flow'],
    dir: ['the East', 'the South', 'the center', 'the West', 'the North'],
    rel: { same: "'s energy runs strongest today", gen_out: "'s energy lifts today's flow", gen_in: "today's energy nourishes you", ctrl_out: "'s energy helps you master the day", ctrl_in: "today's energy may press on you, so practice restraint" },
    advice: ['a small attempt leads to good fruit', "don't rush—ride the flow", 'honesty opens the way', 'let go and feel lighter', 'listen and the answer appears'],
    line: (nm, han, mean, relTxt, adv, dir) => `${nm} (${han}) — energy of ${mean}. ${relTxt}. ${cap(adv)}. Lucky direction: ${dir}.`,
    todayLabel: (nm) => `${nm} energy runs strong today`,
  },
  ja: {
    name: ['木', '火', '土', '金', '水'],
    mean: ['成長と始まり', '情熱と表現', '安定と信頼', '決断と整理', '知恵と流れ'],
    dir: ['東', '南', '中央', '西', '北'],
    rel: { same: 'の気が最も強い日です', gen_out: 'の気が今日の流れを後押しします', gen_in: '今日の気があなたを生かす日です', ctrl_out: 'の気で今日を治めるのに良い', ctrl_in: '今日の気に押されやすく節制が必要です' },
    advice: ['小さな試みが良い実りに', '焦らず流れに乗って', '率直さが道を開く', '手放すと軽くなる', '耳を傾ければ答えが見える'],
    line: (nm, han, mean, relTxt, adv, dir) => `${nm} — ${mean}の気。${relTxt}。${adv}。吉方位は${dir}です。`,
    todayLabel: (nm) => `今日は${nm}の気が強い日`,
  },
  zh: {
    name: ['木', '火', '土', '金', '水'],
    mean: ['成長與起步', '熱情與表達', '安定與信任', '決斷與整理', '智慧與流動'],
    dir: ['東方', '南方', '中央', '西方', '北方'],
    rel: { same: '之氣今日最強', gen_out: '之氣助長今日的走勢', gen_in: '今日之氣滋養著你', ctrl_out: '之氣有助你駕馭今日', ctrl_in: '易受今日之氣壓制，需要節制' },
    advice: ['小小嘗試帶來好結果', '別急，順勢而行', '坦率能開路', '懂得放下便輕盈', '傾聽便見答案'],
    line: (nm, han, mean, relTxt, adv, dir) => `${nm} — ${mean}之氣。${relTxt}。${adv}。吉方位為${dir}。`,
    todayLabel: (nm) => `今日${nm}之氣偏強`,
  },
}
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }
function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

function relType(e: number, t: number) {
  if (e === t) return 'same'
  if ((e + 1) % 5 === t) return 'gen_out'
  if ((t + 1) % 5 === e) return 'gen_in'
  if ((e + 2) % 5 === t) return 'ctrl_out'
  return 'ctrl_in'
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const lang = LANGS.includes(String(q.lang)) ? String(q.lang) : 'ko'
  const now = new Date(Date.now() + 9 * 3600 * 1000)
  const today = now.toISOString().slice(0, 10)
  const [yy, mm, dd] = today.split('-')

  const client = await serverSupabaseClient(event)
  const cal = await client
    .from('calenda_data').select('cd_kdganjee')
    .eq('cd_sy', Number(yy)).eq('cd_sm', String(Number(mm))).eq('cd_sd', String(Number(dd))).maybeSingle()
  const dayGanji = cal.data?.cd_kdganjee || '갑자'
  const todayEl = STEM_OH[dayGanji[0]] ?? 0 // 일진 천간 오행 index

  const M = META[lang]
  const byEl: Record<string, any> = {}
  ELS.forEach((key, i) => {
    const rt = relType(i, todayEl)
    let relTxt = ''
    if (rt === 'same') relTxt = `${M.name[i]}${M.rel.same}`
    else if (rt === 'gen_out') relTxt = `${M.name[i]}${M.rel.gen_out}`
    else if (rt === 'ctrl_out') relTxt = `${M.name[i]}${M.rel.ctrl_out}`
    else relTxt = M.rel[rt] // gen_in / ctrl_in (주어가 '오늘')
    const adv = M.advice[hash(today + key) % M.advice.length]
    byEl[key] = {
      content: M.line(M.name[i], HAN[i], M.mean[i], relTxt, adv, M.dir[i]),
      colorHex: HEX[i],
      dir: M.dir[i],
    }
  })

  return { lang, date: today, todayEl: ELS[todayEl], todayLabel: M.todayLabel(M.name[todayEl]), byEl }
})
