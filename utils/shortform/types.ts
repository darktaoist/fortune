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
  score: number | null // 'score' 섹션 본문의 "궁합 지수: NN점"에서 파싱
  oneLiner: string // 총평 하이라이트
  beats: Beat[] // 섹션별 테마 비트(글리프+제목+하이라이트)
  zodiacGlyph: string // result.glyph || '緣'
  siteUrl: string // 'taoist.co.kr'
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

export const DEFAULT_OPTS: VideoOpts = { width: 1080, height: 1920, fps: 30, durationSec: 30 }
