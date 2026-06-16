import { formatMyeongsikForPrompt, type Myeongsik } from './myeongsik'

/**
 * 프리미엄 운세 타입 레지스트리 — 한 프로그램으로 모든 타입을 커버하기 위한 설정.
 * 새 운세 추가 = 여기에 항목 하나 추가(+ i18n 섹션 제목). v1은 lifetime만 ready.
 *
 *  - system(lang): 논스트리밍 경로 — 구조화 JSON(섹션 키) 출력 강제(캐시 채움/폴백).
 *  - systemStream(lang): 스트리밍 경로 — 각 항목을 [[key]] 마커로 구분한 일반 텍스트 출력
 *    (섹션 완성 시점을 알 수 있어 점진 렌더 가능).
 */
export interface FortuneSection { key: string; titleKey: string; glyph: string }
export interface PromptCtx {
  myeongsik: Myeongsik | null
  partner?: Myeongsik | null
  lang: string
  myMbti?: string | null      // MBTI 궁합용(사주 미사용 타입 — 명식이 없어 이름/유형을 직접 전달)
  partnerMbti?: string | null
  myName?: string | null
  partnerName?: string | null
}
export interface FortuneType {
  key: string
  glyph: string
  tint: string
  needsPartner: boolean
  usesSaju: boolean
  ready: boolean
  maxTokens: number
  sections: FortuneSection[]
  system: (lang: string) => string
  systemStream?: (lang: string) => string
  buildPrompt: (ctx: PromptCtx) => string
}

const LANG_NAME: Record<string, string> = { ko: '한국어', en: 'English', ja: '日本語(자연스러운 일본어)', zh: '繁體中文(대만)' }
export const langName = (l: string) => LANG_NAME[l] || '한국어'

// 모든 프리미엄 프롬프트 공통 규칙 — 한자 단독 노출 금지(독자가 못 읽음).
const HANJA_RULE = '- 【매우 중요】 한자(漢字)를 음(독음) 없이 단독으로 절대 쓰지 마라. 사주의 간지·오행·십신 등 모든 한자는 출력 언어의 발음을 우선해 적는다. 한국어 본문이라면 반드시 한글 독음으로 쓰고(예: 癸水→계수, 巳火→사화, 甲木→갑목, 子午沖→자오충, 未土→미토, 壬子→임자, 食神→식신, 偏官→편관), 한자를 함께 보이려면 "계수(癸水)"처럼 한글을 앞세워 괄호로만 병기한다. 한국어 결과에 "癸水"·"巳火"·"子午沖"처럼 한자만 단독으로 노출되는 일이 절대 없어야 한다.'

// ── 평생운세 ──
const LIFE_SECTIONS: FortuneSection[] = [
  { key: 'saju', titleKey: 'premium.life.saju', glyph: '命' },
  { key: 'personality', titleKey: 'premium.life.personality', glyph: '性' },
  { key: 'health', titleKey: 'premium.life.health', glyph: '健' },
  { key: 'wealth', titleKey: 'premium.life.wealth', glyph: '財' },
  { key: 'relations', titleKey: 'premium.life.relations', glyph: '人' },
  { key: 'love', titleKey: 'premium.life.love', glyph: '緣' },
  { key: 'children', titleKey: 'premium.life.children', glyph: '子' },
  { key: 'career', titleKey: 'premium.life.career', glyph: '職' },
  { key: 'daeun', titleKey: 'premium.life.daeun', glyph: '運' },
  { key: 'caution', titleKey: 'premium.life.caution', glyph: '厄' },
  { key: 'gaewoon', titleKey: 'premium.life.gaewoon', glyph: '開' },
]

