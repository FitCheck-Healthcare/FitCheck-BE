"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const uploads_controller_js_1 = require("../controllers/uploads.controller.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const uploads_service_js_1 = require("../services/uploads.service.js");
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: uploads_service_js_1.MEAL_IMAGE_MAX_BYTES },
    fileFilter: (_req, file, cb) => {
        if (uploads_service_js_1.MEAL_IMAGE_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
            return;
        }
        cb(new Error('INVALID_MIME'));
    },
});
const router = (0, express_1.Router)();
router.post('/meals', auth_middleware_js_1.requireAuth, (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (!err) {
            next();
            return;
        }
        if (err instanceof multer_1.default.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: '이미지는 5MB 이하여야 합니다.' },
            });
            return;
        }
        if (err instanceof Error && err.message === 'INVALID_MIME') {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'jpg, png, webp 이미지만 업로드할 수 있습니다.' },
            });
            return;
        }
        next(err);
    });
}, uploads_controller_js_1.postMealImageUpload);
exports.default = router;
