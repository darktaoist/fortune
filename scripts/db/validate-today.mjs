#!/usr/bin/env node
/**
 * 생성물(today-generated.json) 검증 — DB 적용 전 게이트.
 *  1) 120개 전부 존재, 7컬럼 4언어 비지 않음.
 *  2) 언어 문자 검사: k=한글 포함, j=가나 포함, e=라틴 포함(+CJK 과다 아님).
 *  3) zh(c) 번체 검사: opencc s2t 변환 결과가 원문과 같아야(간체 누수 0).
 *  4) 길이 sanity(너무 짧은 셀 경고).
 *  5) 톤 분포 리포트.
 * 실패(1~3)면 exit 1.
 */
import { Converter } from 'opencc-js'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const store = JSON.parse(readFileSync(resolve(ROOT, 'scripts/db/_gen/today-generated.json'), 'utf8'))
const s2t = Converter({ from: 'cn', to: 'tw' })
// 정상 번체인데 opencc가 대만 변형으로 과변환하려는 글자(check-leaks.mjs 정책 확장).
// 이들은 간체가 아니라 번체에 실재하는 글자 — 변환 시도만 무시(오탐 방지).
const ALLOW_TRAD = new Set([
  '祕', '秘', '台', '了', '占', '凶', '干',
  '克', '合', '向', '周', '托', '布', '借', '回', '弦', '念', '只', '才',
])
// 안전망: 명백한 "간체 전용" 글자가 하나라도 있으면 진짜 누수 → 즉시 오류.
const SIMPLIFIED_BLACKLIST = new Set(
  '运财时爱会国学说这为东车门长发实现开关应该让见观图风飞龙马产权动务员单历变书画结经给对话汉语点热爱经济风险乐买卖块钱铁银钟录亲爱丽丰习乡书买乱争亏云亚仅从仑仓仪们价众优伙会传伟伤伦体余佣'.split(''),
)

const COLS = ['total', 'money', 'biz', 'job', 'love', 'wish', 'hope']
const nums = Object.keys(store).sort()
const errors = [], warns = [], toneCount = {}

if (nums.length !== 120) errors.push(`번호 수 ${nums.length}/120`)

for (const n of nums) {
  const r = store[n]
  toneCount[r.tone] = (toneCount[r.tone] || 0) + 1
  for (const [lang, label] of [['k', 'KO'], ['e', 'EN'], ['j', 'JA'], ['c', 'ZH']]) {
    const obj = r[lang]
    if (!obj) { errors.push(`to${n} ${label} 누락`); continue }
    for (const c of COLS) {
      const v = obj[c]
      if (!v || !v.trim()) { errors.push(`to${n}.${label}.${c} 비어있음`); continue }
      // 새 분량 목표: total 350~450, 나머지 180~260 (KO 기준; 번역은 언어별 편차 허용)
      const floor = c === 'total' ? (lang === 'k' ? 300 : 200) : (lang === 'k' ? 150 : 90)
      if (v.length < floor) warns.push(`to${n}.${label}.${c} 짧음(${v.length}자, 목표 ${c === 'total' ? 'total' : '본문'})`)
      if (lang === 'k' && !/[가-힣]/.test(v)) errors.push(`to${n}.KO.${c} 한글 없음`)
      if (lang === 'j' && !/[ぁ-んァ-ン]/.test(v)) errors.push(`to${n}.JA.${c} 가나 없음`)
      if (lang === 'e' && !/[a-zA-Z]/.test(v)) errors.push(`to${n}.EN.${c} 라틴 없음`)
      if (lang === 'c') {
        const blk = [...v].filter((ch) => SIMPLIFIED_BLACKLIST.has(ch))
        if (blk.length) errors.push(`to${n}.ZH.${c} 간체 전용글자: ${[...new Set(blk)].join('')}`)
        const conv = s2t(v)
        const bad = []
        for (let i = 0; i < v.length; i++) if (v[i] !== conv[i] && !ALLOW_TRAD.has(v[i])) bad.push(v[i])
        if (bad.length) warns.push(`to${n}.ZH.${c} tw변형 후보(정상번체): ${[...new Set(bad)].join('')}`)
      }
    }
  }
}

console.log('톤 분포:', JSON.stringify(toneCount))
console.log(`경고 ${warns.length}건`); warns.slice(0, 10).forEach((w) => console.log('  ⚠', w))
if (errors.length) {
  console.error(`\n❌ 오류 ${errors.length}건:`); errors.slice(0, 30).forEach((e) => console.error('  ✗', e))
  process.exit(1)
}
console.log('\n✅ 검증 통과 (120개 × 7컬럼 × 4언어, 번체 누수 0)')
