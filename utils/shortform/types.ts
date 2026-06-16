// 숏폼 영상 생성 공유 타입.
export interface StoryboardInput {
  selfName: string
  partnerName: string
  partnerImageUrl: string | null
  score: number | null // premium.post.ts: result.score (없으면 null)
  oneLiner: string // 한줄평(없으면 빈문자)
  points: string[] // 키포인트 2~3개(섹션에서 추출)
  zodiacGlyph: string // result.glyph || '緣'
  siteUrl: string // 'taoist.co.kr'
}

export interface RenderAssets {
  illustrated: ImageData | null // 일러스트 처리된 연예인 사진
  qrBitmap: ImageBitmap | null // CTA용 QR
  logoBitmap: ImageBitmap | null
}

export interface VideoOpts {
  width: number // 1080
  height: number // 1920
  fps: number // 30
  durationSec: number // 20
}

export const DEFAULT_OPTS: VideoOpts = { width: 1080, height: 1920, fps: 30, durationSec: 20 }
