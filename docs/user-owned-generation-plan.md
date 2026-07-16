# User-Owned Generation Plan

Droplet currently has a server-owned generation path:

- OpenAI image generation through `OPENAI_API_KEY`
- Gemini / Banana Pro image generation through `GEMINI_API_KEY`
- Google Veo video generation through the same Gemini credential path

That path should remain the default production lane. It is stable, auditable, and keeps provider secrets server-side in the Cloudflare Worker.

The next refactor should add user-owned generation without trying to automate a user's logged-in ChatGPT or Gemini browser session. Browser-session automation would be brittle, hard to support, and unsafe around cookies, private account data, and provider terms. The clean direction is to add official credential modes and assistant handoff/import workflows.

## Product Goal

A logged-in Droplet user should be able to choose where a canvas branch is generated:

1. Droplet managed provider
2. Their own OpenAI API key
3. Their own Gemini API key
4. Their own Google OAuth-backed Gemini access, if we decide the extra setup is worth it
5. Manual assistant handoff: prepare a perfect prompt/reference pack for ChatGPT or Gemini web, then let the user import the generated media back into the node
6. Future ChatGPT app/plugin surface: let users work with Droplet from inside ChatGPT

## What Is Possible

### 1. Managed Provider

Keep the existing `/api/generate/branch` route and environment-variable keys. This remains the best default for most users.

Pros:
- No user setup
- Best UX
- Central billing and rate limiting
- Easy to debug

Cons:
- Droplet pays and controls quota
- Requires admin-managed provider accounts

### 2. User API Keys

Let each Droplet user connect their own provider keys.

OpenAI:
- Users provide an OpenAI API key from their OpenAI platform project.
- The Worker calls OpenAI with that key instead of `env.OPENAI_API_KEY`.
- Their ChatGPT subscription is not the same thing as API quota. Treat it as a developer API credential, not "use my ChatGPT account."

Gemini:
- Users provide a Gemini API key from Google AI Studio / Google Cloud.
- Prefer auth keys, since Google is moving away from unrestricted standard keys.
- The Worker calls Gemini / Veo with that key instead of `env.GEMINI_API_KEY`.

Pros:
- User controls cost and quota
- Works inside the existing canvas flow
- Minimal UI changes after credential setup

Cons:
- We must store credentials carefully or support session-only keys
- Users need to understand billing/quota
- We need per-user provider health checks

### 3. Google OAuth For Gemini

Google documents OAuth access for Gemini API scenarios. This is heavier than API keys and better suited when we need strict Google identity, organization controls, or granular access. For Droplet, this should be a second phase after BYOK unless we discover a strong reason to prioritize it.

Pros:
- More official identity-based access model
- Better long-term enterprise posture

Cons:
- OAuth consent screen, scopes, verification, refresh-token handling
- More complicated Cloudflare Worker implementation
- Does not mean "use the Gemini web app subscription"; it is still Gemini API access through Google Cloud auth

### 4. Assistant Handoff / Manual Import

For users who want to generate inside ChatGPT or Gemini web manually, Droplet can create a "prompt pack":

- Final prompt
- Brand guide text
- Source-of-truth image references
- Parent node context
- Desired aspect ratio / output type
- Negative constraints and style rules

The UI then offers:
- Copy prompt pack
- Download reference pack
- Open ChatGPT
- Open Gemini
- Upload generated image/video back into this node

Pros:
- Uses the user's normal ChatGPT/Gemini product account without asking for API keys
- Very safe
- Easy to implement
- Pairs well with the upload/download work already added

Cons:
- Not fully automated
- No reliable way to pull output directly from the assistant unless the user imports it

### 5. ChatGPT App / Plugin Surface

OpenAI's Apps SDK path is the inverse of the current app flow: Droplet would become an app inside ChatGPT. We would expose a Droplet MCP server with tools like:

- `list_canvases`
- `get_canvas`
- `get_brand_source_of_truth`
- `create_branch_from_prompt`
- `attach_generated_asset`
- `save_canvas_snapshot`

This is valuable later, but it does not let the Droplet website silently use a user's ChatGPT web session as an API key. It lets ChatGPT users interact with Droplet from inside ChatGPT.

Pros:
- Very elegant long-term ecosystem direction
- ChatGPT can become a creative copilot over Droplet canvas state
- Good fit for brand-guide-first workflows

Cons:
- Bigger product surface
- Requires app/plugin review path
- Separate from the existing website UX

## Recommended Architecture

Add a provider-routing layer instead of adding more provider conditionals directly in `worker/index.js`.

