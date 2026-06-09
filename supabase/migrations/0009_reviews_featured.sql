-- ============================================================================
-- 타오운세 2.0 — 0009 reviews 큐레이션
-- ----------------------------------------------------------------------------
-- 메인 "그들의 이야기"에 노출할 후기를 관리자가 직접 선택(featured)할 수 있게 한다.
-- 관리자 페이지가 따로 없으므로 큐레이션은 Supabase 대시보드(Table Editor)에서
-- featured 체크 + author_name(표시 이름) 입력으로 수행한다.
--
-- author_name: profiles는 RLS상 본인만 select 가능 → 비로그인 방문자가 작성자
-- 닉네임을 읽을 수 없으므로, 표시 이름을 reviews에 비정규화해 저장한다.
-- (후기 작성 시 닉네임으로 자동 채움, 대시보드에서 수정 가능)
--
-- Idempotent.
-- ============================================================================

alter table public.reviews add column if not exists featured    boolean not null default false;
alter table public.reviews add column if not exists author_name text;

create index if not exists reviews_featured_idx on public.reviews(featured, created_at desc);

-- 비로그인 방문자도 featured 후기는 읽을 수 있어야 메인에 노출된다.
drop policy if exists "reviews_select_featured" on public.reviews;
create policy "reviews_select_featured" on public.reviews for select using (featured = true);
