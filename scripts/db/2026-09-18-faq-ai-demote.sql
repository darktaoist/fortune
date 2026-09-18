-- FAQ 3건 AI 라벨 강등 + 네이버페이 표기 정정 (2026-09-18)
-- 대상: faq_translations (faq_id = 1, 3, 10) × 4언어
--
-- ⚠️ Claude 는 이 파일을 실행하지 않는다 (CLAUDE.md §1: Supabase 라이브 테이블 쓰기 금지).
--    Supabase SQL Editor 에서 사람이 직접 실행한다. 1) 백업 → 2) UPDATE → 3) 검증 순서.
--
-- 왜 세 건인가
--   id=3  "운세 결과가 신뢰할 만한가요?" — 계산은 결정론적, 해석만 AI 라고 밝힌다.
--                                        (AI 표기가 허용되는 4곳 중 하나)
--   id=10 "어떤 결제 방법을 지원하나요?" — 네이버페이는 미계약인데 지원한다고 적혀 있다.
--                                        기대와 어긋나 결제 단계 이탈로 이어진다.
--   id=1  "타오운세란 무엇인가요?"       — 구 상품명 'AI 평생운세' → '평생사주 리포트'.

-- ─────────────────────────────────────────────────────────────
-- 1) 백업 — 실행 전 결과를 반드시 복사해 둘 것 (롤백용)
-- ─────────────────────────────────────────────────────────────
SELECT faq_id, language_code, title, content
FROM faq_translations
WHERE faq_id IN (1, 3, 10)
ORDER BY faq_id, language_code;

-- ─────────────────────────────────────────────────────────────
-- 2) UPDATE (12건)
-- ─────────────────────────────────────────────────────────────

-- id=3 · 신뢰 ─ AI 표기 허용 위치
UPDATE faq_translations SET content =
'사주 계산은 만세력 73,442일 DB와 절기·진태양시 보정으로 결정론적으로 수행합니다. 해석 문장은 AI가 작성하며, 계산 근거는 /accuracy에서 확인할 수 있습니다.'
WHERE faq_id = 3 AND language_code = 'ko';

UPDATE faq_translations SET content =
'The chart itself is calculated deterministically from a 73,442-day almanac with solar-term and true-solar-time correction. The interpretation text is AI-written; see /accuracy for how the calculation is verified.'
WHERE faq_id = 3 AND language_code = 'en';

UPDATE faq_translations SET content =
'命式の計算は73,442日の万年暦と節気・真太陽時補正により決定論的に行います。解釈文はAIが作成し、計算根拠は /accuracy で確認できます。'
WHERE faq_id = 3 AND language_code = 'ja';

UPDATE faq_translations SET content =
'排盤由 73,442 天萬年曆與節氣、真太陽時校正決定論地計算。解讀文字由 AI 撰寫，計算依據可於 /accuracy 查閱。'
WHERE faq_id = 3 AND language_code = 'zh';

-- id=10 · 결제 수단 ─ 네이버페이 제거 (토스·카드·계좌이체·카카오페이 / 해외 PayPal)
UPDATE faq_translations SET content =
'신용카드, 계좌이체, 카카오페이(토스페이먼츠)를 지원하며, 해외 결제는 PayPal로 진행됩니다. 안전한 결제를 위해 PG사를 통해 처리됩니다.'
WHERE faq_id = 10 AND language_code = 'ko';

UPDATE faq_translations SET content =
'We support credit cards, bank transfer and KakaoPay via Toss Payments, and PayPal for overseas payments. All payments are processed through a secure payment gateway.'
WHERE faq_id = 10 AND language_code = 'en';

UPDATE faq_translations SET content =
'クレジットカード、口座振替、KakaoPay（Tossペイメンツ）に対応し、海外決済はPayPalで行います。安全な決済のためPG会社を通じて処理されます。'
WHERE faq_id = 10 AND language_code = 'ja';

UPDATE faq_translations SET content =
'支援信用卡、銀行轉帳與 KakaoPay（Toss Payments），海外付款則透過 PayPal。為確保交易安全，所有付款皆由金流服務商處理。'
WHERE faq_id = 10 AND language_code = 'zh';

-- id=1 · 서비스 소개 ─ 구 상품명 교체
UPDATE faq_translations SET content =
'타오운세는 동양의 전통 사주명리를 기반으로 한 온라인 운세 서비스입니다. 만세력 데이터로 사주팔자를 정확히 세우고, 오늘의 운세부터 평생사주 리포트·연예인/MBTI 궁합까지 다양한 운세를 확인할 수 있습니다.'
WHERE faq_id = 1 AND language_code = 'ko';

UPDATE faq_translations SET content =
'Taoist Fortune is an online fortune-telling service based on traditional Eastern saju (the Four Pillars of Destiny). Your chart is cast from precise manse-ryeok almanac data, covering everything from today''s fortune to the Lifetime Saju Report and celebrity/MBTI compatibility.'
WHERE faq_id = 1 AND language_code = 'en';

UPDATE faq_translations SET content =
'道士運勢は東洋の伝統的な四柱推命に基づいたオンライン運勢サービスです。万年暦データで四柱を正確に立て、今日の運勢から一生の四柱推命レポート・芸能人/MBTI相性まで、さまざまな運勢を確認できます。'
WHERE faq_id = 1 AND language_code = 'ja';

UPDATE faq_translations SET content =
'道悟運勢是基於東方傳統四柱八字的線上運勢服務。以萬年曆資料精準排盤，從每日運勢到一生八字命盤報告、明星/MBTI 合盤等多種運勢皆可查看。'
WHERE faq_id = 1 AND language_code = 'zh';

-- ─────────────────────────────────────────────────────────────
-- 3) 검증 — 아래가 전부 0행이어야 한다
-- ─────────────────────────────────────────────────────────────
SELECT faq_id, language_code, content
FROM faq_translations
WHERE faq_id = 10 AND (content ILIKE '%네이버%' OR content ILIKE '%naverpay%' OR content ILIKE '%ネイバー%');

SELECT faq_id, language_code, content
FROM faq_translations
WHERE faq_id = 1 AND (content LIKE '%AI 평생%' OR content LIKE '%AI Lifetime%' OR content LIKE '%AI生涯%' OR content LIKE '%AI一生%');

-- 최종 확인 (눈으로)
SELECT faq_id, language_code, content
FROM faq_translations
WHERE faq_id IN (1, 3, 10)
ORDER BY faq_id, language_code;

-- ─────────────────────────────────────────────────────────────
-- 롤백: 1)에서 복사해 둔 content 를 같은 WHERE 절로 되돌린다.
--   UPDATE faq_translations SET content = '<백업값>' WHERE faq_id = <n> AND language_code = '<lang>';
--
-- 별건 메모: zh 의 나머지 FAQ 행들은 현재 간체(예: "什么是道士运势")로 저장돼 있다.
--   사이트 표준은 번체(CLAUDE.md §2)이므로 위 3건은 번체로 작성했다.
--   나머지 zh 행 번체 전환은 이번 범위 밖 — 별도 작업으로 다룬다.
-- ─────────────────────────────────────────────────────────────
