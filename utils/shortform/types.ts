// 숏폼 영상 생성 공유 타입.
export interface Beat {
  glyph: string // 섹션 한자 글리프(心/性/戀/和/五/婚/言)
  label: string // 로컬라이즈된 섹션 제목(예: 끌림)
  text: string // 짧은 하이라이트 문장
}

export interface StoryboardInput {
  selfName: string
  partnerName: string
  partnerImageUrl: string | null
  score: number | null // shorts.score 우선, 없으면 'score' 섹션 본문 파싱
  oneLiner: string // 점수 없을 때 리빌 헤드라인(폴백)
  hook: string // 훅 문구(AI shorts.hook)
  catchphrase: string // CTA 마무리 카피(AI shorts.catchphrase)
  verdictLabel: string // AI가 준 등급명(없으면 점수기반 verdictFor 사용)
  beats: Beat[] // 테마 비트(글리프+라벨+핵심문장)
  zodiacGlyph: string // result.glyph || '緣'
  siteUrl: string // 'taoist.co.kr'
  lang: string // 'ko' | 'en' | 'ja' | 'zh' — 영상 내 고정 라벨 현지화에 사용
}

// AI가 생성하는 숏폼 전용 구조화 데이터(shorts 섹션 본문 JSON)
export interface ShortsData {
  hook?: string
  score?: number
  verdict?: string
  beats?: { label?: string; text?: string }[]
  catchphrase?: string
}

export interface RenderAssets {
  illustrated: ImageData | null // (미사용) 호환 유지
  qrBitmap: CanvasImageSource | null // CTA용 QR (Image/Canvas)
  logoBitmap: CanvasImageSource | null
}

export interface VideoOpts {
  width: number // 1080
  height: number // 1920
  fps: number // 30
  durationSec: number // 20
}

export const DEFAULT_OPTS: VideoOpts = { width: 1080, height: 1920, fps: 30, durationSec: 42 }
