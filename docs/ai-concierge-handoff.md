# TRIP AI Concierge Handoff

This handoff is for an agent that needs to move TRIP's concierge and AI wiring into another application. It captures the working architecture, contracts, source files, provider setup, and the invariants that keep AI answers scoped to the selected trip.

## Scope

The AI surface has three parts:

- Concierge chat: trip-aware assistant that uses the current trip, dates, POIs, events, weather, personas, and recent chat history.
- Moment captions: short AI-generated title, caption, and tags for uploaded travel moments.
- Postcard styling: generated postcard metadata and visual filter settings.

The concierge is the most important part. Treat the caption and postcard endpoints as optional companion features unless the new app has journal/moment creation.

## Current Source Map

Frontend service facade:

- `src/services/AiService.js`
  - `autoDescribeMoment()`
  - `generatePostcard()`
  - `askConcierge()`
  - Worker-first fetch, optional direct client provider calls, and rich fallback text.

Frontend state orchestration:

- `src/state/core.js`
  - Initializes `aiConciergeOpen`, `aiConciergeHistory`, `aiConciergeLoading`, `aiConciergeProvider`, `aiProviderKeys`, and settings modal state.
- `src/state/uiState.js`
  - Opens/closes concierge and quick capture.
  - Saves provider keys in `localStorage` under `trip_ai_provider_keys_v1`.
  - Builds the active-trip-only concierge context in `askAiConcierge()`.
  - Calls `aiService.askConcierge()` and appends assistant responses.

Frontend UI:

- `src/components/AiConciergeDrawer.js`
  - Drawer chat, prompt chips, loading state, recommendations, and main concierge form.
- `src/components/QuickCaptureWidget.js`
  - Compact concierge tab inside quick capture.
- `src/components/AiSettingsModal.js`
  - Provider picker and bring-your-own-key inputs.
- `src/components/Header.js`
  - Header entry point.
- `src/views/HomeView.js`
  - Home concierge card and quick prompt form.
- `src/views/PlanView.js`
  - Plan-page concierge banner and trip-specific prompt chips.
- `src/views/LiveView.js`
  - Admin concierge console.
- `src/styles.css`
  - Drawer, quick capture, and AI settings styles.

Frontend event glue:

- `src/app/conciergeController.js`
  - Single submit path for drawer, quick capture, and home forms.
  - Opens the drawer when the prompt comes from the home card.
- `src/main.js`
  - Handles `open-ai-concierge`, `close-ai-concierge`, `clear-ai-concierge`, `send-ai-chip`, AI settings actions, and global form submission.

Backend Worker:

- `worker/index.js`
  - `POST /api/ai/caption` -> `aiCaptionHandler()`
  - `POST /api/ai/postcard` -> `aiPostcardHandler()`
  - `POST /api/ai/concierge` -> `aiConciergeHandler()`
  - Nearby POI and event discovery routes can fall back to concierge synthesis when live sources return no results.
- `wrangler.jsonc`
  - Assets are served through the Worker.
  - Workers AI is bound as `env.AI` with:

```jsonc
"ai": {
  "binding": "AI"
}
```

Tests:

- `test/enrichment.test.js`
  - Worker concierge endpoint.
  - Concierge POI synthesis fallback.
  - Concierge event synthesis fallback.
- `test/state.test.js`
  - Shared concierge submit path and drawer behavior.
- `test/smoke/current-trip-isolation.spec.js`
  - Current-trip isolation smoke coverage for trip-specific UI.

## Core Data Contract

The frontend calls:

```http
POST /api/ai/concierge
Content-Type: application/json
X-OpenAI-Key: optional user-supplied key
X-Gemini-Key: optional user-supplied key
X-Anthropic-Key: optional user-supplied key
X-Grok-Key: optional user-supplied key
X-OpenRouter-Key: optional user-supplied key
X-Groq-Key: optional user-supplied key
```

Request body:

```json
{
  "prompt": "Whats the top 10 events on location during the trips date span?",
  "provider": "auto",
  "trip": {
    "id": "trip-paris",
    "destination": "Paris, France",
    "dates": "Sep 10-18, 2026",
    "startDate": "2026-09-10",
    "endDate": "2026-09-18",
    "weather": { "condition": "Partly cloudy", "temp": "21C" },
    "flightRoute": null
  },
  "personas": ["Food Explorer", "Culture Seeker"],
  "context": {
    "destination": "Paris, France",
    "dates": "Sep 10-18, 2026",
    "startDate": "2026-09-10",
    "endDate": "2026-09-18",
    "weather": { "condition": "Partly cloudy", "temp": "21C" },
    "flightRoute": null,
    "events": [
      {
        "id": "evt-1",
        "title": "Coldplay Live",
        "artist": "Coldplay",
        "venue": "Stade de France",
        "dates": "2026-09-14 20:00",
        "genre": "Rock",
        "ticketUrl": "https://example.com",
        "provider": "ticketmaster",
        "source": "ticketmaster"
      }
    ],
    "pois": [
      {
        "name": "Musee d'Orsay",
        "category": "Museum",
        "address": "1 Rue de la Legion d'Honneur",
        "description": "Impressionist museum in a former station.",
        "tags": ["art", "museum"]
      }
    ],
    "personas": ["Food Explorer", "Culture Seeker"],
    "history": [
      { "role": "user", "text": "Best rainy day plan?" },
      { "role": "assistant", "text": "Start with..." }
    ]
  }
}
```

