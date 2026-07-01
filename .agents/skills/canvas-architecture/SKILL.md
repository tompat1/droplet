---
name: canvas-architecture
description: Guidelines for rendering nodes, connection lines, zoom/pan bounds, and branch state management in HeroCanvas.
---

# Canvas Architecture Skill

Use this skill when modifying, extending, or debugging the interactive node-based canvas system ([HeroCanvas.jsx](file:///Users/thomasrynell/proj/droplet/src/components/HeroCanvas.jsx), [BrandCard.jsx](file:///Users/thomasrynell/proj/droplet/src/components/BrandCard.jsx), and [ConnectorLine.jsx](file:///Users/thomasrynell/proj/droplet/src/components/ConnectorLine.jsx)).

## Core Principles

1. **Z-Index Layering**:
   - Background grid/lines must sit below everything (`z-index: -1` or lower).
   - `ConnectorLine` components draw paths between nodes and must sit below the nodes themselves.
   - Interactive `BrandCard` nodes must sit on top to capture hover, click, and drag actions cleanly.
   - Modals and Overlays must be on top of all canvas layers.

2. **Pan & Zoom Controls**:
   - The canvas supports panning and zooming. When modifying the zoom logic, ensure touch bounds are validated.
   - When introducing "Edit Mode", freeze panning/zooming if the user is actively dragging or editing a node.

3. **Responsive Connectors**:
   - Connector paths are calculated dynamically based on node coordinates. 
   - When resizing the browser window, ensure connector coordinates recalculate smoothly.
