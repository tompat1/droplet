import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  ControlButton,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import BrandCard from './BrandCard';
import MediaModal from './MediaModal';
import assetFiles from '../assetsData.json';

const FullscreenIcon = () => (
  <svg viewBox="2 2 20 20">
    <path d="M3 3h7v2H5v5H3V3zm18 0h-7v2h5v5h2V3zM3 21h7v-2H5v-5H3v7zm18 0h-7v-2h5v-5h2v7z" />
  </svg>
);

const ExitFullscreenIcon = () => (
  <svg viewBox="2 2 20 20">
    <path d="M10 10H3V8h5V3h2v7zm4 0h7V8h-5V3h-2v7zm-4 4H3v2h5v5h2v-7zm4 0h7v2h-5v5h-2v-7z" />
  </svg>
);

const nodeTypes = {
  brandCard: BrandCard,
};

// Pull the specific logo image and one dynamic image
const primaryLogoImage = '/assets/branding/droplet_logo.png';
const brandingGuideImage = '/assets/branding/droplet_branding_guide_drop.webp';
const adsMockupsImage = '/assets/branding/droplet_branding_guide_drop_25_ads.webp';

const videos = assetFiles['Videos'] || [];

const staticNodes = [
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

const videoNodes = videos.map((videoFilename, index) => {
  const id = `video-${index}`;
  const title = videoFilename.replace(/\.(mp4|webm|mov)$/i, '').replace(/_/g, ' ');
  
  if (index === 0) {
    return {
      id: '3',
      type: 'brandCard',
      position: { x: 550, y: 400 },
      data: {
        title: 'Brand Video',
        subtitle: 'Hero Campaign',
        video: `/assets/videos/${videoFilename}`,
        description: 'Dynamic motion graphics and campaign hero video.'
      }
    };
  }

  return {
    id,
    type: 'brandCard',
    position: { x: 1050 + ((index - 1) * 500), y: 400 },
    data: {
      title: 'Video',
      subtitle: title.substring(0, 20) + (title.length > 20 ? '...' : ''),
      video: `/assets/videos/${videoFilename}`,
      description: `Droplet extended video showcase.`
    }
  };
});

const initialNodes = [...staticNodes, ...videoNodes];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', animated: true, style: { stroke: '#4B5EFA', strokeWidth: 4 } },
  { id: 'e2-6', source: '2', target: '6', type: 'smoothstep', animated: true, style: { stroke: '#4B5EFA', strokeWidth: 4 } },
];

if (videos.length > 0) {
  initialEdges.push({ id: 'e1-3', source: '1', target: '3', type: 'smoothstep', animated: true, style: { stroke: '#7928ca', strokeWidth: 4 } });
}

videos.forEach((videoFilename, index) => {
  if (index > 0) {
    const targetId = `video-${index}`;
    const sourceId = index === 1 ? '3' : `video-${index - 1}`;
    const colors = ['#00ffcc', '#ffffff', '#ff00ff', '#f5a623'];
    const strokeColor = colors[(index - 1) % colors.length];
    
    initialEdges.push({
      id: `e${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      type: 'smoothstep',
      animated: true,
      style: { stroke: strokeColor, strokeWidth: 4 }
    });
  }
});

export default function HeroCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [activeMedia, setActiveMedia] = useState(null);
  
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

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
    <div ref={containerRef} style={{ width: '100%', height: isFullscreen ? '100vh' : '85vh', position: 'relative', backgroundColor: isFullscreen ? '#050505' : 'transparent' }}>
      {!isFullscreen && (
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
      )}
      
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
          className="custom-flow-controls"
        >
          <ControlButton onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
            {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
          </ControlButton>
        </Controls>
      </ReactFlow>
      
      <MediaModal media={activeMedia} onClose={() => setActiveMedia(null)} />
    </div>
  );
}
