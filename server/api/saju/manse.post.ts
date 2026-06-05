import { serverSupabaseClient } from '#supabase/server'
import { timePillar, ohaengScore, strongWeak, buildDaeun, parseTermTime, type Pillars, type Term } from '../../utils/manse'

/**
 * 만세력 명식 — calenda_data에서 4기둥(한자 간지)을 읽고, 시주·대운·오행·신강신약을
 * 계산해 SajuChart `data` 형식으로 반환한다. 양/음력 직접 조회(윤달 포함).
 */
const HH = (n: number) => String(n).padStart(2, '0')

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const year = Number(body?.year)
  const month = Number(body?.month)
  const day = Number(body?.day)
  if (!year || !month || !day) {
    throw createError({ statusCode: 400, statusMessage: 'birth date (year, month, day) required' })
  }
  const hour = body?.hour == null || body.hour === '' ? null : Number(body.hour)
  const minute = body?.minute == null ? 0 : Number(body.minute)
  const calendar = String(body?.calendar || 'solar')
  const gender: 'm' | 'f' = body?.gender === 'f' ? 'f' : 'm'
  const name = String(body?.name || '').trim()

  const client = await serverSupabaseClient(event)

  // 1) 명식 row 조회 (양/음력 분기, 윤달).
  let q = client.from('calenda_data')
    .select('cd_sy, cd_sm, cd_sd, cd_ly, cd_lm, cd_ld, cd_hyganjee, cd_hmganjee, cd_hdganjee')
  if (calendar === 'lunar' || calendar === 'lunar-leap') {
    q = q.eq('cd_ly', year).eq('cd_lm', String(month)).eq('cd_ld', String(day)).eq('cd_leap_month', calendar === 'lunar-leap' ? 1 : 0)
  } else {
    q = q.eq('cd_sy', year).eq('cd_sm', String(month)).eq('cd_sd', String(day))
  }
  const { data: row } = await q.limit(1).maybeSingle()
  if (!row || !row.cd_hyganjee || !row.cd_hdganjee) return null

  const sy = Number(String(row.cd_sy)), sm = Number(String(row.cd_sm).trim()), sd = Number(String(row.cd_sd).trim())
  const ly = Number(String(row.cd_ly)), lm = Number(String(row.cd_lm).trim()), ld = Number(String(row.cd_ld).trim())

  const yearP: [string, string] = [row.cd_hyganjee.charAt(0), row.cd_hyganjee.charAt(1)]
  const monthP: [string, string] = [row.cd_hmganjee.charAt(0), row.cd_hmganjee.charAt(1)]
  const dayP: [string, string] = [row.cd_hdganjee.charAt(0), row.cd_hdganjee.charAt(1)]
  const hourP = timePillar(dayP[0], hour)
  const pillars: Pillars = { year: yearP, month: monthP, day: dayP, hour: hourP }

  // 2) 절기(대운용): 출생년 ±1년.
  const { data: termRows } = await client.from('calenda_data')
    .select('cd_kterms, cd_terms_time')
    .in('cd_sy', [sy - 1, sy, sy + 1])
    .not('cd_terms_time', 'is', null)
  const terms: Term[] = (termRows || [])
    .filter((t: any) => t.cd_terms_time)
    .map((t: any) => ({ name: t.cd_kterms, datetime: parseTermTime(String(t.cd_terms_time)) }))

  // 3) 대운 (hour 없으면 정오로 절기거리 계산).
  const birth = new Date(sy, sm - 1, sd, hour ?? 12, minute || 0)
  const currentYear = new Date().getFullYear()
  const daeun = terms.length
    ? buildDaeun({ yearStem: yearP[0], monthPillar: row.cd_hmganjee, gender, birth, terms, birthYear: sy, currentYear })
    : { startAge: 0, startNote: false, currentIndex: -1, sequence: [] }

  // 4) 오행/신강신약.
  const ohaeng = ohaengScore(pillars)
  const sw = strongWeak(pillars, dayP[0])

  // 5) SajuChart `data` 형식.
  const hourLabel = hourP ? `${hourP[1]}시 (${HH(hour as number)}:${HH(minute || 0)})` : ''
  return {
    user: { name: name || '', meta: '', solar: `${sy}.${sm}.${sd}`, lunar: `${ly}.${lm}.${ld}`, hour: hourLabel },
    pillars,
    ohaeng,
    strongWeak: sw,
    daeun,
  }
})
