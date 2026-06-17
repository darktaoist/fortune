# 궁합 숏폼 영상(브라우저 렌더) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement task-by-task. Steps use `- [ ]` checkboxes.

**Goal:** 연예인 궁합 결과를 사용자 브라우저에서 20초 세로 모션그래픽 MP4로 생성해 다운로드/공유하게 한다(서버 비용·부하 0).

**Architecture:** 전부 클라이언트. 순수 데이터→스토리보드 매핑 + Canvas 2D 프레임 렌더 + WebCodecs 인코딩(폴백 체인). 결과페이지에 "영상으로 공유" 버튼 추가. **이번 작업은 로컬(dev)에서만 확인하고 배포하지 않는다.**

**Tech Stack:** Nuxt 3 / Vue 3.5 / Canvas 2D / WebCodecs(VideoEncoder·AudioEncoder) / `mp4-muxer` / `qrcode` / Web Audio / Web Share API.

**테스트 정책:** 이 레포는 테스트 러너가 없고 핵심이 브라우저 전용 API다. 순수 함수(storyboard, illustrate)는 임시 node 스크립트로 sanity 체크하고, 렌더/인코딩/모달은 **로컬 브라우저 수동 검증**한다. (vitest 도입은 범위 밖.)

설계 출처: `docs/superpowers/specs/2026-06-16-gunghap-shortform-video-design.md`

---

## 파일 구조

- Create: `app/utils/shortform/types.ts` — 공유 타입(StoryboardInput, Scene, Keyframe 등)
- Create: `app/utils/shortform/storyboard.ts` — 결과 데이터 → 타임라인(순수)
- Create: `app/utils/shortform/illustrate.ts` — 사진 포스터화+골드 듀오톤(순수, ImageData→ImageData)
- Create: `app/utils/shortform/easing.ts` — 이징 함수(순수)
- Create: `app/utils/shortform/renderer.ts` — 프레임별 Canvas 합성
- Create: `app/utils/shortform/encode.ts` — WebCodecs MP4 + WebM/PNG 폴백
- Create: `app/composables/useShortform.ts` — 오케스트레이션
- Create: `app/components/ShareVideoModal.vue` — 버튼/진행바/미리보기/공유 UI
- Modify: `pages/result/premium.vue` — gunghap일 때 버튼 마운트
- Create: `public/shortform/audio/` — 로열티프리 트랙 + `LICENSE.txt`
- Modify: `package.json` — `mp4-muxer`, `qrcode` 추가

> 경로 주의: 이 프로젝트가 `~/utils`, `~/composables`, `~/components`를 쓰는지 `srcDir`/`app/` 구조인지 Task 1에서 확인 후 경로 통일.

---

## Task 0: 의존성 & 에셋 준비

**Files:** Modify `package.json`; Create `public/shortform/audio/LICENSE.txt`

- [ ] **Step 1: 의존성 설치**

Run:
```bash
cd /Users/taoist/works/fortune
npm install mp4-muxer qrcode
```
Expected: `mp4-muxer`, `qrcode`가 dependencies에 추가됨.

- [ ] **Step 2: 오디오 디렉토리 + 라이선스 메모 생성**

Create `public/shortform/audio/LICENSE.txt`:
```text
배경음악 라이선스 기록.
- track1.mp3 : <출처 URL> / <라이선스: CC0 또는 구매 영수증 ID> / 확인일 2026-06-16
로열티프리(상업적 사용·재배포 허용) 트랙만 둘 것. 길이 >= 20s.
```

- [ ] **Step 3: 트랙 파일 배치(수동)**

`public/shortform/audio/track1.mp3` 에 로열티프리 트랙 1개 배치(Pixabay Music 등 CC0). 길이 ≥ 20s. 없으면 이후 인코딩에서 무음으로 진행되도록 encode가 audio 누락을 허용함(Task 5 참고).

- [ ] **Step 4: Commit**
```bash
git add package.json package-lock.json public/shortform/audio/LICENSE.txt
git commit -m "chore: add shortform deps (mp4-muxer, qrcode) and audio license note"
```

