const SESSION_COOKIE = 'droplet_session';
const SESSION_DAYS = 30;
const MAX_JSON_BYTES = 8_000_000;
const PBKDF2_ITERATIONS = 100000;
const CANVAS_ASSET_CHUNK_CHARS = 64000;
const CANVAS_ASSET_REF_FLAG = '__dropletCanvasAsset';
const CONCIERGE_MODEL = '@cf/meta/llama-3.1-8b-instruct';
const MAX_CONCIERGE_ASSETS = 36;
const MAX_CONCIERGE_HISTORY = 8;
const GENERATION_PROVIDERS = {
  cloudflare_flux_klein: {
    label: 'Cloudflare FLUX.2 Klein',
    pipeline: 'image',
    defaultModel: '@cf/black-forest-labs/flux-2-klein-4b'
  },
  cloudflare_flux_klein_9b: {
    label: 'Cloudflare FLUX.2 Klein 9B',
    pipeline: 'image',
    defaultModel: '@cf/black-forest-labs/flux-2-klein-9b'
  },
  cloudflare_flux_schnell: {
    label: 'Cloudflare FLUX Schnell',
    pipeline: 'image',
    defaultModel: '@cf/black-forest-labs/flux-1-schnell'
  },
  cloudflare_sdxl: {
    label: 'Cloudflare SDXL',
    pipeline: 'image',
    defaultModel: '@cf/stabilityai/stable-diffusion-xl-base-1.0'
  },
  cloudflare_sdxl_lightning: {
    label: 'Cloudflare SDXL Lightning',
    pipeline: 'image',
    defaultModel: '@cf/bytedance/stable-diffusion-xl-lightning'
  },
  cloudflare_sd_img2img: {
    label: 'Cloudflare SD Img2Img',
    pipeline: 'image',
    defaultModel: '@cf/runwayml/stable-diffusion-v1-5-img2img'
  },
  cloudflare_video_storyboard: {
    label: 'Cloudflare Workers AI Video Concept',
    pipeline: 'video',
    defaultModel: 'workers-ai-free'
  },
  concierge_free_image: {
    label: 'Concierge Free Render',
    pipeline: 'image',
    defaultModel: 'workers-ai-free'
  },
  concierge_free_video: {
    label: 'Concierge Free Storyboard',
    pipeline: 'video',
    defaultModel: 'workers-ai-free'
  },
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
  },
  grok_image: {
    label: 'Grok Images',
    pipeline: 'image',
    defaultModel: 'grok-imagine-image-quality'
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
const DEFAULT_IMAGE_QUALITY = 'high';
const DEFAULT_VEO_SECONDS = 8;
const CLOUDFLARE_AI_USAGE_PROVIDERS = new Set([
  'cloudflare_flux_klein',
  'cloudflare_flux_klein_9b',
  'cloudflare_flux_schnell',
  'cloudflare_sdxl',
  'cloudflare_sdxl_lightning',
  'cloudflare_sd_img2img',
  'concierge_free_image',
  'concierge_free_video',
  'workers-ai',
  'deepseek-workers-ai'
]);
const DEEPSEEK_USAGE_PROVIDERS = new Set([
  'deepseek-free',
  'deepseek-workers-ai',
  'deepseek-openrouter-free'
]);
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

  if (request.method === 'POST' && path === '/ai/concierge') {
    return aiConciergeHandler(request, env, session.user);
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
    if (input.provider === 'cloudflare_flux_klein') {
      branch = await generateCloudflareFluxKlein(env, input);
    } else if (input.provider === 'cloudflare_flux_klein_9b') {
      branch = await generateCloudflareFluxKlein9b(env, input);
    } else if (input.provider === 'cloudflare_flux_schnell') {
      branch = await generateCloudflareFluxSchnell(env, input);
    } else if (input.provider === 'cloudflare_sdxl') {
      branch = await generateCloudflareSdxl(env, input);
    } else if (input.provider === 'cloudflare_sdxl_lightning') {
      branch = await generateCloudflareSdxlLightning(env, input);
    } else if (input.provider === 'cloudflare_sd_img2img') {
      branch = await generateCloudflareSdImg2Img(env, input);
    } else if (input.provider === 'cloudflare_video_storyboard' || input.provider === 'concierge_free_image' || input.provider === 'concierge_free_video') {
      branch = await generateConciergeFreeBranch(request, env, input);
    } else if (input.provider === 'openai_image') {
      branch = await generateOpenAiImage(env, input);
    } else if (input.provider === 'gemini_banana_pro') {
      branch = await generateGeminiImage(env, input);
    } else if (input.provider === 'google_veo') {
      branch = await generateGoogleVeo(env, input);
    } else if (input.provider === 'grok_image') {
      branch = await generateGrokImage(env, input);
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
    if (shouldUseFreeGenerationFallback(message, input)) {
      try {
        const fallbackInput = {
          ...input,
          provider: input.pipeline === 'video' ? 'concierge_free_video' : 'concierge_free_image'
        };
        const fallbackProvider = GENERATION_PROVIDERS[fallbackInput.provider];
        const branch = await generateConciergeFreeBranch(request, env, fallbackInput, message);
        const usage = estimateGenerationUsage(fallbackInput, branch, fallbackProvider);
        await recordGenerationUsage(env, userId, fallbackInput, branch, fallbackProvider, usage);
        return json({
          branch: {
            ...branch,
            provider: fallbackInput.provider,
            providerLabel: fallbackProvider.label,
            pipeline: fallbackProvider.pipeline,
            prompt: fallbackInput.prompt,
            refs: fallbackInput.refs,
            usage
          },
          usage,
          generatedAt: new Date().toISOString()
        }, 201);
      } catch (fallbackError) {
        console.warn('Free generation fallback failed', fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
      }
    }
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

  const providerRows = (byProvider.results || []).map((row) => ({
    provider: row.provider,
    providerLabel: row.provider_label,
    pipeline: row.pipeline,
    requestCount: Number(row.request_count || 0),
    estimatedUsd: roundMoney(row.estimated_usd || 0)
  }));

  return json({
    currency: 'USD',
    summary: {
      requestCount: Number(totals?.request_count || 0),
      estimatedUsd: roundMoney(totals?.estimated_usd || 0),
      imageCount: Number(totals?.image_count || 0),
      videoCount: Number(totals?.video_count || 0)
    },
    budgets: buildUsageBudgets(env, providerRows),
    byProvider: providerRows,
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

function buildUsageBudgets(env, providerRows) {
  const cloudflare = summarizeUsageBucket(providerRows, (row) => CLOUDFLARE_AI_USAGE_PROVIDERS.has(row.provider));
  const deepseek = summarizeUsageBucket(providerRows, (row) => DEEPSEEK_USAGE_PROVIDERS.has(row.provider));
  return {
    cloudflareWorkersAi: usageBudgetRow({
      id: 'cloudflare-workers-ai',
      label: 'Cloudworker AI Free',
      usage: cloudflare,
      budgetUsd: monthlyBudgetUsd(env, 'CLOUDFLARE_WORKERS_AI_MONTHLY_BUDGET_USD', 0),
      requestLimit: monthlyRequestLimit(env, 'CLOUDFLARE_WORKERS_AI_MONTHLY_REQUEST_LIMIT', 0)
    }),
    deepseek: usageBudgetRow({
      id: 'deepseek',
      label: 'DeepSeek',
      usage: deepseek,
      budgetUsd: monthlyBudgetUsd(env, 'DEEPSEEK_MONTHLY_BUDGET_USD', 0),
      requestLimit: monthlyRequestLimit(env, 'DEEPSEEK_MONTHLY_REQUEST_LIMIT', 1000)
    })
  };
}

function summarizeUsageBucket(providerRows, predicate) {
  return providerRows
    .filter(predicate)
    .reduce((usage, row) => ({
      requestCount: usage.requestCount + Number(row.requestCount || 0),
      estimatedUsd: roundMoney(usage.estimatedUsd + Number(row.estimatedUsd || 0))
    }), { requestCount: 0, estimatedUsd: 0 });
}

function usageBudgetRow({ id, label, usage, budgetUsd, requestLimit }) {
  const spendMode = budgetUsd > 0;
  const requestMode = !spendMode && requestLimit > 0;
  const ratio = spendMode
    ? usage.estimatedUsd / budgetUsd
    : requestMode
      ? usage.requestCount / requestLimit
      : null;
  return {
    id,
    label,
    mode: spendMode ? 'spend' : requestMode ? 'requests' : 'tracked',
    usedUsd: roundMoney(usage.estimatedUsd),
    budgetUsd: roundMoney(budgetUsd),
    remainingUsd: spendMode ? roundMoney(Math.max(0, budgetUsd - usage.estimatedUsd)) : null,
    requestCount: usage.requestCount,
    requestLimit,
    remainingRequests: requestMode ? Math.max(0, requestLimit - usage.requestCount) : null,
    ratio: Number.isFinite(ratio) ? ratio : null
  };
}

function monthlyBudgetUsd(env, key, fallback) {
  const value = Number(env?.[key]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function monthlyRequestLimit(env, key, fallback) {
  const value = Number(env?.[key]);
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : fallback;
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

async function generateConciergeFreeBranch(request, env, input, fallbackReason = '') {
  const isVideo = input.pipeline === 'video';
  const provider = GENERATION_PROVIDERS[input.provider] || GENERATION_PROVIDERS.concierge_free_image;
  const modelResult = await generateConciergeFreeCreativeBrief(request, env, input, fallbackReason);
  const title = modelResult.title || `${isVideo ? 'Storyboard' : 'Image'} Concept`;
  const description = modelResult.description || [
    input.prompt,
    fallbackReason ? `Paid-provider fallback: ${fallbackReason}` : '',
    'Free concierge render: generated as an editable SVG concept from current canvas context.'
  ].filter(Boolean).join('\n\n');
  const imageDataUrl = makeFreeConciergeSvg({
    title,
    subtitle: modelResult.subtitle || provider.label,
    prompt: input.prompt,
    description,
    isVideo,
    colors: brandColorsPrioritizedForPrompt(input),
    parentTitle: input.parent?.title || '',
    model: modelResult.model || provider.defaultModel
  });

  return {
    title,
    subtitle: modelResult.subtitle || `${provider.label} concept`,
    description,
    imageDataUrl,
    model: modelResult.model || provider.defaultModel,
    status: 'ready',
    freeFallback: true,
    operationName: ''
  };
}

async function generateConciergeFreeCreativeBrief(request, env, input, fallbackReason = '') {
  const systemPrompt = [
    'You are Droplet Concierge, creating concise metadata for an editable brand asset card.',
    'Return only JSON with keys title, subtitle, description.',
    'Keep title under 54 characters. Keep subtitle under 70 characters.',
    'Description should be a practical visual brief for a designer or image model.',
    'Do not mention travel unless the prompt asks for travel creative.'
  ].join('\n');
  const brandNodes = Array.isArray(input.brandGuide?.nodes) ? input.brandGuide.nodes : [];
  const userPrompt = [
    `Prompt: ${input.prompt}`,
    input.parent?.title ? `Selected source asset: ${input.parent.title}` : '',
    input.parent?.description ? `Source description: ${input.parent.description}` : '',
    brandNodes.length > 0 ? `Brand context:\n${brandNodes.map((node) => `- ${node.title || node.brandName || 'Brand guide'}: ${node.description || node.subtitle || ''}`).join('\n')}` : '',
    fallbackReason ? `Paid provider failed with: ${fallbackReason}` : ''
  ].filter(Boolean).join('\n\n');
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  const workersModels = [
    '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
    '@cf/meta/llama-3.3-70b-instruct',
    '@cf/meta/llama-3.1-8b-instruct'
  ];

  if (env.AI) {
    for (const model of workersModels) {
      try {
        const payload = await env.AI.run(model, { messages, max_tokens: 900 }).catch(() => null);
        const text = extractConciergeText(payload).replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        const parsed = parseConciergeBriefJson(text);
        if (parsed) return { ...parsed, model };
      } catch (error) {
        console.warn('Free Workers AI generation brief failed', model, error instanceof Error ? error.message : String(error));
      }
    }
  }

  const openRouterKey = providerKey(request, env, 'X-OpenRouter-Key', ['OPENROUTER_CONCIERGE_API_KEY', 'OPENROUTER_API_KEY']);
  if (openRouterKey) {
    const model = cleanText(env.OPENROUTER_FREE_GENERATION_MODEL, 160) || 'deepseek/deepseek-r1:free';
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://droplet.local',
          'X-Title': 'Droplet Concierge'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.35,
          max_tokens: 700
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        const parsed = parseConciergeBriefJson(payload?.choices?.[0]?.message?.content || '');
        if (parsed) return { ...parsed, model };
      }
    } catch (error) {
      console.warn('Free OpenRouter generation brief failed', error instanceof Error ? error.message : String(error));
    }
  }

  const groqKey = providerKey(request, env, 'X-Groq-Key', ['GROQ_CONCIERGE_API_KEY', 'GROQ_API_KEY']);
  if (groqKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: cleanText(env.GROQ_GENERATION_BRIEF_MODEL, 160) || 'openai/gpt-oss-20b',
          messages,
          temperature: 0.35,
          max_tokens: 700
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        const parsed = parseConciergeBriefJson(payload?.choices?.[0]?.message?.content || '');
        if (parsed) return { ...parsed, model: cleanText(env.GROQ_GENERATION_BRIEF_MODEL, 160) || 'openai/gpt-oss-20b' };
      }
    } catch (error) {
      console.warn('Free Groq generation brief failed', error instanceof Error ? error.message : String(error));
    }
  }

  const grokKey = providerKey(request, env, 'X-Grok-Key', ['GROK_CONCIERGE_API_KEY', 'GROK_API_KEY', 'XAI_CONCIERGE_API_KEY', 'XAI_API_KEY']);
  if (grokKey) {
    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${grokKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: cleanText(env.GROK_CONCIERGE_MODEL, 160) || 'grok-2-latest',
          messages,
          temperature: 0.35,
          max_tokens: 700
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        const parsed = parseConciergeBriefJson(payload?.choices?.[0]?.message?.content || '');
        if (parsed) return { ...parsed, model: cleanText(env.GROK_CONCIERGE_MODEL, 160) || 'grok-2-latest' };
      }
    } catch (error) {
      console.warn('Grok generation brief failed', error instanceof Error ? error.message : String(error));
    }
  }

  const geminiKey = providerKey(request, env, 'X-Gemini-Key', ['GEMINI_CONCIERGE_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_AI_API_KEY']);
  if (geminiKey) {
    const model = cleanText(env.GEMINI_GENERATION_BRIEF_MODEL || env.GEMINI_CONCIERGE_MODEL, 160) || 'gemini-2.5-flash';
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: {
          'x-goog-api-key': geminiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [{
            role: 'user',
            parts: [{ text: userPrompt }]
          }],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 700
          }
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        const parsed = parseConciergeBriefJson((payload?.candidates?.[0]?.content?.parts || []).map((part) => part.text || '').join('\n'));
        if (parsed) return { ...parsed, model };
      }
    } catch (error) {
      console.warn('Gemini generation brief failed', error instanceof Error ? error.message : String(error));
    }
  }

  const claudeKey = providerKey(request, env, 'X-Anthropic-Key', ['ANTHROPIC_CONCIERGE_API_KEY', 'ANTHROPIC_API_KEY', 'CLAUDE_CONCIERGE_API_KEY', 'CLAUDE_API_KEY']);
  if (claudeKey) {
    const model = cleanText(env.CLAUDE_GENERATION_BRIEF_MODEL || env.CLAUDE_CONCIERGE_MODEL || env.ANTHROPIC_CONCIERGE_MODEL, 160) || 'claude-sonnet-4-20250514';
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': claudeKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          temperature: 0.35,
          max_tokens: 700,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }]
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        const parsed = parseConciergeBriefJson((payload?.content || []).map((part) => part?.text || '').join('\n'));
        if (parsed) return { ...parsed, model };
      }
    } catch (error) {
      console.warn('Claude generation brief failed', error instanceof Error ? error.message : String(error));
    }
  }

  return freeConciergeBriefFallback(input);
}

