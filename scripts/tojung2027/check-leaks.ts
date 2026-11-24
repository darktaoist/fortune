#!/usr/bin/env -S npx tsx
/**
 * 토정비결 풀이 내부 정보 노출 전수 검사 — 하나라도 있으면 exit 1.
 *
 *   npm run tojung:check                          # 라이브 DB(읽기 전용) + out/ 응답 원본
 *   npx tsx scripts/tojung2027/check-leaks.ts --db
 *   npx tsx scripts/tojung2027/check-leaks.ts --out
 *   npx tsx scripts/tojung2027/check-leaks.ts --file <path.json>   # 덤프({yearly,monthly}) 또는 Result+lang 배열
 *
 * DB는 `begin transaction read only` 안에서 select만 한다(year/scheme 무관 전체 행, draft 포함).
 * 규칙은 leak-check.mjs.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'
import { OUT, pgConfig } from './lib'
import { findLeaks, resultLeaks, MONTHLY_TEXT, YEARLY_TEXT } from './leak-check.mjs'

type Hit = { src: string; id: string; field: string; kind: string; match: string; sentence: string }
const args = process.argv.slice(2)
const fileArg = args.includes('--file') ? args[args.indexOf('--file') + 1] : null
const wantDb = args.includes('--db') || (!fileArg && !args.includes('--out'))
const wantOut = args.includes('--out') || (!fileArg && !args.includes('--db'))

const hits: Hit[] = []
const counts: Record<string, number> = {}

function scanRows(src: string, yearly: any[], monthly: any[]) {
  for (const r of yearly) {
    for (const f of YEARLY_TEXT) for (const h of findLeaks(r[f], r.lang)) hits.push({ src, id: `${r.year ?? ''}-${r.gwae_code}-${r.lang}`, field: `yearly.${f}`, ...h })
  }
  for (const r of monthly) {
    for (const f of MONTHLY_TEXT) for (const h of findLeaks(r[f], r.lang)) hits.push({ src, id: `${r.year ?? ''}-${r.gwae_code}-${r.lang}-m${r.month}`, field: `monthly.${f}`, ...h })
  }
  counts[src] = yearly.length + monthly.length
}

if (wantDb) {
  const db = new pg.Client(pgConfig())
  await db.connect()
  try {
    await db.query('begin transaction read only')
    const y = (await db.query('select * from public.tojung_yearly')).rows
    const m = (await db.query('select * from public.tojung_monthly')).rows
    await db.query('rollback')
    scanRows('db', y, m)
  } finally {
    await db.end()
  }
}

if (wantOut) {
  const files = readdirSync(OUT).filter((f) => /^\d{4}-\d{3}-(ko|en|ja|zh)-[a-z0-9]+\.response\.json$/.test(f))
  for (const f of files) {
    const lang = f.split('-')[2]
    const msg = JSON.parse(readFileSync(resolve(OUT, f), 'utf8'))
    const r = JSON.parse(msg.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join(''))
    for (const h of resultLeaks(r, lang)) hits.push({ src: 'out', id: f, ...h })
  }
  counts.out = files.length
}

if (fileArg) {
  const d = JSON.parse(readFileSync(resolve(fileArg), 'utf8'))
  if (Array.isArray(d)) {
    d.forEach((r: any, i: number) => { for (const h of resultLeaks(r, r.lang)) hits.push({ src: 'file', id: `${r.gwae_code ?? i}-${r.lang}`, ...h }) })
    counts.file = d.length
  } else scanRows('file', d.yearly || [], d.monthly || [])
}

const by: Record<string, number> = {}
for (const h of hits) by[`${h.src}/${h.kind}`] = (by[`${h.src}/${h.kind}`] ?? 0) + 1
console.log(`검사 대상: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
for (const h of hits.slice(0, 200)) console.log(`✗ [${h.src} ${h.id} ${h.field}] (${h.kind}) «${h.match}» ${h.sentence.slice(0, 140)}`)
if (hits.length) {
  console.log(`FAIL: 노출 ${hits.length}건 ${JSON.stringify(by)}`)
  process.exit(1)
}
console.log('PASS: 노출 0건')
