import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  ControlButton,
  MarkerType,
  Panel,
  useViewport
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import BrandCard from './BrandCard';
import MediaModal from './MediaModal';
import assetFiles from '../assetsData.json';

const ZoomIndicator = () => {
  const { zoom } = useViewport();
  return (
    <div style={{ color: '#fff', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '0.9rem', pointerEvents: 'none', textShadow: '0 2px 4px rgba(0,0,0,0.8)', textAlign: 'center', marginBottom: '8px' }}>
      {Math.round(zoom * 100)}%
    </div>
  );
};

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

const MultiSelectHint = () => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <Panel position="bottom-left" style={{ margin: '20px', zIndex: 10 }}>
      <div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          background: isHovered ? 'rgba(20,20,25,0.8)' : 'rgba(20,20,25,0.4)',
          backdropFilter: 'blur(10px)',
          border: isHovered ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(75, 94, 250, 0.5)',
          padding: '8px 12px',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: isHovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.8)',
          cursor: 'help',
          transition: 'all 0.3s ease',
          boxShadow: isHovered ? '0 4px 6px rgba(0,0,0,0.1)' : '0 0 15px rgba(75, 94, 250, 0.5)',
          animation: isHovered ? 'none' : 'bounce-subtle 2s infinite ease-in-out'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 16v-4"></path>
          <path d="M12 8h.01"></path>
        </svg>
        <div style={{
          width: isHovered ? '600px' : '0px',
          opacity: isHovered ? 1 : 0,
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          whiteSpace: 'nowrap',
          fontSize: '0.85rem'
        }}>
          Drag in the Canvas to multi-select &nbsp;&nbsp;|&nbsp;&nbsp; Hold <kbd style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace' }}>Space</kbd> to move canvas &nbsp;&nbsp;|&nbsp;&nbsp; Refresh to reset view
        </div>
      </div>
    </Panel>
  );
};

const nodeTypes = {
  brandCard: BrandCard,
};

// Pull the specific logo image and one dynamic image
const primaryLogoImage = '/assets/branding/droplet_logo.png';
const brandingGuideImage = '/assets/branding/droplet_branding_guide_drop.webp';
const adsMockupsImage = '/assets/branding/droplet_branding_guide_drop_25_ads.webp';
const productImagesImage = '/assets/branding/merch/droplet_asset_005.webp';
const inTheWildHeaderImage = '/assets/branding/droplet_inthewild_merch_cap_010.webp';

const videos = assetFiles['Campaign Videos'] || [];
const ads = assetFiles['Canvas Ads'] || [];
const inTheWildProducts = assetFiles['Canvas In The Wild Products'] || [];
const productShots = assetFiles['Canvas Products Shots'] || [];

const brandColors = [
  { name: 'Tidal Cobalt', hex: '#4C5CFF' },
  { name: 'Signal Ember', hex: '#FF6A00' },
  { name: 'Quarry Bone', hex: '#F3EEE5' },
  { name: 'Midnight Utility', hex: '#111317' },
  { name: 'Chrome Drift', hex: '#A6ACB8' },
  { name: 'Deep Moss', hex: '#3F4A38' },
  { name: 'Violet Dusk', hex: '#5B4A6F' },
  { name: 'Terra Root', hex: '#6B5445' },
];

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
    position: { x: 460, y: 240 },
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
    position: { x: 870, y: -190 },
    data: {
      title: 'Ads Mockups',
      subtitle: 'Campaign Previews',
      image: adsMockupsImage,
      description: 'Preview of Droplet ad placements across various media.',
      nodeGroup: 'ads'
    },
  },
  {
    id: '8',
    type: 'brandCard',
    position: { x: 870, y: -620 },
    data: {
      title: 'Color Palette',
      subtitle: 'Brand Core Colors',
      colors: brandColors,
      description: 'The definitive Droplet color system for all applications.',
      nodeGroup: 'products'
    },
  },
  {
    id: '7',
    type: 'brandCard',
    position: { x: 1280, y: -620 },
    data: {
      title: 'In The Wild Products',
      subtitle: 'Merch on Location',
      image: inTheWildHeaderImage,
      description: 'High quality lifestyle photography of physical products in the wild.',
      nodeGroup: 'wild_products'
    },
  },
  {
    id: '9',
    type: 'brandCard',
    position: { x: 1280, y: -1050 },
    data: {
      title: 'Product Shots',
      subtitle: 'Studio Photography',
      image: productImagesImage,
      description: 'High quality studio photography of physical products and merch.',
      nodeGroup: 'product_shots'
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
      position: { x: 870, y: 480 },
      data: {
        title: 'Brand Video',
        subtitle: 'Hero Campaign',
        video: `/assets/videos/${videoFilename}`,
        description: 'Dynamic motion graphics and campaign hero video.',
        nodeGroup: 'videos'
      }
    };
  }

  return {
    id,
    type: 'brandCard',
    position: { x: 1280 + ((index - 1) * 410), y: 480 },
    data: {
      title: 'Video',
      subtitle: title.substring(0, 20) + (title.length > 20 ? '...' : ''),
      video: `/assets/videos/${videoFilename}`,
      description: `Droplet extended video showcase.`,
      nodeGroup: 'videos'
    }
  };
});

