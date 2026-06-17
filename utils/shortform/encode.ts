import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import type { VideoOpts } from './types'

export type FrameDrawer = (ctx: CanvasRenderingContext2D, tSec: number) => void
export type Progress = (p: number) => void

// 인코딩 튜닝: 모바일은 물리 해상도/비트레이트를 낮춰 메모리·인코더 부하를 줄인다.
// scale<1 이면 렌더러는 논리 1080×1920 좌표를 그대로 쓰되 물리 캔버스만 축소(ctx 변환).
export interface EncodeTune {
  scale?: number // 물리 해상도 배율(기본 1)
  bitrate?: number // 비디오 비트레이트(기본 6Mbps)
}

// H.264는 짝수 폭/높이 필요.
function evenScaled(v: number, scale: number): number {
  return Math.max(2, Math.round((v * scale) / 2) * 2)
}

export function supportsWebCodecs(): boolean {
  return typeof window !== 'undefined' && 'VideoEncoder' in window
}

const VIDEO_CODECS = ['avc1.42E01F', 'avc1.4D401F', 'avc1.42E028', 'avc1.640028', 'avc1.42001E']

async function pickVideoCodec(width: number, height: number, fps: number, bitrate: number): Promise<string | null> {
  for (const codec of VIDEO_CODECS) {
    try {
      const s = await VideoEncoder.isConfigSupported({ codec, width, height, bitrate, framerate: fps })
      if (s.supported) return codec
    } catch {
      /* try next */
    }
  }
  return null
}

async function audioSupported(sampleRate: number): Promise<boolean> {
  try {
    const s = await AudioEncoder.isConfigSupported({
      codec: 'mp4a.40.2',
      sampleRate,
      numberOfChannels: 1,
      bitrate: 128_000,
    })
    return !!s.supported
  } catch {
    return false
  }
}

// 메인: WebCodecs로 MP4 생성. 실패 시 throw → 호출부가 폴백.
export async function encodeMp4(
  draw: FrameDrawer,
  audioBuffer: AudioBuffer | null,
  o: VideoOpts,
  onProgress?: Progress,
  tune: EncodeTune = {},
): Promise<Blob> {
  if (typeof VideoEncoder === 'undefined') throw new Error('VideoEncoder unavailable')
  const scale = tune.scale ?? 1
  const bitrate = tune.bitrate ?? 6_000_000
  // 물리(인코딩) 해상도 — 모바일은 축소. 렌더러는 논리 o.width/height 좌표를 유지.
  const pw = scale === 1 ? o.width : evenScaled(o.width, scale)
  const ph = scale === 1 ? o.height : evenScaled(o.height, scale)
  const sx = pw / o.width
  const sy = ph / o.height

  const codec = await pickVideoCodec(pw, ph, o.fps, bitrate)
  if (!codec) throw new Error('no supported H.264 encoder config')

  const includeAudio =
    !!audioBuffer && 'AudioEncoder' in window && (await audioSupported(audioBuffer.sampleRate))

  const canvas = new OffscreenCanvas(pw, ph)
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D
  const totalFrames = o.fps * o.durationSec

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width: pw, height: ph },
    audio: includeAudio
      ? { codec: 'aac', sampleRate: audioBuffer!.sampleRate, numberOfChannels: 1 }
      : undefined,
    fastStart: 'in-memory',
  })

  let encoderError: unknown = null
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      encoderError = e
    },
  })
  videoEncoder.configure({ codec, width: pw, height: ph, bitrate, framerate: o.fps })

  for (let f = 0; f < totalFrames; f++) {
    if (encoderError) throw encoderError
    const tSec = f / o.fps
    // 논리 좌표(1080×1920)를 물리 캔버스에 맞게 스케일. setTransform이 매 프레임 변환을 초기화.
    if (sx !== 1 || sy !== 1) ctx.setTransform(sx, 0, 0, sy, 0, 0)
    draw(ctx, tSec)
    const frame = new VideoFrame(canvas, { timestamp: (f * 1e6) / o.fps, duration: 1e6 / o.fps })
    videoEncoder.encode(frame, { keyFrame: f % o.fps === 0 })
    frame.close()
    onProgress?.((f / totalFrames) * 0.9)
    // 배압: 큐가 깊어지면 인코더가 따라잡을 때까지 대기(모바일 메모리 폭주·탭 강제종료 방지).
    if (videoEncoder.encodeQueueSize > 8) {
      while (videoEncoder.encodeQueueSize > 4) {
        await new Promise((r) => setTimeout(r, 8))
        if (encoderError) throw encoderError
      }
    } else if (f % 4 === 0) {
      await new Promise((r) => setTimeout(r, 0)) // 진행바 갱신용 양보
    }
  }
  await videoEncoder.flush()
  if (encoderError) throw encoderError

  if (includeAudio) await encodeAudio(audioBuffer!, o.durationSec, muxer)

  muxer.finalize()
  onProgress?.(1)
  const { buffer } = muxer.target as ArrayBufferTarget
  return new Blob([buffer], { type: 'video/mp4' })
}

