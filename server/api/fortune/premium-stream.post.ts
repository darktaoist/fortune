import { serverSupabaseServiceRole } from '#supabase/server'
import { buildMyeongsik, type MyeongsikInput } from '../../utils/myeongsik'
import { FORTUNE_TYPES } from '../../utils/fortune-registry'
import { streamText, resolveProvider } from '../../utils/ai'
import { resolvePartnerInput, resolvePartnerMbti } from '../../utils/partner'
import { requirePaidPurchase } from '../../utils/paywall'

const LANGS = new Set(['ko', 'en', 'ja', 'zh'])

/**
 * 프리미엄 운세 스트리밍(SSE) — 섹션이 완성되는 대로 push해 점진 렌더.
 * 이벤트: meta(glyph/tint/myeongsik) → section(키별, 완성 즉시) → done. 오류는 error.
 *
 * 결제 게이트(v2):
 *  - 로그인 + 해당 서비스 paid 구매 필수(401/402). body.order로 특정 주문 지정 가능.
 *  - 주문 생성 시 저장된 saved_readings 스냅샷(subject/partner)을 입력보다 우선 사용
 *    → 결제한 대상 그대로 생성(주문 후 입력 바꿔치기 방지).
 *  - 생성 완료 시 결과를 스냅샷 행(payload)에 저장 — 구매 1건 = 생성 1회.
 *    이미 결과가 있으면 AI 재호출 없이 저장본을 그대로 리플레이(cached).
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

  const admin = serverSupabaseServiceRole(event)

  // ── 결제 게이트: 로그인(401) + paid 구매(402) ──
  const { purchase } = await requirePaidPurchase(event, admin, service, body?.order ? String(body.order) : null)

  // 주문 스냅샷(saved_readings) 로드 — 결제 대상 고정 + 생성 결과 저장처.
  let reading: any = null
  if (purchase.reading_id) {
    const { data } = await admin.from('saved_readings').select('*').eq('id', purchase.reading_id).maybeSingle()
    reading = data || null
  }

  const es = createEventStream(event)
  const send = (obj: any) => es.push(JSON.stringify(obj))

  // ── 리플레이: 이미 생성된 결과가 있으면 AI 재호출 없이 그대로 송출 ──
  const savedPayload = reading?.payload
  if (Array.isArray(savedPayload?.sections) && savedPayload.sections.length) {
    ;(async () => {
      try {
        send({
          type: 'meta', service, glyph: reading.glyph || type.glyph, tint: reading.tint || type.tint,
          myeongsik: savedPayload.myeongsik || null,
          partnerName: savedPayload.partnerName || '',
          partnerMyeongsik: savedPayload.partnerMyeongsik || null,
          myMbti: savedPayload.myMbti || '',
          partnerMbti: savedPayload.partnerMbti || '',
        })
        for (const s of savedPayload.sections) send({ type: 'section', ...s })
        send({ type: 'done', cached: true })
      } finally {
        await es.close()
      }
    })()
    return es.send()
  }

  const provider = resolveProvider(body?.provider)
  const lang = LANGS.has(String(body?.lang)) ? String(body.lang) : 'ko'
  // 본인: 주문 스냅샷 subject 우선, 없으면 요청 본문(스냅샷 없던 과거 주문 호환).
  const subj = (reading?.subject && (reading.subject.year || reading.subject.mbti)) ? reading.subject : (body?.subject || {})
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

  const myeongsik = type.usesSaju ? await buildMyeongsik(admin, input) : null
  if (type.usesSaju && !myeongsik) throw createError({ statusCode: 422, statusMessage: '해당 생년월일의 명식을 찾을 수 없습니다.' })

  // 상대: 주문 스냅샷의 partner 우선(payload.partner), 없으면 요청 본문.
  const partnerRef = (savedPayload?.partner && (savedPayload.partner.id || savedPayload.partner.mbti))
    ? savedPayload.partner
    : (body?.partner || null)
  let partner = null
  let partnerMbti: string | null = null
  if (type.needsPartner && (partnerRef?.id || partnerRef?.mbti)) {
    if (type.usesSaju) {
      const pInput = await resolvePartnerInput(admin, event, partnerRef)
      if (!pInput) throw createError({ statusCode: 422, statusMessage: '상대방 정보를 찾을 수 없습니다.' })
      partner = await buildMyeongsik(admin, pInput)
      if (!partner) throw createError({ statusCode: 422, statusMessage: '상대방의 명식을 찾을 수 없습니다.' })
    } else {
      partnerMbti = await resolvePartnerMbti(admin, event, partnerRef)
    }
  }
  const partnerName = (partnerRef?.name as string) || ''

  const secByKey = Object.fromEntries(type.sections.map((s) => [s.key, s]))
  const keyset = new Set(type.sections.map((s) => s.key))

  // ── SSE 스트림 ──
  ;(async () => {
    try {
      send({ type: 'meta', service, glyph: type.glyph, tint: type.tint, myeongsik, partnerName, partnerMyeongsik: partner, myMbti, partnerMbti })

      // 생성: 마커 구분 스트림 → 섹션 완성 즉시 push.
      let buf = ''
      const emitted = new Set<string>()
      const bodies: Record<string, string> = {}
      const sectionsOut: Array<{ key: string; titleKey: string; glyph: string; body: string }> = []
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
          const out = { key, titleKey: s.titleKey, glyph: s.glyph, body: text }
          sectionsOut.push(out)
          send({ type: 'section', ...out })
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
        const out = { key: s.key, titleKey: s.titleKey, glyph: s.glyph, body: bodies[s.key] }
        sectionsOut.push(out)
        send({ type: 'section', ...out })
      }

      // 마커 폴백 — AI가 [[key]] 마커 없이 본문만 반환한 경우(모델 교체/형식 이탈),
      // 빈 화면 대신 전체 본문을 첫 섹션으로 묶어 보여준다(마커 텍스트는 제거).
      if (!sectionsOut.length) {
        const plain = buf.replace(/\[\[\s*[A-Za-z_]+\s*\]\]/g, '').trim()
        if (plain.length > 40) {
          const s0 = type.sections[0]
          const out = { key: s0?.key || 'overview', titleKey: s0?.titleKey || 'premium.section.overview', glyph: s0?.glyph || type.glyph, body: plain }
          sectionsOut.push(out)
          send({ type: 'section', ...out })
        }
      }

      // 생성이 비었으면(섹션 0개) 조용한 완료 대신 에러 — 클라이언트 재시도 버튼 노출.
      // 결과를 저장하지 않으므로 같은 주문으로 재진입 시 재생성된다(돈 내고 못 보는 상황 방지).
      if (!sectionsOut.length) {
        send({ type: 'error', message: 'AI가 결과를 생성하지 못했습니다. 다시 시도해 주세요.' })
        return
      }

      // ── 결과를 주문 스냅샷에 저장(구매 1건 = 생성 1회, 재방문은 리플레이) ──
      if (purchase.reading_id && sectionsOut.length) {
        await admin.from('saved_readings').update({
          subject: (reading?.subject && (reading.subject.year || reading.subject.mbti)) ? reading.subject : (body?.subject || null),
          payload: {
            sections: sectionsOut,
            myeongsik: myeongsik || null,
            partnerMyeongsik: partner || null,
            partnerName: partnerName || '',
            partnerMbti: partnerMbti || '',
            myMbti: myMbti || '',
            partner: partnerRef || null,
            lang,
          },
          glyph: type.glyph,
          tint: type.tint,
        }).eq('id', purchase.reading_id)
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
