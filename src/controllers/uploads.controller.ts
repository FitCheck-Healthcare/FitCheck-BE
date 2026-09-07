import type { Request, Response } from 'express';
import {
  isMealImageMimeType,
  MEAL_IMAGE_MAX_BYTES,
  uploadMealImage,
} from '../services/uploads.service.js';
import { sendError, sendSuccess } from '../utils/response.js';

export async function postMealImageUpload(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', '인증이 필요합니다.');
    }

    const file = req.file;
    if (!file) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'file 필드가 필요합니다.');
    }

    if (file.size > MEAL_IMAGE_MAX_BYTES) {
      return sendError(res, 400, 'VALIDATION_ERROR', '이미지는 5MB 이하여야 합니다.');
    }

    if (!isMealImageMimeType(file.mimetype)) {
      return sendError(
        res,
        400,
        'VALIDATION_ERROR',
        'jpg, png, webp 이미지만 업로드할 수 있습니다.',
      );
    }

    const imageUrl = await uploadMealImage(userId, file.buffer, file.mimetype);
    return sendSuccess(res, { imageUrl }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
    return sendError(res, 500, 'INTERNAL_ERROR', message);
  }
}
