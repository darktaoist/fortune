#!/usr/bin/env node
/**
 * MBTI×MBTI 궁합 프로그래매틱 SEO 콘텐츠 사전 생성 배치.
 *
 *   136개 조합(C(16,2)+16) × 4언어(ko/en/ja/zh) = 544행을 DeepSeek로 생성해
 *   public.mbti_compatibility 에 UPSERT 한다.
 *
 * 무명(無名) SEO 버전: 개인 이름 없이 유형명(INTJ/ISTP)만으로 지칭.
 *   (개인화 궁합 프롬프트 server/utils/fortune-registry.ts 의 mbtiType 은 그대로 두고,
 *    여기에 SEO 전용 무명 프롬프트를 별도로 인라인한다 — TS라 직접 import 불가.)
 *
 * zh 는 모델이 간체를 뱉으므로 저장 직전 opencc(cn→tw)로 번체 변환 필수.
 *
 * 사용법:
 *   node scripts/db/seed-mbti.mjs --sample            # INTJ-ISTP × ko 1건, 콘솔 출력만(DB 미기록)
 *   node scripts/db/seed-mbti.mjs --sample zh         # INTJ-ISTP × zh 미리보기(번체 확인)
 *   node scripts/db/seed-mbti.mjs --sample en enfp-intj
 *   node scripts/db/seed-mbti.mjs --only intj-istp    # 한 조합 4언어 실제 기록
 *   node scripts/db/seed-mbti.mjs --lang ko           # ko 136건만
 *   node scripts/db/seed-mbti.mjs --resume            # 이미 있는 (pair,lang) 건너뛰고 빈 것만
 *   node scripts/db/seed-mbti.mjs                     # 전체 544건
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'
import * as OpenCC from 'opencc-js'
import Anthropic from '@anthropic-ai/sdk'

const ROOT = resolve(import.meta.dirname, '../..')

// ── env ───────────────────────────────────────────────────────────────────
function envVal(name) {
  const env = readFileSync(resolve(ROOT, '.env'), 'utf8')
  const line = env.split('\n').find((l) => l.startsWith(name + '='))
  if (!line) return ''
  return line.slice(name.length + 1).trim()
}
const DATABASE_URL = envVal('SUPABASE_DATABASE_URL')
const DEEPSEEK_API_KEY = envVal('DEEPSEEK_API_KEY')
const DEEPSEEK_MODEL = envVal('DEEPSEEK_MODEL') || 'deepseek-chat'
const ANTHROPIC_API_KEY = envVal('ANTHROPIC_API_KEY')
const CLAUDE_MODEL = envVal('PREMIUM_MODEL') || 'claude-sonnet-4-6'
if (!DEEPSEEK_API_KEY) { console.error('x DEEPSEEK_API_KEY missing in .env'); process.exit(1) }
const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null

function pgConfig() {
  const m = DATABASE_URL.match(/^postgres(?:ql)?:\/\/(.*)@([^/]+)\/(.+)$/)
  if (!m) throw new Error('Could not parse SUPABASE_DATABASE_URL')
  const ci = m[1].indexOf(':')
  return {
    user: m[1].slice(0, ci), password: m[1].slice(ci + 1),
    host: m[2].slice(0, m[2].lastIndexOf(':')), port: 5432, database: m[3], // session pooler
    ssl: { rejectUnauthorized: false },
  }
}

// ── zh 번체 변환 (server/utils/zh.ts 와 동일: cn→tw) ─────────────────────────
const _s2t = OpenCC.Converter({ from: 'cn', to: 'tw' })
const toTraditional = (text, lang) => (lang === 'zh' && text ? _s2t(text) : text)

// ── 조합 목록 (136개, 알파벳순) ─────────────────────────────────────────────
const TYPES = [
  'ENFJ', 'ENFP', 'ENTJ', 'ENTP', 'ESFJ', 'ESFP', 'ESTJ', 'ESTP',
  'INFJ', 'INFP', 'INTJ', 'INTP', 'ISFJ', 'ISFP', 'ISTJ', 'ISTP',
] // 이미 알파벳 오름차순
const PAIRS = []
for (let i = 0; i < TYPES.length; i++)
  for (let j = i; j < TYPES.length; j++) PAIRS.push(`${TYPES[i]}-${TYPES[j]}`) // 'ENFJ-INTJ'
const LANGS = ['ko', 'en', 'ja', 'zh']

// ── 언어 지시문 (fortune-registry.ts LANG_DIRECTIVE 와 동일) ──────────────────
const LANG_DIRECTIVE = {
  ko: '- 모든 본문은 한국어로 작성한다.',
  en: '- 【LANGUAGE — TOP PRIORITY】 Write EVERY sentence of the body in natural English ONLY. Do NOT output any Korean / Hangul characters (가-힣) anywhere. Translate every personality term into English. 한국어(한글)로 절대 쓰지 말 것.',
  ja: '- 【言語 — 最優先】本文はすべて必ず自然な日本語だけで書く。韓国語・ハングル（가-힣）は一文字たりとも使わない。性格用語もすべて日本語に訳す。※絶対に韓国語で書かないこと。한국어(한글)로 절대 쓰지 말 것.',
  zh: '- 【語言 — 最優先】正文一律使用自然的繁體中文（台灣）書寫。絕對不可出現任何韓文／諺文（가-힣），一個字都不行。所有性格用語都譯成中文。※絕對不要用韓文書寫。한국어(한글)로 절대 쓰지 말 것.',
}
const langDirective = (l) => LANG_DIRECTIVE[l] || LANG_DIRECTIVE.ko

// 언어 누수 방지의 핵심: 한국어 시스템 프롬프트로 비-ko 출력을 요청하면 모델이 한국어로 샌다
// (실측: deepseek-v4-flash 비-ko 누수 빈발). 따라서 en/ja/zh 는 시스템·유저 프롬프트 자체를
// 해당 언어로 작성한다(한국어 앵커 제거). ko 만 위의 풍부한 한국어 프롬프트를 그대로 쓴다.
// zh 출력의 번체화는 그 위에 convertZh(opencc)로 한 번 더 보장한다.
const LOC_SYSTEM = {
  en: `You are a popular love & relationships counselor, deeply versed in the 16 MBTI types and fluent in MBTI community memes and tone. Given two MBTI types, explain their compatibility vividly and entertainingly — like a close friend excitedly saying "these two have THIS kind of chemistry!" — yet with genuine depth.
Rules: ground everything in both types' real cognitive functions and traits (E/I energy, S/N perception, T/F judging, J/P lifestyle); never vague horoscope-style generalities; show it through concrete everyday scenes ("when picking what to order at a cafe", "planning a trip", "the morning after a fight") instead of dry trait lists; use witty, on-point MBTI memes/cliches without being childish; refer to people only by type name (e.g. "INTJ tends to…", "when ISTP meets INTJ…"), never invent personal names; treat it as "this type pairing in general", not a specific couple; balance the great chemistry and the friction, decisive but warm and fun; flowing counselor prose, blank line between paragraphs, NO markdown/bullets/subheadings/emoji; ~300-500 words per item; do not repeat the section title in the body; write ONLY in natural English, never any Korean/Hangul (가-힣).`,
  ja: `あなたは MBTI16タイプと恋愛・関係心理に精通し、MBTIコミュニティのミームや話し方にも詳しい人気の恋愛カウンセラーです。2つのMBTIタイプをもとに、親友が興奮して「この二人、こういうケミだよ！」と語るように、生き生きと面白く、しかし洞察は深く相性を解説します。
ルール：必ず両タイプの実際の認知機能と傾向（E/Iエネルギー、S/N知覚、T/F判断、J/P生活様式）に基づく。星座占いのような曖昧な一般論は禁止。乾いた特性の羅列ではなく「カフェで注文を選ぶ時」「旅行の計画を立てる時」「喧嘩した翌朝」のような具体的で生き生きとした日常場面で見せる。MBTI特有のミーム・あるあるをセンス良く使い、子どもっぽくしない。人物は名前ではなくタイプ名（例「INTJは…」「ISTPとINTJが出会うと…」）でのみ指す。架空の人名は作らない。特定のカップルではなく「このタイプの組み合わせ一般」として扱う。良いケミとぎくしゃくする点をバランス良く、断定的だが希望と面白さを与える。生き生きとしたカウンセラー口調の散文で、段落間は空行1つ、マークダウン・箇条書き・小見出し・絵文字は禁止。各項目350〜600字。本文に項目タイトルを入れない。本文はすべて自然な日本語のみで書き、韓国語・ハングル（가-힣）は一文字も使わない。`,
  zh: `你是一位精通 MBTI 16型與戀愛關係心理、也熟悉 MBTI 社群迷因與說話風格的人氣戀愛諮商師。請根據兩種 MBTI 類型，像好友興奮地分享「這兩個人在一起會是這種化學反應！」那樣，生動有趣卻又洞察深刻地解析契合度。
規則：一切必依兩型的真實認知功能與傾向（E/I 能量、S/N 認知、T/F 判斷、J/P 生活方式）；禁止星座式的籠統概論；不要乾巴巴地列特質，而要用「在咖啡廳選餐時」「規劃旅行時」「吵架後的隔天早上」這類具體生動的日常場景呈現；用機智、到位的 MBTI 迷因／老梗，但別幼稚；只用類型名（如「INTJ 傾向…」「當 ISTP 遇上 INTJ…」）指稱人物，不要虛構人名；當作「這個類型組合的通則」而非特定情侶；好的默契與摩擦點要兼顧，肯定但帶著希望與趣味；用生動的諮商口吻散文書寫，段落間空一行，禁止 markdown／條列／小標題／emoji；每段約 350〜600 字；正文不要重複項目標題；全文一律使用自然的繁體中文（台灣），絕對不出現任何韓文／諺文（가-힣）。`,
}
const LOC_GUIDE = {
  en: `Output exactly these 11 items in this order — 1) score: a witty one-line overall verdict for this pairing; include a 0-100 integer compatibility score in the body (e.g. "Compatibility 78/100") and pin down why. 2) firstmeet: first-impression chemistry. 3) personality: how their core temperaments mesh and clash. 4) communication: differences in how they exchange info and talk (S/N, T/F). 5) love: how they express and seek affection (F/T, J/P). 6) datestyle: dates, trips, weekends together. 7) conflict: the friction point this pair always hits, and a concrete way through it. 8) growth: how they grow and complete each other. 9) future: how the bond deepens or is tested over time. 10) advice: concrete, type-tailored tips. 11) shorts: NOT prose — output exactly one JSON object as a string: {"hook":"(curiosity hook, <=18 chars-equivalent)","score":NN,"verdict":"(short grade)","beats":[{"label":"(short topic)","text":"(70-120 chars, 2-3 vivid sentences)"} … exactly 5 covering first-impression/personality/communication/love/conflict],"catchphrase":"(closing line)"}. score equals the integer from item 1. All text in English.`,
  ja: `次の11項目をこの順で正確に出力する — 1) score：この組み合わせを一言で要約する機知に富んだ総評。本文に0〜100の整数の相性スコアを含め（例「相性スコア78点」）、なぜその点数かを突く。2) firstmeet：第一印象のケミ。3) personality：本質的な気質の噛み合いとぶつかり。4) communication：情報のやり取りと会話の仕方の違い（S/N、T/F）。5) love：愛情の表現と求め方の違い（F/T、J/P）。6) datestyle：デート・旅行・週末の過ごし方。7) conflict：必ず一度はぶつかる点と、その具体的な乗り越え方。8) growth：互いをどう成長させ補い合うか。9) future：時間とともに深まるか試されるか。10) advice：タイプ別の具体的なコツ。11) shorts：散文ではなく、次の形式のJSONを文字列で1つだけ出力：{"hook":"(興味を引くフック)","score":NN,"verdict":"(短い評価)","beats":[{"label":"(短い見出し)","text":"(70〜120字、具体的に2〜3文)"} … 第一印象・性格・コミュニケーション・恋愛・葛藤を扱う正確に5個],"catchphrase":"(締めの一言)"}。scoreは項目1の整数と同じ。全文日本語。`,
  zh: `依此順序正確輸出以下11個項目 — 1) score：用一句機智的話總評這個組合；正文中自然帶入0〜100整數的契合指數（例「契合指數78分」）並點出原因。2) firstmeet：初次見面的化學反應。3) personality：本質氣質如何契合與衝突。4) communication：交換資訊與交談方式的差異（S/N、T/F）。5) love：表達與渴求愛意的方式差異（F/T、J/P）。6) datestyle：約會、旅行、週末的相處。7) conflict：這對組合必然會碰上的摩擦點與化解之道。8) growth：如何使彼此成長與互補。9) future：隨時間加深還是受考驗。10) advice：依類型量身的具體建議。11) shorts：不是散文，只輸出一個如下格式的JSON字串：{"hook":"(勾起好奇的鉤子)","score":NN,"verdict":"(簡短評級)","beats":[{"label":"(簡短主題)","text":"(70〜120字，2〜3句具體生動)"} … 涵蓋初見/性格/溝通/戀愛/衝突，正好5個],"catchphrase":"(收尾金句)"}。score等於項目1的整數。全文繁體中文。`,
}
const LOC_USER = {
  en: (a, b) => `Type A: ${a}\nType B: ${b}\nExplain the compatibility of these two MBTI types in 11 items, in depth. Refer to them only by type name ("${a}", "${b}"), not personal names — this is about the type pairing in general.${a === b ? ` (Same type ${a} paired together.)` : ''}`,
  ja: (a, b) => `タイプA：${a}\nタイプB：${b}\nこの2つのMBTIタイプの相性を11項目で深く解説してください。人物は名前ではなくタイプ名（「${a}」「${b}」）でのみ指し、特定の個人ではなくこのタイプの組み合わせ一般を扱います。${a === b ? `（同じタイプ${a}同士の組み合わせ）` : ''}`,
  zh: (a, b) => `類型A：${a}\n類型B：${b}\n請以11個項目深入解析這兩種MBTI類型的契合度。只用類型名（「${a}」「${b}」）指稱，而非個人姓名 — 談的是這個類型組合的通則。${a === b ? `（同類型${a}彼此的組合）` : ''}`,
}

// ── 무명 SEO 페르소나 (fortune-registry.ts MBTI_PERSONA 기반, 이름 지칭만 교체) ──
const MBTI_PERSONA = [
  '당신은 MBTI 16유형과 연애·관계 심리에 정통하면서, MBTI 커뮤니티의 밈과 화법까지 꿰뚫고 있는 인기 연애 상담가입니다.',
  '두 MBTI 유형을 바탕으로, 친한 친구가 신나서 "이 둘이 만나면 진짜 이런 케미야!" 하고 썰을 풀어주듯 생생하고 재미있게, 그러나 통찰은 깊게 궁합을 풀어냅니다.',
  '',
  '[작성 규칙]',
  '- 반드시 두 유형의 실제 인지기능과 성향(E/I 에너지, S/N 인식, T/F 판단, J/P 생활양식)에 근거해 해석한다. 별자리식 두루뭉술한 일반론 금지.',
  '- 드라이한 특성 나열을 금지한다. 대신 "카페에서 메뉴 고를 때", "여행 계획 짤 때", "싸우고 난 다음 날" 같은 구체적이고 생생한 일상 장면으로 보여준다.',
  '- 위트와 공감을 곁들인다. MBTI 특유의 유명한 밈·클리셰(예: P의 즉흥성, T의 팩폭, F의 공감, J의 계획표)를 센스 있게 활용하되 유치하지 않게.',
  '- 특정 개인이 아니라 "이 유형 조합 일반"을 다룬다. 사람을 이름이 아니라 유형명(예: "INTJ는…", "ISTP와 INTJ가 만나면…")으로만 지칭한다. 가상의 인물 이름을 지어내지 않는다.',
  '- 좋은 케미와 삐걱대는 지점을 균형 있게. 단정적이되 희망과 재미를 준다.',
  '- 각 항목은 생동감 있는 상담조 산문으로 쓴다. 단락 사이는 빈 줄 하나로 구분. 마크다운·불릿·소제목·이모지 금지.',
  '- 항목당 분량은 한국어 기준 약 450~700자로 충분히 풍부하게. 다른 언어도 그에 상응하는 분량.',
  '- 항목 제목은 본문에 넣지 않는다(화면에 이미 표시됨).',
  '- 한자를 단독으로 노출하지 않는다(독자가 못 읽음). 꼭 필요하면 읽는 말을 함께 적는다.',
].join('\n')

// ── 섹션 가이드 (fortune-registry.ts MBTI_SECTION_GUIDE 와 동일, 11개) ────────
const MBTI_SECTION_GUIDE = [
  '11개 항목(반드시 이 순서):',
  '1) score — 궁합 총평과 궁합 지수: 두 유형 조합을 한마디로 요약하는 위트 있는 총평. 본문 안에 0~100 정수의 궁합 지수를 출력 언어로 자연스럽게 포함하고(예: ko "궁합 지수 78점", en "Compatibility 78/100", ja "相性スコア78点", zh "契合指數 78分"), 왜 그 점수인지 핵심을 짚는다. ※ 한국어 단어 "궁합 지수"를 다른 언어 본문에 그대로 쓰지 말고 그 언어로 번역할 것.',
  '2) firstmeet — 첫 만남의 케미: 두 유형이 처음 마주쳤을 때 서로를 어떻게 인식하고 끌리는지, 첫인상과 호감 포인트.',
  '3) personality — 성격 케미: 두 유형의 본질적 기질이 만나 어떻게 맞물리고 어긋나는지, 닮은 점과 정반대인 점.',
  '4) communication — 대화와 소통: 정보를 주고받고 대화하는 방식(S/N, T/F)의 차이. 말이 잘 통하는 순간과 답답해지는 순간.',
  '5) love — 연애와 애정 표현: 사랑을 표현하고 확인받고 싶어하는 방식의 차이(F/T, J/P). 서로의 애정 언어가 통하는지.',
  '6) datestyle — 데이트와 일상 케미: 함께 시간을 보낼 때의 그림. 데이트 계획·여행·주말을 보내는 스타일이 어떻게 만나는지(재미 위주로 생생하게).',
  '7) conflict — 갈등 포인트와 해법: 이 조합이 꼭 한 번은 부딪히는 지점과, 그걸 슬기롭게 푸는 구체적 방법.',
  '8) growth — 서로에게 주는 영향: 두 유형이 만나 서로를 어떻게 성장시키고 채워주는지, 함께라서 더 나아지는 부분.',
  '9) future — 장기 전망: 시간이 지날수록 이 관계가 어떻게 깊어지거나 시험받는지, 오래갈 인연인지에 대한 통찰.',
  '10) advice — 관계 꿀팁: 두 유형이 더 잘 지내기 위한, 각 유형 맞춤의 구체적이고 실용적인 꿀팁.',
  '11) shorts — 숏폼(릴스/쇼츠) 영상용 데이터. 산문이 아니라 정확히 아래 형식의 JSON 객체 한 개만 출력한다(다른 텍스트·마크다운 금지):',
  '   {"hook":"(궁금증을 자극하는 18자 이내 후크)","score":NN,"verdict":"(8자 이내 한마디 등급, 예: 환상의 케미)","beats":[{"label":"(6자 이내 주제)","text":"(70~120자, 2~3문장으로 구체적·풍부하게)"} … 정확히 5개],"catchphrase":"(20자 이내 마무리 카피)"}',
  '   beats 5개는 첫인상·성격·소통·연애·갈등을 위 1~10 내용과 일관되게 다룬다. 각 text는 영상에서 2~3줄로 보이도록 충분히 구체적이고 흥미롭게(추상적 한 줄 금지). score는 1)의 궁합 지수와 동일한 정수. 모든 문구는 출력 언어로.',
].join('\n')

const MBTI_KEYS = ['score', 'firstmeet', 'personality', 'communication', 'love', 'datestyle', 'conflict', 'growth', 'future', 'advice', 'shorts']

// JSON 출력 강제 푸터(언어 무관) — 모든 언어 공통으로 끝에 붙인다.
const jsonFooter = [
  '',
  'You MUST respond with ONLY a single valid JSON object — no markdown, no code fences, no commentary.',
  `The JSON object must contain exactly these string keys: ${MBTI_KEYS.join(', ')}.`,
  "Each value is a non-empty string containing that section's full content in the requested language.",
  'The "shorts" value is itself a JSON object encoded as a string.',
  `Example shape: {${MBTI_KEYS.map((k) => `"${k}": "..."`).join(', ')}}`,
].join('\n')

function systemPrompt(lang) {
  if (lang === 'ko') {
    return [
      MBTI_PERSONA,
      '',
      '[출력 형식]',
      MBTI_SECTION_GUIDE,
      '',
      '- 위 11개 키(' + MBTI_KEYS.join(', ') + ')를 가진 JSON 객체 하나만 출력한다(그 외 텍스트 금지). shorts 값은 11)에 정의된 형식의 JSON을 문자열로 담는다.',
      jsonFooter,
      langDirective('ko'),
    ].join('\n')
  }
  // en/ja/zh: 시스템 프롬프트 자체를 해당 언어로(한국어 앵커 제거)
  return [LOC_SYSTEM[lang], '', LOC_GUIDE[lang], jsonFooter].join('\n')
}

function userPrompt(pair, lang) {
  const [a, b] = pair.split('-')
  if (lang === 'ko') {
    return [
      `유형 A: ${a}`,
      `유형 B: ${b}`,
      '',
      `위 두 MBTI 유형(${a} ↔ ${b})의 궁합을 11개 항목으로 깊이 있게 풀이하세요.`,
      `본문에서는 사람을 이름이 아니라 유형명("${a}", "${b}")으로만 지칭하세요. 특정 개인이 아닌 '이 유형 조합 일반'을 다룹니다.`,
      a === b ? `같은 유형(${a})끼리 만났을 때의 궁합입니다.` : '',
    ].filter(Boolean).join('\n')
  }
  return LOC_USER[lang](a, b)
}

// ── AI 호출 ──────────────────────────────────────────────────────────────
// DeepSeek 는 server/utils/deepseek.ts 와 동일 방식. 비-ko 출력에서 한국어로
// 새는(언어 누수) 현상이 비결정적으로 발생하므로(deepseek-v4-flash 실측), 운영 코드
// (premium-stream.post.ts)처럼 한글 누수를 감지해 재생성하고, 끝까지 새면 Claude 로 폴백한다.
const ENDPOINT = 'https://api.deepseek.com/chat/completions'
const MAX_TOKENS = 8000
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 한글(U+AC00–D7A3) ≥8자면 비-ko 결과의 언어 누수로 판정 (premium-stream.post.ts 와 동일 기준)
const HANGUL = /[가-힣]/g
function hangulLeak(obj, lang) {
  if (lang === 'ko') return false
  const all = MBTI_KEYS.map((k) => (typeof obj?.[k] === 'string' ? obj[k] : '')).join(' ')
  return (all.match(HANGUL) || []).length >= 8
}
function missingKeys(obj) {
  return MBTI_KEYS.filter((k) => !obj?.[k] || typeof obj[k] !== 'string' || !obj[k].trim())
}

// 토큰/호출 집계 (실제 API 소비 — 재시도·누수 호출 포함)
const usage = {
  ds: { calls: 0, prompt: 0, completion: 0, total: 0 },
  claude: { calls: 0, input: 0, output: 0 },
}

async function callDeepseekRaw(pair, lang) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      max_tokens: MAX_TOKENS,
      response_format: { type: 'json_object' },
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt(lang) },
        { role: 'user', content: userPrompt(pair, lang) },
      ],
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    const err = new Error(`DeepSeek ${res.status}: ${detail.slice(0, 200)}`)
    err.status = res.status
    // 잔액 부족(402) 또는 "Insufficient Balance" → 치명적: 재시도·Claude 폴백 없이 즉시 중단.
    if (res.status === 402 || /insufficient\s*balance/i.test(detail)) err.fatal = 'balance'
    throw err
  }
  const json = await res.json()
  usage.ds.calls++
  if (json?.usage) {
    usage.ds.prompt += json.usage.prompt_tokens || 0
    usage.ds.completion += json.usage.completion_tokens || 0
    usage.ds.total += json.usage.total_tokens || 0
  }
  const text = json?.choices?.[0]?.message?.content || ''
  if (!text) throw new Error('empty AI response')
  try { return JSON.parse(text) } catch {
    const m = text.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
    throw new Error('JSON parse failed')
  }
}

// Claude 폴백 (server/utils/claude.ts 와 동일: json_schema, thinking off, effort low)
const CLAUDE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: MBTI_KEYS, properties: Object.fromEntries(MBTI_KEYS.map((k) => [k, { type: 'string' }])),
}
async function callClaudeRaw(pair, lang) {
  if (!anthropic) throw new Error('ANTHROPIC_API_KEY missing — cannot fall back to Claude')
  const res = await anthropic.messages.create({
    model: CLAUDE_MODEL, max_tokens: 12000, thinking: { type: 'disabled' },
    output_config: { effort: 'low', format: { type: 'json_schema', schema: CLAUDE_SCHEMA } },
    system: [{ type: 'text', text: systemPrompt(lang) }],
    messages: [{ role: 'user', content: userPrompt(pair, lang) }],
  })
  usage.claude.calls++
  if (res.usage) {
    usage.claude.input += res.usage.input_tokens || 0
    usage.claude.output += res.usage.output_tokens || 0
  }
  const block = (res.content || []).find((b) => b.type === 'text')
  const text = block?.text || ''
  if (!text) throw new Error('empty Claude response')
  try { return JSON.parse(text) } catch {
    const m = text.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
    throw new Error('Claude JSON parse failed')
  }
}

// 누락 키·언어 누수 검증 + DeepSeek 재시도(최대 N) → 그래도 새면 Claude 폴백.
// 반환: { obj, provider } — provider 는 'deepseek' | 'claude'
const DS_TRIES = 4
async function generate(pair, lang) {
  let last = null
  for (let attempt = 1; attempt <= DS_TRIES; attempt++) {
    try {
      const obj = await callDeepseekRaw(pair, lang)
      if (missingKeys(obj).length) { last = obj; continue }      // 키 누락 → 재시도
      if (hangulLeak(obj, lang)) { last = obj; continue }        // 언어 누수 → 재시도
      return { obj, provider: 'deepseek' }
    } catch (e) {
      if (e.fatal) throw e                                       // 잔액 부족 등 → 즉시 중단(폴백 안 함)
      const wait = (e.status === 429 || e.status >= 500) ? 4000 : 1200
      if (attempt < DS_TRIES) await sleep(wait)
    }
  }
  // DeepSeek 가 끝까지 실패/누수 → Claude 폴백 (언어 준수 신뢰도 높음)
  if (anthropic) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const obj = await callClaudeRaw(pair, lang)
        if (missingKeys(obj).length) continue
        if (hangulLeak(obj, lang)) continue
        return { obj, provider: 'claude' }
      } catch (e) {
        if (attempt < 2) await sleep(2000)
      }
    }
  }
  // 최후: 그나마 키가 채워진 마지막 DeepSeek 결과라도 반환(없으면 throw)
  if (last && !missingKeys(last).length) return { obj: last, provider: 'deepseek?leak' }
  throw new Error(`generation failed for ${pair}/${lang} (deepseek leak/err, claude unavailable or failing)`)
}

// shorts(JSON 문자열) 포함 모든 문자열을 번체로 (zh일 때만)
function convertZh(obj, lang) {
  if (lang !== 'zh') return obj
  const out = {}
  for (const k of MBTI_KEYS) {
    const v = obj[k]
    if (k === 'shorts') {
      try {
        const s = typeof v === 'string' ? JSON.parse(v) : v
        const conv = (x) => typeof x === 'string' ? toTraditional(x, 'zh')
          : Array.isArray(x) ? x.map(conv)
          : (x && typeof x === 'object') ? Object.fromEntries(Object.entries(x).map(([kk, vv]) => [kk, conv(vv)]))
          : x
        out[k] = JSON.stringify(conv(s))
      } catch { out[k] = toTraditional(String(v), 'zh') }
    } else {
      out[k] = toTraditional(String(v), 'zh')
    }
  }
  return out
}

// 궁합 지수 추출: shorts.score 우선, 실패 시 score 본문 첫 0~100 숫자
function extractScore(obj) {
  try {
    const s = typeof obj.shorts === 'string' ? JSON.parse(obj.shorts) : obj.shorts
    const n = Number(s?.score)
    if (Number.isFinite(n) && n >= 0 && n <= 100) return Math.round(n)
  } catch { /* fall through */ }
  const m = String(obj.score || '').match(/\b(100|[0-9]{1,2})\b/)
  return m ? Number(m[1]) : null
}

