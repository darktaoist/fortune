/**
 * dry-run: 덤프 JSON({yearly, monthly})에 치환을 적용해 변경 예정 목록을 만든다. DB 접속 없음.
 *   node scripts/tojung2027/fix-2026-11-24/dryrun.mjs <dump.json> <out.md>
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { applyRules, scanLeaks, YEARLY_FIELDS } from './core.mjs'

const [dumpPath, outPath] = process.argv.slice(2)
const d = JSON.parse(readFileSync(dumpPath, 'utf8'))
const { changes, updates, errors } = applyRules(d.yearly)

const after = d.yearly.map((r) => ({ ...r, ...(updates.get(r.id) || {}) }))
const leftYearly = scanLeaks(after, YEARLY_FIELDS, 'yearly.')
const leftMonthly = scanLeaks(d.monthly, ['summary', 'body', 'wealth', 'career', 'love', 'health', 'advice'], 'monthly.')

const L = ['ko', 'en', 'ja', 'zh']
const byLang = Object.fromEntries(L.map((l) => [l, changes.filter((c) => c.lang === l)]))
const rowsByLang = Object.fromEntries(L.map((l) => [l, new Set(byLang[l].map((c) => c.id)).size]))
const md = []
md.push('# 토정비결 내부번호·성별 분류 치환 dry-run (2026-11-24)', '')
md.push(`- 대상 테이블: tojung_yearly만 (monthly 변경 0건)`)
md.push(`- 치환 ${changes.length}건 · 영향 행 ${updates.size}개 (ko ${rowsByLang.ko} / en ${rowsByLang.en} / ja ${rowsByLang.ja} / zh ${rowsByLang.zh})`)
md.push(`- 바뀌는 컬럼: ${[...new Set(changes.map((c) => c.field))].join(', ')}`)
md.push(`- 규칙 오류: ${errors.length}건${errors.length ? '\n  - ' + errors.join('\n  - ') : ''}`)
md.push(`- 적용 후 남은 노출(유지 후보 제외): yearly ${leftYearly.length}건, monthly ${leftMonthly.length}건`, '')
for (const h of [...leftYearly, ...leftMonthly]) md.push(`  - ⚠️ [${h.id} ${h.field}] ${h.s}`)
for (const l of L) {
  md.push('', `## ${l} (${byLang[l].length}건)`, '')
  md.push(l === 'ko' ? '| 레코드 | 필드 | 바뀌기 전 | 바뀐 뒤 |' : '| 레코드 | 필드 | 바뀌기 전 | 바뀐 뒤 | 한국어 역번역(바뀐 뒤) |')
  md.push(l === 'ko' ? '|---|---|---|---|' : '|---|---|---|---|---|')
  for (const c of byLang[l]) {
    const cell = (s) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ')
    md.push(`| ${c.code}-${l} (id ${c.id}) | ${c.field} | ${cell(c.before)} | ${cell(c.after)} |${l === 'ko' ? '' : ` ${cell(c.koBack)} |`}`)
  }
}
writeFileSync(outPath, md.join('\n') + '\n')
console.log(md.slice(0, 8).join('\n'))
for (const h of [...leftYearly, ...leftMonthly]) console.log('LEFT', h.id, h.field, h.s.slice(0, 120))
if (errors.length) process.exitCode = 1
