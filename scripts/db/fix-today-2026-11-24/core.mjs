/**
 * today 치환 적용·검사 공용 로직 (DB 접속 없음). rows: public.today 행 배열(nation k/e/j/c).
 */
import { createRequire } from 'node:module'
import { RULES, NATION, TODAY_FIELDS } from './rules.mjs'
import { findLeaks, sentences } from '../../tojung2027/leak-check.mjs'

const require = createRequire(import.meta.url)
const { Converter } = require('opencc-js')
const s2t = Converter({ from: 'cn', to: 'tw' })
export const LANG = { k: 'ko', e: 'en', j: 'ja', c: 'zh' }
export { TODAY_FIELDS }

const sentenceAt = (t, idx) => {
  let pos = 0
  for (const s of sentences(t)) {
    const i = t.indexOf(s, pos)
    if (idx >= i && idx < i + s.length) return s
    pos = i + s.length
  }
  return ''
}

/** updates: Map(`${number}-${nation}` -> {field: newText}) */
export function applyRules(rows) {
  const errors = [], changes = [], updates = new Map()
  const byKey = new Map(rows.map((r) => [`${r.number}-${r.nation}`, r]))
  for (const [number, lang, field, from, to, koBack] of RULES) {
    const r = byKey.get(`${number}-${NATION[lang]}`)
    if (!r) { errors.push(`행 없음: ${number}-${lang}`); continue }
    if (!TODAY_FIELDS.includes(field)) { errors.push(`필드 아님: ${field}`); continue }
    const key = `${r.number}-${r.nation}` // today.id는 언어 간 중복(같은 번호 = 같은 id) → (number, nation)이 키
    const u = updates.get(key) || {}
    const cur = u[field] ?? r[field]
    const n = cur.split(from).length - 1
    if (n !== 1) { errors.push(`${number}-${lang}.${field}: from이 ${n}회 — «${from}»`); continue }
    const idx = cur.indexOf(from)
    const before = sentenceAt(cur, idx)
    const next = cur.replace(from, to)
    if (lang === 'zh' && s2t(to) !== to) errors.push(`${number}-zh.${field}: 치환문이 toTraditional로 바뀜 «${to}»`)
    u[field] = next
    updates.set(key, u)
    changes.push({ id: r.id, key, number, lang, field, before, after: sentenceAt(next, idx) || to, koBack: koBack || '' })
  }
  for (const [key, u] of updates) {
    const r = byKey.get(key)
    // 원문이 이미 s2t로 바뀌는 글자(克→剋 같은 대만 변형)를 품고 있을 수 있으니, 치환으로 새로 생긴 차이만 본다.
    if (r.nation === 'c') for (const [f, v] of Object.entries(u)) if ((s2t(v) !== v) !== (s2t(r[f]) !== r[f])) errors.push(`${r.number}-zh.${f}: 치환 뒤 toTraditional 결과가 달라짐`)
  }
  return { changes, updates, errors }
}

export function scanToday(rows) {
  const hits = []
  for (const r of rows) for (const f of TODAY_FIELDS) for (const h of findLeaks(r[f], LANG[r.nation])) hits.push({ id: `${r.number}-${LANG[r.nation]}`, field: f, ...h })
  return hits
}
