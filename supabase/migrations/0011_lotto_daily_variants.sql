-- 주간 로또운세 문구가 같은 bucket이면 매일 동일하게 보이던 문제 해결.
-- bucket당 문구 변형(variant)을 4개로 늘리고, API가 그 날짜 해시로 변형을 골라
-- 같은 강도(bucket)라도 날마다 다른 문장이 나오도록 한다.

alter table public.lotto_daily add column if not exists variant int2 not null default 0;

-- 기존 20행은 variant 0. (bucket,nation) → (bucket,nation,variant)로 유니크 재정의.
alter table public.lotto_daily drop constraint if exists lotto_daily_unique;
alter table public.lotto_daily add constraint lotto_daily_unique unique (bucket, nation, variant);

insert into public.lotto_daily (bucket, nation, variant, phrase) values
  -- ===== 한국어(k) =====
  (0,'k',1,'일 년 중 반드시 피해야 하는 날 중 하나입니다. 구매는 다음으로 미루세요.'),
  (0,'k',2,'재물을 들이면 그만큼 손해로 이어지기 쉬운 날입니다.'),
  (0,'k',3,'운의 흐름이 크게 가라앉은 날, 욕심을 내려놓는 편이 낫습니다.'),
  (1,'k',1,'복권 구입에 좋지 않은 날입니다. 운의 흐름에 막힘이 있습니다.'),
  (1,'k',2,'바라는 것이 클수록 나가는 것이 많은 날이니 구입은 자제하세요.'),
  (1,'k',3,'득보다 실이 조금 더 많은 날, 무리한 베팅은 권하지 않습니다.'),
  (2,'k',1,'너무 평범한 날이에요. 구입운이 특별히 좋은 날은 아닙니다.'),
  (2,'k',2,'구매에는 무리가 없는 날이지만 행운도가 최고조는 아닙니다.'),
  (2,'k',3,'기복 없는 하루입니다. 가볍게 한 장 정도가 적당합니다.'),
  (3,'k',1,'비교적 행운도가 높은 날에 해당하며 재물의 감이 좋습니다.'),
  (3,'k',2,'흐름이 살아나는 날, 평소 눈여겨본 번호를 시도해 볼 만합니다.'),
  (3,'k',3,'작은 행운이 따르는 날입니다. 부담 없는 도전이 어울립니다.'),
  (4,'k',1,'재물운이 활짝 열리는 날, 올해 중 손꼽히는 기회의 날입니다.'),
  (4,'k',2,'당첨 기운이 강하게 감도는 날입니다. 좋은 예감을 믿어보세요.'),
  (4,'k',3,'운의 정점에 가까운 날, 과감한 도전이 빛을 볼 수 있습니다.'),
  -- ===== 영어(e) =====
  (0,'e',1,'One of the days to avoid this year. Postpone any purchase.'),
  (0,'e',2,'Spending today tends to turn into loss. Better to wait.'),
  (0,'e',3,'The flow of luck sinks low today; let go of the urge.'),
  (1,'e',1,'Not a good day to buy — the flow hits a snag.'),
  (1,'e',2,'The more you wish, the more slips away. Hold back today.'),
  (1,'e',3,'Losses slightly outweigh gains; skip the big bet.'),
  (2,'e',1,'A rather plain day. Buying luck isn''t especially strong.'),
  (2,'e',2,'No harm in buying, but luck isn''t at its peak.'),
  (2,'e',3,'A steady, even day. One light ticket is about right.'),
  (3,'e',1,'A fairly lucky day with a good feel for money.'),
  (3,'e',2,'The flow is reviving; try a number you''ve had your eye on.'),
  (3,'e',3,'A little luck follows you today. An easy try fits well.'),
  (4,'e',1,'Fortune swings wide open — one of the best chances this year.'),
  (4,'e',2,'Winning energy is strong today. Trust the good omen.'),
  (4,'e',3,'Near the peak of your luck; a bold try may pay off.'),
  -- ===== 일본어(j) =====
  (0,'j',1,'一年の中でも避けたい日。購入は見送りましょう。'),
  (0,'j',2,'今日は出費がそのまま損につながりやすい日です。'),
  (0,'j',3,'運の流れが大きく沈む日。欲は手放すのが賢明です。'),
  (1,'j',1,'宝くじ購入には不向きな日。流れに詰まりがあります。'),
  (1,'j',2,'望むほど出ていく日。購入は控えめに。'),
  (1,'j',3,'得より損がやや多い日。無理な賭けは禁物です。'),
  (2,'j',1,'ごく平凡な日。購入運が特別良いわけではありません。'),
  (2,'j',2,'購入に支障はないが、幸運度は最高潮ではありません。'),
  (2,'j',3,'起伏のない一日。軽く一枚程度が適当です。'),
  (3,'j',1,'比較的幸運度が高く、金運の勘が働く日です。'),
  (3,'j',2,'流れが上向く日。気になっていた番号を試す価値あり。'),
  (3,'j',3,'小さな幸運が寄り添う日。気軽な挑戦が似合います。'),
  (4,'j',1,'金運が大きく開く日。今年屈指のチャンスです。'),
  (4,'j',2,'当選の気が強く漂う日。良い予感を信じて。'),
  (4,'j',3,'運の頂点に近い日。大胆な挑戦が実を結ぶかも。'),
  -- ===== 중국어 번체(c) =====
  (0,'c',1,'一年中應避開的日子之一，購買請改日。'),
  (0,'c',2,'今日花費容易直接化為損失。'),
  (0,'c',3,'運勢大幅低落的一天，放下執念為宜。'),
  (1,'c',1,'今日不宜購買彩券，運勢有所阻滯。'),
  (1,'c',2,'所求越大流失越多，購買請節制。'),
  (1,'c',3,'得不償失的一天，不建議重注。'),
  (2,'c',1,'相當平凡的一天，購買運並不特別。'),
  (2,'c',2,'購買無妨，但幸運度尚非高峰。'),
  (2,'c',3,'起伏不大的一天，輕鬆一張即可。'),
  (3,'c',1,'幸運度偏高的一天，財運直覺不錯。'),
  (3,'c',2,'流勢回升的一天，可試試心儀的號碼。'),
  (3,'c',3,'小幸運相伴的一天，適合無壓力的嘗試。'),
  (4,'c',1,'財運大開的一天，是今年難得的好機會。'),
  (4,'c',2,'中獎氣場強烈，相信你的好預感。'),
  (4,'c',3,'接近運勢頂點，大膽一試或有斬獲。')
on conflict (bucket, nation, variant) do nothing;
