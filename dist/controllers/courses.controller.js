"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCourses = getCourses;
exports.getCourse = getCourse;
const courses_service_js_1 = require("../services/courses.service.js");
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
async function getCourses(req, res) {
    try {
        const bodyPart = typeof req.query.bodyPart === 'string' && req.query.bodyPart.trim()
            ? req.query.bodyPart.trim()
            : undefined;
        const goal = typeof req.query.goal === 'string' && req.query.goal.trim()
            ? req.query.goal.trim()
            : undefined;
        const q = typeof req.query.q === 'string' && req.query.q.trim()
            ? req.query.q.trim()
            : undefined;
        const page = parsePositiveInt(req.query.page, 1);
        const limit = parsePositiveInt(req.query.limit, 20, 50);
        const result = await (0, courses_service_js_1.listCourses)({ bodyPart, goal, q, page, limit });
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
async function getCourse(req, res) {
    try {
        const id = typeof req.params.id === 'string' ? req.params.id : undefined;
        if (!id) {
            return (0, response_js_1.sendError)(res, 400, 'VALIDATION_ERROR', '강좌 id가 필요합니다.');
        }
        const course = await (0, courses_service_js_1.getCourseById)(id);
        if (!course) {
            return (0, response_js_1.sendError)(res, 404, 'NOT_FOUND', '강좌를 찾을 수 없습니다.');
        }
        return (0, response_js_1.sendSuccess)(res, course);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
        return (0, response_js_1.sendError)(res, 500, 'INTERNAL_ERROR', message);
    }
}
