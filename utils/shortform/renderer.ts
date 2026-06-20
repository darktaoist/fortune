import type { StoryboardInput, RenderAssets, VideoOpts } from './types'
import { verdictFor } from './storyboard'
import { seg, easeOutCubic, easeOutBack, easeInOutQuad } from './easing'

const GOLD = '#c9a84c'
const GOLD_LT = '#f0d68c'
const TEXT = '#f2efe7'
const SANS = "'Noto Sans KR', sans-serif"
const SERIF = "'Noto Serif KR', serif" // 디스플레이용(우아함, 900 weight 로드됨)
const FAMILY = SANS // 본문 기본

// ── 영상 내 고정 라벨 현지화 ──
// 렌더러는 Vue 밖이라 t()를 못 쓴다. 영상 언어(sb.lang)별 라벨을 자체 보유한다.
// (i18n 키: brand=hero.title.ko, score=cpl.score 와 동일 문구로 맞춤)
type SfLang = 'ko' | 'en' | 'ja' | 'zh'
interface SfLabels {
  brand: string
  destiny: string // '운명의 궁합'
  score: string // '궁합 점수'
  point: (n: number) => string // 점수 단위 ('78점')
  hookFallback: string // 훅 미생성 시
  ctaFallback: string // 캐치프레이즈 미생성 시
  verdicts: [string, string, string, string, string] // 별 5→1 등급명(AI 등급 없을 때)
}
const SF_LABELS: Record<SfLang, SfLabels> = {
  ko: { brand: '타오운세', destiny: '운명의 궁합', score: '궁합 점수', point: (n) => `${n}점`, hookFallback: '결과는…?', ctaFallback: '내 궁합도 확인해보세요', verdicts: ['천생연분', '환상의 케미', '좋은 인연', '노력하면 좋은 사이', '서로 다른 매력'] },
  en: { brand: 'TAOIST', destiny: 'Destined Match', score: 'Match Score', point: (n) => `${n} pts`, hookFallback: 'The verdict…?', ctaFallback: 'Check your match too', verdicts: ['Soulmates', 'Amazing Chemistry', 'A Good Match', 'Worth the Effort', 'Opposites Attract'] },
  ja: { brand: 'タオ運勢', destiny: '運命の相性', score: '相性スコア', point: (n) => `${n}点`, hookFallback: '結果は…？', ctaFallback: 'あなたの相性も占おう', verdicts: ['運命の相手', '最高の相性', '良いご縁', '努力で深まる仲', '惹かれ合う違い'] },
  zh: { brand: '道悟運勢', destiny: '命定緣分', score: '合盤分數', point: (n) => `${n}分`, hookFallback: '結果是…？', ctaFallback: '測測你的緣分', verdicts: ['天生一對', '絕佳默契', '良緣', '用心經營', '互補吸引'] },
}
function L(sb: StoryboardInput): SfLabels {
  return SF_LABELS[(sb.lang as SfLang)] || SF_LABELS.ko
}

