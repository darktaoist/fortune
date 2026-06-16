import type { StoryboardInput, RenderAssets, VideoOpts } from './types'
import { seg, easeOutCubic, easeInOutQuad } from './easing'

const GOLD = '#c9a84c'
const GOLD_LT = '#e8c97e'
const BG = '#0a0a0f'
const TEXT = '#ece7dc'
const FAMILY = "'Noto Sans KR', sans-serif"

// 폰트 자동 축소: maxW 안에 들어가는 가장 큰 px(좌우 잘림 방지).
function fitFont(ctx: CanvasRenderingContext2D, text: string, maxW: number, startPx: number, weight = 700, minPx = 22) {
  let px = startPx
  while (px > minPx) {
    ctx.font = `${weight} ${px}px ${FAMILY}`
    if (ctx.measureText(text).width <= maxW) break
    px -= 2
  }
  ctx.font = `${weight} ${px}px ${FAMILY}`
  return px
}

// 공백 기준 줄바꿈(한국어 어절 포함). maxLines 초과분은 … 처리.
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
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
  if (lines.length > maxLines) {
    lines.length = maxLines
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.$/, '…')
  }
  return lines
}

// 골드 하트(Noto Sans KR에 ♥ 글리프가 없어 직접 그림).
function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.save()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(cx, cy + s * 0.3)
  ctx.bezierCurveTo(cx + s * 0.5, cy - s * 0.3, cx + s, cy + s * 0.2, cx, cy + s * 0.7)
  ctx.bezierCurveTo(cx - s, cy + s * 0.2, cx - s * 0.5, cy - s * 0.3, cx, cy + s * 0.3)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

