const API_URL = import.meta.env.VITE_API_URL || '';
const BASE = `${API_URL}/api/v1`;

class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${BASE}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 429) {
      throw new ApiError(429, 'Rate limited');
    }

    const data = await res.json();

    if (!res.ok) {
      throw new ApiError(res.status, data.error?.message || 'Request failed', data);
    }

    return data.data as T;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

function get<T>(path: string): Promise<T> {
  return request<T>(path);
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

function patch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

// Auth API
export const authApi = {
  login: (provider: string) => post<{ success: boolean; user: any }>('/auth/login', { provider }),
  logout: () => post<{ success: boolean }>('/auth/logout'),
  me: () => get<{ user: any; authenticated: boolean; facts?: any }>('/auth/me'),
  trpgoStatus: () => get<{ enabled: boolean; mockEnabled: boolean }>('/auth/trpgo/status'),
};

// Scenario API
export const scenarioApi = {
  search: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return request<any[]>(`/scenarios?${qs}`);
  },
  getById: (id: string) => get<any>(`/scenarios/${id}`),
  getMine: () => get<any[]>('/scenarios/mine'),
  create: (body: any) => post<any>('/scenarios', body),
  update: (id: string, body: any) => put<any>(`/scenarios/${id}`, body),
  updateStatus: (id: string, status: string, visibility?: string) =>
    patch<any>(`/scenarios/${id}/status`, { status, visibility }),
};

// Tag API
export const tagApi = {
  list: (category?: string) => get<any[]>(category ? `/tags?category=${category}` : '/tags'),
  popular: (limit = 20) => get<any[]>(`/tags/popular?limit=${limit}`),
};

// Review API
export const reviewApi = {
  listByScenario: (scenarioId: string, offset = 0, limit = 20) =>
    request<any[]>(`/scenarios/${scenarioId}/reviews?offset=${offset}&limit=${limit}`),
  submit: (scenarioId: string, body: any) =>
    post<any>(`/scenarios/${scenarioId}/reviews`, body),
  deleteMine: (scenarioId: string) =>
    del<any>(`/scenarios/${scenarioId}/reviews/mine`),
  getMine: () => get<any[]>('/reviews/mine'),
};

// Bookmark API
export const bookmarkApi = {
  list: () => get<any[]>('/bookmarks'),
  toggle: (scenarioId: string) => post<{ bookmarked: boolean }>(`/scenarios/${scenarioId}/bookmark`),
  check: (scenarioId: string) => get<{ bookmarked: boolean }>(`/scenarios/${scenarioId}/bookmark`),
};

// Profile API
export const profileApi = {
  get: (userId: string) => get<any>(`/users/${userId}`),
  updateProfile: (body: any) => put<any>('/users/me/profile', body),
  updatePreferences: (body: any) => put<any>('/users/me/preferences', body),
};

// Follow API
export const followApi = {
  toggle: (userId: string) => post<{ following: boolean }>(`/users/${userId}/follow`),
  getFollowers: (userId: string, offset = 0) => get<any[]>(`/users/${userId}/followers?offset=${offset}`),
  getFollowing: (userId: string, offset = 0) => get<any[]>(`/users/${userId}/following?offset=${offset}`),
};

// Like API
export const likeApi = {
  toggle: (scenarioId: string) => post<{ liked: boolean }>(`/scenarios/${scenarioId}/like`),
  check: (scenarioId: string) => get<{ liked: boolean; count: number }>(`/scenarios/${scenarioId}/like`),
};

// Comment API
export const commentApi = {
  list: (scenarioId: string, offset = 0) =>
    get<any[]>(`/scenarios/${scenarioId}/comments?offset=${offset}`),
  create: (scenarioId: string, body: any) =>
    post<any>(`/scenarios/${scenarioId}/comments`, body),
  update: (commentId: string, body: string) =>
    put<any>(`/comments/${commentId}`, { body }),
  delete: (commentId: string) => del<any>(`/comments/${commentId}`),
};

// Report API
export const reportApi = {
  submit: (body: any) => post<any>('/reports', body),
};

// Notification API
export const notificationApi = {
  list: (offset = 0) => get<any>(`/notifications?offset=${offset}`),
  unreadCount: () => get<{ count: number }>('/notifications/unread-count'),
  markRead: (notificationId?: string) => post<any>('/notifications/mark-read', { notificationId }),
};

// Series API
export const seriesApi = {
  get: (id: string) => get<any>(`/series/${id}`),
  getMine: () => get<any[]>('/series/mine'),
  create: (body: any) => post<any>('/series', body),
  update: (id: string, body: any) => put<any>(`/series/${id}`, body),
  addScenario: (seriesId: string, scenarioId: string) =>
    post<any>(`/series/${seriesId}/scenarios`, { scenarioId }),
  removeScenario: (seriesId: string, scenarioId: string) =>
    del<any>(`/series/${seriesId}/scenarios/${scenarioId}`),
};

// Play Report API
export const playReportApi = {
  list: (scenarioId: string, offset = 0) =>
    get<any[]>(`/scenarios/${scenarioId}/play-reports?offset=${offset}`),
  create: (scenarioId: string, body: any) =>
    post<any>(`/scenarios/${scenarioId}/play-reports`, body),
  delete: (id: string) => del<any>(`/play-reports/${id}`),
};

// Ranking API
export const rankingApi = {
  get: (type = 'popular', period = 'all', limit = 50) =>
    get<any>(`/rankings?type=${type}&period=${period}&limit=${limit}`),
};
