import type { Request, Response } from 'express';
import {
  getGymById,
  listGyms,
  listTrainersByGymId,
} from '../services/gyms.service.js';
import { listRecommendedGyms } from '../services/gymRecommendation.service.js';
import { syncNearbyGymsFromNaver } from '../services/gymsSync.service.js';
import { GYM_TYPES } from '../types/gym.js';
import { sendError, sendListSuccess, sendSuccess } from '../utils/response.js';

function parsePositiveInt(value: unknown, fallback: number, max?: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  const parsed = Math.floor(n);
  if (max !== undefined) return Math.min(parsed, max);
  return parsed;
}

function parseOptionalFloat(value: unknown): number | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export async function getGyms(req: Request, res: Response) {
  try {
    const typeRaw =
      typeof req.query.type === 'string' && req.query.type.trim()
        ? req.query.type.trim()
        : undefined;
    const type =
      typeRaw && GYM_TYPES.includes(typeRaw as (typeof GYM_TYPES)[number])
        ? typeRaw
        : undefined;
    const q =
      typeof req.query.q === 'string' && req.query.q.trim()
        ? req.query.q.trim()
        : undefined;
    const lat = parseOptionalFloat(req.query.lat);
    const lng = parseOptionalFloat(req.query.lng);
    const radiusKm = parseOptionalFloat(req.query.radiusKm);

    if ((lat !== undefined && lng === undefined) || (lat === undefined && lng !== undefined)) {
      return sendError(
        res,
        400,
        'VALIDATION_ERROR',
        '반경 검색 시 lat과 lng를 함께 보내야 합니다.',
      );
    }

    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 20, 50);

    const result = await listGyms({ lat, lng, radiusKm, type, q, page, limit });

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

export async function getGym(req: Request, res: Response) {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : undefined;
    if (!id) {
      return sendError(res, 400, 'VALIDATION_ERROR', '헬스장 id가 필요합니다.');
    }

    const gym = await getGymById(id);
    if (!gym) {
      return sendError(res, 404, 'NOT_FOUND', '헬스장을 찾을 수 없습니다.');
    }

    return sendSuccess(res, gym);
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
    return sendError(res, 500, 'INTERNAL_ERROR', message);
  }
}

export async function getGymTrainers(req: Request, res: Response) {
  try {
    const gymId = typeof req.params.gymId === 'string' ? req.params.gymId : undefined;
    if (!gymId) {
      return sendError(res, 400, 'VALIDATION_ERROR', '헬스장 id가 필요합니다.');
    }

    const trainers = await listTrainersByGymId(gymId);
    if (trainers === null) {
      return sendError(res, 404, 'NOT_FOUND', '헬스장을 찾을 수 없습니다.');
    }

    return sendSuccess(res, trainers);
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
    return sendError(res, 500, 'INTERNAL_ERROR', message);
  }
}

export async function getRecommendedGyms(req: Request, res: Response) {
  try {
    const lat = parseOptionalFloat(req.query.lat);
    const lng = parseOptionalFloat(req.query.lng);
    const radiusKm = parseOptionalFloat(req.query.radiusKm) ?? 3;

    if (lat === undefined || lng === undefined) {
      return sendError(
        res,
        400,
        'VALIDATION_ERROR',
        'lat과 lng가 필요합니다.',
      );
    }

    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 20, 50);

    const result = await listRecommendedGyms({
      userId: req.userId,
      lat,
      lng,
      radiusKm,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
      interestProfile: result.interestProfile,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
    return sendError(res, 500, 'INTERNAL_ERROR', message);
  }
}

export async function postSyncNearbyGyms(req: Request, res: Response) {
  try {
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);
    const radiusRaw = req.body?.radiusKm;
    const radiusKm =
      radiusRaw === undefined || radiusRaw === null ? 3 : Number(radiusRaw);
    const areaLabel =
      typeof req.body?.areaLabel === 'string' && req.body.areaLabel.trim()
        ? req.body.areaLabel.trim()
        : undefined;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'lat과 lng가 필요합니다.');
    }
    if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'radiusKm는 0보다 커야 합니다.');
    }

    const sync = await syncNearbyGymsFromNaver({ lat, lng, radiusKm, areaLabel });
    const list = await listGyms({ lat, lng, radiusKm, page: 1, limit: 50 });

    return sendSuccess(res, {
      synced: sync.synced,
      queries: sync.queries,
      gyms: list.data,
      meta: {
        total: list.total,
        page: list.page,
        limit: list.limit,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
    return sendError(res, 500, 'INTERNAL_ERROR', message);
  }
}
