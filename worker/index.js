const SESSION_COOKIE = 'droplet_session';
const SESSION_DAYS = 30;
const MAX_JSON_BYTES = 8_000_000;
const PBKDF2_ITERATIONS = 100000;
const CANVAS_ASSET_CHUNK_CHARS = 64000;
const CANVAS_ASSET_REF_FLAG = '__dropletCanvasAsset';
const GENERATION_PROVIDERS = {
  openai_image: {
    label: 'ChatGPT Images',
    pipeline: 'image',
    defaultModel: 'gpt-image-2'
  },
  gemini_banana_pro: {
    label: 'Gemini Banana Pro',
    pipeline: 'image',
    defaultModel: 'gemini-3-pro-image'
  },
  google_veo: {
    label: 'Google Veo',
    pipeline: 'video',
    defaultModel: 'veo-3.1-generate-preview'
  }
};
const OPENAI_IMAGE_PRICE_ESTIMATES_USD = {
  'gpt-image-2': {
    '1024x1024': { low: 0.006, medium: 0.053, high: 0.211 },
    '1024x1536': { low: 0.005, medium: 0.041, high: 0.165 },
    '1536x1024': { low: 0.005, medium: 0.041, high: 0.165 }
  },
  'gpt-image-1.5': {
    '1024x1024': { low: 0.009, medium: 0.034, high: 0.133 },
    '1024x1536': { low: 0.013, medium: 0.05, high: 0.2 },
    '1536x1024': { low: 0.013, medium: 0.05, high: 0.2 }
  },
  'gpt-image-1': {
    '1024x1024': { low: 0.011, medium: 0.042, high: 0.167 },
    '1024x1536': { low: 0.016, medium: 0.063, high: 0.25 },
    '1536x1024': { low: 0.016, medium: 0.063, high: 0.25 }
  },
  'gpt-image-1-mini': {
    '1024x1024': { low: 0.005, medium: 0.011, high: 0.036 },
    '1024x1536': { low: 0.006, medium: 0.015, high: 0.052 },
    '1536x1024': { low: 0.006, medium: 0.015, high: 0.052 }
  }
};
const DEFAULT_IMAGE_SIZE = '1024x1024';
const DEFAULT_IMAGE_QUALITY = 'medium';
const DEFAULT_VEO_SECONDS = 8;
const COLOR_WORD_ALIASES = {
  red: ['red', 'crimson', 'scarlet'],
  orange: ['orange', 'ember', 'tangerine'],
  yellow: ['yellow', 'gold', 'golden'],
  green: ['green', 'moss', 'emerald'],
  blue: ['blue', 'cobalt', 'navy', 'azure'],
  purple: ['purple', 'violet', 'lavender'],
  pink: ['pink', 'magenta', 'fuchsia'],
  brown: ['brown', 'tan', 'beige', 'terra', 'root'],
  black: ['black', 'midnight'],
  white: ['white', 'bone', 'cream'],
  gray: ['gray', 'grey', 'silver', 'chrome']
};
const COLOR_REFERENCE_HEX = {
  red: '#FF0000',
  orange: '#FF7A00',
  yellow: '#FFD400',
  green: '#00A85A',
  blue: '#1E5BFF',
  purple: '#7A3FF2',
  pink: '#FF4FB8',
  brown: '#7A4A28',
  black: '#050505',
  white: '#FFFFFF',
  gray: '#A0A0A0'
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    try {
      if (!env.DB) {
        return json({ error: 'D1 binding DB is not configured' }, 500);
      }

      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders(request) });
      }

      return await routeApi(request, env, url);
    } catch (error) {
      console.error(error);
      return jsonError(error);
    }
  }
};

async function routeApi(request, env, url) {
  const path = url.pathname.replace(/^\/api/, '') || '/';

  if (request.method === 'GET' && path === '/health') {
    return json({ ok: true, service: 'droplet-worker' });
  }

  if (request.method === 'GET' && path === '/site-content') {
    return listSiteContent(env);
  }

  if (request.method === 'POST' && path === '/auth/register') {
    return withAuthDiagnostics('register', () => register(request, env));
  }

  if (request.method === 'POST' && path === '/auth/login') {
    return withAuthDiagnostics('login', () => login(request, env));
  }

  if (request.method === 'POST' && path === '/auth/logout') {
    const session = await requireSession(request, env);
    if (session) {
      await env.DB.prepare('UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = ?').bind(session.id).run();
    }
    return json({ ok: true }, 200, clearSessionCookie());
  }

  if (request.method === 'GET' && path === '/auth/me') {
    const session = await requireSession(request, env);
    if (!session) return json({ user: null }, 200);
    return json({ user: publicUser(session.user) });
  }

  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Authentication required' }, 401);

  if (request.method === 'PATCH' && path === '/auth/profile') {
    return updateProfile(request, env, session.user.id);
  }

  if (request.method === 'POST' && path === '/generate/branch') {
    return createGenerationBranch(request, env, session.user.id);
  }

  if (request.method === 'GET' && path === '/usage/summary') {
    return getUsageSummary(env, session.user.id);
  }

  if (path.startsWith('/admin/')) {
    if (session.user.role !== 'admin') return json({ error: 'Admin access required' }, 403);

    if (request.method === 'GET' && path === '/admin/users') {
      return listUsers(env);
    }

    if (request.method === 'POST' && path === '/admin/users') {
      return createUserAsAdmin(request, env);
    }

    const siteContentMatch = path.match(/^\/admin\/site-content\/([^/]+)$/);
    if (siteContentMatch && request.method === 'PUT') {
      return updateSiteContent(request, env, siteContentMatch[1], session.user.id);
    }

    const adminUserMatch = path.match(/^\/admin\/users\/([^/]+)$/);
    if (adminUserMatch && request.method === 'PATCH') {
      return updateUserAsAdmin(request, env, adminUserMatch[1], session.user.id);
    }

    if (adminUserMatch && request.method === 'DELETE') {
      return deleteUserAsAdmin(env, adminUserMatch[1], session.user.id);
    }

    return json({ error: 'Admin route not found' }, 404);
  }

  if (request.method === 'GET' && path === '/canvases') {
    return listCanvases(env, session.user.id);
  }

  if (request.method === 'POST' && path === '/canvases') {
    return createCanvas(request, env, session.user.id);
  }

  const canvasMatch = path.match(/^\/canvases\/([^/]+)$/);
  if (canvasMatch && request.method === 'GET') {
    return getCanvas(env, session.user.id, canvasMatch[1]);
  }

  if (canvasMatch && request.method === 'PUT') {
    return updateCanvas(request, env, session.user.id, canvasMatch[1]);
  }

  if (canvasMatch && request.method === 'DELETE') {
    return deleteCanvas(env, session.user.id, canvasMatch[1]);
  }

  const versionMatch = path.match(/^\/canvases\/([^/]+)\/snapshot$/);
  if (versionMatch && request.method === 'POST') {
    return createCanvasVersion(env, session.user.id, versionMatch[1]);
  }

  return json({ error: 'Not found' }, 404);
}

