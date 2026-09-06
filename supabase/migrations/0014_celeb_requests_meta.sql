-- ============================================================================
-- 타오운세 2.0 — 0014 celeb_requests 요청 출처 메타(ip / user_agent / referer)
-- 스팸 봇이 공개 폼(/api/celeb-request)에 name='e', note='e' 를 반복 제출했는데
-- 테이블에 출처 정보가 없어 사람인지 봇인지 판정할 수 없었다. 통과한 요청에 한해
-- 출처를 남겨 다음에 또 오면 즉시 판별한다. 전부 nullable — 헤더가 없거나
-- 프록시가 안 붙여줘도 저장은 실패하지 않는다.
-- ============================================================================
alter table public.celeb_requests add column if not exists ip         text;
alter table public.celeb_requests add column if not exists user_agent text;
alter table public.celeb_requests add column if not exists referer    text;
