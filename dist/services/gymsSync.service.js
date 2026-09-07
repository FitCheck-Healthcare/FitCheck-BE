"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildNearbySearchQueries = void 0;
exports.syncNearbyGymsFromNaver = syncNearbyGymsFromNaver;
const supabase_js_1 = require("../lib/supabase.js");
const naverSearch_service_js_1 = require("./naverSearch.service.js");
Object.defineProperty(exports, "buildNearbySearchQueries", { enumerable: true, get: function () { return naverSearch_service_js_1.buildNearbySearchQueries; } });
const EARTH_RADIUS_KM = 6371;
function toRad(deg) {
    return (deg * Math.PI) / 180;
}
function haversineKm(lat1, lng1, lat2, lng2) {
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function toUpsertRow(place) {
    return {
        naver_place_id: place.naverPlaceId,
        source: 'naver',
        name: place.name,
        type: (0, naverSearch_service_js_1.inferGymType)(place.category, place.name),
        address: place.roadAddress || place.address,
        lat: place.lat,
        lng: place.lng,
        category: place.category,
        external_link: place.externalLink,
        is_active: true,
    };
}
async function syncNearbyGymsFromNaver(input) {
    const radiusKm = input.radiusKm ?? 3;
    const queries = (0, naverSearch_service_js_1.buildNearbySearchQueries)(input.areaLabel);
    const found = new Map();
    for (const query of queries) {
        const places = await (0, naverSearch_service_js_1.searchNaverLocalPlaces)(query);
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
    const supabase = (0, supabase_js_1.getSupabase)();
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
            if (updateError)
                throw new Error(updateError.message);
        }
        else {
            const { error: insertError } = await supabase.from('gyms').insert(row);
            if (insertError)
                throw new Error(insertError.message);
        }
        synced += 1;
    }
    return { synced, queries };
}
