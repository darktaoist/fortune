#!/usr/bin/env node
/**
 * daily_horoscope 6개월치 임의(템플릿) 생성·삽입.
 * 원래는 매일 AI 배치로 채우던 테이블인데(비용 이슈로 중단), 메인 띠별 오늘운세
 * 위젯이 동작하도록 플레이스홀더 콘텐츠를 채운다.
 *
 *   node scripts/db/seed-horoscope.mjs [startYYYY-MM-DD] [days]
 *   (기본: 오늘부터 184일)
 *
 * - zodiac_ko 는 모든 언어에서 한국어 라벨 고정(키). content 만 언어별.
 * - birth_years 는 기존 DB 값을 재사용(없으면 내장 폴백).
 * - 콘텐츠는 (날짜+띠+언어) 시드 기반 결정적 선택 → 재실행해도 동일, 행마다 다름.
 * - ON CONFLICT (target_date, zodiac_ko, lang) DO UPDATE → 생성 범위(오늘~) 내
 *   행의 content를 갱신. 범위 밖(과거 March 등) 원본 데이터는 손대지 않음.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'

const ROOT = resolve(import.meta.dirname, '../..')
const url = readFileSync(resolve(ROOT, '.env'), 'utf8')
  .split('\n').find((l) => l.startsWith('SUPABASE_DATABASE_URL=')).split('=').slice(1).join('=').trim()
const m = url.match(/^postgres(?:ql)?:\/\/(.*)@([^/]+)\/(.+)$/)
const ci = m[1].indexOf(':')
const cfg = {
  user: m[1].slice(0, ci), password: m[1].slice(ci + 1),
  host: m[2].slice(0, m[2].lastIndexOf(':')), port: 5432, database: m[3],
  ssl: { rejectUnauthorized: false },
}

// ── 띠 정의 (zodiac_ko 키 + 언어별 이름 + 폴백 birth_years) ───────────────
const ZODIAC = [
  { ko: '쥐', en: 'Rat', ja: '鼠', zh: '鼠', years: '1948, 1960, 1972, 1984, 1996, 2008, 2020' },
  { ko: '소', en: 'Ox', ja: '牛', zh: '牛', years: '1937, 1949, 1961, 1973, 1985, 1997, 2009, 2021' },
  { ko: '호랑이', en: 'Tiger', ja: '虎', zh: '虎', years: '1938, 1950, 1962, 1974, 1986, 1998, 2010, 2022' },
  { ko: '토끼', en: 'Rabbit', ja: '兎', zh: '兔', years: '1939, 1951, 1963, 1975, 1987, 1999, 2011, 2023' },
  { ko: '용', en: 'Dragon', ja: '龍', zh: '龍', years: '1940, 1952, 1964, 1976, 1988, 2000, 2012, 2024' },
  { ko: '뱀', en: 'Snake', ja: '蛇', zh: '蛇', years: '1941, 1953, 1965, 1977, 1989, 2001, 2013, 2025' },
  { ko: '말', en: 'Horse', ja: '馬', zh: '馬', years: '1942, 1954, 1966, 1978, 1990, 2002, 2014' },
  { ko: '양', en: 'Goat', ja: '羊', zh: '羊', years: '1943, 1955, 1967, 1979, 1991, 2003, 2015' },
  { ko: '원숭이', en: 'Monkey', ja: '猿', zh: '猴', years: '1944, 1956, 1968, 1980, 1992, 2004, 2016' },
  { ko: '닭', en: 'Rooster', ja: '鶏', zh: '雞', years: '1945, 1957, 1969, 1981, 1993, 2005, 2017' },
  { ko: '개', en: 'Dog', ja: '犬', zh: '狗', years: '1946, 1958, 1970, 1982, 1994, 2006, 2018' },
  { ko: '돼지', en: 'Pig', ja: '猪', zh: '豬', years: '1947, 1959, 1971, 1983, 1995, 2007, 2019' },
]

// ── 콘텐츠 풀 ────────────────────────────────────────────────────────────
const POOL = {
  ko: {
    open: [
      '작은 결단이 큰 흐름을 바꾸는 날이에요.', '주변의 조언이 평소보다 값집니다.',
      '서두르기보다 한 박자 쉬어가면 좋습니다.', '막혔던 일이 풀릴 실마리가 보입니다.',
      '감정보다 사실에 집중하면 길합니다.', '새로운 인연이 익숙한 곳에서 피어납니다.',
      '재물의 물꼬가 조금씩 트입니다.', '몸의 신호에 귀 기울일 때입니다.',
      '오래된 관계를 다지기 좋은 기운이에요.', '직감을 믿고 한 발 내디뎌도 좋습니다.',
    ],
    tip: [
      '무리한 욕심은 잠시 내려놓으세요.', '먼저 손 내밀면 귀인을 만납니다.',
      '작은 절약이 큰 결과로 이어집니다.', '말보다 경청이 답이 됩니다.',
      '계획은 문서로 남겨두면 좋아요.', '휴식도 훌륭한 전략입니다.',
      '솔직한 한마디가 관계를 깊게 합니다.', '익숙한 길보다 새로운 시도가 유리합니다.',
    ],
    color: { 금색: '금색', 적색: '적색', 청색: '청색', 녹색: '녹색', 자색: '자색', 백색: '백색', 황색: '황색', 흑색: '흑색' },
    dir: ['동', '서', '남', '북', '북동', '남동', '남서', '북서'],
  },
  en: {
    open: [
      'a small decision shifts the larger flow.', 'advice around you is more valuable than usual.',
      'pausing a beat serves you better than rushing.', 'a clue appears to unlock what was stuck.',
      'focus on facts over feelings for good fortune.', 'a new bond blooms in a familiar place.',
      'wealth begins to flow, little by little.', 'it is time to listen to your body.',
      'the energy favors strengthening old ties.', 'trust your intuition and take one step.',
    ],
    tip: [
      'set aside excessive ambition for now.', 'reach out first and you meet a helpful person.',
      'small savings lead to big results.', 'listening, not talking, is the answer.',
      'put your plans in writing.', 'rest is a fine strategy too.',
      'one honest word deepens a relationship.', 'a new attempt beats the familiar road.',
    ],
    color: { 금색: 'Gold', 적색: 'Red', 청색: 'Blue', 녹색: 'Green', 자색: 'Purple', 백색: 'White', 황색: 'Yellow', 흑색: 'Black' },
    dir: ['East', 'West', 'South', 'North', 'NE', 'SE', 'SW', 'NW'],
  },
  ja: {
    open: [
      '小さな決断が大きな流れを変えます。', '周りの助言が普段より価値ある一日です。',
      '焦るより一拍置くと良いでしょう。', '滞っていた事が解ける糸口が見えます。',
      '感情より事実に集中すると吉です。', '新しい縁が身近な場所で芽吹きます。',
      '財の流れが少しずつ開きます。', '体の signals に耳を傾ける時です。',
      '古い関係を深めるのに良い気です。', '直感を信じて一歩踏み出して。',
    ],
    tip: [
      '過度な欲は一旦手放しましょう。', '先に手を差し伸べると貴人に会えます。',
      '小さな節約が大きな結果に繋がります。', '話すより聴くことが答えです。',
      '計画は書き留めておくと良いです。', '休息も立派な戦略です。',
      '率直な一言が関係を深めます。', '慣れた道より新しい挑戦が有利です。',
    ],
    color: { 금색: '金色', 적색: '赤', 청색: '青', 녹색: '緑', 자색: '紫', 백색: '白', 황색: '黄', 흑색: '黒' },
    dir: ['東', '西', '南', '北', '北東', '南東', '南西', '北西'],
  },
  zh: {
    open: [
      '一個小決定能改變大局。', '周圍的建議今天格外珍貴。',
      '與其急躁，不如稍作停頓。', '受阻之事出現轉機的線索。',
      '專注事實而非情緒則為吉。', '新緣分在熟悉之處綻放。',
      '財路逐漸打開。', '是傾聽身體訊號的時候。',
      '今天適合鞏固舊有關係。', '相信直覺，向前一步。',
    ],
    tip: [
      '暫且放下過度的慾望。', '主動伸手便能遇見貴人。',
      '小積蓄成就大成果。', '聆聽勝於言談。',
      '把計畫寫下來為佳。', '休息也是良策。',
      '一句真心話能加深關係。', '新嘗試勝過熟悉的老路。',
    ],
    color: { 금색: '金色', 적색: '紅', 청색: '藍', 녹색: '綠', 자색: '紫', 백색: '白', 황색: '黃', 흑색: '黑' },
    dir: ['東', '西', '南', '北', '東北', '東南', '西南', '西北'],
  },
}
const COLOR_KEYS = ['금색', '적색', '청색', '녹색', '자색', '백색', '황색', '흑색']
const HEX = { 금색: '#C9A84C', 적색: '#DC2626', 청색: '#3B82F6', 녹색: '#10B981', 자색: '#8B5CF6', 백색: '#E8E0D0', 황색: '#F0D080', 흑색: '#4B5563' }

// 결정적 해시 (날짜+띠+언어)
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

// content는 운세 문구만. 행운 색/숫자/방위는 구조화 컬럼으로 분리(메인 위젯이 별도 렌더).
function makeRow(lang, z, dateStr) {
  const p = POOL[lang]
  const seed = hash(dateStr + z.ko + lang)
  const open = p.open[seed % p.open.length]
  const tip = p.tip[(seed >>> 4) % p.tip.length]
  // 행운 요소는 언어 무관 시드(날짜+띠)로 → 4개 언어가 동일한 색/숫자/방위(이름만 번역)
  const ls = hash(dateStr + z.ko)
  const ckey = COLOR_KEYS[(ls >>> 8) % COLOR_KEYS.length]
  const num = ((ls >>> 12) % 9) + 1
  const dir = p.dir[(ls >>> 16) % p.dir.length]
  const name = z[lang]
  let content
  if (lang === 'ko') content = `${name}띠 — 오늘은 ${open} ${tip}`
  else if (lang === 'en') content = `${name} — Today, ${open} ${tip}`
  else if (lang === 'ja') content = `${name}年 — 今日は${open}${tip}`
  else content = `${name} — 今天${open}${tip}`
  return { content, lucky_color: p.color[ckey], lucky_color_hex: HEX[ckey], lucky_number: num, lucky_dir: dir }
}

function fmtDate(d) { return d.toISOString().slice(0, 10) }

const startArg = process.argv[2]
const days = parseInt(process.argv[3] || '184', 10)
const start = startArg ? new Date(startArg + 'T00:00:00Z') : new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z')
const LANGS = ['ko', 'en', 'ja', 'zh']

const client = new pg.Client(cfg)
await client.connect()

// 기존 birth_years 재사용(있으면)
const existing = await client.query("select distinct zodiac_ko, birth_years from public.daily_horoscope where birth_years is not null")
const yearsByZodiac = {}
for (const r of existing.rows) if (!yearsByZodiac[r.zodiac_ko]) yearsByZodiac[r.zodiac_ko] = r.birth_years

const rows = []
for (let i = 0; i < days; i++) {
  const d = new Date(start.getTime() + i * 86400000)
  const ds = fmtDate(d)
  for (const z of ZODIAC) {
    const years = yearsByZodiac[z.ko] || z.years
    for (const lang of LANGS) {
      const r = makeRow(lang, z, ds)
      rows.push([ds, z.ko, years, r.content, lang, r.lucky_color, r.lucky_color_hex, r.lucky_number, r.lucky_dir])
    }
  }
}
console.log(`generating ${rows.length} rows (${days} days × 12 zodiac × 4 lang), start ${fmtDate(start)}`)

const BATCH = 500
let inserted = 0
for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH)
  const params = []
  const tuples = chunk.map((row, ri) => {
    const ph = row.map((_, ci2) => `$${ri * 9 + ci2 + 1}`)
    params.push(...row)
    return `(${ph.join(',')})`
  })
  const res = await client.query(
    `insert into public.daily_horoscope (target_date, zodiac_ko, birth_years, content, lang, lucky_color, lucky_color_hex, lucky_number, lucky_dir)
     values ${tuples.join(',')}
     on conflict (target_date, zodiac_ko, lang) do update set
       birth_years = excluded.birth_years,
       lucky_color = excluded.lucky_color, lucky_color_hex = excluded.lucky_color_hex,
       lucky_number = excluded.lucky_number, lucky_dir = excluded.lucky_dir`,
    params,
  )
  inserted += res.rowCount
}
console.log(`✔ upserted ${inserted} rows in range (content refreshed; out-of-range rows untouched)`)
const tot = await client.query('select count(*)::int c, min(target_date) mn, max(target_date) mx from public.daily_horoscope')
console.log(`table now: ${tot.rows[0].c} rows, range ${fmtDate(new Date(tot.rows[0].mn))} ~ ${fmtDate(new Date(tot.rows[0].mx))}`)
await client.end()