function parseConciergeBriefJson(value) {
  const text = String(value || '').replace(/```(?:json)?|```/gi, '').trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return {
      title: cleanText(parsed.title, 80),
      subtitle: cleanText(parsed.subtitle, 100),
      description: cleanText(parsed.description, 1600)
    };
  } catch {
    return null;
  }
}

function freeConciergeBriefFallback(input) {
  const parentTitle = cleanText(input.parent?.title, 80);
  const action = parentTitle ? `Edited ${parentTitle}` : 'Concierge Concept';
  return {
    title: action,
    subtitle: input.pipeline === 'video' ? 'Free storyboard asset' : 'Free SVG concept asset',
    description: [
      `Creative prompt: ${input.prompt}`,
      parentTitle ? `Source asset: ${parentTitle}` : '',
      'Use this as a zero-credit concept card, then upgrade to a paid image/video provider only when the direction is approved.'
    ].filter(Boolean).join('\n')
  };
}

function makeFreeConciergeSvg({ title, subtitle, prompt, description, isVideo, colors, parentTitle, model }) {
  const palette = colors.length > 0 ? colors : [
    { name: 'Droplet Blue', hex: '#4B5EFA' },
    { name: 'Signal Cyan', hex: '#00FFCC' },
    { name: 'Warm Accent', hex: '#FF6A00' }
  ];
  const primary = normalizeHexColor(palette[0]?.hex) || '#4B5EFA';
  const secondary = normalizeHexColor(palette[1]?.hex) || '#00FFCC';
  const accent = normalizeHexColor(palette[2]?.hex) || '#FF6A00';
  const safeTitle = escapeSvg(title || 'Concierge Concept');
  const safeSubtitle = escapeSvg(subtitle || model || 'Free render');
  const safePrompt = escapeSvg(prompt || '').slice(0, 260);
  const safeDescription = escapeSvg(description || '').slice(0, 340);
  const safeParent = escapeSvg(parentTitle || 'Canvas context');
  const iconPath = isVideo ? 'M315 175 L385 215 L315 255 Z' : 'M350 150 L369 196 L419 197 L379 227 L393 275 L350 247 L307 275 L321 227 L281 197 L331 196 Z';
  const swatches = palette.slice(0, 5).map((color, index) => {
    const hex = normalizeHexColor(color.hex) || primary;
    return `<circle cx="${72 + index * 34}" cy="344" r="12" fill="${hex}" stroke="rgba(255,255,255,.72)" stroke-width="1"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#05070C"/>
        <stop offset=".52" stop-color="${primary}" stop-opacity=".42"/>
        <stop offset="1" stop-color="${secondary}" stop-opacity=".34"/>
      </linearGradient>
      <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="rgba(255,255,255,.18)"/>
        <stop offset="1" stop-color="rgba(255,255,255,.05)"/>
      </linearGradient>
      <filter id="shadow"><feDropShadow dx="0" dy="24" stdDeviation="20" flood-color="#000" flood-opacity=".38"/></filter>
    </defs>
    <rect width="1024" height="1024" rx="54" fill="url(#bg)"/>
    <path d="M88 202 C238 54 404 120 528 228 C650 334 792 288 936 140 L936 936 L88 936 Z" fill="rgba(0,0,0,.22)"/>
    <rect x="72" y="78" width="880" height="868" rx="42" fill="rgba(5,7,12,.58)" stroke="rgba(255,255,255,.18)" filter="url(#shadow)"/>
    <rect x="112" y="118" width="800" height="450" rx="34" fill="url(#panel)" stroke="rgba(255,255,255,.18)"/>
    <circle cx="350" cy="215" r="112" fill="${accent}" fill-opacity=".2" stroke="${accent}" stroke-opacity=".7" stroke-width="3"/>
    <path d="${iconPath}" fill="white" opacity=".92"/>
    <text x="488" y="180" font-family="Inter, Arial, sans-serif" font-size="31" font-weight="800" fill="white">${safeSubtitle}</text>
    <text x="488" y="228" font-family="Inter, Arial, sans-serif" font-size="21" font-weight="600" fill="rgba(255,255,255,.68)">${escapeSvg(model || 'free')}</text>
    <text x="488" y="296" font-family="Inter, Arial, sans-serif" font-size="25" font-weight="750" fill="rgba(255,255,255,.88)">Source</text>
    <text x="488" y="334" font-family="Inter, Arial, sans-serif" font-size="21" fill="rgba(255,255,255,.64)">${safeParent}</text>
    ${swatches}
    <text x="112" y="656" font-family="Inter, Arial, sans-serif" font-size="46" font-weight="900" fill="white">${safeTitle}</text>
    <foreignObject x="112" y="704" width="800" height="112">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font: 25px/1.35 Inter, Arial, sans-serif; color: rgba(255,255,255,.78);">${safePrompt}</div>
    </foreignObject>
    <foreignObject x="112" y="835" width="800" height="84">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font: 18px/1.35 Inter, Arial, sans-serif; color: rgba(255,255,255,.52);">${safeDescription}</div>
    </foreignObject>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeSvg(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function shouldUseFreeGenerationFallback(message, input) {
  if (!input || input.provider === 'concierge_free_image' || input.provider === 'concierge_free_video') return false;
  return /credit|quota|billing|insufficient_quota|rate limit|429|payment|required|exhausted|balance|not configured|binding/i.test(String(message || ''));
}

async function generateCloudflareFluxKlein(env, input) {
  if (!env.AI) throw new Error('Workers AI binding AI is not configured');
  const model = cleanText(env.CLOUDFLARE_FLUX_KLEIN_MODEL, 160) || GENERATION_PROVIDERS.cloudflare_flux_klein.defaultModel;
  return generateCloudflareFluxMultipart(env, input, model, {
    titleWithRefs: 'FLUX Reference Image Branch',
    title: 'FLUX Image Branch'
  });
}

async function generateCloudflareFluxKlein9b(env, input) {
  if (!env.AI) throw new Error('Workers AI binding AI is not configured');
  const model = cleanText(env.CLOUDFLARE_FLUX_KLEIN_9B_MODEL, 160) || GENERATION_PROVIDERS.cloudflare_flux_klein_9b.defaultModel;
  return generateCloudflareFluxMultipart(env, input, model, {
    titleWithRefs: 'FLUX 9B Reference Image Branch',
    title: 'FLUX 9B Image Branch'
  });
}

async function generateCloudflareFluxMultipart(env, input, model, titles) {
  const prompt = buildCloudflareImagePrompt(input);
  const form = new FormData();
  form.append('prompt', prompt);
  form.append('width', String(cloudflareImageDimension(input.size, 'width')));
  form.append('height', String(cloudflareImageDimension(input.size, 'height')));
  form.append('guidance', String(cloudflareGuidance(input.quality)));

  const referenceUrls = cloudflareReferenceUrls(input);
  let referenceCount = 0;
  for (const url of referenceUrls) {
    if (referenceCount >= 4) break;
    const blob = await referenceUrlToBlob(url);
    if (!blob) continue;
    form.append(`input_image_${referenceCount}`, blob, `reference-${referenceCount}.${blobExtension(blob.type)}`);
    referenceCount += 1;
  }

  const formResponse = new Response(form);
  const payload = await env.AI.run(model, {
    multipart: {
      body: formResponse.body,
      contentType: formResponse.headers.get('content-type')
    }
  });
  const imageBase64 = extractCloudflareImageBase64(payload);
  if (!imageBase64) throw new Error('Cloudflare FLUX did not return image data');

  return {
    title: referenceCount > 0 ? titles.titleWithRefs : titles.title,
    subtitle: `Generated with ${model}`,
    description: input.prompt,
    imageDataUrl: `data:image/jpeg;base64,${imageBase64}`,
    model,
    status: 'ready'
  };
}

async function generateCloudflareFluxSchnell(env, input) {
  if (!env.AI) throw new Error('Workers AI binding AI is not configured');
  const model = cleanText(env.CLOUDFLARE_FLUX_SCHNELL_MODEL, 160) || GENERATION_PROVIDERS.cloudflare_flux_schnell.defaultModel;
  const payload = await env.AI.run(model, {
    prompt: buildCloudflareImagePrompt(input),
    num_steps: Math.max(cloudflareFluxSteps(input.quality), 8),
    width: cloudflareImageDimension(input.size, 'width'),
    height: cloudflareImageDimension(input.size, 'height'),
    seed: Math.floor(Math.random() * 1000000000)
  });
  const imageBase64 = extractCloudflareImageBase64(payload);
  if (!imageBase64) throw new Error('Cloudflare FLUX did not return image data');

  return {
    title: 'FLUX Schnell Image Branch',
    subtitle: `Generated with ${model}`,
    description: input.prompt,
    imageDataUrl: `data:image/jpeg;base64,${imageBase64}`,
    model,
    status: 'ready'
  };
}

async function generateCloudflareSdxl(env, input) {
  if (!env.AI) throw new Error('Workers AI binding AI is not configured');
  const model = cleanText(env.CLOUDFLARE_SDXL_MODEL, 160) || GENERATION_PROVIDERS.cloudflare_sdxl.defaultModel;
  const payload = await env.AI.run(model, {
    prompt: buildCloudflareImagePrompt(input),
    width: cloudflareImageDimension(input.size, 'width'),
    height: cloudflareImageDimension(input.size, 'height'),
    guidance: cloudflareGuidance(input.quality),
    num_steps: cloudflareFluxSteps(input.quality) + 8,
    seed: Math.floor(Math.random() * 1000000000)
  });
  const imageDataUrl = await cloudflareImagePayloadDataUrl(payload);

  return {
    title: 'SDXL Image Branch',
    subtitle: `Generated with ${model}`,
    description: input.prompt,
    imageDataUrl,
    model,
    status: 'ready'
  };
}

async function generateCloudflareSdxlLightning(env, input) {
  if (!env.AI) throw new Error('Workers AI binding AI is not configured');
  const model = cleanText(env.CLOUDFLARE_SDXL_LIGHTNING_MODEL, 160) || GENERATION_PROVIDERS.cloudflare_sdxl_lightning.defaultModel;
  const payload = await env.AI.run(model, {
    prompt: buildCloudflareImagePrompt(input),
    width: cloudflareImageDimension(input.size, 'width'),
    height: cloudflareImageDimension(input.size, 'height'),
    seed: Math.floor(Math.random() * 1000000000)
  });
  const imageDataUrl = await cloudflareImagePayloadDataUrl(payload);

  return {
    title: 'SDXL Lightning Branch',
    subtitle: `Generated with ${model}`,
    description: input.prompt,
    imageDataUrl,
    model,
    status: 'ready'
  };
}

async function generateCloudflareSdImg2Img(env, input) {
  if (!env.AI) throw new Error('Workers AI binding AI is not configured');
  const model = cleanText(env.CLOUDFLARE_SD_IMG2IMG_MODEL, 160) || GENERATION_PROVIDERS.cloudflare_sd_img2img.defaultModel;
  const reference = await firstReferenceImageBase64(input);
  if (!reference) throw new Error('Cloudflare SD Img2Img requires a source image or uploaded reference');
  const payload = await env.AI.run(model, {
    prompt: buildCloudflareImagePrompt(input),
    image_b64: reference,
    width: cloudflareImageDimension(input.size, 'width'),
    height: cloudflareImageDimension(input.size, 'height'),
    num_steps: 20,
    strength: input.quality === 'low' ? 0.48 : input.quality === 'high' ? 0.78 : 0.62,
    guidance: cloudflareGuidance(input.quality) + 2,
    seed: Math.floor(Math.random() * 1000000000)
  });
  const imageDataUrl = await cloudflareImagePayloadDataUrl(payload);

  return {
    title: 'SD Img2Img Branch',
    subtitle: `Generated with ${model}`,
    description: input.prompt,
    imageDataUrl,
    model,
    status: 'ready'
  };
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

async function generateGrokImage(env, input) {
  const apiKey = String(env.XAI_API_KEY || env.GROK_API_KEY || '');
  const model = String(env.GROK_IMAGE_MODEL || GENERATION_PROVIDERS.grok_image.defaultModel);
  if (!apiKey) return mockGenerationBranch(input, model, 'XAI_API_KEY is not configured');

  const response = await fetch('https://api.x.ai/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      prompt: withReferenceContext(input),
      n: 1,
      response_format: 'url'
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(providerError(payload, response.status));

  const imageUrl = payload?.data?.[0]?.url || payload?.url || '';
  if (!imageUrl) throw new Error('Grok did not return image data');

  return {
    title: 'Grok Image Branch',
    subtitle: `Generated with ${model}`,
    description: input.prompt,
    imageUrl,
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
      colors: normalizeBrandColors(node.colors),
      labelGroupId: cleanText(node.labelGroupId, 160),
      labelTitle: cleanText(node.labelTitle, 180)
    }))
  };
}

function estimateGenerationUsage(input, branch, provider) {
  const model = branch.model || GENERATION_PROVIDERS[input.provider]?.defaultModel || '';
  if (input.provider === 'cloudflare_flux_klein') {
    const outputTiles = cloudflareTileCount(input.size);
    const referenceTiles = Math.min(4, input.refs.length + (input.parent?.image ? 1 : 0));
    const estimatedUsd = roundMoney((outputTiles * 0.000287) + (referenceTiles * 0.000059));
    return {
      provider: input.provider,
      providerLabel: provider.label,
      pipeline: provider.pipeline,
      model,
      estimatedUsd,
      currency: 'USD',
      status: 'estimated',
      outputCount: 1,
      size: input.size,
      quality: input.quality,
      estimateBasis: 'Cloudflare Workers AI FLUX.2 Klein estimate using 512px output tiles plus reference image tiles; may be covered by Workers AI free allocation.'
    };
  }
  if (input.provider === 'cloudflare_flux_schnell') {
    const outputTiles = cloudflareTileCount(input.size);
    const steps = cloudflareFluxSteps(input.quality);
    const estimatedUsd = roundMoney((outputTiles * 0.0000528) + (steps * 0.0001056));
    return {
      provider: input.provider,
      providerLabel: provider.label,
      pipeline: provider.pipeline,
      model,
      estimatedUsd,
      currency: 'USD',
      status: 'estimated',
      outputCount: 1,
      size: input.size,
      quality: input.quality,
      estimateBasis: 'Cloudflare Workers AI FLUX.1 Schnell estimate using 512px tiles and diffusion steps; may be covered by Workers AI free allocation.'
    };
  }
  if ([
    'cloudflare_flux_klein_9b',
    'cloudflare_sdxl',
    'cloudflare_sdxl_lightning',
    'cloudflare_sd_img2img'
  ].includes(input.provider)) {
    return {
      provider: input.provider,
      providerLabel: provider.label,
      pipeline: provider.pipeline,
      model,
      estimatedUsd: 0,
      currency: 'USD',
      status: 'free-allocation',
      outputCount: 1,
      size: input.size,
      quality: input.quality,
      estimateBasis: 'Cloudflare Workers AI image call tracked under free-allocation mode; no per-model dollar estimate is configured in Droplet for this renderer.'
    };
  }
  if (input.provider === 'concierge_free_image' || input.provider === 'concierge_free_video') {
    return {
      provider: input.provider,
      providerLabel: provider.label,
      pipeline: provider.pipeline,
      model,
      estimatedUsd: 0,
      currency: 'USD',
      status: 'free',
      outputCount: 1,
      size: input.size,
      quality: input.quality,
      estimateBasis: 'Free concierge branch using Workers AI/OpenRouter/Groq text metadata and a generated SVG concept asset; no paid image/video API call.'
    };
  }
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

  if (input.provider === 'grok_image') {
    return {
      provider: input.provider,
      providerLabel: provider.label,
      pipeline: provider.pipeline,
      model,
      estimatedUsd: 0,
      currency: 'USD',
      status: 'key-backed',
      outputCount: 1,
      size: input.size,
      quality: input.quality,
      estimateBasis: 'Grok image call uses xAI API key billing/credits; no dollar estimate is configured in Droplet.'
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
  const prompt = withReferenceContext(input);
  if (input.refs.length === 0) return prompt;
  return [
    ...input.refs.map((uri) => ({ type: 'image', uri, mime_type: inferImageMimeType(uri) })),
    { type: 'text', text: prompt }
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

function brandColorsPrioritizedForPrompt(input) {
  const brandColors = extractBrandColors(input);
  const mappedColors = mapPromptColorsToBrand(input);
  if (mappedColors.length === 0) return brandColors;

  const mappedKeys = new Set(mappedColors.map((color) => color.hex || color.name?.toLowerCase()).filter(Boolean));
  const rest = brandColors.filter((color) => !mappedKeys.has(color.hex || color.name?.toLowerCase()));
  return [...mappedColors.map((color) => ({ name: color.name, hex: color.hex })), ...rest];
}

function colorLabel(color) {
  return [color?.name, color?.hex].filter(Boolean).join(' ').trim();
}

function colorAliasesForRequestedColor(requested) {
  return (COLOR_WORD_ALIASES[requested] || [requested]).join(', ');
}

function brandColorLockSection(input) {
  const requestedColors = detectRequestedColorWords(input.prompt);
  if (requestedColors.length === 0) return '';

  const brandColors = extractBrandColors(input);
  const colorMappings = mapPromptColorsToBrand(input);
  if (brandColors.length === 0) {
    return [
      'Strict brand color lock:',
      `The prompt mentions color words: ${requestedColors.join(', ')}.`,
      'No structured brand palette was included in this request, so do not invent generic color values.',
      'Use only the closest matching swatch visible in the connected brand guide reference image. If the exact swatch cannot be confidently identified, preserve the existing asset color instead of guessing.'
    ].join('\n');
  }

  return [
    'Strict brand color lock:',
    'Resolve user color words to the brand palette before rendering. These substitutions are authoritative:',
    ...colorMappings.map((color) => `- ${colorAliasesForRequestedColor(color.requested)} => ${colorLabel(color)} only.`),
    'Do not use generic color interpretations, provider defaults, or nearby non-brand colors.'
  ].join('\n');
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
  const brandColors = brandColorsPrioritizedForPrompt(input);
  if (brandColors.length === 0) {
    return 'Brand color rule: If the user asks for any color, resolve it against the visible branding guide image and brand rules instead of inventing a generic color.';
  }

  const palette = brandColors
    .map((color, index) => `${index + 1}. ${[color.name, color.hex].filter(Boolean).join(' ')}`)
    .join('\n');
  return `Brand color rule: Match all prompt color requests to the brand palette below. Use exact hex values when available; do not substitute generic colors.\nBrand palette:\n${palette}`;
}

function withReferenceContext(input) {
  const guideNodes = Array.isArray(input.brandGuide?.nodes) ? input.brandGuide.nodes : [];
  const guideContext = guideNodes
    .filter((node) => node.title || node.description || node.brandName)
    .map((node, index) => [
      `${index + 1}. ${node.title || node.brandName || 'Brand guide'}`,
      node.labelTitle ? `Connected group: ${node.labelTitle}` : '',
      node.subtitle ? `Role: ${node.subtitle}` : '',
      node.description ? `Rules: ${node.description}` : ''
    ].filter(Boolean).join('\n'))
    .join('\n\n');

  const sections = [input.prompt];
  if (guideContext) {
    sections.push(`Brand source of truth. Treat the connected brand guide as mandatory governance for all color, typography, logos, spacing, layout, product styling, image treatment, copy tone, and visual hierarchy decisions. Do not invent alternate logo marks, substitute off-brand fonts, or use generic colors when brand colors/rules are present:\n${guideContext}`);
  }
  sections.push(brandColorPromptSection(input));
  const colorLock = brandColorLockSection(input);
  if (colorLock) sections.push(colorLock);
  if (input.refs.length > 0) {
    sections.push(`Reference image URLs:\n${input.refs.map((ref, index) => `${index + 1}. ${ref}`).join('\n')}`);
  }

  return sections.join('\n\n');
}

function buildCloudflareImagePrompt(input) {
  return cleanText([
    withReferenceContext(input),
    'Output a polished, production-ready brand/campaign image. Preserve the source brand identity, keep typography intentional, and avoid distorted logos or unreadable text.'
  ].join('\n\n'), 2048);
}

function cloudflareReferenceUrls(input) {
  const guideImages = Array.isArray(input.brandGuide?.nodes)
    ? input.brandGuide.nodes.map((node) => node.image).filter(Boolean)
    : [];
  return Array.from(new Set([
    input.parent?.image,
    ...input.refs,
    ...guideImages
  ].filter(Boolean))).slice(0, 4);
}

function cloudflareImageDimensions(size) {
  const match = String(size || DEFAULT_IMAGE_SIZE).match(/^(\d+)x(\d+)$/);
  const width = match ? Number(match[1]) : 1024;
  const height = match ? Number(match[2]) : 1024;
  return {
    width: Math.min(1920, Math.max(256, width)),
    height: Math.min(1920, Math.max(256, height))
  };
}

function cloudflareImageDimension(size, axis) {
  return cloudflareImageDimensions(size)[axis] || 1024;
}

function cloudflareTileCount(size) {
  const { width, height } = cloudflareImageDimensions(size);
  return Math.ceil(width / 512) * Math.ceil(height / 512);
}

function cloudflareFluxSteps(quality) {
  if (quality === 'low') return 6;
  if (quality === 'medium') return 10;
  return 12;
}

function cloudflareGuidance(quality) {
  if (quality === 'low') return 4.0;
  if (quality === 'medium') return 5.5;
  return 7.0;
}

async function referenceUrlToBlob(url) {
  const value = cleanText(url, 2000000);
  const dataMatch = value.match(/^data:(image\/(?:png|jpe?g|webp|gif));base64,([a-z0-9+/=]+)$/i);
  if (dataMatch) {
    const bytes = Uint8Array.from(atob(dataMatch[2]), (char) => char.charCodeAt(0));
    return new Blob([bytes], { type: dataMatch[1].toLowerCase() });
  }

  if (!/^https?:\/\//i.test(value)) return null;
  const response = await fetch(value);
  if (!response.ok) return null;
  const contentType = response.headers.get('content-type') || inferImageMimeType(value);
  if (!/^image\/(png|jpe?g|webp|gif)/i.test(contentType)) return null;
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > 2000000) return null;
  return new Blob([buffer], { type: contentType });
}

function blobExtension(mimeType) {
  if (/webp/i.test(mimeType)) return 'webp';
  if (/gif/i.test(mimeType)) return 'gif';
  if (/jpe?g/i.test(mimeType)) return 'jpg';
  return 'png';
}

function extractCloudflareImageBase64(payload) {
  if (typeof payload?.image === 'string') return payload.image;
  if (typeof payload?.result?.image === 'string') return payload.result.image;
  if (typeof payload?.data?.image === 'string') return payload.data.image;
  if (Array.isArray(payload?.images) && typeof payload.images[0] === 'string') return payload.images[0];
  return '';
}

async function cloudflareImagePayloadDataUrl(payload, fallbackMime = 'image/png') {
  const imageBase64 = extractCloudflareImageBase64(payload);
  if (imageBase64) return `data:${fallbackMime};base64,${imageBase64}`;
  if (payload instanceof Response) {
    const contentType = payload.headers.get('content-type') || fallbackMime;
    return `data:${contentType};base64,${arrayBufferToBase64(await payload.arrayBuffer())}`;
  }
  if (payload instanceof ReadableStream || payload instanceof ArrayBuffer || ArrayBuffer.isView(payload) || payload instanceof Blob) {
    const response = new Response(payload);
    const contentType = response.headers.get('content-type') || fallbackMime;
    return `data:${contentType};base64,${arrayBufferToBase64(await response.arrayBuffer())}`;
  }
  throw new Error('Cloudflare image model did not return image data');
}

async function firstReferenceImageBase64(input) {
  const url = cloudflareReferenceUrls(input)[0];
  if (!url) return '';
  const blob = await referenceUrlToBlob(url);
  if (!blob) return '';
  return arrayBufferToBase64(await blob.arrayBuffer());
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function normalizeUrlList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeReferenceUrl).filter(Boolean).slice(0, 3);
}

function normalizeReferenceUrl(value) {
  const raw = String(value || '').trim();
  if (/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(raw) && raw.length <= 750000) {
    return raw;
  }

  const url = cleanText(raw, 2000);
  if (!url) return '';

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

async function aiConciergeHandler(request, env, user) {
  const body = await readJson(request);
  const input = normalizeDropletConciergePayload(body, user);
  if (!input.prompt) return json({ error: 'Prompt is required' }, 400);

  const systemPrompt = buildDropletConciergeSystemPrompt(input);
  const userPrompt = buildDropletConciergeUserPrompt(input);
  const providerResult = await runDropletConciergeProvider(request, env, input, systemPrompt, userPrompt);
  const actions = await planDropletConciergeActions(env, input);

  if (providerResult) {
    await recordConciergeUsage(env, user?.id, input, providerResult, systemPrompt, userPrompt);
    return json({
      success: true,
      answer: providerResult.answer,
      aiModel: providerResult.aiModel,
      actions,
      recommendations: providerResult.recommendations || dropletConciergeRecommendations(input)
    });
  }

  return json({
    success: true,
    answer: dropletConciergeFallback(input),
    aiModel: 'droplet-concierge-fallback',
    actions,
    recommendations: dropletConciergeRecommendations(input)
  });
}

function normalizeDropletConciergePayload(body, user) {
  const provider = normalizeConciergeProvider(body.provider);
  const project = body.project && typeof body.project === 'object' ? body.project : {};
  const context = body.context && typeof body.context === 'object' ? body.context : {};

  return {
    prompt: cleanText(body.prompt, 4000),
    provider,
    project: {
      id: cleanText(project.id, 120) || 'droplet',
      name: cleanText(project.name, 160) || 'Droplet',
      canvasName: cleanText(project.canvasName, 160) || cleanText(context.canvasName, 160) || 'Fluid Node Canvas',
      userRole: cleanText(project.userRole || user?.role, 80) || 'user'
    },
    context: {
      canvasName: cleanText(context.canvasName || project.canvasName, 160) || 'Fluid Node Canvas',
      assetSummary: normalizeConciergeSummary(context.assetSummary),
      groups: normalizeConciergeGroups(context.groups),
      assets: normalizeConciergeArray(context.assets, normalizeConciergeAsset, MAX_CONCIERGE_ASSETS),
      brandGuides: normalizeConciergeArray(context.brandGuides, normalizeConciergeAsset, 8),
      generatedMedia: normalizeConciergeArray(context.generatedMedia, normalizeConciergeAsset, 12),
      siteContent: normalizeConciergeArray(context.siteContent, normalizeConciergeContentBlock, 24),
      pipelines: normalizeTextArray(context.pipelines, 12, 120),
      history: normalizeConciergeArray(context.history, normalizeConciergeHistoryItem, MAX_CONCIERGE_HISTORY)
    }
  };
}

function normalizeConciergeProvider(value) {
  const provider = cleanText(value, 80).toLowerCase();
  const aliases = {
    '': 'auto',
    cloudflare: 'workers-ai',
    'cloudflare-ai': 'workers-ai',
    'openai-chat': 'openai',
    gemini: 'gemini',
    google: 'gemini',
    anthropic: 'claude',
    xai: 'grok',
    'x-ai': 'grok',
    deepseek: 'deepseek-free',
    openrouter: 'openrouter-free',
    groq: 'groq-free'
  };
  const normalized = aliases[provider] || provider || 'auto';
  return [
    'auto',
    'workers-ai',
    'deepseek-free',
    'openrouter-free',
    'groq-free',
    'grok',
    'gemini',
    'claude',
    'openai'
  ].includes(normalized) ? normalized : 'auto';
}

function normalizeConciergeSummary(summary) {
  const input = summary && typeof summary === 'object' ? summary : {};
  return {
    totalNodes: numberInRange(input.totalNodes, 0, 10000),
    totalEdges: numberInRange(input.totalEdges, 0, 10000),
    imageCount: numberInRange(input.imageCount, 0, 10000),
    videoCount: numberInRange(input.videoCount, 0, 10000),
    generatedCount: numberInRange(input.generatedCount, 0, 10000),
    brandGuideCount: numberInRange(input.brandGuideCount, 0, 1000)
  };
}

function normalizeConciergeGroups(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .slice(0, 32)
    .map(([key, count]) => [cleanText(key, 80), numberInRange(count, 0, 10000)])
    .filter(([key]) => key));
}

function normalizeConciergeArray(value, normalizer, limit) {
  return Array.isArray(value) ? value.slice(0, limit).map(normalizer).filter(Boolean) : [];
}

function normalizeTextArray(value, limit, maxLength) {
  return Array.isArray(value)
    ? value.map((item) => cleanText(item, maxLength)).filter(Boolean).slice(0, limit)
    : [];
}

function normalizeConciergeAsset(asset) {
  if (!asset || typeof asset !== 'object') return null;
  return {
    id: cleanText(asset.id, 120),
    type: cleanText(asset.type, 80),
    title: cleanText(asset.title, 160),
    subtitle: cleanText(asset.subtitle, 160),
    description: cleanText(asset.description, 700),
    nodeGroup: cleanText(asset.nodeGroup, 120),
    brandName: cleanText(asset.brandName, 120),
    isBrandGuide: asset.isBrandGuide === true,
    isGenerated: asset.isGenerated === true,
    generationProvider: cleanText(asset.generationProvider, 120),
    generationPrompt: cleanText(asset.generationPrompt, 500),
    generationStatus: cleanText(asset.generationStatus, 80),
    image: asset.image ? '[image-reference]' : '',
    video: asset.video ? '[video-reference]' : '',
    colors: normalizeConciergeArray(asset.colors, normalizeConciergeColor, 12)
  };
}

function normalizeConciergeColor(color) {
  if (!color || typeof color !== 'object') return null;
  return {
    name: cleanText(color.name, 80),
    hex: normalizeHexColor(color.hex)
  };
}

function normalizeConciergeContentBlock(block) {
  if (!block || typeof block !== 'object') return null;
  return {
    key: cleanText(block.key, 120),
    value: cleanText(block.value, 900),
    updatedAt: cleanText(block.updatedAt, 80)
  };
}

function normalizeConciergeHistoryItem(item) {
  if (!item || typeof item !== 'object') return null;
  return {
    role: item.role === 'assistant' ? 'assistant' : 'user',
    text: cleanText(item.text, 1200)
  };
}

function numberInRange(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function buildDropletConciergeSystemPrompt(input) {
  const summary = input.context.assetSummary;
  const compactContext = JSON.stringify({
    project: input.project,
    canvasName: input.context.canvasName,
    assetSummary: summary,
    groups: input.context.groups,
    brandGuides: input.context.brandGuides,
    generatedMedia: input.context.generatedMedia,
    assets: input.context.assets,
    siteContent: input.context.siteContent,
    pipelines: input.context.pipelines
  }, null, 2);

  return [
    'You are Droplet Concierge, a creative/operator assistant embedded in the Droplet brand canvas and site workflow.',
    'Help with brand systems, site content, canvas assets, generated media branches, prompt writing, user intent, production pipelines, and next-best creative actions.',
    'Do not use travel-concierge framing, destinations, POIs, itineraries, weather, or event wording unless the user explicitly asks for travel content as creative material.',
    'Use only the provided Droplet context as current state. If context is missing, say what you need and make a pragmatic next step from available information.',
    'Prioritize concrete actions: what to edit, what to generate, what to organize, what copy to tighten, what reference to use, and what risk to watch.',
    'Never invent fake canvas nodes, provider results, saved state, costs, or files. Do not claim something is on the canvas unless it appears in context.',
    'Keep answers concise and structured. Prefer 3 to 6 bullets or a short ordered action list.',
    `Current Droplet context:\n${compactContext}`
  ].join('\n\n');
}

function buildDropletConciergeUserPrompt(input) {
  const history = input.context.history
    .map((item) => `${item.role}: ${item.text}`)
    .join('\n');
  return [
    history ? `Recent chat:\n${history}` : '',
    `User prompt:\n${input.prompt}`
  ].filter(Boolean).join('\n\n');
}

async function planDropletConciergeActions(env, input) {
  const fallback = dropletConciergeActionFallback(input);
  if (!env.AI) return fallback;

  const model = cleanText(env.CONCIERGE_ACTION_MODEL, 160) || CONCIERGE_MODEL;
  const schema = {
    type: 'object',
    properties: {
      actions: {
        type: 'array',
        maxItems: 2,
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['create_asset', 'edit_asset', 'rewrite_copy', 'organize_canvas', 'answer_only']
            },
            label: { type: 'string' },
            prompt: { type: 'string' },
            pipeline: {
              type: 'string',
              enum: ['image', 'video', 'copy', 'canvas', 'none']
            },
            target: { type: 'string' },
            contentKey: { type: 'string' },
            value: { type: 'string' }
          },
          required: ['type', 'label', 'prompt', 'pipeline']
        }
      }
    },
    required: ['actions']
  };

  try {
    const payload = await env.AI.run(model, {
      messages: [
        {
          role: 'system',
          content: [
            'You classify Droplet Concierge prompts into safe UI actions.',
            'Return JSON only. Create asset actions only when the user asks to render, generate, remix, revise, edit, or make visual/media/copy assets.',
            'For rewrite_copy, choose one existing siteContent key and include contentKey plus the full replacement value.',
            'For organize_canvas, use pipeline canvas and target canvas.',
            'Never invent saved state. Use answer_only when the user only asks a question.'
          ].join('\n')
        },
        {
          role: 'user',
          content: JSON.stringify({
            prompt: input.prompt,
            canvasName: input.context.canvasName,
            assetSummary: input.context.assetSummary,
            visibleAssetTitles: input.context.assets.slice(0, 10).map((asset) => asset.title).filter(Boolean),
            siteContent: input.context.siteContent.slice(0, 16).map((block) => ({
              key: block.key,
              value: block.value
            }))
          })
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: schema
      },
      max_tokens: 500,
      temperature: 0.1
    });
    const parsed = typeof payload?.response === 'object' && payload.response
      ? payload.response
      : typeof payload?.result?.response === 'object' && payload.result.response
        ? payload.result.response
        : parseConciergeJsonObject(extractConciergeText(payload));
    const actions = normalizeConciergeActions(parsed?.actions);
    return actions.length > 0 ? actions : fallback;
  } catch (error) {
    console.warn('Concierge action planner failed', error instanceof Error ? error.message : String(error));
    return fallback;
  }
}

function normalizeConciergeActions(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 2).map((action) => {
    if (!action || typeof action !== 'object') return null;
    const type = cleanText(action.type, 40);
    const pipeline = cleanText(action.pipeline, 24);
    if (!['create_asset', 'edit_asset', 'rewrite_copy', 'organize_canvas', 'answer_only'].includes(type)) return null;
    if (!['image', 'video', 'copy', 'canvas', 'none'].includes(pipeline)) return null;
    const prompt = cleanText(action.prompt, 900);
    const contentKey = cleanText(action.contentKey, 120);
    const value = cleanText(action.value, 1800);
    if ((type === 'create_asset' || type === 'edit_asset') && !prompt) return null;
    if (type === 'rewrite_copy' && (!contentKey || !value)) return null;
    return {
      type,
      label: cleanText(action.label, 80) || actionLabelForType(type),
      prompt,
      pipeline,
      target: cleanText(action.target, 120),
      contentKey,
      value
    };
  }).filter(Boolean);
}

function actionLabelForType(type) {
  if (type === 'edit_asset') return 'Edit selected';
  if (type === 'create_asset') return 'Render on canvas';
  if (type === 'rewrite_copy') return 'Rewrite copy';
  if (type === 'organize_canvas') return 'Organize canvas';
  return 'Answer only';
}

function dropletConciergeActionFallback(input) {
  const prompt = cleanText(input.prompt, 900);
  if (/\b(organize|arrange|tidy|layout|cluster|group|space|clean up|sort)\b/i.test(prompt) && /\b(canvas|nodes|cards|assets|board)\b/i.test(prompt)) {
    return [{
      type: 'organize_canvas',
      label: 'Organize canvas',
      prompt,
      pipeline: 'canvas',
      target: 'canvas'
    }];
  }
  if (/\b(rewrite|tighten|edit copy|update copy|improve copy|change copy|polish copy)\b/i.test(prompt)) {
    const block = chooseSiteContentBlock(input);
    if (block) {
      return [{
        type: 'rewrite_copy',
        label: 'Apply copy draft',
        prompt,
        pipeline: 'copy',
        target: block.key,
        contentKey: block.key,
        value: localCopyRewrite(prompt, block.value)
      }];
    }
  }
  if (!/\b(render|generate|create|make|edit|remix|variant|iterate|revise|rework|asset|image|visual|poster|ad|campaign|video|shot)\b/i.test(prompt)) {
    return [];
  }
  const isVideo = /\b(video|motion|clip|film|reel|storyboard)\b/i.test(prompt);
  const isEdit = /\b(edit|remix|variant|iterate|revise|rework|change|selected|this)\b/i.test(prompt);
  return [{
    type: isEdit ? 'edit_asset' : 'create_asset',
    label: isEdit ? 'Edit selected' : 'Render on canvas',
    prompt,
    pipeline: isVideo ? 'video' : 'image',
    target: isEdit ? 'selected_asset' : 'canvas'
  }];
}

function chooseSiteContentBlock(input) {
  const blocks = Array.isArray(input.context.siteContent) ? input.context.siteContent : [];
  if (blocks.length === 0) return null;
  const lowerPrompt = input.prompt.toLowerCase();
  return blocks.find((block) => {
    const key = String(block.key || '').toLowerCase();
    return key && lowerPrompt.includes(key);
  }) || blocks.find((block) => /\b(title|headline|hero|overhero)\b/i.test(block.key) && /\b(title|headline|hero)\b/i.test(input.prompt))
    || blocks.find((block) => /\b(description|body|quote|copy)\b/i.test(block.key) && /\b(description|body|quote|copy)\b/i.test(input.prompt))
    || blocks[0];
}

function localCopyRewrite(prompt, currentValue) {
  const current = cleanText(currentValue, 1200);
  if (!current) return cleanText(prompt.replace(/\b(rewrite|tighten|polish|improve|copy)\b/gi, '').trim(), 1200);
  if (/\b(shorter|tighten|concise|punchy)\b/i.test(prompt)) {
    return current
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .slice(0, 2)
      .join(' ')
      .slice(0, 260);
  }
  if (/\b(premium|elevated|polished)\b/i.test(prompt)) {
    return `${current.replace(/[.!?]*$/, '')}. Crafted with sharper focus, elevated rhythm, and a clearer brand point of view.`;
  }
  return current;
}

function parseConciergeJsonObject(value) {
  const text = String(value || '').replace(/```(?:json)?|```/gi, '').trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function runDropletConciergeProvider(request, env, input, systemPrompt, userPrompt) {
  const providers = input.provider === 'auto'
    ? ['deepseek-free', 'workers-ai', 'openrouter-free', 'groq-free', 'grok', 'gemini', 'claude', 'openai']
    : [input.provider];

  for (const provider of providers) {
    try {
      let result = null;
      if (provider === 'deepseek-free') result = await runDeepSeekConcierge(request, env, systemPrompt, userPrompt);
      if (provider === 'workers-ai') result = await runWorkersAiConcierge(env, systemPrompt, userPrompt);
      if (provider === 'openai') result = await runOpenAiConcierge(request, env, systemPrompt, userPrompt);
      if (provider === 'gemini') result = await runGeminiConcierge(request, env, systemPrompt, userPrompt);
      if (provider === 'openrouter-free') result = await runOpenRouterConcierge(request, env, systemPrompt, userPrompt);
      if (provider === 'groq-free') result = await runGroqConcierge(request, env, systemPrompt, userPrompt);
      if (provider === 'grok') result = await runGrokConcierge(request, env, systemPrompt, userPrompt);
      if (provider === 'claude') result = await runClaudeConcierge(request, env, systemPrompt, userPrompt);
      if (result?.answer) {
        return {
          ...result,
          provider: result.usageProvider || provider,
          providerLabel: result.usageProviderLabel || conciergeProviderLabel(provider)
        };
      }
    } catch (error) {
      console.warn(`Concierge provider ${provider} failed`, error instanceof Error ? error.message : String(error));
      if (input.provider !== 'auto') break;
    }
  }

  if (input.provider !== 'auto') {
    return {
      answer: `The ${input.provider} concierge agent is not configured for this session. Add the matching key in Concierge settings, set the matching Worker secret, or use Auto so Droplet can fall through the free agent cycle and the local context summary.`,
      aiModel: `${input.provider}-missing-key`,
      provider: input.provider,
      providerLabel: conciergeProviderLabel(input.provider),
      recommendations: dropletConciergeRecommendations(input)
    };
  }

  return null;
}

function conciergeProviderLabel(provider) {
  const labels = {
    'deepseek-free': 'DeepSeek',
    'deepseek-workers-ai': 'DeepSeek via Workers AI',
    'deepseek-openrouter-free': 'DeepSeek via OpenRouter',
    'workers-ai': 'Cloudflare Workers AI',
    'openrouter-free': 'OpenRouter Free',
    'groq-free': 'Groq Free',
    grok: 'Grok',
    gemini: 'Gemini',
    claude: 'Claude',
    openai: 'OpenAI'
  };
  return labels[provider] || provider || 'Concierge';
}

async function recordConciergeUsage(env, userId, input, providerResult, systemPrompt, userPrompt) {
  if (!userId || !providerResult?.answer) return;
  const provider = cleanText(providerResult.provider || input.provider || 'auto', 120);
  const usage = estimateConciergeTextUsage(provider, providerResult);
  try {
    await env.DB.prepare(
      `INSERT INTO generation_usage
       (id, user_id, provider, provider_label, pipeline, model, status, prompt_chars, reference_count, output_count, output_size, output_quality, estimated_usd, estimate_basis)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      userId,
      provider,
      cleanText(providerResult.providerLabel || conciergeProviderLabel(provider), 160),
      'text',
      cleanText(providerResult.aiModel, 180),
      usage.status,
      String(systemPrompt || '').length + String(userPrompt || '').length,
      Number(input.context?.assets?.length || 0) + Number(input.context?.brandGuides?.length || 0),
      1,
      'text',
      '',
      usage.estimatedUsd,
      usage.estimateBasis
    ).run();
  } catch (error) {
    console.warn('Concierge usage tracking failed', error instanceof Error ? error.message : String(error));
  }
}

