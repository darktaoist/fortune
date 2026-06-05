#!/usr/bin/env node
/**
 * Copy 만세력 rows from the 1.0 Supabase (LEGACY_DATABASE_URL) into the 2.0
 * Supabase (SUPABASE_DATABASE_URL). Preserves cd_no, then fixes the sequence.
 *
 *   node scripts/db/copy-calenda.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'

const ROOT = resolve(import.meta.dirname, '../..')
const env = readFileSync(resolve(ROOT, '.env'), 'utf8')
const getVar = (k) => {
  const l = env.split('\n').find((x) => x.startsWith(k + '='))
  if (!l) throw new Error(`${k} not found in .env`)
  return l.slice(k.length + 1).trim()
}
// Legacy 1.0 URL may be under either name.
const getLegacy = () => {
  for (const k of ['LEGACY_DATABASE_URL', 'SUPABASE_DATABASE_URL_ASIS']) {
    const l = env.split('\n').find((x) => x.startsWith(k + '='))
    if (l) return l.slice(k.length + 1).trim()
  }
  throw new Error('LEGACY_DATABASE_URL / SUPABASE_DATABASE_URL_ASIS not found in .env')
}
function cfgFrom(url, port) {
  const m = url.match(/^postgres(?:ql)?:\/\/(.*)@([^/]+)\/(.+)$/)
  const ci = m[1].indexOf(':')
  return {
    user: m[1].slice(0, ci),
    password: m[1].slice(ci + 1),
    host: m[2].slice(0, m[2].lastIndexOf(':')),
    port,
    database: m[3],
    ssl: { rejectUnauthorized: false },
  }
}
async function connect(url, label) {
  for (const port of [5432, 6543]) {
    const c = new pg.Client(cfgFrom(url, port))
    try {
      await c.connect()
      console.log(`✔ connected ${label} (:${port})`)
      return c
    } catch (e) {
      console.log(`  ${label} :${port} failed (${e.message}); trying next`)
      try { await c.end() } catch {}
    }
  }
  throw new Error(`could not connect ${label}`)
}

const TABLE = 'public.calenda_data'
const BATCH = 1000

const legacy = await connect(getLegacy(), 'legacy 1.0')
const target = await connect(getVar('SUPABASE_DATABASE_URL'), 'target 2.0')

const src = await legacy.query(`select * from ${TABLE} order by cd_no`)
const cols = src.fields.map((f) => f.name)
console.log(`source: ${src.rows.length} rows, ${cols.length} cols`)

if (src.rows.length === 0) {
  console.log('nothing to copy')
} else {
  await target.query(`truncate ${TABLE} restart identity`)
  const colList = cols.map((c) => `"${c}"`).join(',')
  for (let i = 0; i < src.rows.length; i += BATCH) {
    const chunk = src.rows.slice(i, i + BATCH)
    const params = []
    const tuples = chunk.map((row, ri) => {
      const ph = cols.map((c, ci) => `$${ri * cols.length + ci + 1}`)
      cols.forEach((c) => params.push(row[c]))
      return `(${ph.join(',')})`
    })
    await target.query(`insert into ${TABLE} (${colList}) values ${tuples.join(',')}`, params)
    process.stdout.write(`\r  inserted ${Math.min(i + BATCH, src.rows.length)}/${src.rows.length}`)
  }
  process.stdout.write('\n')
  await target.query(
    `select setval(pg_get_serial_sequence('${TABLE}','cd_no'), (select max(cd_no) from ${TABLE}))`,
  )
}

const t = await target.query(`select count(*)::int n, min(cd_sy) miny, max(cd_sy) maxy from ${TABLE}`)
console.log(`target now: ${t.rows[0].n} rows, solar years ${t.rows[0].miny}–${t.rows[0].maxy}`)

await legacy.end()
await target.end()
