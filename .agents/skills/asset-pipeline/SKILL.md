---
name: asset-pipeline
description: Optimize, scale, and convert assets for the droplet workspace, and update the catalog index.
---

# Asset Pipeline Skill

Use this skill to optimize new images or videos, organize them into branding categories, and update the catalog database.

## Workflow

1. **Place raw assets**: Copy raw images/videos into appropriate subdirectories under `public/assets/branding/` or `public/assets/videos/`.
2. **Run optimization script**: Run `execution/optimize_assets.py` (if it exists) or write a script using `sharp`/`ffmpeg` to compress the assets.
   - Images should be converted to `.webp` with quality around 80%.
   - Large images should have an additional thumbnail generated if they are displayed in grids.
3. **Re-generate Catalog**: Run `node scripts/generateAssets.cjs` to update `src/assetsData.json`.

## Rules
- Never commit huge raw assets (PNGs/JPGs > 500KB or high-res videos > 10MB) directly to git without optimization.
- Ensure any added asset is indexed correctly in `src/assetsData.json` so `InteractiveGallery` can find it.
