const SESSION_COOKIE = 'droplet_session';
const SESSION_DAYS = 30;
const MAX_JSON_BYTES = 1_500_000;
const PBKDF2_ITERATIONS = 100000;

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
      return json({ error: 'Unexpected server error' }, 500);
    }
  }
};

async function routeApi(request, env, url) {
  const path = url.pathname.replace(/^\/api/, '') || '/';

  if (request.method === 'GET' && path === '/health') {
    return json({ ok: true, service: 'droplet-worker' });
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

  if (path.startsWith('/admin/')) {
    if (session.user.role !== 'admin') return json({ error: 'Admin access required' }, 403);

    if (request.method === 'GET' && path === '/admin/users') {
      return listUsers(env);
    }

    if (request.method === 'POST' && path === '/admin/users') {
      return createUserAsAdmin(request, env);
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

  if (!email || !email.includes('@')) return json({ error: 'Valid email is required' }, 400);
  if (password.length < 10) return json({ error: 'Password must be at least 10 characters' }, 400);

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return json({ error: 'User already exists' }, 409);

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const role = await determineNewUserRole(env, email);

  await env.DB.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, role) VALUES (?, ?, ?, ?, ?)'
  ).bind(userId, email, displayName, passwordHash, role).run();

  const user = { id: userId, email, display_name: displayName, role };
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
    'SELECT id, email, display_name, password_hash, role FROM users WHERE email = ?'
  ).bind(email).first();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return json({ error: 'Invalid email or password' }, 401);
  }

  const { cookie } = await createSession(env, user.id);
  return json({ user: publicUser(user) }, 200, cookie);
}

async function listUsers(env) {
  const result = await env.DB.prepare(
    `SELECT users.id, users.email, users.display_name, users.role, users.created_at, users.updated_at,
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
  const role = body.role === 'admin' ? 'admin' : 'user';

  if (!email || !email.includes('@')) return json({ error: 'Valid email is required' }, 400);
  if (password.length < 10) return json({ error: 'Password must be at least 10 characters' }, 400);

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return json({ error: 'User already exists' }, 409);

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  await env.DB.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, role) VALUES (?, ?, ?, ?, ?)'
  ).bind(userId, email, displayName, passwordHash, role).run();

  return json({
    user: publicAdminUser({
      id: userId,
      email,
      display_name: displayName,
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
  const role = body.role === 'admin' ? 'admin' : 'user';

  const target = await env.DB.prepare('SELECT id, role FROM users WHERE id = ?').bind(userId).first();
  if (!target) return json({ error: 'User not found' }, 404);

  if (userId === currentUserId && role !== 'admin') {
    return json({ error: 'You cannot remove your own admin access' }, 400);
  }

  await env.DB.prepare(
    'UPDATE users SET display_name = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(displayName, role, userId).run();

  return json({ ok: true });
}

async function deleteUserAsAdmin(env, userId, currentUserId) {
  if (userId === currentUserId) return json({ error: 'You cannot delete your own account' }, 400);

  const result = await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
  if (!result.meta || result.meta.changes === 0) return json({ error: 'User not found' }, 404);

  return json({ ok: true });
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
  return json({ canvas: parseCanvasRow(row, true) });
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
    JSON.stringify(canvas.snapshot)
  ).run();

  await syncCanvasParts(env, id, canvas.snapshot);
  return getCanvas(env, userId, id);
}

async function updateCanvas(request, env, userId, canvasId) {
  const exists = await env.DB.prepare(
    'SELECT id FROM canvases WHERE id = ? AND user_id = ?'
  ).bind(canvasId, userId).first();

  if (!exists) return json({ error: 'Canvas not found' }, 404);

  const canvas = normalizeCanvasPayload(await readJson(request));

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
    JSON.stringify(canvas.snapshot),
    canvasId,
    userId
  ).run();

  await syncCanvasParts(env, canvasId, canvas.snapshot);
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

async function syncCanvasParts(env, canvasId, snapshot) {
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
      JSON.stringify(node.data || {}),
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
}

async function requireSession(request, env) {
  const token = parseCookies(request.headers.get('Cookie'))[SESSION_COOKIE];
  if (!token) return null;

  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT sessions.id, sessions.user_id, users.email, users.display_name, users.role
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
  delete copy.isHighlighted;
  delete copy.isParentCollapsed;
  delete copy.parentOffsetX;
  delete copy.parentOffsetY;
  return copy;
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
    role: user.role || 'user',
    isAdmin: user.role === 'admin'
  };
}

function publicAdminUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name || user.displayName || '',
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
