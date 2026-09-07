import type { Request, Response } from 'express';
import { getProfileForUser, updateProfileForUser } from '../services/profiles.service.js';
import type { UpdateProfileInput } from '../types/profile.js';
import { sendError, sendSuccess } from '../utils/response.js';

function parseUpdateBody(body: unknown): UpdateProfileInput | string {
  if (!body || typeof body !== 'object') {
    return '요청 본문이 필요합니다.';
  }

  const raw = body as Record<string, unknown>;
  const patch: UpdateProfileInput = {};

  if ('name' in raw) {
    if (raw.name == null) {
      patch.name = null;
    } else if (typeof raw.name === 'string') {
      patch.name = raw.name.trim() || null;
    } else {
      return 'name은 문자열 또는 null이어야 합니다.';
    }
  }

  if ('phone' in raw) {
    if (raw.phone == null) {
      patch.phone = null;
    } else if (typeof raw.phone === 'string') {
      patch.phone = raw.phone.trim() || null;
    } else {
      return 'phone은 문자열 또는 null이어야 합니다.';
    }
  }

  if (Object.keys(patch).length === 0) {
    return '수정할 필드가 없습니다.';
  }

  return patch;
}

export async function getMe(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', '인증이 필요합니다.');
    }

    const profile = await getProfileForUser(userId);
    return sendSuccess(res, profile);
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
    return sendError(res, 500, 'INTERNAL_ERROR', message);
  }
}

export async function patchMe(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', '인증이 필요합니다.');
    }

    const parsed = parseUpdateBody(req.body);
    if (typeof parsed === 'string') {
      return sendError(res, 400, 'VALIDATION_ERROR', parsed);
    }

    const profile = await updateProfileForUser(userId, parsed);
    return sendSuccess(res, profile);
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
    return sendError(res, 500, 'INTERNAL_ERROR', message);
  }
}
