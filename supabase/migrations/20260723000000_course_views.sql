-- FitCheck: PT 강좌 시청 기록 (헬스장 매칭용)

CREATE TABLE public.course_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses (id) ON DELETE CASCADE,
  watched_at timestamptz NOT NULL DEFAULT now(),
  progress_pct numeric(5, 2) NOT NULL DEFAULT 0
    CHECK (progress_pct >= 0 AND progress_pct <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX course_views_user_course_uidx
  ON public.course_views (user_id, course_id);

CREATE INDEX course_views_user_id_watched_at_idx
  ON public.course_views (user_id, watched_at DESC);
