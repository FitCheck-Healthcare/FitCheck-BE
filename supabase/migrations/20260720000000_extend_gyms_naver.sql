-- FitCheck: gyms 테이블 네이버 POI 연동용 확장

ALTER TABLE public.gyms
  ADD COLUMN IF NOT EXISTS naver_place_id text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS external_link text;

ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_type_check;
ALTER TABLE public.gyms
  ADD CONSTRAINT gyms_type_check
    CHECK (type IN ('골목 헬스장', '1인 PT숍', '개인 트레이너', '기타'));

ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_source_check;
ALTER TABLE public.gyms
  ADD CONSTRAINT gyms_source_check
    CHECK (source IN ('seed', 'naver', 'manual'));

CREATE UNIQUE INDEX IF NOT EXISTS gyms_naver_place_id_unique_idx
  ON public.gyms (naver_place_id)
  WHERE naver_place_id IS NOT NULL;

UPDATE public.gyms
SET source = 'seed'
WHERE id IN (
  '22222222-2222-4222-8222-222222222201',
  '22222222-2222-4222-8222-222222222202'
);
