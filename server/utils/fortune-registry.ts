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

// ── 후속(구조만, v1 미동작) ──
const placeholder = (key: string, glyph: string, tint: string, needsPartner: boolean, usesSaju: boolean): FortuneType => ({
  key, glyph, tint, needsPartner, usesSaju, ready: false, maxTokens: 12000,
  sections: [], system: () => '', buildPrompt: () => '',
})

export const FORTUNE_TYPES: Record<string, FortuneType> = {
  lifetime,
  tojung: placeholder('tojung', '秘', 'purple', false, true),   // 신년운세(2026)
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
