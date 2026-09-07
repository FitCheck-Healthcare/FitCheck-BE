"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGyms = getGyms;
exports.getGym = getGym;
exports.getGymTrainers = getGymTrainers;
exports.getRecommendedGyms = getRecommendedGyms;
exports.postSyncNearbyGyms = postSyncNearbyGyms;
const gyms_service_js_1 = require("../services/gyms.service.js");
const gymRecommendation_service_js_1 = require("../services/gymRecommendation.service.js");
const gymsSync_service_js_1 = require("../services/gymsSync.service.js");
const gym_js_1 = require("../types/gym.js");
const response_js_1 = require("../utils/response.js");
function parsePositiveInt(value, fallback, max) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1)
        return fallback;
    const parsed = Math.floor(n);
    if (max !== undefined)
        return Math.min(parsed, max);
    return parsed;
}
function parseOptionalFloat(value) {
    if (typeof value !== 'string' || !value.trim())
        return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
}
async function getGyms(req, res) {
    try {
        const typeRaw = typeof req.query.type === 'string' && req.query.type.trim()
            ? req.query.type.trim()
            : undefined;
        const type = typeRaw && gym_js_1.GYM_TYPES.includes(typeRaw)
            ? typeRaw
            : undefined;
        const q = typeof req.query.q === 'string' && req.query.q.trim()
            ? req.query.q.trim()
            : undefined;
        const lat = parseOptionalFloat(req.query.lat);
        const lng = parseOptionalFloat(req.query.lng);
        const radiusKm = parseOptionalFloat(req.query.radiusKm);
        if ((lat !== undefined && lng === undefined) || (lat === undefined && lng !== undefined)) {
            return (0, response_js_1.sendError)(res, 400, 'VALIDATION_ERROR', '반경 검색 시 lat과 lng를 함께 보내야 합니다.');
        }
        const page = parsePositiveInt(req.query.page, 1);
        const limit = parsePositiveInt(req.query.limit, 20, 50);
        const result = await (0, gyms_service_js_1.listGyms)({ lat, lng, radiusKm, type, q, page, limit });
        return (0, response_js_1.sendListSuccess)(res, result.data, {
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
        return (0, response_js_1.sendError)(res, 500, 'INTERNAL_ERROR', message);
    }
}
async function getGym(req, res) {
    try {
        const id = typeof req.params.id === 'string' ? req.params.id : undefined;
        if (!id) {
            return (0, response_js_1.sendError)(res, 400, 'VALIDATION_ERROR', '헬스장 id가 필요합니다.');
        }
        const gym = await (0, gyms_service_js_1.getGymById)(id);
        if (!gym) {
            return (0, response_js_1.sendError)(res, 404, 'NOT_FOUND', '헬스장을 찾을 수 없습니다.');
        }
        return (0, response_js_1.sendSuccess)(res, gym);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
        return (0, response_js_1.sendError)(res, 500, 'INTERNAL_ERROR', message);
    }
}
async function getGymTrainers(req, res) {
    try {
        const gymId = typeof req.params.gymId === 'string' ? req.params.gymId : undefined;
        if (!gymId) {
            return (0, response_js_1.sendError)(res, 400, 'VALIDATION_ERROR', '헬스장 id가 필요합니다.');
        }
        const trainers = await (0, gyms_service_js_1.listTrainersByGymId)(gymId);
        if (trainers === null) {
            return (0, response_js_1.sendError)(res, 404, 'NOT_FOUND', '헬스장을 찾을 수 없습니다.');
        }
        return (0, response_js_1.sendSuccess)(res, trainers);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
        return (0, response_js_1.sendError)(res, 500, 'INTERNAL_ERROR', message);
    }
}
async function getRecommendedGyms(req, res) {
    try {
        const lat = parseOptionalFloat(req.query.lat);
        const lng = parseOptionalFloat(req.query.lng);
        const radiusKm = parseOptionalFloat(req.query.radiusKm) ?? 3;
        if (lat === undefined || lng === undefined) {
            return (0, response_js_1.sendError)(res, 400, 'VALIDATION_ERROR', 'lat과 lng가 필요합니다.');
        }
        const page = parsePositiveInt(req.query.page, 1);
        const limit = parsePositiveInt(req.query.limit, 20, 50);
        const result = await (0, gymRecommendation_service_js_1.listRecommendedGyms)({
            userId: req.userId,
            lat,
            lng,
            radiusKm,
            page,
            limit,
        });
        return res.status(200).json({
            success: true,
            data: result.data,
            meta: {
                total: result.total,
                page: result.page,
                limit: result.limit,
            },
            interestProfile: result.interestProfile,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
        return (0, response_js_1.sendError)(res, 500, 'INTERNAL_ERROR', message);
    }
}
async function postSyncNearbyGyms(req, res) {
    try {
        const lat = Number(req.body?.lat);
        const lng = Number(req.body?.lng);
        const radiusRaw = req.body?.radiusKm;
        const radiusKm = radiusRaw === undefined || radiusRaw === null ? 3 : Number(radiusRaw);
        const areaLabel = typeof req.body?.areaLabel === 'string' && req.body.areaLabel.trim()
            ? req.body.areaLabel.trim()
            : undefined;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return (0, response_js_1.sendError)(res, 400, 'VALIDATION_ERROR', 'lat과 lng가 필요합니다.');
        }
        if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
            return (0, response_js_1.sendError)(res, 400, 'VALIDATION_ERROR', 'radiusKm는 0보다 커야 합니다.');
        }
        const sync = await (0, gymsSync_service_js_1.syncNearbyGymsFromNaver)({ lat, lng, radiusKm, areaLabel });
        const list = await (0, gyms_service_js_1.listGyms)({ lat, lng, radiusKm, page: 1, limit: 50 });
        return (0, response_js_1.sendSuccess)(res, {
            synced: sync.synced,
            queries: sync.queries,
            gyms: list.data,
            meta: {
                total: list.total,
                page: list.page,
                limit: list.limit,
            },
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
        return (0, response_js_1.sendError)(res, 500, 'INTERNAL_ERROR', message);
    }
}
