#!/usr/bin/env node
/**
 * i18n 누수 가드 — 빌드 전/CI에서 두 가지 재발성 버그를 자동 탐지한다.
 *
 *  (1) zh.json 간체 누수: zh-TW(번체) 로케일에 간체가 섞여 들어간 경우.
 *  (2) 한국어 누수: 공용 컴포넌트/컴포저블/페이지에 하드코딩된 한글
 *      (모든 사용자 노출 문자열은 t()로 처리되어야 함 — 주석은 허용).
 *
 * 한국어(ko)는 절대 건드리지 않는다 — 이 스크립트는 "검출만" 하고 수정하지 않는다.
 *
 * 사용:  node scripts/i18n/check-leaks.mjs        (누수 있으면 exit 1)
 *        npm run i18n:check
 */
import { Converter } from 'opencc-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const s2t = Converter({ from: 'cn', to: 'tw' })

/**
 * opencc cn→tw 가 "고치려고" 하지만 실제로는 이미 올바른 번체/사주 한자인 글자들.
 * 이 글자들의 변환은 무시한다(오탐 방지). 새 글자가 오탐을 일으키면 여기에 추가.
 *   祕(秘 이체자) 台(臺, 台灣 통용) 了(瞭 과변환) 占(占學·占卜) 凶(凶方) 干(藏干: 사주 한자)
 */
const ALLOW_TRAD = new Set(['祕', '台', '了', '占', '凶', '干'])

// ── (1) zh.json 간체 누수 검사 ───────────────────────────────────────────────
function checkZhSimplified() {
  const file = path.join(ROOT, 'i18n/locales/zh.json')
  const obj = JSON.parse(fs.readFileSync(file, 'utf8'))
  const hits = []
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val !== 'string') continue
    const conv = s2t(val)
    if (conv === val) continue
    const bad = []
    for (let i = 0; i < val.length; i++) {
      if (val[i] !== conv[i] && !ALLOW_TRAD.has(val[i])) bad.push(`${val[i]}→${conv[i]}`)
    }
    if (bad.length) hits.push({ key, chars: [...new Set(bad)].join(' '), val })
  }
  return hits
}

// ── (2) 한국어 누수 검사 (공용 .vue / .ts / .js) ─────────────────────────────
const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/
const SCAN_DIRS = ['components', 'composables', 'pages', 'layouts']

function walk(dir, out = []) {
  const abs = path.join(ROOT, dir)
  if (!fs.existsSync(abs)) return out
  for (const name of fs.readdirSync(abs)) {
    const rel = path.join(dir, name)
    const st = fs.statSync(path.join(ROOT, rel))
    if (st.isDirectory()) walk(rel, out)
    else if (/\.(vue|ts|js)$/.test(name)) out.push(rel)
  }
  return out
}

/**
 * 정상(누수 아님)으로 간주하여 건너뛰는 라인 패턴.
 *  - locale 키 객체값:   { ko: '쥐', en: 'Rat' }  →  ko 전용으로만 렌더됨
 *  - locale 분기/가드:    locale.value === 'ko' ? '…' : …,  isKo,  v-if="isKo"
 *  - 진단 로그:           console.warn('… 한글 …')
 *  - 정규식 문자클래스:    /[가-힣 …]/  (매칭 패턴, 렌더 아님)
 *  - 브랜드/언어 자기표기: 타오운세, 한국어
 */
const SKIP_LINE = [
  /(^|[^A-Za-z0-9_])ko\s*:/, // ko: '…'
  /locale\.value|===\s*['"]ko['"]|['"]ko['"]\s*===|\bisKo\b|locale\s*===/,
  /console\.(log|warn|error|info|debug)/,
  /\[[^\]]*[가-힣]/, // 정규식/문자클래스 내부 한글
  /\w*_RE\b|new RegExp/, // 정규식 정의(매칭용, 렌더 아님)
  /\.replace\(\s*['"][^'"]*[가-힣]/, // .replace('한글검색어', …) — 치환 대상이지 출력 아님
  /타오운세|한국어/,
]

/** 주석을 제거한 뒤 한글이 남는 라인을 반환. (주석·locale가드·데이터맵은 정상이므로 무시) */
function scanKoreanLeak(rel) {
  const lines = fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n')
  const hits = []
  let inBlock = false // /* */
  let inHtml = false // <!-- -->
  lines.forEach((raw, idx) => {
    let s = raw
    // 블록/HTML 주석 상태 처리 + 제거
    if (inBlock) { const e = s.indexOf('*/'); if (e === -1) return; s = s.slice(e + 2); inBlock = false }
    if (inHtml) { const e = s.indexOf('-->'); if (e === -1) return; s = s.slice(e + 3); inHtml = false }
    s = s.replace(/\/\*.*?\*\//g, '').replace(/<!--.*?-->/g, '')
    if (/\/\*/.test(s)) { s = s.slice(0, s.indexOf('/*')); inBlock = true }
    if (/<!--/.test(s)) { s = s.slice(0, s.indexOf('<!--')); inHtml = true }
    // 라인 주석 // (단, https:// 같은 건 제외: 앞이 ':'가 아닐 때만)
    s = s.replace(/(^|[^:])\/\/.*$/, '$1')
    if (!HANGUL.test(s)) return
    if (raw.includes('i18n-ok')) return // 검토 완료된 안전 라인(로케일 fallback·샘플 등)
    if (SKIP_LINE.some((re) => re.test(raw))) return
    hits.push({ line: idx + 1, text: raw.trim().slice(0, 100) })
  })
  return hits
}

// ── 실행 ─────────────────────────────────────────────────────────────────────
let failed = false

const zh = checkZhSimplified()
console.log(`\n[1] zh.json 간체 누수: ${zh.length ? `❌ ${zh.length}건` : '✅ 없음'}`)
for (const h of zh) console.log(`    ${h.key}  [${h.chars}]  "${h.val.slice(0, 40)}"`)
if (zh.length) failed = true

const koFiles = SCAN_DIRS.flatMap((d) => walk(d))
const koHits = []
for (const f of koFiles) { const h = scanKoreanLeak(f); if (h.length) koHits.push({ f, h }) }
const koTotal = koHits.reduce((n, x) => n + x.h.length, 0)
console.log(`\n[2] 한국어 누수 (components/composables/pages/layouts): ${koTotal ? `❌ ${koTotal}건 / ${koHits.length}파일` : '✅ 없음'}`)
for (const { f, h } of koHits) {
  console.log(`    ${f}`)
  for (const x of h) console.log(`      L${x.line}: ${x.text}`)
}
if (koTotal) failed = true

console.log('')
process.exit(failed ? 1 : 0)
