#!/usr/bin/env node
/**
 * Run a .sql file against the Supabase Postgres using SUPABASE_DATABASE_URL
 * from .env. Used to apply migrations/seeds without psql.
 *
 *   node scripts/db/run-sql.mjs supabase/migrations/0001_init.sql
 *
 * Uses the SESSION pooler (port 5432) for reliable DDL — the transaction
 * pooler (6543) doesn't support all session-level statements.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'

const ROOT = resolve(import.meta.dirname, '../..')

function loadDatabaseUrl() {
  const env = readFileSync(resolve(ROOT, '.env'), 'utf8')
  const line = env.split('\n').find((l) => l.startsWith('SUPABASE_DATABASE_URL='))
  if (!line) throw new Error('SUPABASE_DATABASE_URL not found in .env')
  return line.slice('SUPABASE_DATABASE_URL='.length).trim()
}

// Manual parse (password may contain special chars like '!').
function parse(url) {
  const m = url.match(/^postgres(?:ql)?:\/\/(.*)@([^/]+)\/(.+)$/)
  if (!m) throw new Error('Could not parse SUPABASE_DATABASE_URL')
  const [, userinfo, hostport, database] = m
  const ci = userinfo.indexOf(':')
  const user = userinfo.slice(0, ci)
  const password = userinfo.slice(ci + 1)
  const hi = hostport.lastIndexOf(':')
  const host = hostport.slice(0, hi)
  return { user, password, host, database, port: 5432 } // force session pooler
}

const file = process.argv[2]
if (!file) {
  console.error('usage: node scripts/db/run-sql.mjs <path-to-sql>')
  process.exit(1)
}
const sql = readFileSync(resolve(ROOT, file), 'utf8')
const cfg = parse(loadDatabaseUrl())
console.log(`→ ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database}`)
console.log(`→ applying ${file} (${sql.length} bytes)`)

const client = new pg.Client({ ...cfg, ssl: { rejectUnauthorized: false } })
try {
  await client.connect()
  await client.query(sql)
  console.log('✔ applied successfully')
} catch (err) {
  console.error('x FAILED:', err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
