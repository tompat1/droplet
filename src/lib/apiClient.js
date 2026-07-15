const API_BASE = '/api';

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options,
    body: options.body && typeof options.body !== 'string'
      ? JSON.stringify(options.body)
      : options.body
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed with ${response.status}`);
  }
  return payload;
}

export const authApi = {
  me: () => apiRequest('/auth/me'),
  register: (input) => apiRequest('/auth/register', { method: 'POST', body: input }),
  login: (input) => apiRequest('/auth/login', { method: 'POST', body: input }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' })
};

export const canvasApi = {
  list: () => apiRequest('/canvases'),
  create: (canvas) => apiRequest('/canvases', { method: 'POST', body: canvas }),
  get: (id) => apiRequest(`/canvases/${id}`),
  update: (id, canvas) => apiRequest(`/canvases/${id}`, { method: 'PUT', body: canvas }),
  delete: (id) => apiRequest(`/canvases/${id}`, { method: 'DELETE' }),
  snapshot: (id) => apiRequest(`/canvases/${id}/snapshot`, { method: 'POST' })
};