async function register(request, env) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  const displayName = cleanText(body.displayName, 120);
  const avatarUrl = normalizeAvatarUrl(body.avatarUrl);

  if (!email || !email.includes('@')) return json({ error: 'Valid email is required' }, 400);
  if (password.length < 10) return json({ error: 'Password must be at least 10 characters' }, 400);

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return json({ error: 'User already exists' }, 409);

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const role = await determineNewUserRole(env, email);

  await env.DB.prepare(
    'INSERT INTO users (id, email, display_name, avatar_url, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(userId, email, displayName, avatarUrl, passwordHash, role).run();

  const user = { id: userId, email, display_name: displayName, avatar_url: avatarUrl, role };
  const { cookie } = await createSession(env, userId);

  return json({ user: publicUser(user) }, 201, cookie);
}

async function withAuthDiagnostics(action, handler) {
  try {
    return await handler();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Auth ${action} failed`, {
      message,
      stack: error instanceof Error ? error.stack : undefined
    });
    return json({ error: `Auth ${action} failed: ${message}` }, 500);
  }
}

async function login(request, env) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');

  const user = await env.DB.prepare(
    'SELECT id, email, display_name, avatar_url, password_hash, role FROM users WHERE email = ?'
  ).bind(email).first();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return json({ error: 'Invalid email or password' }, 401);
  }

  const { cookie } = await createSession(env, user.id);
  return json({ user: publicUser(user) }, 200, cookie);
}

async function updateProfile(request, env, userId) {
  const body = await readJson(request);
  const displayName = cleanText(body.displayName, 120);
  const avatarUrl = normalizeAvatarUrl(body.avatarUrl);

  await env.DB.prepare(
    'UPDATE users SET display_name = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(displayName, avatarUrl, userId).run();

  const user = await env.DB.prepare(
    'SELECT id, email, display_name, avatar_url, role FROM users WHERE id = ?'
  ).bind(userId).first();

  return json({ user: publicUser(user) });
}

async function listUsers(env) {
  const result = await env.DB.prepare(
    `SELECT users.id, users.email, users.display_name, users.avatar_url, users.role, users.created_at, users.updated_at,
      COUNT(canvases.id) AS canvas_count
     FROM users
     LEFT JOIN canvases ON canvases.user_id = users.id
     GROUP BY users.id
     ORDER BY users.created_at DESC`
  ).all();

  return json({ users: result.results.map(publicAdminUser) });
}

async function createUserAsAdmin(request, env) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  const displayName = cleanText(body.displayName, 120);
  const avatarUrl = normalizeAvatarUrl(body.avatarUrl);
  const role = body.role === 'admin' ? 'admin' : 'user';

  if (!email || !email.includes('@')) return json({ error: 'Valid email is required' }, 400);
  if (password.length < 10) return json({ error: 'Password must be at least 10 characters' }, 400);

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return json({ error: 'User already exists' }, 409);

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  await env.DB.prepare(
    'INSERT INTO users (id, email, display_name, avatar_url, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(userId, email, displayName, avatarUrl, passwordHash, role).run();

  return json({
    user: publicAdminUser({
      id: userId,
      email,
      display_name: displayName,
      avatar_url: avatarUrl,
      role,
      canvas_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }, 201);
}

async function updateUserAsAdmin(request, env, userId, currentUserId) {
  const body = await readJson(request);
  const displayName = cleanText(body.displayName, 120);
  const avatarUrl = normalizeAvatarUrl(body.avatarUrl);
  const role = body.role === 'admin' ? 'admin' : 'user';

  const target = await env.DB.prepare('SELECT id, role FROM users WHERE id = ?').bind(userId).first();
  if (!target) return json({ error: 'User not found' }, 404);

  if (userId === currentUserId && role !== 'admin') {
    return json({ error: 'You cannot remove your own admin access' }, 400);
  }

  await env.DB.prepare(
    'UPDATE users SET display_name = ?, avatar_url = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(displayName, avatarUrl, role, userId).run();

  return json({ ok: true });
}

async function deleteUserAsAdmin(env, userId, currentUserId) {
  if (userId === currentUserId) return json({ error: 'You cannot delete your own account' }, 400);

  const result = await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
  if (!result.meta || result.meta.changes === 0) return json({ error: 'User not found' }, 404);

  return json({ ok: true });
}

async function listSiteContent(env) {
  let result;
  try {
    result = await env.DB.prepare(
      'SELECT content_key, content_value, updated_at FROM site_content ORDER BY content_key ASC'
    ).all();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/no such table: site_content/i.test(message)) return json({ content: {} });
    throw error;
  }

  const content = {};
  for (const row of result.results || []) {
    content[row.content_key] = {
      value: row.content_value,
      updatedAt: row.updated_at
    };
  }

  return json({ content });
}

async function updateSiteContent(request, env, rawKey, userId) {
  const key = normalizeSiteContentKey(rawKey);
  if (!key) return json({ error: 'Invalid content key' }, 400);

  const body = await readJson(request);
  const value = cleanText(body.value, 5000);

  await env.DB.prepare(
    `INSERT INTO site_content (content_key, content_value, updated_by, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(content_key) DO UPDATE SET
       content_value = excluded.content_value,
       updated_by = excluded.updated_by,
       updated_at = CURRENT_TIMESTAMP`
  ).bind(key, value, userId).run();

  return json({ item: { key, value } });
}

async function listCanvases(env, userId) {
  const result = await env.DB.prepare(
    `SELECT id, name, description, is_default, viewport_json, settings_json, created_at, updated_at
     FROM canvases WHERE user_id = ? ORDER BY updated_at DESC`
  ).bind(userId).all();

  return json({ canvases: result.results.map(parseCanvasRow) });
}

async function getCanvas(env, userId, canvasId) {
  const row = await env.DB.prepare(
    'SELECT * FROM canvases WHERE id = ? AND user_id = ?'
  ).bind(canvasId, userId).first();

  if (!row) return json({ error: 'Canvas not found' }, 404);
  const canvas = parseCanvasRow(row, true);
  canvas.snapshot = await hydrateCanvasSnapshotAssets(env, canvas.id, canvas.snapshot);
  return json({ canvas });
}

async function createCanvas(request, env, userId) {
  const body = await readJson(request);
  const canvas = normalizeCanvasPayload(body);
  const id = crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO canvases (id, user_id, name, description, is_default, viewport_json, settings_json, snapshot_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    userId,
    canvas.name,
    canvas.description,
    canvas.isDefault ? 1 : 0,
    JSON.stringify(canvas.viewport),
    JSON.stringify(canvas.settings),
    JSON.stringify(emptyCanvasSnapshot(canvas.snapshot))
  ).run();

  try {
    const storageSnapshot = await prepareCanvasSnapshotForStorage(env, id, canvas.snapshot);
    await env.DB.prepare(
      'UPDATE canvases SET snapshot_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(JSON.stringify(storageSnapshot), id).run();
    await syncCanvasParts(env, id, storageSnapshot);
  } catch (error) {
    await env.DB.prepare('DELETE FROM canvases WHERE id = ?').bind(id).run();
    throw error;
  }

  return getCanvas(env, userId, id);
}

async function updateCanvas(request, env, userId, canvasId) {
  const exists = await env.DB.prepare(
    'SELECT id FROM canvases WHERE id = ? AND user_id = ?'
  ).bind(canvasId, userId).first();

  if (!exists) return json({ error: 'Canvas not found' }, 404);

  const canvas = normalizeCanvasPayload(await readJson(request));
  const storageSnapshot = await prepareCanvasSnapshotForStorage(env, canvasId, canvas.snapshot);

  await env.DB.prepare(
    `UPDATE canvases
     SET name = ?, description = ?, is_default = ?, viewport_json = ?, settings_json = ?, snapshot_json = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`
  ).bind(
    canvas.name,
    canvas.description,
    canvas.isDefault ? 1 : 0,
    JSON.stringify(canvas.viewport),
    JSON.stringify(canvas.settings),
    JSON.stringify(storageSnapshot),
    canvasId,
    userId
  ).run();

  await syncCanvasParts(env, canvasId, storageSnapshot);
  return getCanvas(env, userId, canvasId);
}

async function deleteCanvas(env, userId, canvasId) {
  const result = await env.DB.prepare(
    'DELETE FROM canvases WHERE id = ? AND user_id = ?'
  ).bind(canvasId, userId).run();

  if (!result.meta || result.meta.changes === 0) return json({ error: 'Canvas not found' }, 404);
  return json({ ok: true });
}

async function createCanvasVersion(env, userId, canvasId) {
  const row = await env.DB.prepare(
    'SELECT snapshot_json FROM canvases WHERE id = ? AND user_id = ?'
  ).bind(canvasId, userId).first();

  if (!row) return json({ error: 'Canvas not found' }, 404);

  const versionId = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO canvas_versions (id, canvas_id, created_by, snapshot_json) VALUES (?, ?, ?, ?)'
  ).bind(versionId, canvasId, userId, row.snapshot_json).run();

  return json({ id: versionId }, 201);
}

async function createGenerationBranch(request, env, userId) {
  let input = { provider: 'unknown' };
  try {
    input = normalizeGenerationPayload(await readJson(request));
    const provider = GENERATION_PROVIDERS[input.provider];
    if (!provider) return json({ error: 'Unsupported generation provider' }, 400);

    let branch;
    if (input.provider === 'openai_image') {
      branch = await generateOpenAiImage(env, input);
    } else if (input.provider === 'gemini_banana_pro') {
      branch = await generateGeminiImage(env, input);
    } else if (input.provider === 'google_veo') {
      branch = await generateGoogleVeo(env, input);
    }

    const usage = estimateGenerationUsage(input, branch, provider);
    await recordGenerationUsage(env, userId, input, branch, provider, usage);

    return json({
      branch: {
        ...branch,
        provider: input.provider,
        providerLabel: provider.label,
        pipeline: provider.pipeline,
        prompt: input.prompt,
        refs: input.refs,
        usage
      },
      usage,
      generatedAt: new Date().toISOString()
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Generation branch failed', { provider: input.provider, message });
    const status = /required|unsupported/i.test(message) ? 400 : 502;
    return json({ error: `Generation failed: ${message}` }, status);
  }
}

async function getUsageSummary(env, userId) {
  let totals;
  let byProvider;
  let recent;
  try {
    totals = await env.DB.prepare(
      `SELECT COUNT(*) AS request_count,
              COALESCE(SUM(estimated_usd), 0) AS estimated_usd,
              COALESCE(SUM(CASE WHEN pipeline = 'image' THEN 1 ELSE 0 END), 0) AS image_count,
              COALESCE(SUM(CASE WHEN pipeline = 'video' THEN 1 ELSE 0 END), 0) AS video_count
       FROM generation_usage
       WHERE user_id = ?`
    ).bind(userId).first();

    byProvider = await env.DB.prepare(
      `SELECT provider, provider_label, pipeline, COUNT(*) AS request_count, COALESCE(SUM(estimated_usd), 0) AS estimated_usd
       FROM generation_usage
       WHERE user_id = ?
       GROUP BY provider, provider_label, pipeline
       ORDER BY estimated_usd DESC`
    ).bind(userId).all();

    recent = await env.DB.prepare(
      `SELECT id, provider, provider_label, pipeline, model, status, output_size, output_quality, estimated_usd, estimate_basis, created_at
       FROM generation_usage
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 8`
    ).bind(userId).all();
  } catch (error) {
    console.warn('Generation usage summary unavailable', error instanceof Error ? error.message : String(error));
    totals = { request_count: 0, estimated_usd: 0, image_count: 0, video_count: 0 };
    byProvider = { results: [] };
    recent = { results: [] };
  }

  return json({
    currency: 'USD',
    summary: {
      requestCount: Number(totals?.request_count || 0),
      estimatedUsd: roundMoney(totals?.estimated_usd || 0),
      imageCount: Number(totals?.image_count || 0),
      videoCount: Number(totals?.video_count || 0)
    },
    byProvider: byProvider.results.map((row) => ({
      provider: row.provider,
      providerLabel: row.provider_label,
      pipeline: row.pipeline,
      requestCount: Number(row.request_count || 0),
      estimatedUsd: roundMoney(row.estimated_usd || 0)
    })),
    recent: recent.results.map((row) => ({
      id: row.id,
      provider: row.provider,
      providerLabel: row.provider_label,
      pipeline: row.pipeline,
      model: row.model,
      status: row.status,
      outputSize: row.output_size,
      outputQuality: row.output_quality,
      estimatedUsd: roundMoney(row.estimated_usd || 0),
      estimateBasis: row.estimate_basis,
      createdAt: row.created_at
    }))
  });
}

async function recordGenerationUsage(env, userId, input, branch, provider, usage) {
  if (!usage || usage.mock) return;
  try {
    await env.DB.prepare(
      `INSERT INTO generation_usage
       (id, user_id, provider, provider_label, pipeline, model, status, prompt_chars, reference_count, output_count, output_size, output_quality, estimated_usd, estimate_basis)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      userId,
      input.provider,
      provider.label,
      provider.pipeline,
      branch.model || usage.model || '',
      usage.status || 'estimated',
      input.prompt.length,
      input.refs.length + (Array.isArray(input.brandGuide?.nodes) ? input.brandGuide.nodes.filter((node) => node.image).length : 0),
      usage.outputCount || 1,
      usage.size || '',
      usage.quality || '',
      usage.estimatedUsd || 0,
      usage.estimateBasis || ''
    ).run();
  } catch (error) {
    console.warn('Generation usage tracking failed', error instanceof Error ? error.message : String(error));
  }
}

