"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = optionalAuth;
exports.requireAuth = requireAuth;
const supabase_js_1 = require("../lib/supabase.js");
const response_js_1 = require("../utils/response.js");
function extractBearerToken(req) {
    const header = req.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer '))
        return undefined;
    const token = header.slice('Bearer '.length).trim();
    return token || undefined;
}
async function resolveUserId(token) {
    const supabase = (0, supabase_js_1.getSupabase)();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user)
        return null;
    return data.user.id;
}
/** Sets req.userId when a valid Bearer token is present; otherwise continues as guest. */
async function optionalAuth(req, _res, next) {
    const token = extractBearerToken(req);
    if (!token) {
        next();
        return;
    }
    try {
        const userId = await resolveUserId(token);
        if (userId)
            req.userId = userId;
        next();
    }
    catch {
        next();
    }
}
/** Requires a valid Bearer token; sets req.userId or responds 401. */
async function requireAuth(req, res, next) {
    const token = extractBearerToken(req);
    if (!token) {
        (0, response_js_1.sendError)(res, 401, 'UNAUTHORIZED', '인증이 필요합니다.');
        return;
    }
    try {
        const userId = await resolveUserId(token);
        if (!userId) {
            (0, response_js_1.sendError)(res, 401, 'UNAUTHORIZED', '유효하지 않거나 만료된 토큰입니다.');
            return;
        }
        req.userId = userId;
        next();
    }
    catch (err) {
        const message = err instanceof Error ? err.message : '인증 처리 중 오류가 발생했습니다.';
        (0, response_js_1.sendError)(res, 500, 'INTERNAL_ERROR', message);
    }
}
