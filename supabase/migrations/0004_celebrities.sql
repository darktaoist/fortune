-- ============================================================================
-- 타오운세 2.0 — 0004 celebrities (연예인 궁합 reference data)
-- Ported verbatim from 1.0 (legacy update_timestamp triggers dropped).
-- Tables in dependency order. RLS: public read; writes via service_role.
-- Depends on 0003 languages.
-- ============================================================================

-- celebrity_categories (parent)
create table if not exists public.celebrity_categories (
  id         serial4 primary key,
  slug       varchar(50) not null,
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp,
  constraint celebrity_categories_slug_key unique (slug)
);

-- celebrities (parent)
create table if not exists public.celebrities (
  id            serial4 primary key,
  slug          varchar(50) not null,
  image_path    varchar(255) not null,
  birth_year    int4 not null,
  birth_month   int4 not null,
  birth_day     int4 not null,
  birth_time    varchar(4),
  gender        bpchar(1) not null,
  calendar_type varchar(10) not null,
  active        bool default true,
  sort_order    int4 default 0,
  created_at    timestamp default current_timestamp,
  updated_at    timestamp default current_timestamp,
  mbti          varchar(4),
  constraint celebrities_birth_day_check check (((birth_day >= 1) and (birth_day <= 31))),
  constraint celebrities_birth_month_check check (((birth_month >= 1) and (birth_month <= 12))),
  constraint celebrities_calendar_type_check check (((calendar_type)::text = any ((array['solar'::character varying, 'lunar'::character varying, 'lunar_leap'::character varying])::text[]))),
  constraint celebrities_gender_check check ((gender = any (array['M'::bpchar, 'F'::bpchar]))),
  constraint celebrities_mbti_check check (((mbti)::text = any ((array['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP']::character varying[])::text[]))),
  constraint celebrities_slug_key unique (slug)
);

-- celebrity_translations (child → celebrities, languages)
create table if not exists public.celebrity_translations (
  id                  serial4 primary key,
  celebrity_id        int4 not null,
  language_code       varchar(2) not null,
  "name"              varchar(100) not null,
  description         text not null,
  occupation          varchar(100),
  gender_label        varchar(20) not null,
  calendar_type_label varchar(20) not null,
  created_at          timestamp default current_timestamp,
  updated_at          timestamp default current_timestamp,
  constraint celebrity_translations_celebrity_id_language_code_key unique (celebrity_id, language_code),
  constraint celebrity_translations_celebrity_id_fkey foreign key (celebrity_id) references public.celebrities(id) on delete cascade,
  constraint celebrity_translations_language_code_fkey foreign key (language_code) references public.languages(code) on delete cascade
);

-- category_translations (child → celebrity_categories, languages)
create table if not exists public.category_translations (
  id            serial4 primary key,
  category_id   int4 not null,
  language_code varchar(2) not null,
  "name"        varchar(100) not null,
  description   text,
  created_at    timestamp default current_timestamp,
  updated_at    timestamp default current_timestamp,
  constraint category_translations_category_id_language_code_key unique (category_id, language_code),
  constraint category_translations_category_id_fkey foreign key (category_id) references public.celebrity_categories(id) on delete cascade,
  constraint category_translations_language_code_fkey foreign key (language_code) references public.languages(code) on delete cascade
);

-- celebrity_category_map (join → celebrities, celebrity_categories)
create table if not exists public.celebrity_category_map (
  celebrity_id int4 not null,
  category_id  int4 not null,
  constraint celebrity_category_map_pkey primary key (celebrity_id, category_id),
  constraint celebrity_category_map_category_id_fkey foreign key (category_id) references public.celebrity_categories(id) on delete cascade,
  constraint celebrity_category_map_celebrity_id_fkey foreign key (celebrity_id) references public.celebrities(id) on delete cascade
);

-- RLS: public read on all celebrity reference tables
do $$
declare t text;
begin
  foreach t in array array['celebrity_categories','celebrities','celebrity_translations','category_translations','celebrity_category_map']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t||'_select_public', t);
    execute format('create policy %I on public.%I for select using (true)', t||'_select_public', t);
  end loop;
end $$;