async function generateOpenAiImage(env, input) {
  const apiKey = String(env.OPENAI_API_KEY || '');
  const model = String(env.OPENAI_IMAGE_MODEL || GENERATION_PROVIDERS.openai_image.defaultModel);
  if (!apiKey) return mockGenerationBranch(input, model, 'OPENAI_API_KEY is not configured');

  const prompt = withReferenceContext(input);
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: input.size,
      quality: input.quality
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(providerError(payload, response.status));

  const imageBase64 = payload?.data?.[0]?.b64_json;
  if (!imageBase64) throw new Error('OpenAI did not return image data');

  return {
    title: 'ChatGPT Image Branch',
    subtitle: `Generated with ${model}`,
    description: input.prompt,
    imageDataUrl: `data:image/png;base64,${imageBase64}`,
    model,
    status: 'ready'
  };
}

async function generateGeminiImage(env, input) {
  const apiKey = String(env.GEMINI_API_KEY || env.GOOGLE_AI_API_KEY || '');
  const model = String(env.GEMINI_IMAGE_MODEL || GENERATION_PROVIDERS.gemini_banana_pro.defaultModel);
  if (!apiKey) return mockGenerationBranch(input, model, 'GEMINI_API_KEY is not configured');

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      input: geminiInteractionInput(input),
      response_format: {
        type: 'image',
        mime_type: 'image/png',
        aspect_ratio: '1:1',
        image_size: '1K'
      }
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(providerError(payload, response.status));

  const outputImage = payload?.output_image || payload?.outputImage;
  const imageBlock = findGeminiImageBlock(payload);
  const imageBase64 = outputImage?.data || imageBlock?.data;
  const mimeType = outputImage?.mime_type || outputImage?.mimeType || imageBlock?.mime_type || imageBlock?.mimeType || 'image/png';
  if (!imageBase64) throw new Error('Gemini did not return image data');

  return {
    title: 'Banana Pro Image Branch',
    subtitle: `Generated with ${model}`,
    description: payload?.output_text || payload?.outputText || input.prompt,
    imageDataUrl: `data:${mimeType};base64,${imageBase64}`,
    model,
    status: 'ready'
  };
}