async function encodeAudio(buf: AudioBuffer, durationSec: number, muxer: Muxer<ArrayBufferTarget>) {
  const sampleRate = buf.sampleRate
  const ch = buf.getChannelData(0)
  const total = Math.min(ch.length, Math.floor(sampleRate * durationSec))
  let err: unknown = null
  const enc = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (e) => {
      err = e
    },
  })
  enc.configure({ codec: 'mp4a.40.2', sampleRate, numberOfChannels: 1, bitrate: 128_000 })
  const chunk = 1024
  const fadeSamples = sampleRate * 0.5
  for (let i = 0; i < total; i += chunk) {
    if (err) throw err
    const n = Math.min(chunk, total - i)
    const data = new Float32Array(n)
    for (let j = 0; j < n; j++) {
      const k = i + j
      const fade = k > total - fadeSamples ? (total - k) / fadeSamples : 1
      data[j] = ch[k] * fade
    }
    const ad = new AudioData({
      format: 'f32',
      sampleRate,
      numberOfFrames: n,
      numberOfChannels: 1,
      timestamp: (i / sampleRate) * 1e6,
      data,
    })
    enc.encode(ad)
    ad.close()
  }
  await enc.flush()
  if (err) throw err
}

// 폴백 1: MediaRecorder로 WebM(실시간 캡처).
export async function encodeWebm(draw: FrameDrawer, o: VideoOpts, onProgress?: Progress, tune: EncodeTune = {}): Promise<Blob> {
  if (typeof MediaRecorder === 'undefined') throw new Error('MediaRecorder unavailable')
  const scale = tune.scale ?? 1
  const pw = scale === 1 ? o.width : evenScaled(o.width, scale)
  const ph = scale === 1 ? o.height : evenScaled(o.height, scale)
  const sx = pw / o.width
  const sy = ph / o.height
  const canvas = document.createElement('canvas')
  canvas.width = pw
  canvas.height = ph
  const ctx = canvas.getContext('2d')!
  if (sx !== 1 || sy !== 1) ctx.setTransform(sx, 0, 0, sy, 0, 0) // 캡처 캔버스 고정 변환
  const stream = canvas.captureStream(o.fps)
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm'
  const rec = new MediaRecorder(stream, { mimeType: mime })
  const chunks: BlobPart[] = []
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  const done = new Promise<Blob>((res) => {
    rec.onstop = () => res(new Blob(chunks, { type: 'video/webm' }))
  })
  rec.start()
  const start = performance.now()
  await new Promise<void>((resolve) => {
    const loop = () => {
      const tSec = (performance.now() - start) / 1000
      if (tSec >= o.durationSec) {
        rec.stop()
        resolve()
        return
      }
      draw(ctx, tSec)
      onProgress?.(tSec / o.durationSec)
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  })
  return done
}

// 폴백 2: 정지 이미지(PNG) — 마지막 보루.
export function encodePoster(draw: (ctx: CanvasRenderingContext2D) => void, o: VideoOpts): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = o.width
  canvas.height = o.height
  draw(canvas.getContext('2d')!)
  return new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png'))
}