// 공유 페르소나 + 작성 규칙(출력 형식 제외).
const LIFE_PERSONA = [
  '당신은 30년 경력의 사주명리학 대가입니다. 주어진 명식(사주 4기둥·일간·신강신약·오행 분포·십신·대운)을 근거로,',
  '한 사람의 "평생운세"를 깊이 있고 따뜻한 상담조로, 한 권의 책처럼 풍부하게 풀어냅니다.',
  '',
  '[작성 규칙]',
  '- 반드시 주어진 명식의 실제 값(일간·오행 균형·신강신약·십신·대운 흐름)에 근거해 해석한다. 일반론 나열 금지.',
  '- 명식의 근거를 본문에 자연스럽게 녹여 설명한다(예: "토(土)가 셋으로 강하고 금(金)이 없어…", "정인이 둘이라 학문적 기질이…").',
  '- 점술 특유의 단정적이되 희망을 주는 어조. 구체적인 시기(대운 나이대·연도)와 분야를 짚어준다.',
  '- 각 항목은 따뜻한 상담조 산문으로 쓴다. 단락 사이는 빈 줄 하나로 구분. 마크다운·불릿·소제목·이모지 금지(단, daeun 항목의 대운별 라벨 줄은 예외).',
  '- 항목당 분량은 한국어 기준 약 400~700자(daeun·caution 항목은 제한 없이 더 충실하게). 다른 언어도 그에 상응하는 분량.',
  '- 항목 제목은 본문에 넣지 않는다(화면에 이미 표시됨).',
  HANJA_RULE,
].join('\n')

const LIFE_SECTION_GUIDE = [
  '11개 항목(반드시 이 순서):',
  '1) saju — 종합 사주 분석: 일간·오행 균형·신강신약·십신 구성을 종합한 원국 총평.',
  '2) personality — 타고난 성격과 기질: 일간의 본성과 십신이 빚어내는 기질·장단점.',
  '3) health — 건강운과 체질: 오행 과부족이 가리키는 장부·체질과 건강 주의 시기.',
  '4) wealth — 재물운과 부귀: 재성(財星)의 위치·강약과 재물 흐름, 재물에 유리한 대운.',
  '5) relations — 인간관계와 대인관계: 비겁·인성·관성이 만드는 관계 패턴과 귀인.',
  '6) love — 결혼운과 가정운: 배우자상·결혼 적령 시기·가정 분위기.',
  '7) children — 자녀운: 식상(食傷)으로 본 자녀와의 인연과 양육 방향.',
  '8) career — 직업 적성과 직업운: 십신·오행이 가리키는 적성 분야와 성취 시기.',
  '9) daeun — 정확한 10년 단위 대운 분석: [대운 작성법]을 따른다.',
  '10) caution — 특별히 주의해야 할 해(凶年): [흉년 작성법]을 따른다.',
  '11) gaewoon — 행운을 높이는 방법: 부족한 오행 보강·길한 방향·생활 속 실천법.',
  '',
  '[대운 작성법] 제공된 "대운(大運)" 목록의 모든 대운을 1차부터 마지막까지 빠짐없이 순서대로 다룬다.',
  '각 대운은 "N차 OO(한자/한글) 대운 · O세~O세 · OOOO~OOOO년" 형태의 라벨 한 줄로 시작하고(현재 대운이면 라벨 끝에 " (현재 대운)"),',
  '이어서 그 대운의 오행 기운, 원국과의 상호작용, 구체적 변화 시기를 2~4문장으로 풀이한다. 대운 사이에는 빈 줄을 둔다.',
  '',
  '[흉년 작성법] 충(沖)·형(刑) 등이 강하게 드는 구체 연도(예: 2026년 병오년)를 짚어,',
  '어느 기둥과 충돌해 무엇(건강·관계·직업·가정)을 주의해야 하는지 설명한다. 막연한 경고 금지 — 연도와 영역을 구체적으로.',
].join('\n')

