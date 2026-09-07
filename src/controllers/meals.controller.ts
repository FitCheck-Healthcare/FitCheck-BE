import type { Request, Response } from 'express';
import {
  createMealLog,
  isMealType,
  listMealLogs,
  updateMealLogForUser,
} from '../services/meals.service.js';
import type {
  CreateMealLogInput,
  MealMacros,
  UpdateMealLogInput,
} from '../types/mealLog.js';
import { MEAL_TYPES } from '../types/mealLog.js';
import { sendError, sendListSuccess, sendSuccess } from '../utils/response.js';

function parsePositiveInt(value: unknown, fallback: number, max?: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  const parsed = Math.floor(n);
  if (max !== undefined) return Math.min(parsed, max);
  return parsed;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTime(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value);
}

function parseMacros(raw: unknown): Partial<MealMacros> | string {
  if (raw == null) return {};
  if (typeof raw !== 'object') return 'macros는 객체여야 합니다.';

  const obj = raw as Record<string, unknown>;
  const result: Partial<MealMacros> = {};

  for (const key of ['carb', 'protein', 'fat', 'kcal'] as const) {
    if (obj[key] === undefined) continue;
    const n = Number(obj[key]);
    if (!Number.isFinite(n) || n < 0) {
      return `macros.${key}는 0 이상의 숫자여야 합니다.`;
    }
    result[key] = n;
  }

  return result;
}

function parseCreateBody(body: unknown): CreateMealLogInput | string {
  if (!body || typeof body !== 'object') {
    return '요청 본문이 필요합니다.';
  }

  const raw = body as Record<string, unknown>;
  const date = typeof raw.date === 'string' ? raw.date.trim() : '';
  const mealType = typeof raw.mealType === 'string' ? raw.mealType.trim() : '';
  const timeRaw = raw.time;
  const time =
    timeRaw == null
      ? null
      : typeof timeRaw === 'string' && timeRaw.trim()
        ? timeRaw.trim()
        : null;
  const memo =
    typeof raw.memo === 'string' ? raw.memo.trim() || null : raw.memo === null ? null : undefined;
  const imageUrlRaw = raw.imageUrl;
  const imageUrl =
    imageUrlRaw == null
      ? null
      : typeof imageUrlRaw === 'string' && imageUrlRaw.trim()
        ? imageUrlRaw.trim()
        : null;
  const aiFeedbackRaw = raw.aiFeedback;
  const aiFeedback =
    aiFeedbackRaw == null
      ? null
      : typeof aiFeedbackRaw === 'string'
        ? aiFeedbackRaw.trim() || null
        : undefined;

  if (!date || !isIsoDate(date)) {
    return 'date는 YYYY-MM-DD 형식이어야 합니다.';
  }
  if (!mealType || !isMealType(mealType)) {
    return `mealType은 ${MEAL_TYPES.join(' | ')} 중 하나여야 합니다.`;
  }
  if (time && !isTime(time)) {
    return 'time은 HH:mm 형식이어야 합니다.';
  }

  const macros = parseMacros(raw.macros);
  if (typeof macros === 'string') return macros;
  if (aiFeedback === undefined && typeof aiFeedbackRaw === 'string') {
    return 'aiFeedback은 문자열 또는 null이어야 합니다.';
  }

  return {
    date,
    mealType,
    time,
    memo,
    imageUrl,
    macros,
    aiFeedback: aiFeedback ?? null,
  };
}

