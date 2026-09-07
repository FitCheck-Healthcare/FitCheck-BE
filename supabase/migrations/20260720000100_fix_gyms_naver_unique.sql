-- Supabase upsert(onConflict) 호환: partial index → UNIQUE constraint
DROP INDEX IF EXISTS gyms_naver_place_id_unique_idx;
ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_naver_place_id_key;
ALTER TABLE public.gyms ADD CONSTRAINT gyms_naver_place_id_key UNIQUE (naver_place_id);
