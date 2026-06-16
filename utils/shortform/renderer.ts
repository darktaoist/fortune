import type { StoryboardInput, RenderAssets, VideoOpts } from './types'
import { verdictFor } from './storyboard'
import { seg, easeOutCubic, easeOutBack, easeInOutQuad } from './easing'

const GOLD = '#c9a84c'
const GOLD_LT = '#e8c97e'
const BG = '#0a0a0f'
const TEXT = '#ece7dc'
const FAMILY = "'Noto Sans KR', sans-serif"

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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

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

function drawPairTitle(ctx: CanvasRenderingContext2D, n1: string, n2: string, cx: number, cy: number, maxW: number, startPx: number) {
  const hs = startPx * 0.42
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
  drawHeart(ctx, x + hs, cy, hs, '#e0556a')
  x += hs * 2 + gap
  ctx.fillText(n2, x, cy)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
}

function drawStars(ctx: CanvasRenderingContext2D, cx: number, cy: number, n: number, size: number) {
  const gap = size * 1.5
  const startX = cx - ((5 - 1) * gap) / 2
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < n ? GOLD : 'rgba(201,168,76,0.25)'
    star(ctx, startX + i * gap, cy, size)
  }
}
function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2
    const rad = i % 2 === 0 ? r : r * 0.45
    ctx.lineTo(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad)
  }
  ctx.closePath()
  ctx.fill()
}

