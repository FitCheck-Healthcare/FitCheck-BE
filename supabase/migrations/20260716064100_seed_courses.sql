-- FitCheck Phase 1: seed courses (FE userMock MOCK_COURSES 기반)
-- MVP 스키마 컬럼만 채움 (cues/warnings/setsGuide 등은 FE 로컬 필드)

INSERT INTO public.courses (
  id,
  title,
  body_part,
  goal,
  duration_min,
  level,
  trainer_name,
  video_url,
  description,
  is_active
) VALUES
(
  '11111111-1111-4111-8111-111111111101',
  '초보 가슴 루틴 — 덤벨 프레스 마스터',
  '가슴',
  '입문',
  18,
  '초급',
  '박코치',
  'https://upload.wikimedia.org/wikipedia/commons/c/c0/Video_showing_how_to_perform_the_dumbbell_bench_press_and_the_dumbbell_incline_bench_press.webm',
  '덤벨 프레스 기본 셋업부터 자극 위치까지, 입문자가 혼자 따라가기 쉬운 가슴 가이드입니다.',
  true
),
(
  '11111111-1111-4111-8111-111111111102',
  '하체 데이: 스쿼트 폼 교정',
  '하체',
  '근력',
  24,
  '중급',
  '이코치',
  'https://upload.wikimedia.org/wikipedia/commons/5/5c/Squat_-_exercise_demonstration_video.webm',
  '무릎·골반·코어 정렬을 중심으로 스쿼트 깊이와 힘을 안정적으로 만드는 교정 강좌입니다.',
  true
),
(
  '11111111-1111-4111-8111-111111111103',
  '등 자극 집중 — 랫풀다운 & 시티드로우',
  '등',
  '벌크업',
  22,
  '중급',
  '박코치',
  'https://upload.wikimedia.org/wikipedia/commons/0/03/Common_Lat_Pulldown_Mistakes.webm',
  '광배와 중부 승모에 자극을 모으는 풀 동작 가이드로, 벌크업 루틴의 밀도를 높입니다.',
  true
),
(
  '11111111-1111-4111-8111-111111111104',
  '다이어트 코어 15분 서킷',
  '코어',
  '다이어트',
  15,
  '초급',
  '김코치',
  'https://upload.wikimedia.org/wikipedia/commons/f/fa/Kettlebell_crush_grip_push-up.webm',
  '짧은 시간에 코어 안정성과 칼로리 소모를 동시에 잡는 입문용 서킷입니다.',
  true
),
(
  '11111111-1111-4111-8111-111111111105',
  '어깨 안정화 — 사이드 레터럴 가이드',
  '어깨',
  '입문',
  16,
  '초급',
  '이코치',
  'https://upload.wikimedia.org/wikipedia/commons/7/7f/Squat_and_Frontal_Raise.webm',
  '측면 삼각근을 안전하게 자극하는 레터럴 레이즈 폼과 중량 선택법을 배웁니다.',
  true
),
(
  '11111111-1111-4111-8111-111111111106',
  '벌크업 푸시 데이 풀 루틴',
  '가슴',
  '벌크업',
  35,
  '고급',
  '김코치',
  'https://upload.wikimedia.org/wikipedia/commons/8/80/Incline_press_-_exercise_demonstration_video.webm',
  '벤치프레스·인클라인·플라이를 묶은 푸시 데이 구성으로 가슴·어깨·삼두를 밀도 있게 공략합니다.',
  true
)
ON CONFLICT (id) DO NOTHING;