---

## Task 1: 경로 규약 확인 + 타입 정의

**Files:** Create `utils/shortform/types.ts` (Step 1에서 확정한 베이스 경로 사용)

- [ ] **Step 1: import alias/디렉토리 규약 확인**

Run:
```bash
cd /Users/taoist/works/fortune
ls -d app 2>/dev/null; ls composables utils components 2>/dev/null | head
grep -n "srcDir\|alias\|dir:" nuxt.config.ts
grep -rn "from '~/composables\|from '~/utils\|from '~/components" pages | head -3
```
Expected: 기존 import 규약 파악(예: `~/utils/...`). 이후 모든 신규 파일은 그 규약을 따른다. (아래 예시는 `~/utils/shortform/...` 가정.)

- [ ] **Step 2: 타입 작성**

Create `utils/shortform/types.ts`:
```ts
export interface StoryboardInput {
  selfName: string
  partnerName: string
  partnerImageUrl: string | null
  score: number | null            // premium.post.ts: result.score (없으면 null)
  oneLiner: string                 // 한줄평(없으면 빈문자)
  points: string[]                 // 키포인트 2~3개(섹션에서 추출)
  zodiacGlyph: string              // result.glyph || '緣'
  siteUrl: string                  // 'taoist.co.kr'
}

export interface RenderAssets {
  illustrated: ImageData | null    // 일러스트 처리된 연예인 사진
  qrBitmap: ImageBitmap | null     // CTA용 QR
  logoBitmap: ImageBitmap | null
}

export interface VideoOpts {
  width: number   // 1080
  height: number  // 1920
  fps: number     // 30
  durationSec: number // 20
}

export const DEFAULT_OPTS: VideoOpts = { width: 1080, height: 1920, fps: 30, durationSec: 20 }
```

- [ ] **Step 3: Commit**
```bash
git add utils/shortform/types.ts
git commit -m "feat(shortform): shared types"
```

---

## Task 2: 이징 + 스토리보드 매핑(순수 함수)

**Files:** Create `utils/shortform/easing.ts`, `utils/shortform/storyboard.ts`

- [ ] **Step 1: 이징 작성**

Create `utils/shortform/easing.ts`:
```ts
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3)
export const easeInOutQuad = (x: number) => {
  const t = clamp01(x)
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}
// 구간 [a,b]에서의 정규화 진행도(0..1)
export const seg = (tSec: number, a: number, b: number) => clamp01((tSec - a) / (b - a))
```

- [ ] **Step 2: 스토리보드 작성**

Create `utils/shortform/storyboard.ts`:
```ts
import type { StoryboardInput } from './types'

// 섹션 배열에서 키포인트 2~3개를 짧게 추출(추가 LLM 호출 없음).
export function extractPoints(sections: { title?: string; body?: string }[]): string[] {
  const out: string[] = []
  for (const s of sections) {
    const text = (s.body || '').replace(/\s+/g, ' ').trim()
    if (!text) continue
    const firstSentence = text.split(/(?<=[.!?。！？])\s/)[0]
    out.push(firstSentence.length > 42 ? firstSentence.slice(0, 40) + '…' : firstSentence)
    if (out.length >= 3) break
  }
  return out
}

// 한줄평: 'summary'/'한줄' 류 섹션 우선, 없으면 첫 섹션 첫 문장.
export function pickOneLiner(sections: { key?: string; title?: string; body?: string }[]): string {
  const pref = sections.find((s) => /summary|한줄|총평|overview/i.test(`${s.key} ${s.title}`))
  const src = pref || sections[0]
  if (!src?.body) return ''
  const first = src.body.replace(/\s+/g, ' ').trim().split(/(?<=[.!?。！？])\s/)[0]
  return first.length > 60 ? first.slice(0, 58) + '…' : first
}

export interface BuildArgs {
  selfName: string
  partnerName: string
  partnerImageUrl: string | null
  score: number | null
  sections: { key?: string; title?: string; body?: string }[]
  zodiacGlyph: string
  siteUrl?: string
}

export function buildStoryboard(a: BuildArgs): StoryboardInput {
  return {
    selfName: a.selfName || '나',
    partnerName: a.partnerName || '?',
    partnerImageUrl: a.partnerImageUrl,
    score: typeof a.score === 'number' ? a.score : null,
    oneLiner: pickOneLiner(a.sections),
    points: extractPoints(a.sections),
    zodiacGlyph: a.zodiacGlyph || '緣',
    siteUrl: a.siteUrl || 'taoist.co.kr',
  }
}
```

