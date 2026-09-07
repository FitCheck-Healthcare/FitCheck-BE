-- FitCheck Phase 1: seed gyms + trainers (FE userMock MOCK_GYMS 기반)

INSERT INTO public.gyms (
  id,
  name,
  type,
  address,
  lat,
  lng,
  hours,
  price,
  equipment,
  amenities,
  photos,
  rating,
  is_active
) VALUES
(
  '22222222-2222-4222-8222-222222222201',
  '골목핏 헬스',
  '골목 헬스장',
  '부산 부산진구 부전동',
  35.1586,
  129.0568,
  '평일 06:00–23:00 · 주말 08:00–21:00',
  '월 회원 59,000원부터 · PT 회당 45,000원',
  ARRAY['스미스머신', '케이블', '덤벨 2–40kg', '러닝머신 6대'],
  ARRAY['여성전용존', '샤워실', '락커', '정수기'],
  ARRAY[
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80',
    'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=900&q=80',
    'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=900&q=80'
  ],
  4.8,
  true
),
(
  '22222222-2222-4222-8222-222222222202',
  '한스 PT Studio',
  '1인 PT숍',
  '부산 부산진구 전포동',
  35.1561,
  129.0624,
  '예약제 07:00–22:00 (매주 화 휴무)',
  'PT 10회 420,000원 · 체험 1회 35,000원',
  ARRAY['파워랙', '케이블 크로스', '케틀벨', '폼롤러'],
  ARRAY['1:1 프라이빗', '주차 2대', '샤워'],
  ARRAY[
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&q=80',
    'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=900&q=80',
    'https://images.unsplash.com/photo-1599058945522-28d884b0b342?w=900&q=80'
  ],
  4.9,
  true
);

INSERT INTO public.trainers (
  id,
  gym_id,
  name,
  specialty,
  bio,
  photo_url,
  is_active
) VALUES
(
  '33333333-3333-4333-8333-333333333301',
  '22222222-2222-4222-8222-222222222201',
  '김서연',
  '입문 · 자세교정',
  '혼자 운동하다 막힌 분께 기본기부터 차근히 알려드립니다.',
  'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400&q=80',
  true
),
(
  '33333333-3333-4333-8333-333333333302',
  '22222222-2222-4222-8222-222222222201',
  '박준호',
  '근력 · 벌크업',
  '골목 헬스장 환경에 맞춘 효율 루틴을 설계합니다.',
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80',
  true
),
(
  '33333333-3333-4333-8333-333333333303',
  '22222222-2222-4222-8222-222222222202',
  '한지우',
  '자세교정 · 통증케어',
  '데스크 직장인 라운드숄더·골반 불균형을 집중 케어합니다.',
  'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=400&q=80',
  true
),
(
  '33333333-3333-4333-8333-333333333304',
  '22222222-2222-4222-8222-222222222202',
  '이도윤',
  '입문 특화',
  '헬스장 입문이 부담스러운 분을 위한 쉬운 첫 수업을 진행합니다.',
  'https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=400&q=80',
  true
);
