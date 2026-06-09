import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

/**
 * 회원 탈퇴 — 현재 로그인한 사용자의 auth 계정을 영구 삭제한다.
 * auth.users 삭제 시 owner_id FK(on delete cascade)로 profiles·people·
 * saved_readings·purchases·reviews 등 본인 소유 데이터가 함께 삭제된다.
 * (payments·inquiries는 owner_id set null — 정산/CS 기록 보존)
 *
 * 본인 식별은 세션 쿠키(serverSupabaseUser), 실제 삭제는 service role로 수행.
 * 되돌릴 수 없으므로 클라이언트에서 확인 절차를 거친 뒤 호출한다.
 */
export default defineEventHandler(async (event) => {
  // serverSupabaseUser는 세션이 없으면 예외를 던지므로 401로 정규화한다.
  let user
  try {
    user = await serverSupabaseUser(event)
  } catch {
    user = null
  }
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'not authenticated' })
  }

  const admin = serverSupabaseServiceRole(event)
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { ok: true }
})
