import { serverSupabaseServiceRole } from '#supabase/server'
import { notifyCelebRequest } from '../utils/notify'

// 연예인 등록 요청 접수: celeb_requests 테이블 저장 + 관리자 텔레그램 알림.
// 비로그인도 가능(공개). 서버 service role로 insert(RLS 우회).
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const name = String(body?.name || '').trim().slice(0, 80)
  const note = String(body?.note || '').trim().slice(0, 500)
  const lang = String(body?.lang || '').trim().slice(0, 8)
  if (!name) throw createError({ statusCode: 400, statusMessage: '이름을 입력해 주세요.' })

  const admin = serverSupabaseServiceRole(event)
  const { error } = await admin.from('celeb_requests').insert({
    name,
    note: note || null,
    lang: lang || null,
  })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // 저장 성공 시 봇 알림(알림 실패는 요청 성공에 영향 없음)
  await notifyCelebRequest({ name, note, lang })
  return { ok: true }
})
