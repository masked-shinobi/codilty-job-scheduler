const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

interface RequestOptions {
  method?: string;
  body?: any;
  token?: string | null;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Request failed' } }));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

// ─── Organizations ──────────────────────────────────────────────────────────────

export const organizationsApi = {
  list: (token: string) => request<any>('/api/organizations', { token }),
  get: (id: string, token: string) => request<any>(`/api/organizations/${id}`, { token }),
  create: (data: any, token: string) => request<any>('/api/organizations', { method: 'POST', body: data, token }),
  update: (id: string, data: any, token: string) => request<any>(`/api/organizations/${id}`, { method: 'PATCH', body: data, token }),
  delete: (id: string, token: string) => request<any>(`/api/organizations/${id}`, { method: 'DELETE', token }),
};

// ─── Projects ───────────────────────────────────────────────────────────────────

export const projectsApi = {
  list: (token: string, orgId?: string) => request<any>(`/api/projects?${orgId ? `orgId=${orgId}` : ''}`, { token }),
  get: (id: string, token: string) => request<any>(`/api/projects/${id}`, { token }),
  create: (data: any, token: string) => request<any>('/api/projects', { method: 'POST', body: data, token }),
  delete: (id: string, token: string) => request<any>(`/api/projects/${id}`, { method: 'DELETE', token }),
};

// ─── Queues ─────────────────────────────────────────────────────────────────────

export const queuesApi = {
  list: (token: string, projectId?: string) => request<any>(`/api/queues?${projectId ? `projectId=${projectId}` : ''}`, { token }),
  get: (id: string, token: string) => request<any>(`/api/queues/${id}`, { token }),
  create: (data: any, token: string) => request<any>('/api/queues', { method: 'POST', body: data, token }),
  update: (id: string, data: any, token: string) => request<any>(`/api/queues/${id}`, { method: 'PATCH', body: data, token }),
  delete: (id: string, token: string) => request<any>(`/api/queues/${id}`, { method: 'DELETE', token }),
  pause: (id: string, token: string) => request<any>(`/api/queues/${id}/pause`, { method: 'POST', token }),
  resume: (id: string, token: string) => request<any>(`/api/queues/${id}/resume`, { method: 'POST', token }),
  stats: (id: string, token: string) => request<any>(`/api/queues/${id}/stats`, { token }),
  updateRetryPolicy: (id: string, data: any, token: string) => request<any>(`/api/queues/${id}/retry-policy`, { method: 'PUT', body: data, token }),
};

// ─── Jobs ───────────────────────────────────────────────────────────────────────

export const jobsApi = {
  list: (token: string, params?: Record<string, string>) => {
    const query = params ? new URLSearchParams(params).toString() : '';
    return request<any>(`/api/jobs?${query}`, { token });
  },
  get: (id: string, token: string) => request<any>(`/api/jobs/${id}`, { token }),
  create: (data: any, token: string) => request<any>('/api/jobs', { method: 'POST', body: data, token }),
  retry: (id: string, token: string) => request<any>(`/api/jobs/${id}/retry`, { method: 'POST', token }),
};

// ─── Workers ────────────────────────────────────────────────────────────────────

export const workersApi = {
  list: (token: string) => request<any>('/api/workers', { token }),
};

// ─── Dashboard ──────────────────────────────────────────────────────────────────

export const dashboardApi = {
  metrics: (token: string, projectId?: string) => request<any>(`/api/dashboard/metrics?${projectId ? `projectId=${projectId}` : ''}`, { token }),
};
