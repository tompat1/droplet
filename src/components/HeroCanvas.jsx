import React, { useCallback, useState } from 'react';
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
import MediaModal from './MediaModal';
import assetFiles from '../assetsData.json';

const nodeTypes = {
  brandCard: BrandCard,
};

// Pull the specific logo image and one dynamic image
const primaryLogoImage = '/assets/branding/droplet_logo.png';
const brandingGuideImage = '/assets/branding/droplet_branding_guide_drop.webp';
const adsMockupsImage = '/assets/branding/droplet_branding_guide_drop_25_ads.webp';

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
      image: adsMockupsImage,
      description: 'Preview of Droplet ad placements across various media.'
    },
  },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', animated: true, style: { stroke: '#4B5EFA', strokeWidth: 4 } },
  { id: 'e1-3', source: '1', target: '3', type: 'smoothstep', animated: true, style: { stroke: '#7928ca', strokeWidth: 4 } },
  { id: 'e3-4', source: '3', target: '4', type: 'smoothstep', animated: true, style: { stroke: '#00ffcc', strokeWidth: 4 } },
  { id: 'e3-5', source: '3', target: '5', type: 'smoothstep', animated: true, style: { stroke: '#ffffff', strokeWidth: 4 } },
  { id: 'e2-6', source: '2', target: '6', type: 'smoothstep', animated: true, style: { stroke: '#4B5EFA', strokeWidth: 4 } },
];

export default function HeroCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [activeMedia, setActiveMedia] = useState(null);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'rgba(255,255,255,0.5)', strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event, node) => {
    if (node.data.image) {
      setActiveMedia({ type: 'image', src: node.data.image, title: node.data.title });
    } else if (node.data.video) {
      setActiveMedia({ type: 'video', src: node.data.video, title: node.data.title });
    }
  }, []);

  return (
    <div style={{ width: '100%', height: '85vh', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '5%', left: '5%', zIndex: 10, pointerEvents: 'none' }}>
        <h1 style={{ fontSize: '4.5rem', marginBottom: '10px' }}>
          <span className="text-gradient">Droplet</span> Brand Space
        </h1>
        <div style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.8)', maxWidth: '500px', pointerEvents: 'auto', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '16px' }}>
            Through these nodes we showcase how the origin logo branches out by branding- and color-guides with the creation of new assets like images, videos and ad mocks.
          </p>
          <p>
            This is how powerful the branding experience can be. Let us help you add beautiful branding-variation and together we’ll push the branding-experience forward!
          </p>
        </div>
      </div>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
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
      
      <MediaModal media={activeMedia} onClose={() => setActiveMedia(null)} />
    </div>
  );
}
