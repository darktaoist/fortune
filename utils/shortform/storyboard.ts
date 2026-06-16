import type { StoryboardInput, Beat } from './types'

type Section = { key?: string; glyph?: string; title?: string; body?: string }

// 본문에서 "궁합 지수: NN점" / "NN점" 형태의 점수 파싱(0~100).
export function parseScore(sections: Section[]): number | null {
  const ordered = [...sections].sort((a) => (a.key === 'score' ? -1 : 0)) // score 섹션 우선
  for (const s of ordered) {
    const m = (s.body || '').match(/(\d{1,3})\s*점/)
    if (m) {
      const n = +m[1]
      if (n >= 0 && n <= 100) return n
    }
  }
  return null
}

// 섹션 본문에서 짧고 의미있는 한 문장을 뽑음(점수/지수 노이즈 제외).
export function highlight(body: string | undefined, max = 52): string {
  const sents = (body || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?。！？])\s/)
    .map((s) => s.trim())
    .filter(Boolean)
  const good =
    sents.find((s) => s.length >= 12 && s.length <= max && !/지수|\d+\s*점/.test(s)) ||
    sents.find((s) => s.length >= 10 && !/지수|\d+\s*점/.test(s)) ||
    sents[0] ||
    ''
  return good.length > max ? good.slice(0, max - 1) + '…' : good
}

export interface BuildArgs {
  selfName: string
  partnerName: string
  partnerImageUrl: string | null
  sections: Section[]
  zodiacGlyph: string
  siteUrl?: string
}

export function buildStoryboard(a: BuildArgs): StoryboardInput {
  const scoreSec = a.sections.find((s) => s.key === 'score')
  const beats: Beat[] = a.sections
    .filter((s) => s.key !== 'score')
    .map((s) => ({ glyph: s.glyph || '·', label: s.title || '', text: highlight(s.body) }))
    .filter((b) => b.text)
    .slice(0, 5) // 읽을 시간 확보 위해 최대 5개(각 비트 체류시간 ↑)
  return {
    selfName: a.selfName || '나',
    partnerName: a.partnerName || '상대',
    partnerImageUrl: a.partnerImageUrl,
    score: parseScore(a.sections),
    oneLiner: highlight(scoreSec?.body || a.sections[0]?.body, 56),
    beats,
    zodiacGlyph: a.zodiacGlyph || '緣',
    siteUrl: a.siteUrl || 'taoist.co.kr',
  }
}

// 점수 → 등급(별 개수 1~5)과 verdict 라벨.
export function verdictFor(score: number | null): { stars: number; label: string } {
  if (score == null) return { stars: 0, label: '' }
  if (score >= 90) return { stars: 5, label: '천생연분' }
  if (score >= 78) return { stars: 4, label: '환상의 케미' }
  if (score >= 64) return { stars: 3, label: '좋은 인연' }
  if (score >= 50) return { stars: 2, label: '노력하면 좋은 사이' }
  return { stars: 1, label: '서로 다른 매력' }
}