const lifetime: FortuneType = {
  key: 'lifetime',
  glyph: '命',
  tint: 'gold',
  needsPartner: false,
  usesSaju: true,
  ready: true,
  maxTokens: 22000,
  sections: LIFE_SECTIONS,
  // 논스트리밍: JSON
  system: (lang) => [
    LIFE_PERSONA,
    '',
    '[출력 형식]',
    LIFE_SECTION_GUIDE,
    '',
    '- 위 11개 키(saju, personality, health, wealth, relations, love, children, career, daeun, caution, gaewoon)를 가진 JSON 객체 하나만 출력한다(그 외 텍스트 금지).',
    `- 모든 본문은 ${langName(lang)}로 작성한다.`,
  ].join('\n'),
  // 스트리밍: [[key]] 마커 구분 텍스트
  systemStream: (lang) => [
    LIFE_PERSONA,
    '',
    '[출력 형식]',
    LIFE_SECTION_GUIDE,
    '',
    '- 11개 항목을 위 순서대로 작성하되, 각 항목 본문 바로 앞에 정확히 한 줄로 마커를 둔다:',
    '  [[saju]] / [[personality]] / [[health]] / [[wealth]] / [[relations]] / [[love]] / [[children]] / [[career]] / [[daeun]] / [[caution]] / [[gaewoon]]',
    '- 마커는 대괄호 두 개로 감싼 영문 키만. 마커 외의 머리말·번호·JSON·마크다운은 쓰지 않는다(단, daeun 항목 내부의 대운별 라벨 줄은 허용).',
    `- 모든 본문은 ${langName(lang)}로 작성한다.`,
  ].join('\n'),
  buildPrompt: ({ myeongsik }) => [
    formatMyeongsikForPrompt(myeongsik),
    '',
    '위 명식을 바탕으로 이 사람의 평생운세를 11개 항목으로 깊이 있게 풀이하세요.',
  ].join('\n'),
}

// ── 올해의 운세(2026 병오년 세운) ──
const YEAR = 2026
const YEAR_GANJI = '병오년(丙午年)' // 2026 세운: 천간 丙火 · 지지 午火

const YEAR_SECTIONS: FortuneSection[] = [
  { key: 'overview', titleKey: 'premium.newyear.overview', glyph: '歲' },
  { key: 'wealth', titleKey: 'premium.newyear.wealth', glyph: '財' },
  { key: 'career', titleKey: 'premium.newyear.career', glyph: '職' },
  { key: 'love', titleKey: 'premium.newyear.love', glyph: '緣' },
  { key: 'health', titleKey: 'premium.newyear.health', glyph: '健' },
  { key: 'relations', titleKey: 'premium.newyear.relations', glyph: '人' },
  { key: 'study', titleKey: 'premium.newyear.study', glyph: '學' },
  { key: 'monthly', titleKey: 'premium.newyear.monthly', glyph: '月' },
  { key: 'caution', titleKey: 'premium.newyear.caution', glyph: '厄' },
  { key: 'wealthboost', titleKey: 'premium.newyear.wealthboost', glyph: '寶' },
  { key: 'gaewoon', titleKey: 'premium.newyear.gaewoon', glyph: '開' },
]

const YEAR_PERSONA = [
  '당신은 30년 경력의 사주명리학 대가입니다. 주어진 명식과 ' + YEAR + '년 ' + YEAR_GANJI + '의 세운(歲運)을 대조하여,',
  '이 사람의 "' + YEAR + '년 한 해의 운세"를 깊이 있고 따뜻한 상담조로, 분야별로 풍부하게 풀어냅니다.',
  '',
  '[작성 규칙]',
  '- 반드시 주어진 명식(일간·오행 균형·신강신약·십신·대운)과 ' + YEAR + '년 ' + YEAR_GANJI + ' 세운(천간 丙火, 지지 午火)의 상호작용에 근거해 해석한다. 일반론·뜬구름 금지.',
  '- 세운과 원국의 충(沖)·합(合)·생극(生剋)을 구체적으로 짚는다(예: "병오년의 화(火)가 사주의 금(金)을 극하여…", "현재 대운과 맞물려…").',
  '- 시기는 ' + YEAR + '년의 구체적 월(예: 4월·9월)로 짚는다.',
  '- 각 항목은 따뜻한 상담조 산문으로 쓴다. 단락 사이는 빈 줄 하나로 구분. 마크다운·불릿·소제목·이모지 금지(단, monthly 항목의 "N월:" 라벨 줄은 예외).',
  '- 항목당 분량은 한국어 기준 약 350~600자. 단 monthly는 12개월 각 3~4문장이라 전체에서 가장 긴 항목으로 약 1500자 이상 충실하게 작성한다(caution·wealthboost도 더 충실하게). 다른 언어도 그에 상응하는 분량.',
  '- 항목 제목은 본문에 넣지 않는다(화면에 이미 표시됨).',
  HANJA_RULE,
].join('\n')

