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
import assetFiles from '../assetsData.json';

const nodeTypes = {
  brandCard: BrandCard,
};

// Pull the specific logo image and one dynamic image
const primaryLogoImage = '/assets/branding/droplet_logo.png';
const brandingGuideImage = '/assets/branding/droplet_branding_guide_drop_25_ads.webp';

const initialNodes = [
  {
    id: '1',
    type: 'brandCard',
    position: { x: 50, y: 150 },
    data: {
      title: 'Primary Logo',
      subtitle: 'The core identity',
      image: primaryLogoImage,
      description: 'Used across all main touchpoints as the primary identifier.'
    },
  },
  {
    id: '2',
    type: 'brandCard',
    position: { x: 550, y: 0 },
    data: {
      title: 'Branding Guide',
      subtitle: 'Guidelines & Usage',
      image: brandingGuideImage,
      description: 'Comprehensive guidelines for using the Droplet identity across all campaigns.'
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
  {
    id: '4',
    type: 'brandCard',
    position: { x: 1050, y: 100 },
    data: {
      title: 'Video',
      subtitle: 'Seedance 2.0',
      video: '/assets/videos/droplet_Seedance 2.0_2026-06-26_11-08-17.mp4',
      description: 'Droplet Seedance 2.0 promotional video.'
    },
  },
  {
    id: '5',
    type: 'brandCard',
    position: { x: 1050, y: 500 },
    data: {
      title: 'Video',
      subtitle: 'Logo Animation',
      video: '/assets/videos/start_with_the_attached_logo_.mp4',
      description: 'Animated intro sequence starting with the logo.'
    },
  },
  {
    id: '6',
    type: 'brandCard',
    position: { x: 1050, y: -250 },
    data: {
      title: 'Ads Mockups',
      subtitle: 'Campaign Previews',
      image: brandingGuideImage,
      description: 'Preview of Droplet ad placements across various media.'
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
  { id: 'e3-4', source: '3', target: '4', ...edgeOptions, style: { stroke: 'var(--accent-blue)', strokeWidth: 2 } },
  { id: 'e3-5', source: '3', target: '5', ...edgeOptions, style: { stroke: 'rgba(255,255,255,0.4)', strokeWidth: 2 } },
  { id: 'e2-6', source: '2', target: '6', ...edgeOptions, style: { stroke: 'var(--accent-neon)', strokeWidth: 2 } },
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
