import { createHash } from 'node:crypto'
import { serverSupabaseServiceRole } from '#supabase/server'
import { buildMyeongsik, type MyeongsikInput } from '../../utils/myeongsik'
import { FORTUNE_TYPES } from '../../utils/fortune-registry'
import { streamText } from '../../utils/claude'

// premium.post.ts와 동일 캐시 키 규칙(같은 결과 공유).
const PROMPT_VERSION = 'v2'
const LANGS = new Set(['ko', 'en', 'ja', 'zh'])

/**
 * 프리미엄 운세 스트리밍(SSE) — 섹션이 완성되는 대로 push해 점진 렌더.
 * 이벤트: meta(glyph/tint/myeongsik) → section(키별, 완성 즉시) → done. 오류는 error.
 * 캐시 히트 시에도 동일 이벤트 형태로 즉시 전송(클라 경로 통일).
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
  if (!input.year || !input.month || !input.day) throw createError({ statusCode: 400, statusMessage: 'birth date required' })

  const admin = serverSupabaseServiceRole(event)
  const myeongsik = type.usesSaju ? await buildMyeongsik(admin, input) : null
  if (type.usesSaju && !myeongsik) throw createError({ statusCode: 422, statusMessage: '해당 생년월일의 명식을 찾을 수 없습니다.' })

  const sig = [
    service, lang, PROMPT_VERSION, useRuntimeConfig().premiumModel,
    `${input.year}-${input.month}-${input.day}-${input.hour ?? 'x'}-${input.calendar}-${input.gender}`, '',
  ].join('|')
  const hash = createHash('sha256').update(sig).digest('hex')

  const secByKey = Object.fromEntries(type.sections.map((s) => [s.key, s]))
  const keyset = new Set(type.sections.map((s) => s.key))

  // ── SSE 스트림 ──
  const es = createEventStream(event)
  const send = (obj: any) => es.push(JSON.stringify(obj))

  ;(async () => {
    try {
      send({ type: 'meta', service, glyph: type.glyph, tint: type.tint, myeongsik })

      // 캐시 히트 → 즉시 섹션 전송.
      const { data: cached } = await admin.from('ai_readings').select('sections').eq('hash', hash).maybeSingle()
      if (cached?.sections) {
        for (const s of type.sections) {
          send({ type: 'section', key: s.key, titleKey: s.titleKey, glyph: s.glyph, body: String(cached.sections[s.key] || '') })
        }
        send({ type: 'done', cached: true })
        await es.close()
        return
      }

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
          if (!text && !final) continue
          emitted.add(key); bodies[key] = text
          const s = secByKey[key]
          send({ type: 'section', key, titleKey: s.titleKey, glyph: s.glyph, body: text })
        }
      }

      const userPrompt = type.buildPrompt({ myeongsik: myeongsik as any, partner: null, lang })

      await streamText({
        system: (type.systemStream || type.system)(lang),
        user: userPrompt,
        maxTokens: type.maxTokens,
        onText: (delta) => { buf += delta; scan(false) },
      })
      scan(true)

      // 미방출 섹션 보정(마커 누락 등) — 빈 본문이라도 자리 채움.
      for (const s of type.sections) if (!emitted.has(s.key)) {
        bodies[s.key] = bodies[s.key] || ''
        send({ type: 'section', key: s.key, titleKey: s.titleKey, glyph: s.glyph, body: bodies[s.key] })
      }

      // 캐시 저장(중복 무시).
      await admin.from('ai_readings').insert({ hash, service, lang, sections: bodies, score: null }).then(() => {}, () => {})
      send({ type: 'done', cached: false })
    } catch (e: any) {
      send({ type: 'error', message: e?.statusMessage || e?.message || 'AI 생성 오류' })
    } finally {
      await es.close()
    }
  })()

  return es.send()
})
