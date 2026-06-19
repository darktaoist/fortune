#!/usr/bin/env node
/**
 * 랜딩 SEO 콘텐츠를 4개 locale JSON에 안전 병합한다.
 *   node scripts/seo/merge-landing-content.mjs
 * - landing-content.<lang>.json 을 읽어 i18n/locales/<lang>.json 에 flat 키로 추가.
 * - 기존 키 순서 보존, 신규 키는 말미에 추가, 2-space JSON 으로 재기록.
 * - 4개 언어의 키 집합이 ko 와 동일한지 검증(누락 시 에러).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../..')
const LANGS = ['ko', 'en', 'ja', 'zh']

const koKeys = Object.keys(JSON.parse(readFileSync(resolve(here, 'landing-content.ko.json'), 'utf8')))

let failed = false
for (const lang of LANGS) {
  const addPath = resolve(here, `landing-content.${lang}.json`)
  const localePath = resolve(root, `i18n/locales/${lang}.json`)
  const add = JSON.parse(readFileSync(addPath, 'utf8'))
  const addKeys = Object.keys(add)

  const missing = koKeys.filter((k) => !(k in add))
  const extra = addKeys.filter((k) => !koKeys.includes(k))
  if (missing.length || extra.length) {
    console.error(`✗ ${lang}: key mismatch — missing ${missing.length}, extra ${extra.length}`)
    if (missing.length) console.error('   missing:', missing.slice(0, 8).join(', '), missing.length > 8 ? '…' : '')
    if (extra.length) console.error('   extra:', extra.slice(0, 8).join(', '), extra.length > 8 ? '…' : '')
    failed = true
    continue
  }

  const locale = JSON.parse(readFileSync(localePath, 'utf8'))
  let added = 0
  for (const k of koKeys) {
    if (!(k in locale)) added++
    locale[k] = add[k]
  }
  writeFileSync(localePath, JSON.stringify(locale, null, 2) + '\n', 'utf8')
  console.log(`✓ ${lang}: merged ${koKeys.length} keys (${added} new) → i18n/locales/${lang}.json`)
}

if (failed) {
  console.error('\nMerge aborted with key mismatches. Fix translation files and re-run.')
  process.exit(1)
}
console.log('\nDone.')