const YEAR_SECTION_GUIDE = [
  '11개 항목(반드시 이 순서):',
  '1) overview — ' + YEAR + '년 종합 운세: 세운과 원국·대운의 상호작용을 종합한 한 해 총평, 상·하반기 기조.',
  '2) wealth — 재물운과 재테크 운: 재성(財星)과 세운의 작용, 유리한 시기(월)·분야·투자 방향.',
  '3) career — 직업운과 승진운: 관성·식상과 세운, 승진/이직/창업의 적기와 분야.',
  '4) love — 연애운과 결혼운: 배우자성·도화와 세운, 만남/관계발전/결혼 적기(월).',
  '5) health — 건강운: 오행 과부족과 세운 화(火)의 충돌이 가리키는 주의 장부·시기, 식이·운동.',
  '6) relations — 인간관계운: 비겁·인성·관성과 세운이 만드는 대인 흐름, 귀인·갈등 시기.',
  '7) study — 학업·자기계발운: 인성·식상과 세운, 유리한 학습 분야·자격/시험 적기.',
  '8) monthly — 월별 세부 운세: 1월부터 12월까지 12개 달을 빠짐없이, 각 달마다 "N월:"로 시작해 반드시 3~4문장으로 충실히 작성한다(한 줄 요약 금지). 각 달은 그 달의 재물·일·관계·건강 흐름, 해당 월운(月運)과 원국의 작용, 그리고 구체적인 조언까지 담는다. 달과 달 사이는 빈 줄 하나로 구분한다.',
  '9) caution — 주의해야 할 시기와 사건: 충/형이 강한 구체 월(예: 6월·11월)과 그 영역(건강·계약·관계), 피해야 할 방향.',
  '10) wealthboost — 재물운 극대화 비법: 유리한 투자 시기·분야, 부수입 아이템, 구체 실천 지침.',
  '11) gaewoon — 개운 방법과 실천 사항: 부족한 오행을 보강하는 색상·길방위·길일·길시, 음식·운동·생활 실천법을 구체적으로.',
].join('\n')

const YEAR_KEYS = 'overview, wealth, career, love, health, relations, study, monthly, caution, wealthboost, gaewoon'

const newyearType: FortuneType = {
  key: 'newyear',
  glyph: '秘',
  tint: 'purple',
  needsPartner: false,
  usesSaju: true,
  ready: true,
  maxTokens: 24000,
  sections: YEAR_SECTIONS,
  system: (lang) => [
    YEAR_PERSONA,
    '',
    '[출력 형식]',
    YEAR_SECTION_GUIDE,
    '',
    '- 위 11개 키(' + YEAR_KEYS + ')를 가진 JSON 객체 하나만 출력한다(그 외 텍스트 금지).',
    `- 모든 본문은 ${langName(lang)}로 작성한다.`,
  ].join('\n'),
  systemStream: (lang) => [
    YEAR_PERSONA,
    '',
    '[출력 형식]',
    YEAR_SECTION_GUIDE,
    '',
    '- 11개 항목을 위 순서대로 작성하되, 각 항목 본문 바로 앞에 정확히 한 줄로 마커를 둔다:',
    '  [[overview]] / [[wealth]] / [[career]] / [[love]] / [[health]] / [[relations]] / [[study]] / [[monthly]] / [[caution]] / [[wealthboost]] / [[gaewoon]]',
    '- 마커는 대괄호 두 개로 감싼 영문 키만. 마커 외의 머리말·번호·JSON·마크다운은 쓰지 않는다(단, monthly 항목 내부의 "N월:" 라벨 줄은 허용).',
    `- 모든 본문은 ${langName(lang)}로 작성한다.`,
  ].join('\n'),
  buildPrompt: ({ myeongsik }) => [
    formatMyeongsikForPrompt(myeongsik),
    '',
    '위 명식을 바탕으로 ' + YEAR + '년 ' + YEAR_GANJI + ' 한 해의 운세를 11개 항목으로 깊이 있게 풀이하세요.',
  ].join('\n'),
}

