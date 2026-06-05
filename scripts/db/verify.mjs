#!/usr/bin/env node
// Quick verification of the applied schema (tables, RLS, policies, triggers).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'

const ROOT = resolve(import.meta.dirname, '../..')
const url = readFileSync(resolve(ROOT, '.env'), 'utf8')
  .split('\n').find((l) => l.startsWith('SUPABASE_DATABASE_URL=')).split('=').slice(1).join('=').trim()
const m = url.match(/^postgres(?:ql)?:\/\/(.*)@([^/]+)\/(.+)$/)
const ci = m[1].indexOf(':')
const cfg = {
  user: m[1].slice(0, ci),
  password: m[1].slice(ci + 1),
  host: m[2].slice(0, m[2].lastIndexOf(':')),
  port: 5432,
  database: m[3],
  ssl: { rejectUnauthorized: false },
}

const client = new pg.Client(cfg)
await client.connect()

const tables = await client.query(`
  select tablename, rowsecurity
  from pg_tables where schemaname = 'public' order by tablename`)
console.log('\n=== public tables (RLS) ===')
for (const r of tables.rows) console.log(`  ${r.rowsecurity ? '🔒' : '⚠️ '} ${r.tablename}`)

const pol = await client.query(`
  select tablename, count(*)::int n
  from pg_policies where schemaname = 'public' group by tablename order by tablename`)
console.log('\n=== RLS policies per table ===')
for (const r of pol.rows) console.log(`  ${r.tablename}: ${r.n}`)

const trg = await client.query(`
  select tgname from pg_trigger
  where tgrelid = 'auth.users'::regclass and not tgisinternal`)
console.log('\n=== auth.users triggers ===')
for (const r of trg.rows) console.log(`  ${r.tgname}`)

console.log(`\nTotal: ${tables.rows.length} tables, ${pol.rows.reduce((a, r) => a + r.n, 0)} policies`)
await client.end()
