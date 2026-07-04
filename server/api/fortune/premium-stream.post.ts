import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { buildMyeongsik, type MyeongsikInput } from '../../utils/myeongsik'
import { FORTUNE_TYPES } from '../../utils/fortune-registry'
import { streamText, resolveProvider } from '../../utils/ai'
import { resolvePartnerInput, resolvePartnerMbti } from '../../utils/partner'
import { requirePaidPurchase } from '../../utils/paywall'
import { toTraditional } from '../../utils/zh'
import { toPurchaseKey } from '~/shared/premiumService'
import { isFreeService, reserveCelebQuota, refundCelebQuota, kstDate } from '../../utils/celebFree'
import { rateLimit } from '../../utils/ratelimit'

const LANGS = new Set(['ko', 'en', 'ja', 'zh'])

// 한글(U+AC00–D7A3)은 한국어 전용 문자 — 비-ko 결과에 한글이 섞이면 언어 누수로 판정한다.
// 간지 한자(癸未 등)는 공용 한자라 허용. 임계값(8자)으로 우발적 1~2자 오검출을 피한다.
const HANGUL = /[가-힣]/g
const hangulLeak = (text: string, lang: string) =>
  lang !== 'ko' && (String(text).match(HANGUL) || []).length >= 8

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

  // ── 게이트 ──
  // 무료(연예인 궁합 gunghap·연예인 MBTI 궁합 mbti): 결제 대신 로그인 + 일일 쿼터.
  //   body.free = free-order가 만든 saved_readings 스냅샷 id. 본인 소유 + 해당 무료 상품
  //   스냅샷만 통과(타인/타상품 위조 차단). 실제 쿼터 소모는 아래 streamText 직전에 원자적으로
  //   예약 → 비용이 나가는 지점에서만 차단(재조회는 그 앞 리플레이에서 걸려 소모 안 함).
  // 유료(토정비결·평생운세 등): 기존 결제 게이트 그대로 — 절대 건드리지 않는다.
  const freeMode = isFreeService(service) && !!body?.free
  let reading: any = null
  let freeUser: any = null
  if (freeMode) {
    try { freeUser = await serverSupabaseUser(event) } catch { freeUser = null }
    if (!freeUser) throw createError({ statusCode: 401, statusMessage: 'login required' })
    // 비용점(AI) 엔드포인트 rate limit: 생성 실패-재시도 남용(reserve/refund 반복 + 매회 DeepSeek 호출)의 상한.
    rateLimit(event, { key: 'premium-free', limit: 8, windowMs: 60_000 })
    const { data } = await admin.from('saved_readings').select('*').eq('id', String(body.free)).maybeSingle()
    if (!data || data.owner_id !== freeUser.id || data.type_key !== toPurchaseKey(service)) {
      throw createError({ statusCode: 403, statusMessage: 'invalid reading' })
    }
    reading = data
  } else {
    // ── 결제 게이트: 로그인(401) + paid 구매(402) ──
    const { purchase } = await requirePaidPurchase(event, admin, service, body?.order ? String(body.order) : null)
    // 주문 스냅샷(saved_readings) 로드 — 결제 대상 고정 + 생성 결과 저장처.
    if (purchase.reading_id) {
      const { data } = await admin.from('saved_readings').select('*').eq('id', purchase.reading_id).maybeSingle()
      reading = data || null
    }
  }
  // 스냅샷 id — 생성 결과 저장처(유료·무료 공통).
  const readingId: string | null = reading?.id ?? null

  const es = createEventStream(event)
  const send = (obj: any) => es.push(JSON.stringify(obj))

  // ── 리플레이: 이미 생성된 결과가 있으면 AI 재호출 없이 그대로 송출 ──
  // 단, 저장본이 비-ko인데 한글이 섞인(과거 누수) 경우는 리플레이를 건너뛰고 아래에서 재생성한다
  //  → 기존 스테일 행이 다음 조회 때 자동으로 올바른 언어로 재생성·재저장되어 자가치유된다.
  const savedPayload = reading?.payload
  const savedLeak = Array.isArray(savedPayload?.sections)
    && hangulLeak(savedPayload.sections.map((s: any) => s?.body || '').join('\n'), String(savedPayload?.lang || ''))
  if (Array.isArray(savedPayload?.sections) && savedPayload.sections.length && !savedLeak) {
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
        // 저장본이 zh인데 간체로 저장된 과거 행은 리플레이 시 번체로 보정(자가치유).
        const savedLang = String(savedPayload?.lang || '')
        for (const s of savedPayload.sections) send({ type: 'section', ...s, body: toTraditional(String(s?.body || ''), savedLang) })
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
    // 무료 서비스 일일 쿼터: 예약/롤백 추적. 생성 저장 성공(savedOk)만 확정한다.
    let quotaReserved = false
    let savedOk = false
    const quotaDay = kstDate()
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
          const text = toTraditional(buf.slice(start, end).trim(), lang) // zh는 번체 보정
          if (!text) continue // 본문 없는 마커는 emit 안 함(빈 섹션 카드 방지)
          emitted.add(key); bodies[key] = text
          const s = secByKey[key]
          const out = { key, titleKey: s.titleKey, glyph: s.glyph, body: text }
          sectionsOut.push(out)
          send({ type: 'section', ...out })
        }
      }

      const userPrompt = type.buildPrompt({ myeongsik: myeongsik as any, partner: partner as any, lang, myMbti, partnerMbti, myName: input.name, partnerName })

      // ── 비용점 게이트 ── 무료 서비스는 AI 호출 직전에 일일 쿼터를 원자적으로 예약한다.
      //   한도 초과(-1)면 AI를 호출하지 않고 limit 이벤트로 차단(비용 0). 동시요청/중복클릭은
      //   consume_celeb_quota의 행잠금으로 직렬화되어 우회 불가. 생성 실패 시 finally에서 환불.
      if (freeMode) {
        const n = await reserveCelebQuota(admin, freeUser.id, quotaDay)
        if (n < 0) { send({ type: 'limit' }); return }
        quotaReserved = true
      }

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
        const plain = toTraditional(buf.replace(/\[\[\s*[A-Za-z_]+\s*\]\]/g, '').trim(), lang)
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

      // ── 언어 누수 가드 ── 비-ko인데 한글이 섞이면(같은 CJK라 모델이 한국어로 새는 현상),
      // 언어 준수가 강한 Claude로 1회 재생성한 뒤 같은 key로 다시 send(클라가 제자리 교체).
      // 재생성도 실패하면 아래 저장 게이트가 막아 다음 진입 때 다시 시도된다.
      let finalSections = sectionsOut
      if (hangulLeak(finalSections.map((s) => s.body).join('\n'), lang)) {
        try {
          let rbuf = ''
          await streamText({
            system: (type.systemStream || type.system)(lang),
            user: userPrompt,
            maxTokens: type.maxTokens,
            onText: (d) => { rbuf += d },
          }, 'claude')
          const reparsed: typeof sectionsOut = []
          const rms = [...rbuf.matchAll(MARK)]
          const seen = new Set<string>()
          for (let i = 0; i < rms.length; i++) {
            const key = rms[i][1].toLowerCase()
            if (!keyset.has(key) || seen.has(key)) continue
            const start = (rms[i].index || 0) + rms[i][0].length
            const end = i + 1 < rms.length ? (rms[i + 1].index || rbuf.length) : rbuf.length
            const t = toTraditional(rbuf.slice(start, end).trim(), lang)
            if (!t) continue
            seen.add(key)
            const s = secByKey[key]
            reparsed.push({ key, titleKey: s.titleKey, glyph: s.glyph, body: t })
          }
          if (reparsed.length && !hangulLeak(reparsed.map((s) => s.body).join('\n'), lang)) {
            finalSections = reparsed
            for (const out of reparsed) send({ type: 'section', ...out }) // 같은 key → 클라 제자리 교체
          }
        } catch (e: any) {
          console.warn('[premium-stream] 언어 누수 재생성 실패:', e?.statusMessage || e?.message)
        }
      }

      // ── 결과를 주문 스냅샷에 저장(구매 1건 = 생성 1회, 재방문은 리플레이) ──
      // 단, 비-ko인데 한글이 남아있으면 저장하지 않아 리플레이 영구 고착을 막는다(다음 진입 시 재생성).
      const stillLeaking = hangulLeak(finalSections.map((s) => s.body).join('\n'), lang)
      if (readingId && finalSections.length && !stillLeaking) {
        await admin.from('saved_readings').update({
          subject: (reading?.subject && (reading.subject.year || reading.subject.mbti)) ? reading.subject : (body?.subject || null),
          payload: {
            sections: finalSections,
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
        }).eq('id', readingId)
        savedOk = true
      }

      send({ type: 'done', cached: false })
    } catch (e: any) {
      send({ type: 'error', message: e?.statusMessage || e?.message || 'AI 생성 오류' })
    } finally {
      // 생성 실패(미저장) 시 예약 롤백 — 억울한 쿼터 소모 방지. 성공분만 확정.
      if (quotaReserved && !savedOk) await refundCelebQuota(admin, freeUser.id, quotaDay)
      await es.close()
    }
  })()

  return es.send()
})