// ── 텍스트 헬퍼 ──
function fitFont(ctx: CanvasRenderingContext2D, text: string, maxW: number, startPx: number, weight = 700, minPx = 22, family = SANS) {
  let px = startPx
  while (px > minPx) {
    ctx.font = `${weight} ${px}px ${family}`
    if (ctx.measureText(text).width <= maxW) break
    px -= 2
  }
  ctx.font = `${weight} ${px}px ${family}`
  return px
}
// 수동 자간(중앙정렬)
function drawSpaced(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, spacing: number) {
  const chars = [...text]
  let total = 0
  for (const c of chars) total += ctx.measureText(c).width + spacing
  total -= spacing
  let x = cx - total / 2
  const prev = ctx.textAlign
  ctx.textAlign = 'left'
  for (const c of chars) {
    ctx.fillText(c, x, y)
    x += ctx.measureText(c).width + spacing
  }
  ctx.textAlign = prev
}
// CJK(한자·가나·한글)는 글자 단위, 라틴 단어는 공백 단위로 끊는 혼합 줄바꿈.
// 공백이 없는 중국어·일본어·한국어가 통째로 한 줄을 넘어 화면 밖으로 새던 버그를
// 막는다. 한 토큰이 maxW보다 길면(아주 긴 라틴 단어·URL) 글자 단위로 강제 분해해
// 어떤 경우에도 maxW를 넘지 않게 한다.
// 줄 첫머리에 오면 안 되는 닫는 부호(약물 금칙). 직전 줄 끝에 붙여 흘려보낸다.
const NO_LINE_START = '，、。．・：；！？）］｝」』〉》”’%,.!?:;)]}'
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  // 토큰화: 공백 / CJK 1글자 / 그 외 연속(라틴 단어·숫자·기호)
  const tokens = text.match(/\s+|[　-〿぀-ヿ㐀-䶿一-鿿가-힣豈-﫿＀-￯]|[^\s　-〿぀-ヿ㐀-䶿一-鿿가-힣豈-﫿＀-￯]+/g) || []
  const lines: string[] = []
  let line = ''
  const fits = (s: string) => ctx.measureText(s).width <= maxW
  const flush = () => { if (line.trim()) lines.push(line.trim()); line = '' }
  for (const tk of tokens) {
    if (/^\s+$/.test(tk)) { if (line && fits(line + ' ')) line += ' '; continue }
    // 토큰 자체가 한 줄보다 길면 글자 단위로 강제 분해
    if (!fits(tk)) {
      for (const ch of tk) {
        if (line && !fits(line + ch)) flush()
        line += ch
      }
      continue
    }
    if (line && !fits(line + tk)) {
      // 금칙: 닫는 부호는 새 줄 첫머리로 보내지 않고 직전 줄에 붙인다(여백 안이라 안전)
      if (NO_LINE_START.includes(tk)) { line += tk; continue }
      flush()
    }
    line += tk
  }
  if (line.trim()) lines.push(line.trim())
  if (lines.length > maxLines) {
    lines.length = maxLines
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.$/, '…')
  }
  return lines
}
function drawWrapped(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, maxW: number, lh: number, maxLines = 3) {
  const lines = wrapLines(ctx, text, maxW, maxLines)
  lines.forEach((l, i) => ctx.fillText(l, cx, cy - ((lines.length - 1) * lh) / 2 + i * lh))
  return lines.length
}

// ── 도형 헬퍼 ──
function heart(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, _color?: string) {
  // 풍성한 클래식 하트 + 핑크→레드 그라데이션 + 글로우 + 하이라이트
  ctx.save()
  ctx.translate(cx, cy)
  const g = ctx.createLinearGradient(0, -s, 0, s)
  g.addColorStop(0, '#ff8a98')
  g.addColorStop(1, '#d2304a')
  ctx.fillStyle = g
  ctx.shadowColor = 'rgba(255,90,110,0.75)'
  ctx.shadowBlur = s * 0.9
  ctx.beginPath()
  ctx.moveTo(0, s * 0.78)
  ctx.bezierCurveTo(-s * 1.3, -s * 0.2, -s * 0.58, -s * 0.98, 0, -s * 0.25)
  ctx.bezierCurveTo(s * 0.58, -s * 0.98, s * 1.3, -s * 0.2, 0, s * 0.78)
  ctx.closePath()
  ctx.fill()
  // 작은 하이라이트
  ctx.shadowBlur = 0
  ctx.globalAlpha = 0.5
  ctx.fillStyle = '#ffd0d6'
  ctx.beginPath()
  ctx.ellipse(-s * 0.4, -s * 0.32, s * 0.22, s * 0.13, -0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, fill: string) {
  ctx.fillStyle = fill
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2
    const rad = i % 2 === 0 ? r : r * 0.45
    ctx.lineTo(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad)
  }
  ctx.closePath()
  ctx.fill()
}
function stars(ctx: CanvasRenderingContext2D, cx: number, cy: number, n: number, size: number, appear: number) {
  const gap = size * 1.55
  const startX = cx - (4 * gap) / 2
  for (let i = 0; i < 5; i++) {
    const a = Math.max(0, Math.min(1, (appear - i * 0.12) * 3))
    if (a <= 0) continue
    star(ctx, startX + i * gap, cy, size * (0.6 + 0.4 * a), i < n ? GOLD_LT : 'rgba(201,168,76,0.22)')
  }
}

