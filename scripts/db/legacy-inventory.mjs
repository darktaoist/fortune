#!/usr/bin/env node
// List all public tables in the 1.0 (legacy) DB with row counts + column counts.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'

const ROOT = resolve(import.meta.dirname, '../..')
const env = readFileSync(resolve(ROOT, '.env'), 'utf8')
const getLegacy = () => {
  for (const k of ['LEGACY_DATABASE_URL', 'SUPABASE_DATABASE_URL_ASIS']) {
    const l = env.split('\n').find((x) => x.startsWith(k + '='))
    if (l) return l.slice(k.length + 1).trim()
  }
  throw new Error('legacy URL not in .env')
}
const url = getLegacy()
const m = url.match(/^postgres(?:ql)?:\/\/(.*)@([^/]+)\/(.+)$/)
const ci = m[1].indexOf(':')
const cfg = {
  user: m[1].slice(0, ci), password: m[1].slice(ci + 1),
  host: m[2].slice(0, m[2].lastIndexOf(':')), port: 5432, database: m[3],
  ssl: { rejectUnauthorized: false },
}
const client = new pg.Client(cfg)
await client.connect()

// table list + column counts
const cols = await client.query(`
  select table_name, count(*)::int as columns
  from information_schema.columns
  where table_schema = 'public'
  group by table_name`)
const colMap = Object.fromEntries(cols.rows.map((r) => [r.table_name, r.columns]))

// exact row counts
const tnames = Object.keys(colMap).sort()
const rows = []
for (const t of tnames) {
  const r = await client.query(`select count(*)::int n from public."${t}"`)
  rows.push({ table: t, rows: r.rows[0].n, columns: colMap[t] })
}
rows.sort((a, b) => b.rows - a.rows)
console.table(rows)
console.log(`\n${rows.length} tables, ${rows.reduce((a, r) => a + r.rows, 0)} total rows`)
await client.end()
