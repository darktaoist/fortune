-- ============================================================================
-- 타오운세 2.0 — 0005 faq (FAQ content, multilingual)
-- Ported from 1.0 (legacy update_updated_at_column triggers dropped). RLS public-read.
-- ============================================================================

-- faq_categories (parent)
create table if not exists public.faq_categories (
  id         serial4 primary key,
  code       varchar(50) not null,
  sort_order int4 default 0,
  is_active  bool default true,
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp,
  constraint faq_categories_code_key unique (code)
);
create index if not exists idx_faq_categories_active on public.faq_categories using btree (is_active, sort_order);

-- faqs (child → faq_categories)
create table if not exists public.faqs (
  id          serial4 primary key,
  category_id int4,
  sort_order  int4 default 0,
  is_active   bool default true,
  created_at  timestamp default current_timestamp,
  updated_at  timestamp default current_timestamp,
  constraint faqs_category_id_fkey foreign key (category_id) references public.faq_categories(id) on delete cascade
);
create index if not exists idx_faqs_category on public.faqs using btree (category_id, is_active, sort_order);

-- faq_translations (child → faq_categories, faqs)
create table if not exists public.faq_translations (
  id            serial4 primary key,
  category_id   int4,
  faq_id        int4,
  language_code varchar(5) not null,
  title         text not null,
  "content"     text,
  created_at    timestamp default current_timestamp,
  updated_at    timestamp default current_timestamp,
  constraint check_category_or_faq check ((((category_id is not null) and (faq_id is null)) or ((category_id is null) and (faq_id is not null)))),
  constraint unique_category_language unique (category_id, language_code),
  constraint unique_faq_language unique (faq_id, language_code),
  constraint faq_translations_category_id_fkey foreign key (category_id) references public.faq_categories(id) on delete cascade,
  constraint faq_translations_faq_id_fkey foreign key (faq_id) references public.faqs(id) on delete cascade
);
create index if not exists idx_faq_translations_category on public.faq_translations using btree (category_id, language_code);
create index if not exists idx_faq_translations_faq on public.faq_translations using btree (faq_id, language_code);

-- RLS: public read
do $$
declare t text;
begin
  foreach t in array array['faq_categories','faqs','faq_translations']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t||'_select_public', t);
    execute format('create policy %I on public.%I for select using (true)', t||'_select_public', t);
  end loop;
end $$;
