export interface NaverLocalSearchItem {
  title: string;
  link: string;
  category: string;
  description: string;
  telephone: string;
  address: string;
  roadAddress: string;
  mapx: string;
  mapy: string;
}

export interface NaverLocalPlace {
  naverPlaceId: string;
  name: string;
  category: string;
  address: string;
  roadAddress: string;
  lat: number;
  lng: number;
  externalLink: string;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}

function getNaverCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.NAVER_SEARCH_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error(
      'NAVER_SEARCH_CLIENT_ID / NAVER_SEARCH_CLIENT_SECRET 환경 변수가 필요합니다.',
    );
  }

  return { clientId, clientSecret };
}

function toLatLng(mapx: string, mapy: string): { lat: number; lng: number } | null {
  const lng = Number(mapx) / 1e7;
  const lat = Number(mapy) / 1e7;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function toPlaceId(item: NaverLocalSearchItem): string {
  const linkMatch = item.link.match(/place\/(\d+)/);
  if (linkMatch?.[1]) return linkMatch[1];
  return `${item.mapx}_${item.mapy}`;
}

function toPlace(item: NaverLocalSearchItem): NaverLocalPlace | null {
  const coords = toLatLng(item.mapx, item.mapy);
  if (!coords) return null;

  return {
    naverPlaceId: toPlaceId(item),
    name: stripHtml(item.title),
    category: item.category?.trim() ?? '',
    address: item.address?.trim() ?? '',
    roadAddress: item.roadAddress?.trim() ?? '',
    lat: coords.lat,
    lng: coords.lng,
    externalLink: item.link?.trim() ?? '',
  };
}

export async function searchNaverLocalPlaces(query: string): Promise<NaverLocalPlace[]> {
  const { clientId, clientSecret } = getNaverCredentials();
  const url = new URL('https://openapi.naver.com/v1/search/local.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', '5');
  url.searchParams.set('sort', 'random');

  const res = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`네이버 지역 검색 실패 (${res.status}): ${body || res.statusText}`);
  }

  const data = (await res.json()) as { items?: NaverLocalSearchItem[] };
  const places: NaverLocalPlace[] = [];

  for (const item of data.items ?? []) {
    const place = toPlace(item);
    if (place) places.push(place);
  }

  return places;
}

export function buildNearbySearchQueries(areaLabel?: string): string[] {
  const trimmed = areaLabel?.trim() ?? '';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const dong = parts.at(-1) ?? '';
  const gu = parts.length >= 2 ? parts.at(-2) ?? '' : '';
  const shortArea = dong || gu || trimmed;

  const queries = new Set<string>();
  if (shortArea) {
    queries.add(`${shortArea} 헬스장`);
    queries.add(`${shortArea} 피트니스`);
    queries.add(`${shortArea} PT`);
  }
  if (gu && gu !== shortArea) {
    queries.add(`${gu} 헬스장`);
  }
  queries.add('헬스장');

  return [...queries];
}

export function inferGymType(category: string, name: string): string {
  const text = `${category} ${name}`;
  if (/PT|피티|퍼스널|1인/.test(text)) return '1인 PT숍';
  if (/트레이너|개인/.test(text)) return '개인 트레이너';
  if (/헬스|피트니스|짐|GYM|gym/i.test(text)) return '골목 헬스장';
  return '기타';
}
