-- ============================================================================
-- 타오운세 2.0 — 0003 languages (reference; FK target for *_translations)
-- Ported from 1.0. Legacy update_timestamp() trigger dropped. RLS public-read.
-- ============================================================================
create table if not exists public.languages (
  code       varchar(2) primary key,
  "name"     varchar(50) not null,
  is_default boolean default false,
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp
);

alter table public.languages enable row level security;
drop policy if exists "languages_select_public" on public.languages;
create policy "languages_select_public" on public.languages for select using (true);