async function generateGoogleVeo(env, input) {
  const apiKey = String(env.GEMINI_API_KEY || env.GOOGLE_AI_API_KEY || '');
  const model = String(env.VEO_VIDEO_MODEL || GENERATION_PROVIDERS.google_veo.defaultModel);
  if (!apiKey) return mockGenerationBranch(input, model, 'GEMINI_API_KEY is not configured');

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      instances: [{
        prompt: withReferenceContext(input)
      }]
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(providerError(payload, response.status));

  return {
    title: 'Veo Video Branch',
    subtitle: `Generating with ${model}`,
    description: input.prompt,
    model,
    operationName: payload.name || '',
    status: payload.done ? 'ready' : 'processing'
  };
}

function normalizeGenerationPayload(body) {
  const provider = cleanText(body.provider, 80);
  const prompt = cleanText(body.prompt, 4000);
  const parent = body.parent && typeof body.parent === 'object' ? body.parent : {};
  if (!prompt) throw new Error('Generation prompt is required');

  return {
    provider,
    pipeline: body.pipeline === 'video' ? 'video' : 'image',
    prompt,
    size: normalizeGenerationSize(body.size),
    quality: normalizeGenerationQuality(body.quality),
    durationSeconds: normalizeDurationSeconds(body.durationSeconds),
    refs: normalizeUrlList(body.refs),
    brandGuide: normalizeBrandGuidePayload(body.brandGuide),
    parent: {
      id: cleanText(parent.id, 160),
      title: cleanText(parent.title, 160),
      subtitle: cleanText(parent.subtitle, 160),
      description: cleanText(parent.description, 500),
      image: normalizeReferenceUrl(parent.image)
    }
  };
}

function normalizeBrandGuidePayload(value) {
  const nodes = Array.isArray(value?.nodes) ? value.nodes : [];
  return {
    nodes: nodes.slice(0, 5).map((node) => ({
      id: cleanText(node.id, 160),
      title: cleanText(node.title, 180),
      subtitle: cleanText(node.subtitle, 180),
      description: cleanText(node.description, 1200),
      image: normalizeReferenceUrl(node.image),
      brandName: cleanText(node.brandName, 180),
      colors: normalizeBrandColors(node.colors)
    }))
  };
}

