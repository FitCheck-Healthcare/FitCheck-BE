import type { Request, Response } from 'express';
import {
  CONSULT_TOPICS,
  type ConsultTopic,
  type CreateConsultRequestInput,
} from '../types/consultRequest.js';
import {
  createConsultRequest,
  getConsultRequestByIdForUser,
  isConsultRequestStatus,
  listMyConsultRequests,
} from '../services/consultRequests.service.js';
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
  return /^\d{2}:\d{2}(:\d{2})?$/.test(value);
}

function parseCreateBody(body: unknown): CreateConsultRequestInput | string {
  if (!body || typeof body !== 'object') {
    return '요청 본문이 필요합니다.';
  }

  const raw = body as Record<string, unknown>;
  const gymId = typeof raw.gymId === 'string' ? raw.gymId.trim() : '';
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const phone = typeof raw.phone === 'string' ? raw.phone.trim() : '';
  const preferredDate =
    typeof raw.preferredDate === 'string' ? raw.preferredDate.trim() : '';
  const preferredTime =
    typeof raw.preferredTime === 'string' ? raw.preferredTime.trim() : '';
  const topic = typeof raw.topic === 'string' ? raw.topic.trim() : '';
  const topicDetail =
    typeof raw.topicDetail === 'string' ? raw.topicDetail.trim() : '';
  const memo = typeof raw.memo === 'string' ? raw.memo.trim() : '';
  const trainerIdRaw = raw.trainerId;
  const trainerId =
    trainerIdRaw == null
      ? null
      : typeof trainerIdRaw === 'string' && trainerIdRaw.trim()
        ? trainerIdRaw.trim()
        : null;

  if (!gymId || !isUuid(gymId)) return '유효한 gymId가 필요합니다.';
  if (!name) return '이름은 필수입니다.';
  if (!phone) return '연락처는 필수입니다.';
  if (!preferredDate || !isIsoDate(preferredDate)) {
    return 'preferredDate는 YYYY-MM-DD 형식이어야 합니다.';
  }
  if (!preferredTime || !isTime(preferredTime)) {
    return 'preferredTime은 HH:mm 형식이어야 합니다.';
  }
  if (!CONSULT_TOPICS.includes(topic as ConsultTopic)) {
    return '유효하지 않은 상담 주제입니다.';
  }
  if (topic === '기타' && !topicDetail) {
    return 'topic이 기타일 때 topicDetail은 필수입니다.';
  }
  if (trainerId && !isUuid(trainerId)) {
    return '유효한 trainerId가 필요합니다.';
  }

  return {
    gymId,
    trainerId,
    name,
    phone,
    preferredDate,
    preferredTime,
    topic: topic as ConsultTopic,
    topicDetail,
    memo,
    shareHistoryConsent: raw.shareHistoryConsent === true,
  };
}

export async function postConsultRequest(req: Request, res: Response) {
  try {
    const parsed = parseCreateBody(req.body);
    if (typeof parsed === 'string') {
      return sendError(res, 400, 'VALIDATION_ERROR', parsed);
    }

    const created = await createConsultRequest(parsed, req.userId);
    return sendSuccess(res, created, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
    if (message === 'NOT_FOUND') {
      return sendError(res, 404, 'NOT_FOUND', '헬스장을 찾을 수 없습니다.');
    }
    if (message === 'TRAINER_NOT_FOUND') {
      return sendError(res, 404, 'NOT_FOUND', '트레이너를 찾을 수 없습니다.');
    }
    if (message === 'TRAINER_GYM_MISMATCH') {
      return sendError(
        res,
        400,
        'VALIDATION_ERROR',
        '트레이너가 해당 헬스장 소속이 아닙니다.',
      );
    }
    return sendError(res, 500, 'INTERNAL_ERROR', message);
  }
}

export async function getMyConsultRequests(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', '인증이 필요합니다.');
    }

    const statusRaw =
      typeof req.query.status === 'string' && req.query.status.trim()
        ? req.query.status.trim()
        : undefined;
    const status =
      statusRaw && isConsultRequestStatus(statusRaw) ? statusRaw : undefined;
    if (statusRaw && !status) {
      return sendError(res, 400, 'VALIDATION_ERROR', '유효하지 않은 status 값입니다.');
    }

    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 20, 50);

    const result = await listMyConsultRequests(userId, { status, page, limit });
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

export async function getConsultRequest(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', '인증이 필요합니다.');
    }

    const id = typeof req.params.id === 'string' ? req.params.id : undefined;
    if (!id || !isUuid(id)) {
      return sendError(res, 400, 'VALIDATION_ERROR', '유효한 id가 필요합니다.');
    }

    const item = await getConsultRequestByIdForUser(userId, id);
    if (!item) {
      return sendError(res, 404, 'NOT_FOUND', '상담 신청을 찾을 수 없습니다.');
    }

    return sendSuccess(res, item);
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
    return sendError(res, 500, 'INTERNAL_ERROR', message);
  }
}
