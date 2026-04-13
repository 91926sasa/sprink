import { Response } from 'express';
import type { ApiResponse, ResponseMeta, PaginationMeta, ApiErrorResponse } from '../types/api/envelope.js';

function buildMeta(req: { requestId?: string }): ResponseMeta {
  return {
    request_id: req.requestId ?? 'unknown',
    timestamp: new Date().toISOString(),
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  options?: {
    status?: number;
    pagination?: PaginationMeta;
  }
): void {
  const req = res.req as { requestId?: string };
  const body: ApiResponse<T> = {
    data,
    meta: buildMeta(req),
  };
  if (options?.pagination) {
    body.pagination = options.pagination;
  }
  res.status(options?.status ?? 200).json(body);
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  explainCode?: string
): void {
  const req = res.req as { requestId?: string };
  const body: ApiErrorResponse = {
    error: {
      code,
      message,
      explain_code: explainCode,
    },
    meta: buildMeta(req),
  };
  res.status(status).json(body);
}
