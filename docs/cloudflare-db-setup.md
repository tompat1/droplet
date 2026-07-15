# Cloudflare D1 Setup

This project now has the first backend layer for Cloudflare database support:

- `worker/index.js` exposes `/api/*` routes for auth and Fluid Node Canvas persistence.
- `migrations/0001_initial.sql` creates users, sessions, canvases, normalized nodes, normalized edges, versions, and asset tags.
- `wrangler.jsonc` defines the Worker, static asset serving, SPA fallback, and a D1 binding named `DB`.
- `src/lib/apiClient.js` is the frontend helper for later React integration.

## 1. Install Wrangler

```bash
npm install -D wrangler
```

Optionally add the Cloudflare Vite plugin later if we want the local Vite dev server to run through the Workers runtime:

```bash
npm install -D @cloudflare/vite-plugin
```

## 2. Log in

```bash
npx wrangler login
```

## 3. Create the D1 Database

```bash
npx wrangler d1 create droplet-prod
```

Copy the returned `database_id` into `wrangler.jsonc`, replacing:

```jsonc
"database_id": "replace-with-cloudflare-d1-database-id"
```

## 4. Apply the Schema

Local database:

```bash
npx wrangler d1 execute droplet-prod --local --file=./migrations/0001_initial.sql
```

Remote database:

```bash
npx wrangler d1 execute droplet-prod --remote --file=./migrations/0001_initial.sql
```

## 5. Build and Deploy

```bash
npm run build
npx wrangler deploy
```

## API Routes

Public:

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Authenticated:

- `GET /api/canvases`
- `POST /api/canvases`
- `GET /api/canvases/:id`
- `PUT /api/canvases/:id`
- `DELETE /api/canvases/:id`
- `POST /api/canvases/:id/snapshot`

## Fluid Node Canvas Snapshot Shape

The Worker stores a full snapshot and also syncs nodes/edges into relational tables.

```json
{
  "name": "My Fluid Node Canvas",
  "description": "",
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "settings": {
    "interactionMode": "pan",
    "collapsedBranches": {}
  },
  "snapshot": {
    "nodes": [],
    "edges": [],
    "viewport": { "x": 0, "y": 0, "zoom": 1 },
    "settings": {},
    "collapsedBranches": {}
  }
}
```

The Worker strips runtime-only card fields before saving:

- `setGlobalNodes`
- `setGlobalEdges`
- `onToggleCollapse`
- `isHighlighted`
- `isParentCollapsed`
- `parentOffsetX`
- `parentOffsetY`

## Next Implementation Step

Wire `HeroCanvas` to `canvasApi`:

1. Serialize `nodes`, `edges`, viewport, `collapsedBranches`, and `interactionMode`.
2. Rehydrate saved nodes by adding runtime callbacks back into `data`.
3. Add login/register UI.
4. Add explicit Save first, then debounced autosave once the manual path is stable.