// ── 연예인·지인 궁합(두 명식 대조) ──
const GUNGHAP_SECTIONS: FortuneSection[] = [
  { key: 'score', titleKey: 'premium.gunghap.score', glyph: '緣' },
  { key: 'attraction', titleKey: 'premium.gunghap.attraction', glyph: '心' },
  { key: 'personality', titleKey: 'premium.gunghap.personality', glyph: '性' },
  { key: 'lovestyle', titleKey: 'premium.gunghap.lovestyle', glyph: '戀' },
  { key: 'conflict', titleKey: 'premium.gunghap.conflict', glyph: '和' },
  { key: 'ohaeng', titleKey: 'premium.gunghap.ohaeng', glyph: '五' },
  { key: 'future', titleKey: 'premium.gunghap.future', glyph: '婚' },
  { key: 'advice', titleKey: 'premium.gunghap.advice', glyph: '言' },
  { key: 'shorts', titleKey: 'premium.gunghap.shorts', glyph: '⚡' }, // 숏폼 영상용 JSON(화면엔 미표시)
]

const GUNGHAP_PERSONA = [
  '당신은 30년 경력의 사주명리학 대가입니다. 두 사람의 명식(사주 4기둥·일간·오행·십신·신강신약)을 대조하여,',
  '"본인"과 "상대방"의 궁합을 깊이 있고 따뜻한 상담조로, 한 편의 궁합 리포트처럼 풍부하게 풀어냅니다.',
  '',
  '[작성 규칙]',
  '- 반드시 두 명식의 실제 값(일간의 상생상극, 오행의 보완/충돌, 십신 관계, 신강신약 균형)에 근거해 해석한다. 일반론·별자리식 점괘 금지.',
  '- 두 사람을 각자의 이름(명식 라벨에 표시된 이름)으로 자연스럽게 지칭한다. 이름이 주어지지 않은 쪽만 "본인"으로 부른다.',
  '- 궁합의 근거를 본문에 자연스럽게 녹인다(예: "본인의 庚金을 상대방의 丁火가 단련시켜…", "두 사람 모두 토(土)가 약해 서로를 채워주기 어렵고…").',
  '- 점술 특유의 단정적이되 희망을 주는 어조. 좋은 점과 주의할 점을 균형 있게.',
  '- 각 항목은 따뜻한 상담조 산문으로 쓴다. 단락 사이는 빈 줄 하나로 구분. 마크다운·불릿·소제목·이모지 금지.',
  '- 항목당 분량은 한국어 기준 약 350~600자. 다른 언어도 그에 상응하는 분량.',
  '- 항목 제목은 본문에 넣지 않는다(화면에 이미 표시됨).',
  HANJA_RULE,
].join('\n')

const GUNGHAP_SECTION_GUIDE = [
  '9개 항목(반드시 이 순서):',
  '1) score — 궁합 총평과 궁합 지수: 두 명식의 전체 상성을 종합한 총평. 본문 안에 반드시 "궁합 지수: NN점"(0~100 정수) 한 표현을 자연스럽게 포함하고, 그 점수의 근거를 짚는다.',
  '2) attraction — 첫인상과 끌림: 두 일간·도화·십신이 만드는 초기 이끌림과 첫인상, 서로에게 느끼는 매력 포인트.',
  '3) personality — 성격 궁합: 두 사람의 기질이 부딪히는 지점과 맞물리는 지점, 일상에서의 합.',
  '4) lovestyle — 연애 스타일과 애정 표현: 사랑하는 방식의 차이와 공통점, 표현·소통의 결.',
  '5) conflict — 갈등 요소와 해법: 충(沖)·형(刑)·극(剋)이 가리키는 마찰 지점과 그것을 푸는 구체적 방법.',
  '6) ohaeng — 오행 상성: 두 사주의 오행 분포를 대조해 서로를 보완하는지/과하게 하는지, 부족한 기운을 채워주는 관계인지.',
  '7) future — 결혼·미래 전망: 장기적 인연의 가능성, 함께할 때 유리한 시기와 넘어야 할 고비.',
  '8) advice — 관계를 위한 조언: 두 사람이 오래 잘 지내기 위한 구체적 실천 조언(서로의 부족한 오행 보완·태도·소통법).',
  '9) shorts — 숏폼(릴스/쇼츠) 영상용 데이터. 산문이 아니라 정확히 아래 형식의 JSON 객체 한 개만 출력한다(다른 텍스트·마크다운 금지):',
  '   {"hook":"(궁금증을 자극하는 18자 이내 후크)","score":NN,"verdict":"(8자 이내 한마디 등급, 예: 천생연분/환상의 케미)","beats":[{"label":"(6자 이내 주제)","text":"(70~120자, 2~3문장으로 구체적·풍부하게)"} … 정확히 5개],"catchphrase":"(20자 이내 마무리 카피)"}',
  '   beats 5개는 끌림·성격·연애·갈등·미래를 위 1~8 내용과 일관되게 다룬다. 각 text는 영상에서 2~3줄로 보이도록 충분히 구체적이고 흥미롭게(추상적 한 줄 금지, 실제 특징·예시 포함). score는 1)의 궁합 지수와 동일한 정수. 모든 문구는 출력 언어로.',
].join('\n')

