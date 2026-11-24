import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../worker/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// Minimal valid 1x1 PNG (67 bytes) for reference-image and response-parsing tests
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2dIAAAAASUVORK5CYII=';
const TINY_PNG_DATA_URL = `data:image/png;base64,${TINY_PNG_BASE64}`;

// Minimal valid JPEG header bytes
const TINY_JPEG_BASE64 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]).toString('base64');

const EXPECTED_CLOUDFLARE_IMAGE_MODELS = [
  {
    provider: 'cloudflare_flux_klein_9b',
    model: '@cf/black-forest-labs/flux-2-klein-9b',
    mode: 'multipart',
    expectsSteps: false
  },
  {
    provider: 'cloudflare_flux_dev',
    model: '@cf/black-forest-labs/flux-2-dev',
    mode: 'multipart',
    expectsSteps: true
  },
  {
    provider: 'cloudflare_lucid_origin',
    model: '@cf/leonardo/lucid-origin',
    mode: 'json',
    binaryResponse: true
  },
  {
    provider: 'cloudflare_phoenix',
    model: '@cf/leonardo/phoenix-1.0',
    mode: 'json',
    binaryResponse: true
  },
  {
    provider: 'cloudflare_flux_klein',
    model: '@cf/black-forest-labs/flux-2-klein-4b',
    mode: 'multipart',
    expectsSteps: false
  },
  {
    provider: 'cloudflare_flux_schnell',
    model: '@cf/black-forest-labs/flux-1-schnell',
    mode: 'json',
    strictSchnellSchema: true,
    binaryResponse: false
  }
];

function createMockDb() {
  const usageInserts = [];
  return {
    usageInserts,
    prepare(sql) {
      let boundArgs = [];
      const stmt = {
        bind(...args) {
          boundArgs = args;
          return stmt;
        },
        async first() {
          if (sql.includes('FROM sessions')) {
            return {
              session_id: 'sess-test-1',
              expires_at: new Date(Date.now() + 60_000).toISOString(),
              revoked_at: null,
              user_id: 'user-test-1',
              email: 'test@droplet.local',
              display_name: 'Test User',
              avatar_url: '',
              role: 'admin'
            };
          }
          return null;
        },
        async run() {
          if (sql.includes('INSERT INTO generation_usage')) {
            usageInserts.push(boundArgs);
          }
          return { success: true };
        },
        async all() {
          return { results: [] };
        }
      };
      return stmt;
    }
  };
}

async function callGenerateBranch(payload, aiRunImpl) {
  const db = createMockDb();
  const aiCalls = [];
  const env = {
    DB: db,
    AI: {
      async run(model, input) {
        aiCalls.push({ model, input });
        return aiRunImpl(model, input);
      }
    },
    ASSETS: {
      async fetch() {
        return new Response('ok');
      }
    }
  };

  const request = new Request('https://droplet.test/api/generate/branch', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: 'droplet_session=test-session-token'
    },
    body: JSON.stringify(payload)
  });

  const response = await worker.fetch(request, env);
  const body = await response.json();
  return { status: response.status, body, aiCalls, db };
}