const adNodes = ads.map((adFilename, index) => {
  const id = `ad-${index}`;
  const title = adFilename.split('/').pop().replace(/\.(webp|png|jpg)$/i, '').replace(/_/g, ' ');

  return {
    id,
    type: 'brandCard',
    position: { x: 1280 + (index * 410), y: -190 },
    data: {
      title: 'Ad Mockup',
      subtitle: title.substring(0, 20) + (title.length > 20 ? '...' : ''),
      image: `/assets/branding/${adFilename}`,
      description: `Droplet ad placement showcase.`,
      nodeGroup: 'ads'
    }
  };
});


const inTheWildNodes = inTheWildProducts.map((productFilename, index) => {
  const id = `wild-${index}`;
  const title = productFilename.split('/').pop().replace(/\.(webp|png|jpg)$/i, '').replace(/_/g, ' ');

  return {
    id,
    type: 'brandCard',
    position: { x: 1690 + (index * 410), y: -620 },
    data: {
      title: 'In The Wild',
      subtitle: title.substring(0, 20) + (title.length > 20 ? '...' : ''),
      image: `/assets/branding/${productFilename}`,
      description: `Droplet physical product showcase.`,
      nodeGroup: 'wild_products'
    }
  };
});

const productShotNodes = productShots.map((productFilename, index) => {
  const id = `shot-${index}`;
  const title = productFilename.split('/').pop().replace(/\.(webp|png|jpg)$/i, '').replace(/_/g, ' ');

  return {
    id,
    type: 'brandCard',
    position: { x: 1690 + (index * 410), y: -1050 },
    data: {
      title: 'Product Shot',
      subtitle: title.substring(0, 20) + (title.length > 20 ? '...' : ''),
      image: `/assets/branding/${productFilename}`,
      description: `Droplet studio product showcase.`,
      nodeGroup: 'product_shots'
    }
  };
});

const initialNodes = [
  {
    id: 'padding-node',
    position: { x: -500, y: 0 },
    style: { opacity: 0, pointerEvents: 'none', border: 'none', background: 'transparent', width: 1, height: 1 },
    data: { label: '' }
  },
  ...staticNodes, 
  ...videoNodes,
  ...adNodes,
  ...inTheWildNodes,
  ...productShotNodes
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', animated: true, style: { stroke: '#4B5EFA', strokeWidth: 4 } },
  { id: 'e2-6', source: '2', target: '6', type: 'smoothstep', animated: true, style: { stroke: '#4B5EFA', strokeWidth: 4 } },
  { id: 'e2-8', source: '2', target: '8', type: 'smoothstep', animated: true, style: { stroke: '#FF6A00', strokeWidth: 4 } },
  { id: 'e8-7', source: '8', target: '7', type: 'smoothstep', animated: true, style: { stroke: '#ff00ff', strokeWidth: 4 } },
  { id: 'e8-9', source: '8', target: '9', type: 'smoothstep', animated: true, style: { stroke: '#f5a623', strokeWidth: 4 } },
];