const GUNGHAP_KEYS = 'score, attraction, personality, lovestyle, conflict, ohaeng, future, advice, shorts'

const gunghapType: FortuneType = {
  key: 'gunghap',
  glyph: '緣',
  tint: 'rose',
  needsPartner: true,
  usesSaju: true,
  ready: true,
  maxTokens: 16000,
  sections: GUNGHAP_SECTIONS,
  system: (lang) => [
    GUNGHAP_PERSONA,
    '',
    '[출력 형식]',
    GUNGHAP_SECTION_GUIDE,
    '',
    '- 위 9개 키(' + GUNGHAP_KEYS + ')를 가진 JSON 객체 하나만 출력한다(그 외 텍스트 금지). shorts 값은 9)에 정의된 형식의 JSON을 문자열로 담는다.',
    `- 모든 본문은 ${langName(lang)}로 작성한다.`,
  ].join('\n'),
  systemStream: (lang) => [
    GUNGHAP_PERSONA,
    '',
    '[출력 형식]',
    GUNGHAP_SECTION_GUIDE,
    '',
    '- 9개 항목을 위 순서대로 작성하되, 각 항목 본문 바로 앞에 정확히 한 줄로 마커를 둔다:',
    '  [[score]] / [[attraction]] / [[personality]] / [[lovestyle]] / [[conflict]] / [[ohaeng]] / [[future]] / [[advice]] / [[shorts]]',
    '- 마커는 대괄호 두 개로 감싼 영문 키만. 마커 외의 머리말·번호·마크다운은 쓰지 않는다.',
    '- 예외: [[shorts]] 마커 다음 본문만은 9)에 정의된 JSON 객체 한 개로 출력한다(그 JSON 외 텍스트 금지).',
    `- 모든 본문은 ${langName(lang)}로 작성한다.`,
  ].join('\n'),
  buildPrompt: ({ myeongsik, partner }) => {
    const meName = (myeongsik?.user?.name || '').trim() || '본인'
    const youName = (partner?.user?.name || '').trim() || '상대방'
    return [
      formatMyeongsikForPrompt(myeongsik, meName),
      '',
      partner ? formatMyeongsikForPrompt(partner, youName) : '[상대방 명식] 정보 없음',
      '',
      `위 두 사람(${meName} ↔ ${youName})의 명식을 대조하여 궁합을 8개 항목으로 깊이 있게 풀이하세요.`,
      `본문에서 두 사람을 반드시 실제 이름 "${meName}", "${youName}"으로 지칭하세요(예: "${youName}님의 일간은…", "${meName}님과 ${youName}님은…").`,
    ].join('\n')
  },
}

