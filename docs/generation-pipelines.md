# Generation Pipelines

Droplet can create Fluid Node Canvas branches through these provider paths:

- Cloudflare FLUX.2 Klein 9B through Workers AI, default model `@cf/black-forest-labs/flux-2-klein-9b` (default fast & Concierge renderer)
- Cloudflare FLUX.2 Dev through Workers AI, default model `@cf/black-forest-labs/flux-2-dev` (flagship high-fidelity + up to 4 reference images)
- Cloudflare Lucid Origin through Workers AI, default model `@cf/leonardo/lucid-origin` (graphic design, product mockups, crisp text)
- Cloudflare Phoenix 1.0 through Workers AI, default model `@cf/leonardo/phoenix-1.0` (coherent typography & strict prompt adherence)
- Cloudflare FLUX.2 Klein 4B through Workers AI, default model `@cf/black-forest-labs/flux-2-klein-4b`
- Cloudflare FLUX Schnell through Workers AI, default model `@cf/black-forest-labs/flux-1-schnell`
- ChatGPT Images through OpenAI Images API, default model `gpt-image-2`
- Gemini Banana Pro through Google Gemini Interactions API, default model `gemini-3-pro-image`
- Google Veo through Gemini API long-running video generation, default model `veo-3.1-generate-preview`

The canvas UI calls `POST /api/generate/branch`. The Worker keeps API keys server-side and returns a branch payload that the canvas turns into a new generated node. Concierge image renders use Cloudflare first, then fall back to an editable zero-credit SVG concept if Workers AI is unavailable or a provider fails.

## Cloudflare Variables

Add these as Cloudflare Worker secrets or environment variables:

```bash
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put GEMINI_API_KEY
```

Optional model overrides:

```bash
CLOUDFLARE_FLUX_KLEIN_9B_MODEL=@cf/black-forest-labs/flux-2-klein-9b
CLOUDFLARE_FLUX_DEV_MODEL=@cf/black-forest-labs/flux-2-dev
CLOUDFLARE_LUCID_ORIGIN_MODEL=@cf/leonardo/lucid-origin
CLOUDFLARE_PHOENIX_MODEL=@cf/leonardo/phoenix-1.0
CLOUDFLARE_FLUX_KLEIN_MODEL=@cf/black-forest-labs/flux-2-klein-4b
CLOUDFLARE_FLUX_SCHNELL_MODEL=@cf/black-forest-labs/flux-1-schnell
OPENAI_IMAGE_MODEL=gpt-image-2
GEMINI_IMAGE_MODEL=gemini-3-pro-image
VEO_VIDEO_MODEL=veo-3.1-generate-preview
```

`GEMINI_API_KEY` is used for both Gemini Banana Pro and Veo. `GOOGLE_AI_API_KEY` is also accepted as a fallback name.

## Current Behavior

- Cloudflare FLUX.2 Klein returns a generated image as a data URL and can use up to four reference images from the selected card and brand guide context.
- Cloudflare FLUX Schnell returns a generated image as a data URL for fast prompt-only branch generation.
- ChatGPT Images returns a generated image as a data URL and stores provider/model metadata on the canvas node.
- Gemini Banana Pro returns a generated image as a data URL and stores provider/model metadata on the canvas node.
- Veo starts a long-running video operation and creates a processing branch node with `generationOperationName`.

## Next Step

Add a polling route for Veo operations so a processing video branch can refresh into a playable video URL after Google finishes rendering.
