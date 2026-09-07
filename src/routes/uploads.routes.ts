import { Router } from 'express';
import multer from 'multer';
import { postMealImageUpload } from '../controllers/uploads.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { MEAL_IMAGE_MAX_BYTES, MEAL_IMAGE_MIME_TYPES } from '../services/uploads.service.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MEAL_IMAGE_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (MEAL_IMAGE_MIME_TYPES.includes(file.mimetype as (typeof MEAL_IMAGE_MIME_TYPES)[number])) {
      cb(null, true);
      return;
    }
    cb(new Error('INVALID_MIME'));
  },
});

const router = Router();

router.post('/meals', requireAuth, (req, res, next) => {
  upload.single('file')(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
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
}, postMealImageUpload);

export default router;
