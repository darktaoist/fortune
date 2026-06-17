import QRCode from 'qrcode'
import { buildStoryboard, type BuildArgs } from '~/utils/shortform/storyboard'
import { illustrate } from '~/utils/shortform/illustrate'
import { drawFrame } from '~/utils/shortform/renderer'
import { encodeMp4, encodeWebm, encodePoster, supportsWebCodecs } from '~/utils/shortform/encode'
import { DEFAULT_OPTS, type RenderAssets, type StoryboardInput } from '~/utils/shortform/types'

// 연예인 사진 → 일러스트 처리된 '캔버스'(CanvasImageSource)로 반환.
// 같은 오리진이라 crossOrigin 불필요(걸면 오히려 로드 실패 가능). createImageBitmap 미사용(호환·taint 회피).
async function loadIllustratedPhoto(url: string, w: number, h: number): Promise<HTMLCanvasElement | null> {
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')!
    const r = Math.max(w / img.width, h / img.height) // cover
    ctx.drawImage(img, (w - img.width * r) / 2, (h - img.height * r) / 2, img.width * r, img.height * r)
    try {
      const id = ctx.getImageData(0, 0, w, h)
      ctx.putImageData(illustrate(id), 0, 0)
    } catch (e) {
      console.warn('[shortform] illustrate 스킵(원본 사용):', e)
    }
    return c
  } catch (e) {
    console.warn('[shortform] 사진 로드 실패:', url, e)
    return null
  }
}

async function makeQr(url: string): Promise<HTMLImageElement | null> {
  try {
    const dataUrl = await QRCode.toDataURL('https://' + url, {
      margin: 1,
      color: { dark: '#0a0a0f', light: '#f0d68c' },
    })
    const img = new Image()
    img.src = dataUrl
    await img.decode()
    return img
  } catch {
    return null
  }
}

// 캔버스는 이미 로드된 폰트만 사용 → 인코딩 전 필요한 패밀리/weight를 명시적으로 로드.
async function ensureFonts(): Promise<void> {
  try {
    if (typeof document === 'undefined' || !document.fonts) return
    await Promise.all([
      document.fonts.load("900 80px 'Noto Serif KR'"),
      document.fonts.load("700 80px 'Noto Serif KR'"),
      document.fonts.load("500 80px 'Noto Serif KR'"),
      document.fonts.load("700 40px 'Noto Sans KR'"),
      document.fonts.load("600 40px 'Noto Sans KR'"),
      document.fonts.load("500 40px 'Noto Sans KR'"),
    ])
    await document.fonts.ready
  } catch {
    /* 폴백 폰트로 진행 */
  }
}

async function loadAudio(): Promise<AudioBuffer | null> {
  try {
    const res = await fetch('/shortform/audio/track1.mp3')
    if (!res.ok || !(res.headers.get('content-type') || '').includes('audio')) return null
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
      console.log('[shortform] partnerImageUrl =', sb.partnerImageUrl, '| beats =', sb.beats.length, '| score =', sb.score)

      await ensureFonts()
      const photo = sb.partnerImageUrl ? await loadIllustratedPhoto(sb.partnerImageUrl, o.width, o.height) : null
      const assets: RenderAssets = {
        illustrated: null,
        qrBitmap: await makeQr(sb.siteUrl),
        logoBitmap: null,
      }
      const audio = await loadAudio()
      const draw = (ctx: CanvasRenderingContext2D, tSec: number) => drawFrame(ctx, sb, photo, assets, tSec, o)

      // 모바일은 물리 해상도/비트레이트를 낮춰 인코더 메모리 폭주(탭 강제종료)를 방지.
      // 레이아웃은 논리 1080×1920 그대로(ctx 스케일) → 화질만 720p로.
      const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
      const tune = isMobile ? { scale: 720 / o.width, bitrate: 3_500_000 } : {}
      console.log('[shortform] isMobile =', isMobile, '| tune =', tune)

      let blob: Blob | null = null
      if (supportsWebCodecs()) {
        try {
          blob = await encodeMp4(draw, audio, o, (p) => (progress.value = p), tune)
        } catch (e) {
          console.warn('[shortform] mp4 인코딩 실패, webm 폴백:', e)
        }
      }
      if (!blob && typeof MediaRecorder !== 'undefined') {
        try {
          progress.value = 0
          blob = await encodeWebm(draw, o, (p) => (progress.value = p), tune)
        } catch (e) {
          console.warn('[shortform] webm 인코딩 실패, png 폴백:', e)
        }
      }
      if (!blob) blob = await encodePoster((ctx) => draw(ctx, o.durationSec - 1), o)

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
