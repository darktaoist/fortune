-- ============================================================================
-- 타오운세 2.0 — 0008 daily_horoscope 행운 요소 구조화 컬럼
-- 행운의 색/숫자/방위를 content 텍스트에서 분리해 별도 컬럼으로 저장한다(메인
-- 띠별 위젯이 색 스와치/숫자/방위를 따로 렌더). 색 이름·방위는 행이 언어별이라
-- 현지화된 값을 그대로 저장하고, hex는 스와치용.
-- ============================================================================
alter table public.daily_horoscope
  add column if not exists lucky_color     text,
  add column if not exists lucky_color_hex varchar(7),
  add column if not exists lucky_number    int2,
  add column if not exists lucky_dir       text;