- [ ] **Step 3: node sanity 체크**

Run:
```bash
cd /Users/taoist/works/fortune
node --input-type=module -e "
import { buildStoryboard } from './utils/shortform/storyboard.ts'
" 2>/dev/null || npx tsx -e "
import { buildStoryboard } from './utils/shortform/storyboard.ts'
const r = buildStoryboard({ selfName:'도원', partnerName:'아이린', partnerImageUrl:null, score:87,
  sections:[{key:'summary',title:'총평',body:'두 사람은 서로를 보완하는 관계입니다. 신뢰가 깊어요.'},{title:'연애',body:'표현이 잘 맞습니다. 다툼은 적어요.'}], zodiacGlyph:'緣' })
console.log(JSON.stringify(r,null,2))
"
```
Expected: `score:87`, `oneLiner` 비어있지 않음, `points.length>=1`. (tsx 없으면 `npm i -D tsx` 후 재시도.)

- [ ] **Step 4: Commit**
```bash
git add utils/shortform/easing.ts utils/shortform/storyboard.ts
git commit -m "feat(shortform): pure storyboard + easing"
```

---

## Task 3: 일러스트 필터(법적 완충 a안, 순수)

**Files:** Create `utils/shortform/illustrate.ts`

- [ ] **Step 1: 작성**

Create `utils/shortform/illustrate.ts`:
```ts
// 연예인 사진을 '공식 사진' 느낌에서 벗어나게: 색 단계 축소(posterize) + 골드 듀오톤.
// 입력/출력 모두 ImageData (브라우저/오프스크린 캔버스에서 추출). 순수 변환.
const GOLD_SHADOW = [26, 22, 14]   // 어두운 톤
const GOLD_LIGHT = [233, 201, 126] // 골드 하이라이트

export function illustrate(src: ImageData, levels = 5): ImageData {
  const { data, width, height } = src
  const out = new ImageData(width, height)
  const step = 255 / (levels - 1)
  for (let i = 0; i < data.length; i += 4) {
    // 1) 명도(luma)
    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    // 2) posterize
    const q = Math.round(luma / step) * step
    const t = q / 255
    // 3) 듀오톤 매핑
    out.data[i] = GOLD_SHADOW[0] + (GOLD_LIGHT[0] - GOLD_SHADOW[0]) * t
    out.data[i + 1] = GOLD_SHADOW[1] + (GOLD_LIGHT[1] - GOLD_SHADOW[1]) * t
    out.data[i + 2] = GOLD_SHADOW[2] + (GOLD_LIGHT[2] - GOLD_SHADOW[2]) * t
    out.data[i + 3] = data[i + 3]
  }
  return out
}
```

- [ ] **Step 2: 로컬 시각 확인용 임시 페이지(선택)**

dev에서 한 장 변환해 눈으로 확인. (정식 테스트 아님 — 인코딩 통합 후 모달에서 최종 확인.)

- [ ] **Step 3: Commit**
```bash
git add utils/shortform/illustrate.ts
git commit -m "feat(shortform): illustrate (posterize + gold duotone)"
```

---

## Task 4: 프레임 렌더러(Canvas 2D)

**Files:** Create `utils/shortform/renderer.ts`

설계 스토리보드(0–3 훅 / 3–7 리빌 / 7–16 요약 / 16–20 CTA)를 `tSec` 기반으로 그린다. 워터마크(로고+URL)는 전 구간 상시.

