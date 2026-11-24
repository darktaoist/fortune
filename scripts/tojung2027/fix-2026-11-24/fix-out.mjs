/**
 * out/*.response.json(응답 원본, gitignore)에 같은 치환을 적용하고 DB와 대조한다. DB 접속 없음.
 *   node scripts/tojung2027/fix-2026-11-24/fix-out.mjs <db-before.json> <db-after-dump.json> [--write]
 *   - db-before: apply.ts가 만든 적용 직전 백업(tojung_yearly 행 배열)
 *   - db-after-dump: 적용 후 읽기 전용 덤프({yearly, monthly})
 * 원본 → DB 변환은 generate_batch.ts collect와 같다(ko: 그대로, en/ja/zh: normTerm → tidyTerm, zh는 s2t·赤羊→紅羊 추가).
 * 치환은 RULES의 from→to를 원본에 그대로 적용하고, 원본 표기가 달라 from이 없으면
 * (변환(원본) === 적용 전 DB)일 때만 그 필드를 적용 후 DB 문장으로 바꾼다.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RULES } from './rules.mjs'
import { YEARLY_FIELDS } from './core.mjs'

const require = createRequire(import.meta.url)
const { Converter } = require('opencc-js')
const s2t = Converter({ from: 'cn', to: 'tw' })
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../out')
const MONTH_FIELDS = ['summary', 'body', 'wealth', 'career', 'love', 'health', 'advice']

// generate_batch.ts의 normTerm/tidyTerm 복사(동작 동일해야 함)
function normTerm(s, lang) {
  s = s.replace(/土정비결|토정비결/g, '土亭秘訣')
  if (lang === 'ja') {
    s = s.replace(/トジョン秘訣/g, '土亭秘訣')
      .replace(/トジョン・?[ビピ]ギョル/g, 'トジョンビギョル')
      .replace(/(?<![(（])トジョンビギョル/g, '土亭秘訣')
  }
  return s
}
const tidyTerm = (s) => s
  .replace(/(土亭[秘祕]訣[」》』]?)\s*[(（]土亭秘訣[)）]/g, '$1')
  .replace(/(土亭[秘祕]訣[」》』]?\s*[(（])土亭秘訣[,，、]\s*/g, '$1')
const pipe = (s, lang) => {
  if (lang === 'ko') return s
  let r = tidyTerm(normTerm(s, lang))
  if (lang === 'zh') r = tidyTerm(s2t(r)).replace(/赤羊/g, '紅羊')
  return r
}

const [beforePath, afterPath] = process.argv.slice(2)
const WRITE = process.argv.includes('--write')
const before = JSON.parse(readFileSync(beforePath, 'utf8'))
const after = JSON.parse(readFileSync(afterPath, 'utf8'))
const key = (c, l) => `${c}-${l}`
const B = new Map(before.map((r) => [key(r.gwae_code, r.lang), r]))
const A = new Map(after.yearly.map((r) => [key(r.gwae_code, r.lang), r]))
const AM = new Map(after.monthly.map((r) => [`${key(r.gwae_code, r.lang)}-${r.month}`, r]))

const files = readdirSync(OUT).filter((f) => /^2027-\d{3}-(ko|en|ja|zh)-(v1|t1)\.response\.json$/.test(f))
const stat = { files: files.length, ruleDirect: 0, ruleFallback: 0, ruleFail: [], filesChanged: 0, mismatch: [] }

for (const f of files) {
  const [, code, lang] = f.match(/^2027-(\d{3})-(ko|en|ja|zh)/)
  const p = resolve(OUT, f)
  const msg = JSON.parse(readFileSync(p, 'utf8'))
  const tb = msg.content.find((b) => b.type === 'text')
  const raw = JSON.parse(tb.text)
  let changed = false
  for (const [rc, rl, field, from, to] of RULES) {
    if (rc !== code || rl !== lang) continue
    if (raw[field].split(from).length - 1 === 1) {
      raw[field] = raw[field].replace(from, to); stat.ruleDirect++; changed = true
    } else if (pipe(raw[field], lang) === B.get(key(code, lang))[field] || pipe(raw[field], lang) === A.get(key(code, lang))[field]) {
      // 원본 표기가 DB와 달라 from이 안 맞는 경우: 같은 필드의 다른 규칙이 먼저 적용됐을 수도 있으니 최종 DB 문장으로 맞춘다.
      if (pipe(raw[field], lang) !== A.get(key(code, lang))[field]) { raw[field] = A.get(key(code, lang))[field]; changed = true }
      stat.ruleFallback++
    } else stat.ruleFail.push(`${f} ${field} «${from}»`)
  }
  if (changed) {
    stat.filesChanged++
    tb.text = JSON.stringify(raw)
    if (WRITE) writeFileSync(p, JSON.stringify(msg, null, 2))
  }
  // 대조: 변환(파일) === 적용 후 DB
  const a = A.get(key(code, lang))
  for (const fl of YEARLY_FIELDS) if (pipe(raw[fl], lang) !== a[fl]) stat.mismatch.push(`${f} yearly.${fl}`)
  for (const m of raw.months) {
    const am = AM.get(`${key(code, lang)}-${m.month}`)
    for (const fl of MONTH_FIELDS) if (pipe(m[fl], lang) !== am[fl]) stat.mismatch.push(`${f} m${m.month}.${fl}`)
  }
}
console.log(JSON.stringify({ ...stat, mismatch: stat.mismatch.length, mismatchSample: stat.mismatch.slice(0, 20), write: WRITE }, null, 1))
