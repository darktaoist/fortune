

기존 타오운세 1.0 디비 연결정보
postgresql://postgres.rzzenxydqbpkroxaowha:Dmdol72490!@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres

-- public.blog_categories definition

-- Drop table

-- DROP TABLE public.blog_categories;

CREATE TABLE public.blog_categories (
	id serial4 NOT NULL,
	"name" varchar(100) NOT NULL,
	description text NULL,
	slug varchar(100) NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT blog_categories_name_key UNIQUE (name),
	CONSTRAINT blog_categories_pkey PRIMARY KEY (id),
	CONSTRAINT blog_categories_slug_key UNIQUE (slug)
);
CREATE INDEX idx_blog_categories_slug ON public.blog_categories USING btree (slug);


-- public.borninfo definition

-- Drop table

-- DROP TABLE public.borninfo;

CREATE TABLE public.borninfo (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	browser_id varchar(255) NOT NULL,
	"name" varchar(100) NULL,
	sex varchar(10) NOT NULL,
	"year" varchar(10) NOT NULL,
	"month" varchar(10) NOT NULL,
	"date" varchar(10) NOT NULL,
	"time" varchar(10) NOT NULL,
	calendar_type varchar(20) NOT NULL,
	country varchar(50) NOT NULL,
	device_type varchar(20) NOT NULL,
	browser_name varchar(50) NULL,
	device_os varchar(50) NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	is_active bool DEFAULT true NULL,
	lyear varchar(10) NULL,
	lmonth varchar(10) NULL,
	ldate varchar(10) NULL,
	mbti varchar(4) NULL,
	CONSTRAINT borninfo_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_borninfo_browser_id ON public.borninfo USING btree (browser_id);
CREATE INDEX idx_borninfo_created_at ON public.borninfo USING btree (created_at);


-- public.calenda_data definition

-- Drop table

-- DROP TABLE public.calenda_data;

CREATE TABLE public.calenda_data (
	cd_no serial4 NOT NULL,
	cd_sgi int2 DEFAULT 0 NOT NULL,
	cd_sy int2 DEFAULT 0 NOT NULL,
	cd_sm bpchar(2) DEFAULT '1'::bpchar NOT NULL,
	cd_sd bpchar(2) DEFAULT '1'::bpchar NOT NULL,
	cd_ly int2 DEFAULT 0 NOT NULL,
	cd_lm bpchar(2) DEFAULT '1'::bpchar NOT NULL,
	cd_ld bpchar(2) DEFAULT '1'::bpchar NOT NULL,
	cd_hyganjee varchar(6) NULL,
	cd_kyganjee varchar(6) NULL,
	cd_hmganjee varchar(6) NULL,
	cd_kmganjee varchar(6) NULL,
	cd_hdganjee varchar(6) NULL,
	cd_kdganjee varchar(6) NULL,
	cd_hweek bpchar(3) NULL,
	cd_kweek bpchar(3) NULL,
	cd_stars bpchar(3) NULL,
	cd_moon_state bpchar(3) NULL,
	cd_moon_time varchar(12) NULL,
	cd_leap_month int2 DEFAULT 0 NULL,
	cd_month_size int2 DEFAULT 0 NULL,
	cd_hterms varchar(6) NULL,
	cd_kterms varchar(6) NULL,
	cd_terms_time varchar(12) NULL,
	cd_keventday varchar(6) NULL,
	cd_ddi varchar(10) DEFAULT '쥐'::character varying NOT NULL,
	cd_sol_plan varchar(50) NULL,
	cd_lun_plan varchar(50) NULL,
	holiday int2 DEFAULT 0 NOT NULL,
	CONSTRAINT calenda_data_cd_ddi_check CHECK (((cd_ddi)::text = ANY ((ARRAY['쥐'::character varying, '소'::character varying, '호랑이'::character varying, '토끼'::character varying, '용'::character varying, '뱀'::character varying, '말'::character varying, '양'::character varying, '원숭이'::character varying, '닭'::character varying, '개'::character varying, '돼지'::character varying])::text[]))),
	CONSTRAINT calenda_data_cd_ld_check CHECK ((cd_ld = ANY (ARRAY['1'::bpchar, '2'::bpchar, '3'::bpchar, '4'::bpchar, '5'::bpchar, '6'::bpchar, '7'::bpchar, '8'::bpchar, '9'::bpchar, '10'::bpchar, '11'::bpchar, '12'::bpchar, '13'::bpchar, '14'::bpchar, '15'::bpchar, '16'::bpchar, '17'::bpchar, '18'::bpchar, '19'::bpchar, '20'::bpchar, '21'::bpchar, '22'::bpchar, '23'::bpchar, '24'::bpchar, '25'::bpchar, '26'::bpchar, '27'::bpchar, '28'::bpchar, '29'::bpchar, '30'::bpchar]))),
	CONSTRAINT calenda_data_cd_lm_check CHECK ((cd_lm = ANY (ARRAY['1'::bpchar, '2'::bpchar, '3'::bpchar, '4'::bpchar, '5'::bpchar, '6'::bpchar, '7'::bpchar, '8'::bpchar, '9'::bpchar, '10'::bpchar, '11'::bpchar, '12'::bpchar]))),
	CONSTRAINT calenda_data_cd_sd_check CHECK ((cd_sd = ANY (ARRAY['1'::bpchar, '2'::bpchar, '3'::bpchar, '4'::bpchar, '5'::bpchar, '6'::bpchar, '7'::bpchar, '8'::bpchar, '9'::bpchar, '10'::bpchar, '11'::bpchar, '12'::bpchar, '13'::bpchar, '14'::bpchar, '15'::bpchar, '16'::bpchar, '17'::bpchar, '18'::bpchar, '19'::bpchar, '20'::bpchar, '21'::bpchar, '22'::bpchar, '23'::bpchar, '24'::bpchar, '25'::bpchar, '26'::bpchar, '27'::bpchar, '28'::bpchar, '29'::bpchar, '30'::bpchar, '31'::bpchar]))),
	CONSTRAINT calenda_data_cd_sm_check CHECK ((cd_sm = ANY (ARRAY['1'::bpchar, '2'::bpchar, '3'::bpchar, '4'::bpchar, '5'::bpchar, '6'::bpchar, '7'::bpchar, '8'::bpchar, '9'::bpchar, '10'::bpchar, '11'::bpchar, '12'::bpchar]))),
	CONSTRAINT calenda_data_pkey PRIMARY KEY (cd_no)
);


-- public.celebrities definition

-- Drop table

-- DROP TABLE public.celebrities;

CREATE TABLE public.celebrities (
	id serial4 NOT NULL,
	slug varchar(50) NOT NULL,
	image_path varchar(255) NOT NULL,
	birth_year int4 NOT NULL,
	birth_month int4 NOT NULL,
	birth_day int4 NOT NULL,
	birth_time varchar(4) NULL,
	gender bpchar(1) NOT NULL,
	calendar_type varchar(10) NOT NULL,
	active bool DEFAULT true NULL,
	sort_order int4 DEFAULT 0 NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	mbti varchar(4) NULL,
	CONSTRAINT celebrities_birth_day_check CHECK (((birth_day >= 1) AND (birth_day <= 31))),
	CONSTRAINT celebrities_birth_month_check CHECK (((birth_month >= 1) AND (birth_month <= 12))),
	CONSTRAINT celebrities_calendar_type_check CHECK (((calendar_type)::text = ANY ((ARRAY['solar'::character varying, 'lunar'::character varying, 'lunar_leap'::character varying])::text[]))),
	CONSTRAINT celebrities_gender_check CHECK ((gender = ANY (ARRAY['M'::bpchar, 'F'::bpchar]))),
	CONSTRAINT celebrities_mbti_check CHECK (((mbti)::text = ANY ((ARRAY['INTJ'::character varying, 'INTP'::character varying, 'ENTJ'::character varying, 'ENTP'::character varying, 'INFJ'::character varying, 'INFP'::character varying, 'ENFJ'::character varying, 'ENFP'::character varying, 'ISTJ'::character varying, 'ISFJ'::character varying, 'ESTJ'::character varying, 'ESFJ'::character varying, 'ISTP'::character varying, 'ISFP'::character varying, 'ESTP'::character varying, 'ESFP'::character varying])::text[]))),
	CONSTRAINT celebrities_pkey PRIMARY KEY (id),
	CONSTRAINT celebrities_slug_key UNIQUE (slug)
);

-- Table Triggers

create trigger update_celebrities_timestamp before
update
    on
    public.celebrities for each row execute function update_timestamp();


-- public.celebrity_categories definition

-- Drop table

-- DROP TABLE public.celebrity_categories;

CREATE TABLE public.celebrity_categories (
	id serial4 NOT NULL,
	slug varchar(50) NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT celebrity_categories_pkey PRIMARY KEY (id),
	CONSTRAINT celebrity_categories_slug_key UNIQUE (slug)
);

-- Table Triggers

create trigger update_celebrity_categories_timestamp before
update
    on
    public.celebrity_categories for each row execute function update_timestamp();


-- public.celebrity_requests definition

-- Drop table

-- DROP TABLE public.celebrity_requests;

CREATE TABLE public.celebrity_requests (
	id int8 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	"name" text NOT NULL,
	description text NULL,
	user_ip text NULL,
	status text DEFAULT 'pending'::text NULL,
	created_at timestamptz DEFAULT now() NULL,
	CONSTRAINT celebrity_requests_pkey PRIMARY KEY (id)
);


-- public.customer_inquiries definition

-- Drop table

-- DROP TABLE public.customer_inquiries;

CREATE TABLE public.customer_inquiries (
	id serial4 NOT NULL,
	"name" varchar(100) NOT NULL,
	email varchar(255) NOT NULL,
	subject varchar(255) NOT NULL,
	"content" text NOT NULL,
	status varchar(20) DEFAULT 'pending'::character varying NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	CONSTRAINT customer_inquiries_pkey PRIMARY KEY (id)
);


-- public.daily_horoscope definition

-- Drop table

-- DROP TABLE public.daily_horoscope;

CREATE TABLE public.daily_horoscope (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	target_date date NOT NULL,
	zodiac_ko varchar(10) NOT NULL,
	birth_years text NOT NULL,
	"content" text NOT NULL,
	created_at timestamptz DEFAULT now() NULL,
	lang varchar(5) DEFAULT 'ko'::character varying NOT NULL,
	CONSTRAINT daily_horoscope_pkey PRIMARY KEY (id),
	CONSTRAINT daily_horoscope_unique UNIQUE (target_date, zodiac_ko, lang)
);
CREATE INDEX idx_horoscope_date ON public.daily_horoscope USING btree (target_date);


-- public.faq_categories definition

-- Drop table

-- DROP TABLE public.faq_categories;

CREATE TABLE public.faq_categories (
	id serial4 NOT NULL,
	code varchar(50) NOT NULL,
	sort_order int4 DEFAULT 0 NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT faq_categories_code_key UNIQUE (code),
	CONSTRAINT faq_categories_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_faq_categories_active ON public.faq_categories USING btree (is_active, sort_order);

-- Table Triggers

create trigger update_faq_categories_updated_at before
update
    on
    public.faq_categories for each row execute function update_updated_at_column();


-- public.fortune_results definition

-- Drop table

-- DROP TABLE public.fortune_results;

CREATE TABLE public.fortune_results (
	id serial4 NOT NULL,
	order_id varchar(100) NOT NULL,
	email varchar(255) NULL,
	birth_year int4 NOT NULL,
	birth_month int4 NOT NULL,
	birth_day int4 NOT NULL,
	birth_hour int4 DEFAULT 0 NULL,
	birth_minute int4 DEFAULT 0 NULL,
	gender varchar(10) NOT NULL,
	"name" varchar(100) NULL,
	calendar_type varchar(20) DEFAULT '양력'::character varying NULL,
	country varchar(50) DEFAULT '대한민국'::character varying NULL,
	fortune_type varchar(50) NOT NULL,
	fortune_data jsonb NOT NULL,
	user_info jsonb NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	accessed_count int4 DEFAULT 0 NULL,
	last_accessed_at timestamptz NULL,
	CONSTRAINT fortune_results_calendar_type_check CHECK (((calendar_type)::text = ANY ((ARRAY['양력'::character varying, '음력'::character varying, '음력(윤달)'::character varying])::text[]))),
	CONSTRAINT fortune_results_gender_check CHECK (((gender)::text = ANY ((ARRAY['남'::character varying, '여'::character varying])::text[]))),
	CONSTRAINT fortune_results_order_id_key UNIQUE (order_id),
	CONSTRAINT fortune_results_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_fortune_results_created_at ON public.fortune_results USING btree (created_at);
CREATE INDEX idx_fortune_results_email ON public.fortune_results USING btree (email);
CREATE INDEX idx_fortune_results_fortune_type ON public.fortune_results USING btree (fortune_type);
CREATE INDEX idx_fortune_results_order_id ON public.fortune_results USING btree (order_id);

-- Table Triggers

create trigger update_fortune_results_updated_at before
update
    on
    public.fortune_results for each row execute function update_updated_at_column();


-- public.gunghap_results definition

-- Drop table

-- DROP TABLE public.gunghap_results;

CREATE TABLE public.gunghap_results (
	id serial4 NOT NULL,
	order_id varchar(255) NOT NULL,
	user_info jsonb NOT NULL,
	celebrity_info jsonb NOT NULL,
	result_data jsonb NOT NULL,
	user_email varchar(255) NULL,
	created_at timestamp DEFAULT now() NULL,
	CONSTRAINT gunghap_results_order_id_key UNIQUE (order_id),
	CONSTRAINT gunghap_results_pkey PRIMARY KEY (id)
);


-- public.languages definition

-- Drop table

-- DROP TABLE public.languages;

CREATE TABLE public.languages (
	code varchar(2) NOT NULL,
	"name" varchar(50) NOT NULL,
	is_default bool DEFAULT false NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT languages_pkey PRIMARY KEY (code)
);

-- Table Triggers

create trigger update_languages_timestamp before
update
    on
    public.languages for each row execute function update_timestamp();


-- public.lifeall definition

-- Drop table

-- DROP TABLE public.lifeall;

CREATE TABLE public.lifeall (
	id int8 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	num varchar NULL,
	sajuwoon text NULL,
	earlyyear text NULL,
	middleyear text NULL,
	lastyear text NULL,
	lovewealth text NULL,
	jobhealth text NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	nation varchar(10) DEFAULT 'k'::character varying NULL,
	CONSTRAINT lifeall_pkey PRIMARY KEY (id)
);


-- public.lotto definition

-- Drop table

-- DROP TABLE public.lotto;

CREATE TABLE public.lotto (
	id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 0 MAXVALUE 2147483647 START 0 CACHE 1 NO CYCLE) NOT NULL,
	num varchar NOT NULL,
	unsetotal text NULL,
	lottolucky text NULL,
	wish text NULL,
	created_at timestamptz NOT NULL,
	nation varchar(10) DEFAULT 'k'::character varying NULL,
	CONSTRAINT lotto_pkey PRIMARY KEY (id)
);


-- public.month_unse definition

-- Drop table

-- DROP TABLE public.month_unse;

CREATE TABLE public.month_unse (
	id int8 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	num varchar NULL,
	total text NULL,
	manwoman text NULL,
	date_unse text NULL,
	kind_unse text NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	nation varchar DEFAULT 'k'::character varying NULL,
	CONSTRAINT month_unse_pkey PRIMARY KEY (id)
);


-- public.payments definition

-- Drop table

-- DROP TABLE public.payments;

CREATE TABLE public.payments (
	id bigserial NOT NULL,
	payment_key text NOT NULL,
	order_id varchar NOT NULL,
	amount numeric NOT NULL,
	status varchar NOT NULL,
	payment_type varchar NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	customer_name varchar NULL,
	customer_email varchar NULL,
	product_name varchar NULL,
	CONSTRAINT payments_payment_key_key UNIQUE (payment_key),
	CONSTRAINT payments_pkey PRIMARY KEY (id)
);


-- public.today definition

-- Drop table

-- DROP TABLE public.today;

CREATE TABLE public.today (
	id int8 NOT NULL,
	total text NULL,
	"money" text NULL,
	biz text NULL,
	job text NULL,
	love text NULL,
	wish text NULL,
	hope text NULL,
	"number" varchar NULL,
	created_at timestamptz NOT NULL,
	nation varchar DEFAULT 'k'::character varying NULL
);


-- public.today_date_unse definition

-- Drop table

-- DROP TABLE public.today_date_unse;

CREATE TABLE public.today_date_unse (
	id int8 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	num varchar NULL,
	sex varchar NULL,
	datetotal text NULL,
	dateplace text NULL,
	datewish text NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	nation varchar DEFAULT 'k'::character varying NOT NULL,
	CONSTRAINT today_date_unse_pkey PRIMARY KEY (id)
);


-- public.tojung definition

-- Drop table

-- DROP TABLE public.tojung;

CREATE TABLE public.tojung (
	id int8 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	num varchar NULL,
	total text NULL,
	jan text NULL,
	feb text NULL,
	mar text NULL,
	apr text NULL,
	may text NULL,
	jun text NULL,
	jul text NULL,
	aug text NULL,
	sep text NULL,
	oct text NULL,
	nov text NULL,
	"dec" text NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	nation varchar DEFAULT 'k'::character varying NULL,
	CONSTRAINT tojung_pkey PRIMARY KEY (id)
);


-- public.tojung_backup definition

-- Drop table

-- DROP TABLE public.tojung_backup;

CREATE TABLE public.tojung_backup (
	id int8 NULL,
	num varchar NULL,
	total text NULL,
	jan text NULL,
	feb text NULL,
	mar text NULL,
	apr text NULL,
	may text NULL,
	jun text NULL,
	jul text NULL,
	aug text NULL,
	sep text NULL,
	oct text NULL,
	nov text NULL,
	"dec" text NULL,
	created_at timestamptz NULL,
	nation varchar NULL
);


-- public.blog_posts definition

-- Drop table

-- DROP TABLE public.blog_posts;

CREATE TABLE public.blog_posts (
	id serial4 NOT NULL,
	title varchar(255) NOT NULL,
	slug varchar(255) NOT NULL,
	"content" text NOT NULL,
	excerpt text NULL,
	featured_image varchar(500) NULL,
	status varchar(20) DEFAULT 'draft'::character varying NULL,
	published_at timestamp NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	views_count int4 DEFAULT 0 NULL,
	tags _text NULL,
	meta_title varchar(255) NULL,
	meta_description text NULL,
	category_id int4 NULL,
	CONSTRAINT blog_posts_pkey PRIMARY KEY (id),
	CONSTRAINT blog_posts_slug_key UNIQUE (slug),
	CONSTRAINT blog_posts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.blog_categories(id)
);
CREATE INDEX idx_blog_posts_category_id ON public.blog_posts USING btree (category_id);
CREATE INDEX idx_blog_posts_published_at ON public.blog_posts USING btree (published_at);
CREATE INDEX idx_blog_posts_slug ON public.blog_posts USING btree (slug);
CREATE INDEX idx_blog_posts_status ON public.blog_posts USING btree (status);
CREATE INDEX idx_blog_posts_tags ON public.blog_posts USING gin (tags);


-- public.category_translations definition

-- Drop table

-- DROP TABLE public.category_translations;

CREATE TABLE public.category_translations (
	id serial4 NOT NULL,
	category_id int4 NOT NULL,
	language_code varchar(2) NOT NULL,
	"name" varchar(100) NOT NULL,
	description text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT category_translations_category_id_language_code_key UNIQUE (category_id, language_code),
	CONSTRAINT category_translations_pkey PRIMARY KEY (id),
	CONSTRAINT category_translations_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.celebrity_categories(id) ON DELETE CASCADE,
	CONSTRAINT category_translations_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.languages(code) ON DELETE CASCADE
);

-- Table Triggers

create trigger update_category_translations_timestamp before
update
    on
    public.category_translations for each row execute function update_timestamp();


-- public.celebrity_category_map definition

-- Drop table

-- DROP TABLE public.celebrity_category_map;

CREATE TABLE public.celebrity_category_map (
	celebrity_id int4 NOT NULL,
	category_id int4 NOT NULL,
	CONSTRAINT celebrity_category_map_pkey PRIMARY KEY (celebrity_id, category_id),
	CONSTRAINT celebrity_category_map_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.celebrity_categories(id) ON DELETE CASCADE,
	CONSTRAINT celebrity_category_map_celebrity_id_fkey FOREIGN KEY (celebrity_id) REFERENCES public.celebrities(id) ON DELETE CASCADE
);


-- public.celebrity_translations definition

-- Drop table

-- DROP TABLE public.celebrity_translations;

CREATE TABLE public.celebrity_translations (
	id serial4 NOT NULL,
	celebrity_id int4 NOT NULL,
	language_code varchar(2) NOT NULL,
	"name" varchar(100) NOT NULL,
	description text NOT NULL,
	occupation varchar(100) NULL,
	gender_label varchar(20) NOT NULL,
	calendar_type_label varchar(20) NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT celebrity_translations_celebrity_id_language_code_key UNIQUE (celebrity_id, language_code),
	CONSTRAINT celebrity_translations_pkey PRIMARY KEY (id),
	CONSTRAINT celebrity_translations_celebrity_id_fkey FOREIGN KEY (celebrity_id) REFERENCES public.celebrities(id) ON DELETE CASCADE,
	CONSTRAINT celebrity_translations_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.languages(code) ON DELETE CASCADE
);

-- Table Triggers

create trigger update_celebrity_translations_timestamp before
update
    on
    public.celebrity_translations for each row execute function update_timestamp();


-- public.faqs definition

-- Drop table

-- DROP TABLE public.faqs;

CREATE TABLE public.faqs (
	id serial4 NOT NULL,
	category_id int4 NULL,
	sort_order int4 DEFAULT 0 NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT faqs_pkey PRIMARY KEY (id),
	CONSTRAINT faqs_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.faq_categories(id) ON DELETE CASCADE
);
CREATE INDEX idx_faqs_category ON public.faqs USING btree (category_id, is_active, sort_order);

-- Table Triggers

create trigger update_faqs_updated_at before
update
    on
    public.faqs for each row execute function update_updated_at_column();


-- public.blog_comments definition

-- Drop table

-- DROP TABLE public.blog_comments;

CREATE TABLE public.blog_comments (
	id serial4 NOT NULL,
	post_id int4 NOT NULL,
	author_name varchar(50) NOT NULL,
	author_email varchar(100) NULL,
	"content" text NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	is_deleted bool DEFAULT false NULL,
	CONSTRAINT blog_comments_pkey PRIMARY KEY (id),
	CONSTRAINT blog_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.blog_posts(id) ON DELETE CASCADE
);
CREATE INDEX idx_blog_comments_created_at ON public.blog_comments USING btree (created_at);
CREATE INDEX idx_blog_comments_post_id ON public.blog_comments USING btree (post_id);


-- public.blog_images definition

-- Drop table

-- DROP TABLE public.blog_images;

CREATE TABLE public.blog_images (
	id serial4 NOT NULL,
	post_id int4 NULL,
	image_url varchar(500) NOT NULL,
	alt_text varchar(255) NULL,
	caption text NULL,
	file_name varchar(255) NULL,
	file_size int4 NULL,
	upload_order int4 DEFAULT 0 NULL,
	created_at timestamp DEFAULT now() NULL,
	CONSTRAINT blog_images_pkey PRIMARY KEY (id),
	CONSTRAINT blog_images_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.blog_posts(id) ON DELETE CASCADE
);
CREATE INDEX idx_blog_images_post_id ON public.blog_images USING btree (post_id);


-- public.faq_translations definition

-- Drop table

-- DROP TABLE public.faq_translations;

CREATE TABLE public.faq_translations (
	id serial4 NOT NULL,
	category_id int4 NULL,
	faq_id int4 NULL,
	language_code varchar(5) NOT NULL,
	title text NOT NULL,
	"content" text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT check_category_or_faq CHECK ((((category_id IS NOT NULL) AND (faq_id IS NULL)) OR ((category_id IS NULL) AND (faq_id IS NOT NULL)))),
	CONSTRAINT faq_translations_pkey PRIMARY KEY (id),
	CONSTRAINT unique_category_language UNIQUE (category_id, language_code),
	CONSTRAINT unique_faq_language UNIQUE (faq_id, language_code),
	CONSTRAINT faq_translations_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.faq_categories(id) ON DELETE CASCADE,
	CONSTRAINT faq_translations_faq_id_fkey FOREIGN KEY (faq_id) REFERENCES public.faqs(id) ON DELETE CASCADE
);
CREATE INDEX idx_faq_translations_category ON public.faq_translations USING btree (category_id, language_code);
CREATE INDEX idx_faq_translations_faq ON public.faq_translations USING btree (faq_id, language_code);

-- Table Triggers

create trigger update_faq_translations_updated_at before
update
    on
    public.faq_translations for each row execute function update_updated_at_column();