// 원형 게이지(프랙션 0..1)
function drawGauge(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, frac: number) {
  ctx.save()
  ctx.lineCap = 'round'
  // 배경 링
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(201,168,76,0.18)'
  ctx.lineWidth = R * 0.12
  ctx.stroke()
  // 진행 아크 + 글로우
  ctx.beginPath()
  ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac)
  ctx.strokeStyle = GOLD
  ctx.lineWidth = R * 0.12
  ctx.shadowColor = 'rgba(233,201,126,0.8)'
  ctx.shadowBlur = R * 0.25
  ctx.stroke()
  ctx.restore()
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
  const M = Math.round(W * 0.08)
  const maxW = W - 2 * M
  const cx = W / 2
  const D = o.durationSec
  const v = verdictFor(sb.score)

  // ── 배경 ──
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(cx, H * 0.3, 0, cx, H * 0.3, W)
  glow.addColorStop(0, 'rgba(201,168,76,0.12)')
  glow.addColorStop(1, 'rgba(10,10,15,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // ── 상단 사진 프레임(고정) ──
  const pf = { x: M, y: Math.round(H * 0.06), w: maxW, h: Math.round(H * 0.4) }
  ctx.save()
  roundRect(ctx, pf.x, pf.y, pf.w, pf.h, 28)
  ctx.clip()
  ctx.fillStyle = '#15151c'
  ctx.fillRect(pf.x, pf.y, pf.w, pf.h)
  if (photo) {
    const zoom = 1.04 + 0.08 * easeInOutQuad(seg(tSec, 0, D))
    const iw = pf.w * zoom
    const ih = pf.h * zoom
    ctx.globalAlpha = 0.96
    ctx.drawImage(photo, pf.x + (pf.w - iw) / 2, pf.y + (pf.h - ih) / 2, iw, ih)
    ctx.globalAlpha = 1
  }
  const fade = ctx.createLinearGradient(0, pf.y + pf.h * 0.5, 0, pf.y + pf.h)
  fade.addColorStop(0, 'rgba(10,10,15,0)')
  fade.addColorStop(1, 'rgba(10,10,15,0.9)')
  ctx.fillStyle = fade
  ctx.fillRect(pf.x, pf.y + pf.h * 0.5, pf.w, pf.h * 0.5)
  ctx.restore()
  ctx.strokeStyle = 'rgba(201,168,76,0.4)'
  ctx.lineWidth = 2
  roundRect(ctx, pf.x, pf.y, pf.w, pf.h, 28)
  ctx.stroke()
  // 상대 이름
  ctx.textAlign = 'center'
  ctx.fillStyle = GOLD_LT
  fitFont(ctx, sb.partnerName, maxW * 0.8, Math.round(W * 0.058), 700)
  ctx.fillText(sb.partnerName, cx, pf.y + pf.h - 26)

  const zoneY = Math.round(H * 0.62)

  // ── 타임라인 ──
  const T_HOOK = 3.5
  const T_REVEAL = 10
  const T_BEATS_END = D - 5

  if (tSec < T_HOOK) {
    // 훅
    const a = easeOutCubic(seg(tSec, 0, 1))
    const out = 1 - seg(tSec, T_HOOK - 0.5, T_HOOK)
    ctx.globalAlpha = a * out
    ctx.fillStyle = GOLD
    fitFont(ctx, '운 명 의  궁 합', maxW, Math.round(W * 0.045), 700)
    ctx.fillText('운 명 의  궁 합', cx, zoneY - W * 0.13)
    drawPairTitle(ctx, sb.selfName, sb.partnerName, cx, zoneY, maxW, Math.round(W * 0.085))
    ctx.fillStyle = GOLD_LT
    fitFont(ctx, '결과는…?', maxW, Math.round(W * 0.048), 500)
    ctx.fillText('결과는…?', cx, zoneY + W * 0.12)
    ctx.globalAlpha = 1
  } else if (tSec < T_REVEAL) {
    // 점수 게이지 리빌 (클라이맥스)
    const local = seg(tSec, T_HOOK, T_REVEAL)
    const out = 1 - seg(tSec, T_REVEAL - 0.4, T_REVEAL)
    ctx.globalAlpha = out
    const gy = zoneY + W * 0.02
    const R = W * 0.2
    if (sb.score != null) {
      const fillT = easeOutCubic(seg(tSec, T_HOOK + 0.3, T_HOOK + 3)) // 게이지 채우기
      drawGauge(ctx, cx, gy, R, (sb.score / 100) * fillT)
      ctx.fillStyle = GOLD_LT
      fitFont(ctx, '궁합 점수', maxW, Math.round(W * 0.045), 700)
      ctx.fillText('궁합 점수', cx, gy - R - W * 0.03)
      ctx.fillStyle = '#fff'
      ctx.font = `900 ${Math.round(W * 0.13)}px ${FAMILY}`
      ctx.fillText(`${Math.round(sb.score * fillT)}`, cx, gy + W * 0.045)
      // 채운 뒤 등급/verdict 등장
      const post = easeOutBack(seg(tSec, T_HOOK + 3, T_HOOK + 3.8))
      if (post > 0) {
        ctx.save()
        ctx.globalAlpha = out * Math.min(1, post)
        drawStars(ctx, cx, gy + R + W * 0.06, v.stars, W * 0.028)
        ctx.fillStyle = GOLD
        const ls = fitFont(ctx, v.label, maxW, Math.round(W * 0.07), 800)
        ctx.fillText(v.label, cx, gy + R + W * 0.06 + ls * 1.1)
        ctx.restore()
      }
    } else {
      // 점수 없음: 총평 헤드라인
      const a = easeOutCubic(local)
      ctx.globalAlpha = out * a
      ctx.fillStyle = '#fff'
      ctx.font = `700 ${Math.round(W * 0.054)}px ${FAMILY}`
      const lines = wrapLines(ctx, sb.oneLiner, maxW, 3)
      const lh = W * 0.072
      lines.forEach((l, i) => ctx.fillText(l, cx, zoneY - ((lines.length - 1) * lh) / 2 + i * lh))
    }
    ctx.globalAlpha = 1
  } else if (tSec < T_BEATS_END && sb.beats.length) {
    // 테마 비트(한 번에 하나, 팝 애니메이션)
    const span = (T_BEATS_END - T_REVEAL) / sb.beats.length
    const idx = Math.min(sb.beats.length - 1, Math.floor((tSec - T_REVEAL) / span))
    const local = (tSec - T_REVEAL - idx * span) / span
    const pop = easeOutBack(seg(local, 0, 0.22))
    const out = 1 - seg(local, 0.88, 1)
    const b = sb.beats[idx]
    ctx.globalAlpha = Math.max(0, Math.min(1, pop)) * out
    // 큰 글리프(배경)
    ctx.save()
    ctx.globalAlpha *= 0.16
    ctx.fillStyle = GOLD
    ctx.font = `900 ${Math.round(W * 0.42)}px serif`
    ctx.fillText(b.glyph, cx, zoneY + W * 0.08)
    ctx.restore()
    // 라벨 칩
    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, pop)) * out
    const scale = 0.9 + 0.1 * Math.min(1, pop)
    ctx.translate(cx, zoneY - W * 0.12)
    ctx.scale(scale, scale)
    ctx.fillStyle = GOLD
    fitFont(ctx, b.label, maxW * 0.7, Math.round(W * 0.05), 800)
    const lw = ctx.measureText(b.label).width
    ctx.fillStyle = 'rgba(201,168,76,0.14)'
    roundRect(ctx, -lw / 2 - 26, -W * 0.04, lw + 52, W * 0.075, W * 0.04)
    ctx.fill()
    ctx.fillStyle = GOLD_LT
    ctx.fillText(b.label, 0, W * 0.008)
    ctx.restore()
    // 하이라이트 텍스트
    ctx.fillStyle = TEXT
    ctx.font = `600 ${Math.round(W * 0.052)}px ${FAMILY}`
    const lines = wrapLines(ctx, b.text, maxW, 3)
    const lh = W * 0.07
    lines.forEach((l, i) => ctx.fillText(l, cx, zoneY + W * 0.02 + i * lh))
    // 진행 점
    ctx.globalAlpha = out
    sb.beats.forEach((_, i) => {
      ctx.fillStyle = i === idx ? GOLD : 'rgba(201,168,76,0.3)'
      ctx.beginPath()
      ctx.arc(cx - ((sb.beats.length - 1) * 22) / 2 + i * 22, zoneY + W * 0.22, 5, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = 1
  } else {
    // CTA + verdict 리캡
    const a = easeOutBack(seg(tSec, T_BEATS_END, T_BEATS_END + 0.8))
    ctx.globalAlpha = Math.min(1, a)
    ctx.fillStyle = GOLD
    ctx.font = `900 ${Math.round(W * 0.13)}px serif`
    ctx.fillText(sb.zodiacGlyph, cx, zoneY - W * 0.12)
    if (v.label) {
      ctx.fillStyle = GOLD_LT
      fitFont(ctx, sb.score != null ? `${v.label} · ${sb.score}점` : v.label, maxW, Math.round(W * 0.06), 800)
      ctx.fillText(sb.score != null ? `${v.label} · ${sb.score}점` : v.label, cx, zoneY - W * 0.01)
    }
    ctx.fillStyle = '#fff'
    fitFont(ctx, '내 궁합도 확인해보세요', maxW, Math.round(W * 0.055), 700)
    ctx.fillText('내 궁합도 확인해보세요', cx, zoneY + W * 0.08)
    ctx.fillStyle = GOLD_LT
    fitFont(ctx, sb.siteUrl, maxW, Math.round(W * 0.055), 700)
    ctx.fillText(sb.siteUrl, cx, zoneY + W * 0.155)
    if (assets.qrBitmap) {
      const q = Math.round(W * 0.18)
      ctx.drawImage(assets.qrBitmap, cx - q / 2, zoneY + W * 0.2, q, q)
    }
    ctx.globalAlpha = 1
  }

  // ── 워터마크 ──
  if (tSec < T_BEATS_END) {
    ctx.globalAlpha = 0.8
    ctx.fillStyle = GOLD_LT
    ctx.textAlign = 'center'
    ctx.font = `600 ${Math.round(W * 0.034)}px ${FAMILY}`
    ctx.fillText('道 ' + sb.siteUrl, cx, H - Math.round(H * 0.04))
    ctx.globalAlpha = 1
  }
}
