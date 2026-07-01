---
name: threejs-webgl-integration
description: Guidelines for implementing and optimizing the Three.js 3D WebGL layer.
---

# Three.js WebGL Integration Skill

Use this skill when editing or re-enabling [ThreeScene.jsx](file:///Users/thomasrynell/proj/droplet/src/components/ThreeScene.jsx) to display interactive 3D elements in the background/layers of the app.

## Integration Checklist

1. **Renderer Lifecycle**:
   - Always clean up the WebGLRenderer, requestAnimationFrame loop, and scene objects on component unmount to prevent severe memory leaks.
   - Bind window resize event handlers to update the camera aspect ratio and renderer size.

2. **Performance Constraints**:
   - Limit geometry detail and texture sizes (keep textures under 1024x1024 if possible).
   - Use simple materials (like MeshBasicMaterial or MeshPhongMaterial) unless advanced lighting is absolutely required.
   - Check FPS rates and disable shadows/post-processing if the rendering causes scrolling performance to drop below 60fps on mobile.

3. **Overlay & Pointer Events**:
   - The 3D canvas must have `pointer-events: none` if it sits behind interactive HTML elements (like `HeroCanvas` or `InteractiveGallery`) so that clicking HTML elements still works.
