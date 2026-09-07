import type { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function sendListSuccess<T>(
  res: Response,
  data: T[],
  meta: { total: number; page: number; limit: number },
  status = 200,
) {
  return res.status(status).json({ success: true, data, meta });
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
) {
  return res.status(status).json({
    success: false,
    error: { code, message },
  });
}