// "이름1 ♥ 이름2" 한 줄을 중앙 정렬로 그림(하트는 직접 그림).
function drawPairTitle(ctx: CanvasRenderingContext2D, n1: string, n2: string, cx: number, cy: number, maxW: number, startPx: number) {
  const hs = startPx * 0.42 // 하트 크기
  const gap = startPx * 0.5
  let px = startPx
  const widthOf = () => {
    ctx.font = `800 ${px}px ${FAMILY}`
    return ctx.measureText(n1).width + ctx.measureText(n2).width + hs * 2 + gap * 2
  }
  while (px > 28 && widthOf() > maxW) px -= 2
  ctx.font = `800 ${px}px ${FAMILY}`
  const w1 = ctx.measureText(n1).width
  const w2 = ctx.measureText(n2).width
  const total = w1 + w2 + hs * 2 + gap * 2
  let x = cx - total / 2
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'
  ctx.fillText(n1, x, cy)
  x += w1 + gap
  drawHeart(ctx, x + hs, cy, hs, '#d9434e')
  x += hs * 2 + gap
  ctx.fillText(n2, x, cy)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  sb: StoryboardInput,
  photo: CanvasImageSource | null,
  assets: RenderAssets,
  tSec: number,
  o: VideoOpts,
) {
  const W = o.width
  const H = o.height
  const M = Math.round(W * 0.08) // 좌우 여백
  const maxW = W - 2 * M
  const cx = W / 2

  // ── 배경 ──
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(cx, H * 0.3, 0, cx, H * 0.3, W)
  glow.addColorStop(0, 'rgba(201,168,76,0.12)')
  glow.addColorStop(1, 'rgba(10,10,15,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // ── 상단 사진 프레임(고정 영역, 텍스트와 분리) ──
  const pf = { x: M, y: Math.round(H * 0.06), w: maxW, h: Math.round(H * 0.42) }
  ctx.save()
  roundRect(ctx, pf.x, pf.y, pf.w, pf.h, 28)
  ctx.clip()
  ctx.fillStyle = '#15151c'
  ctx.fillRect(pf.x, pf.y, pf.w, pf.h)
  if (photo) {
    const zoom = 1.04 + 0.08 * easeInOutQuad(seg(tSec, 0, o.durationSec)) // 켄번스
    // cover
    const iw = pf.w * zoom
    const ih = pf.h * zoom
    ctx.globalAlpha = 0.96
    ctx.drawImage(photo, pf.x + (pf.w - iw) / 2, pf.y + (pf.h - ih) / 2, iw, ih)
    ctx.globalAlpha = 1
  }
  // 프레임 하단 페이드
  const fade = ctx.createLinearGradient(0, pf.y + pf.h * 0.55, 0, pf.y + pf.h)
  fade.addColorStop(0, 'rgba(10,10,15,0)')
  fade.addColorStop(1, 'rgba(10,10,15,0.85)')
  ctx.fillStyle = fade
  ctx.fillRect(pf.x, pf.y + pf.h * 0.55, pf.w, pf.h * 0.45)
  ctx.restore()
  // 프레임 테두리
  ctx.strokeStyle = 'rgba(201,168,76,0.4)'
  ctx.lineWidth = 2
  roundRect(ctx, pf.x, pf.y, pf.w, pf.h, 28)
  ctx.stroke()

  // 상대 이름(사진 위 하단)
  ctx.textAlign = 'center'
  ctx.fillStyle = GOLD_LT
  fitFont(ctx, sb.partnerName, maxW * 0.8, Math.round(W * 0.06), 700)
  ctx.fillText(sb.partnerName, cx, pf.y + pf.h - 28)

  // ── 하단 텍스트 존(겹침 없음: 시간대별 한 그룹만) ──
  const zoneY = Math.round(H * 0.6) // 텍스트 그룹 세로 중심 기준

  // 0–4.5s 훅 (라벨 / 제목 / 부제 — 세로 간격 충분히)
  if (tSec < 4.5) {
    const a = easeOutCubic(seg(tSec, 0, 1))
    const out = 1 - seg(tSec, 4, 4.5)
    ctx.globalAlpha = a * out
    ctx.fillStyle = GOLD
    fitFont(ctx, '운 명 의  궁 합', maxW, Math.round(W * 0.045), 700)
    ctx.fillText('운 명 의  궁 합', cx, zoneY - W * 0.13)
    drawPairTitle(ctx, sb.selfName, sb.partnerName, cx, zoneY, maxW, Math.round(W * 0.085))
    ctx.fillStyle = GOLD_LT
    fitFont(ctx, '결과는…?', maxW, Math.round(W * 0.048), 500)
    ctx.fillText('결과는…?', cx, zoneY + W * 0.12)
    ctx.globalAlpha = 1
  }

  // 4.5–10s 리빌: 점수(있으면) / 없으면 한줄 헤드라인
  else if (tSec < 10) {
    const a = easeOutCubic(seg(tSec, 4.5, 5.5))
    const out = 1 - seg(tSec, 9.5, 10)
    ctx.globalAlpha = a * out
    if (sb.score != null) {
      ctx.fillStyle = GOLD_LT
      fitFont(ctx, '궁합 점수', maxW, Math.round(W * 0.055), 700)
      ctx.fillText('궁합 점수', cx, zoneY - W * 0.08)
      ctx.fillStyle = GOLD
      ctx.font = `900 ${Math.round(W * 0.26)}px ${FAMILY}`
      ctx.fillText(`${Math.round(sb.score * a)}`, cx, zoneY + W * 0.1)
    } else if (sb.oneLiner) {
      ctx.fillStyle = '#fff'
      ctx.font = `700 ${Math.round(W * 0.052)}px ${FAMILY}`
      const lines = wrapLines(ctx, sb.oneLiner, maxW, 3)
      const lh = W * 0.07
      lines.forEach((l, i) => ctx.fillText(l, cx, zoneY - ((lines.length - 1) * lh) / 2 + i * lh))
    }
    ctx.globalAlpha = 1
  }

  // 10–(끝-7)s 키포인트: 한 번에 하나씩(겹침 0)
  else if (tSec < o.durationSec - 7) {
    const pts = sb.points.length ? sb.points : sb.oneLiner ? [sb.oneLiner] : []
    if (pts.length) {
      const span = (o.durationSec - 7 - 10) / pts.length
      const idx = Math.min(pts.length - 1, Math.floor((tSec - 10) / span))
      const local = (tSec - 10 - idx * span) / span // 0..1
      const a = easeOutCubic(seg(local, 0, 0.18)) * (1 - seg(local, 0.85, 1))
      ctx.globalAlpha = a
      // 진행 점
      pts.forEach((_, i) => {
        ctx.fillStyle = i === idx ? GOLD : 'rgba(201,168,76,0.3)'
        ctx.beginPath()
        ctx.arc(cx - ((pts.length - 1) * 24) / 2 + i * 24, zoneY - W * 0.16, 6, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.fillStyle = TEXT
      ctx.font = `600 ${Math.round(W * 0.056)}px ${FAMILY}`
      const lines = wrapLines(ctx, pts[idx], maxW, 3)
      const lh = W * 0.075
      lines.forEach((l, i) => ctx.fillText(l, cx, zoneY - ((lines.length - 1) * lh) / 2 + i * lh))
      ctx.globalAlpha = 1
    }
  }

  // 마지막 7s CTA
  else {
    const a = easeOutCubic(seg(tSec, o.durationSec - 7, o.durationSec - 6))
    ctx.globalAlpha = a
    ctx.fillStyle = GOLD
    ctx.font = `900 ${Math.round(W * 0.14)}px serif`
    ctx.fillText(sb.zodiacGlyph, cx, zoneY - W * 0.1)
    ctx.fillStyle = '#fff'
    fitFont(ctx, '내 궁합도 확인해보세요', maxW, Math.round(W * 0.06), 700)
    ctx.fillText('내 궁합도 확인해보세요', cx, zoneY + W * 0.02)
    ctx.fillStyle = GOLD_LT
    fitFont(ctx, sb.siteUrl, maxW, Math.round(W * 0.058), 700)
    ctx.fillText(sb.siteUrl, cx, zoneY + W * 0.1)
    if (assets.qrBitmap) {
      const q = Math.round(W * 0.2)
      ctx.drawImage(assets.qrBitmap, cx - q / 2, zoneY + W * 0.15, q, q)
    }
    ctx.globalAlpha = 1
  }

  // ── 워터마크(상시, 맨 아래) ──
  if (tSec < o.durationSec - 7) {
    ctx.globalAlpha = 0.8
    ctx.fillStyle = GOLD_LT
    ctx.font = `600 ${Math.round(W * 0.034)}px ${FAMILY}`
    ctx.fillText('道 ' + sb.siteUrl, cx, H - Math.round(H * 0.04))
    ctx.globalAlpha = 1
  }
}
