import { createHash } from 'node:crypto'
import { serverSupabaseServiceRole } from '#supabase/server'
import { buildMyeongsik, type MyeongsikInput } from '../../utils/myeongsik'
import { FORTUNE_TYPES, sectionSchema } from '../../utils/fortune-registry'
import { generateStructured } from '../../utils/claude'

// 프롬프트/형식 변경 시 올려 캐시 무효화.
const PROMPT_VERSION = 'v2'
const LANGS = new Set(['ko', 'en', 'ja', 'zh'])

/**
 * 프리미엄 운세 통합 엔진 — 모든 타입을 레지스트리 설정으로 처리하는 단일 라우트.
 * 흐름: 검증 → 명식 빌드 → 캐시 조회 → (미스 시) Claude 구조화 생성 → 캐시 저장 → 섹션 반환.
 * v1: 결제/인증 게이트 없음(운세보기 → 바로 결과). 추후 이 자리에 게이트 삽입.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const service = String(body?.service || '')
  const type = FORTUNE_TYPES[service]
  if (!type) throw createError({ statusCode: 400, statusMessage: 'unknown service' })
  if (!type.ready) throw createError({ statusCode: 501, statusMessage: `${service}는 아직 준비 중입니다.` })

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
  if (!input.year || !input.month || !input.day) {
    throw createError({ statusCode: 400, statusMessage: 'birth date required' })
  }

  const admin = serverSupabaseServiceRole(event)

  // 1) 명식(본인) — 사용 타입만.
  const myeongsik = type.usesSaju ? await buildMyeongsik(admin, input) : null
  if (type.usesSaju && !myeongsik) {
    throw createError({ statusCode: 422, statusMessage: '해당 생년월일의 명식을 찾을 수 없습니다.' })
  }

  // 2) 상대방 명식(궁합) — v1 미사용(ready=false라 여기 도달 안 함). 자리만 표시.
  let partner = null
  if (type.needsPartner && body?.partner) {
    partner = await buildMyeongsik(admin, body.partner as MyeongsikInput)
  }

  // 3) 캐시 키(이름 제외 — 해석에 무관하므로 재사용 극대화).
  const sig = [
    service, lang, PROMPT_VERSION, useRuntimeConfig().premiumModel,
    `${input.year}-${input.month}-${input.day}-${input.hour ?? 'x'}-${input.calendar}-${input.gender}`,
    partner ? `${partner.pillars.year.join('')}${partner.pillars.day.join('')}` : '',
  ].join('|')
  const hash = createHash('sha256').update(sig).digest('hex')

  const mapSections = (data: Record<string, any>) =>
    type.sections.map((s) => ({ key: s.key, titleKey: s.titleKey, glyph: s.glyph, body: String(data?.[s.key] || '') }))

  // 4) 캐시 조회.
  const { data: cached } = await admin.from('ai_readings').select('sections, score').eq('hash', hash).maybeSingle()
  if (cached?.sections) {
    return { service, glyph: type.glyph, tint: type.tint, sections: mapSections(cached.sections), score: cached.score ?? null, myeongsik, cached: true }
  }

  // 5) 생성.
  const result = await generateStructured<Record<string, any>>({
    system: type.system(lang),
    user: type.buildPrompt({ myeongsik: myeongsik as any, partner, lang }),
    schema: sectionSchema(type),
    maxTokens: type.maxTokens,
  })
  const score = typeof result?.score === 'number' ? result.score : null

  // 6) 캐시 저장(중복 무시).
  await admin.from('ai_readings').insert({ hash, service, lang, sections: result, score }).then(
    () => {}, () => {}, // 충돌/오류 무시(동시 생성 레이스)
  )

  return { service, glyph: type.glyph, tint: type.tint, sections: mapSections(result), score, myeongsik, cached: false }
})
