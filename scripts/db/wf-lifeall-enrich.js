export const meta = {
  name: 'lifeall-enrich',
  description: '평생운세(lifeall) 60개 번호를 한국어 정본으로 풍부하게 집필하고 en/ja/zh로 현지화하여 DB에 직접 기록',
  whenToUse: 'lifeall 테이블 콘텐츠 보강(평생운세 재작업)',
  phases: [
    { title: 'Korean', detail: '번호별 한국어 정본 집필 (원본 프로필 보존·확장)' },
    { title: 'Translate', detail: 'en/ja/zh 현지화 후 DB 기록' },
  ],
}

const ALL_NUMS = Array.from({ length: 60 }, (_, i) => String(i).padStart(3, '0'))
// args: optional array of num strings to limit the run (smoke test). Default = all 60.
const NUMS = Array.isArray(args) && args.length ? args.map((n) => String(n).padStart(3, '0')) : ALL_NUMS
const KO_DONE = new Set(['000', '001'])       // 파일럿으로 이미 한국어 완성
const C_SKIP = new Set(['007', '008', '009'])  // 중국어(c) 행이 없는 번호

const STYLE = [
  '[타오운세 평생운세 집필 규칙]',
  '- 평생운세는 사주 번호(num)별 「타고난 평생 운명」 풀이다. 특정 연도가 아니라 일생 전체를 본다.',
  '- 6개 항목: sajuwoon(타고난 성품·기질 총평), earlyyear(초년운), middleyear(중년운), lastyear(말년운), lovewealth(애정·재물운), jobhealth(직업·건강운).',
  '- 각 항목은 독립 카드로 렌더링되며 제목(사주 총평/초년운/중년운/말년운/애정·재물운/직업·건강운)과 한자 글자가 화면에 이미 표시된다. 따라서 본문에 제목을 반복하지 말고 곧바로 풀이로 시작한다.',
  '- 분량: 각 항목 한국어 기준 450~950자, 3~4개 단락. 단락 사이는 빈 줄 하나로 구분한다.',
  '- 문체: 현대적이고 따뜻한 상담조의 존댓말 산문. 점술 특유의 어조는 살리되 옛 표현·오탈자는 자연스러운 현대어로 다듬는다(예: 곱하나→고단하나, 탕비→탕진).',
  '- 이모지·마크다운·불릿·소제목 금지. 순수 문단 산문만 쓴다.',
  '- 가장 중요: 원본의 「번호별 정체성」을 반드시 보존한다 — 성격 특질, 등장하는 구체적 나이(예: 17세·25세·34세), 적합 직업, 조심할 건강 부위, 길흉 방향. 같은 번호는 늘 같은 사람을 가리키므로 핵심 사실을 바꾸지 말고 확장·심화만 한다.',
  '- 원본이 모호한 옛 표현이면 뜻을 살려 현대적 조언으로 풀되 핵심 메시지는 유지한다.',
].join('\n')

const DBRULE = [
  '[DB 기록 규칙]',
  '- supabase의 execute_sql 도구로 직접 기록한다(없으면 도구 검색으로 찾는다).',
  '- 작은따옴표 이스케이프 사고를 막기 위해 반드시 PostgreSQL 달러 인용 $f$...$f$ 를 쓴다. 텍스트 안 단락 구분은 실제 줄바꿈(빈 줄)으로 넣는다. 본문에 $f$ 문자열이 등장하지 않게 한다.',
  '- 형식(한 번의 UPDATE로 6개 항목 모두 기록):',
  "  UPDATE lifeall SET sajuwoon=$f$...$f$, earlyyear=$f$...$f$, middleyear=$f$...$f$, lastyear=$f$...$f$, lovewealth=$f$...$f$, jobhealth=$f$...$f$ WHERE num='NNN' AND nation='X';",
  '- 기록 직후 SELECT length(sajuwoon),length(earlyyear),length(middleyear),length(lastyear),length(lovewealth),length(jobhealth) FROM lifeall WHERE num=NNN AND nation=X 로 6개 길이가 모두 0이 아닌지 검증한다. 0이거나 누락이면 1회 재기록한다.',
].join('\n')

const KO_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['sajuwoon', 'earlyyear', 'middleyear', 'lastyear', 'lovewealth', 'jobhealth'],
  properties: {
    sajuwoon: { type: 'string' }, earlyyear: { type: 'string' }, middleyear: { type: 'string' },
    lastyear: { type: 'string' }, lovewealth: { type: 'string' }, jobhealth: { type: 'string' },
  },
}