function estimateConciergeTextUsage(provider, providerResult) {
  if (DEEPSEEK_USAGE_PROVIDERS.has(provider)) {
    return {
      estimatedUsd: 0,
      status: 'tracked',
      estimateBasis: 'DeepSeek concierge text call tracked as a free/zero-dollar agent route; account-level provider quotas may still apply outside Droplet.'
    };
  }
  if (provider === 'workers-ai') {
    return {
      estimatedUsd: 0,
      status: 'tracked',
      estimateBasis: 'Cloudflare Workers AI concierge text call tracked without a per-token estimate.'
    };
  }
  if (String(providerResult.aiModel || '').includes('missing-key')) {
    return {
      estimatedUsd: 0,
      status: 'missing-key',
      estimateBasis: 'Concierge provider was selected but no usable API key was configured.'
    };
  }
  return {
    estimatedUsd: 0,
    status: 'tracked',
    estimateBasis: 'Concierge text call tracked; no text pricing estimate configured for this provider.'
  };
}

async function runDeepSeekConcierge(request, env, systemPrompt, userPrompt) {
  const workersModel = cleanText(env.DEEPSEEK_CONCIERGE_WORKERS_MODEL, 160) || '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b';
  if (env.AI) {
    const payload = await env.AI.run(workersModel, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1500
    });
    return {
      answer: stripDeepSeekThinking(extractConciergeText(payload)),
      aiModel: workersModel,
      usageProvider: 'deepseek-workers-ai',
      usageProviderLabel: 'DeepSeek via Workers AI'
    };
  }

  const apiKey = providerKey(request, env, 'X-OpenRouter-Key', ['OPENROUTER_CONCIERGE_API_KEY', 'OPENROUTER_API_KEY']);
  if (!apiKey) return null;
  const model = cleanText(env.DEEPSEEK_OPENROUTER_CONCIERGE_MODEL, 160) || 'deepseek/deepseek-r1:free';
  const result = await runOpenAiCompatibleConcierge({
    url: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    aiModel: model,
    headers: {
      'HTTP-Referer': 'https://droplet.local',
      'X-Title': 'Droplet Concierge'
    },
    cleanAnswer: stripDeepSeekThinking
  });
  return result ? {
    ...result,
    usageProvider: 'deepseek-openrouter-free',
    usageProviderLabel: 'DeepSeek via OpenRouter'
  } : null;
}