function estimateGenerationUsage(input, branch, provider) {
  const model = branch.model || GENERATION_PROVIDERS[input.provider]?.defaultModel || '';
  if (branch.mock) {
    return {
      provider: input.provider,
      providerLabel: provider.label,
      pipeline: provider.pipeline,
      model,
      estimatedUsd: 0,
      currency: 'USD',
      status: 'mock',
      mock: true,
      estimateBasis: 'No provider API key configured; placeholder branch only.'
    };
  }

  if (input.provider === 'openai_image') {
    const normalizedModel = OPENAI_IMAGE_PRICE_ESTIMATES_USD[model] ? model : 'gpt-image-2';
    const size = OPENAI_IMAGE_PRICE_ESTIMATES_USD[normalizedModel][input.size] ? input.size : DEFAULT_IMAGE_SIZE;
    const quality = OPENAI_IMAGE_PRICE_ESTIMATES_USD[normalizedModel][size][input.quality] ? input.quality : DEFAULT_IMAGE_QUALITY;
    const estimatedUsd = OPENAI_IMAGE_PRICE_ESTIMATES_USD[normalizedModel][size][quality];
    return {
      provider: input.provider,
      providerLabel: provider.label,
      pipeline: provider.pipeline,
      model,
      estimatedUsd,
      currency: 'USD',
      status: 'estimated',
      outputCount: 1,
      size,
      quality,
      estimateBasis: `OpenAI image calculator estimate for ${normalizedModel}, ${size}, ${quality}; excludes variable prompt/reference input token costs.`
    };
  }

  if (input.provider === 'gemini_banana_pro') {
    return {
      provider: input.provider,
      providerLabel: provider.label,
      pipeline: provider.pipeline,
      model,
      estimatedUsd: 0.039,
      currency: 'USD',
      status: 'estimated',
      outputCount: 1,
      size: input.size,
      quality: input.quality,
      estimateBasis: 'Gemini image estimate using Google Gemini 2.5 Flash Image 1024px output equivalent; update when model-specific Banana Pro pricing is published.'
    };
  }

  if (input.provider === 'google_veo') {
    const seconds = input.durationSeconds || DEFAULT_VEO_SECONDS;
    const pricePerSecond = model.includes('fast') ? 0.10 : model.includes('lite') ? 0.05 : 0.40;
    return {
      provider: input.provider,
      providerLabel: provider.label,
      pipeline: provider.pipeline,
      model,
      estimatedUsd: roundMoney(seconds * pricePerSecond),
      currency: 'USD',
      status: branch.status === 'processing' ? 'pending-estimate' : 'estimated',
      outputCount: 1,
      durationSeconds: seconds,
      estimateBasis: `Google Veo estimate at $${pricePerSecond.toFixed(2)}/second for ${seconds}s; final charge applies only if provider completes the video.`
    };
  }

  return {
    provider: input.provider,
    providerLabel: provider.label,
    pipeline: provider.pipeline,
    model,
    estimatedUsd: 0,
    currency: 'USD',
    status: 'unknown',
    estimateBasis: 'No pricing estimate available for this provider.'
  };
}

function mockGenerationBranch(input, model, reason) {
  const provider = GENERATION_PROVIDERS[input.provider] || GENERATION_PROVIDERS.openai_image;
  return {
    title: `${provider.pipeline === 'video' ? 'Video' : 'Image'} Branch`,
    subtitle: `${provider.label} setup placeholder`,
    description: `${input.prompt}\n\n${reason}`,
    model,
    status: 'mock',
    mock: true,
    operationName: ''
  };
}

function normalizeGenerationSize(value) {
  const size = cleanText(value, 20).toLowerCase().replace(/\s+/g, '');
  if (['1024x1024', '1024x1536', '1536x1024'].includes(size)) return size;
  return DEFAULT_IMAGE_SIZE;
}

function normalizeGenerationQuality(value) {
  const quality = cleanText(value, 20).toLowerCase();
  if (['low', 'medium', 'high'].includes(quality)) return quality;
  return DEFAULT_IMAGE_QUALITY;
}

function normalizeDurationSeconds(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return DEFAULT_VEO_SECONDS;
  return Math.min(30, Math.max(1, Math.round(seconds)));
}

function geminiInteractionInput(input) {
  if (input.refs.length === 0) return input.prompt;
  return [
    ...input.refs.map((uri) => ({ type: 'image', uri, mime_type: inferImageMimeType(uri) })),
    { type: 'text', text: input.prompt }
  ];
}

function findGeminiImageBlock(payload) {
  const steps = Array.isArray(payload?.steps) ? payload.steps : [];
  for (const step of steps) {
    const blocks = Array.isArray(step?.content) ? step.content : Array.isArray(step?.summary) ? step.summary : [];
    const image = blocks.find((block) => block?.type === 'image' && block?.data);
    if (image) return image;
  }
  return null;
}

function normalizeBrandColors(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((color) => ({
      name: cleanText(color?.name, 80),
      hex: normalizeHexColor(color?.hex)
    }))
    .filter((color) => color.name || color.hex)
    .slice(0, 24);
}

function normalizeHexColor(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return '';
  const hex = match[1].length === 3
    ? match[1].split('').map((char) => char + char).join('')
    : match[1];
  return `#${hex.toUpperCase()}`;
}

function extractBrandColors(input) {
  const guideNodes = Array.isArray(input.brandGuide?.nodes) ? input.brandGuide.nodes : [];
  const structuredColors = guideNodes.flatMap((node) => Array.isArray(node.colors) ? node.colors : []);
  const textColors = guideNodes.flatMap((node) => extractHexColorsFromText([node.title, node.subtitle, node.description, node.brandName].filter(Boolean).join(' ')));
  const colorsByKey = new Map();
  [...structuredColors, ...textColors].forEach((color) => {
    const hex = normalizeHexColor(color.hex);
    const name = cleanText(color.name, 80);
    if (!hex && !name) return;
    const key = hex || name.toLowerCase();
    if (!colorsByKey.has(key)) colorsByKey.set(key, { name, hex });
  });
  return [...colorsByKey.values()];
}

function extractHexColorsFromText(text) {
  const matches = String(text || '').match(/#[0-9a-f]{3,6}\b/gi) || [];
  return matches.map((hex) => ({ name: '', hex }));
}

function detectRequestedColorWords(prompt) {
  const lowerPrompt = String(prompt || '').toLowerCase();
  return Object.entries(COLOR_WORD_ALIASES)
    .filter(([, aliases]) => aliases.some((alias) => new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'i').test(lowerPrompt)))
    .map(([color]) => color);
}

function mapPromptColorsToBrand(input) {
  const requestedColors = detectRequestedColorWords(input.prompt);
  const brandColors = extractBrandColors(input);
  if (requestedColors.length === 0 || brandColors.length === 0) return [];

  return requestedColors.map((requested) => {
    const aliases = COLOR_WORD_ALIASES[requested] || [requested];
    const matched = brandColors.find((color) => {
      const name = String(color.name || '').toLowerCase();
      return aliases.some((alias) => name.includes(alias));
    }) || nearestBrandColor(requested, brandColors) || brandColors[0];
    return { requested, ...matched };
  });
}

function nearestBrandColor(requested, brandColors) {
  const reference = hexToRgb(COLOR_REFERENCE_HEX[requested]);
  if (!reference) return null;
  return brandColors
    .map((color) => ({
      color,
      distance: color.hex ? colorDistance(reference, hexToRgb(color.hex)) : Number.POSITIVE_INFINITY
    }))
    .filter((entry) => Number.isFinite(entry.distance))
    .sort((a, b) => a.distance - b.distance)[0]?.color || null;
}

