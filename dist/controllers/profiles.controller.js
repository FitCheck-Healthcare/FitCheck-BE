"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = getMe;
exports.patchMe = patchMe;
const profiles_service_js_1 = require("../services/profiles.service.js");
const response_js_1 = require("../utils/response.js");
function parseUpdateBody(body) {
    if (!body || typeof body !== 'object') {
        return '요청 본문이 필요합니다.';
    }
    const raw = body;
    const patch = {};
    if ('name' in raw) {
        if (raw.name == null) {
            patch.name = null;
        }
        else if (typeof raw.name === 'string') {
            patch.name = raw.name.trim() || null;
        }
        else {
            return 'name은 문자열 또는 null이어야 합니다.';
        }
    }
    if ('phone' in raw) {
        if (raw.phone == null) {
            patch.phone = null;
        }
        else if (typeof raw.phone === 'string') {
            patch.phone = raw.phone.trim() || null;
        }
        else {
            return 'phone은 문자열 또는 null이어야 합니다.';
        }
    }
    if (Object.keys(patch).length === 0) {
        return '수정할 필드가 없습니다.';
    }
    return patch;
}
async function getMe(req, res) {
    try {
        const userId = req.userId;
        if (!userId) {
            return (0, response_js_1.sendError)(res, 401, 'UNAUTHORIZED', '인증이 필요합니다.');
        }
        const profile = await (0, profiles_service_js_1.getProfileForUser)(userId);
        return (0, response_js_1.sendSuccess)(res, profile);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
        return (0, response_js_1.sendError)(res, 500, 'INTERNAL_ERROR', message);
    }
}
async function patchMe(req, res) {
    try {
        const userId = req.userId;
        if (!userId) {
            return (0, response_js_1.sendError)(res, 401, 'UNAUTHORIZED', '인증이 필요합니다.');
        }
        const parsed = parseUpdateBody(req.body);
        if (typeof parsed === 'string') {
            return (0, response_js_1.sendError)(res, 400, 'VALIDATION_ERROR', parsed);
        }
        const profile = await (0, profiles_service_js_1.updateProfileForUser)(userId, parsed);
        return (0, response_js_1.sendSuccess)(res, profile);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
        return (0, response_js_1.sendError)(res, 500, 'INTERNAL_ERROR', message);
    }
}