async function runWorkersAiConcierge(env, systemPrompt, userPrompt) {
  if (!env.AI) return null;
  const model = cleanText(env.CONCIERGE_AI_MODEL, 160) || CONCIERGE_MODEL;
  const payload = await env.AI.run(model, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 1200
  });
  return {
    answer: extractConciergeText(payload),
    aiModel: model
  };
}

async function runOpenAiConcierge(request, env, systemPrompt, userPrompt) {
  const apiKey = providerKey(request, env, 'X-OpenAI-Key', ['OPENAI_CONCIERGE_API_KEY', 'OPENAI_API_KEY']);
  if (!apiKey) return null;
  const model = cleanText(env.OPENAI_CONCIERGE_MODEL || env.OPENAI_CHAT_MODEL, 160) || 'gpt-4.1-mini';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 900,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(providerError(payload, response.status));
  return {
    answer: cleanText(payload?.choices?.[0]?.message?.content, 8000),
    aiModel: model
  };
}

async function runGeminiConcierge(request, env, systemPrompt, userPrompt) {
  const apiKey = providerKey(request, env, 'X-Gemini-Key', ['GEMINI_CONCIERGE_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_AI_API_KEY']);
  if (!apiKey) return null;
  const model = cleanText(env.GEMINI_CONCIERGE_MODEL, 160) || 'gemini-2.5-flash';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [{
        role: 'user',
        parts: [{ text: userPrompt }]
      }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 900
      }
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(providerError(payload, response.status));
  return {
    answer: cleanText((payload?.candidates?.[0]?.content?.parts || []).map((part) => part.text || '').join('\n'), 8000),
    aiModel: model
  };
}

