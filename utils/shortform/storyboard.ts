import type { StoryboardInput, Beat, ShortsData } from './types'

type Section = { key?: string; glyph?: string; title?: string; body?: string }

// 본문에서 "궁합 지수: NN점" / "NN점" 형태의 점수 파싱(0~100).
export function parseScore(sections: Section[]): number | null {
  const ordered = [...sections].sort((a) => (a.key === 'score' ? -1 : 0))
  for (const s of ordered) {
    const m = (s.body || '').match(/(\d{1,3})\s*점/)
    if (m) {
      const n = +m[1]
      if (n >= 0 && n <= 100) return n
    }
  }
  return null
}

// 섹션 본문에서 의미있는 1~2문장(점수/지수 노이즈 제외) — shorts 없을 때 폴백용.
export function highlight(body: string | undefined, max = 110): string {
  const sents = (body || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?。！？])\s/)
    .map((s) => s.trim())
    .filter((s) => s && !/지수|\d+\s*점/.test(s))
  if (!sents.length) return ''
  let out = sents[0]
  if (out.length < max - 20 && sents[1]) out += ' ' + sents[1] // 2문장까지 합침
  return out.length > max ? out.slice(0, max - 1) + '…' : out
}

function oneLinerSection(sections: Section[]): Section | undefined {
  return sections.find((s) => /summary|한줄|총평|overview|score/i.test(`${s.key} ${s.title}`)) || sections[0]
}

const GLYPH_POOL = ['心', '性', '戀', '和', '婚']

export interface BuildArgs {
  selfName: string
  partnerName: string
  partnerImageUrl: string | null
  sections: Section[]
  zodiacGlyph: string
  siteUrl?: string
  shorts?: ShortsData | null // AI 숏폼 데이터(있으면 최우선)
  lang?: string // 영상 언어(ko|en|ja|zh) — 고정 라벨 현지화
}

// 이름 미입력 시 폴백(언어별). 영상에 한국어 '나/상대'가 새던 문제 방지.
const NAME_FALLBACK: Record<string, [string, string]> = {
  ko: ['나', '상대'],
  en: ['You', 'Partner'],
  ja: ['あなた', 'お相手'],
  zh: ['你', '對方'],
}

export function buildStoryboard(a: BuildArgs): StoryboardInput {
  const lang = a.lang || 'ko'
  const [selfFb, partnerFb] = NAME_FALLBACK[lang] || NAME_FALLBACK.ko
  const base = {
    selfName: a.selfName || selfFb,
    partnerName: a.partnerName || partnerFb,
    partnerImageUrl: a.partnerImageUrl,
    zodiacGlyph: a.zodiacGlyph || '緣',
    siteUrl: a.siteUrl || 'taoist.co.kr',
    lang,
  }

  // 1순위: AI가 생성한 구조화 shorts
  const s = a.shorts
  if (s && Array.isArray(s.beats) && s.beats.length) {
    const beats: Beat[] = s.beats
      .slice(0, 5)
      .map((b, i) => ({ glyph: GLYPH_POOL[i % GLYPH_POOL.length], label: (b.label || '').trim(), text: (b.text || '').trim() }))
      .filter((b) => b.text)
    return {
      ...base,
      score: typeof s.score === 'number' ? s.score : parseScore(a.sections),
      oneLiner: (s.hook || '').trim(),
      hook: (s.hook || '').trim(),
      catchphrase: (s.catchphrase || '').trim(),
      verdictLabel: (s.verdict || '').trim(),
      beats,
    }
  }

  // 2순위(폴백): 기존 섹션에서 추출(구식 캐시·shorts 누락 시)
  const olSrc = oneLinerSection(a.sections)
  const beats: Beat[] = a.sections
    .filter((sec) => sec.key !== 'score' && sec.key !== 'shorts')
    .map((sec) => ({ glyph: sec.glyph || '·', label: sec.title || '', text: highlight(sec.body) }))
    .filter((b) => b.text)
    .slice(0, 5)
  return {
    ...base,
    score: parseScore(a.sections),
    oneLiner: highlight(olSrc?.body, 56),
    hook: '',
    catchphrase: '',
    verdictLabel: '',
    beats,
  }
}

// 점수 → 등급(별 1~5)과 기본 verdict 라벨(AI verdict 없을 때).
export function verdictFor(score: number | null): { stars: number; label: string } {
  if (score == null) return { stars: 0, label: '' }
  if (score >= 90) return { stars: 5, label: '천생연분' }
  if (score >= 78) return { stars: 4, label: '환상의 케미' }
  if (score >= 64) return { stars: 3, label: '좋은 인연' }
  if (score >= 50) return { stars: 2, label: '노력하면 좋은 사이' }
  return { stars: 1, label: '서로 다른 매력' }
}
