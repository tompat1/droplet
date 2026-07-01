---
name: vite-bundle-validation
description: Validate, build, and test deployment readiness of the droplet application.
---

# Vite Bundle & Build Validation Skill

Use this skill when preparing the application for production build, auditing bundle sizes, or checking for broken links or assets.

## Validation Steps

1. **Lint & Code Quality**:
   - Run linter checks (e.g., Oxlint rules configured in the project) to ensure no syntax/static errors exist.
2. **Build Test**:
   - Run `npm run build` to verify there are no compilation errors during bundling.
3. **Asset Verification**:
   - Confirm that all assets referenced in `src/assetsData.json` exist in the `/public` folder.
   - Verify that there are no absolute paths containing local system directories in imports or source code.
4. **Local Production Test**:
   - Run `npm run preview` to locally test the production bundle and ensure there are no loading errors or dynamic import failures.