### Provider Modes

Each generation request should include:

```json
{
  "provider": "openai_image",
  "credentialMode": "managed",
  "pipeline": "image",
  "prompt": "...",
  "refs": [],
  "brandGuide": {}
}
```

Supported `credentialMode` values:

- `managed`: use Worker env secrets
- `user_key`: use encrypted key connected to the Droplet user
- `user_oauth`: use stored OAuth refresh/access token, only for providers that officially support it
- `handoff`: create prompt/reference package, no provider API call

### D1 Tables

Add a provider connection table:

```sql
CREATE TABLE user_provider_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  credential_type TEXT NOT NULL,
  display_name TEXT,
  encrypted_secret TEXT,
  secret_hint TEXT,
  status TEXT NOT NULL DEFAULT 'untested',
  last_checked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Add generation job tracking:

```sql
CREATE TABLE generation_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  canvas_id TEXT,
  parent_node_id TEXT,
  provider TEXT NOT NULL,
  credential_mode TEXT NOT NULL,
  pipeline TEXT NOT NULL,
  status TEXT NOT NULL,
  prompt TEXT NOT NULL,
  request_json TEXT,
  result_json TEXT,
  provider_operation_name TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Longer-term, move generated image/video binaries to R2 and store URLs/keys in D1. D1 snapshots with embedded data URLs are workable for now, but not where the app should live once video and larger image assets become central.

### Secret Storage

Use a Worker secret such as `CREDENTIAL_ENCRYPTION_KEY` and encrypt user provider secrets before storing them in D1.

Minimum rules:

- Never expose provider keys to the browser after save
- Show only a hint like `sk-...abcd`
- Let users test, replace, and revoke connections
- Allow session-only keys as a privacy-first option
- Log provider errors without logging secrets or full prompts containing private brand data

### Frontend UX

Add an Account drawer section:

- Provider Connections
- OpenAI: Managed / My API Key / Handoff
- Gemini: Managed / My API Key / Google OAuth later / Handoff
- Test connection button
- Revoke button
- Usage warning copy

Add generation controls in card UI:

- Provider picker
- Credential source picker
- Small status badge: Managed, My key, Handoff
- If no connection exists, show "Connect provider" and "Use handoff"

Add handoff mode:

- Build prompt pack from brand guide, node, refs, and generation settings
- Copy prompt
- Download references
- User generates in ChatGPT/Gemini
- User uploads result back into the card

## Refactor Steps

1. Extract provider code from `worker/index.js` into provider modules.
2. Add a provider registry with `generateImage`, `generateVideo`, `pollJob`, and `validateCredentials` functions.
3. Add D1 migrations for provider connections and generation jobs.
4. Add encryption helpers using Worker WebCrypto.
5. Add `/api/providers/connections` CRUD routes.
6. Add `/api/providers/connections/:id/test`.
7. Update `/api/generate/branch` to resolve credentials by `credentialMode`.
8. Add generation job persistence before and after provider calls.
9. Add Veo polling route and use `generation_jobs.provider_operation_name`.
10. Add Account drawer provider connection UI.
11. Add credential source picker to the card generation panel.
12. Add handoff prompt-pack generation and import flow.
13. Add admin visibility for provider health without exposing user secrets.
14. Add R2 asset storage when generated media size starts fighting D1 snapshot limits.

## First Implementation Slice

Start small:

1. Add `credentialMode: managed | handoff` to generation requests.
2. Implement handoff mode entirely without secrets.
3. Add "Copy prompt pack" and "Upload result" to generated branch flow.
4. Extract provider routing in the Worker.
5. Then add encrypted user API keys.

This gives users the "I want to use my own ChatGPT/Gemini account manually" workflow quickly, while laying the path for true user-owned API credentials.

## Explicit Non-Goals

- Do not scrape ChatGPT or Gemini web sessions.
- Do not ask users for ChatGPT/Gemini passwords.
- Do not store browser cookies.
- Do not pretend a ChatGPT Plus/Pro subscription is the same as OpenAI API quota.
- Do not put provider API keys in client-side code.

## Source Notes

- OpenAI API authentication uses bearer credentials from API keys or short-lived access tokens, and OpenAI explicitly says API keys must not be exposed client-side.
- OpenAI Apps SDK is for building apps inside ChatGPT via an MCP server/plugin path.
- Gemini API supports API-key authentication and documents OAuth as a stricter access-control path.
- Google says Gemini API keys should never be exposed in client-side apps and recommends backend proxy/server-side handling.