async function runOpenRouterConcierge(request, env, systemPrompt, userPrompt) {
  const apiKey = providerKey(request, env, 'X-OpenRouter-Key', ['OPENROUTER_CONCIERGE_API_KEY', 'OPENROUTER_API_KEY']);
  if (!apiKey) return null;
  const model = cleanText(env.OPENROUTER_CONCIERGE_MODEL, 160) || 'openrouter/free';
  return runOpenAiCompatibleConcierge({
    url: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    aiModel: model,
    headers: {
      'HTTP-Referer': 'https://droplet.local',
      'X-Title': 'Droplet Concierge'
    },
  });
}

async function runGroqConcierge(request, env, systemPrompt, userPrompt) {
  const apiKey = providerKey(request, env, 'X-Groq-Key', ['GROQ_CONCIERGE_API_KEY', 'GROQ_API_KEY']);
  if (!apiKey) return null;
  const model = cleanText(env.GROQ_CONCIERGE_MODEL, 160) || 'openai/gpt-oss-20b';
  return runOpenAiCompatibleConcierge({
    url: 'https://api.groq.com/openai/v1/chat/completions',
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    aiModel: model
  });
}

async function runGrokConcierge(request, env, systemPrompt, userPrompt) {
  const apiKey = providerKey(request, env, 'X-Grok-Key', ['GROK_CONCIERGE_API_KEY', 'GROK_API_KEY', 'XAI_CONCIERGE_API_KEY', 'XAI_API_KEY']);
  if (!apiKey) return null;
  const model = cleanText(env.GROK_CONCIERGE_MODEL, 160) || 'grok-4-latest';
  return runOpenAiCompatibleConcierge({
    url: 'https://api.x.ai/v1/chat/completions',
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    aiModel: model
  });
}

