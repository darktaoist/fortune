import { serverSupabaseClient } from '#supabase/server'
import { buildMyeongsik } from '../../utils/myeongsik'

/**
 * 만세력 명식 — SajuChart `data` 형식으로 반환. 실제 계산은 server/utils/myeongsik.ts가
 * 담당하며(프리미엄 운세 엔진과 공유), 여기서는 입력 검증 + 위임만 한다.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const year = Number(body?.year)
  const month = Number(body?.month)
  const day = Number(body?.day)
  if (!year || !month || !day) {
    throw createError({ statusCode: 400, statusMessage: 'birth date (year, month, day) required' })
  }
  const client = await serverSupabaseClient(event)
  return await buildMyeongsik(client, {
    year, month, day,
    hour: body?.hour == null || body.hour === '' ? null : Number(body.hour),
    minute: body?.minute == null ? 0 : Number(body.minute),
    calendar: String(body?.calendar || 'solar'),
    gender: body?.gender === 'f' ? 'f' : 'm',
    name: String(body?.name || '').trim(),
  })
})
