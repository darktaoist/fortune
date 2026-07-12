#!/usr/bin/env node
// 배치 JSON을 today-generated.json에 병합·검증한다. (API 호출 없음 — 세션에서 직접 작성한 내용을 합치는 용도)
// 사용: node scripts/db/merge-today.mjs <batch.json>
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)))
const MAIN = resolve(ROOT, '_gen/today-generated.json')
const COLS = ['total', 'money', 'biz', 'job', 'love', 'wish', 'hope']
const LANGS = ['k', 'e', 'j', 'c']
const LEN = { total: [300, 520], other: [150, 300] } // 한국어 자수 경계(경고용)
// 언어별 최소 길이(비어있거나 성의없이 짧은 번역 탐지). e는 영문이라 자수가 더 큼.
const MINLEN = { k: { total: 300, other: 130 }, e: { total: 480, other: 230 }, j: { total: 240, other: 110 }, c: { total: 200, other: 95 } }
// 간체자 누수 검사용(번체여야 함). 대표적 간체 전용 글자.
const SIMPLIFIED = '说见时关门问对话没经过这么会样单实业务营脑车轮红爱国语点热亲观觉应该现电网络员长开边进远连运动页顺顾预领风飞马鸟鱼龙齐众丰乐书买卖东车专业丽举义乌乐习乡书亲仅从仑仓仪们价众优会伤伟传伞体余佣侠俭'

const batchPath = process.argv[2]
if (!batchPath) { console.error('배치 파일 경로 필요'); process.exit(1) }

const main = JSON.parse(readFileSync(MAIN, 'utf8'))
const batch = JSON.parse(readFileSync(batchPath, 'utf8'))

const warns = []
for (const [num, rec] of Object.entries(batch)) {
  if (rec.num !== num) warns.push(`${num}: num 필드 불일치(${rec.num})`)
  if (!['대길', '길', '평', '주의'].includes(rec.tone)) warns.push(`${num}: tone 이상(${rec.tone})`)
  for (const L of LANGS) {
    if (!rec[L]) { warns.push(`${num}: 언어 ${L} 없음`); continue }
    for (const c of COLS) {
      const v = rec[L][c]
      if (typeof v !== 'string' || !v.trim()) { warns.push(`${num}.${L}.${c}: 비었음`); continue }
      const n = v.length
      if (L === 'k') {
        const [lo, hi] = c === 'total' ? LEN.total : LEN.other
        if (n < lo || n > hi) warns.push(`${num}.k.${c}: ${n}자 (권장 ${lo}~${hi})`)
      }
      const min = MINLEN[L][c === 'total' ? 'total' : 'other']
      if (n < min) warns.push(`${num}.${L}.${c}: ${n}자 (${L} 최소 ${min} 미만 — 번역 부실 의심)`)
      if (L === 'c') {
        const bad = [...v].filter((ch) => SIMPLIFIED.includes(ch))
        if (bad.length) warns.push(`${num}.c.${c}: 간체자 누수 [${[...new Set(bad)].join('')}]`)
      }
    }
  }
  main[num] = rec
}

writeFileSync(MAIN, JSON.stringify(main, null, 0))
const total = Object.keys(main).length
console.log(`병합 완료: 배치 ${Object.keys(batch).length}개 → 저장분 ${total}/120`)
if (warns.length) { console.log('⚠ 경고:'); warns.forEach((w) => console.log('  ' + w)) }
else console.log('검증 OK (경계 내)')
const missing = [...Array(120).keys()].map((n) => String(n).padStart(3, '0')).filter((n) => !main[n])
console.log(`남은 미생성: ${missing.length}개` + (missing.length ? ` → ${missing.join(',')}` : ''))