const STATUS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['nation', 'written', 'lens'],
  properties: {
    nation: { type: 'string' },
    written: { type: 'boolean' },
    lens: { type: 'array', items: { type: 'number' } },
  },
}

const LANGS = [['e', 'English'], ['j', '日本語(자연스러운 일본어)'], ['c', '简体中文']]

const results = await pipeline(
  NUMS,
  // ── Stage A: 한국어 정본 ──
  async (num) => {
    if (KO_DONE.has(num)) {
      const ko = await agent(
        [
          `평생운세 번호 ${num}의 한국어 정본은 이미 lifeall 테이블(nation='k')에 완성되어 있다.`,
          `supabase execute_sql 로 다음을 실행해 6개 항목을 그대로 읽어 와라:`,
          `SELECT sajuwoon, earlyyear, middleyear, lastyear, lovewealth, jobhealth FROM lifeall WHERE num='${num}' AND nation='k';`,
          `읽은 6개 항목 텍스트를 한 글자도 바꾸지 말고 그대로 구조화 출력으로 반환하라. 다시 쓰거나 DB에 기록하지 마라.`,
        ].join('\n'),
        { label: `ko:${num}`, phase: 'Korean', schema: KO_SCHEMA },
      )
      return ko ? { num, ko } : null
    }
    const ko = await agent(
      [
        `너는 타오운세의 평생운세 카피라이터다. 평생운세 번호 ${num}의 한국어 정본을 새로 집필한다.`,
        '',
        `1) 먼저 supabase execute_sql 로 원본(요약형 옛 데이터)을 읽어라:`,
        `SELECT sajuwoon, earlyyear, middleyear, lastyear, lovewealth, jobhealth FROM lifeall_backup WHERE num='${num}' AND nation='k';`,
        '',
        '2) 그 원본의 번호별 정체성(성격 특질·구체적 나이·적합 직업·건강 부위·길흉 방향)을 반드시 보존하면서, 아래 규칙에 따라 현대적이고 풍부한 산문으로 확장·심화하라.',
        '',
        STYLE,
        '',
        '3) 완성한 6개 항목을 ' + DBRULE,
        `   → nation='k', num='${num}' 행을 UPDATE 한다.`,
        '',
        '4) 마지막으로 6개 항목 텍스트(단락 구분은 \\n\\n 두 줄바꿈 포함)를 구조화 출력으로 반환하라. 반환 텍스트는 DB에 기록한 것과 동일해야 한다.',
      ].join('\n'),
      { label: `ko:${num}`, phase: 'Korean', schema: KO_SCHEMA },
    )
    return ko ? { num, ko } : null
  },
  // ── Stage B: en/ja/zh 현지화 ──
  async (r, num) => {
    if (!r || !r.ko) return null
    const koJson = JSON.stringify(r.ko)
    const targets = LANGS.filter(([code]) => !(code === 'c' && C_SKIP.has(num)))
    const trans = await parallel(
      targets.map(([code, name]) => () =>
        agent(
          [
            `다음은 타오운세 평생운세 번호 ${num}의 한국어 정본(JSON, 6개 항목)이다:`,
            koJson,
            '',
            `이를 ${name}로 현지화 번역하라. 규칙:`,
            '- 직역이 아니라 그 언어 사용자가 자연스럽게 읽히는 운세 상담조 산문으로 옮긴다.',
            '- 모든 사실(성격·구체적 나이·직업·건강 부위·방향)과 뉘앙스를 빠짐없이 보존한다. 임의로 줄이거나 덧붙이지 않는다.',
            '- 한국어 원문의 단락 구조(빈 줄 구분)를 그대로 유지한다. 이모지·마크다운 금지.',
            '- 항목 제목은 본문에 넣지 않는다(카드 제목은 화면에 이미 있음).',
            '',
            DBRULE,
            `→ nation='${code}', num='${num}' 행을 UPDATE 한다(6개 항목 모두).`,
            '',
            `기록·검증 후 { nation:'${code}', written, lens(6개 길이 배열) } 를 구조화 출력으로 반환하라.`,
          ].join('\n'),
          { label: `${code}:${num}`, phase: 'Translate', schema: STATUS_SCHEMA },
        ),
      ),
    )
    return { num, trans: trans.filter(Boolean) }
  },
)

const done = results.filter(Boolean)
const koCount = done.length
const transCount = done.reduce((a, r) => a + (r.trans ? r.trans.length : 0), 0)
log(`한국어 정본 ${koCount}/60, 번역 기록 ${transCount}건 완료`)
return { koCount, transCount, nums: done.map((r) => r.num) }
