export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3)
export const easeInOutQuad = (x: number) => {
  const t = clamp01(x)
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}
// 구간 [a,b]에서의 정규화 진행도(0..1)
export const seg = (tSec: number, a: number, b: number) => clamp01((tSec - a) / (b - a))