function hexToRgb(hex) {
  const normalized = normalizeHexColor(hex).slice(1);
  if (!normalized) return null;
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function colorDistance(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return Math.sqrt(
    ((a.r - b.r) ** 2) +
    ((a.g - b.g) ** 2) +
    ((a.b - b.b) ** 2)
  );
}

function brandColorPromptSection(input) {
  const brandColors = extractBrandColors(input);
  const colorMappings = mapPromptColorsToBrand(input);
  if (brandColors.length === 0) {
    return 'Brand color rule: If the user asks for any color, resolve it against the visible branding guide image and brand rules instead of inventing a generic color.';
  }

  const palette = brandColors
    .map((color, index) => `${index + 1}. ${[color.name, color.hex].filter(Boolean).join(' ')}`)
    .join('\n');
  const mappings = colorMappings.length > 0
    ? `\nRequested color mapping:\n${colorMappings.map((color) => `- "${color.requested}" must use ${[color.name, color.hex].filter(Boolean).join(' ')}`).join('\n')}`
    : '';

  return `Brand color rule: Match all prompt color requests to the brand palette below. Use exact hex values when available; do not substitute generic colors.\nBrand palette:\n${palette}${mappings}`;
}

function withReferenceContext(input) {
  const guideNodes = Array.isArray(input.brandGuide?.nodes) ? input.brandGuide.nodes : [];
  const guideContext = guideNodes
    .filter((node) => node.title || node.description || node.brandName)
    .map((node, index) => [
      `${index + 1}. ${node.title || node.brandName || 'Brand guide'}`,
      node.subtitle ? `Role: ${node.subtitle}` : '',
      node.description ? `Rules: ${node.description}` : ''
    ].filter(Boolean).join('\n'))
    .join('\n\n');

  const sections = [input.prompt];
  if (guideContext) {
    sections.push(`Brand source of truth. Treat this as the governing reference for all style, typography, color, logo, layout, and tone decisions:\n${guideContext}`);
  }
  sections.push(brandColorPromptSection(input));
  if (input.refs.length > 0) {
    sections.push(`Reference image URLs:\n${input.refs.map((ref, index) => `${index + 1}. ${ref}`).join('\n')}`);
  }

  return sections.join('\n\n');
}

function normalizeUrlList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeReferenceUrl).filter(Boolean).slice(0, 3);
}

function normalizeReferenceUrl(value) {
  const url = cleanText(value, 2000);
  if (!url) return '';

  if (/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(url) && url.length <= 750000) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.toString();
  } catch {
    return '';
  }

  return '';
}

function inferImageMimeType(uri) {
  if (/^data:image\/jpeg/i.test(uri) || /\.jpe?g($|\?)/i.test(uri)) return 'image/jpeg';
  if (/^data:image\/webp/i.test(uri) || /\.webp($|\?)/i.test(uri)) return 'image/webp';
  if (/^data:image\/gif/i.test(uri) || /\.gif($|\?)/i.test(uri)) return 'image/gif';
  return 'image/png';
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function providerError(payload, status) {
  if (payload?.error?.message) return payload.error.message;
  if (typeof payload?.error === 'string') return payload.error;
  return `Provider request failed with ${status}`;
}

async function syncCanvasParts(env, canvasId, snapshot) {
  try {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM canvas_edges WHERE canvas_id = ?').bind(canvasId),
      env.DB.prepare('DELETE FROM canvas_nodes WHERE canvas_id = ?').bind(canvasId)
    ]);

    const nodeStatements = Array.isArray(snapshot.nodes)
      ? snapshot.nodes.map((node) => env.DB.prepare(
        `INSERT INTO canvas_nodes
         (id, canvas_id, node_id, type, position_x, position_y, width, height, hidden, z_index, data_json, style_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        crypto.randomUUID(),
        canvasId,
        String(node.id),
        node.type ? String(node.type) : null,
        Number(node.position?.x || 0),
        Number(node.position?.y || 0),
        nullableNumber(node.width),
        nullableNumber(node.height),
        node.hidden ? 1 : 0,
        nullableNumber(node.zIndex),
        JSON.stringify(compactCanvasNodeData(node.data || {})),
        JSON.stringify(node.style || {})
      ))
      : [];

    const edgeStatements = Array.isArray(snapshot.edges)
      ? snapshot.edges.map((edge) => env.DB.prepare(
        `INSERT INTO canvas_edges
         (id, canvas_id, edge_id, source_node_id, target_node_id, source_handle, target_handle, type, animated, data_json, style_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        crypto.randomUUID(),
        canvasId,
        String(edge.id),
        String(edge.source),
        String(edge.target),
        edge.sourceHandle ? String(edge.sourceHandle) : null,
        edge.targetHandle ? String(edge.targetHandle) : null,
        edge.type ? String(edge.type) : null,
        edge.animated ? 1 : 0,
        JSON.stringify(edge.data || {}),
        JSON.stringify(edge.style || {})
      ))
      : [];

    const statements = [...nodeStatements, ...edgeStatements];
    if (statements.length > 0) await env.DB.batch(statements);
  } catch (error) {
    console.warn('Canvas parts index sync failed', error instanceof Error ? error.message : String(error));
  }
}

