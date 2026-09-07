import type { NextFunction, Request, Response } from 'express';
import { getSupabase } from '../lib/supabase.js';
import { sendError } from '../utils/response.js';

function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return undefined;
  const token = header.slice('Bearer '.length).trim();
  return token || undefined;
}

async function resolveUserId(token: string): Promise<string | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

/** Sets req.userId when a valid Bearer token is present; otherwise continues as guest. */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const userId = await resolveUserId(token);
    if (userId) req.userId = userId;
    next();
  } catch {
    next();
  }
}

/** Requires a valid Bearer token; sets req.userId or responds 401. */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    sendError(res, 401, 'UNAUTHORIZED', '인증이 필요합니다.');
    return;
  }

  try {
    const userId = await resolveUserId(token);
    if (!userId) {
      sendError(res, 401, 'UNAUTHORIZED', '유효하지 않거나 만료된 토큰입니다.');
      return;
    }
    req.userId = userId;
    next();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : '인증 처리 중 오류가 발생했습니다.';
    sendError(res, 500, 'INTERNAL_ERROR', message);
  }
}
