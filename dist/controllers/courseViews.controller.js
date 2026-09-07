"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postCourseWatch = postCourseWatch;
exports.getMyCourseActivity = getMyCourseActivity;
const courseViews_service_js_1 = require("../services/courseViews.service.js");
const response_js_1 = require("../utils/response.js");
async function postCourseWatch(req, res) {
    try {
        const userId = req.userId;
        if (!userId) {
            return (0, response_js_1.sendError)(res, 401, 'UNAUTHORIZED', '인증이 필요합니다.');
        }
        const courseId = typeof req.params.id === 'string' ? req.params.id : undefined;
        if (!courseId) {
            return (0, response_js_1.sendError)(res, 400, 'VALIDATION_ERROR', '강좌 id가 필요합니다.');
        }
        const progressRaw = req.body?.progressPct;
        const progressPct = progressRaw === undefined || progressRaw === null
            ? undefined
            : Number(progressRaw);
        if (progressPct !== undefined &&
            (!Number.isFinite(progressPct) || progressPct < 0 || progressPct > 100)) {
            return (0, response_js_1.sendError)(res, 400, 'VALIDATION_ERROR', 'progressPct는 0~100 사이여야 합니다.');
        }
        const view = await (0, courseViews_service_js_1.recordCourseWatch)({ userId, courseId, progressPct });
        return (0, response_js_1.sendSuccess)(res, view, 201);
    }
    catch (err) {
        if (err instanceof Error && err.message === 'NOT_FOUND') {
            return (0, response_js_1.sendError)(res, 404, 'NOT_FOUND', '강좌를 찾을 수 없습니다.');
        }
        const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
        return (0, response_js_1.sendError)(res, 500, 'INTERNAL_ERROR', message);
    }
}
async function getMyCourseActivity(req, res) {
    try {
        const userId = req.userId;
        if (!userId) {
            return (0, response_js_1.sendError)(res, 401, 'UNAUTHORIZED', '인증이 필요합니다.');
        }
        const activity = await (0, courseViews_service_js_1.getCourseActivity)(userId);
        return (0, response_js_1.sendSuccess)(res, activity);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
        return (0, response_js_1.sendError)(res, 500, 'INTERNAL_ERROR', message);
    }
}
