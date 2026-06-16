import type { StoryboardInput } from './types'

type Section = { key?: string; title?: string; body?: string }

function firstSentence(body: string | undefined, max: number): string {
  if (!body) return ''
  const t = body.replace(/\s+/g, ' ').trim()
  if (!t) return ''
  const s = t.split(/(?<=[.!?。！？])\s/)[0]
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

// 섹션 배열에서 키포인트(짧은 첫 문장)를 추출. 추가 LLM 호출 없음.
export function extractPoints(sections: Section[], limit = 3): string[] {
  const out: string[] = []
  for (const s of sections) {
    const f = firstSentence(s.body, 44)
    if (f) out.push(f)
    if (out.length >= limit) break
  }
  return out
}

// 한줄평 출처: 'summary'/'총평' 류 우선, 없으면 첫 섹션.
function oneLinerSection(sections: Section[]): Section | undefined {
  return sections.find((s) => /summary|한줄|총평|overview/i.test(`${s.key} ${s.title}`)) || sections[0]
}

export function pickOneLiner(sections: Section[]): string {
  return firstSentence(oneLinerSection(sections)?.body, 60)
}

export interface BuildArgs {
  selfName: string
  partnerName: string
  partnerImageUrl: string | null
  score: number | null
  sections: Section[]
  zodiacGlyph: string
  siteUrl?: string
}

export function buildStoryboard(a: BuildArgs): StoryboardInput {
  const olSrc = oneLinerSection(a.sections)
  const rest = a.sections.filter((s) => s !== olSrc) // 한줄평 출처는 키포인트에서 제외(중복 방지)
  return {
    selfName: a.selfName || '나',
    partnerName: a.partnerName || '?',
    partnerImageUrl: a.partnerImageUrl,
    score: typeof a.score === 'number' ? a.score : null,
    oneLiner: firstSentence(olSrc?.body, 60),
    points: extractPoints(rest),
    zodiacGlyph: a.zodiacGlyph || '緣',
    siteUrl: a.siteUrl || 'taoist.co.kr',
  }
}
