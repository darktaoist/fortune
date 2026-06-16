import type { StoryboardInput } from './types'

// 섹션 배열에서 키포인트 2~3개를 짧게 추출(추가 LLM 호출 없음).
export function extractPoints(sections: { title?: string; body?: string }[]): string[] {
  const out: string[] = []
  for (const s of sections) {
    const text = (s.body || '').replace(/\s+/g, ' ').trim()
    if (!text) continue
    const firstSentence = text.split(/(?<=[.!?。！？])\s/)[0]
    out.push(firstSentence.length > 42 ? firstSentence.slice(0, 40) + '…' : firstSentence)
    if (out.length >= 3) break
  }
  return out
}

// 한줄평: 'summary'/'한줄' 류 섹션 우선, 없으면 첫 섹션 첫 문장.
export function pickOneLiner(sections: { key?: string; title?: string; body?: string }[]): string {
  const pref = sections.find((s) => /summary|한줄|총평|overview/i.test(`${s.key} ${s.title}`))
  const src = pref || sections[0]
  if (!src?.body) return ''
  const first = src.body.replace(/\s+/g, ' ').trim().split(/(?<=[.!?。！？])\s/)[0]
  return first.length > 60 ? first.slice(0, 58) + '…' : first
}

export interface BuildArgs {
  selfName: string
  partnerName: string
  partnerImageUrl: string | null
  score: number | null
  sections: { key?: string; title?: string; body?: string }[]
  zodiacGlyph: string
  siteUrl?: string
}

export function buildStoryboard(a: BuildArgs): StoryboardInput {
  return {
    selfName: a.selfName || '나',
    partnerName: a.partnerName || '?',
    partnerImageUrl: a.partnerImageUrl,
    score: typeof a.score === 'number' ? a.score : null,
    oneLiner: pickOneLiner(a.sections),
    points: extractPoints(a.sections),
    zodiacGlyph: a.zodiacGlyph || '緣',
    siteUrl: a.siteUrl || 'taoist.co.kr',
  }
}
