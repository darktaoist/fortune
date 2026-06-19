#!/usr/bin/env node
/**
 * og-default.html → public/og-default.png (1200×630) 렌더.
 * 헤드리스 크롬 스크린샷 사용(추가 의존성 없음). 디자인 수정 후 재실행하면 PNG 갱신.
 *   node scripts/seo/render-og.mjs
 */
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../..')
const html = resolve(here, 'og-default.html')
const out = resolve(root, 'public/og-default.png')

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
if (!existsSync(CHROME)) {
  console.error('✗ Chrome not found at', CHROME)
  process.exit(1)
}

// 별도 user-data-dir 로 기존 프로필/세션 간섭 회피
const profile = mkdtempSync(resolve(tmpdir(), 'og-chrome-'))
try {
  execFileSync(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1200,630',
    `--user-data-dir=${profile}`,
    `--screenshot=${out}`,
    `file://${html}`,
  ], { stdio: 'pipe' })
  console.log('✓ wrote', out)
} finally {
  rmSync(profile, { recursive: true, force: true })
}
