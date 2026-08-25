// 띠별 오늘의 운세(/daily, /fortune/today/*) 검색 메타 공용 유틸.
//
// 네이버 "띠별오늘의운세" SERP에서 경쟁 결과는 전부 제목 앞에 날짜가 박혀 있는데
// 타오운세만 없어서 "언제 것인지 알 수 없는 결과"로 보인다(CTR 0.2%). 그래서 제목에
// 날짜를 넣는데 — URL은 고정이고 내용만 매일 바뀌므로 **매일 재수집될 때만** 이득이다.
// 주 1회 수집이면 오늘 검색결과에 지난주 날짜가 뜨고, 날짜가 없는 것보다 나쁘다.
//
// 그래서 기본은 off(날짜 없는 "매일 갱신" 문구). 네이버 서치어드바이저 → 수집 현황에서
// /daily 마지막 수집일이 1일 이내로 확인되면 이 상수만 true 로 바꾸면 된다.
export const DATED_TITLES = false

// 제목·설명문용 짧은 날짜(연도 없음). 화면 표기(dateLabel)는 연도를 포함하지만
// SERP 제목은 글자수가 곧 노출량이라 "8월 24일" 형태로 줄인다.
export function shortDate(isoDate: string, locale: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return ''
  if (locale === 'en') return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })
  if (locale === 'ja' || locale === 'zh') return `${m}月${d}日`
  return `${m}월 ${d}일` // i18n-ok: ko fallback (en/ja/zh 위에서 처리)
}
