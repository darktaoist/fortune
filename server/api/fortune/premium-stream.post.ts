import { serverSupabaseServiceRole } from '#supabase/server'
import { buildMyeongsik, type MyeongsikInput } from '../../utils/myeongsik'
import { FORTUNE_TYPES } from '../../utils/fortune-registry'
import { streamText, resolveProvider } from '../../utils/ai'
import { resolvePartnerInput, resolvePartnerMbti } from '../../utils/partner'

const LANGS = new Set(['ko', 'en', 'ja', 'zh'])

/**
 * 프리미엄 운세 스트리밍(SSE) — 섹션이 완성되는 대로 push해 점진 렌더.
 * 이벤트: meta(glyph/tint/myeongsik) → section(키별, 완성 즉시) → done. 오류는 error.
 * 생성 경로는 캐시를 쓰지 않고 매번 새로 생성한다(재방문은 보관함=saved_readings로 조회).
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const service = String(body?.service || '')
  const type = FORTUNE_TYPES[service]
  if (!type) throw createError({ statusCode: 400, statusMessage: 'unknown service' })
  // 아직 콘텐츠 미완성인 운세 → 에러 대신 'notready' 이벤트로 우아하게 안내(곧 공개 패널).
  if (!type.ready) {
    const es = createEventStream(event)
    const send = (obj: any) => es.push(JSON.stringify(obj))
    ;(async () => {
      try {
        send({ type: 'meta', service, glyph: type.glyph, tint: type.tint, myeongsik: null })
        send({ type: 'notready' })
        send({ type: 'done', cached: false })
      } finally {
        await es.close()
      }
    })()
    return es.send()
  }

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
  // MBTI 궁합용 본인 유형(배열 ['I','N','F','P'] 또는 문자열 모두 허용)
  const rawMbti = (subj as any).mbti
  const myMbti = (Array.isArray(rawMbti) ? rawMbti.filter(Boolean).join('') : String(rawMbti || '')).toUpperCase()
  // 사주 타입만 생년월일 필수(MBTI 타입은 유형만 있으면 됨)
  if (type.usesSaju && (!input.year || !input.month || !input.day)) throw createError({ statusCode: 400, statusMessage: 'birth date required' })

  const admin = serverSupabaseServiceRole(event)
  const myeongsik = type.usesSaju ? await buildMyeongsik(admin, input) : null
  if (type.usesSaju && !myeongsik) throw createError({ statusCode: 422, statusMessage: '해당 생년월일의 명식을 찾을 수 없습니다.' })

  // 상대: 사주 타입(gunghap)은 명식, MBTI 타입은 유형만 조회.
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

  const secByKey = Object.fromEntries(type.sections.map((s) => [s.key, s]))
  const keyset = new Set(type.sections.map((s) => s.key))

  // ── SSE 스트림 ──
  const es = createEventStream(event)
  const send = (obj: any) => es.push(JSON.stringify(obj))

  ;(async () => {
    try {
      send({ type: 'meta', service, glyph: type.glyph, tint: type.tint, myeongsik, partnerName, partnerMyeongsik: partner, myMbti, partnerMbti })

      // 생성: 마커 구분 스트림 → 섹션 완성 즉시 push.
      let buf = ''
      const emitted = new Set<string>()
      const bodies: Record<string, string> = {}
      const MARK = /\[\[\s*([A-Za-z_]+)\s*\]\]/g
      const scan = (final: boolean) => {
        const ms = [...buf.matchAll(MARK)]
        for (let i = 0; i < ms.length; i++) {
          const key = ms[i][1].toLowerCase()
          if (!keyset.has(key) || emitted.has(key)) continue
          const start = (ms[i].index || 0) + ms[i][0].length
          const hasNext = i + 1 < ms.length
          if (!hasNext && !final) continue // 다음 마커 전까진 미완성
          const end = hasNext ? (ms[i + 1].index || buf.length) : buf.length
          const text = buf.slice(start, end).trim()
          if (!text) continue // 본문 없는 마커는 emit 안 함(빈 섹션 카드 방지)
          emitted.add(key); bodies[key] = text
          const s = secByKey[key]
          send({ type: 'section', key, titleKey: s.titleKey, glyph: s.glyph, body: text })
        }
      }

      const userPrompt = type.buildPrompt({ myeongsik: myeongsik as any, partner: partner as any, lang, myMbti, partnerMbti, myName: input.name, partnerName })

      await streamText({
        system: (type.systemStream || type.system)(lang),
        user: userPrompt,
        maxTokens: type.maxTokens,
        onText: (delta) => { buf += delta; scan(false) },
      }, provider)
      scan(true)

      // 미방출 섹션 보정 — 본문이 있는 것만 send(빈 섹션 카드 방지).
      for (const s of type.sections) if (!emitted.has(s.key) && (bodies[s.key] || '').trim()) {
        send({ type: 'section', key: s.key, titleKey: s.titleKey, glyph: s.glyph, body: bodies[s.key] })
      }

      send({ type: 'done', cached: false })
    } catch (e: any) {
      send({ type: 'error', message: e?.statusMessage || e?.message || 'AI 생성 오류' })
    } finally {
      await es.close()
    }
  })()

  return es.send()
})