async function requireSession(request, env) {
  const token = parseCookies(request.headers.get('Cookie'))[SESSION_COOKIE];
  if (!token) return null;

  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT sessions.id, sessions.user_id, users.email, users.display_name, users.avatar_url, users.role
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ?
       AND sessions.revoked_at IS NULL
       AND sessions.expires_at > CURRENT_TIMESTAMP`
  ).bind(tokenHash).first();

  if (!row) return null;

  return {
    id: row.id,
    user: {
      id: row.user_id,
      email: row.email,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      role: row.role
    }
  };
}

async function determineNewUserRole(env, email) {
  const firstUser = await env.DB.prepare('SELECT COUNT(*) AS count FROM users').first();
  if (Number(firstUser?.count || 0) === 0) return 'admin';

  const adminEmails = String(env.ADMIN_EMAILS || '')
    .split(',')
    .map((value) => normalizeEmail(value))
    .filter(Boolean);

  return adminEmails.includes(email) ? 'admin' : 'user';
}

async function createSession(env, userId) {
  const token = crypto.randomUUID() + crypto.randomUUID();
  const tokenHash = await sha256Hex(token);
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await env.DB.prepare(
    'INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(sessionId, userId, tokenHash, expiresAt).run();

  return { cookie: sessionCookie(token) };
}

async function readJson(request) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_JSON_BYTES) throw new Error('JSON payload is too large');
  return request.json();
}

function normalizeCanvasPayload(body) {
  const snapshot = sanitizeSnapshot(body.snapshot || body);
  return {
    name: cleanText(body.name, 160) || 'Untitled Fluid Node Canvas',
    description: cleanText(body.description, 500),
    isDefault: body.isDefault === true || body.is_default === 1,
    viewport: body.viewport || snapshot.viewport || {},
    settings: body.settings || snapshot.settings || {},
    snapshot
  };
}

function sanitizeSnapshot(snapshot) {
  return {
    nodes: Array.isArray(snapshot.nodes) ? snapshot.nodes.map(sanitizeNode) : [],
    edges: Array.isArray(snapshot.edges) ? snapshot.edges.map(sanitizeEdge) : [],
    viewport: snapshot.viewport || {},
    settings: snapshot.settings || {},
    collapsedBranches: snapshot.collapsedBranches || {}
  };
}

function emptyCanvasSnapshot(snapshot) {
  return {
    nodes: [],
    edges: [],
    viewport: snapshot.viewport || {},
    settings: snapshot.settings || {},
    collapsedBranches: snapshot.collapsedBranches || {}
  };
}

function sanitizeNode(node) {
  return {
    id: String(node.id),
    type: node.type ? String(node.type) : undefined,
    position: {
      x: Number(node.position?.x || 0),
      y: Number(node.position?.y || 0)
    },
    width: nullableNumber(node.width),
    height: nullableNumber(node.height),
    hidden: node.hidden === true,
    zIndex: nullableNumber(node.zIndex),
    data: stripRuntimeCardData(node.data || {}),
    style: node.style || {}
  };
}

function sanitizeEdge(edge) {
  return {
    id: String(edge.id),
    source: String(edge.source),
    target: String(edge.target),
    sourceHandle: edge.sourceHandle ? String(edge.sourceHandle) : undefined,
    targetHandle: edge.targetHandle ? String(edge.targetHandle) : undefined,
    type: edge.type ? String(edge.type) : undefined,
    animated: edge.animated === true,
    data: edge.data || {},
    style: edge.style || {}
  };
}

function stripRuntimeCardData(data) {
  const copy = { ...data };
  delete copy.setGlobalNodes;
  delete copy.setGlobalEdges;
  delete copy.onToggleCollapse;
  delete copy.onGenerationUsageUpdate;
  delete copy.isHighlighted;
  delete copy.isParentCollapsed;
  delete copy.parentOffsetX;
  delete copy.parentOffsetY;
  return copy;
}

function compactCanvasNodeData(data) {
  const copy = stripRuntimeCardData(data);
  ['image', 'video'].forEach((key) => {
    if (typeof copy[key] === 'string' && copy[key].startsWith('data:')) {
      copy[`${key}InlineBytes`] = estimateDataUrlBytes(copy[key]);
      copy[key] = '[inline-media]';
    } else if (isCanvasAssetRef(copy[key])) {
      copy[`${key}InlineBytes`] = copy[key].byteLength || 0;
      copy[key] = `[canvas-asset:${copy[key].id}]`;
    }
  });

  if (Array.isArray(copy.generationRefs)) {
    copy.generationRefs = copy.generationRefs.map((ref) => (
      typeof ref === 'string' && ref.startsWith('data:')
        ? '[inline-reference]'
        : (isCanvasAssetRef(ref) ? `[canvas-asset:${ref.id}]` : ref)
    ));
  }

  return copy;
}

async function prepareCanvasSnapshotForStorage(env, canvasId, snapshot) {
  const assetCache = new Map();
  const nodes = Array.isArray(snapshot.nodes)
    ? await Promise.all(snapshot.nodes.map((node) => prepareCanvasNodeForStorage(env, canvasId, node, assetCache)))
    : [];

  return {
    ...snapshot,
    nodes
  };
}

async function prepareCanvasNodeForStorage(env, canvasId, node, assetCache) {
  const data = { ...(node.data || {}) };
  const nextData = await replaceInlineMediaValues(env, canvasId, data, assetCache);
  return {
    ...node,
    data: nextData
  };
}

async function replaceInlineMediaValues(env, canvasId, data, assetCache) {
  const copy = { ...data };

  for (const key of ['image', 'video']) {
    if (typeof copy[key] === 'string' && copy[key].startsWith('data:')) {
      copy[key] = await storeCanvasAsset(env, canvasId, key, copy[key], assetCache);
    }
  }

  if (Array.isArray(copy.generationRefs)) {
    const refs = [];
    for (const ref of copy.generationRefs) {
      refs.push(typeof ref === 'string' && ref.startsWith('data:')
        ? await storeCanvasAsset(env, canvasId, 'reference', ref, assetCache)
        : ref);
    }
    copy.generationRefs = refs;
  }

  return copy;
}

async function storeCanvasAsset(env, canvasId, kind, dataUrl, assetCache) {
  if (assetCache.has(dataUrl)) return assetCache.get(dataUrl);

  const assetHash = await sha256Hex(dataUrl);
  const existing = await env.DB.prepare(
    'SELECT id, kind, mime_type, byte_length FROM canvas_assets WHERE canvas_id = ? AND asset_hash = ?'
  ).bind(canvasId, assetHash).first();

  if (existing) {
    const firstChunk = await env.DB.prepare(
      'SELECT asset_id FROM canvas_asset_chunks WHERE asset_id = ? AND chunk_index = 0'
    ).bind(existing.id).first();
    if (firstChunk) {
      const ref = canvasAssetRef(existing.id, existing.kind || kind, existing.mime_type, Number(existing.byte_length || 0));
      assetCache.set(dataUrl, ref);
      return ref;
    }
    await env.DB.prepare('DELETE FROM canvas_assets WHERE id = ?').bind(existing.id).run();
  }

  const assetId = crypto.randomUUID();
  const mimeType = inferImageMimeType(dataUrl);
  const byteLength = estimateDataUrlBytes(dataUrl);
  await env.DB.prepare(
    `INSERT INTO canvas_assets (id, canvas_id, asset_hash, kind, mime_type, byte_length)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(assetId, canvasId, assetHash, String(kind), mimeType, byteLength).run();

  const chunks = chunkString(dataUrl, CANVAS_ASSET_CHUNK_CHARS);
  if (chunks.length > 0) {
    await env.DB.batch(chunks.map((chunk, index) => env.DB.prepare(
      'INSERT INTO canvas_asset_chunks (asset_id, chunk_index, chunk_text) VALUES (?, ?, ?)'
    ).bind(assetId, index, chunk)));
  }

  const ref = canvasAssetRef(assetId, kind, mimeType, byteLength);
  assetCache.set(dataUrl, ref);
  return ref;
}

