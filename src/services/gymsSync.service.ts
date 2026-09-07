import { getSupabase } from '../lib/supabase.js';
import {
  buildNearbySearchQueries,
  inferGymType,
  searchNaverLocalPlaces,
  type NaverLocalPlace,
} from './naverSearch.service.js';

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

function toUpsertRow(place: NaverLocalPlace) {
  return {
    naver_place_id: place.naverPlaceId,
    source: 'naver' as const,
    name: place.name,
    type: inferGymType(place.category, place.name),
    address: place.roadAddress || place.address,
    lat: place.lat,
    lng: place.lng,
    category: place.category,
    external_link: place.externalLink,
    is_active: true,
  };
}

export async function syncNearbyGymsFromNaver(input: {
  lat: number;
  lng: number;
  radiusKm?: number;
  areaLabel?: string;
}): Promise<{ synced: number; queries: string[] }> {
  const radiusKm = input.radiusKm ?? 3;
  const queries = buildNearbySearchQueries(input.areaLabel);
  const found = new Map<string, NaverLocalPlace>();

  for (const query of queries) {
    const places = await searchNaverLocalPlaces(query);
    for (const place of places) {
      const distance = haversineKm(input.lat, input.lng, place.lat, place.lng);
      if (distance <= radiusKm) {
        found.set(place.naverPlaceId, place);
      }
    }
  }

  if (found.size === 0) {
    return { synced: 0, queries };
  }

  const supabase = getSupabase();
  const rows = [...found.values()].map(toUpsertRow);
  let synced = 0;

  for (const row of rows) {
    const { data: existing, error: findError } = await supabase
      .from('gyms')
      .select('id')
      .eq('naver_place_id', row.naver_place_id)
      .maybeSingle();

    if (findError) {
      throw new Error(findError.message);
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('gyms')
        .update(row)
        .eq('id', existing.id);
      if (updateError) throw new Error(updateError.message);
    } else {
      const { error: insertError } = await supabase.from('gyms').insert(row);
      if (insertError) throw new Error(insertError.message);
    }

    synced += 1;
  }

  return { synced, queries };
}

export { buildNearbySearchQueries };
