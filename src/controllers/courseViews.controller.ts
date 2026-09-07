import type { Request, Response } from 'express';
import {
  getCourseActivity,
  recordCourseWatch,
} from '../services/courseViews.service.js';
import { sendError, sendSuccess } from '../utils/response.js';

export async function postCourseWatch(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', '인증이 필요합니다.');
    }

    const courseId =
      typeof req.params.id === 'string' ? req.params.id : undefined;
    if (!courseId) {
      return sendError(res, 400, 'VALIDATION_ERROR', '강좌 id가 필요합니다.');
    }

    const progressRaw = req.body?.progressPct;
    const progressPct =
      progressRaw === undefined || progressRaw === null
        ? undefined
        : Number(progressRaw);

    if (
      progressPct !== undefined &&
      (!Number.isFinite(progressPct) || progressPct < 0 || progressPct > 100)
    ) {
      return sendError(
        res,
        400,
        'VALIDATION_ERROR',
        'progressPct는 0~100 사이여야 합니다.',
      );
    }

    const view = await recordCourseWatch({ userId, courseId, progressPct });
    return sendSuccess(res, view, 201);
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      return sendError(res, 404, 'NOT_FOUND', '강좌를 찾을 수 없습니다.');
    }
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
    return sendError(res, 500, 'INTERNAL_ERROR', message);
  }
}

export async function getMyCourseActivity(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', '인증이 필요합니다.');
    }

    const activity = await getCourseActivity(userId);
    return sendSuccess(res, activity);
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
    return sendError(res, 500, 'INTERNAL_ERROR', message);
  }
}