function canvasAssetRef(id, kind, mimeType, byteLength) {
  return {
    [CANVAS_ASSET_REF_FLAG]: true,
    id,
    kind,
    mimeType,
    byteLength
  };
}

function isCanvasAssetRef(value) {
  return Boolean(value && typeof value === 'object' && value[CANVAS_ASSET_REF_FLAG] === true && value.id);
}

async function hydrateCanvasSnapshotAssets(env, canvasId, snapshot) {
  const assetCache = new Map();
  const nodes = Array.isArray(snapshot.nodes)
    ? await Promise.all(snapshot.nodes.map((node) => hydrateCanvasNodeAssets(env, canvasId, node, assetCache)))
    : [];

  return {
    ...snapshot,
    nodes
  };
}

async function hydrateCanvasNodeAssets(env, canvasId, node, assetCache) {
  const data = { ...(node.data || {}) };
  const nextData = await hydrateCanvasDataAssets(env, canvasId, data, assetCache);
  return {
    ...node,
    data: nextData
  };
}

async function hydrateCanvasDataAssets(env, canvasId, data, assetCache) {
  const copy = { ...data };

  for (const key of ['image', 'video']) {
    if (isCanvasAssetRef(copy[key])) {
      copy[key] = await loadCanvasAssetDataUrl(env, canvasId, copy[key], assetCache);
    }
  }

  if (Array.isArray(copy.generationRefs)) {
    const refs = [];
    for (const ref of copy.generationRefs) {
      refs.push(isCanvasAssetRef(ref) ? await loadCanvasAssetDataUrl(env, canvasId, ref, assetCache) : ref);
    }
    copy.generationRefs = refs;
  }

  return copy;
}

async function loadCanvasAssetDataUrl(env, canvasId, ref, assetCache) {
  if (assetCache.has(ref.id)) return assetCache.get(ref.id);

  const asset = await env.DB.prepare(
    'SELECT id FROM canvas_assets WHERE id = ? AND canvas_id = ?'
  ).bind(String(ref.id), canvasId).first();

  if (!asset) {
    assetCache.set(ref.id, '');
    return '';
  }

  const result = await env.DB.prepare(
    'SELECT chunk_text FROM canvas_asset_chunks WHERE asset_id = ? ORDER BY chunk_index ASC'
  ).bind(String(ref.id)).all();
  const dataUrl = result.results.map((row) => row.chunk_text || '').join('');
  assetCache.set(ref.id, dataUrl);
  return dataUrl;
}

function chunkString(value, size) {
  const chunks = [];
  const text = String(value || '');
  for (let index = 0; index < text.length; index += size) {
    chunks.push(text.slice(index, index + size));
  }
  return chunks;
}

function parseCanvasRow(row, includeSnapshot = false) {
  const parsed = {
    id: row.id,
    name: row.name,
    description: row.description,
    isDefault: row.is_default === 1,
    viewport: parseJson(row.viewport_json, {}),
    settings: parseJson(row.settings_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  if (includeSnapshot) parsed.snapshot = parseJson(row.snapshot_json, {});
  return parsed;
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name || user.displayName || '',
    avatarUrl: user.avatar_url || user.avatarUrl || '',
    role: user.role || 'user',
    isAdmin: user.role === 'admin'
  };
}

function publicAdminUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name || user.displayName || '',
    avatarUrl: user.avatar_url || user.avatarUrl || '',
    role: user.role || 'user',
    canvasCount: Number(user.canvas_count || 0),
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await derivePasswordKey(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2:${PBKDF2_ITERATIONS}:${bytesToHex(salt)}:${bytesToHex(new Uint8Array(key))}`;
}

async function verifyPassword(password, encoded) {
  const parts = String(encoded || '').split(':');
  const [scheme] = parts;
  if (scheme !== 'pbkdf2') return false;

  const hasIterationField = parts.length === 4;
  const iterations = hasIterationField ? Number(parts[1]) : PBKDF2_ITERATIONS;
  const saltHex = hasIterationField ? parts[2] : parts[1];
  const expectedHex = hasIterationField ? parts[3] : parts[2];

  if (!saltHex || !expectedHex || !Number.isFinite(iterations) || iterations > PBKDF2_ITERATIONS) return false;

  const key = await derivePasswordKey(password, hexToBytes(saltHex), iterations);
  return timingSafeEqual(bytesToHex(new Uint8Array(key)), expectedHex);
}

async function derivePasswordKey(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256
  );
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function sessionCookie(token) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 60 * 60}`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function json(body, status = 200, cookie) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8'
  };
  if (cookie) headers['Set-Cookie'] = cookie;
  return new Response(JSON.stringify(body), { status, headers });
}

function jsonError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/payload is too large|request body too large|body too large|too large|SQLITE_TOOBIG/i.test(message)) {
    return json({ error: 'Canvas is too large to save. Import fewer images or use smaller image exports.' }, 413);
  }
  if (/no such table: canvas_assets|no such table: canvas_asset_chunks/i.test(message)) {
    return json({ error: 'Canvas asset storage is not migrated yet. Run the canvas assets D1 migration, then try saving again.' }, 500);
  }
  if (/no such table: site_content/i.test(message)) {
    return json({ error: 'Site content storage is not migrated yet. Run the site content D1 migration, then try saving again.' }, 500);
  }
  if (/string or blob too big|database or disk is full|too many sql variables|D1_ERROR/i.test(message)) {
    return json({ error: `Canvas storage failed: ${message}` }, 400);
  }
  return json({ error: 'Unexpected server error' }, 500);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true'
  };
}

function parseCookies(cookieHeader) {
  return Object.fromEntries(
    String(cookieHeader || '')
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, value])
  );
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeSiteContentKey(value) {
  const key = String(value || '').trim();
  return /^[a-z0-9][a-z0-9._-]{1,120}$/i.test(key) ? key : '';
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 1000000) / 1000000;
}

function estimateDataUrlBytes(value) {
  return Math.ceil(String(value || '').length * 0.75);
}

function normalizeAvatarUrl(value) {
  const url = cleanText(value, 350000);
  if (!url) return '';

  if (/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(url) && url.length <= 350000) {
    return url;
  }

  if (/^data:image\/svg\+xml;utf8,/i.test(url) && url.length <= 50000) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.toString();
  } catch {
    return '';
  }

  return '';
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function bytesToHex(bytes) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}
