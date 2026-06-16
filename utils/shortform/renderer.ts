import type { StoryboardInput, RenderAssets, VideoOpts } from './types'
import { seg, easeOutCubic, easeInOutQuad } from './easing'

const GOLD = '#c9a84c'
const GOLD_LT = '#e8c97e'
const BG = '#0a0a0f'

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  sb: StoryboardInput,
  illustratedBitmap: CanvasImageSource | null,
  assets: RenderAssets,
  tSec: number,
  o: VideoOpts,
) {
  const { width: W, height: H } = o
  // 배경
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)
  // 은은한 골드 글로우
  const g = ctx.createRadialGradient(W / 2, H * 0.35, 0, W / 2, H * 0.35, W * 0.9)
  g.addColorStop(0, 'rgba(201,168,76,0.10)')
  g.addColorStop(1, 'rgba(10,10,15,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // 연예인 사진(켄번스: 전 구간 천천히 줌)
  if (illustratedBitmap) {
    const zoom = 1.05 + 0.12 * easeInOutQuad(seg(tSec, 0, o.durationSec))
    const iw = W * zoom
    const ih = iw * 1.25
    ctx.save()
    ctx.globalAlpha = 0.9
    ctx.drawImage(illustratedBitmap, (W - iw) / 2, H * 0.18 - ih * 0.1, iw, ih)
    ctx.restore()
    // 하단 페이드(텍스트 가독성)
    const fade = ctx.createLinearGradient(0, H * 0.45, 0, H)
    fade.addColorStop(0, 'rgba(10,10,15,0)')
    fade.addColorStop(1, 'rgba(10,10,15,0.95)')
    ctx.fillStyle = fade
    ctx.fillRect(0, H * 0.45, W, H * 0.55)
  }

  ctx.textAlign = 'center'

  // 0–7s 훅: "○○ ♥ [연예인]" + "우리 궁합은…?"
  if (tSec < 7) {
    const a = easeOutCubic(seg(tSec, 0, 1.2))
    ctx.globalAlpha = tSec < 6.5 ? 1 : 1 - seg(tSec, 6.5, 7)
    ctx.fillStyle = '#fff'
    ctx.font = `700 ${Math.round(W * 0.075)}px 'Noto Sans KR', sans-serif`
    ctx.fillText(`${sb.selfName}  ♥  ${sb.partnerName}`, W / 2, H * 0.62 + (1 - a) * 40)
    if (tSec < 3.2) {
      ctx.fillStyle = GOLD_LT
      ctx.font = `400 ${Math.round(W * 0.05)}px 'Noto Sans KR', sans-serif`
      ctx.fillText('우리 궁합은…?', W / 2, H * 0.7)
    }
    ctx.globalAlpha = 1
  }

  // 3–16s 리빌: 점수(있으면) 또는 한줄평
  if (tSec >= 3 && tSec < 16) {
    const a = easeOutCubic(seg(tSec, 3, 4))
    if (sb.score != null) {
      ctx.fillStyle = GOLD_LT
      ctx.font = `700 ${Math.round(W * 0.06)}px 'Noto Sans KR', sans-serif`
      ctx.fillText('궁합 점수', W / 2, H * 0.42)
      ctx.fillStyle = GOLD
      ctx.font = `900 ${Math.round(W * 0.22 * (0.6 + 0.4 * a))}px 'Noto Sans KR', sans-serif`
      ctx.fillText(`${Math.round(sb.score * a)}`, W / 2, H * 0.56)
    } else if (sb.oneLiner) {
      ctx.fillStyle = '#fff'
      ctx.font = `700 ${Math.round(W * 0.06)}px 'Noto Sans KR', sans-serif`
      wrapText(ctx, sb.oneLiner, W / 2, H * 0.52, W * 0.82, W * 0.08)
    }
  }

  // 7–16.5s 요약: 한줄평(점수 있던 경우) + 키포인트
  if (tSec >= 7 && tSec < 16.5) {
    if (sb.score != null && sb.oneLiner) {
      ctx.globalAlpha = easeOutCubic(seg(tSec, 7, 8))
      ctx.fillStyle = GOLD_LT
      ctx.font = `600 ${Math.round(W * 0.046)}px 'Noto Sans KR', sans-serif`
      wrapText(ctx, sb.oneLiner, W / 2, H * 0.66, W * 0.82, W * 0.062)
      ctx.globalAlpha = 1
    }
    const baseY = sb.score != null ? H * 0.76 : H * 0.62
    sb.points.forEach((p, i) => {
      const start = 8 + i * 1.6
      const a = easeOutCubic(seg(tSec, start, start + 0.8))
      if (a <= 0) return
      ctx.globalAlpha = a
      ctx.fillStyle = '#e8e4dc'
      ctx.font = `500 ${Math.round(W * 0.04)}px 'Noto Sans KR', sans-serif`
      ctx.fillText('• ' + p, W / 2, baseY + i * H * 0.05 + (1 - a) * 20)
      ctx.globalAlpha = 1
    })
  }

  // 16–20s CTA
  if (tSec >= 15.5) {
    const a = easeOutCubic(seg(tSec, 15.5, 16.5))
    ctx.globalAlpha = a
    ctx.fillStyle = GOLD
    ctx.font = `900 ${Math.round(W * 0.16)}px serif`
    ctx.fillText(sb.zodiacGlyph, W / 2, H * 0.46)
    ctx.fillStyle = '#fff'
    ctx.font = `700 ${Math.round(W * 0.058)}px 'Noto Sans KR', sans-serif`
    ctx.fillText('내 궁합도 확인해보세요', W / 2, H * 0.58)
    ctx.fillStyle = GOLD_LT
    ctx.font = `700 ${Math.round(W * 0.06)}px 'Noto Sans KR', sans-serif`
    ctx.fillText(sb.siteUrl, W / 2, H * 0.66)
    if (assets.qrBitmap) {
      const q = W * 0.22
      ctx.drawImage(assets.qrBitmap, (W - q) / 2, H * 0.72, q, q)
    }
    ctx.globalAlpha = 1
  }

  // 워터마크(상시): 로고/URL 하단
  if (tSec < 15.5) {
    ctx.globalAlpha = 0.85
    ctx.fillStyle = GOLD_LT
    ctx.textAlign = 'center'
    ctx.font = `600 ${Math.round(W * 0.032)}px 'Noto Sans KR', sans-serif`
    ctx.fillText('道 ' + sb.siteUrl, W / 2, H * 0.95)
    ctx.globalAlpha = 1
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  maxW: number,
  lh: number,
) {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line)
      line = w
    } else line = test
  }
  if (line) lines.push(line)
  lines.forEach((l, i) => ctx.fillText(l, cx, cy + i * lh))
}
