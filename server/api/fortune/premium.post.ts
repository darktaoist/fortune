import { serverSupabaseServiceRole } from '#supabase/server'
import { buildMyeongsik, type MyeongsikInput } from '../../utils/myeongsik'
import { FORTUNE_TYPES, sectionSchema } from '../../utils/fortune-registry'
import { generateStructured, resolveProvider } from '../../utils/ai'
import { resolvePartnerInput, resolvePartnerMbti } from '../../utils/partner'
import { requirePaidPurchase } from '../../utils/paywall'

const LANGS = new Set(['ko', 'en', 'ja', 'zh'])

/**
 * 프리미엄 운세 통합 엔진 — 모든 타입을 레지스트리 설정으로 처리하는 단일 라우트.
 * 흐름: 검증 → 결제 게이트 → 명식 빌드 → 구조화 생성 → 섹션 반환.
 * v2: 로그인(401) + paid 구매(402) 게이트 적용. UI는 premium-stream을 쓰지만 보안상 동일 차단.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const service = String(body?.service || '')
  const type = FORTUNE_TYPES[service]
  if (!type) throw createError({ statusCode: 400, statusMessage: 'unknown service' })
  if (!type.ready) throw createError({ statusCode: 501, statusMessage: `${service}는 아직 준비 중입니다.` })

  // ── 결제 게이트: 로그인 + 해당 서비스 paid 구매 필수 ──
  await requirePaidPurchase(event, serverSupabaseServiceRole(event), service, body?.order ? String(body.order) : null)

  // AI 엔진 선택(요청별 provider 우선, 없으면 기본=runtimeConfig.aiProvider=deepseek).
  const provider = resolveProvider(body?.provider)
  const lang = LANGS.has(String(body?.lang)) ? String(body.lang) : 'ko'
  const subj = body?.subject || {}
  const input: MyeongsikInput = {
    year: Number(subj.year), month: Number(subj.month), day: Number(subj.day),
    hour: subj.hour == null || subj.hour === '' ? null : Number(subj.hour),
    minute: subj.minute == null ? 0 : Number(subj.minute),
    calendar: String(subj.calendar || 'solar'),
    gender: subj.gender === 'f' ? 'f' : 'm',
    name: String(subj.name || '').trim(),
  }
  const rawMbti = (subj as any).mbti
  const myMbti = (Array.isArray(rawMbti) ? rawMbti.filter(Boolean).join('') : String(rawMbti || '')).toUpperCase()
  if (type.usesSaju && (!input.year || !input.month || !input.day)) {
    throw createError({ statusCode: 400, statusMessage: 'birth date required' })
  }

  const admin = serverSupabaseServiceRole(event)

  // 1) 명식(본인) — 사주 타입만.
  const myeongsik = type.usesSaju ? await buildMyeongsik(admin, input) : null
  if (type.usesSaju && !myeongsik) {
    throw createError({ statusCode: 422, statusMessage: '해당 생년월일의 명식을 찾을 수 없습니다.' })
  }

  // 2) 상대: 사주 타입(gunghap)은 명식, MBTI 타입은 유형만 조회.
  let partner = null
  let partnerMbti: string | null = null
  if (type.needsPartner && (body?.partner?.id || body?.partner?.mbti)) {
    if (type.usesSaju) {
      const pInput = await resolvePartnerInput(admin, event, body.partner)
      if (!pInput) throw createError({ statusCode: 422, statusMessage: '상대방 정보를 찾을 수 없습니다.' })
      partner = await buildMyeongsik(admin, pInput)
      if (!partner) throw createError({ statusCode: 422, statusMessage: '상대방의 명식을 찾을 수 없습니다.' })
    } else {
      partnerMbti = await resolvePartnerMbti(admin, event, body.partner)
    }
  }
  const partnerName = (body?.partner?.name as string) || ''

  const mapSections = (data: Record<string, any>) =>
    type.sections.map((s) => ({ key: s.key, titleKey: s.titleKey, glyph: s.glyph, body: String(data?.[s.key] || '') }))

  // 생성(캐시 미사용 — 매번 새로 생성).
  const result = await generateStructured<Record<string, any>>({
    system: type.system(lang),
    user: type.buildPrompt({ myeongsik: myeongsik as any, partner, lang, myMbti, partnerMbti, myName: input.name, partnerName }),
    schema: sectionSchema(type),
    maxTokens: type.maxTokens,
  }, provider)
  const score = typeof result?.score === 'number' ? result.score : null

  return { service, glyph: type.glyph, tint: type.tint, sections: mapSections(result), score, myeongsik, cached: false }
})
