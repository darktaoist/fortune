export const meta = {
  name: 'lifeall-translate-gaps',
  description: '평생운세 번역 누락분(e/j/c)을 기존 한국어 정본에서 번역해 채움 (schema 없이 견고하게)',
  phases: [{ title: 'TranslateGaps', detail: '누락 (num,nation)별 한국어→대상언어 번역 후 DB 기록' }],
}

// args: ["034:e", "033:j", "033:c", ...] 형식의 누락 (num:nation) 목록
const PAIRS = Array.isArray(args) ? args.map(String) : []
const NAME = { e: 'English', j: '日本語(자연스러운 일본어)', c: '简体中文' }

const DBRULE = [
  'supabase의 execute_sql 도구로 직접 기록한다(없으면 도구 검색).',
  '작은따옴표 이스케이프 사고를 막기 위해 반드시 PostgreSQL 달러 인용 $f$...$f$ 를 쓴다. 단락 구분은 실제 줄바꿈(빈 줄). 본문에 $f$ 문자열이 등장하지 않게 한다.',
].join(' ')

const out = await parallel(
  PAIRS.map((pair) => () => {
    const [num, code] = pair.split(':')
    const lang = NAME[code] || code
    return agent(
      [
        `평생운세 번호 ${num}의 ${lang} 행(nation='${code}')이 아직 옛 내용이다. 한국어 정본을 ${lang}로 현지화 번역해 그 행을 덮어쓴다.`,
        '',
        `1) supabase execute_sql 로 한국어 정본을 읽어라:`,
        `SELECT sajuwoon, earlyyear, middleyear, lastyear, lovewealth, jobhealth FROM lifeall WHERE num='${num}' AND nation='k';`,
        '',
        `2) 6개 항목을 자연스러운 ${lang} 운세 상담조 산문으로 현지화하라. 직역이 아니라 그 언어 사용자가 자연스럽게 읽히도록 옮기되, 모든 사실(성격·구체적 나이·직업·건강 부위·길흉 방향)과 뉘앙스를 빠짐없이 보존한다. 한국어 단락 구조(빈 줄 구분)를 그대로 유지한다. 이모지·마크다운·소제목·항목 제목은 넣지 않는다.`,
        '',
        `3) ${DBRULE}`,
        `   다음 형식으로 UPDATE 한다(6개 항목 모두):`,
        `   UPDATE lifeall SET sajuwoon=$f$...$f$, earlyyear=$f$...$f$, middleyear=$f$...$f$, lastyear=$f$...$f$, lovewealth=$f$...$f$, jobhealth=$f$...$f$ WHERE num='${num}' AND nation='${code}';`,
        '',
        `4) 기록 후 SELECT length(sajuwoon),length(earlyyear),length(middleyear),length(lastyear),length(lovewealth),length(jobhealth) FROM lifeall WHERE num='${num}' AND nation='${code}'; 로 6개 길이가 모두 0이 아닌지 검증하라. 0이거나 누락이면 1회 재기록한다.`,
        '',
        `완료하면 "${num}:${code} ok lens=[...]" 한 줄로만 답하라(구조화출력 도구는 쓰지 말 것).`,
      ].join('\n'),
      { label: `${code}:${num}`, phase: 'TranslateGaps' },
    )
  }),
)

log(`번역 보강 시도 ${PAIRS.length}건 완료`)
return { attempted: PAIRS.length, replies: out.filter(Boolean).length }
