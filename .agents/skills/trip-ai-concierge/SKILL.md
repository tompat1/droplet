---
name: trip-ai-concierge
description: Port or implement the TRIP AI Concierge wiring in another application, including trip-scoped context, the AI drawer, provider settings, Cloudflare Worker endpoints, Workers AI, multi-provider fallbacks, and current-trip isolation tests. Use when asked to reuse TRIP's concierge, AI assistant, caption/postcard AI, or provider wiring.
---

# TRIP AI Concierge Porting

## Overview

Use this skill to move TRIP's concierge AI system into another app without losing the important wiring: active-trip-only context, Worker-owned provider calls, safe fallbacks, one shared submit path, and tests that catch stale trip data leaks.

## First Step

Read `references/ai-concierge-porting.md` first. If this skill is being used inside the original TRIP repo, also read `docs/ai-concierge-handoff.md`; the repo doc is the fuller handoff with the exact source map, contracts, provider behavior, security notes, and test plan.

When working in the TRIP repo, inspect these source files before making implementation changes:

- `src/services/AiService.js`
- `src/state/core.js`
- `src/state/uiState.js`
- `src/app/conciergeController.js`
- `src/components/AiConciergeDrawer.js`
- `src/components/QuickCaptureWidget.js`
- `src/components/AiSettingsModal.js`
- `src/main.js`
- `worker/index.js`
- `wrangler.jsonc`
- `test/enrichment.test.js`
- `test/state.test.js`

## Porting Workflow

1. Map the target app's trip model to the concierge contract.
2. Build the Worker/server endpoint before wiring UI.
3. Add a frontend `aiService.askConcierge()` facade.
4. Add state for history, loading, provider selection, settings modal, and provider keys.
5. Implement `askAiConcierge()` so it builds context from the active trip at submit time.
6. Add drawer/settings UI and route all forms through one submit controller.
7. Add caption/postcard endpoints only if the target app has moment or postcard features.
8. Add current-trip isolation tests before polishing UI details.

## Non-Negotiable Invariants

- Concierge context must be rebuilt from the currently selected trip for every prompt.
- POIs, events, quick facts, map center, weather, tabs, and chat history must not leak from another trip.
- Provider keys owned by the app belong in server-side secrets, not frontend source.
- Browser-saved keys are only acceptable for explicit bring-your-own-key behavior.
- Always include a no-key fallback path so the concierge still answers when providers fail.
- Bound the prompt context size and sanitize rendered model output.

## Provider Notes

The current frontend exposes `openrouter-free`, but the Worker does not handle that id directly. When porting, either add a direct OpenRouter Llama branch or normalize it intentionally. Also normalize any legacy `workers-ai` value to the Worker-supported behavior.

Verify current Cloudflare Workers AI and third-party model names against current provider docs before deployment. Do not copy stale limits or pricing claims.

## Validation

For this repo, run:

```bash
npm test
npm run worker:check
npm run build
npm run test:smoke
```

For another app, preserve equivalent unit, Worker/API, and E2E smoke coverage for login, logout, trip creation, active-trip data refresh, and concierge answers.
