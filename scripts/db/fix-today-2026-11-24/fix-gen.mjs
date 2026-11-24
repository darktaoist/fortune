/**
 * scripts/db/_gen/today-generated.json(생성물 사본, gitignore)에 같은 치환을 적용하고 DB 덤프와 대조한다.
 * apply-today.mjs가 이 파일을 그대로 DB에 덮어쓰므로, 고치지 않으면 재적용 때 노출이 되살아난다.
 *   node scripts/db/fix-today-2026-11-24/fix-gen.mjs <today-dump.json> [--write]
 *   - dump가 적용 전이면 "치환 후 파일 == 치환 후 DB(예상)"을, 적용 후면 "파일 == DB"를 대조한다.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RULES, NATION, TODAY_FIELDS } from './rules.mjs'
import { applyRules } from './core.mjs'

const GEN = resolve(dirname(fileURLToPath(import.meta.url)), '../_gen/today-generated.json')
const [dumpPath] = process.argv.slice(2)
const WRITE = process.argv.includes('--write')
const rows = JSON.parse(readFileSync(dumpPath, 'utf8'))
const { updates } = applyRules(rows) // 이미 적용된 덤프면 from이 없어 updates가 비고 rows 그대로가 기대값
const expected = new Map(rows.map((r) => [`${r.number}-${r.nation}`, { ...r, ...(updates.get(`${r.number}-${r.nation}`) || {}) }]))

const genText = readFileSync(GEN, 'utf8')
const pretty = genText.startsWith('{\n') // 원래 서식 유지(현재 파일은 한 줄 JSON)
const gen = JSON.parse(genText)
let direct = 0, already = 0
const fail = []
for (const [number, lang, field, from, to] of RULES) {
  const e = gen[number.slice(2)]?.[NATION[lang]]
  if (!e) { fail.push(`${number}-${lang} 항목 없음`); continue }
  const n = e[field].split(from).length - 1
  if (n === 1) { e[field] = e[field].replace(from, to); direct++ }
  else if (e[field].includes(to)) already++
  else fail.push(`${number}-${lang}.${field} «${from}» ${n}회`)
}
// 대조: 파일 전체(120번호 × 4언어 × 7필드) == 기대 DB
const mismatch = []
for (const [num, v] of Object.entries(gen)) for (const nat of ['k', 'e', 'j', 'c']) {
  const exp = expected.get(`to${num}-${nat}`)
  if (!exp) { mismatch.push(`to${num}-${nat} DB 행 없음`); continue }
  for (const f of TODAY_FIELDS) if ((v[nat]?.[f] ?? '') !== (exp[f] ?? '')) mismatch.push(`to${num}-${nat}.${f}`)
}
if (WRITE && !fail.length) writeFileSync(GEN, (pretty ? JSON.stringify(gen, null, 2) : JSON.stringify(gen)) + (genText.endsWith('\n') ? '\n' : ''))
console.log(JSON.stringify({ entries: Object.keys(gen).length, direct, already, fail, mismatch: mismatch.length, mismatchSample: mismatch.slice(0, 20), write: WRITE && !fail.length }, null, 1))
