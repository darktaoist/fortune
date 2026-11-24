#!/usr/bin/env -S npx tsx
/**
 * 2026-11-24 today 내부번호 치환 — 라이브 적용(운영자 dry-run 승인 후에만).
 *
 *   npx tsx scripts/db/fix-today-2026-11-24/apply.ts            # 백업 + 계획 출력만(쓰기 없음)
 *   npx tsx scripts/db/fix-today-2026-11-24/apply.ts --apply    # 백업 + 한 트랜잭션 UPDATE
 *
 * - today.id는 언어 간 중복이라 (number, nation)으로 UPDATE한다(apply-today.mjs와 같은 키). 행마다 rowCount=1 확인.
 * - 바뀌는 텍스트 컬럼만. 영향 행 수가 dry-run(EXPECTED_ROWS)과 다르면 ROLLBACK.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'
import { pgConfig, ROOT } from '../../tojung2027/lib'
import { applyRules, scanToday, TODAY_FIELDS } from './core.mjs'

const EXPECTED_ROWS = 32
const EXPECTED_CHANGES = 40
const APPLY = process.argv.includes('--apply')

const db = new pg.Client(pgConfig())
await db.connect()

const { rows } = await db.query(`select * from public.today order by number, nation`)
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const dir = resolve(ROOT, 'scripts/db/_backup')
mkdirSync(dir, { recursive: true })
const bk = resolve(dir, `today-${stamp}.json`)
writeFileSync(bk, JSON.stringify(rows, null, 1))
const q = (s: string | null) => (s == null ? 'null' : `'${s.replace(/'/g, "''")}'`)
writeFileSync(bk.replace(/\.json$/, '.restore.sql'), ['begin;', ...rows.map((r: any) =>
  `update public.today set ${TODAY_FIELDS.map((c) => `${c}=${q(r[c])}`).join(', ')} where number=${q(r.number)} and nation=${q(r.nation)};`), 'commit;'].join('\n') + '\n')
console.log(`backup: ${bk} (${rows.length}행)`)
console.log(`restore: ${bk.replace(/\.json$/, '.restore.sql')}`)
if (rows.length !== 480) throw new Error(`today 행 수 ${rows.length} ≠ 480 — 중단`)

const { changes, updates, errors } = applyRules(rows)
if (errors.length) { console.error(errors); throw new Error('규칙 오류 — 중단') }
if (changes.length !== EXPECTED_CHANGES || updates.size !== EXPECTED_ROWS)
  throw new Error(`계획 ${changes.length}건/${updates.size}행 ≠ dry-run ${EXPECTED_CHANGES}건/${EXPECTED_ROWS}행 — 중단`)
console.log(`plan: ${changes.length}건, ${updates.size}행`)
if (!APPLY) { console.log('(--apply 없음: 쓰기 안 함)'); await db.end(); process.exit(0) }

await db.query('begin')
let affected = 0
try {
  for (const [key, u] of updates) {
    const [number, nation] = [key.slice(0, key.lastIndexOf('-')), key.slice(key.lastIndexOf('-') + 1)]
    const fields = Object.keys(u)
    if (fields.some((f) => !TODAY_FIELDS.includes(f))) throw new Error(`허용 외 컬럼: ${fields}`)
    const sets = fields.map((f, i) => `${f} = $${i + 3}`).join(', ')
    const res = await db.query(`update public.today set ${sets} where number = $1 and nation = $2`, [number, nation, ...fields.map((f) => u[f])])
    if (res.rowCount !== 1) throw new Error(`${key}: rowCount ${res.rowCount} ≠ 1`)
    affected += 1
  }
  if (affected !== EXPECTED_ROWS) throw new Error(`영향 행 ${affected} ≠ ${EXPECTED_ROWS}`)
  await db.query('commit')
  console.log(`COMMIT: ${affected}행`)
} catch (e) {
  await db.query('rollback')
  console.error('ROLLBACK:', (e as Error).message)
  await db.end()
  process.exit(1)
}

const { rows: post } = await db.query(`select * from public.today`)
const left = scanToday(post)
console.log(`today ${post.length}/480행 · 남은 노출 ${left.length}건`)
for (const h of left) console.log('  LEFT', h.id, h.field, h.sentence)
await db.end()
