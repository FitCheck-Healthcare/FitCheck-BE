/**
 * Supabase REST API로 gyms/trainers 시드 삽입 (DDL 없이 DML만)
 * node scripts/seed-gyms.mjs
 */
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요');
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

const GYMS = [
  {
    id: '22222222-2222-4222-8222-222222222201',
    name: '골목핏 헬스',
    type: '골목 헬스장',
    address: '부산 부산진구 부전동',
    lat: 35.1586,
    lng: 129.0568,
    hours: '평일 06:00–23:00 · 주말 08:00–21:00',
    price: '월 회원 59,000원부터 · PT 회당 45,000원',
    equipment: ['스미스머신', '케이블', '덤벨 2–40kg', '러닝머신 6대'],
    amenities: ['여성전용존', '샤워실', '락커', '정수기'],
    photos: [
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80',
      'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=900&q=80',
      'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=900&q=80',
    ],
    rating: 4.8,
    is_active: true,
  },
  {
    id: '22222222-2222-4222-8222-222222222202',
    name: '한스 PT Studio',
    type: '1인 PT숍',
    address: '부산 부산진구 전포동',
    lat: 35.1561,
    lng: 129.0624,
    hours: '예약제 07:00–22:00 (매주 화 휴무)',
    price: 'PT 10회 420,000원 · 체험 1회 35,000원',
    equipment: ['파워랙', '케이블 크로스', '케틀벨', '폼롤러'],
    amenities: ['1:1 프라이빗', '주차 2대', '샤워'],
    photos: [
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&q=80',
      'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=900&q=80',
      'https://images.unsplash.com/photo-1599058945522-28d884b0b342?w=900&q=80',
    ],
    rating: 4.9,
    is_active: true,
  },
];

const TRAINERS = [
  {
    id: '33333333-3333-4333-8333-333333333301',
    gym_id: '22222222-2222-4222-8222-222222222201',
    name: '김서연',
    specialty: '입문 · 자세교정',
    bio: '혼자 운동하다 막힌 분께 기본기부터 차근히 알려드립니다.',
    photo_url:
      'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400&q=80',
    is_active: true,
  },
  {
    id: '33333333-3333-4333-8333-333333333302',
    gym_id: '22222222-2222-4222-8222-222222222201',
    name: '박준호',
    specialty: '근력 · 벌크업',
    bio: '골목 헬스장 환경에 맞춘 효율 루틴을 설계합니다.',
    photo_url:
      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80',
    is_active: true,
  },
  {
    id: '33333333-3333-4333-8333-333333333303',
    gym_id: '22222222-2222-4222-8222-222222222202',
    name: '한지우',
    specialty: '자세교정 · 통증케어',
    bio: '데스크 직장인 라운드숄더·골반 불균형을 집중 케어합니다.',
    photo_url:
      'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=400&q=80',
    is_active: true,
  },
  {
    id: '33333333-3333-4333-8333-333333333304',
    gym_id: '22222222-2222-4222-8222-222222222202',
    name: '이도윤',
    specialty: '입문 특화',
    bio: '헬스장 입문이 부담스러운 분을 위한 쉬운 첫 수업을 진행합니다.',
    photo_url:
      'https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=400&q=80',
    is_active: true,
  },
];

const { error: gymErr } = await sb.from('gyms').upsert(GYMS, { onConflict: 'id' });
if (gymErr) {
  console.error('gyms upsert failed:', gymErr.message);
  process.exit(1);
}

const { error: trainerErr } = await sb.from('trainers').upsert(TRAINERS, { onConflict: 'id' });
if (trainerErr) {
  console.error('trainers upsert failed:', trainerErr.message);
  process.exit(1);
}

const { count } = await sb.from('gyms').select('*', { count: 'exact', head: true });
console.log(`✅ seed complete — gyms: ${count ?? GYMS.length}, trainers: ${TRAINERS.length}`);
