#!/usr/bin/env node
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.DROPLET_SMOKE_PORT || 8799);
const BASE_URL = `http://127.0.0.1:${PORT}`;

const MODELS_TO_TEST = [
  {
    provider: 'cloudflare_flux_klein_9b',
    expectedModel: '@cf/black-forest-labs/flux-2-klein-9b',
    prompt: 'Minimalist frosted glass water bottle on warm travertine stone, soft studio light'
  },
  {
    provider: 'cloudflare_flux_dev',
    expectedModel: '@cf/black-forest-labs/flux-2-dev',
    prompt: 'Minimalist ceramic coffee cup on matte slate table, editorial product photo'
  },
  {
    provider: 'cloudflare_lucid_origin',
    expectedModel: '@cf/leonardo/lucid-origin',
    prompt: 'Clean minimalist packaging box for a botanical skincare brand, crisp studio lighting'
  },
  {
    provider: 'cloudflare_phoenix',
    expectedModel: '@cf/leonardo/phoenix-1.0',
    prompt: 'Minimalist poster with clean typography reading DROPLET on deep navy background'
  },
  {
    provider: 'cloudflare_flux_klein',
    expectedModel: '@cf/black-forest-labs/flux-2-klein-4b',
    prompt: 'Brushed titanium desk lamp on oak desk, studio photography'
  },
  {
    provider: 'cloudflare_flux_schnell',
    expectedModel: '@cf/black-forest-labs/flux-1-schnell',
    prompt: 'Simple geometric cobalt blue glass sphere on white studio backdrop'
  }
];

function hasValidImageMagicBytes(base64) {
  const buf = Buffer.from(base64, 'base64');
  if (buf.length < 100) return { ok: false, reason: `decoded bytes too small (${buf.length}B)` };
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isWebp =
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50;
  if (!isJpeg && !isPng && !isWebp) {
    return { ok: false, reason: `unexpected magic bytes: ${buf.subarray(0, 8).toString('hex')}` };
  }
  return { ok: true, bytes: buf.length, format: isJpeg ? 'jpeg' : isPng ? 'png' : 'webp' };
}

async function waitForHealth(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return;
    } catch {
      // server still starting
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`wrangler dev did not become healthy at ${BASE_URL}/api/health within ${timeoutMs}ms`);
}

function applyLocalMigrations(persistDir) {
  const migrationsDir = path.join(REPO_ROOT, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    execFileSync(
      'npx',
      ['wrangler', 'd1', 'execute', 'droplet-prod', '--local', '--persist-to', persistDir, '--file', path.join(migrationsDir, file)],
      { cwd: REPO_ROOT, stdio: 'pipe' }
    );
  }
}

async function main() {
  const persistDir = fs.mkdtempSync(path.join(os.tmpdir(), 'droplet-model-smoke-'));
  let server = null;
  let serverStderr = '';

  const cleanup = () => {
    if (server && !server.killed) {
      server.kill('SIGTERM');
    }
    try {
      fs.rmSync(persistDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  };

  process.on('SIGINT', () => { cleanup(); process.exit(130); });
  process.on('SIGTERM', () => { cleanup(); process.exit(143); });

  try {
    console.log('Applying isolated local D1 migrations...');
    applyLocalMigrations(persistDir);

    console.log(`Starting wrangler dev on port ${PORT} (local D1 + live Workers AI)...`);
    server = spawn(
      'npx',
      ['wrangler', 'dev', '--port', String(PORT), '--persist-to', persistDir],
      { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    server.stderr.on('data', (chunk) => { serverStderr += chunk.toString(); });
    server.stdout.on('data', (chunk) => { serverStderr += chunk.toString(); });

    await waitForHealth(35000);

    // Register a temporary smoke-test user in the isolated local D1
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: `smoke-${Date.now()}@droplet.local`,
        password: 'SmokeTestPassword123!',
        displayName: 'Model Smoke Tester'
      })
    });
    if (!regRes.ok) {
      throw new Error(`Failed to register smoke-test user: ${regRes.status} ${await regRes.text()}`);
    }
    const setCookie = regRes.headers.get('set-cookie') || '';
    const cookieMatch = setCookie.match(/droplet_session=[^;]+/);
    if (!cookieMatch) throw new Error('No droplet_session cookie returned from /api/auth/register');
    const cookie = cookieMatch[0];

    const filterArg = process.argv[2];
    const targets = filterArg
      ? MODELS_TO_TEST.filter((m) => m.provider === filterArg || m.expectedModel === filterArg)
      : MODELS_TO_TEST;

    if (targets.length === 0) {
      throw new Error(`No models matched filter: ${filterArg}`);
    }

    const results = [];
    for (const target of targets) {
      const started = Date.now();
      process.stdout.write(`Testing ${target.provider} (${target.expectedModel})... `);
      try {
        const res = await fetch(`${BASE_URL}/api/generate/branch`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            cookie
          },
          body: JSON.stringify({
            provider: target.provider,
            prompt: target.prompt,
            size: '1024x1024',
            quality: 'low',
            parent: target.sourceImage ? { image: target.sourceImage } : {}
          })
        });
        const elapsedMs = Date.now() - started;
        const body = await res.json();

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${body.error || JSON.stringify(body)}`);
        }
        const branch = body.branch;
        if (!branch) throw new Error('Missing branch in response');
        if (branch.provider !== target.provider) {
          throw new Error(`Fell back to ${branch.provider} (${branch.fallbackReason || 'no reason'})`);
        }
        if (branch.model !== target.expectedModel) {
          throw new Error(`Expected model ${target.expectedModel}, got ${branch.model}`);
        }
        const dataUrl = String(branch.imageDataUrl || '');
        const match = dataUrl.match(/^data:image\/[a-z0-9+.-]+;base64,(.+)$/i);
        if (!match) {
          throw new Error(`Invalid imageDataUrl format: ${dataUrl.slice(0, 60)}`);
        }
        const magic = hasValidImageMagicBytes(match[1]);
        if (!magic.ok) {
          throw new Error(magic.reason);
        }

        console.log(`PASS (${magic.format}, ${(magic.bytes / 1024).toFixed(1)} KB, ${(elapsedMs / 1000).toFixed(1)}s)`);
        results.push({ provider: target.provider, model: target.expectedModel, ok: true, elapsedMs, ...magic });
      } catch (err) {
        const elapsedMs = Date.now() - started;
        const message = err instanceof Error ? err.message : String(err);
        console.log(`FAIL (${(elapsedMs / 1000).toFixed(1)}s): ${message}`);
        results.push({ provider: target.provider, model: target.expectedModel, ok: false, elapsedMs, error: message });
      }
    }

    const failed = results.filter((r) => !r.ok);
    console.log(`\nLive Cloudflare AI model smoke test summary: ${results.length - failed.length}/${results.length} passed.`);
    if (failed.length > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('\nSmoke test runner error:', err instanceof Error ? err.message : err);
    if (serverStderr) {
      console.error('\n--- wrangler dev output (tail) ---\n' + serverStderr.slice(-2000));
    }
    process.exitCode = 1;
  } finally {
    cleanup();
  }
}

main();
