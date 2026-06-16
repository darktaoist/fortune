// 연예인 사진을 풀스크린 배경용으로 시네마틱하게 가공(법적 완충 a안: 원본 그대로가 아닌 스타일화).
// posterize(색 단계 축소) + 골드 듀오톤을 회색조와 블렌드해 얼굴 인식성은 유지하면서 양식화.
const GOLD_SHADOW = [18, 16, 12]
const GOLD_LIGHT = [240, 214, 150]

export function illustrate(src: ImageData, levels = 8, duotoneMix = 0.55): ImageData {
  const { data, width, height } = src
  const out = new ImageData(width, height)
  const step = 255 / (levels - 1)
  for (let i = 0; i < data.length; i += 4) {
    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    const q = Math.round(luma / step) * step // posterize
    const t = q / 255
    // 듀오톤
    const dr = GOLD_SHADOW[0] + (GOLD_LIGHT[0] - GOLD_SHADOW[0]) * t
    const dg = GOLD_SHADOW[1] + (GOLD_LIGHT[1] - GOLD_SHADOW[1]) * t
    const db = GOLD_SHADOW[2] + (GOLD_LIGHT[2] - GOLD_SHADOW[2]) * t
    // 회색조(디테일 유지)와 블렌드
    out.data[i] = q * (1 - duotoneMix) + dr * duotoneMix
    out.data[i + 1] = q * (1 - duotoneMix) + dg * duotoneMix
    out.data[i + 2] = q * (1 - duotoneMix) + db * duotoneMix
    out.data[i + 3] = data[i + 3]
  }
  return out
}