- [ ] **Step 1: 작성**

Create `utils/shortform/renderer.ts`:
```ts
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

  // 0–3s 훅: "○○ ♥ [연예인]" + "우리 궁합은…?"
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

  // 3–7s 리빌: 점수(있으면) 또는 한줄평
  if (tSec >= 3 && tSec < 16) {
    const a = easeOutCubic(seg(tSec, 3, 4))
    if (sb.score != null) {
      ctx.fillStyle = GOLD
      ctx.font = `900 ${Math.round(W * 0.22 * (0.6 + 0.4 * a))}px 'Noto Sans KR', sans-serif`
      ctx.fillText(`${Math.round(sb.score * a)}`, W / 2, H * 0.6)
      ctx.fillStyle = GOLD_LT
      ctx.font = `700 ${Math.round(W * 0.06)}px 'Noto Sans KR', sans-serif`
      ctx.fillText('궁합 점수', W / 2, H * 0.48)
    } else if (sb.oneLiner) {
      ctx.fillStyle = '#fff'
      ctx.font = `700 ${Math.round(W * 0.06)}px 'Noto Sans KR', sans-serif`
      wrapText(ctx, sb.oneLiner, W / 2, H * 0.56, W * 0.82, W * 0.08)
    }
  }

  // 7–16s 요약: 한줄평(점수 있던 경우) + 키포인트
  if (tSec >= 7 && tSec < 16.5) {
    let y = H * 0.7
    if (sb.score != null && sb.oneLiner) {
      ctx.globalAlpha = easeOutCubic(seg(tSec, 7, 8))
      ctx.fillStyle = GOLD_LT
      ctx.font = `600 ${Math.round(W * 0.05)}px 'Noto Sans KR', sans-serif`
      wrapText(ctx, sb.oneLiner, W / 2, H * 0.5, W * 0.82, W * 0.07)
      ctx.globalAlpha = 1
    }
    sb.points.forEach((p, i) => {
      const start = 8 + i * 1.6
      const a = easeOutCubic(seg(tSec, start, start + 0.8))
      if (a <= 0) return
      ctx.globalAlpha = a
      ctx.fillStyle = '#e8e4dc'
      ctx.font = `500 ${Math.round(W * 0.042)}px 'Noto Sans KR', sans-serif`
      ctx.fillText('• ' + p, W / 2, y + i * H * 0.06 + (1 - a) * 20)
      ctx.globalAlpha = 1
    })
  }

  // 16–20s CTA
  if (tSec >= 15.5) {
    const a = easeOutCubic(seg(tSec, 15.5, 16.5))
    ctx.globalAlpha = a
    ctx.fillStyle = GOLD
    ctx.font = `900 ${Math.round(W * 0.16)}px serif`
    ctx.fillText(sb.zodiacGlyph, W / 2, H * 0.5)
    ctx.fillStyle = '#fff'
    ctx.font = `700 ${Math.round(W * 0.058)}px 'Noto Sans KR', sans-serif`
    ctx.fillText('내 궁합도 확인해보세요', W / 2, H * 0.62)
    ctx.fillStyle = GOLD_LT
    ctx.font = `700 ${Math.round(W * 0.06)}px 'Noto Sans KR', sans-serif`
    ctx.fillText(sb.siteUrl, W / 2, H * 0.7)
    if (assets.qrBitmap) {
      const q = W * 0.22
      ctx.drawImage(assets.qrBitmap, (W - q) / 2, H * 0.74, q, q)
    }
    ctx.globalAlpha = 1
  }

  // 워터마크(상시): 로고/URL 하단
  ctx.globalAlpha = 0.85
  ctx.fillStyle = GOLD_LT
  ctx.textAlign = 'center'
  ctx.font = `600 ${Math.round(W * 0.032)}px 'Noto Sans KR', sans-serif`
  if (tSec < 15.5) ctx.fillText('道 ' + sb.siteUrl, W / 2, H * 0.95)
  ctx.globalAlpha = 1
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, maxW: number, lh: number) {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w } else line = test
  }
  if (line) lines.push(line)
  lines.forEach((l, i) => ctx.fillText(l, cx, cy + i * lh))
}
```

