// aura.{lang}.json 의 평면 키들을 i18n/locales/{lang}.json 에 병합한다.
// 기존 키는 보존, aura.* 키만 갱신/추가. 키 순서는 알파벳이 아니라 원본 순서 유지.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const localesDir = resolve(here, '../../i18n/locales')

const langs = ['ko', 'en', 'ja', 'zh']
let total = 0
for (const lang of langs) {
  const src = resolve(here, `aura.${lang}.json`)
  if (!existsSync(src)) {
    console.error(`MISSING ${src} — skip ${lang}`)
    continue
  }
  const auraKeys = JSON.parse(readFileSync(src, 'utf8'))
  const dest = resolve(localesDir, `${lang}.json`)
  const locale = JSON.parse(readFileSync(dest, 'utf8'))

  let added = 0
  let updated = 0
  for (const [k, v] of Object.entries(auraKeys)) {
    if (k in locale) updated++
    else added++
    locale[k] = v
  }
  // 2-space pretty, 마지막 개행 — 기존 파일 스타일과 일치.
  writeFileSync(dest, JSON.stringify(locale, null, 2) + '\n', 'utf8')
  const n = Object.keys(auraKeys).length
  total += n
  console.log(`${lang}: ${n} aura keys merged (added ${added}, updated ${updated}) → ${dest}`)
}
console.log(`done. ${total} total aura keys across ${langs.length} locales.`)
