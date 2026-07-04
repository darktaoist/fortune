// 연예인 궁합·연예인 MBTI 궁합 무료화(결제벽→로그인벽)의 일일 쿼터 유틸.
// 무료 전환에 따른 무한 API 비용 방어: 계정당 1일 N회(celeb+mbti 합산). KST 기준.
// 소모는 premium-stream의 streamText 직전에 reserve(원자적 예약), 생성 실패 시 refund.
// 자세한 저장소·RPC 정의는 supabase/migrations/0013_celeb_free_usage.sql 참고.

// 무료 서비스 키(라우트/결과 키). 결제 type_key로는 gunghap→celeb, mbti→mbti.
export const FREE_SERVICES = new Set(['gunghap', 'mbti'])
export function isFreeService(service: string): boolean {
  return FREE_SERVICES.has(service)
}

// celeb + mbti 합산 1일 한도 (운영자 확정: 3회, 사람당 ~6원 상한).
export const CELEB_FREE_DAILY_LIMIT = 3

// KST(Asia/Seoul) 날짜 'YYYY-MM-DD'. en-CA 로케일이 ISO 형식을 준다.
export function kstDate(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
}

// 잔여 횟수(읽기 전용). 진입 시 소진 화면 판단·표시용.
// 조회 실패 시 0(소진)으로 보수 처리 — UI가 헛생성을 유도하지 않게 한다.
export async function remainingCelebQuota(admin: any, ownerId: string, date = kstDate()): Promise<number> {
  const { data, error } = await admin.rpc('celeb_quota_remaining', {
    p_owner: ownerId, p_date: date, p_limit: CELEB_FREE_DAILY_LIMIT,
  })
  if (error) return 0
  return Number(data ?? 0)
}

// 원자적 예약(increment). 성공 시 새 count(>=1), 한도 초과 시 -1.
// RPC 오류도 -1(차단) — 비용이 나가는 방향으로는 절대 열지 않는다(안전한 실패).
export async function reserveCelebQuota(admin: any, ownerId: string, date = kstDate()): Promise<number> {
  const { data, error } = await admin.rpc('consume_celeb_quota', {
    p_owner: ownerId, p_date: date, p_limit: CELEB_FREE_DAILY_LIMIT,
  })
  if (error) return -1
  return Number(data ?? -1)
}

// 생성 실패(AI 오류·언어누수로 미저장) 시 예약 롤백. 실패는 조용히 무시(익일 리셋).
// reserve와 반드시 같은 날짜를 넘겨야 자정 경계에서 엉뚱한 날을 환불하지 않는다.
export async function refundCelebQuota(admin: any, ownerId: string, date = kstDate()): Promise<void> {
  try {
    await admin.rpc('refund_celeb_quota', { p_owner: ownerId, p_date: date })
  } catch {
    /* noop */
  }
}
