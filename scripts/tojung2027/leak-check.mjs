/**
 * 토정비결 풀이 본문 내부 정보 노출 검사 규칙 (2026-11-24 사고 재발 방지).
 *
 * 본문에 생성용 키가 새어 나온 것을 잡는다:
 *   - number: 내부 풀이 번호(001~072)를 괘·hexagram·卦와 함께 쓴 것, 0으로 채운 세 자리 번호
 *   - gender: 성별 분류를 독자 호칭으로 쓴 것("남성분께는", "as a woman", "女性の方には", "對女性朋友來說")
 *   - key:    템플릿 자리표시자·컬럼명·스킴 이름
 * 자연스러운 성별 언급("여성 지인", "female friend", "女性の知人", "女性朋友或家人")은 호칭 꼴이 아니라서 걸리지 않는다.
 * 번호 없는 "괘/卦"는 허용(운영자 결정 2026-11-24). en의 "hexagram"은 주역 64괘로 읽혀 금지.
 *
 * 사용처: check-leaks.ts(라이브 DB·out/ 전수 검사), generate_batch.ts collect/revalidate/publish.
 */

export const LEAK_PATTERNS = {
  ko: {
    number: /\d{1,3}\s*(번\s*)?괘|괘\s*번호|\d{1,3}\s*번\s*풀이/,
    gender: /(남성|여성|남자|여자)\s*(분|께|에게|으로서|이신|인 당신|인 분|이라면|특유)|(남성|여성)\s+당신/,
  },
  en: {
    number: /hexagram|\bgwae\b|\bNo\.\s*\d|#\d+|Tojeong Bigyeol system/i,
    gender: /\bas an? (wo)?man\b|\bfor (wo)?men\b|\b(a|the) (wo)?man (with|holding|born|reading|under|who)\b|\b(wo)?men (born|under|reading|who draw)\b|often seen in (wo)?men|\bwomen in particular\b/i,
  },
  ja: {
    number: /\d{1,3}\s*(卦|番の卦)|\d{2,3}番(?!目)|卦の番号|第\s*\d+\s*卦/,
    gender: /(お持ちの|受けた|用いる|この卦の|年回りの)(男性|女性)|(男性|女性)(の方)?(には|にとって)|(男性|女性)(であるあなた|のあなた|として|ならでは)|(男性|女性)の方(なら|は)/,
  },
  zh: {
    number: /\d{1,3}\s*卦|第\s*\d+\s*卦|卦號|卦象為\s*\d/,
    gender: /(身為|對於?|若是)(男性|女性)|(男性|女性)(朋友)?(而言|來說|特有)|的(男性|女性)(朋友)?[,，]/,
  },
}
/** 모든 언어 공통: 자리표시자·컬럼명·스킴, 0으로 채운 세 자리 번호. */
export const LEAK_COMMON = {
  key: /\{\{|\}\}|gwae_code|legacy72|good_months|bad_months|prompt_ver/,
  number: /(?<![\d.,:])0\d{2}(?!\d)/,
}
// 자연스러운 성별 언급(유지 대상) 예시 — 위 패턴은 호칭 꼴(접미사)로만 걸리므로 이것들에는 안 걸린다:
//   "여성 지인", "여성 인연", "female friend", "female acquaintances", "女性の知人", "女性とのご縁", "女性朋友或家人", "與女性或親近的人"

const SENT = /[^.。!?！？\n]+(?:[.。!?！？]+(?:["'’”」)]*)|\n|$)/g
export function sentences(t) {
  const ss = (t || '').match(SENT)?.filter((s) => s.trim()) || []
  const out = []
  for (const s of ss) {
    if (out.length && /\bNo\.$/.test(out[out.length - 1].trim())) out[out.length - 1] += s
    else out.push(s)
  }
  return out.map((s) => s.trim())
}

/** 한 텍스트의 노출 문장 목록: [{kind, match, sentence}] */
export function findLeaks(text, lang) {
  const hits = []
  const pats = { ...(LEAK_PATTERNS[lang] || {}) }
  for (const s of sentences(text)) {
    for (const [kind, re] of [...Object.entries(pats), ...Object.entries(LEAK_COMMON)]) {
      const m = s.match(re)
      if (!m) continue
      hits.push({ kind, match: m[0], sentence: s })
      break
    }
  }
  return hits
}

export const YEARLY_TEXT = ['headline', 'summary', 'total', 'wealth', 'career', 'love', 'health', 'family', 'caution']
export const MONTHLY_TEXT = ['summary', 'body', 'wealth', 'career', 'love', 'health', 'advice']

/** 생성 결과(Result 형태: 연간 필드 + months[] + lucky)의 노출 목록. */
export function resultLeaks(r, lang) {
  const hits = []
  for (const f of YEARLY_TEXT) for (const h of findLeaks(r[f], lang)) hits.push({ field: f, ...h })
  for (const m of r.months || []) for (const f of MONTHLY_TEXT) for (const h of findLeaks(m[f], lang)) hits.push({ field: `m${m.month}.${f}`, ...h })
  if (r.lucky) for (const s of [r.lucky.direction, r.lucky.item, ...(r.lucky.colors || [])]) for (const h of findLeaks(s, lang)) hits.push({ field: 'lucky', ...h })
  return hits
}

/** validate 오류 문자열로 변환(collect/revalidate용). */
export function leakErrors(r, lang) {
  return resultLeaks(r, lang).map((h) => `내부정보 노출(${h.kind}) ${h.field}: «${h.match}» ${h.sentence.slice(0, 80)}`)
}
