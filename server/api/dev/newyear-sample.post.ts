import { serverSupabaseServiceRole } from '#supabase/server'
import { buildMyeongsik } from '../../utils/myeongsik'
import { FORTUNE_TYPES } from '../../utils/fortune-registry'
import { deepseekStreamText } from '../../utils/deepseek'
import { loadIljuRef } from '../../utils/iljuRef'
import { toTraditional } from '../../utils/zh'

/**
 * 신년운세 생성(개발 서버 전용) — 공개 샘플 재생성과 참고 해석 전후 비교에 쓴다.
 * premium-stream과 같은 프롬프트·마커 파싱·번체 보정을 쓰되:
 *  - 엔진은 DeepSeek 고정(폴백·언어 누수 재생성으로 Claude를 부르지 않는다). 누수면 실패로 돌려준다.
 *  - mode='sample': from(기존 샘플 saved_readings.id)의 owner·subject·glyph·tint를 복사해 **새 행**을 만든다.
 *    기존 샘플 행은 건드리지 않는다(라이브가 읽는 중). sample.get.ts의 id 교체는 별도 커밋.
 *  - mode='compare': DB에 쓰지 않고 결과만 돌려준다. noRef=true면 참고 해석 없이.
 */
const HANGUL = /[가-힣]/g
const MARK = /\[\[\s*([A-Za-z_]+)\s*\]\]/g

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404 })
  const body = await readBody(event)
  const mode = body?.mode === 'sample' ? 'sample' : 'compare'
  const lang = ['ko', 'en', 'ja', 'zh'].includes(body?.lang) ? body.lang : 'ko'
  const type = FORTUNE_TYPES.newyear
  const admin = serverSupabaseServiceRole(event)
  if (!useRuntimeConfig().deepseekApiKey) throw createError({ statusCode: 500, statusMessage: 'DEEPSEEK_API_KEY 없음' })

  const { data: src } = await admin.from('saved_readings')
    .select('id, owner_id, type_key, tier, subject, glyph, tint').eq('id', String(body?.from || '')).maybeSingle()
  if (!src || src.type_key !== 'newyear') throw createError({ statusCode: 400, statusMessage: 'from: newyear saved_readings id 필요' })
  const subj = src.subject || {}
  const myeongsik = await buildMyeongsik(admin, {
    year: Number(subj.year), month: Number(subj.month), day: Number(subj.day),
    hour: subj.hour == null || subj.hour === '' ? null : Number(subj.hour),
    minute: subj.minute == null ? 0 : Number(subj.minute),
    calendar: String(subj.calendar || 'solar'), gender: subj.gender === 'f' ? 'f' : 'm', name: String(subj.name || '').trim(),
  })
  if (!myeongsik) throw createError({ statusCode: 422, statusMessage: '명식 없음' })

  const iljuRef = body?.noRef ? null : await loadIljuRef(admin, myeongsik, lang)
  const user = type.buildPrompt({ myeongsik, lang, myName: subj.name, iljuRef })
  let buf = ''
  await deepseekStreamText({ system: type.systemStream!(lang), user, maxTokens: type.maxTokens, onText: (d) => { buf += d } })

  const keyset = new Set(type.sections.map((s) => s.key))
  const secByKey = Object.fromEntries(type.sections.map((s) => [s.key, s]))
  const ms = [...buf.matchAll(MARK)]
  const seen = new Set<string>()
  const sections: Array<{ key: string; titleKey: string; glyph: string; body: string }> = []
  for (let i = 0; i < ms.length; i++) {
    const key = ms[i][1].toLowerCase()
    if (!keyset.has(key) || seen.has(key)) continue
    const start = (ms[i].index || 0) + ms[i][0].length
    const end = i + 1 < ms.length ? (ms[i + 1].index || buf.length) : buf.length
    const text = toTraditional(buf.slice(start, end).trim(), lang)
    if (!text) continue
    seen.add(key)
    sections.push({ key, titleKey: secByKey[key].titleKey, glyph: secByKey[key].glyph, body: text })
  }
  const leak = lang !== 'ko' && (sections.map((s) => s.body).join('\n').match(HANGUL) || []).length >= 8
  const missing = type.sections.map((s) => s.key).filter((k) => !seen.has(k))
  const result = { mode, lang, ilju: `${myeongsik.pillars.day[0]}${myeongsik.pillars.day[1]}`, usedRef: !!iljuRef, sections, missing, leak, prompt: user }
  if (mode === 'compare') return result
  if (leak || missing.length) throw createError({ statusCode: 422, statusMessage: `생성 불완전: leak=${leak} missing=${missing.join(',')}` })

  const { data: ins, error } = await admin.from('saved_readings').insert({
    owner_id: src.owner_id, type_key: 'newyear', tier: src.tier, subject: src.subject, glyph: type.glyph, tint: type.tint,
    payload: { sections, myeongsik, partnerMyeongsik: null, partnerName: '', partnerMbti: '', myMbti: '', partner: null, lang },
  }).select('id').single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ...result, id: ins.id, prompt: undefined }
})
