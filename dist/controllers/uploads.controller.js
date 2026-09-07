"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postMealImageUpload = postMealImageUpload;
const uploads_service_js_1 = require("../services/uploads.service.js");
const response_js_1 = require("../utils/response.js");
async function postMealImageUpload(req, res) {
    try {
        const userId = req.userId;
        if (!userId) {
            return (0, response_js_1.sendError)(res, 401, 'UNAUTHORIZED', '인증이 필요합니다.');
        }
        const file = req.file;
        if (!file) {
            return (0, response_js_1.sendError)(res, 400, 'VALIDATION_ERROR', 'file 필드가 필요합니다.');
        }
        if (file.size > uploads_service_js_1.MEAL_IMAGE_MAX_BYTES) {
            return (0, response_js_1.sendError)(res, 400, 'VALIDATION_ERROR', '이미지는 5MB 이하여야 합니다.');
        }
        if (!(0, uploads_service_js_1.isMealImageMimeType)(file.mimetype)) {
            return (0, response_js_1.sendError)(res, 400, 'VALIDATION_ERROR', 'jpg, png, webp 이미지만 업로드할 수 있습니다.');
        }
        const imageUrl = await (0, uploads_service_js_1.uploadMealImage)(userId, file.buffer, file.mimetype);
        return (0, response_js_1.sendSuccess)(res, { imageUrl }, 201);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
        return (0, response_js_1.sendError)(res, 500, 'INTERNAL_ERROR', message);
    }
}
