# Droplet AI Concierge Mapping

This maps the TRIP concierge architecture to Droplet before implementation.

## Domain Mapping

- TRIP current trip becomes Droplet's current canvas, visible brand graph, active saved canvas name, user role, and editable site content.
- TRIP destination and dates become the current project/site/canvas identity, brand source-of-truth nodes, user-authored copy, and generation pipeline state.
- TRIP POIs and events become canvas assets, generated media branches, brand guide nodes, product/content cards, labels, videos, and site copy blocks.
- TRIP personas become user role, project intent inferred from canvas nodes, brand voice, content categories, and next-best creative actions.
- TRIP concierge becomes a Droplet creative/operator assistant for brand systems, site content, generated media, canvas organization, prompt writing, and production follow-through.

## Invariants

- Build context at submit time from the current Droplet canvas and site state.
- Send bounded summaries only; do not send raw image/video data URLs.
- Keep provider keys server-side through Worker secrets when possible.
- Browser keys are optional bring-your-own-key overrides and should remain local to the browser.
- Use one submit path for the drawer, prompt chips, and future prompt entry points.
- The system prompt must be Droplet-specific and must not include travel concierge wording.

## Agent Routing

The Concierge drawer supports these agent ids:

- `auto`: free-first cycle, then explicit key-backed providers, then local context fallback.
- `deepseek-free`: Workers AI DeepSeek first; OpenRouter DeepSeek free if an OpenRouter key exists.
- `workers-ai`: Cloudflare Workers AI Llama.
- `openrouter-free`: OpenRouter free model router.
- `groq-free`: Groq OpenAI-compatible endpoint, defaulting to `openai/gpt-oss-20b`.
- `grok`: xAI/Grok endpoint.
- `gemini`: Google Gemini endpoint.
- `claude`: Anthropic Messages endpoint.
- `openai`: OpenAI chat endpoint, kept last in Auto.

Preferred production setup is Worker secrets:

```bash
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put GROK_API_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put OPENAI_API_KEY
```

Browser-entered keys are explicit bring-your-own-key overrides. The frontend stores them in local browser storage and sends them as `X-OpenRouter-Key`, `X-Groq-Key`, `X-Grok-Key`, `X-Gemini-Key`, `X-Anthropic-Key`, or `X-OpenAI-Key` only with Concierge requests.

## Droplet Context Contract

The frontend posts:

```json
{
  "prompt": "What should I generate next for this brand canvas?",
  "provider": "auto",
  "project": {
    "id": "droplet",
    "name": "Droplet",
    "canvasName": "Fluid Node Canvas",
    "userRole": "admin"
  },
  "context": {
    "canvasName": "Fluid Node Canvas",
    "assetSummary": {
      "totalNodes": 42,
      "totalEdges": 18,
      "imageCount": 20,
      "videoCount": 3,
      "generatedCount": 8
    },
    "assets": [],
    "siteContent": [],
    "history": []
  }
}
```

The Worker returns:

```json
{
  "success": true,
  "answer": "Concise Droplet-specific answer.",
  "aiModel": "@cf/meta/llama-3.1-8b-instruct",
  "actions": [
    {
      "type": "create_asset",
      "label": "Render on canvas",
      "prompt": "Generate a campaign visual from the current brand guide.",
      "pipeline": "image",
      "target": "canvas"
    }
  ],
  "recommendations": []
}
```

## Action Planner

The Worker uses Workers AI JSON mode when available to classify Concierge prompts into bounded UI actions. If Workers AI is unavailable, the local planner fallback still detects common render, edit, rewrite, and organize requests.

Supported action types:

- `create_asset`: renders a new branch on the canvas through the generation route.
- `edit_asset`: edits/remixes the selected canvas asset into a new branch.
- `rewrite_copy`: proposes a replacement for an existing editable site-content key, then applies it only after the user clicks the action.
- `organize_canvas`: lays out visible canvas cards by brand guide, generated branches, and canvas groups after the user clicks the action.
- `answer_only`: returns a chat answer with no UI mutation.