// ── MBTI 궁합(사주 미사용, 16유형 기반) ──
const MBTI_SECTIONS: FortuneSection[] = [
  { key: 'score', titleKey: 'premium.mbtigh.score', glyph: '合' },
  { key: 'firstmeet', titleKey: 'premium.mbtigh.firstmeet', glyph: '遇' },
  { key: 'personality', titleKey: 'premium.mbtigh.personality', glyph: '性' },
  { key: 'communication', titleKey: 'premium.mbtigh.communication', glyph: '言' },
  { key: 'love', titleKey: 'premium.mbtigh.love', glyph: '戀' },
  { key: 'datestyle', titleKey: 'premium.mbtigh.datestyle', glyph: '約' },
  { key: 'conflict', titleKey: 'premium.mbtigh.conflict', glyph: '和' },
  { key: 'growth', titleKey: 'premium.mbtigh.growth', glyph: '成' },
  { key: 'future', titleKey: 'premium.mbtigh.future', glyph: '來' },
  { key: 'advice', titleKey: 'premium.mbtigh.advice', glyph: '導' },
]

const MBTI_PERSONA = [
  '당신은 MBTI 16유형과 연애·관계 심리에 정통하면서, MBTI 커뮤니티의 밈과 화법까지 꿰뚫고 있는 인기 연애 상담가입니다.',
  '두 사람의 MBTI 유형을 바탕으로, 친한 친구가 신나서 "둘이 진짜 이런 케미야!" 하고 썰을 풀어주듯 생생하고 재미있게, 그러나 통찰은 깊게 궁합을 풀어냅니다.',
  '',
  '[작성 규칙]',
  '- 반드시 두 유형의 실제 인지기능과 성향(E/I 에너지, S/N 인식, T/F 판단, J/P 생활양식)에 근거해 해석한다. 별자리식 두루뭉술한 일반론 금지.',
  '- 드라이한 특성 나열을 금지한다. 대신 "카페에서 메뉴 고를 때", "여행 계획 짤 때", "싸우고 난 다음 날" 같은 구체적이고 생생한 일상 장면으로 보여준다.',
  '- 위트와 공감을 곁들인다. MBTI 특유의 유명한 밈·클리셰(예: P의 즉흥성, T의 팩폭, F의 공감, J의 계획표)를 센스 있게 활용하되 유치하지 않게.',
  '- 두 사람을 반드시 주어진 실제 이름으로 지칭한다. 이름이 없는 쪽만 "본인"으로 부른다.',
  '- 좋은 케미와 삐걱대는 지점을 균형 있게. 단정적이되 희망과 재미를 준다.',
  '- 각 항목은 생동감 있는 상담조 산문으로 쓴다. 단락 사이는 빈 줄 하나로 구분. 마크다운·불릿·소제목·이모지 금지.',
  '- 항목당 분량은 한국어 기준 약 450~700자로 충분히 풍부하게. 다른 언어도 그에 상응하는 분량.',
  '- 항목 제목은 본문에 넣지 않는다(화면에 이미 표시됨).',
  HANJA_RULE,
].join('\n')

const MBTI_SECTION_GUIDE = [
  '10개 항목(반드시 이 순서):',
  '1) score — 궁합 총평과 궁합 지수: 두 유형 조합을 한마디로 요약하는 위트 있는 총평. 본문 안에 반드시 "궁합 지수: NN점"(0~100 정수)을 자연스럽게 포함하고, 왜 그 점수인지 핵심을 짚는다.',
  '2) firstmeet — 첫 만남의 케미: 두 사람이 처음 마주쳤을 때 서로를 어떻게 인식하고 끌리는지, 첫인상과 호감 포인트.',
  '3) personality — 성격 케미: 두 유형의 본질적 기질이 만나 어떻게 맞물리고 어긋나는지, 닮은 점과 정반대인 점.',
  '4) communication — 대화와 소통: 정보를 주고받고 대화하는 방식(S/N, T/F)의 차이. 말이 잘 통하는 순간과 답답해지는 순간.',
  '5) love — 연애와 애정 표현: 사랑을 표현하고 확인받고 싶어하는 방식의 차이(F/T, J/P). 서로의 애정 언어가 통하는지.',
  '6) datestyle — 데이트와 일상 케미: 함께 시간을 보낼 때의 그림. 데이트 계획·여행·주말을 보내는 스타일이 어떻게 만나는지(재미 위주로 생생하게).',
  '7) conflict — 갈등 포인트와 해법: 이 조합이 꼭 한 번은 부딪히는 지점과, 그걸 슬기롭게 푸는 구체적 방법.',
  '8) growth — 서로에게 주는 영향: 두 사람이 만나 서로를 어떻게 성장시키고 채워주는지, 함께라서 더 나아지는 부분.',
  '9) future — 장기 전망: 시간이 지날수록 이 관계가 어떻게 깊어지거나 시험받는지, 오래갈 인연인지에 대한 통찰.',
  '10) advice — 관계 꿀팁: 두 사람이 더 잘 지내기 위한, 각 유형 맞춤의 구체적이고 실용적인 꿀팁.',
].join('\n')

