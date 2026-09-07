import type { Request, Response } from 'express';
import { getCourseById, listCourses } from '../services/courses.service.js';
import { sendError, sendListSuccess, sendSuccess } from '../utils/response.js';

function parsePositiveInt(value: unknown, fallback: number, max?: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  const parsed = Math.floor(n);
  if (max !== undefined) return Math.min(parsed, max);
  return parsed;
}

export async function getCourses(req: Request, res: Response) {
  try {
    const bodyPart =
      typeof req.query.bodyPart === 'string' && req.query.bodyPart.trim()
        ? req.query.bodyPart.trim()
        : undefined;
    const goal =
      typeof req.query.goal === 'string' && req.query.goal.trim()
        ? req.query.goal.trim()
        : undefined;
    const q =
      typeof req.query.q === 'string' && req.query.q.trim()
        ? req.query.q.trim()
        : undefined;

    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 20, 50);

    const result = await listCourses({ bodyPart, goal, q, page, limit });

    return sendListSuccess(res, result.data, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
    return sendError(res, 500, 'INTERNAL_ERROR', message);
  }
}

export async function getCourse(req: Request, res: Response) {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : undefined;
    if (!id) {
      return sendError(res, 400, 'VALIDATION_ERROR', '강좌 id가 필요합니다.');
    }

    const course = await getCourseById(id);
    if (!course) {
      return sendError(res, 404, 'NOT_FOUND', '강좌를 찾을 수 없습니다.');
    }

    return sendSuccess(res, course);
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
    return sendError(res, 500, 'INTERNAL_ERROR', message);
  }
}
