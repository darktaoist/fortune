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

// 값이 사실상 비어 있는 쓰레기 제출(name='e', note='e' 류) 판별.
// 한 글자, 또는 같은 문자만 반복('e', 'ee', 'aaa')이면 사람이 쓴 값이 아니다.
const REPEATED_RE = /^(.)\1*$/u
function isJunk(s: string): boolean {
  return [...s].length < 2 || REPEATED_RE.test(s)
}

const ALLOWED_LANGS = new Set(['ko', 'en', 'ja', 'zh'])

// 요청 출처 헤더. x-forwarded-for 는 콤마 목록이라 첫 항목(원 클라이언트)만 쓴다.
function requestMeta(event: any) {
  const fwd = getRequestHeader(event, 'cf-connecting-ip') || getRequestHeader(event, 'x-forwarded-for') || ''
  return {
    ip: fwd.split(',')[0].trim().slice(0, 64) || null,
    user_agent: (getRequestHeader(event, 'user-agent') || '').slice(0, 300) || null,
    referer: (getRequestHeader(event, 'referer') || '').slice(0, 300) || null,
  }
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
  const honeypot = String(body?.website || '').trim()
  if (!name) throw createError({ statusCode: 400, statusMessage: '이름을 입력해 주세요.' })

  // 2) 아래 중 하나라도 걸리면 저장·알림 없이 조용히 드롭한다.
  //    400을 주면 봇이 값을 바꿔가며 재시도하므로 성공처럼 응답한다(tarpit).
  //    - 허니팟: 화면에 안 보이는 website 필드를 채운 건 사람이 아니다
  //    - 인젝션/스크립트 페이로드, 글자 없는 이름
  //    - 쓰레기 값: 이름이 1자이거나 같은 문자 반복
  //    - note 는 선택 입력이라 비어 있는 건 정상. 값이 있을 때만 쓰레기 판정
  //    - lang 이 지원 4개 언어 밖 → 폼을 거치지 않은 직접 호출
  const drop =
    !!honeypot ||
    !/\p{L}/u.test(name) ||
    looksMalicious(name) ||
    (note && looksMalicious(note)) ||
    isJunk(name) ||
    (!!note && isJunk(note)) ||
    !ALLOWED_LANGS.has(lang)
  if (drop) return { ok: true }

  // 3) 통과한 요청만 출처와 함께 저장 — 다음에 또 오면 봇/사람을 바로 판별한다.
  const meta = requestMeta(event)
  const admin = serverSupabaseServiceRole(event)
  const row = { name, note: note || null, lang }
  let { error } = await admin.from('celeb_requests').insert({ ...row, ...meta })
  // 0014 마이그레이션 전이면 메타 컬럼이 없다. 그때만 메타 없이 재시도해
  // 배포 순서 때문에 정상 요청이 유실되지 않게 한다.
  if (error && (error.code === '42703' || error.code === 'PGRST204')) {
    console.warn('[celeb-request] meta columns missing — run migration 0014')
    ;({ error } = await admin.from('celeb_requests').insert(row))
  }
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // 저장 성공 시 봇 알림(알림 실패는 요청 성공에 영향 없음)
  await notifyCelebRequest({ name, note, lang, ip: meta.ip })
  return { ok: true }
})