// ── CLI ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const has = (f) => argv.includes(f)
const valAfter = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null }
const positional = argv.filter((a) => !a.startsWith('--'))

function preview(obj, pair, lang) {
  console.log(`\n================= SAMPLE  ${pair} · ${lang} =================`)
  for (const k of MBTI_KEYS) {
    if (k === 'shorts') {
      console.log(`\n── shorts ──`)
      try { console.log(JSON.stringify(JSON.parse(obj[k]), null, 2)) } catch { console.log(obj[k]) }
    } else {
      console.log(`\n── ${k} ──\n${obj[k]}`)
    }
  }
  console.log(`\n[추출 궁합지수] ${extractScore(obj)}`)
  // 한글 잔존 검사(en/ja/zh에서 0이어야 정상) + 간체 잔존 검사(zh)
  const all = MBTI_KEYS.map((k) => obj[k]).join(' ')
  const hangul = (all.match(/[가-힣]/g) || []).length
  console.log(`[한글 글자 수] ${hangul}${lang !== 'ko' ? ' (0이어야 정상)' : ''}`)
  if (lang === 'zh') {
    // opencc로 한 번 더 변환해 달라지는 글자 = 간체 잔존(저장 전 이미 변환됐으므로 0이어야 정상)
    const conv = _s2t(all)
    const diffs = []
    for (let i = 0; i < all.length; i++) if (all[i] !== conv[i]) diffs.push(all[i])
    const uniq = [...new Set(diffs)]
    console.log(`[간체 잔존(opencc 차이 기반)] ${diffs.length} 개 ${uniq.length ? '→ ' + uniq.join('') : '(번체 OK)'}`)
  }
}