- [ ] **Step 2: Commit**
```bash
git add utils/shortform/renderer.ts
git commit -m "feat(shortform): canvas frame renderer (storyboard timeline)"
```

> 비주얼 디테일(파티클, 폰트 크기)은 Task 8 로컬 확인에서 조정.

---

## Task 5: 인코딩 파이프라인(WebCodecs + 폴백)

**Files:** Create `utils/shortform/encode.ts`

- [ ] **Step 1: 작성**

Create `utils/shortform/encode.ts`:
```ts
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import type { VideoOpts } from './types'

export type FrameDrawer = (ctx: CanvasRenderingContext2D, tSec: number) => void
export type Progress = (p: number) => void

export function supportsWebCodecs(): boolean {
  return typeof window !== 'undefined' && 'VideoEncoder' in window && 'AudioEncoder' in window
}

// 메인: WebCodecs로 MP4 생성. 오디오는 audioBuffer 있으면 포함.
export async function encodeMp4(
  draw: FrameDrawer,
  audioBuffer: AudioBuffer | null,
  o: VideoOpts,
  onProgress?: Progress,
): Promise<Blob> {
  const canvas = new OffscreenCanvas(o.width, o.height)
  const ctx = canvas.getContext('2d')!
  const totalFrames = o.fps * o.durationSec

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width: o.width, height: o.height },
    audio: audioBuffer ? { codec: 'aac', sampleRate: audioBuffer.sampleRate, numberOfChannels: 1 } : undefined,
    fastStart: 'in-memory',
  })

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { throw e },
  })
  videoEncoder.configure({
    codec: 'avc1.42002a', width: o.width, height: o.height,
    bitrate: 7_000_000, framerate: o.fps,
  })

  for (let f = 0; f < totalFrames; f++) {
    const tSec = f / o.fps
    draw(ctx as unknown as CanvasRenderingContext2D, tSec)
    const frame = new VideoFrame(canvas, { timestamp: (f * 1e6) / o.fps, duration: 1e6 / o.fps })
    videoEncoder.encode(frame, { keyFrame: f % o.fps === 0 })
    frame.close()
    if (videoEncoder.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 0))
    onProgress?.(f / totalFrames * 0.9)
  }
  await videoEncoder.flush()

  if (audioBuffer) await encodeAudio(audioBuffer, o.durationSec, muxer)

  muxer.finalize()
  onProgress?.(1)
  const { buffer } = muxer.target as ArrayBufferTarget
  return new Blob([buffer], { type: 'video/mp4' })
}

async function encodeAudio(buf: AudioBuffer, durationSec: number, muxer: any) {
  const sampleRate = buf.sampleRate
  const ch = buf.getChannelData(0)
  const total = Math.min(ch.length, sampleRate * durationSec)
  const enc = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (e) => { throw e },
  })
  enc.configure({ codec: 'mp4a.40.2', sampleRate, numberOfChannels: 1, bitrate: 128_000 })
  const chunk = 1024
  for (let i = 0; i < total; i += chunk) {
    const n = Math.min(chunk, total - i)
    const data = new Float32Array(n)
    for (let j = 0; j < n; j++) {
      const k = i + j
      // 마지막 0.5s 페이드아웃
      const fade = k > total - sampleRate * 0.5 ? (total - k) / (sampleRate * 0.5) : 1
      data[j] = ch[k] * fade
    }
    const ad = new AudioData({ format: 'f32', sampleRate, numberOfFrames: n, numberOfChannels: 1, timestamp: (i / sampleRate) * 1e6, data })
    enc.encode(ad); ad.close()
  }
  await enc.flush()
}

// 폴백 1: MediaRecorder로 WebM(실시간 캡처).
export async function encodeWebm(
  drawToCanvas: (ctx: CanvasRenderingContext2D, tSec: number) => void,
  o: VideoOpts,
  onProgress?: Progress,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = o.width; canvas.height = o.height
  const ctx = canvas.getContext('2d')!
  const stream = canvas.captureStream(o.fps)
  const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' })
  const chunks: BlobPart[] = []
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  const done = new Promise<Blob>((res) => { rec.onstop = () => res(new Blob(chunks, { type: 'video/webm' })) })
  rec.start()
  const start = performance.now()
  await new Promise<void>((resolve) => {
    const loop = () => {
      const tSec = (performance.now() - start) / 1000
      if (tSec >= o.durationSec) { rec.stop(); resolve(); return }
      draw_(ctx, tSec); onProgress?.(tSec / o.durationSec); requestAnimationFrame(loop)
    }
    const draw_ = drawToCanvas
    requestAnimationFrame(loop)
  })
  return done
}

// 폴백 2: 정지 이미지(PNG) — 마지막 보루.
export function encodePoster(draw: (ctx: CanvasRenderingContext2D) => void, o: VideoOpts): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = o.width; canvas.height = o.height
  draw(canvas.getContext('2d')!)
  return new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png'))
}
```

