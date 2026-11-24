/**
 * dry-run: today 덤프(행 배열)에 치환을 적용해 변경 예정 목록을 만든다. DB 접속 없음.
 *   node scripts/db/fix-today-2026-11-24/dryrun.mjs <today-dump.json> <out.md>
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { applyRules, scanToday } from './core.mjs'

const [dumpPath, outPath] = process.argv.slice(2)
const rows = JSON.parse(readFileSync(dumpPath, 'utf8'))
const { changes, updates, errors } = applyRules(rows)
const after = rows.map((r) => ({ ...r, ...(updates.get(`${r.number}-${r.nation}`) || {}) }))
const left = scanToday(after)
const L = ['ko', 'en', 'ja', 'zh']
const by = Object.fromEntries(L.map((l) => [l, changes.filter((c) => c.lang === l)]))
const rowsBy = Object.fromEntries(L.map((l) => [l, new Set(by[l].map((c) => c.key)).size]))
const cell = (s) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ')
const md = ['# 오늘의 운세(today) 내부번호 치환 dry-run (2026-11-24)', '',
  `- 대상 테이블: public.today (행 ${rows.length})`,
  `- 치환 ${changes.length}건 · 영향 행 ${updates.size}개 (ko ${rowsBy.ko} / en ${rowsBy.en} / ja ${rowsBy.ja} / zh ${rowsBy.zh})`,
  `- 바뀌는 컬럼: ${[...new Set(changes.map((c) => c.field))].join(', ')}`,
  `- 규칙 오류: ${errors.length}건${errors.length ? '\n  - ' + errors.join('\n  - ') : ''}`,
  `- 적용 후 남은 노출: ${left.length}건`, '']
for (const h of left) md.push(`  - ⚠️ [${h.id} ${h.field}] ${h.sentence}`)
for (const l of L) {
  md.push('', `## ${l} (${by[l].length}건)`, '')
  md.push(l === 'ko' ? '| 레코드 | 필드 | 바뀌기 전 | 바뀐 뒤 |' : '| 레코드 | 필드 | 바뀌기 전 | 바뀐 뒤 | 한국어 역번역(바뀐 뒤) |')
  md.push(l === 'ko' ? '|---|---|---|---|' : '|---|---|---|---|---|')
  for (const c of by[l]) md.push(`| ${c.number}-${l} (nation ${c.key.slice(-1)}) | ${c.field} | ${cell(c.before)} | ${cell(c.after)} |${l === 'ko' ? '' : ` ${cell(c.koBack)} |`}`)
}
writeFileSync(outPath, md.join('\n') + '\n')
console.log(md.slice(0, 7).join('\n'))
for (const h of left) console.log('LEFT', h.id, h.field, h.sentence.slice(0, 100))
if (errors.length) process.exitCode = 1
