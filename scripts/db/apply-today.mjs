#!/usr/bin/env node
/**
 * 생성물(today-generated.json)을 today 테이블에 적용.
 *  - 먼저 현재 480행 전체를 _backup/today-<ts>.json 으로 백업(개수 480 확인).
 *  - number='toNNN' AND nation∈{k,e,j,c} 로 7컬럼만 UPDATE. id/number/nation/created_at 불변.
 *  - 각 UPDATE rowcount=1 강제(0이면 키 형식 오류 → 즉시 중단).
 *  - --dry: 백업·검증만, 쓰기 안 함.
 *
 * 사용:  node scripts/db/apply-today.mjs --dry
 *        node scripts/db/apply-today.mjs --apply
 */
import pg from 'pg'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const APPLY = process.argv.includes('--apply')
const store = JSON.parse(readFileSync(resolve(ROOT, 'scripts/db/_gen/today-generated.json'), 'utf8'))

const url = readFileSync(resolve(ROOT, '.env'), 'utf8')
  .split('\n').find((l) => l.startsWith('SUPABASE_DATABASE_URL=')).split('=').slice(1).join('=').trim()
const m = url.match(/^postgres(?:ql)?:\/\/(.*)@([^/]+)\/(.+)$/)
const ci = m[1].indexOf(':')
const cfg = { user: m[1].slice(0, ci), password: m[1].slice(ci + 1), host: m[2].slice(0, m[2].lastIndexOf(':')), port: 5432, database: m[3], ssl: { rejectUnauthorized: false } }

const COLS = ['total', 'money', 'biz', 'job', 'love', 'wish', 'hope']
const NATIONS = [['k', 'k'], ['e', 'e'], ['j', 'j'], ['c', 'c']] // storeKey → nation
// 스토어 키: k/e/j/c (생성기가 이미 nation 코드로 저장)

const client = new pg.Client(cfg)
await client.connect()

// ── 1) 백업 ──
const cur = await client.query(`select id, number, nation, ${COLS.join(', ')} from public.today order by nation, number`)
if (cur.rows.length !== 480) { console.error(`❌ 현재 행수 ${cur.rows.length} ≠ 480, 중단`); await client.end(); process.exit(1) }
const stamp = (await client.query('select to_char(now(),\'YYYYMMDD"T"HH24MISS\') as ts')).rows[0].ts
mkdirSync(resolve(ROOT, 'scripts/db/_backup'), { recursive: true })
const bpath = resolve(ROOT, `scripts/db/_backup/today-${stamp}.json`)
writeFileSync(bpath, JSON.stringify(cur.rows, null, 2))
console.log(`백업 480행 → ${bpath}`)

// ── 2) 대상 확인 ──
const nums = Object.keys(store).sort()
if (nums.length !== 120) { console.error(`❌ 생성물 ${nums.length}/120, 중단`); await client.end(); process.exit(1) }

if (!APPLY) {
  console.log(`\n[DRY] 적용 예정: 120번호 × 4언어 = 480 UPDATE. 실제 쓰기는 --apply.`)
  await client.end(); process.exit(0)
}

// ── 3) 적용 (UPDATE, rowcount=1 강제) ──
let ok = 0, bad = []
for (const n of nums) {
  const number = 'to' + n
  for (const [key, nation] of NATIONS) {
    const obj = store[n][key]
    const vals = COLS.map((c) => obj[c])
    const sets = COLS.map((c, i) => `${c}=$${i + 1}`).join(', ')
    const res = await client.query(
      `update public.today set ${sets} where number=$${COLS.length + 1} and nation=$${COLS.length + 2}`,
      [...vals, number, nation],
    )
    if (res.rowCount === 1) ok++
    else bad.push(`${number}/${nation} rowcount=${res.rowCount}`)
  }
}
await client.end()

console.log(`\n적용 완료: ${ok}/480 UPDATE 성공`)
if (bad.length) { console.error(`❌ 비정상 ${bad.length}건:`); bad.slice(0, 20).forEach((b) => console.error('  ', b)); process.exit(2) }
console.log('✅ 480행 전부 rowcount=1')
