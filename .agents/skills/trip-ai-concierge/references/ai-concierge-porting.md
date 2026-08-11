# AI Concierge Porting Reference

Use this reference when the repo-level `docs/ai-concierge-handoff.md` is not available in the target app.

## Required Architecture

The concierge system has four layers:

1. Frontend service facade that calls `/api/ai/concierge`.
2. App state action that builds context from the active trip.
3. UI surfaces for drawer chat, quick prompts, and provider settings.
4. Server or Worker route that owns provider calls and fallbacks.

Optional companion endpoints:

- `/api/ai/caption` for moment captions.
- `/api/ai/postcard` for postcard styling metadata.

## Concierge Request

```json
{
  "prompt": "Best events during my trip?",
  "provider": "auto",
  "trip": {
    "id": "trip-id",
    "destination": "Paris, France",
    "dates": "Sep 10-18, 2026",
    "startDate": "2026-09-10",
    "endDate": "2026-09-18",
    "weather": null,
    "flightRoute": null
  },
  "personas": ["Food Explorer"],
  "context": {
    "destination": "Paris, France",
    "dates": "Sep 10-18, 2026",
    "startDate": "2026-09-10",
    "endDate": "2026-09-18",
    "weather": null,
    "flightRoute": null,
    "events": [],
    "pois": [],
    "personas": ["Food Explorer"],
    "history": []
  }
}
```

Response:

```json
{
  "success": true,
  "answer": "Markdown answer scoped to the current trip.",
  "aiModel": "trip-concierge-fallback",
  "recommendations": []
}
```

## Frontend State

Minimum state:

```js
{
  aiConciergeOpen: false,
  aiConciergeHistory: [],
  aiConciergeLoading: false,
  aiConciergeProvider: "auto",
  aiProviderKeys: {
    openAiKey: "",
    geminiKey: "",
    claudeKey: "",
    grokKey: "",
    openRouterKey: "",
    groqKey: ""
  },
  aiSettingsModalOpen: false
}
```

The `askAiConcierge(prompt)` action must:

1. Guard empty prompts and duplicate loading.
2. Append the user message.
3. Build context from the currently active trip.
4. Include bounded POIs, events, weather, dates, personas, and recent history.
5. Call the service facade.
6. Sanitize/clean the model answer.
7. Append the assistant response.
8. Clear loading in `finally`.

## Provider Wiring

Production provider calls should happen server-side. App-owned keys belong in secrets, not frontend source. Browser-saved keys are only for intentional bring-your-own-key behavior.

Supported provider ids from TRIP:

- `auto`
- `deepseek-free`
- `openrouter-free`
- `groq-free`
- `gemini`
- `openai`
- `claude`
- `grok`

Known TRIP wiring gap: `openrouter-free` appears in the frontend, but the Worker does not currently handle it directly. Add an OpenRouter Llama branch or normalize the value intentionally when porting.

For Cloudflare Workers AI:

- Add `"ai": { "binding": "AI" }` to `wrangler.jsonc`.
- Call `env.AI.run(model, input)` in the Worker.
- Use remote Wrangler development for Workers AI testing.
- Verify current model ids, limits, and request schemas before deployment.

## Current Trip Isolation

These rules matter more than the visual shell:

- Rebuild context at submit time from the selected trip.
- Do not use unkeyed global caches for POIs, events, weather, quick facts, map location, or tab data.
- If chat history is trip-specific, key or clear it on trip switch.
- Never allow Trip A destination, POIs, events, or quick facts to appear after selecting Trip B.
- The Worker prompt must use the request destination and dates, not cached server state.

## Tests To Preserve

Unit/API tests:

- Empty and duplicate concierge submits.
- Active-trip-only context.
- Provider key header behavior.
- Provider alias normalization.
- Worker response shape.
- Provider-key-missing responses.
- Worker fallback scoped to the request destination.
- Caption and postcard response contracts if those endpoints are ported.

E2E tests:

- Login.
- Logout.
- Create trip.
- Select another trip and verify map, quick facts, tabs, POIs, events, and concierge answers update to only that trip.

