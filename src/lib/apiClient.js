const API_BASE = '/api';

export async function apiRequest(path, options = {}) {
  const { headers: optionHeaders, body: optionBody, retryOnTimeout = false, ...restOptions } = options;
  const serializedBody = optionBody && typeof optionBody !== 'string'
    ? JSON.stringify(optionBody)
    : optionBody;
  const mergedHeaders = {
    'Content-Type': 'application/json',
    ...(optionHeaders || {})
  };
  const maxAttempts = retryOnTimeout ? 2 : 1;

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        credentials: 'include',
        cache: 'no-store',
        ...restOptions,
        headers: mergedHeaders,
        body: serializedBody
      });

      if (response.status === 408 && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        continue;
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 408) {
          throw new Error(payload.error || 'Request timed out (408). Try fewer or smaller reference images and run again.');
        }
        throw new Error(payload.error || `Request failed with ${response.status}`);
      }
      return payload;
    } catch (error) {
      lastError = error;
      const isNetworkDrop = error instanceof TypeError;
      if (isNetworkDrop && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

export const authApi = {
  me: () => apiRequest('/auth/me'),
  register: (input) => apiRequest('/auth/register', { method: 'POST', body: input }),
  login: (input) => apiRequest('/auth/login', { method: 'POST', body: input }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  updateProfile: (input) => apiRequest('/auth/profile', { method: 'PATCH', body: input })
};

export const canvasApi = {
  list: () => apiRequest('/canvases'),
  create: (canvas) => apiRequest('/canvases', { method: 'POST', body: canvas }),
  get: (id) => apiRequest(`/canvases/${id}`),
  update: (id, canvas) => apiRequest(`/canvases/${id}`, { method: 'PUT', body: canvas }),
  delete: (id) => apiRequest(`/canvases/${id}`, { method: 'DELETE' }),
  snapshot: (id) => apiRequest(`/canvases/${id}/snapshot`, { method: 'POST' })
};

export const generationApi = {
  createBranch: (input, options = {}) => apiRequest('/generate/branch', {
    method: 'POST',
    body: input,
    headers: options.headers || {},
    retryOnTimeout: true
  })
};

export const usageApi = {
  summary: () => apiRequest('/usage/summary')
};

export const siteContentApi = {
  list: () => apiRequest('/site-content')
};

export const adminApi = {
  users: () => apiRequest('/admin/users'),
  createUser: (input) => apiRequest('/admin/users', { method: 'POST', body: input }),
  updateUser: (id, input) => apiRequest(`/admin/users/${id}`, { method: 'PATCH', body: input }),
  deleteUser: (id) => apiRequest(`/admin/users/${id}`, { method: 'DELETE' }),
  updateSiteContent: (key, input) => apiRequest(`/admin/site-content/${encodeURIComponent(key)}`, { method: 'PUT', body: input })
};
