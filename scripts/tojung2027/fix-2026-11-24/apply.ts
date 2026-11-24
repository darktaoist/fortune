#!/usr/bin/env -S npx tsx
/**
 * 2026-11-24 토정비결 내부번호·성별 분류 치환 — 라이브 tojung_yearly 적용(운영자 1회 승인 건).
 *
 *   npx tsx scripts/tojung2027/fix-2026-11-24/apply.ts            # 백업 + 계획 출력만(쓰기 없음)
 *   npx tsx scripts/tojung2027/fix-2026-11-24/apply.ts --apply    # 백업 + 한 트랜잭션 UPDATE
 *
 * - 바꾸는 테이블은 tojung_yearly뿐. monthly는 읽기만(검증용).
 * - id 기준 UPDATE, 바뀌는 텍스트 컬럼만. status·good_months·bad_months·lucky 불변.
 * - 영향 행 수가 dry-run 기대값(EXPECTED_ROWS)과 다르면 ROLLBACK.
 * - upsert/collect/revalidate 사용 안 함.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'
import { pgConfig, ROOT } from '../lib'
import { applyRules, scanLeaks, YEARLY_FIELDS } from './core.mjs'

const EXPECTED_ROWS = 99
const EXPECTED_CHANGES = 119
const APPLY = process.argv.includes('--apply')

const db = new pg.Client(pgConfig())
await db.connect()

// 1) 백업 (288행 전체)
const { rows: yearly } = await db.query(`select * from public.tojung_yearly order by id`)
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const dir = resolve(ROOT, 'scripts/db/_backup')
mkdirSync(dir, { recursive: true })
const bk = resolve(dir, `tojung_yearly-${stamp}.json`)
writeFileSync(bk, JSON.stringify(yearly, null, 1))
const cols = ['headline', 'summary', 'total', 'wealth', 'career', 'love', 'health', 'family', 'caution']
const q = (s: string | null) => (s == null ? 'null' : `'${s.replace(/'/g, "''")}'`)
const restore = ['begin;', ...yearly.map((r: any) =>
  `update public.tojung_yearly set ${cols.map((c) => `${c}=${q(r[c])}`).join(', ')} where id=${r.id};`), 'commit;'].join('\n')
writeFileSync(bk.replace(/\.json$/, '.restore.sql'), restore + '\n')
console.log(`backup: ${bk} (${yearly.length}행)`)
console.log(`restore: ${bk.replace(/\.json$/, '.restore.sql')}`)
if (yearly.length !== 288) throw new Error(`yearly 행 수 ${yearly.length} ≠ 288 — 중단`)

// 2) 치환 계획
const { changes, updates, errors } = applyRules(yearly)
if (errors.length) { console.error(errors); throw new Error('규칙 오류 — 중단') }
if (changes.length !== EXPECTED_CHANGES || updates.size !== EXPECTED_ROWS)
  throw new Error(`계획 ${changes.length}건/${updates.size}행 ≠ dry-run ${EXPECTED_CHANGES}건/${EXPECTED_ROWS}행 — 중단`)
console.log(`plan: ${changes.length}건, ${updates.size}행`)
if (!APPLY) { console.log('(--apply 없음: 쓰기 안 함)'); await db.end(); process.exit(0) }

// 3) 한 트랜잭션 UPDATE
await db.query('begin')
let affected = 0
try {
  for (const [id, u] of updates) {
    const fields = Object.keys(u)
    if (fields.some((f) => !YEARLY_FIELDS.includes(f))) throw new Error(`허용 외 컬럼: ${fields}`)
    const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ')
    const res = await db.query(`update public.tojung_yearly set ${sets} where id = $1`, [id, ...fields.map((f) => u[f])])
    affected += res.rowCount ?? 0
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

// 4) 사후 검증
const { rows: post } = await db.query(`select * from public.tojung_yearly order by id`)
const { rows: monthly } = await db.query(`select * from public.tojung_monthly`)
const pub = post.filter((r: any) => r.status === 'published').length
const frozen = post.every((r: any) => {
  const b = yearly.find((x: any) => x.id === r.id)
  return JSON.stringify([b.status, b.good_months, b.bad_months, b.lucky, b.grade]) === JSON.stringify([r.status, r.good_months, r.bad_months, r.lucky, r.grade])
})
const left = [...scanLeaks(post, YEARLY_FIELDS, 'yearly.'), ...scanLeaks(monthly, ['summary', 'body', 'wealth', 'career', 'love', 'health', 'advice'], 'monthly.')]
console.log(`published ${pub}/288 · 비텍스트 컬럼 불변 ${frozen} · 남은 노출 ${left.length}건`)
for (const h of left) console.log('  LEFT', h.id, h.field, h.s)
await db.end()
