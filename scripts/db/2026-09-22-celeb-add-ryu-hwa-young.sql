-- ============================================================================
-- 연예인 신규 등록: 류화영 (Ryu Hwa-young) — 2026-09-22
-- 대상 테이블: celebrities → celebrity_translations(4언어) → celebrity_category_map
-- 한 문장(WITH 체인)이라 원자적으로 실행됨. slug UNIQUE라 재실행 시 안전하게 실패.
-- 실행 완료: 2026-09-22, node scripts/db/run-sql.mjs 로 라이브 적용됨 (celebrities.id=90).
--   ※ 이 파일을 통째로 다시 돌리지 말 것 — slug UNIQUE 로 맨 앞에서 죽는다.
--     아래 '공개 스위치' 는 그 한 줄만 따로 실행한다.
--
-- 출처(위키백과 en/ko): 1993-04-22 광주 출생, 배우·가수(前 티아라 2010–2012), 한자 柳和榮
-- 출생시각은 비공개 → 기존 솔로 배우(아이유·김태리·변우석)와 동일하게 '1200'(정오) 기본값
-- MBTI: ENFJ (형님 제공). 컬럼 표기는 기존 84행과 동일하게 대문자.
-- sort_order 0 = 목록 맨 앞(가장 최근 추가된 변우석과 동일). 뒤로 보내려면 9~10(김태리·아이유 옆)
-- 이미지: public/celebs/ryu_hwa_young.jpg (세로 341×512 JPEG) — 아직 서버에 없음(로컬 untracked).
-- 그래서 active=false 로 넣는다. 이미지 배포 후 아래 '공개 스위치' 한 줄로 켠다.
--   (image_path 소비처는 server/api/celebs.get.ts 한 곳뿐 — .png→.jpg 치환이라 .jpg 그대로도 같은 URL)
-- ============================================================================

with c as (
  insert into public.celebrities
    (slug, image_path, birth_year, birth_month, birth_day, birth_time, gender, calendar_type, active, sort_order, mbti)
  values
    ('ryu-hwa-young', 'ryu_hwa_young.jpg', 1993, 4, 22, '1200', 'F', 'solar', false, 0, 'ENFJ')
  returning id
),
t as (
  insert into public.celebrity_translations
    (celebrity_id, language_code, "name", description, occupation, gender_label, calendar_type_label)
  select c.id, v.language_code, v."name", v.description, v.occupation, v.gender_label, v.calendar_type_label
  from c, (values
    ('ko', '류화영',          '배우, 가수 | 1993년 4월 22일생',          '배우, 가수',       '여',     '양력'),
    ('en', 'Ryu Hwa-young',   'Actress, Singer | Born April 22, 1993',   'Actress, Singer',  'Female', 'Solar'),
    ('ja', 'リュ・ファヨン',   '女優、歌手 | 1993年4月22日生まれ',         '女優、歌手',       '女性',   '太陽暦'),
    ('zh', '柳和榮',          '演員，歌手 | 1993年4月22日出生',           '演員，歌手',       '女',     '陽曆')
  ) as v(language_code, "name", description, occupation, gender_label, calendar_type_label)
  returning id
)
insert into public.celebrity_category_map (celebrity_id, category_id)
select c.id, x.category_id
from c, (values (1), (2)) as x(category_id);
-- category 1 = 배우(actor: 아이유·김태리·차은우·변우석 등 배우 전원이 보유), 2 = 김태리 외 전원 보유.
-- 아이유(가수+배우, 그룹 아님) 와 같은 [1,2] 매핑. 3(그룹 아이돌)은 제외 — 前 멤버라 아이유 기준 적용.
-- ※ UI(/api/celebs, celeb-select.vue)는 카테고리를 읽지 않으므로 이 매핑은 데이터 정합성용.


-- ---------------------------------------------------------------------------
-- 확인 (INSERT 직후)
-- ---------------------------------------------------------------------------
select c.id, c.slug, c.image_path, c.birth_year, c.birth_month, c.birth_day, c.birth_time,
       c.gender, c.sort_order, c.active, c.mbti,
       t.language_code, t."name", t.occupation, t.description
from public.celebrities c
join public.celebrity_translations t on t.celebrity_id = c.id
where c.slug = 'ryu-hwa-young'
order by t.language_code;


-- ---------------------------------------------------------------------------
-- 공개 스위치 — public/celebs/ryu_hwa_young.jpg 가 라이브 서버에 올라간 뒤에 실행
-- ---------------------------------------------------------------------------
-- update public.celebrities set active = true, updated_at = now() where slug = 'ryu-hwa-young';


-- ---------------------------------------------------------------------------
-- (선택) 처리 완료된 등록 요청 정리 — 로그로 남기고 싶으면 실행하지 말 것
-- ---------------------------------------------------------------------------
-- delete from public.celeb_requests where name = '류회영' and note = '이뻐서';


-- ---------------------------------------------------------------------------
-- (롤백) 잘못 넣었을 때 — translations/category_map 은 FK on delete cascade 로 함께 삭제됨
-- ---------------------------------------------------------------------------
-- delete from public.celebrities where slug = 'ryu-hwa-young';
