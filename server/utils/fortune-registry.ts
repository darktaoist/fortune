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
export interface PromptCtx { myeongsik: Myeongsik; partner?: Myeongsik | null; lang: string }
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
  '- 항목당 분량은 한국어 기준 약 350~600자(monthly·caution·wealthboost는 더 충실하게). 다른 언어도 그에 상응하는 분량.',
  '- 항목 제목은 본문에 넣지 않는다(화면에 이미 표시됨).',
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
  '8) monthly — 월별 세부 운세: 1월부터 12월까지 각 달을 "N월: 내용" 형식으로 한 줄씩, 빠짐없이 12줄. 그 달의 핵심(재물·직업·관계·건강 중)을 한 문장으로.',
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
  maxTokens: 20000,
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

// ── 후속(구조만, v1 미동작) ──
const placeholder = (key: string, glyph: string, tint: string, needsPartner: boolean, usesSaju: boolean): FortuneType => ({
  key, glyph, tint, needsPartner, usesSaju, ready: false, maxTokens: 12000,
  sections: [], system: () => '', buildPrompt: () => '',
})

export const FORTUNE_TYPES: Record<string, FortuneType> = {
  lifetime,
  // 프리미엄 올해의 운세(2026 병오년) — 무료 'tojung'과 분리된 별도 키. 레거시도 둘 다 서비스했음.
  newyear: newyearType,
  gunghap: placeholder('gunghap', '緣', 'rose', true, true),    // 연예인 궁합
  mbti: placeholder('mbti', '合', 'blue', true, false),         // MBTI 궁합
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
