#!/usr/bin/env node
/**
 * zh(중국어) DB 콘텐츠 간체 → 번체(대만, s2twp) 변환.
 *
 * 배경: 사이트는 zh-TW(번체)로 서비스하는데 DB의 zh 행이 간체로 시딩돼 있어
 *      무료운세 결과가 간체로 노출됐다. 결정적 변환(OpenCC s2twp)으로 일괄 교정한다.
 *
 * 안전장치:
 *  - nation='c' (또는 daily_horoscope는 lang='zh') 행만 건드린다. ko/en/ja 절대 미변경.
 *  - 적용 전 원본 스냅샷을 scripts/db/_backup/zh-s2t-<ts>.json 으로 저장(롤백용).
 *  - 변경된 컬럼만 UPDATE.
 *
 * 사용:
 *   node scripts/db/wf-zh-s2t.mjs            # 드라이런(변경 미적용, 미리보기)
 *   node scripts/db/wf-zh-s2t.mjs --apply    # 백업 후 실제 적용
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'
import * as OpenCC from 'opencc-js'

const ROOT = resolve(import.meta.dirname, '../..')
const APPLY = process.argv.includes('--apply')

// --- DB 접속 (query.mjs 와 동일 로직) ---
const url = readFileSync(resolve(ROOT, '.env'), 'utf8')
  .split('\n').find((l) => l.startsWith('SUPABASE_DATABASE_URL=')).split('=').slice(1).join('=').trim()
const m = url.match(/^postgres(?:ql)?:\/\/(.*)@([^/]+)\/(.+)$/)
const ci = m[1].indexOf(':')
const cfg = {
  user: m[1].slice(0, ci), password: m[1].slice(ci + 1),
  host: m[2].slice(0, m[2].lastIndexOf(':')), port: 5432, database: m[3],
  ssl: { rejectUnauthorized: false },
}

// --- 변환기 (간체 cn → 대만 번체, 글자 단위 tw) ---
// tw: 글자 단위 정자 변환(문맥 기반 모호 글자 처리 포함: 头发→頭髮, 发财→發財).
// twp(어휘 치환)는 연애 맥락 对象→物件 같은 오치환이 있어 운세 산문엔 부적합 → tw 사용.
const s2t = OpenCC.Converter({ from: 'cn', to: 'tw' })

// --- 변환 대상 ---
const TARGETS = [
  { table: 'today',           filter: "nation='c'", cols: ['total', 'money', 'biz', 'job', 'love', 'wish', 'hope'] },
  { table: 'tojung',          filter: "nation='c'", cols: ['total', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] },
  { table: 'month_unse',      filter: "nation='c'", cols: ['total', 'manwoman', 'date_unse', 'kind_unse'] },
  { table: 'today_date_unse', filter: "nation='c'", cols: ['datetotal', 'dateplace', 'datewish'] },
  { table: 'lotto',           filter: "nation='c'", cols: ['unsetotal', 'lottolucky', 'wish'] },
  { table: 'lotto_daily',     filter: "nation='c'", cols: ['phrase'] },
  { table: 'lifeall',         filter: "nation='c'", cols: ['sajuwoon', 'earlyyear', 'middleyear', 'lastyear', 'lovewealth', 'jobhealth'] },
  { table: 'daily_horoscope', filter: "lang='zh'",  cols: ['content', 'lucky_color', 'lucky_dir'] },
]

const client = new pg.Client(cfg)
await client.connect()

const backup = {}
let totalRows = 0, totalCells = 0, totalChanged = 0
const samples = []

for (const { table, filter, cols } of TARGETS) {
  const sel = `select id, ${cols.join(', ')} from ${table} where ${filter} order by id`
  const { rows } = await client.query(sel)
  backup[table] = rows.map((r) => ({ ...r }))   // 원본 스냅샷
  let tblChanged = 0

  for (const row of rows) {
    const sets = []
    const vals = []
    for (const c of cols) {
      const orig = row[c]
      if (orig == null || orig === '') continue
      totalCells++
      const conv = s2t(orig)
      if (conv !== orig) {
        totalChanged++
        tblChanged++
        sets.push(`${c} = $${vals.length + 1}`)
        vals.push(conv)
        if (samples.length < 6) samples.push({ table, id: row.id, col: c, before: orig.slice(0, 40), after: conv.slice(0, 40) })
      }
    }
    if (sets.length && APPLY) {
      vals.push(row.id)
      await client.query(`update ${table} set ${sets.join(', ')} where id = $${vals.length}`, vals)
    }
  }
  totalRows += rows.length
  console.log(`  ${table.padEnd(18)} rows=${String(rows.length).padStart(5)}  changed-cells=${tblChanged}`)
}

if (APPLY) {
  mkdirSync(resolve(ROOT, 'scripts/db/_backup'), { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const path = resolve(ROOT, `scripts/db/_backup/zh-s2t-${ts}.json`)
  writeFileSync(path, JSON.stringify(backup, null, 2))
  console.log(`\n백업 저장: ${path}`)
}

console.log(`\n${APPLY ? '[적용 완료]' : '[드라이런]'} rows=${totalRows} cells=${totalCells} changed=${totalChanged}`)
console.log('\n샘플 변환:')
for (const s of samples) console.log(`  [${s.table}#${s.id}.${s.col}] ${s.before}  →  ${s.after}`)

await client.end()
