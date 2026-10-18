import { serverSupabaseServiceRole } from '#supabase/server'
import { newyearYearFor } from '~/shared/newyear'

/**
 * 공개 샘플 — "구매하면 이런 결과를 받습니다"를 보여주는 마케팅용 미리보기.
 * 결제 게이트 없음(의도적 공개). 단, 아래 화이트리스트에 등록된 saved_readings id만
 * 노출해 임의 결과가 새어나가지 않도록 한다. saved_readings는 RLS(본인만)라 service role로 읽는다.
 *
 * 샘플 갱신법: 예시 인물(홍길동/John Doe/張三/山田太郎 등)로 결제·열람하면
 * premium-stream이 그 주문의 saved_readings.payload에 섹션까지 저장한다.
 * 그 saved_readings.id 를 아래 맵에 등록만 하면 된다. 요청 언어가 없으면 ko로 폴백.
 *
 */
// service → 언어별 saved_readings.id
const SAMPLE_READINGS: Record<string, Record<string, string>> = {
  lifetime: {
    ko: '5fdd07d8-8436-4167-b586-16d828210f26', // 홍길동
    en: 'f5b77a55-a21e-489c-8024-d1df260dbfc2', // John Doe
    ja: '1e2e2dbd-fa04-4f90-b428-f912dc67b79f', // 山田太郎
    zh: '93aa1de2-328f-4e2b-b70f-6588daa61348', // 張三
  },
  // 2027 정미년판(2026-10-18, server/api/dev/newyear-sample.post.ts로 생성). 2026판 행은 그대로 남아 있다:
  // ko 2b75f5ff-fabe-46a3-a806-842736a22c0b · en 92dba8bd-c076-4a3c-89ea-3763c267597a ·
  // ja ab0e5de3-43c5-482f-a050-0aa5b14a4ad8 · zh d6492cc9-2139-44f3-ae96-1a9223f973b0
  newyear: {
    ko: '028a76a7-0ad9-4a5c-b0f4-da88a6af77b0', // 홍길동
    en: 'dc265eff-2a9c-450a-9387-42f00a164ce3', // John Doe
    ja: '119c9b45-fb8a-433d-b04d-154b9f1c500a', // 山田太郎
    zh: '17e60018-6828-4799-be82-55d5e1f2253d', // 張三
  },
  gunghap: {
    ko: '1fb48306-4790-44f9-9fb3-5cb56624f35a', // 홍길동 × 제니
    en: 'bd7758dc-bdc3-41e6-9d63-8706bd8ba2f1', // John Doe × Rosé
    ja: 'ba4ae747-8b50-4b7d-956c-041cb9a262fe', // 山田太郎 × リサ
    zh: '57c5bdcf-3f57-4bbb-b92c-ee1fcb34e3ec', // 張三 × 金智秀
  },
  mbti: {
    ko: '7a82963a-0cb5-4f6d-af9e-fb5794af6a7c', // 홍길동 × 제니(ISFP)
    en: 'bbb32c37-7fb9-4481-94ea-7cfa1dac2367', // John Doe × Rosé
    ja: 'bdfcbb94-c6eb-453a-ad35-82a3e694aa68', // 山田太郎 × リサ(ESFJ)
    zh: '0f7099f1-64a7-40a0-8ecd-1fa3d2e50683', // 張三 × 金智秀(ESTJ)
  },
}
const FALLBACK_LANG = 'ko'

/**
 * 유료 리포트 미리보기 절단 — 유료 상품만 첫 N섹션을 공개하고 나머지는 제목·글자만 내려준다.
 * 잠금 본문은 응답에 아예 담지 않는다(뷰소스로도 유료 콘텐츠가 새지 않음).
 *
 * ⚠️ gunghap(연예인 궁합)·mbti(연예인 MBTI 궁합)는 무료 확정 상품이라 절대 넣지 말 것.
 *    이 둘은 비로그인 로그인벽에서도 같은 샘플 API를 쓰므로, 여기 추가하면
 *    무료 상품에 유료 게이트가 생긴다.
 */
const PREVIEW_GATED = new Set(['lifetime', 'newyear'])
const PREVIEW_FREE_SECTIONS = 2

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const service = String(q.service || '').toLowerCase()
  const lang = String(q.lang || FALLBACK_LANG).toLowerCase()
  const byLang = SAMPLE_READINGS[service]
  if (!byLang) throw createError({ statusCode: 404, statusMessage: 'no sample for service' })

  const admin = serverSupabaseServiceRole(event)
  const load = async (id?: string) => {
    if (!id) return null
    const { data } = await admin
      .from('saved_readings')
      .select('subject, payload, glyph, tint, created_at')
      .eq('id', id)
      .maybeSingle()
    const sections = (data?.payload as Record<string, any>)?.sections
    return Array.isArray(sections) && sections.length ? data : null // 미생성(0섹션)은 무효 처리
  }

  // 요청 언어 우선, 미생성/누락이면 ko 폴백(예: en 샘플 아직 생성 안 됨 → 한국어로 노출).
  const sr = (await load(byLang[lang])) || (lang !== FALLBACK_LANG ? await load(byLang[FALLBACK_LANG]) : null)
  if (!sr) throw createError({ statusCode: 404, statusMessage: 'sample not generated yet' })

  const p = (sr.payload || {}) as Record<string, any>

  // 미리보기 절단: 유료 상품만 첫 N섹션 공개 + 나머지는 잠금 목록(제목·글자)으로.
  const all: Array<Record<string, any>> = Array.isArray(p.sections) ? p.sections : []
  let sections = all
  let locked: Array<{ key: string; titleKey: string; glyph: string }> = []
  if (PREVIEW_GATED.has(service)) {
    // shorts는 화면에 안 그리는 숏폼용 JSON — 무료 공개분 2칸을 잡아먹지 않게 먼저 제외.
    const visible = all.filter((x) => x?.key !== 'shorts')
    sections = visible.slice(0, PREVIEW_FREE_SECTIONS)
    locked = visible.slice(PREVIEW_FREE_SECTIONS).map((x) => ({
      key: String(x?.key || ''),
      titleKey: String(x?.titleKey || ''),
      glyph: String(x?.glyph || '秘'),
    }))
  }

  // 결과 전용 필드만 공개로 반환.
  return {
    service,
    glyph: sr.glyph || '命',
    tint: sr.tint || 'gold',
    subject: sr.subject || null,
    sections,
    locked,
    score: p.score ?? null,
    myeongsik: p.myeongsik || null,
    partnerMyeongsik: p.partnerMyeongsik || null,
    partnerName: p.partnerName || '',
    partnerMbti: p.partnerMbti || '',
    // 신년운세 판 연도(제목 표기용) — 연도 저장 전 결과는 생성 시각으로 판정
    year: service === 'newyear' ? (p.year ?? newyearYearFor(sr.created_at)) : null,
  }
})
