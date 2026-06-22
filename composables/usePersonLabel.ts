// 표시용 사람 이름 보정.
// DB people.name 에는 과거 데이터에서 "김유탁(음력)" / "홍길동(양력)" 처럼
// 한국어 양력/음력 접미사가 일부 행에만 박혀 있다(일관성 없음).
// 비한국어 화면에서 한글 접미사가 노출되는 문제(P3)를 표시 단계에서만 제거한다.
// DB는 변경하지 않는다.
const CAL_SUFFIX_RE = /\s*[（(](?:양력|음력|윤달|평달|음력\s*윤달|solar|lunar(?:\s*leap)?|陽曆|陰曆|太陽暦|太陰暦|農曆|农历)[）)]\s*$/i

export function stripCalSuffix(name?: string | null): string {
  if (!name) return ''
  return name.replace(CAL_SUFFIX_RE, '').trim()
}

export function usePersonLabel() {
  return { stripCalSuffix }
}
