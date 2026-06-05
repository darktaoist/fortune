-- ============================================================================
-- 타오운세 2.0 — 0002 calenda_data (만세력 / perpetual calendar reference)
-- ----------------------------------------------------------------------------
-- Ported VERBATIM from the 1.0 schema (taounse_data/기존타오운세테이블DDL.sql),
-- column names kept identical ("calenda_data" misspelling preserved) so 1.0
-- saju logic and a row-for-row data copy line up exactly.
--
-- Per-day rows: solar(cd_s*) <-> lunar(cd_l*) date, year/month/day ganji
-- (천간지지: 한자 cd_h*ganjee / 한글 cd_k*ganjee), 절기(terms), moon phase, 띠(cd_ddi).
--
-- This migration creates the SCHEMA only. The data rows live solely in the 1.0
-- Supabase DB and must be copied separately (needs 1.0 connection / export).
--
-- Reference data: RLS enabled with public read; writes via service_role only.
-- ============================================================================

create table if not exists public.calenda_data (
  cd_no          serial4 not null,
  cd_sgi         int2 default 0 not null,
  cd_sy          int2 default 0 not null,
  cd_sm          bpchar(2) default '1'::bpchar not null,
  cd_sd          bpchar(2) default '1'::bpchar not null,
  cd_ly          int2 default 0 not null,
  cd_lm          bpchar(2) default '1'::bpchar not null,
  cd_ld          bpchar(2) default '1'::bpchar not null,
  cd_hyganjee    varchar(6) null,
  cd_kyganjee    varchar(6) null,
  cd_hmganjee    varchar(6) null,
  cd_kmganjee    varchar(6) null,
  cd_hdganjee    varchar(6) null,
  cd_kdganjee    varchar(6) null,
  cd_hweek       bpchar(3) null,
  cd_kweek       bpchar(3) null,
  cd_stars       bpchar(3) null,
  cd_moon_state  bpchar(3) null,
  cd_moon_time   varchar(12) null,
  cd_leap_month  int2 default 0 null,
  cd_month_size  int2 default 0 null,
  cd_hterms      varchar(6) null,
  cd_kterms      varchar(6) null,
  cd_terms_time  varchar(12) null,
  cd_keventday   varchar(6) null,
  cd_ddi         varchar(10) default '쥐'::character varying not null,
  cd_sol_plan    varchar(50) null,
  cd_lun_plan    varchar(50) null,
  holiday        int2 default 0 not null,
  constraint calenda_data_cd_ddi_check check (((cd_ddi)::text = any ((array['쥐'::character varying, '소'::character varying, '호랑이'::character varying, '토끼'::character varying, '용'::character varying, '뱀'::character varying, '말'::character varying, '양'::character varying, '원숭이'::character varying, '닭'::character varying, '개'::character varying, '돼지'::character varying])::text[]))),
  constraint calenda_data_cd_ld_check check ((cd_ld = any (array['1'::bpchar, '2'::bpchar, '3'::bpchar, '4'::bpchar, '5'::bpchar, '6'::bpchar, '7'::bpchar, '8'::bpchar, '9'::bpchar, '10'::bpchar, '11'::bpchar, '12'::bpchar, '13'::bpchar, '14'::bpchar, '15'::bpchar, '16'::bpchar, '17'::bpchar, '18'::bpchar, '19'::bpchar, '20'::bpchar, '21'::bpchar, '22'::bpchar, '23'::bpchar, '24'::bpchar, '25'::bpchar, '26'::bpchar, '27'::bpchar, '28'::bpchar, '29'::bpchar, '30'::bpchar]))),
  constraint calenda_data_cd_lm_check check ((cd_lm = any (array['1'::bpchar, '2'::bpchar, '3'::bpchar, '4'::bpchar, '5'::bpchar, '6'::bpchar, '7'::bpchar, '8'::bpchar, '9'::bpchar, '10'::bpchar, '11'::bpchar, '12'::bpchar]))),
  constraint calenda_data_cd_sd_check check ((cd_sd = any (array['1'::bpchar, '2'::bpchar, '3'::bpchar, '4'::bpchar, '5'::bpchar, '6'::bpchar, '7'::bpchar, '8'::bpchar, '9'::bpchar, '10'::bpchar, '11'::bpchar, '12'::bpchar, '13'::bpchar, '14'::bpchar, '15'::bpchar, '16'::bpchar, '17'::bpchar, '18'::bpchar, '19'::bpchar, '20'::bpchar, '21'::bpchar, '22'::bpchar, '23'::bpchar, '24'::bpchar, '25'::bpchar, '26'::bpchar, '27'::bpchar, '28'::bpchar, '29'::bpchar, '30'::bpchar, '31'::bpchar]))),
  constraint calenda_data_cd_sm_check check ((cd_sm = any (array['1'::bpchar, '2'::bpchar, '3'::bpchar, '4'::bpchar, '5'::bpchar, '6'::bpchar, '7'::bpchar, '8'::bpchar, '9'::bpchar, '10'::bpchar, '11'::bpchar, '12'::bpchar]))),
  constraint calenda_data_pkey primary key (cd_no)
);

-- Lookup indexes for saju computation (find ganji by solar / lunar date).
create index if not exists calenda_data_solar_idx on public.calenda_data (cd_sy, cd_sm, cd_sd);
create index if not exists calenda_data_lunar_idx on public.calenda_data (cd_ly, cd_lm, cd_ld);

-- Reference data: public read, writes via service_role only.
alter table public.calenda_data enable row level security;
drop policy if exists "calenda_data_select_public" on public.calenda_data;
create policy "calenda_data_select_public" on public.calenda_data for select using (true);
