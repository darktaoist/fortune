import { Converter } from 'opencc-js'

/**
 * 중국어 출력 번체(zh-TW) 보정.
 *
 * 사이트는 zh-TW(번체, 대만·홍콩)로 서비스하는데 AI(DeepSeek 등)가 언어 지시를
 * 무시하고 간체로 응답하는 경우가 있다. 결정적 변환으로 항상 번체를 보장한다.
 *
 * to:'tw' = 글자 단위 정자 변환(문맥 기반 모호 글자 처리: 头发→頭髮, 发财→發財).
 * twp(어휘 치환)는 연애 맥락 对象→物件 같은 오치환이 있어 운세 산문엔 부적합 → tw 사용.
 */
const _s2t = Converter({ from: 'cn', to: 'tw' })

/** lang==='zh'일 때만 간체→번체 변환. 그 외 언어·빈값은 원본 그대로. */
export function toTraditional(text: string, lang: string): string {
  if (lang !== 'zh' || !text) return text
  return _s2t(text)
}
