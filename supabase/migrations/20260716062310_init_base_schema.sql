-- FitCheck Phase 0: base schema (DDL + FK + indexes + auth profile trigger)
-- RLS: not enabled (dev convenience)

-- ---------------------------------------------------------------------------
-- 1) profiles
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'trainer', 'gym_owner')),
  name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_role_idx ON public.profiles (role);

-- ---------------------------------------------------------------------------
-- 2) gyms
-- ---------------------------------------------------------------------------
CREATE TABLE public.gyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL
    CHECK (type IN ('골목 헬스장', '1인 PT숍', '개인 트레이너')),
  address text,
  lat double precision,
  lng double precision,
  hours text,
  price text,
  equipment text[] NOT NULL DEFAULT '{}',
  amenities text[] NOT NULL DEFAULT '{}',
  photos text[] NOT NULL DEFAULT '{}',
  rating numeric(2, 1),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX gyms_is_active_idx ON public.gyms (is_active);
CREATE INDEX gyms_type_idx ON public.gyms (type);
CREATE INDEX gyms_lat_lng_idx ON public.gyms (lat, lng);

-- ---------------------------------------------------------------------------
-- 3) trainers
-- ---------------------------------------------------------------------------
CREATE TABLE public.trainers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms (id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  name text NOT NULL,
  specialty text,
  bio text,
  photo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX trainers_gym_id_idx ON public.trainers (gym_id);
CREATE INDEX trainers_profile_id_idx ON public.trainers (profile_id);
CREATE INDEX trainers_is_active_idx ON public.trainers (is_active);

-- ---------------------------------------------------------------------------
-- 4) consult_requests
-- ---------------------------------------------------------------------------
CREATE TABLE public.consult_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  gym_id uuid NOT NULL REFERENCES public.gyms (id) ON DELETE CASCADE,
  trainer_id uuid REFERENCES public.trainers (id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text NOT NULL,
  preferred_date date NOT NULL,
  preferred_time time NOT NULL,
  topic text NOT NULL
    CHECK (topic IN ('벌크업', '다이어트', '자세 교정', '입문', '기타')),
  topic_detail text NOT NULL DEFAULT '',
  memo text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'done')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX consult_requests_user_id_idx ON public.consult_requests (user_id);
CREATE INDEX consult_requests_gym_id_idx ON public.consult_requests (gym_id);
CREATE INDEX consult_requests_trainer_id_idx ON public.consult_requests (trainer_id);
CREATE INDEX consult_requests_status_idx ON public.consult_requests (status);

-- ---------------------------------------------------------------------------
-- 5) meal_logs
-- ---------------------------------------------------------------------------
CREATE TABLE public.meal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  date date NOT NULL,
  meal_type text NOT NULL,
  time text,
  memo text,
  image_url text,
  macros jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_feedback text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX meal_logs_user_id_idx ON public.meal_logs (user_id);
CREATE INDEX meal_logs_user_id_date_idx ON public.meal_logs (user_id, date);

-- ---------------------------------------------------------------------------
-- 6) courses
-- ---------------------------------------------------------------------------
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body_part text,
  goal text,
  duration_min integer,
  level text,
  trainer_name text,
  video_url text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX courses_is_active_idx ON public.courses (is_active);
CREATE INDEX courses_body_part_idx ON public.courses (body_part);
CREATE INDEX courses_goal_idx ON public.courses (goal);

-- ---------------------------------------------------------------------------
-- 7) Auth → profiles auto-create trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name, phone)
  VALUES (
    NEW.id,
    'user',
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.raw_user_meta_data ->> 'full_name'),
    NEW.raw_user_meta_data ->> 'phone'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
