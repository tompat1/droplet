import React, { useCallback } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import BrandCard from './BrandCard';

const nodeTypes = {
  brandCard: BrandCard,
};

// Use the placeholder images we generated and moved to the public folder
const abstractGlass = '/assets/branding/abstract_glass_shape_1782457471807.png';
const neonGradient = '/assets/branding/neon_fluid_gradient_1782457482474.png';
const premiumMetal = '/assets/branding/premium_metallic_texture_1782457491692.png';

const initialNodes = [
  {
    id: '1',
    type: 'brandCard',
    position: { x: 50, y: 150 },
    data: {
      title: 'Primary Logo',
      subtitle: 'The core identity',
      image: abstractGlass,
      description: 'Used across all main touchpoints as the primary identifier.'
    },
  },
  {
    id: '2',
    type: 'brandCard',
    position: { x: 550, y: 0 },
    data: {
      title: 'Brand Colors',
      subtitle: 'Neon & Dark Mode',
      image: neonGradient,
      description: 'Primary gradient used for active states, CTA buttons, and highlights.'
    },
  },
  {
    id: '3',
    type: 'brandCard',
    position: { x: 550, y: 400 },
    data: {
      title: 'Brand Video',
      subtitle: 'Pomelli Creative',
      video: '/assets/videos/pomelli_creative_video_9_16_0523.mp4',
      description: 'Dynamic motion graphics and campaign hero video.'
    },
  },
];

const edgeOptions = {
  animated: true,
  style: { strokeWidth: 2 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
  },
};

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', ...edgeOptions, style: { stroke: 'var(--accent-neon)', strokeWidth: 2 } },
  { id: 'e1-3', source: '1', target: '3', ...edgeOptions, style: { stroke: 'var(--accent-purple)', strokeWidth: 2 } },
];

export default function HeroCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'rgba(255,255,255,0.5)', strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  return (
    <div style={{ width: '100%', height: '85vh', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '5%', left: '5%', zIndex: 10, pointerEvents: 'none' }}>
        <h1 style={{ fontSize: '4.5rem', marginBottom: '10px' }}>
          <span className="text-gradient">Droplet</span> Brand Space
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)', maxWidth: '500px', pointerEvents: 'auto' }}>
          Explore the interconnected assets of your digital identity. Drag to move the cards, scroll to zoom in/out.
        </p>
      </div>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.5}
        maxZoom={2}
      >
        <Background color="#ffffff" gap={24} size={1} opacity={0.05} />
        <Controls 
          showInteractive={false} 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            backgroundColor: 'rgba(255,255,255,0.05)', 
            backdropFilter: 'blur(10px)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '8px', 
            overflow: 'hidden' 
          }} 
        />
      </ReactFlow>
    </div>
  );
}
