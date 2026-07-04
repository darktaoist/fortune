-- 타오운세 2.0 — 0013 연예인 궁합·연예인 MBTI 궁합 무료화(결제벽→로그인벽) 일일 쿼터
-- 무료 전환에 따른 무한 API 비용 방어: 계정당 1일 N회(기본 3회, celeb+mbti 합산)로 제한.
-- KST(Asia/Seoul) 날짜 기준. 서버(service_role)만 접근 — RLS on + 정책 없음 = anon/authenticated 차단.
-- 소모는 premium-stream의 streamText 직전에 원자적으로 예약(consume), 생성 실패 시 환불(refund).

create table if not exists public.celeb_free_usage (
  owner_id   uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,                 -- KST 기준 날짜(YYYY-MM-DD)
  count      int  not null default 0,
  updated_at timestamptz not null default now(),
  primary key (owner_id, usage_date)
);

-- 서버 전용: RLS 켜고 정책을 두지 않아 anon/authenticated 직접 접근을 완전 차단한다.
alter table public.celeb_free_usage enable row level security;

-- ---------------------------------------------------------------------------
-- consume_celeb_quota: 원자적 예약(increment). 한도 미만이면 +1 후 새 count 반환,
--   한도 도달 시 -1 반환(증가 안 함). INSERT ... ON CONFLICT의 행잠금으로
--   동시요청/중복클릭이 직렬화되어 우회가 불가능하다.
-- ---------------------------------------------------------------------------
create or replace function public.consume_celeb_quota(p_owner uuid, p_date date, p_limit int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare cur int;
begin
  insert into public.celeb_free_usage (owner_id, usage_date, count)
  values (p_owner, p_date, 1)
  on conflict (owner_id, usage_date)
    do update set count = celeb_free_usage.count + 1, updated_at = now()
    where celeb_free_usage.count < p_limit
  returning count into cur;

  if cur is null then
    return -1;  -- 기존 행이 있으나 count >= limit → update 스킵됨(한도 초과)
  end if;
  return cur;   -- 신규(=1) 또는 증가된 count
end;
$$;

-- ---------------------------------------------------------------------------
-- refund_celeb_quota: 생성 실패(AI 오류·언어누수로 미저장) 시 예약을 되돌린다.
--   floor 0. 성공 시엔 호출하지 않으므로 성공분만 확정된다.
-- ---------------------------------------------------------------------------
create or replace function public.refund_celeb_quota(p_owner uuid, p_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.celeb_free_usage
     set count = greatest(count - 1, 0), updated_at = now()
   where owner_id = p_owner and usage_date = p_date;
end;
$$;

-- ---------------------------------------------------------------------------
-- celeb_quota_remaining: 잔여 횟수(읽기 전용). 진입 시 소진 화면 판단·표시용.
--   실제 소모는 consume_celeb_quota가 담당(TOCTOU 무해 — 비용점 게이트는 예약 쪽).
-- ---------------------------------------------------------------------------
create or replace function public.celeb_quota_remaining(p_owner uuid, p_date date, p_limit int)
returns int
language sql
security definer
set search_path = public
as $$
  select greatest(
    p_limit - coalesce(
      (select count from public.celeb_free_usage where owner_id = p_owner and usage_date = p_date),
      0),
    0);
$$;

-- 서버(service_role)만 실행. public/anon/authenticated의 RPC 노출 차단.
revoke execute on function public.consume_celeb_quota(uuid, date, int)  from public, anon, authenticated;
revoke execute on function public.refund_celeb_quota(uuid, date)        from public, anon, authenticated;
revoke execute on function public.celeb_quota_remaining(uuid, date, int) from public, anon, authenticated;
grant  execute on function public.consume_celeb_quota(uuid, date, int)  to service_role;
grant  execute on function public.refund_celeb_quota(uuid, date)        to service_role;
grant  execute on function public.celeb_quota_remaining(uuid, date, int) to service_role;
