import QRCode from 'qrcode'
import { buildStoryboard, type BuildArgs } from '~/utils/shortform/storyboard'
import { illustrate } from '~/utils/shortform/illustrate'
import { drawFrame } from '~/utils/shortform/renderer'
import { encodeMp4, encodeWebm, encodePoster, supportsWebCodecs } from '~/utils/shortform/encode'
import { DEFAULT_OPTS, type RenderAssets, type StoryboardInput } from '~/utils/shortform/types'

// 이미지 URL → cover 맞춤 ImageData (CORS 안전; 같은 오리진의 /celebs 사용).
async function loadImageData(url: string, w: number, h: number): Promise<ImageData | null> {
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = url
    await img.decode()
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')!
    const r = Math.max(w / img.width, h / img.height) // cover
    const dw = img.width * r
    const dh = img.height * r
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
    return ctx.getImageData(0, 0, w, h)
  } catch {
    return null
  }
}

async function makeQr(url: string): Promise<ImageBitmap | null> {
  try {
    const dataUrl = await QRCode.toDataURL('https://' + url, {
      margin: 1,
      color: { dark: '#0a0a0f', light: '#e8c97e' },
    })
    const img = new Image()
    img.src = dataUrl
    await img.decode()
    return await createImageBitmap(img)
  } catch {
    return null
  }
}

async function loadAudio(): Promise<AudioBuffer | null> {
  try {
    const res = await fetch('/shortform/audio/track1.mp3')
    if (!res.ok) return null
    const arr = await res.arrayBuffer()
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ac = new AC()
    return await ac.decodeAudioData(arr)
  } catch {
    return null
  }
}

export function useShortform() {
  const busy = ref(false)
  const progress = ref(0)
  const resultBlob = ref<Blob | null>(null)
  const resultUrl = ref<string | null>(null)
  const errorMsg = ref('')

  async function generate(args: BuildArgs) {
    busy.value = true
    progress.value = 0
    resultBlob.value = null
    errorMsg.value = ''
    if (resultUrl.value) {
      URL.revokeObjectURL(resultUrl.value)
      resultUrl.value = null
    }
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
    } catch (e) {
      errorMsg.value = e instanceof Error ? e.message : String(e)
      return null
    } finally {
      busy.value = false
    }
  }

  return { busy, progress, resultBlob, resultUrl, errorMsg, generate }
}