- [ ] **Step 2: mp4-muxer API 시그니처 확인**

Run:
```bash
cd /Users/taoist/works/fortune
node -e "console.log(Object.keys(require('mp4-muxer')))"
```
Expected: `Muxer`, `ArrayBufferTarget` 존재. 다르면(버전차) import/메서드명을 패키지 README에 맞춰 수정.

- [ ] **Step 3: Commit**
```bash
git add utils/shortform/encode.ts
git commit -m "feat(shortform): encode pipeline (WebCodecs mp4 + webm/png fallback)"
```

---

## Task 6: 오케스트레이션 컴포저블

**Files:** Create `composables/useShortform.ts`

- [ ] **Step 1: 작성**

Create `composables/useShortform.ts`:
```ts
import { buildStoryboard } from '~/utils/shortform/storyboard'
import { illustrate } from '~/utils/shortform/illustrate'
import { drawFrame } from '~/utils/shortform/renderer'
import { encodeMp4, encodeWebm, encodePoster, supportsWebCodecs } from '~/utils/shortform/encode'
import { DEFAULT_OPTS, type RenderAssets, type StoryboardInput } from '~/utils/shortform/types'
import QRCode from 'qrcode'

async function loadImageData(url: string, w: number, h: number): Promise<ImageData | null> {
  try {
    const img = new Image(); img.crossOrigin = 'anonymous'; img.src = url
    await img.decode()
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const ctx = c.getContext('2d')!
    // cover
    const r = Math.max(w / img.width, h / img.height)
    const dw = img.width * r, dh = img.height * r
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
    return ctx.getContext ? ctx.getImageData(0, 0, w, h) : null
  } catch { return null }
}

async function makeQr(url: string): Promise<ImageBitmap | null> {
  try {
    const dataUrl = await QRCode.toDataURL('https://' + url, { margin: 1, color: { dark: '#0a0a0f', light: '#e8c97e' } })
    const img = new Image(); img.src = dataUrl; await img.decode()
    return await createImageBitmap(img)
  } catch { return null }
}

async function loadAudio(): Promise<AudioBuffer | null> {
  try {
    const res = await fetch('/shortform/audio/track1.mp3')
    if (!res.ok) return null
    const arr = await res.arrayBuffer()
    const ac = new (window.AudioContext || (window as any).webkitAudioContext)()
    return await ac.decodeAudioData(arr)
  } catch { return null }
}

export function useShortform() {
  const busy = ref(false)
  const progress = ref(0)
  const resultBlob = ref<Blob | null>(null)
  const resultUrl = ref<string | null>(null)

  async function generate(args: Parameters<typeof buildStoryboard>[0]) {
    busy.value = true; progress.value = 0; resultBlob.value = null
    try {
      const sb: StoryboardInput = buildStoryboard(args)
      const o = DEFAULT_OPTS
      // 일러스트 사진 → 비트맵
      let illustratedBitmap: ImageBitmap | null = null
      if (sb.partnerImageUrl) {
        const raw = await loadImageData(sb.partnerImageUrl, o.width, Math.round(o.width * 1.25))
        if (raw) illustratedBitmap = await createImageBitmap(illustrate(raw))
      }
      const assets: RenderAssets = {
        illustrated: null,
        qrBitmap: await makeQr(sb.siteUrl),
        logoBitmap: null,
      }
      const audio = await loadAudio()
      const draw = (ctx: CanvasRenderingContext2D, tSec: number) =>
        drawFrame(ctx, sb, illustratedBitmap, assets, tSec, o)

      let blob: Blob
      if (supportsWebCodecs()) {
        blob = await encodeMp4(draw, audio, o, (p) => (progress.value = p))
      } else if (typeof MediaRecorder !== 'undefined') {
        blob = await encodeWebm(draw, o, (p) => (progress.value = p))
      } else {
        blob = await encodePoster((ctx) => draw(ctx, o.durationSec - 1), o)
      }
      resultBlob.value = blob
      resultUrl.value = URL.createObjectURL(blob)
      progress.value = 1
      return blob
    } finally {
      busy.value = false
    }
  }

  return { busy, progress, resultBlob, resultUrl, generate }
}
```

