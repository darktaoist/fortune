import type { H3Event } from 'h3'

/**
 * 간단한 메모리 기반 rate limit — 단일 인스턴스 기본 방어(스팸/남용 차단).
 * 분산/서버리스 다중 인스턴스에서는 완벽하지 않으므로, 본격 운영 시 Redis 등 외부 스토어 권장.
 * key+IP별 슬라이딩 윈도우 카운트. 초과 시 429.
 */
const buckets = new Map<string, number[]>()

export function rateLimit(event: H3Event, opts: { key: string; limit: number; windowMs: number }) {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const k = `${opts.key}:${ip}`
  const now = Date.now()
  const cutoff = now - opts.windowMs
  const hits = (buckets.get(k) || []).filter((t) => t > cutoff)
  if (hits.length >= opts.limit) {
    throw createError({ statusCode: 429, statusMessage: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' })
  }
  hits.push(now)
  buckets.set(k, hits)
  // 메모리 누수 방지 — 키가 과도하게 쌓이면 비운다(저빈도 백스톱).
  if (buckets.size > 10000) buckets.clear()
}
