#!/usr/bin/env node
/**
 * 적용 후 라이브 렌더 검증 — /api/fortune/today 를 4언어로 POST 하여
 * 반환 텍스트가 해당 언어 문자를 포함하는지 확인(단순 DB SELECT 아님).
 * 사용:  node scripts/db/verify-today-render.mjs [https://taoist.co.kr]
 */
const BASE = process.argv[2] || 'https://taoist.co.kr'
// 서로 다른 number 로 매핑되도록 생일 몇 개를 섞어 테스트
const BIRTHS = [
  { year: 1990, month: 3, day: 15, hour: 9, calendar: 'solar' },
  { year: 1985, month: 11, day: 2, hour: 14, calendar: 'solar' },
  { year: 2000, month: 7, day: 21, hour: null, calendar: 'solar' },
]
const LANGS = [['ko', /[가-힣]/, 'Hangul'], ['en', /[a-zA-Z]/, 'Latin'], ['ja', /[ぁ-んァ-ン]/, 'Kana'], ['zh', /[一-鿿]/, 'CJK']]

let fail = 0
for (const [lang, re, label] of LANGS) {
  for (const b of BIRTHS) {
    const res = await fetch(`${BASE}/api/fortune/today`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...b, lang, target: '2026-07-07' }),
    })
    const j = await res.json().catch(() => null)
    const total = j?.fortune?.total || ''
    const num = j?.number || '?'
    const hasHangul = /[가-힣]/.test(total)
    // zh는 CJK 이면 통과, 그 외 언어는 "한자만 있고 자국 문자 없음"이면 실패(=아직 한자)
    let pass
    if (lang === 'zh') pass = re.test(total) && total.length > 10
    else pass = re.test(total) && !(lang !== 'ko' && hasHangul && !re.test(total))
    // ko/en/ja: 해당 문자 포함해야 통과
    if (lang !== 'zh') pass = re.test(total)
    console.log(`${pass ? '✅' : '❌'} ${lang} num=${num} [${label}] ${total.slice(0, 42)}...`)
    if (!pass) fail++
  }
}
console.log(fail ? `\n❌ ${fail}건 실패` : '\n✅ 4언어 렌더 전부 자국 문자 확인')
process.exit(fail ? 1 : 0)