async function main() {
  // ── 미리보기 모드: DB 미기록 ──
  if (has('--sample')) {
    const lang = positional.find((p) => LANGS.includes(p)) || 'ko'
    const slug = positional.find((p) => /^[a-z]{4}-[a-z]{4}$/.test(p)) || 'intj-istp'
    const pair = slug.toUpperCase()
    console.log(`generating sample: ${pair} · ${lang} (model=${DEEPSEEK_MODEL}, no DB write)…`)
    if (process.env.DBG) {
      console.log('--- SYSTEM head ---\n' + systemPrompt(lang).slice(0, 300))
      console.log('--- USER ---\n' + userPrompt(pair, lang))
    }
    const { obj: raw, provider } = await generate(pair, lang)
    const obj = convertZh(raw, lang)
    preview(obj, pair, lang)
    console.log(`[provider] ${provider}`)
    return
  }

  // ── 실제 기록 모드 ──
  let pairs = PAIRS
  let langs = LANGS
  const only = valAfter('--only')
  if (only) pairs = [only.toUpperCase()]
  const oneLang = valAfter('--lang')
  if (oneLang) langs = [oneLang]

  const client = new pg.Client(pgConfig())
  await client.connect()

  // resume: 이미 있는 (pair,lang) 제외
  let done = new Set()
  if (has('--resume')) {
    const r = await client.query('select pair, lang from public.mbti_compatibility')
    done = new Set(r.rows.map((x) => `${x.pair}|${x.lang}`))
  }

  const jobs = []
  for (const pair of pairs)
    for (const lang of langs)
      if (!done.has(`${pair}|${lang}`)) jobs.push({ pair, lang })

  console.log(`jobs: ${jobs.length} (pairs ${pairs.length} × langs ${langs.length}, skipped ${pairs.length * langs.length - jobs.length})`)

  let n = 0, fail = 0, viaClaude = 0
  let aborted = null // 치명적 중단 사유(예: 'balance') 저장
  const CONCURRENCY = 5
  let idx = 0
  async function worker() {
    while (idx < jobs.length && !aborted) {
      const { pair, lang } = jobs[idx++]
      try {
        const { obj: gen, provider } = await generate(pair, lang)
        const obj = convertZh(gen, lang)
        const score = extractScore(obj)
        const usedModel = provider.startsWith('claude') ? CLAUDE_MODEL : DEEPSEEK_MODEL
        if (provider.startsWith('claude')) viaClaude++
        await client.query(
          `insert into public.mbti_compatibility (pair, lang, content, compat_score, model, updated_at)
           values ($1,$2,$3,$4,$5, now())
           on conflict (pair, lang) do update set content = excluded.content,
             compat_score = excluded.compat_score, model = excluded.model, updated_at = now()`,
          [pair, lang, JSON.stringify(obj), score, usedModel],
        )
        n++
        console.log(`[${n + fail}/${jobs.length}] ${pair}·${lang} ✔ (score ${score}, ${provider})`)
      } catch (e) {
        if (e.fatal === 'balance') {           // DeepSeek 잔액 부족 → 전체 배치 즉시 중단
          aborted = 'balance'
          console.error(`\n⛔ DeepSeek 잔액 부족(402)으로 중단: ${e.message}`)
          break
        }
        fail++
        console.error(`[${n + fail}/${jobs.length}] ${pair}·${lang} ✗ ${e.message}`)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  await client.end()

  // ── 요약 ──
  const ds = usage.ds, cl = usage.claude
  // DeepSeek deepseek-chat 공시가(캐시 미스 기준): 입력 $0.27/M, 출력 $1.10/M (대략 추정용)
  const dsCost = (ds.prompt / 1e6) * 0.27 + (ds.completion / 1e6) * 1.10
  console.log('\n──────── 요약 ────────')
  console.log(`기록: ${n}/${jobs.length}  실패: ${fail}  Claude 폴백: ${viaClaude}건`)
  console.log(`DeepSeek 호출: ${ds.calls}회 (재시도·누수 포함)`)
  console.log(`  토큰  prompt=${ds.prompt.toLocaleString()}  completion=${ds.completion.toLocaleString()}  total=${ds.total.toLocaleString()}`)
  console.log(`  추정 비용 ≈ $${dsCost.toFixed(4)} (deepseek-chat 공시가 기준 추정 — 정확값은 대시보드 확인)`)
  if (cl.calls) console.log(`Claude 호출: ${cl.calls}회  input=${cl.input.toLocaleString()}  output=${cl.output.toLocaleString()}`)
  if (aborted === 'balance') {
    console.log('\n⚠️ 잔액 부족으로 중단됨. 충전 후 다음으로 이어받기:')
    console.log('   node scripts/db/seed-mbti.mjs --resume')
    process.exitCode = 2
  } else {
    console.log(`\ndone: ${n} written, ${fail} failed`)
    if (fail) process.exitCode = 1
  }
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1) })