Response body:

```json
{
  "success": true,
  "answer": "Markdown answer for the current trip only.",
  "aiModel": "deepseek-r1-free",
  "recommendations": []
}
```

The current app only requires `success`, `answer`, and `aiModel`. `recommendations` is optional and can be used for richer cards.

## Caption And Postcard Contracts

Caption request:

```json
{
  "location": "Paris, France",
  "type": "photo",
  "hint": "Evening cafe near Canal Saint-Martin"
}
```

Caption response:

```json
{
  "success": true,
  "caption": "One sentence travel caption.",
  "tags": ["#coffee", "#paris", "#memory"],
  "suggestedTitle": "Evening Coffee in Paris",
  "aiModel": "@cf/meta/llama-3.3-70b-instruct"
}
```

Postcard request:

```json
{
  "location": "Paris, France",
  "style": "vintage",
  "title": "Greetings from",
  "date": "2026-09-10"
}
```

Postcard response:

```json
{
  "success": true,
  "style": "vintage",
  "location": "Paris, France",
  "title": "Greetings from",
  "date": "2026-09-10",
  "stampText": "PARIS, FRANCE - POSTAL SERVICE",
  "vintageFilter": "sepia(0.55) contrast(1.15)",
  "aiModel": "@cf/stabilityai/stable-diffusion-xl-base-1.0"
}
```

## Backend Provider Wiring

The Worker should own production provider calls. Browser-side direct calls are acceptable only for bring-your-own-key experiments because any key in the browser is visible to that user.

Supported provider inputs in the current UI/state:

- `auto`
- `deepseek-free`
- `openrouter-free`
- `groq-free`
- `gemini`
- `openai`
- `claude`
- `grok`

Current Worker behavior:

- `auto` / `smart-cycle`: tries Workers AI, then OpenRouter if a key exists, then Gemini if a key exists, then Groq if a key exists, then local fallback.
- `deepseek-free`: tries Workers AI DeepSeek, then OpenRouter DeepSeek if a key exists.
- `groq-free`: calls Groq if a key exists.
- `gemini`: calls Gemini if a key exists.
- `openai`: calls OpenAI if a key exists.
- `claude`: calls Anthropic if a key exists.
- `grok`: calls xAI if a key exists.
- `openrouter-free`: currently appears in frontend provider options but is not handled directly by the Worker. Fix this while porting by adding an OpenRouter Llama branch or by normalizing it to `auto`/`deepseek-free`.

Recommended porting fix for provider ids:

```js
const providerAliases = {
  "workers-ai": "auto",
  "openrouter-free": "openrouter-free"
};
const requestedProvider = providerAliases[body.provider] || body.provider || "auto";
```

Then add a direct `openrouter-free` branch that calls the OpenRouter Llama free model when `openRouterKey` is present. Verify current model ids against provider docs before deploying a new app.

Secrets and configuration:

- Put app-owned provider keys in Worker secrets, never in frontend source.
- Continue accepting optional `X-*-Key` headers only if the product intentionally supports user-supplied personal keys.
- Set secrets with commands such as:

```bash
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put GROK_API_KEY
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler secret put GROQ_API_KEY
```

Workers AI setup:

- Add `"ai": { "binding": "AI" }` to `wrangler.jsonc`.
- Access inference through `env.AI.run(model, input)`.
- For local Workers AI testing, use remote Wrangler development. Workers AI does not run local inference.
- Before a new deployment, verify current model names, limits, and request schemas against Cloudflare/provider docs.

## Concierge Prompt Shape

The Worker builds a system prompt with:

- Destination.
- Traveler personas.
- Trip date span.
- Weather.
- Verified POIs for the current trip.
- Live events for the current trip dates.
- Anti-hallucination rules.
- A hard instruction not to mention other cities unless explicitly asked.

Keep these rules when porting:

- Use provided POIs/events first.
- For event prompts, filter and rank events during the trip date span.
- Do not invent fake place names, venues, addresses, or events.
- Keep answers concise and structured.
- Explicitly anchor every response to the selected destination.

## Frontend State Pattern

At minimum, the new app needs this state:

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

The `askAiConcierge(prompt)` action should:

1. Trim and validate the prompt.
2. Exit if a request is already loading.
3. Append the user message.
4. Build context from the active trip at call time.
5. Slice POIs and events to a bounded size.
6. Include only recent chat history.
7. Call `aiService.askConcierge()`.
8. Clean/sanitize the response text before rendering.
9. Build recommendation cards if the app supports them.
10. Append the assistant message and always clear loading in `finally`.

## Current Trip Isolation Rules

These are non-negotiable if the concierge is reused in another trip app:

- Build concierge context from the active trip at the moment the prompt is submitted.
- Do not keep module-level destination, POI, event, weather, quick facts, or map state unless it is keyed by trip id.
- Avoid falling back from `trip.events` to an unkeyed global event cache. In the current app, `this.discoveredConcerts` is used as a legacy fallback. A new app should either key that cache by trip id/location or pass an empty array.
- Reset or recompute Quick Facts, tabs, POIs, events, map center, weather, and recommendation panels when the selected trip changes.
- Chat history can be global only if the UI clearly presents it as a cross-trip chat. For trip-specific concierge behavior, either clear history on trip switch or store history by trip id.
- The Worker prompt must include destination and date span from the request, not from a cached server variable.
- Tests should assert that data from Trip A never appears after creating/selecting Trip B.

## UI Integration Pattern

Use one submit pathway for all concierge entry points. The current app routes drawer, quick capture, and home forms through `src/app/conciergeController.js`.

Required actions:

- `open-ai-concierge`
- `close-ai-concierge`
- `clear-ai-concierge`
- `send-ai-chip`
- `submit-ai-concierge`
- `submit-quick-capture-concierge`
- `submit-home-concierge-form`
- `open-ai-settings-modal`
- `close-ai-settings-modal`
- `set-ai-provider`
- `clear-all-ai-keys`

Required UI states:

- Empty chat state.
- Loading / input disabled state.
- Assistant response state.
- Error fallback state.
- Provider-key-missing response state.
- Settings modal open/closed state.

## Security And Privacy

- Prefer server-side provider secrets in the Worker.
- Treat browser-entered keys as bring-your-own-key only; store them locally only if the user understands that they are stored in their browser.
- Never log provider keys, request headers containing keys, or full prompts with personal data in production logs.
- Add authentication or rate limiting before exposing the concierge endpoint in a multi-user app.
- Bound request size. The current context slices POIs to 30, events to 15, and history to the last 6 messages.
- Escape or sanitize model output before rendering markdown/html.
- Keep CORS restricted to the new app's origin in production.

## Fallback Strategy

There are three fallback layers:

1. Worker provider fallback: if the requested provider fails, try another provider when appropriate.
2. Worker smart fallback: synthesize a useful response from current trip context.
3. Client fallback: if the Worker is unavailable, produce a local answer from provided context.

For a production port, keep the Worker smart fallback. Consider removing direct browser provider calls unless bring-your-own-key is a deliberate product feature.

Nearby POI and event discovery also have concierge synthesis fallbacks in `worker/index.js`. Port those only if the new app has the same enrichment routes.

## Implementation Checklist

1. Copy or recreate the service facade from `src/services/AiService.js`.
2. Add AI state fields and `askAiConcierge()` to the new app's state layer.
3. Rebuild trip context from the active trip only.
4. Add the Worker endpoints and provider router.
5. Add `wrangler.jsonc` Workers AI binding if the new app runs on Cloudflare.
6. Add provider secrets through Wrangler or the target platform's secret manager.
7. Add the drawer, quick prompt chips, and settings modal.
8. Route all concierge forms through one submit controller.
9. Add response sanitization and loading/error states.
10. Add current-trip isolation tests before expanding UI coverage.

## Test Plan For A Port

Unit tests:

- `askAiConcierge()` rejects empty prompts.
- `askAiConcierge()` prevents duplicate submits while loading.
- Context includes only active trip destination, dates, POIs, events, weather, personas, and recent history.
- Provider key headers are added only when keys exist.
- Settings save/clear writes the expected state and storage.
- Provider aliases are normalized.

Worker tests:

- `POST /api/ai/concierge` returns `{ success: true, answer, aiModel }`.
- Missing provider keys return a useful key-required response for explicit providers.
- `auto` includes trip dates, POIs, and events in the prompt sent to the model.
- Event prompts rank only current-trip events.
- Worker fallback uses current destination and does not include another destination.
- `openrouter-free` is handled directly or intentionally normalized.
- Caption endpoint returns caption, tags, suggested title, and model.
- Postcard endpoint returns style metadata and model.

E2E smoke tests:

- Login works.
- Logout works and clears authenticated UI.
- Create a new trip for City B after viewing City A.
- Map centers on City B.
- Quick Facts show only City B.
- POI tabs show only City B POIs.
- Events tab shows only City B events and dates.
- Concierge answers mention City B and do not leak City A.
- Switching back to City A restores City A scoped data.

Commands in this repo:

```bash
npm test
npm run worker:check
npm run build
npm run test:smoke
```

## Acceptance Criteria

The port is done when:

- A user can open the concierge from every intended UI entry point.
- The assistant can answer trip-specific questions using the active trip's POIs, events, dates, weather, and personas.
- Login/logout and trip creation still work.
- Creating/selecting a new trip updates map, quick facts, tabs, POIs, events, and concierge context.
- No visible content or AI answer leaks stale data from another trip.
- The Worker can respond without any third-party key by using Workers AI or the smart fallback.
- Production provider keys live in server-side secrets.
- Tests cover the contracts above.

