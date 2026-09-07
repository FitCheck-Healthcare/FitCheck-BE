import { getSupabase } from '../lib/supabase.js';
import type {
  GymDto,
  GymRow,
  ListGymsQuery,
  TrainerDto,
  TrainerRow,
} from '../types/gym.js';

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toTrainerDto(row: TrainerRow): TrainerDto {
  return {
    id: row.id,
    gymId: row.gym_id,
    profileId: row.profile_id,
    name: row.name,
    specialty: row.specialty,
    bio: row.bio,
    photoUrl: row.photo_url,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function toGymDto(row: GymRow, trainers?: TrainerDto[], distanceKm?: number): GymDto {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    hours: row.hours,
    price: row.price,
    equipment: row.equipment ?? [],
    amenities: row.amenities ?? [],
    photos: row.photos ?? [],
    rating: row.rating,
    isActive: row.is_active,
    createdAt: row.created_at,
    naverPlaceId: row.naver_place_id ?? null,
    source: row.source ?? 'manual',
    category: row.category ?? null,
    externalLink: row.external_link ?? null,
    ...(distanceKm !== undefined ? { distanceKm } : {}),
    ...(trainers !== undefined ? { trainers } : {}),
  };
}

type GymsSelectBuilder = ReturnType<ReturnType<ReturnType<typeof getSupabase>['from']>['select']>;

function applyFilters(
  builder: GymsSelectBuilder,
  query: Pick<ListGymsQuery, 'type' | 'q' | 'lat' | 'lng' | 'radiusKm'>,
): GymsSelectBuilder {
  let next = builder.eq('is_active', true);

  if (query.type) {
    next = next.eq('type', query.type);
  }
  if (query.q) {
    next = next.or(`name.ilike.%${query.q}%,address.ilike.%${query.q}%`);
  }
  if (query.lat !== undefined && query.lng !== undefined) {
    const radiusKm = query.radiusKm ?? 3;
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos(toRad(query.lat)));
    next = next
      .gte('lat', query.lat - latDelta)
      .lte('lat', query.lat + latDelta)
      .gte('lng', query.lng - lngDelta)
      .lte('lng', query.lng + lngDelta);
  }

  return next;
}

export async function listGyms(query: ListGymsQuery): Promise<{
  data: GymDto[];
  total: number;
  page: number;
  limit: number;
}> {
  const supabase = getSupabase();
  const { lat, lng, radiusKm, type, q, page, limit } = query;
  const hasLocation = lat !== undefined && lng !== undefined;

  if (hasLocation) {
    const radius = radiusKm ?? 3;
    let builder = supabase.from('gyms').select('*');
    builder = applyFilters(builder, { lat, lng, radiusKm: radius, type, q });

    const { data, error } = await builder.order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const nearby = ((data ?? []) as GymRow[])
      .map((row) => {
        if (row.lat == null || row.lng == null) return null;
        const distance = haversineKm(lat, lng, row.lat, row.lng);
        return { row, distance };
      })
      .filter(
        (item): item is { row: GymRow; distance: number } =>
          item !== null && item.distance <= radius,
      )
      .sort((a, b) => a.distance - b.distance);

    const total = nearby.length;
    const from = (page - 1) * limit;
    const pageItems = nearby.slice(from, from + limit);

    return {
      data: pageItems.map(({ row, distance }) => toGymDto(row, undefined, distance)),
      total,
      page,
      limit,
    };
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let builder = supabase.from('gyms').select('*', { count: 'exact' });
  builder = applyFilters(builder, { type, q });
  builder = builder.order('created_at', { ascending: false });

  const { data, error, count } = await builder.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  return {
    data: ((data ?? []) as GymRow[]).map((row) => toGymDto(row)),
    total: count ?? 0,
    page,
    limit,
  };
}

export async function getGymById(id: string): Promise<GymDto | null> {
  const supabase = getSupabase();

  const { data: gymData, error: gymError } = await supabase
    .from('gyms')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  if (gymError) {
    throw new Error(gymError.message);
  }

  if (!gymData) return null;

  const { data: trainerData, error: trainerError } = await supabase
    .from('trainers')
    .select('*')
    .eq('gym_id', id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (trainerError) {
    throw new Error(trainerError.message);
  }

  const trainers = ((trainerData ?? []) as TrainerRow[]).map(toTrainerDto);
  return toGymDto(gymData as GymRow, trainers);
}

export async function listTrainersByGymId(gymId: string): Promise<TrainerDto[] | null> {
  const supabase = getSupabase();

  const { data: gymData, error: gymError } = await supabase
    .from('gyms')
    .select('id')
    .eq('id', gymId)
    .eq('is_active', true)
    .maybeSingle();

  if (gymError) {
    throw new Error(gymError.message);
  }

  if (!gymData) return null;

  const { data, error } = await supabase
    .from('trainers')
    .select('*')
    .eq('gym_id', gymId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as TrainerRow[]).map(toTrainerDto);
}