const MBTI_KEYS = 'score, firstmeet, personality, communication, love, datestyle, conflict, growth, future, advice'

const mbtiType: FortuneType = {
  key: 'mbti',
  glyph: '合',
  tint: 'blue',
  needsPartner: true,
  usesSaju: false,
  ready: true,
  maxTokens: 22000,
  sections: MBTI_SECTIONS,
  system: (lang) => [
    MBTI_PERSONA,
    '',
    '[출력 형식]',
    MBTI_SECTION_GUIDE,
    '',
    '- 위 6개 키(' + MBTI_KEYS + ')를 가진 JSON 객체 하나만 출력한다(그 외 텍스트 금지).',
    `- 모든 본문은 ${langName(lang)}로 작성한다.`,
  ].join('\n'),
  systemStream: (lang) => [
    MBTI_PERSONA,
    '',
    '[출력 형식]',
    MBTI_SECTION_GUIDE,
    '',
    '- 10개 항목을 위 순서대로 작성하되, 각 항목 본문 바로 앞에 정확히 한 줄로 마커를 둔다:',
    '  [[score]] / [[firstmeet]] / [[personality]] / [[communication]] / [[love]] / [[datestyle]] / [[conflict]] / [[growth]] / [[future]] / [[advice]]',
    '- 마커는 대괄호 두 개로 감싼 영문 키만. 마커 외의 머리말·번호·JSON·마크다운은 쓰지 않는다.',
    `- 모든 본문은 ${langName(lang)}로 작성한다.`,
  ].join('\n'),
  buildPrompt: ({ myMbti, partnerMbti, myName, partnerName }) => {
    const me = (myName || '').trim() || '본인'
    const you = (partnerName || '').trim() || '상대방'
    const meType = (myMbti || '').toUpperCase() || '미상'
    const youType = (partnerMbti || '').toUpperCase() || '미상'
    return [
      `${me}의 MBTI 유형: ${meType}`,
      `${you}의 MBTI 유형: ${youType}`,
      '',
      `위 두 사람(${me} ↔ ${you})의 MBTI 유형을 바탕으로 궁합을 6개 항목으로 깊이 있게 풀이하세요.`,
      `본문에서 두 사람을 반드시 실제 이름 "${me}", "${you}"으로 지칭하세요.`,
    ].join('\n')
  },
}

// ── 후속(구조만, v1 미동작) ──
const placeholder = (key: string, glyph: string, tint: string, needsPartner: boolean, usesSaju: boolean): FortuneType => ({
  key, glyph, tint, needsPartner, usesSaju, ready: false, maxTokens: 12000,
  sections: [], system: () => '', buildPrompt: () => '',
})

export const FORTUNE_TYPES: Record<string, FortuneType> = {
  lifetime,
  // 프리미엄 올해의 운세(2026 병오년) — 무료 'tojung'과 분리된 별도 키. 레거시도 둘 다 서비스했음.
  newyear: newyearType,
  gunghap: gunghapType,    // 연예인 궁합
  mbti: mbtiType,          // MBTI 궁합
}

/** 구조화 출력 JSON 스키마를 섹션 키로부터 생성(논스트리밍용). */
export function sectionSchema(t: FortuneType): Record<string, any> {
  const properties: Record<string, any> = {}
  for (const s of t.sections) properties[s.key] = { type: 'string' }
  return {
    type: 'object',
    additionalProperties: false,
    required: t.sections.map((s) => s.key),
    properties,
  }
}