function parseUpdateBody(body: unknown): UpdateMealLogInput | string {
  if (!body || typeof body !== 'object') {
    return '요청 본문이 필요합니다.';
  }

  const raw = body as Record<string, unknown>;
  const patch: UpdateMealLogInput = {};

  if ('date' in raw) {
    const date = typeof raw.date === 'string' ? raw.date.trim() : '';
    if (!date || !isIsoDate(date)) {
      return 'date는 YYYY-MM-DD 형식이어야 합니다.';
    }
    patch.date = date;
  }

  if ('mealType' in raw) {
    const mealType = typeof raw.mealType === 'string' ? raw.mealType.trim() : '';
    if (!mealType || !isMealType(mealType)) {
      return `mealType은 ${MEAL_TYPES.join(' | ')} 중 하나여야 합니다.`;
    }
    patch.mealType = mealType;
  }

  if ('time' in raw) {
    const timeRaw = raw.time;
    if (timeRaw == null) {
      patch.time = null;
    } else if (typeof timeRaw === 'string') {
      const time = timeRaw.trim();
      if (!time) {
        patch.time = null;
      } else if (!isTime(time)) {
        return 'time은 HH:mm 형식이어야 합니다.';
      } else {
        patch.time = time;
      }
    } else {
      return 'time은 문자열 또는 null이어야 합니다.';
    }
  }

  if ('memo' in raw) {
    if (raw.memo == null) {
      patch.memo = null;
    } else if (typeof raw.memo === 'string') {
      patch.memo = raw.memo.trim() || null;
    } else {
      return 'memo는 문자열 또는 null이어야 합니다.';
    }
  }

  if ('imageUrl' in raw) {
    if (raw.imageUrl == null) {
      patch.imageUrl = null;
    } else if (typeof raw.imageUrl === 'string') {
      patch.imageUrl = raw.imageUrl.trim() || null;
    } else {
      return 'imageUrl은 문자열 또는 null이어야 합니다.';
    }
  }

  if ('aiFeedback' in raw) {
    if (raw.aiFeedback == null) {
      patch.aiFeedback = null;
    } else if (typeof raw.aiFeedback === 'string') {
      patch.aiFeedback = raw.aiFeedback.trim() || null;
    } else {
      return 'aiFeedback은 문자열 또는 null이어야 합니다.';
    }
  }

  if ('macros' in raw) {
    const macros = parseMacros(raw.macros);
    if (typeof macros === 'string') return macros;
    patch.macros = macros;
  }

  if (Object.keys(patch).length === 0) {
    return '수정할 필드가 없습니다.';
  }

  return patch;
}

export async function getMeals(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', '인증이 필요합니다.');
    }

    const date =
      typeof req.query.date === 'string' && req.query.date.trim()
        ? req.query.date.trim()
        : undefined;
    const from =
      typeof req.query.from === 'string' && req.query.from.trim()
        ? req.query.from.trim()
        : undefined;
    const to =
      typeof req.query.to === 'string' && req.query.to.trim()
        ? req.query.to.trim()
        : undefined;

    if (date && !isIsoDate(date)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'date는 YYYY-MM-DD 형식이어야 합니다.');
    }
    if (from && !isIsoDate(from)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'from은 YYYY-MM-DD 형식이어야 합니다.');
    }
    if (to && !isIsoDate(to)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'to는 YYYY-MM-DD 형식이어야 합니다.');
    }
    if (date && (from || to)) {
      return sendError(
        res,
        400,
        'VALIDATION_ERROR',
        'date와 from/to는 함께 사용할 수 없습니다.',
      );
    }

    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 20, 50);

    const result = await listMealLogs(userId, { date, from, to, page, limit });
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

export async function postMeal(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', '인증이 필요합니다.');
    }

    const parsed = parseCreateBody(req.body);
    if (typeof parsed === 'string') {
      return sendError(res, 400, 'VALIDATION_ERROR', parsed);
    }

    const created = await createMealLog(userId, parsed);
    return sendSuccess(res, created, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
    return sendError(res, 500, 'INTERNAL_ERROR', message);
  }
}

export async function patchMeal(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', '인증이 필요합니다.');
    }

    const id = typeof req.params.id === 'string' ? req.params.id : undefined;
    if (!id || !isUuid(id)) {
      return sendError(res, 400, 'VALIDATION_ERROR', '유효한 id가 필요합니다.');
    }

    const parsed = parseUpdateBody(req.body);
    if (typeof parsed === 'string') {
      return sendError(res, 400, 'VALIDATION_ERROR', parsed);
    }

    const updated = await updateMealLogForUser(userId, id, parsed);
    if (!updated) {
      return sendError(res, 404, 'NOT_FOUND', '식단 기록을 찾을 수 없습니다.');
    }

    return sendSuccess(res, updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
    return sendError(res, 500, 'INTERNAL_ERROR', message);
  }
}