- [ ] **Step 2: Commit**
```bash
git add composables/useShortform.ts
git commit -m "feat(shortform): orchestration composable (assets + encode dispatch)"
```

---

## Task 7: 공유 모달 컴포넌트

**Files:** Create `components/ShareVideoModal.vue`

- [ ] **Step 1: 작성**

Create `components/ShareVideoModal.vue`:
```vue
<script setup>
import { useShortform } from '~/composables/useShortform'
const props = defineProps({ args: { type: Object, required: true } })
const open = ref(false)
const { busy, progress, resultUrl, generate } = useShortform()

async function start() {
  open.value = true
  await generate(props.args)
}
function download() {
  if (!resultUrl.value) return
  const a = document.createElement('a')
  a.href = resultUrl.value
  a.download = 'taoist-gunghap.mp4'
  a.click()
}
async function share() {
  try {
    const blob = await (await fetch(resultUrl.value)).blob()
    const file = new File([blob], 'taoist-gunghap.mp4', { type: blob.type })
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] })
    else download()
  } catch { download() }
}
</script>

<template>
  <div>
    <button class="sf-btn" :disabled="busy" @click="start">🎬 영상으로 공유</button>
    <div v-if="open" class="sf-modal" @click.self="open = false">
      <div class="sf-card">
        <div v-if="busy">
          <p>영상 만드는 중… {{ Math.round(progress * 100) }}%</p>
          <div class="sf-bar"><div :style="{ width: progress * 100 + '%' }" /></div>
        </div>
        <template v-else-if="resultUrl">
          <video :src="resultUrl" controls autoplay loop playsinline class="sf-video" />
          <div class="sf-actions">
            <button @click="share">공유</button>
            <button @click="download">다운로드</button>
            <button @click="open = false">닫기</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sf-btn { background: var(--gold-primary, #c9a84c); color: #0a0a0f; border: none; border-radius: 12px; padding: 12px 20px; font-weight: 700; cursor: pointer; }
.sf-modal { position: fixed; inset: 0; background: rgba(0,0,0,.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.sf-card { background: #111118; border: 1px solid #2a2a35; border-radius: 16px; padding: 20px; width: min(360px, 92vw); color: #e8e4dc; text-align: center; }
.sf-video { width: 100%; border-radius: 12px; aspect-ratio: 9/16; background: #000; }
.sf-bar { height: 8px; background: #2a2a35; border-radius: 4px; overflow: hidden; margin-top: 10px; }
.sf-bar > div { height: 100%; background: #c9a84c; transition: width .2s; }
.sf-actions { display: flex; gap: 8px; justify-content: center; margin-top: 12px; }
.sf-actions button { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid #3a3a45; background: #1a1a22; color: #e8e4dc; cursor: pointer; }
</style>
```

