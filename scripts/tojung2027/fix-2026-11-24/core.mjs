/**
 * 치환 적용·검사 공용 로직 (DB 접속 없음).
 */
import { createRequire } from 'node:module'
import { RULES } from './rules.mjs'

const require = createRequire(import.meta.url)
const { Converter } = require('opencc-js')
const s2t = Converter({ from: 'cn', to: 'tw' }) // server/utils/zh.ts와 같은 설정

export const YEARLY_FIELDS = ['headline', 'summary', 'total', 'wealth', 'career', 'love', 'health', 'family', 'caution']

/** 남은 노출 검사 패턴(유지 후보 = 자연스러운 성별 언급은 NATURAL로 제외). */
export const LEAK = {
  ko: /\d{1,3}\s*(번\s*)?괘|(남성|여성)(분|께|에게|으로서|이신|인 당신| 당신|이라면| 특유)/,
  en: /hexagram|No\.\s*\d|\(0\d\d\)|\b0\d\d\b|\b(as a (wo)?man|for (wo)?m[ae]n\b|a (wo)?man (with|holding|born)|the (wo)?man (born|reading))|often seen in women/i,
  ja: /\d{2,3}\s*(卦|番)|卦の番号|(男性|女性)(の方|には|にとって|であるあなた|のあなた|として|ならでは|は)/,
  zh: /\d{2,3}\s*卦|第\s*\d+\s*卦|(身為|對)(男性|女性)|(男性|女性)(朋友|而言|來說|特有|,|的你|的您)/,
}
export const NATURAL = /지인|인연|여성 관계|friend|acquaint|connections|知人|友人|ご縁|との関係|緣分|女性或|朋友或家人|young woman|乙女|少女/

export function sentences(t) {
  const ss = t.match(/[^.。!?！？\n]+(?:[.。!?！？]+(?:["'’”」)]*)|\n|$)/g)?.filter((s) => s.trim()) || []
  const merged = []
  for (const s of ss) {
    if (merged.length && /\bNo\.$/.test(merged[merged.length - 1].trim())) merged[merged.length - 1] += s
    else merged.push(s)
  }
  return merged.map((s) => s.trim())
}

const sentenceAt = (t, idx) => {
  let pos = 0
  for (const s of sentences(t)) {
    const i = t.indexOf(s, pos)
    if (idx >= i && idx < i + s.length) return s
    pos = i + s.length
  }
  return ''
}

/**
 * yearly 행 배열에 RULES를 적용. 원본은 바꾸지 않는다.
 * 반환: { changes: [{id, code, lang, field, before, after, koBack}], updates: Map(id -> {field: newText}), errors: [] }
 */
export function applyRules(yearly) {
  const errors = []
  const updates = new Map()
  const changes = []
  const byKey = new Map(yearly.map((r) => [`${r.gwae_code}-${r.lang}`, r]))
  for (const [code, lang, field, from, to, koBack] of RULES) {
    const r = byKey.get(`${code}-${lang}`)
    if (!r) { errors.push(`행 없음: ${code}-${lang}`); continue }
    if (!YEARLY_FIELDS.includes(field)) { errors.push(`yearly 필드 아님: ${field}`); continue }
    const u = updates.get(r.id) || {}
    const cur = u[field] ?? r[field]
    const n = cur.split(from).length - 1
    if (n !== 1) { errors.push(`${code}-${lang}.${field}: from이 ${n}회 나옴 — «${from}»`); continue }
    const idx = cur.indexOf(from)
    const before = sentenceAt(cur, idx)
    const next = cur.replace(from, to)
    const after = sentenceAt(next, idx) || to
    if (lang === 'zh') {
      if (s2t(to) !== to) errors.push(`${code}-zh.${field}: 치환문이 toTraditional로 바뀜 «${to}» → «${s2t(to)}»`)
    }
    u[field] = next
    updates.set(r.id, u)
    changes.push({ id: r.id, code, lang, field, before, after, koBack: koBack || '' })
  }
  // zh 필드 전체 멱등성
  for (const [id, u] of updates) {
    const r = yearly.find((x) => x.id === id)
    if (r.lang !== 'zh') continue
    for (const [f, v] of Object.entries(u)) if (s2t(v) !== v) errors.push(`${r.gwae_code}-zh.${f}: 필드 전체가 toTraditional로 바뀜`)
  }
  return { changes, updates, errors }
}

/** 남은 노출(유지 후보 제외) 검사. rows: {gwae_code, lang, [fields]} */
export function scanLeaks(rows, fields, label = '') {
  const hits = []
  for (const r of rows) {
    for (const f of fields) {
      for (const s of sentences(r[f] || '')) {
        if (LEAK[r.lang]?.test(s) && !NATURAL.test(s)) hits.push({ id: `${r.gwae_code}-${r.lang}${r.month ? '-m' + r.month : ''}`, field: label + f, s })
      }
    }
  }
  return hits
}