// 결정적 해시(프레임 일관 — Math.random 미사용)
function hash(i: number) {
  const x = Math.sin(i * 127.1 + 11.7) * 43758.5453
  return x - Math.floor(x)
}

// ── 배경 레이어 ──
function drawBackground(ctx: CanvasRenderingContext2D, photo: CanvasImageSource | null, sb: StoryboardInput, t: number, o: VideoOpts, focus: number) {
  const W = o.width
  const H = o.height
  if (photo) {
    // 켄번스: 천천히 줌 + 미세 패닝
    const z = 1.08 + 0.12 * easeInOutQuad(seg(t, 0, o.durationSec))
    const iw = W * z
    const ih = H * z
    const panX = (hash(1) - 0.5) * (iw - W) * 0.3 * Math.sin(t * 0.2)
    ctx.drawImage(photo, (W - iw) / 2 + panX, (H - ih) / 2, iw, ih)
    // 골드 그레이딩 오버레이
    const grad = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, H * 0.7)
    grad.addColorStop(0, 'rgba(201,168,76,0.10)')
    grad.addColorStop(1, 'rgba(8,7,10,0.0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)
  } else {
    // 사진 없음: 리치 그라데이션 + 거대 글리프
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#14110a')
    g.addColorStop(0.5, '#0c0a10')
    g.addColorStop(1, '#08070a')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    ctx.save()
    ctx.globalAlpha = 0.08
    ctx.fillStyle = GOLD
    ctx.font = `900 ${Math.round(W * 0.95)}px ${SERIF}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(sb.zodiacGlyph, W / 2, H * 0.42)
    ctx.restore()
    ctx.textBaseline = 'alphabetic'
  }
  // 상/하 스크림
  const top = ctx.createLinearGradient(0, 0, 0, H * 0.28)
  top.addColorStop(0, 'rgba(8,7,10,0.85)')
  top.addColorStop(1, 'rgba(8,7,10,0)')
  ctx.fillStyle = top
  ctx.fillRect(0, 0, W, H * 0.28)
  const botStart = 0.32
  const bot = ctx.createLinearGradient(0, H * botStart, 0, H)
  bot.addColorStop(0, 'rgba(8,7,10,0)')
  bot.addColorStop(0.45, `rgba(8,7,10,${0.72 + focus * 0.18})`)
  bot.addColorStop(1, 'rgba(8,7,10,0.97)')
  ctx.fillStyle = bot
  ctx.fillRect(0, H * botStart, W, H * (1 - botStart))
  // focus 오버레이(점수 리빌 때 전체 살짝 더 어둡게)
  if (focus > 0) {
    ctx.fillStyle = `rgba(8,7,10,${0.32 * focus})`
    ctx.fillRect(0, 0, W, H)
  }
  // 비네트
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.72)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, W, H)
}

// ── 파티클(골드 더스트) ──
function drawParticles(ctx: CanvasRenderingContext2D, t: number, o: VideoOpts) {
  const W = o.width
  const H = o.height
  ctx.save()
  for (let i = 0; i < 46; i++) {
    const px = hash(i) * W
    const speed = 0.15 + hash(i + 99) * 0.5
    const size = 1.2 + hash(i + 50) * 3.2
    const y = H - (((t * speed * 60 + hash(i + 7) * H) % (H + 80)) - 40)
    const a = 0.12 + 0.16 * (0.5 + 0.5 * Math.sin(t * 1.8 + i))
    ctx.globalAlpha = a
    ctx.fillStyle = i % 4 === 0 ? GOLD_LT : GOLD
    ctx.beginPath()
    ctx.arc(px, y, size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawLogo(ctx: CanvasRenderingContext2D, sb: StoryboardInput, o: VideoOpts) {
  ctx.globalAlpha = 0.92
  ctx.fillStyle = GOLD_LT
  ctx.textAlign = 'left'
  ctx.font = `700 ${Math.round(o.width * 0.04)}px ${FAMILY}`
  ctx.fillText(`道 ${L(sb).brand}`, Math.round(o.width * 0.07), Math.round(o.height * 0.07))
  ctx.textAlign = 'center'
  ctx.globalAlpha = 1
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
  const M = Math.round(W * 0.085)
  const maxW = W - 2 * M
  const cx = W / 2
  const D = o.durationSec
  const v = verdictFor(sb.score)
  // AI 등급명 우선, 없으면 점수기반 등급을 영상 언어로 현지화(별 5→1 = verdicts[0..4])
  const vLabel = sb.verdictLabel || (v.stars ? L(sb).verdicts[5 - v.stars] : '')

  const T_HOOK = 3.5
  const T_REVEAL = 10
  const T_BEATS_END = D - 5
  const inReveal = tSec >= T_HOOK && tSec < T_REVEAL
  const focus = inReveal ? easeOutCubic(seg(tSec, T_HOOK, T_HOOK + 0.6)) * (1 - seg(tSec, T_REVEAL - 0.5, T_REVEAL)) : 0

  drawBackground(ctx, photo, sb, tSec, o, focus)
  drawParticles(ctx, tSec, o)
  ctx.textAlign = 'center'
  drawLogo(ctx, sb, o)

  // 상대 이름(상단, 사진 위) — 항상
  ctx.globalAlpha = 0.95
  ctx.fillStyle = GOLD_LT
  ctx.font = `700 ${Math.round(W * 0.05)}px ${FAMILY}`
  drawSpaced(ctx, sb.partnerName, cx, Math.round(H * 0.135), W * 0.012)
  ctx.globalAlpha = 1

  // ── 페이즈 ──
  if (tSec < T_HOOK) {
    const a = easeOutCubic(seg(tSec, 0, 0.9))
    const out = 1 - seg(tSec, T_HOOK - 0.5, T_HOOK)
    ctx.globalAlpha = a * out
    ctx.fillStyle = GOLD
    ctx.font = `500 ${Math.round(W * 0.044)}px ${SERIF}`
    drawSpaced(ctx, L(sb).destiny, cx, H * 0.6, W * 0.03)
    // 이름 ♥ 이름
    pairTitle(ctx, sb.selfName, sb.partnerName, cx, H * 0.7, maxW, Math.round(W * 0.088), a)
    ctx.fillStyle = GOLD_LT
    ctx.font = `500 ${Math.round(W * 0.046)}px ${FAMILY}`
    fitFont(ctx, sb.hook || L(sb).hookFallback, maxW, Math.round(W * 0.046), 500, 22, SERIF)
    ctx.fillText(sb.hook || L(sb).hookFallback, cx, H * 0.78)
    ctx.globalAlpha = 1
  } else if (inReveal) {
    const out = 1 - seg(tSec, T_REVEAL - 0.5, T_REVEAL)
    ctx.globalAlpha = out
    const gy = H * 0.44
    if (sb.score != null) {
      const fillT = easeOutCubic(seg(tSec, T_HOOK + 0.3, T_HOOK + 3.2))
      const R = W * 0.27
      // 게이지 링
      ctx.save()
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(cx, gy, R, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(201,168,76,0.15)'
      ctx.lineWidth = R * 0.07
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(cx, gy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (sb.score / 100) * fillT)
      ctx.strokeStyle = GOLD
      ctx.lineWidth = R * 0.07
      ctx.shadowColor = 'rgba(240,214,140,0.9)'
      ctx.shadowBlur = R * 0.3
      ctx.stroke()
      ctx.restore()
      // 라벨 + 숫자
      ctx.fillStyle = GOLD_LT
      ctx.font = `700 ${Math.round(W * 0.045)}px ${FAMILY}`
      drawSpaced(ctx, L(sb).score, cx, gy - R * 0.42, W * 0.02)
      ctx.fillStyle = '#fff'
      const pop = 0.7 + 0.3 * easeOutBack(seg(tSec, T_HOOK + 0.3, T_HOOK + 1.2))
      ctx.font = `900 ${Math.round(W * 0.18 * pop)}px ${SERIF}`
      ctx.textBaseline = 'middle'
      ctx.fillText(`${Math.round(sb.score * fillT)}`, cx, gy + R * 0.05)
      ctx.textBaseline = 'alphabetic'
      // 등급 + verdict (게이지와 충분히 띄움)
      const post = seg(tSec, T_HOOK + 3, T_HOOK + 4)
      if (post > 0) {
        const starsY = gy + R + W * 0.1
        stars(ctx, cx, starsY, v.stars, W * 0.032, post)
        ctx.globalAlpha = out * Math.min(1, post * 1.5)
        ctx.fillStyle = GOLD_LT
        const ls = fitFont(ctx, vLabel, maxW, Math.round(W * 0.082), 900, 22, SERIF)
        ctx.fillText(vLabel, cx, starsY + W * 0.08 + ls)
        ctx.globalAlpha = out
      }
    } else {
      ctx.fillStyle = '#fff'
      ctx.font = `700 ${Math.round(W * 0.058)}px ${SERIF}`
      drawWrapped(ctx, sb.oneLiner, cx, H * 0.62, maxW, W * 0.078, 3)
    }
    ctx.globalAlpha = 1
  } else if (tSec < T_BEATS_END && sb.beats.length) {
    const span = (T_BEATS_END - T_REVEAL) / sb.beats.length
    const idx = Math.min(sb.beats.length - 1, Math.floor((tSec - T_REVEAL) / span))
    const local = (tSec - T_REVEAL - idx * span) / span
    const pop = easeOutBack(seg(local, 0, 0.16)) // 빨리 등장
    const out = 1 - seg(local, 0.94, 1) // 늦게 사라짐 → 읽을 시간 ↑
    const b = sb.beats[idx]
    const baseA = Math.max(0, Math.min(1, pop)) * out
    const slide = (1 - Math.min(1, pop)) * 40
    // 글리프(큰 워터마크) — 중앙 뒤
    ctx.save()
    ctx.globalAlpha = baseA * 0.15
    ctx.fillStyle = GOLD
    ctx.font = `900 ${Math.round(W * 0.46)}px ${SERIF}`
    ctx.textBaseline = 'middle'
    ctx.fillText(b.glyph, cx, H * 0.56)
    ctx.restore()
    ctx.textBaseline = 'alphabetic'
    // 라벨 칩 — 위쪽(0.45)으로 올림
    ctx.save()
    ctx.globalAlpha = baseA
    ctx.font = `700 ${Math.round(W * 0.05)}px ${FAMILY}`
    const lw = ctx.measureText(b.label).width
    const chipY = H * 0.45 + slide
    ctx.fillStyle = 'rgba(201,168,76,0.18)'
    roundRect(ctx, cx - lw / 2 - 28, chipY - W * 0.045, lw + 56, W * 0.082, W * 0.041)
    ctx.fill()
    ctx.strokeStyle = 'rgba(201,168,76,0.55)'
    ctx.lineWidth = 1.5
    roundRect(ctx, cx - lw / 2 - 28, chipY - W * 0.045, lw + 56, W * 0.082, W * 0.041)
    ctx.stroke()
    ctx.fillStyle = GOLD_LT
    ctx.fillText(b.label, cx, chipY + W * 0.013)
    ctx.restore()
    // 하이라이트 — 칩 아래부터, 작은 폰트, 최대 5줄(위→아래로 채움)
    ctx.globalAlpha = baseA
    ctx.fillStyle = TEXT
    ctx.font = `500 ${Math.round(W * 0.047)}px ${FAMILY}`
    const blh = W * 0.066
    const blines = wrapLines(ctx, b.text, maxW, 5)
    const bStartY = H * 0.55 + slide
    blines.forEach((l, i) => ctx.fillText(l, cx, bStartY + i * blh))
    // 진행 점
    ctx.globalAlpha = out
    sb.beats.forEach((_, i) => {
      ctx.fillStyle = i === idx ? GOLD_LT : 'rgba(201,168,76,0.3)'
      const dw = i === idx ? 22 : 12
      roundRect(ctx, cx - (sb.beats.length * 16) / 2 + i * 16, H * 0.88, dw === 22 ? 22 : 8, 8, 4)
      ctx.fill()
    })
    ctx.globalAlpha = 1
  } else {
    const a = Math.min(1, easeOutBack(seg(tSec, T_BEATS_END, T_BEATS_END + 0.8)))
    ctx.globalAlpha = a
    ctx.fillStyle = GOLD
    ctx.font = `900 ${Math.round(W * 0.16)}px ${SERIF}`
    ctx.fillText(sb.zodiacGlyph, cx, H * 0.52)
    if (vLabel) {
      stars(ctx, cx, H * 0.58, v.stars, W * 0.026, 1)
      ctx.fillStyle = GOLD_LT
      const txt = sb.score != null ? `${vLabel} · ${L(sb).point(sb.score)}` : vLabel
      fitFont(ctx, txt, maxW, Math.round(W * 0.062), 900, 22, SERIF)
      ctx.fillText(txt, cx, H * 0.65)
    }
    // 캐치프레이즈(AI) 우선, 없으면 기본 CTA 문구
    ctx.fillStyle = '#fff'
    fitFont(ctx, sb.catchphrase || L(sb).ctaFallback, maxW, Math.round(W * 0.052), 700, 22, SERIF)
    drawWrapped(ctx, sb.catchphrase || L(sb).ctaFallback, cx, H * 0.72, maxW, W * 0.065, 2)
    ctx.fillStyle = GOLD_LT
    ctx.font = `700 ${Math.round(W * 0.055)}px ${FAMILY}`
    drawSpaced(ctx, sb.siteUrl, cx, H * 0.77, W * 0.005)
    if (assets.qrBitmap) {
      const q = Math.round(W * 0.17)
      ctx.drawImage(assets.qrBitmap, cx - q / 2, H * 0.8, q, q)
    }
    ctx.globalAlpha = 1
  }
}

function pairTitle(ctx: CanvasRenderingContext2D, n1: string, n2: string, cx: number, cy: number, maxW: number, startPx: number, a: number) {
  const hs = startPx * 0.5
  const gap = startPx * 0.55
  let px = startPx
  const widthOf = () => {
    ctx.font = `700 ${px}px ${SERIF}`
    return ctx.measureText(n1).width + ctx.measureText(n2).width + hs * 2 + gap * 2
  }
  while (px > 28 && widthOf() > maxW) px -= 2
  ctx.font = `700 ${px}px ${SERIF}`
  const w1 = ctx.measureText(n1).width
  const w2 = ctx.measureText(n2).width
  const total = w1 + w2 + hs * 2 + gap * 2
  let x = cx - total / 2
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'
  ctx.fillText(n1, x, cy)
  x += w1 + gap
  heart(ctx, x + hs, cy, hs * (0.85 + 0.15 * Math.sin(a * Math.PI)), '#e0556a')
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