async function runClaudeConcierge(request, env, systemPrompt, userPrompt) {
  const apiKey = providerKey(request, env, 'X-Anthropic-Key', ['ANTHROPIC_CONCIERGE_API_KEY', 'ANTHROPIC_API_KEY', 'CLAUDE_CONCIERGE_API_KEY', 'CLAUDE_API_KEY']);
  if (!apiKey) return null;
  const model = cleanText(env.CLAUDE_CONCIERGE_MODEL || env.ANTHROPIC_CONCIERGE_MODEL, 160) || 'claude-sonnet-4-20250514';
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 900,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(providerError(payload, response.status));
  return {
    answer: cleanText((payload?.content || []).map((part) => part?.text || '').join('\n'), 8000),
    aiModel: model
  };
}

async function runOpenAiCompatibleConcierge({
  url,
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  aiModel,
  headers = {},
  cleanAnswer = (value) => cleanText(value, 8000)
}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 900,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(providerError(payload, response.status));
  return {
    answer: cleanAnswer(payload?.choices?.[0]?.message?.content || ''),
    aiModel
  };
}

function providerKey(request, env, headerName, envNames) {
  const requestValue = cleanText(request.headers.get(headerName), 4000);
  if (requestValue) return requestValue;
  for (const envName of envNames) {
    const value = cleanText(env[envName], 4000);
    if (value) return value;
  }
  return '';
}

