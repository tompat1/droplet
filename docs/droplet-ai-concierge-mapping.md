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
  "recommendations": []
}
```
