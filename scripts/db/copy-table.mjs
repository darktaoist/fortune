#!/usr/bin/env node
/**
 * Copy one or more tables from the 1.0 (legacy) Supabase to the 2.0 Supabase,
 * preserving primary keys, then reset serial/identity sequences.
 *
 *   node scripts/db/copy-table.mjs languages celebrity_categories celebrities ...
 *
 * Pass tables in PARENT → CHILD order. Targets are truncated in reverse
 * (children first) so re-runs don't hit FK violations.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'

const ROOT = resolve(import.meta.dirname, '../..')
const env = readFileSync(resolve(ROOT, '.env'), 'utf8')
const getVar = (...names) => {
  for (const k of names) {
    const l = env.split('\n').find((x) => x.startsWith(k + '='))
    if (l) return l.slice(k.length + 1).trim()
  }
  throw new Error(`none of ${names.join('/')} found in .env`)
}
function cfgFrom(url, port) {
  const m = url.match(/^postgres(?:ql)?:\/\/(.*)@([^/]+)\/(.+)$/)
  const ci = m[1].indexOf(':')
  return {
    user: m[1].slice(0, ci), password: m[1].slice(ci + 1),
    host: m[2].slice(0, m[2].lastIndexOf(':')), port, database: m[3],
    ssl: { rejectUnauthorized: false },
  }
}
async function connect(url, label) {
  for (const port of [5432, 6543]) {
    const c = new pg.Client(cfgFrom(url, port))
    try { await c.connect(); console.log(`✔ ${label} (:${port})`); return c }
    catch (e) { console.log(`  ${label} :${port} failed (${e.message})`); try { await c.end() } catch {} }
  }
  throw new Error(`could not connect ${label}`)
}

const tables = process.argv.slice(2)
if (!tables.length) { console.error('usage: copy-table.mjs <table>...'); process.exit(1) }

const legacy = await connect(getVar('LEGACY_DATABASE_URL', 'SUPABASE_DATABASE_URL_ASIS'), 'legacy 1.0')
const target = await connect(getVar('SUPABASE_DATABASE_URL'), 'target 2.0')

// Truncate all target tables together (single statement satisfies the FK
// check: every referencing table in this set is truncated at once).
await target.query(`truncate ${tables.map((t) => `public."${t}"`).join(', ')}`)

const BATCH = 1000
for (const t of tables) {
  const src = await legacy.query(`select * from public."${t}"`)
  const cols = src.fields.map((f) => f.name)
  if (src.rows.length) {
    const colList = cols.map((c) => `"${c}"`).join(',')
    for (let i = 0; i < src.rows.length; i += BATCH) {
      const chunk = src.rows.slice(i, i + BATCH)
      const params = []
      const tuples = chunk.map((row, ri) => {
        const ph = cols.map((c, ci) => `$${ri * cols.length + ci + 1}`)
        cols.forEach((c) => params.push(row[c]))
        return `(${ph.join(',')})`
      })
      await target.query(`insert into public."${t}" (${colList}) values ${tuples.join(',')}`, params)
    }
  }
  // reset any serial/identity sequences on this table
  await target.query(`
    do $$
    declare r record; seq text;
    begin
      for r in select column_name from information_schema.columns
               where table_schema='public' and table_name='${t}' loop
        seq := pg_get_serial_sequence('public."${t}"', r.column_name);
        if seq is not null then
          execute format('select setval(%L, coalesce((select max(%I) from public."${t}"),1), true)', seq, r.column_name);
        end if;
      end loop;
    end $$;`)
  const n = await target.query(`select count(*)::int c from public."${t}"`)
  console.log(`  ${t}: ${n.rows[0].c} rows`)
}

await legacy.end()
await target.end()
console.log('done')