- [ ] **Step 2: Commit**
```bash
git add components/ShareVideoModal.vue
git commit -m "feat(shortform): ShareVideoModal (button + progress + preview + share)"
```

---

## Task 8: 결과 페이지 연결 (gunghap 한정)

**Files:** Modify `pages/result/premium.vue`

- [ ] **Step 1: 연예인 이미지 URL 해석 확인**

Run:
```bash
cd /Users/taoist/works/fortune
grep -n "image\|photo\|celebs/" server/api/celebs.get.ts | head
grep -n "partner\|celeb\|image" pages/celeb-select.vue | head
```
Expected: 연예인 이미지 URL 필드명/경로 확정(예: `/celebs/<image_path>`). 결과 페이지에서 `partnerRef.id`(slug)로 이미지 URL을 구성하거나, celeb-select에서 넘어올 때 query/meta로 이미지 URL을 전달하는 방식 결정.

- [ ] **Step 2: 버튼 마운트(메인 컨텐츠 하단, gunghap & 결과 준비 시)**

`pages/result/premium.vue`의 결과 표시 영역(섹션 렌더 근처)에 추가:
```vue
<ClientOnly>
  <ShareVideoModal
    v-if="service === 'gunghap' && result && sections.length"
    :args="{
      selfName: displaySubject?.name || '',
      partnerName: partnerName || '',
      partnerImageUrl: partnerImageUrl,
      score: result?.score ?? null,
      sections: sections,
      zodiacGlyph: result?.glyph || '緣',
      siteUrl: 'taoist.co.kr',
    }"
  />
</ClientOnly>
```
`partnerImageUrl`은 Step 1에서 정한 방식으로 computed 추가(예: `const partnerImageUrl = computed(() => partnerRef.value.id ? \`/celebs/\${partnerRef.value.id}.jpg\` : null)` — 실제 경로 규약에 맞춰 확정). `ClientOnly`로 감싸 SSR/하이드레이션 충돌 방지(WebCodecs는 클라 전용).

- [ ] **Step 3: 로컬 dev 기동 + 수동 검증**

Run:
```bash
cd /Users/taoist/works/fortune && npm run dev
```
브라우저(Chrome 데스크톱)에서:
1. 연예인 궁합 결과까지 진입(결제 스킵 경로 사용 — 기존 dev 플로우).
2. "🎬 영상으로 공유" 클릭 → 진행바 → 미리보기 영상 재생 확인.
3. 다운로드 MP4 열어 20초/세로/사진(일러스트)·점수·키포인트·CTA·워터마크 표시 확인.
4. 점수 null 케이스(한줄평 중심)도 확인.
Expected: 서버 부하 없이 클라에서 MP4 생성. 콘솔 에러 없음.

- [ ] **Step 4: Safari/모바일 폴백 확인(가능 시)**

Safari(또는 WebCodecs 미지원 환경)에서 WebM/PNG 폴백으로라도 결과가 나오는지 확인.

- [ ] **Step 5: Commit**
```bash
git add pages/result/premium.vue
git commit -m "feat(shortform): mount ShareVideoModal on gunghap result (local only)"
```

---

## Self-Review 체크(작성자 확인 완료)
- 스펙 범위(궁합 한정·버튼 트리거·일러스트 필터·워터마크·음악·폴백·점수 분기) 모두 태스크에 매핑됨.
- 타입/함수명 일관(`buildStoryboard`/`drawFrame`/`illustrate`/`encodeMp4`/`useShortform`).
- 배포 단계 없음 — 로컬 dev 검증까지만(요구사항 반영). rsync/pm2 미포함.
- 미해결: 연예인 이미지 URL 규약(Task 8 Step1), mp4-muxer 버전 시그니처(Task5 Step2), 오디오 트랙 실제 파일(Task0 Step3) — 각 태스크에서 실측 확정.
