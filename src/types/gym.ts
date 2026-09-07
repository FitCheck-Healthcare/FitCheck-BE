/** DB row (snake_case) */
export interface GymRow {
  id: string;
  name: string;
  type: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  hours: string | null;
  price: string | null;
  equipment: string[] | null;
  amenities: string[] | null;
  photos: string[] | null;
  rating: number | null;
  is_active: boolean;
  created_at: string;
  naver_place_id: string | null;
  source: string;
  category: string | null;
  external_link: string | null;
}

export interface TrainerRow {
  id: string;
  gym_id: string;
  profile_id: string | null;
  name: string;
  specialty: string | null;
  bio: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
}

/** API response (camelCase) */
export interface TrainerDto {
  id: string;
  gymId: string;
  profileId: string | null;
  name: string;
  specialty: string | null;
  bio: string | null;
  photoUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface GymDto {
  id: string;
  name: string;
  type: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  hours: string | null;
  price: string | null;
  equipment: string[];
  amenities: string[];
  photos: string[];
  rating: number | null;
  isActive: boolean;
  createdAt: string;
  naverPlaceId?: string | null;
  source?: string;
  category?: string | null;
  externalLink?: string | null;
  distanceKm?: number;
  trainers?: TrainerDto[];
  matchScore?: number;
  matchReasons?: string[];
}

export interface RecommendedGymDto extends GymDto {
  distanceKm: number;
  matchScore: number;
  matchReasons: string[];
  trainers: TrainerDto[];
}

export interface ListGymsQuery {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  type?: string;
  q?: string;
  page: number;
  limit: number;
}

export interface SyncNearbyGymsInput {
  lat: number;
  lng: number;
  radiusKm?: number;
  areaLabel?: string;
}

export type GymType = '골목 헬스장' | '1인 PT숍' | '개인 트레이너' | '기타';

export const GYM_TYPES: GymType[] = [
  '골목 헬스장',
  '1인 PT숍',
  '개인 트레이너',
  '기타',
];
