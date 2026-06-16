// 연예인 사진을 '공식 사진' 느낌에서 벗어나게: 색 단계 축소(posterize) + 골드 듀오톤.
// 입력/출력 모두 ImageData. 순수 변환(법적 완충 a안).
const GOLD_SHADOW = [26, 22, 14] // 어두운 톤
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
