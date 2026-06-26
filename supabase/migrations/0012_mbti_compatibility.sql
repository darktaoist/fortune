-- 타오운세 2.0 — 0012 MBTI×MBTI 궁합 프로그래매틱 SEO content
-- 136개 조합(C(16,2)+16) × 4언어(ko/en/ja/zh) = 544행을 사전 생성하여 저장.
-- DeepSeek가 생성 → seed-mbti.mjs 배치가 UPSERT. 페이지는 read-only(공개).
-- 0006(daily_horoscope) 관례 답습: standalone(no FK), RLS public-read.

create table if not exists public.mbti_compatibility (
  id           uuid default gen_random_uuid() primary key,
  pair         varchar(9)  not null,           -- 'ENFJ-INTJ' (알파벳 오름차순, 대문자)
  lang         varchar(5)  not null default 'ko',
  content      jsonb       not null,            -- 11개 섹션 객체 {score,firstmeet,…,shorts}
  compat_score int2,                            -- 0~100 궁합 지수(정렬·표시·JSON-LD용 추출값)
  model        varchar(40),                     -- 생성 모델 기록 (예: deepseek-chat)
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null,
  constraint mbti_compatibility_unique unique (pair, lang)
);

create index if not exists idx_mbti_pair on public.mbti_compatibility using btree (pair);

-- RLS: public read-only (0006 패턴과 동일)
alter table public.mbti_compatibility enable row level security;
drop policy if exists mbti_compatibility_select_public on public.mbti_compatibility;
create policy mbti_compatibility_select_public on public.mbti_compatibility for select using (true);
