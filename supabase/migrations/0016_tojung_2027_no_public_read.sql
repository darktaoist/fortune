-- ============================================================================
-- 타오운세 2.0 — 0016 tojung_yearly / tojung_monthly 공개 읽기 정책 제거
-- 0015의 "published면 누구나 select" 정책은 유료 본문(항목별·월별 조언 등)을
-- anon 키로 결제 없이 읽을 수 있게 만든다. 정책을 지워 RLS만 남기면 anon/
-- authenticated는 0행, 2027 데이터는 서버 API(service role)로만 내려간다.
-- ============================================================================
begin;
drop policy if exists yearly_read  on public.tojung_yearly;
drop policy if exists monthly_read on public.tojung_monthly;
commit;
