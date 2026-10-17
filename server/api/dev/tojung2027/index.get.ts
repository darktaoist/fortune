import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { serverSupabaseServiceRole } from '#supabase/server'

/**
 * 2027 토정비결 생성 현황 — 72코드 × 4언어. DB(draft 포함, service role)와
 * scripts/tojung2027/out/ledger.json(검증 결과)을 합쳐 내려준다. 개발 서버 전용.
 */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404 })

  const { data, error } = await serverSupabaseServiceRole(event)
    .from('tojung_yearly').select('gwae_code, lang, grade, headline, status, prompt_ver')
    .eq('year', 2027).eq('scheme', 'legacy72').order('gwae_code')
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const ledgerPath = resolve(process.cwd(), 'scripts/tojung2027/out/ledger.json')
  const ledger = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, 'utf8')) : { requests: {} }
  const db = new Map((data || []).map((r) => [`${r.lang}-${r.gwae_code}`, r]))

  const rows = []
  for (let i = 1; i <= 72; i++) {
    const code = String(i).padStart(3, '0')
    for (const lang of ['ko', 'en', 'ja', 'zh']) {
      const d = db.get(`${lang}-${code}`)
      const l = ledger.requests[`${lang}-${code}`]
      rows.push({
        code, lang,
        grade: d?.grade ?? null,
        headline: d?.headline ?? null,
        status: d?.status ?? null,
        check: l?.status ?? null,
        errors: l?.errors?.join(' | ') ?? null,
        source: l?.source ?? null,
        submits: l?.submits ?? 0,
      })
    }
  }
  return { rows, spent_usd: ledger.spent_usd ?? null }
})
