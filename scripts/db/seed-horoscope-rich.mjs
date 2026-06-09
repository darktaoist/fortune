#!/usr/bin/env node
/**
 * 띠별 오늘운세 — "충실한" 절차적 생성기 (ko/en/ja/zh).
 * calenda_data의 실제 일진/월건/연간지 + 지지 관계(충/합/삼합/인접/본기) + 출생연도
 * 코호트(세는나이) + 천간 오행으로 다문장 운세를 구성한다. 사실은 실데이터, 문장은
 * 시드(date+zodiac+lang) 기반 변주. content만 교체하고 lucky_* 컬럼은 보존(UPSERT).
 *
 *   node scripts/db/seed-horoscope-rich.mjs --sample [lang]   # DB 미기록 미리보기
 *   node scripts/db/seed-horoscope-rich.mjs [startYYYY-MM-DD] [days]   # DB 기록(기본 오늘~184일)
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'

const ROOT = resolve(import.meta.dirname, '../..')
const url = readFileSync(resolve(ROOT, '.env'), 'utf8')
  .split('\n').find((l) => l.startsWith('SUPABASE_DATABASE_URL=')).split('=').slice(1).join('=').trim()
const mm = url.match(/^postgres(?:ql)?:\/\/(.*)@([^/]+)\/(.+)$/)
const ci = mm[1].indexOf(':')
const cfg = { user: mm[1].slice(0, ci), password: mm[1].slice(ci + 1), host: mm[2].slice(0, mm[2].lastIndexOf(':')), port: 5432, database: mm[3], ssl: { rejectUnauthorized: false } }

const BR = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const BR_KO = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']
const ZB = { 쥐: 0, 소: 1, 호랑이: 2, 토끼: 3, 용: 4, 뱀: 5, 말: 6, 양: 7, 원숭이: 8, 닭: 9, 개: 10, 돼지: 11 }
const ZYEARS = {
  쥐: [1948, 1960, 1972, 1984, 1996, 2008], 소: [1949, 1961, 1973, 1985, 1997, 2009],
  호랑이: [1950, 1962, 1974, 1986, 1998, 2010], 토끼: [1951, 1963, 1975, 1987, 1999, 2011],
  용: [1952, 1964, 1976, 1988, 2000, 2012], 뱀: [1953, 1965, 1977, 1989, 2001, 2013],
  말: [1954, 1966, 1978, 1990, 2002, 2014], 양: [1955, 1967, 1979, 1991, 2003, 2015],
  원숭이: [1944, 1956, 1968, 1980, 1992, 2004], 닭: [1945, 1957, 1969, 1981, 1993, 2005],
  개: [1946, 1958, 1970, 1982, 1994, 2006], 돼지: [1947, 1959, 1971, 1983, 1995, 2007],
}
const ZNAME = {
  ko: { 쥐: '쥐', 소: '소', 호랑이: '호랑이', 토끼: '토끼', 용: '용', 뱀: '뱀', 말: '말', 양: '양', 원숭이: '원숭이', 닭: '닭', 개: '개', 돼지: '돼지' },
  en: { 쥐: 'Rat', 소: 'Ox', 호랑이: 'Tiger', 토끼: 'Rabbit', 용: 'Dragon', 뱀: 'Snake', 말: 'Horse', 양: 'Goat', 원숭이: 'Monkey', 닭: 'Rooster', 개: 'Dog', 돼지: 'Pig' },
  ja: { 쥐: '子', 소: '丑', 호랑이: '寅', 토끼: '卯', 용: '辰', 뱀: '巳', 말: '午', 양: '未', 원숭이: '申', 닭: '酉', 개: '戌', 돼지: '亥' },
  zh: { 쥐: '鼠', 소: '牛', 호랑이: '虎', 토끼: '兔', 용: '龍', 뱀: '蛇', 말: '馬', 양: '羊', 원숭이: '猴', 닭: '雞', 개: '狗', 돼지: '豬' },
}
const STEM_OH = { 갑: '목', 을: '목', 병: '화', 정: '화', 무: '토', 기: '토', 경: '금', 신: '금', 임: '수', 계: '수' }
const OH_LABEL = {
  ko: { 목: '목(木)', 화: '화(火)', 토: '토(土)', 금: '금(金)', 수: '수(水)' },
  en: { 목: 'Wood (木)', 화: 'Fire (火)', 토: 'Earth (土)', 금: 'Metal (金)', 수: 'Water (水)' },
  ja: { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' },
  zh: { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' },
}
const ROMAN_STEM = { 갑: 'Gap', 을: 'Eul', 병: 'Byeong', 정: 'Jeong', 무: 'Mu', 기: 'Gi', 경: 'Gyeong', 신: 'Sin', 임: 'Im', 계: 'Gye' }
const ROMAN_BR = { 자: 'ja', 축: 'chuk', 인: 'in', 묘: 'myo', 진: 'jin', 사: 'sa', 오: 'o', 미: 'mi', 신: 'sin', 유: 'yu', 술: 'sul', 해: 'hae' }
function roman(kganji) { return (ROMAN_STEM[kganji[0]] || '') + (ROMAN_BR[kganji[1]] || '') }
function ganjiDisp(lang, h, k) {
  if (lang === 'ko') return `${h}(${k})`
  if (lang === 'en') return `${h} (${roman(k)})`
  return h // ja/zh: 한자
}

const SIXHAP = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]]
const SAMHAP = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]]
function relation(z, d) {
  if (z === d) return 'self'
  if (Math.abs(z - d) === 6) return 'chung'
  if (SIXHAP.some((p) => p.includes(z) && p.includes(d))) return 'hap'
  if (SAMHAP.some((t) => t.includes(z) && t.includes(d))) return 'samhap'
  const diff = Math.abs(z - d)
  if (diff === 1 || diff === 11) return 'adjacent'
  return 'plain'
}
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1597334677) + 1) >>> 0; return s / 4294967296 } }
const pick = (r, a) => a[Math.floor(r() * a.length)]
function ageOf(y) { return 2026 - y + 1 }

// ── 언어별 풀 ────────────────────────────────────────────────────────────
const P = {
  ko: {
    rel: { self: { n: '본기', e: ['중심이 단단해지는', '자기다움이 또렷해지는', '주관이 뚜렷해지는'] }, chung: { n: '충(沖)', e: ['변화가 크고 마음이 분주한', '흔들림이 잦아 집중이 필요한', '예민해지기 쉬운'] }, hap: { n: '합(合)', e: ['조화롭고 인연이 살아나는', '결이 맞아 부드럽게 풀리는', '관계가 따뜻해지는'] }, samhap: { n: '삼합(三合)', e: ['일이 술술 풀리는', '협력이 무르익는', '뜻 맞는 이와 시너지가 나는'] }, adjacent: { n: '인접', e: ['활동성이 높아지는', '이동·만남이 잦아지는', '부지런해지는'] }, plain: { n: '순행', e: ['차분히 흐르는', '큰 기복 없이 평온한', '내실을 다지기 좋은'] } },
    oh: { 화: { w: ['다소 예민해지고 욱하기 쉬우니', '열이 올라 조급해지기 쉬우니', '감정이 앞서기 쉬우니'], c: ['충분한 수면', '수분 섭취와 휴식', '심장·혈압 관리'] }, 수: { w: ['생각이 많아 가라앉기 쉬우니', '한기에 컨디션이 처지기 쉬우니'], c: ['몸을 따뜻하게', '신장 관리', '가벼운 운동'] }, 목: { w: ['의욕이 앞서 무리하기 쉬우니', '들뜨기 쉬우니'], c: ['간·눈의 피로', '스트레칭', '과로 주의'] }, 금: { w: ['고집이 세져 부딪치기 쉬우니', '까칠해지기 쉬우니'], c: ['호흡기·피부', '환절기 감기', '어깨 긴장 풀기'] }, 토: { w: ['굼떠지고 미루기 쉬우니', '소화가 더뎌지기 쉬우니'], c: ['위장·소화', '규칙적인 식사', '가벼운 산책'] } },
    dom: { 재물: ['오랫동안 기다려온 결실이 조금씩 윤곽을 드러낼 수 있어요', '뜻밖의 수입이나 좋은 제안이 들어올 수 있어요', '작은 절약이 큰 흐름을 바꾸는 시기예요'], 연애: ['솔직한 마음 표현이 좋은 결과를 가져올 수 있어요', '익숙한 곳에서 설레는 인연이 움트는 날이에요', '오해를 풀고 한 걸음 가까워지기 좋아요'], 직장: ['작은 기회를 놓치지 마세요', '윗사람의 인정이나 협업 운이 따라요', '미뤄둔 일을 마무리하기 좋은 때예요'], 사업: ['새로운 거래의 실마리가 보여요', '확장보다 내실을 다지는 게 유리해요', '신뢰가 곧 자산이 되는 시기예요'], 건강: ['리듬을 회복하기 좋은 날이에요', '무리한 일정은 잠시 내려놓으세요', '몸의 신호에 귀를 기울이세요'], 학업: ['집중력이 오르니 한 챕터 더 나아가 보세요', '복습이 좋은 결실을 맺어요', '새 분야에 도전하기 좋아요'] },
    close: [['서두르기보다 차분하게 한 걸음씩 나아가는 것이 복을 부르는 길이에요', '🌿'], ['작은 친절 하나가 오늘의 운을 키웁니다', '✨'], ['마음을 비우면 길이 더 또렷이 보이는 하루예요', '🍀'], ['오늘의 선택이 내일의 흐름을 바꿉니다, 직감을 믿어 보세요', '🌙'], ['감사의 한마디가 좋은 기운을 부르는 날이에요', '🌸']],
    s1self: (g, z, e) => `오늘 일진 ${g}은 ${z}띠 본기와 맞물려 ${e} 하루예요.`,
    s1: (g, z, pair, n, e) => `오늘 일진 ${g}은 ${z}띠에게 ${pair} ${n}의 기운이 흘러 ${e} 하루예요.`,
    s2: (g, m) => `월건 ${g}가 ${m} 시기이기도 하죠.`, m2: { self: '본기와 겹치며 자신만의 빛이 드러나는', hap: '본기와 어우러져 주변의 도움을 부르는', samhap: '본기와 어우러져 주변의 도움을 부르는', chung: '본기를 자극해 변화를 재촉하는', adjacent: '본기에 활력을 더하는', plain: '본기에 은은한 활력을 더하는' },
    s3: (d, t) => `특히 ${d}운이 눈에 띄는데, ${t}.`,
    coOld: (y, a, d, t) => `${y}년생(${a}세)은 ${d === '재물' ? '금전 흐름에서' : d + '에서'} ${t}.`,
    coYoung: (y, a, d, t) => `${y}년생(${a}세)은 ${d === '연애' ? '연애운이 살며시 움트는 날로,' : '학업·성장 면에서'} ${t}.`,
    s6: (g, oh, w, c) => `다만 연간지 ${g}의 ${oh}기가 강해 ${w} ${c}에도 신경 쓰세요.`,
    s7: (c, em) => `오늘은 ${c}. ${em}`,
    domName: { 재물: '재물', 연애: '연애', 직장: '직장', 사업: '사업', 건강: '건강', 학업: '학업' },
  },
  en: {
    rel: { self: { n: 'self (本氣)', e: ['your center grows steady', 'your true self comes through', 'your will sharpens'] }, chung: { n: 'clash (沖)', e: ['change runs high and the mind is busy', 'things waver, so focus matters', 'you may feel on edge'] }, hap: { n: 'union (合)', e: ['harmony rises and bonds come alive', 'things flow smoothly', 'relationships warm up'] }, samhap: { n: 'trine (三合)', e: ['matters unfold with ease', 'cooperation ripens', 'synergy builds with the like-minded'] }, adjacent: { n: 'adjacency', e: ['activity picks up', 'movement and encounters increase', 'you grow more diligent'] }, plain: { n: 'steady flow', e: ['things move calmly', 'the day is even-keeled', 'it is a good time to build substance'] } },
    oh: { 화: { w: ['you may grow sensitive or quick-tempered', 'heat may make you impatient', 'emotions may run ahead'], c: ['get enough sleep', 'stay hydrated and rest', 'mind your heart and blood pressure'] }, 수: { w: ['overthinking may weigh you down', 'a chill may dampen your energy'], c: ['keep warm', 'mind your kidneys', 'light exercise helps'] }, 목: { w: ['eagerness may push you too hard', 'you may feel restless'], c: ['mind eye and liver fatigue', 'stretch often', 'avoid overwork'] }, 금: { w: ['stubbornness may cause friction', 'you may turn brittle'], c: ['mind your skin and breathing', 'watch for seasonal colds', 'release shoulder tension'] }, 토: { w: ['you may slow down and procrastinate', 'digestion may lag'], c: ['mind your stomach', 'eat on a regular schedule', 'take a light walk'] } },
    dom: { 재물: ['long-awaited results may start taking shape', 'unexpected income or a good offer may arrive', 'small savings can shift the bigger flow'], 연애: ['honest words can bring good results', 'a fluttering connection sprouts in a familiar place', 'a good day to clear a misunderstanding'], 직장: ["don't miss a small opportunity", 'recognition from above or teamwork favors you', 'a good time to finish what you put off'], 사업: ['a clue to a new deal appears', 'consolidating beats expanding now', 'trust becomes your asset'], 건강: ['a good day to restore your rhythm', 'set aside an overloaded schedule', 'listen to your body'], 학업: ['focus rises—push one more chapter', 'review bears fruit', 'a good day to try a new field'] },
    close: [['rather than rush, move one calm step at a time and fortune follows', '🌿'], ['one small kindness grows your luck today', '✨'], ['empty your mind and the path shows more clearly', '🍀'], ["today's choice shapes tomorrow—trust your intuition", '🌙'], ['a word of gratitude invites good energy', '🌸']],
    s1self: (g, z, e) => `Today's day pillar ${g} aligns with the ${z}'s own nature — a day when ${e}.`,
    s1: (g, z, pair, n, e) => `Today's day pillar ${g} brings the ${z} a current of ${n} (${pair}) — a day when ${e}.`,
    s2: (g, m) => `The month pillar ${g} ${m}.`, m2: { self: 'overlaps your own nature, letting your light show', hap: 'blends with your nature, drawing help from those around you', samhap: 'blends with your nature, drawing help from those around you', chung: 'stirs your nature, hastening change', adjacent: 'adds vigor to your nature', plain: 'lends a quiet vitality to your nature' },
    s3: (d, t) => `Wealth especially stands out: ${t}.`.replace('Wealth', { 재물: 'Wealth', 연애: 'Love', 직장: 'Career', 사업: 'Business', 건강: 'Health', 학업: 'Study' }[d]),
    coOld: (y, a, d, t) => `Those born in ${y} (age ${a}) — in ${{ 재물: 'finances', 직장: 'work', 사업: 'business' }[d]}, ${t}.`,
    coYoung: (y, a, d, t) => `Those born in ${y} (age ${a}) — ${d === '연애' ? 'love quietly buds today;' : 'for study and growth,'} ${t}.`,
    s6: (g, oh, w, c) => `That said, the year pillar ${g} runs strong in ${oh} energy, so ${w} — ${c}.`,
    s7: (c, em) => `Today, ${c}. ${em}`,
  },
  ja: {
    rel: { self: { n: '本気', e: ['中心が定まる', '自分らしさがはっきりする', '主体性が際立つ'] }, chung: { n: '冲', e: ['変化が大きく落ち着かない', '揺れが多く集中が要る', '神経質になりやすい'] }, hap: { n: '合', e: ['調和し縁が生きる', '物事が滑らかに運ぶ', '人間関係が温まる'] }, samhap: { n: '三合', e: ['物事がすらすら進む', '協力が実る', '気の合う人と相乗効果が出る'] }, adjacent: { n: '隣接', e: ['活動的になる', '移動や出会いが増える', '勤勉になる'] }, plain: { n: '順行', e: ['穏やかに流れる', '大きな波がなく平穏な', '内実を固めるのに良い'] } },
    oh: { 화: { w: ['やや神経質で短気になりやすいので', '熱がこもり焦りやすいので', '感情が先走りやすいので'], c: ['十分な睡眠', '水分補給と休息', '心臓・血圧の管理'] }, 수: { w: ['考えすぎて沈みやすいので', '冷えで調子が落ちやすいので'], c: ['体を温め', '腎臓の管理', '軽い運動'] }, 목: { w: ['意欲が先行し無理しやすいので', '浮つきやすいので'], c: ['肝・目の疲れ', 'ストレッチ', '過労に注意'] }, 금: { w: ['頑固になり衝突しやすいので', '刺々しくなりやすいので'], c: ['呼吸器・肌', '季節の変わり目の風邪', '肩の緊張をほぐす'] }, 토: { w: ['鈍く後回しにしやすいので', '消化が遅れやすいので'], c: ['胃腸', '規則的な食事', '軽い散歩'] } },
    dom: { 재물: ['長く待った実りが少しずつ形になりそう', '思わぬ収入や良い提案が来るかも', '小さな節約が大きな流れを変える時'], 연애: ['素直な気持ちの表現が良い結果に', '身近な所で心ときめく縁が芽生える日', '誤解を解いて一歩近づくのに良い'], 직장: ['小さな機会を逃さないで', '目上の評価や協業運が味方に', '後回しの仕事を仕上げるのに良い時'], 사업: ['新しい取引の糸口が見える', '拡大より内実を固めるのが有利', '信頼が資産になる時'], 건강: ['リズムを取り戻すのに良い日', '無理な予定は一旦手放して', '体の信号に耳を傾けて'], 학업: ['集中力が上がる、もう一章進もう', '復習が実を結ぶ', '新しい分野に挑戦するのに良い'] },
    close: [['焦らず落ち着いて一歩ずつ進むのが福を呼ぶ道です', '🌿'], ['小さな親切が今日の運を育てます', '✨'], ['心を空にすれば道がより鮮明に見える一日です', '🍀'], ['今日の選択が明日の流れを変えます、直感を信じて', '🌙'], ['感謝の一言が良い気を呼ぶ日です', '🌸']],
    s1self: (g, z, e) => `今日の日柱 ${g} は${z}年の本気と噛み合い、${e}一日です。`,
    s1: (g, z, pair, n, e) => `今日の日柱 ${g} は${z}年に ${pair} ${n}の気が流れ、${e}一日です。`,
    s2: (g, m) => `月建 ${g} が${m}時期でもあります。`, m2: { self: '本気と重なり自分の光が表れる', hap: '本気と調和し周りの助けを呼ぶ', samhap: '本気と調和し周りの助けを呼ぶ', chung: '本気を刺激し変化を促す', adjacent: '本気に活力を添える', plain: '本気に静かな活力を添える' },
    s3: (d, t) => `特に${{ 재물: '金運', 연애: '恋愛運', 직장: '仕事運', 사업: '事業運', 건강: '健康運', 학업: '学業運' }[d]}が目立ち、${t}。`,
    coOld: (y, a, d, t) => `${y}年生まれ（${a}歳）は${{ 재물: '金銭面で', 직장: '仕事で', 사업: '事業で' }[d]}${t}。`,
    coYoung: (y, a, d, t) => `${y}年生まれ（${a}歳）は${d === '연애' ? '恋愛運がそっと芽生える日、' : '学業・成長面で'}${t}。`,
    s6: (g, oh, w, c) => `ただ年柱 ${g} の${oh}の気が強く、${w}${c}にも気を配って。`,
    s7: (c, em) => `今日は${c}。${em}`,
  },
  zh: {
    rel: { self: { n: '本氣', e: ['核心更穩固', '自我更鮮明', '主見更分明'] }, chung: { n: '沖', e: ['變化大、心緒忙亂', '起伏多、需要專注', '容易敏感'] }, hap: { n: '合', e: ['和諧而緣分活絡', '事情順暢推進', '人際關係升溫'] }, samhap: { n: '三合', e: ['事情順利推進', '協力漸入佳境', '與志同者產生綜效'] }, adjacent: { n: '相鄰', e: ['活動力提升', '移動與相遇增多', '更加勤奮'] }, plain: { n: '順行', e: ['平穩流動', '無大起伏而安穩', '宜充實內在'] } },
    oh: { 화: { w: ['略顯敏感易急躁，', '火氣上升易焦躁，', '情緒易搶先，'], c: ['充足的睡眠', '補水與休息', '心臟與血壓'] }, 수: { w: ['思慮過多易消沉，', '寒氣易使狀態下滑，'], c: ['保暖', '腎臟保養', '適度運動'] }, 목: { w: ['幹勁過頭易勉強，', '容易浮躁，'], c: ['肝與眼的疲勞', '多伸展', '避免過勞'] }, 금: { w: ['固執易生衝突，', '容易尖銳，'], c: ['呼吸道與皮膚', '換季感冒', '肩頸放鬆'] }, 토: { w: ['遲緩易拖延，', '消化易變慢，'], c: ['腸胃', '規律飲食', '輕鬆散步'] } },
    dom: { 재물: ['久候的成果可能逐漸顯現', '或有意外收入或好提案', '小積蓄足以改變大局'], 연애: ['坦率表達能帶來好結果', '在熟悉之處萌生心動緣分', '宜化解誤會更進一步'], 직장: ['別錯過小機會', '長輩賞識或協作運相助', '宜收尾擱置的工作'], 사업: ['浮現新交易的線索', '鞏固內實勝於擴張', '信任即是資產'], 건강: ['宜恢復作息的一天', '暫放過重的行程', '聆聽身體訊號'], 학업: ['專注力上升，再進一章', '複習能開花結果', '宜嘗試新領域'] },
    close: [['不急不躁、一步步前行便是招福之道', '🌿'], ['一個小善意能養大今日的運', '✨'], ['放空心境，路會更清晰', '🍀'], ['今天的選擇改變明天的走向，相信直覺', '🌙'], ['一句感謝能招來好氣場', '🌸']],
    s1self: (g, z, e) => `今日日柱 ${g} 與${z}的本氣相契，是${e}的一天。`,
    s1: (g, z, pair, n, e) => `今日日柱 ${g} 為${z}帶來 ${pair} ${n}之氣，是${e}的一天。`,
    s2: (g, m) => `月建 ${g} 也${m}。`, m2: { self: '與本氣相疊、令自身光彩顯現', hap: '與本氣相和、引來周遭助力', samhap: '與本氣相和、引來周遭助力', chung: '激盪本氣、催動變化', adjacent: '為本氣添活力', plain: '為本氣添一分靜謐活力' },
    s3: (d, t) => `尤其${{ 재물: '財運', 연애: '愛情運', 직장: '事業運', 사업: '事業運', 건강: '健康運', 학업: '學業運' }[d]}突出，${t}。`,
    coOld: (y, a, d, t) => `${y}年生（${a}歲）在${{ 재물: '金錢面', 직장: '工作上', 사업: '事業上' }[d]}${t}。`,
    coYoung: (y, a, d, t) => `${y}年生（${a}歲）${d === '연애' ? '愛情運悄悄萌芽，' : '在學業與成長上，'}${t}。`,
    s6: (g, oh, w, c) => `不過年柱 ${g} 的${oh}之氣偏強，${w}也請留意${c}。`,
    s7: (c, em) => `今天${c}。${em}`,
  },
}
const OLDER_DOM = ['직장', '사업', '재물']
const YOUNGER_DOM = ['연애', '학업']
const PRIMARY = ['재물', '연애', '직장', '사업', '건강']

function make(lang, zko, cal, dateStr) {
  const p = P[lang]
  const z = ZB[zko]
  const dBranch = BR.indexOf(cal.hd.slice(-1))
  const mBranch = BR.indexOf(cal.hm.slice(-1))
  const yOh = STEM_OH[cal.ky[0]] || '화'
  const r = rng(hash(dateStr + zko + lang))
  const rel = relation(z, dBranch)
  const relM = relation(z, mBranch)
  const R = p.rel[rel]
  const zname = ZNAME[lang][zko]
  const gDay = ganjiDisp(lang, cal.hd, cal.kd)
  const gMon = ganjiDisp(lang, cal.hm, cal.km)
  const gYear = ganjiDisp(lang, cal.hy, cal.ky)
  const pair = lang === 'ko' ? BR_KO[z] + BR_KO[dBranch] : BR[z] + BR[dBranch]

  const s1 = rel === 'self' ? p.s1self(gDay, zname, pick(r, R.e)) : p.s1(gDay, zname, pair, R.n, pick(r, R.e))
  const s2 = p.s2(gMon, p.m2[relM])
  const primary = pick(r, PRIMARY)
  const s3 = p.s3(primary, pick(r, p.dom[primary]))

  const olders = ZYEARS[zko].filter((y) => ageOf(y) >= 30 && ageOf(y) <= 85)
  const youngers = ZYEARS[zko].filter((y) => ageOf(y) >= 13 && ageOf(y) < 30)
  const lines = []
  if (olders.length) { const y = pick(r, olders); const pool = OLDER_DOM.filter((d) => d !== primary); const d = pick(r, pool.length ? pool : OLDER_DOM); lines.push(p.coOld(y, ageOf(y), d, pick(r, p.dom[d]))) }
  if (youngers.length) { const y = pick(r, youngers); const pool = YOUNGER_DOM.filter((d) => d !== primary); const d = pick(r, pool.length ? pool : YOUNGER_DOM); lines.push(p.coYoung(y, ageOf(y), d, pick(r, p.dom[d]))) }

  const oh = p.oh[yOh] || p.oh.화
  const s6 = p.s6(gYear, OH_LABEL[lang][yOh], pick(r, oh.w), pick(r, oh.c))
  const [close, em] = pick(r, p.close)
  const s7 = p.s7(close, em)
  const sep = lang === 'ja' || lang === 'zh' ? '' : ' '
  return [s1, s2, s3, ...lines, s6, s7].join(sep)
}

// ── calenda_data 로드 ───────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0') }
function fmt(d) { return d.toISOString().slice(0, 10) }
const client = new pg.Client(cfg)
await client.connect()
const cal = await client.query("select cd_sy y, trim(cd_sm) m, trim(cd_sd) d, cd_hyganjee hy, cd_kyganjee ky, cd_hmganjee hm, cd_kmganjee km, cd_hdganjee hd, cd_kdganjee kd from public.calenda_data where cd_sy between 2026 and 2027")
const calMap = {}
for (const row of cal.rows) calMap[`${row.y}-${pad(row.m)}-${pad(row.d)}`] = row

const LANGS = ['ko', 'en', 'ja', 'zh']
const ORDER = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지']

// 샘플 미리보기
if (process.argv.includes('--sample')) {
  const lang = process.argv[3] && LANGS.includes(process.argv[3]) ? process.argv[3] : 'ko'
  const show = (ds, zko) => { const c = calMap[ds]; console.log(`\n[${ds} · ${zko} · ${lang} · 일진 ${c.hd}]`); console.log('  ' + make(lang, zko, c, ds)) }
  console.log(`===== 같은 띠(토끼) × 3일 (${lang}) =====`); show('2026-06-07', '토끼'); show('2026-06-08', '토끼'); show('2026-06-09', '토끼')
  console.log(`\n===== 같은 날(06-07) × 3띠 (${lang}) =====`); show('2026-06-07', '쥐'); show('2026-06-07', '말'); show('2026-06-07', '돼지')
  await client.end(); process.exit(0)
}

// ── DB 기록 (content만 교체, lucky_* 보존) ──────────────────────────────
const startArg = process.argv[2] && /^\d{4}-\d{2}-\d{2}$/.test(process.argv[2]) ? process.argv[2] : fmt(new Date())
const days = parseInt(process.argv[3] || '184', 10)
const start = new Date(startArg + 'T00:00:00Z')
const rows = []
for (let i = 0; i < days; i++) {
  const ds = fmt(new Date(start.getTime() + i * 86400000))
  const c = calMap[ds]
  if (!c) continue
  for (const zko of ORDER) for (const lang of LANGS) rows.push([ds, zko, ZYEARS[zko].join(', '), make(lang, zko, c, ds), lang])
}
console.log(`generating ${rows.length} rows, start ${startArg}, ${days}d`)
const BATCH = 500
let n = 0
for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH)
  const params = []
  const tuples = chunk.map((row, ri) => { const ph = row.map((_, c2) => `$${ri * 5 + c2 + 1}`); params.push(...row); return `(${ph.join(',')})` })
  const res = await client.query(
    `insert into public.daily_horoscope (target_date, zodiac_ko, birth_years, content, lang) values ${tuples.join(',')}
     on conflict (target_date, zodiac_ko, lang) do update set content = excluded.content`,
    params,
  )
  n += res.rowCount
}
console.log(`✔ upserted ${n} rows (content replaced; lucky_* preserved; March original untouched)`)
await client.end()
