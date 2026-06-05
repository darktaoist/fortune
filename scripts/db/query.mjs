#!/usr/bin/env node
// Run an ad-hoc read query and print rows. Usage:
//   node scripts/db/query.mjs "select count(*) from public.calenda_data"
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'

const ROOT = resolve(import.meta.dirname, '../..')
const url = readFileSync(resolve(ROOT, '.env'), 'utf8')
  .split('\n').find((l) => l.startsWith('SUPABASE_DATABASE_URL=')).split('=').slice(1).join('=').trim()
const m = url.match(/^postgres(?:ql)?:\/\/(.*)@([^/]+)\/(.+)$/)
const ci = m[1].indexOf(':')
const cfg = {
  user: m[1].slice(0, ci), password: m[1].slice(ci + 1),
  host: m[2].slice(0, m[2].lastIndexOf(':')), port: 5432, database: m[3],
  ssl: { rejectUnauthorized: false },
}
const sql = process.argv[2]
const client = new pg.Client(cfg)
await client.connect()
const res = await client.query(sql)
console.table(res.rows)
await client.end()
