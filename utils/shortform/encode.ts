import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import type { VideoOpts } from './types'

export type FrameDrawer = (ctx: CanvasRenderingContext2D, tSec: number) => void
export type Progress = (p: number) => void

export function supportsWebCodecs(): boolean {
  return typeof window !== 'undefined' && 'VideoEncoder' in window
}

const VIDEO_CODECS = ['avc1.42E01F', 'avc1.4D401F', 'avc1.42E028', 'avc1.640028', 'avc1.42001E']

async function pickVideoCodec(o: VideoOpts): Promise<string | null> {
  for (const codec of VIDEO_CODECS) {
    try {
      const s = await VideoEncoder.isConfigSupported({
        codec,
        width: o.width,
        height: o.height,
        bitrate: 6_000_000,
        framerate: o.fps,
      })
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
): Promise<Blob> {
  if (typeof VideoEncoder === 'undefined') throw new Error('VideoEncoder unavailable')
  const codec = await pickVideoCodec(o)
  if (!codec) throw new Error('no supported H.264 encoder config')

  const includeAudio =
    !!audioBuffer && 'AudioEncoder' in window && (await audioSupported(audioBuffer.sampleRate))

  const canvas = new OffscreenCanvas(o.width, o.height)
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D
  const totalFrames = o.fps * o.durationSec

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width: o.width, height: o.height },
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
  videoEncoder.configure({ codec, width: o.width, height: o.height, bitrate: 6_000_000, framerate: o.fps })

  for (let f = 0; f < totalFrames; f++) {
    if (encoderError) throw encoderError
    const tSec = f / o.fps
    draw(ctx, tSec)
    const frame = new VideoFrame(canvas, { timestamp: (f * 1e6) / o.fps, duration: 1e6 / o.fps })
    videoEncoder.encode(frame, { keyFrame: f % o.fps === 0 })
    frame.close()
    onProgress?.((f / totalFrames) * 0.9)
    // 매 프레임 이벤트 루프에 양보 → 진행바 갱신 + 인코더 큐 배압 완화.
    if (f % 4 === 0 || videoEncoder.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 0))
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
export async function encodeWebm(draw: FrameDrawer, o: VideoOpts, onProgress?: Progress): Promise<Blob> {
  if (typeof MediaRecorder === 'undefined') throw new Error('MediaRecorder unavailable')
  const canvas = document.createElement('canvas')
  canvas.width = o.width
  canvas.height = o.height
  const ctx = canvas.getContext('2d')!
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