if (videos.length > 0) {
  initialEdges.push({ id: 'e2-3', source: '2', target: '3', type: 'smoothstep', animated: true, style: { stroke: '#00ffcc', strokeWidth: 4 } });
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

ads.forEach((adFilename, index) => {
  const targetId = `ad-${index}`;
  const sourceId = index === 0 ? '6' : `ad-${index - 1}`;
  const colors = ['#4B5EFA', '#00ffcc', '#ff00ff', '#f5a623'];
  const strokeColor = colors[index % colors.length];
  
  initialEdges.push({
    id: `e${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    type: 'smoothstep',
    animated: true,
    style: { stroke: strokeColor, strokeWidth: 4 }
  });
});

inTheWildProducts.forEach((productFilename, index) => {
  const targetId = `wild-${index}`;
  const sourceId = index === 0 ? '7' : `wild-${index - 1}`;
  const colors = ['#ff00ff', '#f5a623', '#4B5EFA', '#00ffcc'];
  const strokeColor = colors[index % colors.length];
  
  initialEdges.push({
    id: `e${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    type: 'smoothstep',
    animated: true,
    style: { stroke: strokeColor, strokeWidth: 4 }
  });
});

productShots.forEach((productFilename, index) => {
  const targetId = `shot-${index}`;
  const sourceId = index === 0 ? '9' : `shot-${index - 1}`;
  const colors = ['#f5a623', '#4B5EFA', '#00ffcc', '#ff00ff'];
  const strokeColor = colors[index % colors.length];
  
  initialEdges.push({
    id: `e${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    type: 'smoothstep',
    animated: true,
    style: { stroke: strokeColor, strokeWidth: 4 }
  });
});

const allCanvasMedias = initialNodes
  .filter(node => node.data && (node.data.image || node.data.video || node.data.colors))
  .map(node => ({
    type: node.data.image ? 'image' : (node.data.video ? 'video' : 'palette'),
    src: node.data.image || node.data.video || 'palette-' + node.id,
    title: node.data.title,
    colors: node.data.colors,
    nodeGroup: node.data.nodeGroup
  }));

export default function HeroCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [activeIndex, setActiveIndex] = useState(null);
  const [activeGroupMedias, setActiveGroupMedias] = useState([]);
  const activeMedia = activeIndex !== null ? activeGroupMedias[activeIndex] : null;
  
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
    const src = node.data.image || node.data.video || (node.data.colors ? 'palette-' + node.id : null);
    if (src) {
      const groupMedias = allCanvasMedias.filter(m => m.nodeGroup === node.data.nodeGroup);
      const index = groupMedias.findIndex(m => m.src === src);
      if (index !== -1) {
        setActiveGroupMedias(groupMedias);
        setActiveIndex(index);
      }
    }
  }, []);

  const handleNext = () => setActiveIndex(prev => (prev + 1) % activeGroupMedias.length);
  const handlePrev = () => setActiveIndex(prev => (prev - 1 + activeGroupMedias.length) % activeGroupMedias.length);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {!isFullscreen && (
        <div style={{ padding: '40px 5% 0 5%', zIndex: 10 }}>
          <h1 style={{ fontSize: '4.5rem', marginBottom: '10px', whiteSpace: 'nowrap' }}>
            <span className="text-gradient">Droplet</span> Brand Space
          </h1>
          <div className="glass-panel" style={{ width: 'max-content', maxWidth: '800px', padding: '24px', borderRadius: '16px', fontSize: '1.1rem', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>
            <p style={{ margin: 0 }}>
              From one origin logo to a full brand universe: guides, mockups, videos, merch, and campaign assets, ready whenever your brand needs them. Endless possibilities.
            </p>
          </div>
        </div>
      )}
      
      <div ref={containerRef} style={{ width: '100%', height: isFullscreen ? '100vh' : '72vh', position: 'relative', backgroundColor: isFullscreen ? '#050505' : 'transparent' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ nodes: [{ id: '1' }, { id: '2' }], padding: 0.3 }}
        selectionMode="partial"
        panOnDrag={false}
        selectionOnDrag={true}
        panOnScroll={true}
        selectionKeyCode={null}
        minZoom={0.2}
        maxZoom={2}
      >
        <Background color="#ffffff" gap={24} size={1} opacity={0.05} />
        <Panel position="top-left" style={{ margin: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', zIndex: 10 }}>
          <ZoomIndicator />
          <Controls 
            showInteractive={false} 
            showFitView={false}
            className="custom-flow-controls"
            style={{ position: 'relative', margin: 0, left: 'auto', right: 'auto', bottom: 'auto', top: 'auto' }}
          >
            <ControlButton onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
              {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
            </ControlButton>
          </Controls>
        </Panel>
        <MultiSelectHint />
      </ReactFlow>
      
      {activeMedia && (
        <MediaModal 
          media={activeMedia} 
          onClose={() => setActiveIndex(null)} 
          onNext={handleNext} 
          onPrev={handlePrev} 
        />
      )}
      </div>
    </div>
  );
}