test('all Cloudflare Workers AI image models wire up with expected model IDs and payloads', async () => {
  for (const spec of EXPECTED_CLOUDFLARE_IMAGE_MODELS) {
    const { status, body, aiCalls, db } = await callGenerateBranch(
      {
        provider: spec.provider,
        prompt: 'Minimalist brushed aluminum water bottle on studio plinth',
        size: '1024x1024',
        quality: 'medium',
        parent: spec.requiresRef ? { image: TINY_PNG_DATA_URL } : {},
        refs: spec.mode === 'multipart' ? [TINY_PNG_DATA_URL] : []
      },
      async (_model, input) => {
        if (spec.mode === 'multipart') {
          assert.ok(input?.multipart?.body, `${spec.provider} should pass multipart.body`);
          assert.match(
            String(input?.multipart?.contentType || ''),
            /multipart\/form-data/,
            `${spec.provider} should pass multipart/form-data contentType`
          );
          const parsedForm = await new Response(input.multipart.body, {
            headers: { 'content-type': input.multipart.contentType }
          }).formData();
          assert.ok(parsedForm.get('prompt'), `${spec.provider} multipart form should include prompt`);
          assert.equal(parsedForm.get('width'), '1024');
          assert.equal(parsedForm.get('height'), '1024');
          assert.ok(parsedForm.get('input_image_0'), `${spec.provider} should attach reference image`);
          if (spec.expectsSteps) {
            assert.ok(parsedForm.get('steps'), `${spec.provider} should include steps`);
          }
          return { image: TINY_JPEG_BASE64 };
        }

        assert.ok(typeof input?.prompt === 'string' && input.prompt.length > 0, `${spec.provider} should pass prompt`);
        if (spec.strictSchnellSchema) {
          assert.deepEqual(
            Object.keys(input).sort(),
            ['prompt', 'steps'],
            'flux-1-schnell only accepts prompt and steps'
          );
          assert.ok(input.steps >= 1 && input.steps <= 8, 'flux-1-schnell steps must be 1..8');
        }

        if (spec.binaryResponse) {
          return new Uint8Array(Buffer.from(TINY_PNG_BASE64, 'base64'));
        }
        return { image: TINY_JPEG_BASE64 };
      }
    );

    assert.equal(status, 201, `${spec.provider} returned ${status}: ${JSON.stringify(body)}`);
    assert.equal(aiCalls.length, 1, `${spec.provider} should call env.AI.run once`);
    assert.equal(aiCalls[0].model, spec.model, `${spec.provider} model mismatch`);
    assert.equal(body.branch.provider, spec.provider, `${spec.provider} unexpectedly fell back`);
    assert.equal(body.branch.model, spec.model);
    assert.equal(body.branch.status, 'ready');
    assert.match(body.branch.imageDataUrl, /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/);
    assert.equal(db.usageInserts.length, 1, `${spec.provider} should record usage`);
  }
});

test('deprecated Cloudflare providers fall back cleanly to cloudflare_flux_klein_9b', async () => {
  for (const deprecated of ['cloudflare_sdxl', 'cloudflare_sdxl_lightning', 'cloudflare_sd_img2img']) {
    const { status, body, aiCalls } = await callGenerateBranch(
      {
        provider: deprecated,
        prompt: 'Editorial studio shot',
        size: '1024x1024',
        quality: 'low'
      },
      async () => ({ image: TINY_JPEG_BASE64 })
    );

    assert.equal(status, 201);
    assert.equal(aiCalls[0].model, '@cf/black-forest-labs/flux-2-klein-9b');
    assert.equal(body.branch.provider, 'cloudflare_flux_klein_9b');
  }
});

test('UI providers, worker providers, usage sets, and docs stay in sync', () => {
  const workerSrc = fs.readFileSync(path.join(REPO_ROOT, 'worker/index.js'), 'utf8');
  const brandCardSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/components/BrandCard.jsx'), 'utf8');
  const heroCanvasSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/components/HeroCanvas.jsx'), 'utf8');
  const docsSrc = fs.readFileSync(path.join(REPO_ROOT, 'docs/generation-pipelines.md'), 'utf8');

  for (const spec of EXPECTED_CLOUDFLARE_IMAGE_MODELS) {
    assert.ok(workerSrc.includes(`${spec.provider}:`), `worker/index.js missing ${spec.provider}`);
    assert.ok(workerSrc.includes(`'${spec.provider}'`), `CLOUDFLARE_AI_USAGE_PROVIDERS missing ${spec.provider}`);
    assert.ok(brandCardSrc.includes(`${spec.provider}:`), `BrandCard.jsx missing ${spec.provider}`);
    if (spec.provider !== 'cloudflare_sd_img2img') {
      assert.ok(docsSrc.includes(spec.model), `docs/generation-pipelines.md missing ${spec.model}`);
    }
  }

  assert.ok(
    heroCanvasSrc.includes("provider: 'cloudflare_flux_klein_9b'"),
    'HeroCanvas.jsx concierge default image provider should be cloudflare_flux_klein_9b'
  );
});
