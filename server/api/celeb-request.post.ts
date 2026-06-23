import { serverSupabaseServiceRole } from '#supabase/server'
import { notifyCelebRequest } from '../utils/notify'

// 자동 스캐너(SQLi/XSS) 페이로드 시그니처. 저장은 파라미터 바인딩이라 SQLi 자체는
// 무력화되지만, 봇이 공개 폼을 두드려 알림 폭탄·쓰레기 행을 만든다. 검증-전-차단으로
// 저장·알림을 막는다. 실제 이름/그룹명(f(x), 2NE1, (G)I-DLE, O'Brien 등)은 통과시킨다.
const ATTACK_RE: RegExp[] = [
  /\b(select|union|insert|update|delete|drop|sleep|benchmark|waitfor|delay|sysdate|pg_sleep|information_schema|concat)\s*\(/i,
  /\bwaitfor\b[\s\S]*\bdelay\b/i, // waitfor delay '0:0:15'
  /\bunion\b[\s\S]*\bselect\b/i,
  /\bor\b\s+[\d'"(]/i, // OR 2+101-101-1=0, OR '...
  /\bxor\b/i,
  /'\s*=\s*'|"\s*=\s*"/, // '='  "="  타우톨로지
  /--|\/\*|\*\//, // SQL 주석
  /\b0x[0-9a-f]{2,}/i, // 16진 리터럴
  /<\s*\/?\s*script|javascript:|on(error|load|click|mouseover)\s*=/i, // XSS
]
function looksMalicious(s: string): boolean {
  return ATTACK_RE.some((re) => re.test(s))
}

// 연예인 등록 요청 접수: celeb_requests 테이블 저장 + 관리자 텔레그램 알림.
// 비로그인도 가능(공개). 서버 service role로 insert(RLS 우회).
export default defineEventHandler(async (event) => {
  // 1) 자동화 버스트 차단 — IP당 10분에 3회.
  rateLimit(event, { key: 'celeb-request', limit: 3, windowMs: 600_000 })

  const body = await readBody(event)
  const name = String(body?.name || '').trim().slice(0, 80)
  const note = String(body?.note || '').trim().slice(0, 500)
  const lang = String(body?.lang || '').trim().slice(0, 8)
  if (!name) throw createError({ statusCode: 400, statusMessage: '이름을 입력해 주세요.' })

  // 2) 인젝션/스크립트 페이로드 또는 글자 없는 입력은 조용히 드롭(저장·알림 안 함).
  //    공격자에게 차단 사실을 알리지 않도록 성공처럼 응답(tarpit).
  if (!/\p{L}/u.test(name) || looksMalicious(name) || (note && looksMalicious(note))) {
    return { ok: true }
  }

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
