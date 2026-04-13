export interface ResponseMeta {
  request_id: string;
  timestamp: string;
}

export interface PaginationMeta {
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

export interface ApiResponse<T> {
  data: T;
  meta: ResponseMeta;
  pagination?: PaginationMeta;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  explain_code?: string;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
  meta: ResponseMeta;
}
