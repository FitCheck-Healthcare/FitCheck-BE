"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRecommendedGyms = listRecommendedGyms;
const courseViews_service_js_1 = require("./courseViews.service.js");
const gyms_service_js_1 = require("./gyms.service.js");
const GOAL_KEYWORDS = {
    벌크업: ['벌크', '벌크업', '근력'],
    다이어트: ['다이어트', '체지방', '減량'],
    입문: ['입문', '초보', '기본'],
    근력: ['근력', '힘'],
    '자세 교정': ['자세', '교정', '케어', '통증'],
};
function normalizeText(value) {
    return value.toLowerCase().replace(/\s+/g, '');
}
function keywordMatches(text, keyword) {
    return normalizeText(text).includes(normalizeText(keyword));
}
function specialtyMatchesGoal(specialty, goal) {
    const keywords = GOAL_KEYWORDS[goal] ?? [goal];
    return keywords.some((keyword) => keywordMatches(specialty, keyword));
}
function specialtyMatchesBodyPart(specialty, bodyPart) {
    return keywordMatches(specialty, bodyPart);
}
function scoreSpecialty(trainers, profile) {
    if (profile.totalViews === 0 || trainers.length === 0) {
        return { score: 0, reasons: [] };
    }
    let best = 0;
    const reasons = [];
    for (const trainer of trainers) {
        const specialty = trainer.specialty?.trim();
        if (!specialty)
            continue;
        let trainerScore = 0;
        const matchedLabels = [];
        for (const item of profile.topGoals.slice(0, 2)) {
            if (specialtyMatchesGoal(specialty, item.label)) {
                trainerScore += item.weight * 20;
                matchedLabels.push(item.label);
            }
        }
        for (const item of profile.topBodyParts.slice(0, 2)) {
            if (specialtyMatchesBodyPart(specialty, item.label)) {
                trainerScore += item.weight * 15;
                matchedLabels.push(item.label);
            }
        }
        if (trainerScore > best) {
            best = trainerScore;
            if (matchedLabels.length > 0) {
                reasons.length = 0;
                reasons.push(`${trainer.name} 트레이너(${specialty}) — ${[...new Set(matchedLabels)].join('·')} 강좌 시청 기반`);
            }
        }
    }
    return { score: Math.min(40, best), reasons };
}
function scoreGymType(gymType, profile) {
    const topGoal = profile.topGoals[0]?.label;
    const topLevel = profile.primaryLevel;
    if (topGoal === '입문' || topLevel === '초급') {
        if (gymType === '1인 PT숍') {
            return { score: 20, reason: '입문·초급 강좌 시청 — 1:1 PT숍 추천' };
        }
        if (gymType === '개인 트레이너') {
            return { score: 15, reason: '입문 강좌 시청 — 개인 트레이너 공간 추천' };
        }
    }
    if (topGoal === '벌크업' || topGoal === '근력') {
        if (gymType === '골목 헬스장') {
            return { score: 18, reason: '근력·벌크업 강좌 시청 — 기구가 다양한 헬스장 추천' };
        }
    }
    if (topGoal === '다이어트') {
        if (gymType === '1인 PT숍') {
            return { score: 12, reason: '다이어트 강좌 시청 — PT 상담 가능한 공간 추천' };
        }
    }
    return { score: 0, reason: null };
}
function scoreDistance(distanceKm, radiusKm) {
    if (radiusKm <= 0)
        return 0;
    const ratio = Math.max(0, Math.min(1, 1 - distanceKm / radiusKm));
    return Math.round(ratio * 40);
}
function buildInterestReason(profile) {
    const bodyPart = profile.topBodyParts[0]?.label;
    const goal = profile.topGoals[0]?.label;
    if (!bodyPart && !goal)
        return null;
    if (bodyPart && goal)
        return `${bodyPart}·${goal} 강좌 ${profile.totalViews}회 시청 기반`;
    return `${bodyPart ?? goal} 강좌 ${profile.totalViews}회 시청 기반`;
}
async function listRecommendedGyms(input) {
    const radiusKm = input.radiusKm ?? 3;
    const page = input.page ?? 1;
    const limit = input.limit ?? 50;
    const interestProfile = input.userId
        ? (await (0, courseViews_service_js_1.getCourseActivity)(input.userId)).interestProfile
        : (0, courseViews_service_js_1.emptyInterestProfile)();
    const nearby = await (0, gyms_service_js_1.listGyms)({
        lat: input.lat,
        lng: input.lng,
        radiusKm,
        page: 1,
        limit: 100,
    });
    const scored = await Promise.all(nearby.data.map(async (gym) => {
        const trainers = (await (0, gyms_service_js_1.listTrainersByGymId)(gym.id)) ?? [];
        const distanceKm = gym.distanceKm ?? 0;
        const distanceScore = scoreDistance(distanceKm, radiusKm);
        const specialty = scoreSpecialty(trainers, interestProfile);
        const gymType = scoreGymType(gym.type, interestProfile);
        const matchReasons = [
            ...specialty.reasons,
            ...(gymType.reason ? [gymType.reason] : []),
        ];
        if (interestProfile.totalViews > 0) {
            const interestReason = buildInterestReason(interestProfile);
            if (interestReason && matchReasons.length === 0) {
                matchReasons.push(interestReason);
            }
        }
        if (matchReasons.length === 0 && distanceKm > 0) {
            matchReasons.push(`현재 위치에서 ${distanceKm.toFixed(1)}km`);
        }
        const matchScore = Math.round(distanceScore + specialty.score + gymType.score);
        return {
            ...gym,
            trainers,
            distanceKm,
            matchScore,
            matchReasons,
        };
    }));
    scored.sort((a, b) => {
        if (b.matchScore !== a.matchScore)
            return b.matchScore - a.matchScore;
        return (a.distanceKm ?? 0) - (b.distanceKm ?? 0);
    });
    const total = scored.length;
    const from = (page - 1) * limit;
    const pageItems = scored.slice(from, from + limit);
    return {
        data: pageItems,
        interestProfile,
        total,
        page,
        limit,
    };
}