function stripDeepSeekThinking(value) {
  return cleanText(value, 8000).replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

function extractConciergeText(payload) {
  if (typeof payload?.response === 'string') return cleanText(payload.response, 8000);
  if (typeof payload?.result?.response === 'string') return cleanText(payload.result.response, 8000);
  if (typeof payload?.text === 'string') return cleanText(payload.text, 8000);
  if (typeof payload === 'string') return cleanText(payload, 8000);
  return cleanText((payload?.choices?.[0]?.message?.content || ''), 8000);
}

function dropletConciergeFallback(input) {
  const summary = input.context.assetSummary;
  const firstBrandGuide = input.context.brandGuides[0];
  const contentCount = input.context.siteContent.length;
  const mediaCount = summary.imageCount + summary.videoCount;

  return [
    `I can work from the current "${input.context.canvasName}" Droplet canvas.`,
    '',
    `What I see: ${summary.totalNodes} canvas items, ${mediaCount} media assets, ${summary.generatedCount} generated branches, ${summary.brandGuideCount} brand guide node${summary.brandGuideCount === 1 ? '' : 's'}, and ${contentCount} editable site copy block${contentCount === 1 ? '' : 's'}.`,
    firstBrandGuide ? `Use "${firstBrandGuide.title || firstBrandGuide.brandName || 'the brand guide'}" as the source of truth for colors, tone, typography, and layout decisions.` : 'Add or mark a brand guide/source-of-truth node if you want stricter creative direction.',
    '',
    'Next best action:',
    `1. Translate the prompt into a compact creative brief: ${input.prompt}`,
    '2. Choose the strongest canvas reference or brand-guide node before generating.',
    '3. Create one focused image branch and one copy variation, then keep the stronger direction as a child node.',
    '4. Save the canvas once the direction is worth preserving.'
  ].join('\n');
}

function dropletConciergeRecommendations(input) {
  const recommendations = [
    {
      title: 'Tighten the prompt',
      description: 'Turn the request into subject, audience, composition, exact copy, and what must remain unchanged.'
    },
    {
      title: 'Use source-of-truth nodes',
      description: 'Anchor generation to brand guide cards, palette nodes, and strongest product references.'
    },
    {
      title: 'Create a comparison branch',
      description: 'Generate one visual branch and one copy branch so the next decision is visible on canvas.'
    }
  ];

  if (input.context.assetSummary.brandGuideCount === 0) {
    recommendations.unshift({
      title: 'Add a brand guide',
      description: 'A source-of-truth node will make color, typography, and tone decisions more consistent.'
    });
  }

  return recommendations.slice(0, 4);
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
    'Access-Control-Allow-Headers': 'Content-Type,X-OpenAI-Key,X-Gemini-Key,X-OpenRouter-Key,X-Groq-Key,X-Grok-Key,X-Anthropic-Key',
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
