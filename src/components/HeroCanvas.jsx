import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  ControlButton,
  Panel,
  useViewport,
  MiniMap,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import BrandCard from './BrandCard';
import MediaModal from './MediaModal';
import assetFiles from '../assetsData.json';
import { defaultAssetTags } from '../defaultTags';
import { useAuth } from './AuthContext';
import { canvasApi } from '../lib/apiClient';

const ZoomIndicator = () => {
  const { zoom } = useViewport();
  return (
    <div style={{ color: '#fff', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '0.9rem', pointerEvents: 'none', textShadow: '0 2px 4px rgba(0,0,0,0.8)', textAlign: 'center', marginBottom: '8px' }}>
      {Math.round(zoom * 100)}%
    </div>
  );
};

const ZoomToOneButton = () => {
  const { zoomTo } = useReactFlow();
  return (
    <ControlButton onClick={() => zoomTo(1, { duration: 400 })} title="Zoom 1:1">
      <span style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace' }}>1:1</span>
    </ControlButton>
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

const MultiSelectHint = ({ interactionMode }) => {
  const [isHovered, setIsHovered] = useState(false);
  const kbdStyle = { background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace' };
  
  return (
    <Panel position="bottom-left" style={{ margin: '20px', zIndex: 10 }}>
      <div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setIsHovered(!isHovered)}
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
          width: isHovered ? '700px' : '0px',
          opacity: isHovered ? 1 : 0,
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          whiteSpace: 'nowrap',
          fontSize: '0.85rem'
        }}>
          {interactionMode === 'pan'
            ? <>Hold <kbd style={kbdStyle}>Shift</kbd> or <kbd style={kbdStyle}>Cmd</kbd> + Drag to multi-select &nbsp;&nbsp;|&nbsp;&nbsp; Drag to pan canvas &nbsp;&nbsp;|&nbsp;&nbsp; Scroll in MiniMap to Zoom</>
            : <>Drag in the Canvas to multi-select &nbsp;&nbsp;|&nbsp;&nbsp; Hold <kbd style={kbdStyle}>Space</kbd> to move canvas &nbsp;&nbsp;|&nbsp;&nbsp; Scroll in MiniMap to Zoom</>
          }
        </div>
      </div>
    </Panel>
  );
};

const galleryAssets = [];
Object.keys(assetFiles).forEach(key => {
  if (key === 'Canvas Ads' || key === 'Canvas In The Wild Products' || key === 'Canvas Products Shots') return;
  assetFiles[key].forEach(filename => {
    const isVideo = key === 'Campaign Videos' || filename.match(/\.(mp4|webm|mov)$/i);
    const basename = filename.split('/').pop();
    const title = basename.replace(/\.(webp|png|jpg|mp4|webm|mov)$/i, '').replace(/[-_]/g, ' ');
    const mediaSrc = isVideo ? `/assets/videos/${filename}` : `/assets/branding/${filename}`;
    galleryAssets.push({ id: `gallery-${filename}`, type: 'gallery', src: mediaSrc, title, subtitle: `Gallery: ${key}`, originalTitle: basename });
  });
});

const NodeSearch = () => {
  const { setCenter, getNodes, setNodes } = useReactFlow();
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [assetTags, setAssetTags] = useState(() => {
    try {
      const stored = localStorage.getItem('gallery-asset-tags');
      if (stored) return JSON.parse(stored);
    } catch(e) {
      console.warn('Failed to parse asset tags from localStorage:', e);
    }
    return defaultAssetTags;
  });

  useEffect(() => {
    const handleTagsUpdate = () => {
      try {
        const stored = localStorage.getItem('gallery-asset-tags');
        if (stored) setAssetTags(JSON.parse(stored));
      } catch(e) {
        console.warn('Failed to update asset tags from localStorage:', e);
      }
    };
    window.addEventListener('customTagsUpdated', handleTagsUpdate);
    return () => window.removeEventListener('customTagsUpdated', handleTagsUpdate);
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSuggestions([]);
      return;
    }

    const term = searchTerm.toLowerCase().replace(/[-_]/g, ' ');
    const nodes = getNodes();
    
    const nodeMatches = nodes.filter(n => 
      n.id !== 'padding-node' &&
      !n.hidden &&
      n.data && 
      ((n.data.title && n.data.title.toLowerCase().replace(/[-_]/g, ' ').includes(term)) || 
       (n.data.subtitle && n.data.subtitle.toLowerCase().replace(/[-_]/g, ' ').includes(term)) ||
       (n.data.image && n.data.image.toLowerCase().replace(/[-_]/g, ' ').includes(term)) ||
       (n.data.video && n.data.video.toLowerCase().replace(/[-_]/g, ' ').includes(term)))
    ).map(n => ({ ...n, searchType: 'canvas' }));

    const galleryMatches = galleryAssets.filter(g => {
      const tags = assetTags[g.src] || [];
      const tagMatch = tags.some(tag => tag.toLowerCase().replace(/[-_]/g, ' ').includes(term));
      
      return tagMatch ||
        g.title.toLowerCase().replace(/[-_]/g, ' ').includes(term) || 
        g.subtitle.toLowerCase().replace(/[-_]/g, ' ').includes(term) ||
        g.originalTitle.toLowerCase().replace(/[-_]/g, ' ').includes(term);
    }).map(g => ({ ...g, searchType: 'gallery' }));

    setSuggestions([...nodeMatches, ...galleryMatches]);
  }, [searchTerm, assetTags, getNodes]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setShowSuggestions(true);
  };

  const handleSelect = (item) => {
    setSearchHistory(prev => {
      const filtered = prev.filter(p => p.id !== item.id);
      return [item, ...filtered].slice(0, 5);
    });
    setSearchTerm('');
    setSuggestions([]);
    setShowSuggestions(false);
    if (item.searchType === 'canvas') {
      setCenter(item.position.x + 180, item.position.y + 200, { zoom: 1.2, duration: 800 });
      
      setNodes((nds) => nds.map((n) => {
        if (n.id === item.id) {
          return { ...n, data: { ...n.data, isHighlighted: true } };
        }
        return n;
      }));
      
      setTimeout(() => {
        setNodes((nds) => nds.map((n) => {
          if (n.id === item.id) {
            return { ...n, data: { ...n.data, isHighlighted: false } };
          }
          return n;
        }));
      }, 3000);
    } else {
      window.dispatchEvent(new CustomEvent('openGalleryItem', { detail: item.src }));
      const galleryEl = document.getElementById('asset-gallery');
      if (galleryEl) {
        galleryEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <Panel position="top-center" style={{ marginTop: '20px', zIndex: 20 }}>
      <div ref={wrapperRef} style={{ position: 'relative', width: '300px' }}>
        <input 
          type="text"
          placeholder="Search canvas nodes and gallery..."
          value={searchTerm}
          onChange={handleSearchChange}
          style={{
            width: '100%',
            padding: '12px 36px 12px 20px',
            borderRadius: '24px',
            background: 'rgba(20, 20, 25, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fff',
            fontSize: '0.95rem',
            outline: 'none',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            transition: 'border-color 0.3s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--accent-blue)';
            setShowSuggestions(true);
          }}
          onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
        />
        
        {searchTerm && (
          <button 
            onClick={() => { setSearchTerm(''); setSuggestions([]); setShowSuggestions(false); }}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '50%',
            }}
            onMouseOver={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.9)'}
            onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
        
        {showSuggestions && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '8px',
            background: 'rgba(20, 20, 25, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            maxHeight: '350px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {searchTerm.trim() === '' ? (
              <>
                <div style={{ 
                  padding: '8px 16px', 
                  fontSize: '0.75rem', 
                  color: 'rgba(255,255,255,0.5)', 
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.2)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Explore Tags
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  {(() => {
                    const stored = localStorage.getItem('gallery-available-tags');
                    const tags = stored ? JSON.parse(stored) : ['apparel', 'merch', 'video', 'neon', 'mockup', 'social'];
                    return tags.map(tag => (
                      <span 
                        key={tag}
                        onClick={() => {
                          setSearchTerm(tag);
                          setShowSuggestions(true);
                        }}
                        style={{
                          padding: '4px 10px',
                          background: 'rgba(75, 94, 250, 0.2)',
                          color: 'var(--accent-blue)',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          border: '1px solid rgba(75, 94, 250, 0.4)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(75, 94, 250, 0.4)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(75, 94, 250, 0.2)'; e.currentTarget.style.color = 'var(--accent-blue)'; }}
                      >
                        #{tag}
                      </span>
                    ));
                  })()}
                </div>
                {searchHistory.length > 0 && (
                  <>
                    <div style={{ 
                      padding: '8px 16px', 
                      fontSize: '0.75rem', 
                      color: 'rgba(255,255,255,0.5)', 
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(0,0,0,0.2)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Recent Searches
                    </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {searchHistory.map((item, index) => (
                    <div 
                      key={`history-${item.id}-${index}`}
                      onClick={() => handleSelect(item)}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ color: 'rgba(255,255,255,0.4)', display: 'flex' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                          </div>
                          <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#fff' }}>
                            {item.searchType === 'canvas' ? item.data.title : item.title}
                          </div>
                        </div>
                        <div style={{ 
                          fontSize: '0.65rem', 
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          background: item.searchType === 'canvas' ? 'rgba(75, 94, 250, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                          color: item.searchType === 'canvas' ? 'var(--accent-blue)' : 'rgba(255,255,255,0.6)',
                          textTransform: 'uppercase',
                          fontWeight: 'bold'
                        }}>
                          {item.searchType}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                </>
                )}
              </>
            ) : (
              <>
                <div style={{ 
                  padding: '8px 16px', 
                  fontSize: '0.75rem', 
                  color: 'rgba(255,255,255,0.5)', 
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.2)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {suggestions.length} result{suggestions.length !== 1 ? 's' : ''} found
                </div>
                
                {suggestions.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                    No matches found for "{searchTerm}"
                  </div>
                ) : (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {suggestions.map((item, index) => (
              <div 
                key={item.id}
                onClick={() => handleSelect(item)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                      color: 'rgba(255,255,255,0.4)', 
                      fontSize: '0.75rem', 
                      fontFamily: 'monospace',
                      width: '24px'
                    }}>
                      {index + 1}.
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#fff' }}>
                      {item.searchType === 'canvas' ? item.data.title : item.title}
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: '0.65rem', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    background: item.searchType === 'canvas' ? 'rgba(75, 94, 250, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    color: item.searchType === 'canvas' ? 'var(--accent-blue)' : 'rgba(255,255,255,0.6)',
                    textTransform: 'uppercase',
                    fontWeight: 'bold'
                  }}>
                    {item.searchType}
                  </div>
                </div>
                {(item.searchType === 'canvas' ? item.data.subtitle : item.subtitle) && (
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    {item.searchType === 'canvas' ? item.data.subtitle : item.subtitle}
                  </div>
                )}
              </div>
            ))}
              </div>
            )}
              </>
            )}
          </div>
        )}
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

const createDefaultCanvasSnapshot = () => ({
  nodes: initialNodes.map(sanitizeNodeForSave),
  edges: initialEdges.map(sanitizeEdgeForSave),
  viewport: {},
  settings: { interactionMode: 'pan' },
  collapsedBranches: {}
});

const sanitizeNodeForSave = (node) => {
  const data = { ...(node.data || {}) };
  delete data.setGlobalNodes;
  delete data.setGlobalEdges;
  delete data.onToggleCollapse;
  delete data.isHighlighted;
  delete data.isParentCollapsed;
  delete data.parentOffsetX;
  delete data.parentOffsetY;
  delete data.canCollapse;
  delete data.isCollapsed;
  delete data.isEditMode;

  return {
    id: String(node.id),
    type: node.type,
    position: node.position || { x: 0, y: 0 },
    width: node.width,
    height: node.height,
    hidden: node.hidden === true,
    zIndex: node.zIndex,
    data,
    style: node.style || {}
  };
};

const sanitizeEdgeForSave = (edge) => ({
  id: String(edge.id),
  source: String(edge.source),
  target: String(edge.target),
  sourceHandle: edge.sourceHandle,
  targetHandle: edge.targetHandle,
  type: edge.type,
  animated: edge.animated === true,
  data: edge.data || {},
  style: edge.style || {}
});

const buildCanvasPayload = ({ name, nodes, edges, viewport, collapsedBranches, interactionMode }) => ({
  name,
  viewport,
  settings: { interactionMode, collapsedBranches },
  snapshot: {
    nodes: nodes.map(sanitizeNodeForSave),
    edges: edges.map(sanitizeEdgeForSave),
    viewport,
    settings: { interactionMode, collapsedBranches },
    collapsedBranches
  }
});

const CanvasPersistencePanel = ({
  user,
  canvases,
  setCanvases,
  activeCanvasId,
  setActiveCanvasId,
  activeCanvasName,
  setActiveCanvasName,
  nodes,
  setNodes,
  edges,
  setEdges,
  collapsedBranches,
  setCollapsedBranches,
  interactionMode,
  setInteractionMode,
  status,
  setStatus
}) => {
  const { getViewport, setViewport, fitView } = useReactFlow();
  const [isBusy, setIsBusy] = useState(false);
  const [draftName, setDraftName] = useState(activeCanvasName || 'Fluid Node Canvas');

  useEffect(() => {
    setDraftName(activeCanvasName || 'Fluid Node Canvas');
  }, [activeCanvasName]);

  const refreshCanvases = useCallback(async () => {
    if (!user) {
      setCanvases([]);
      setActiveCanvasId(null);
      setActiveCanvasName('');
      return;
    }

    const payload = await canvasApi.list();
    setCanvases(payload.canvases || []);
  }, [setActiveCanvasId, setActiveCanvasName, setCanvases, user]);

  useEffect(() => {
    refreshCanvases().catch((err) => setStatus(err.message));
  }, [refreshCanvases, setStatus]);

  const applyCanvasSnapshot = useCallback((canvas) => {
    const snapshot = canvas.snapshot || {};
    const nextNodes = Array.isArray(snapshot.nodes) && snapshot.nodes.length > 0 ? snapshot.nodes : initialNodes;
    const nextEdges = Array.isArray(snapshot.edges) ? snapshot.edges : initialEdges;
    const nextCollapsedBranches = snapshot.collapsedBranches || snapshot.settings?.collapsedBranches || {};
    const nextInteractionMode = snapshot.settings?.interactionMode || canvas.settings?.interactionMode || 'pan';

    setNodes(nextNodes);
    setEdges(nextEdges);
    setCollapsedBranches(nextCollapsedBranches);
    setInteractionMode(nextInteractionMode);
    setActiveCanvasId(canvas.id);
    setActiveCanvasName(canvas.name || 'Fluid Node Canvas');
    setDraftName(canvas.name || 'Fluid Node Canvas');

    if (snapshot.viewport && Number.isFinite(snapshot.viewport.zoom)) {
      setViewport(snapshot.viewport, { duration: 250 });
    } else {
      window.requestAnimationFrame(() => fitView({ duration: 350, nodes: [{ id: '1' }, { id: '2' }], maxZoom: 0.5 }));
    }
  }, [fitView, setActiveCanvasId, setActiveCanvasName, setCollapsedBranches, setEdges, setInteractionMode, setNodes, setViewport]);

  const loadCanvas = async (canvasId) => {
    if (!canvasId) return;
    setIsBusy(true);
    setStatus('Loading canvas...');
    try {
      const payload = await canvasApi.get(canvasId);
      applyCanvasSnapshot(payload.canvas);
      setStatus('Canvas loaded.');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  const saveCanvas = async () => {
    if (!user) {
      setStatus('Login to save canvases.');
      return;
    }

    const name = draftName.trim() || activeCanvasName || 'Fluid Node Canvas';
    const payload = buildCanvasPayload({
      name,
      nodes,
      edges,
      viewport: getViewport(),
      collapsedBranches,
      interactionMode
    });

    setIsBusy(true);
    setStatus(activeCanvasId ? 'Saving canvas...' : 'Creating canvas...');
    try {
      const result = activeCanvasId
        ? await canvasApi.update(activeCanvasId, payload)
        : await canvasApi.create(payload);
      const saved = result.canvas;
      setActiveCanvasId(saved.id);
      setActiveCanvasName(saved.name);
      setDraftName(saved.name);
      await refreshCanvases();
      setStatus('Canvas saved.');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  const createNewCanvas = async () => {
    if (!user) {
      setStatus('Login to create canvases.');
      return;
    }

    const name = window.prompt('Name this new canvas:', 'New Fluid Node Canvas');
    if (!name) return;

    const snapshot = createDefaultCanvasSnapshot();
    const payload = {
      name: name.trim() || 'New Fluid Node Canvas',
      viewport: snapshot.viewport,
      settings: snapshot.settings,
      snapshot
    };

    setIsBusy(true);
    setStatus('Creating canvas...');
    try {
      const result = await canvasApi.create(payload);
      await refreshCanvases();
      applyCanvasSnapshot(result.canvas);
      setStatus('New canvas created.');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  const panelStyle = {
    width: '260px',
    background: 'rgba(10,10,15,0.82)',
    backdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px',
    padding: '12px',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    zIndex: 15,
    boxShadow: '0 14px 40px rgba(0,0,0,0.35)'
  };

  const controlStyle = {
    minHeight: '36px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    padding: '0 10px',
    outline: 'none'
  };

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Canvas</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>{user ? (activeCanvasName || 'Unsaved Canvas') : 'Login required'}</div>
        </div>
        <button type="button" onClick={createNewCanvas} disabled={!user || isBusy} style={{ ...controlStyle, cursor: user && !isBusy ? 'pointer' : 'not-allowed', opacity: user ? 1 : 0.5 }}>
          New
        </button>
      </div>

      {user && (
        <>
          <select
            value={activeCanvasId || ''}
            onChange={(event) => loadCanvas(event.target.value)}
            disabled={isBusy}
            style={controlStyle}
            aria-label="Load saved canvas"
          >
            <option value="">Unsaved canvas</option>
            {canvases.map((canvas) => (
              <option key={canvas.id} value={canvas.id}>{canvas.name}</option>
            ))}
          </select>

          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            disabled={isBusy}
            style={controlStyle}
            aria-label="Canvas name"
          />

          <button
            type="button"
            onClick={saveCanvas}
            disabled={isBusy}
            style={{
              ...controlStyle,
              borderColor: 'rgba(75,94,250,0.72)',
              background: 'linear-gradient(135deg, rgba(75,94,250,0.88), rgba(0,255,204,0.28))',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              fontWeight: 800
            }}
          >
            {isBusy ? 'Working...' : activeCanvasId ? 'Save Canvas' : 'Create & Save'}
          </button>
        </>
      )}

      {status && (
        <div style={{ fontSize: '0.78rem', color: status.includes('failed') || status.includes('required') || status.includes('Login') ? '#ffb4b4' : 'rgba(255,255,255,0.68)' }}>
          {status}
        </div>
      )}
    </div>
  );
};

export default function HeroCanvas() {
  const { user } = useAuth();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [activeIndex, setActiveIndex] = useState(null);
  const [activeGroupMedias, setActiveGroupMedias] = useState([]);
  const activeMedia = activeIndex !== null ? activeGroupMedias[activeIndex] : null;
  const [canvases, setCanvases] = useState([]);
  const [activeCanvasId, setActiveCanvasId] = useState(null);
  const [activeCanvasName, setActiveCanvasName] = useState('');
  const [canvasStatus, setCanvasStatus] = useState('');
  
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [collapsedBranches, setCollapsedBranches] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [interactionMode, setInteractionMode] = useState('pan');

  useEffect(() => {
    const handleToggle = (id) => {
      setCollapsedBranches(prev => ({ ...prev, [id]: !prev[id] }));
    };

    setNodes((nds) => {
      const parentPositions = {};
      nds.forEach(n => {
        if (['3', '6', '7', '9'].includes(n.id)) {
          parentPositions[n.id] = n.position;
        }
      });

      return nds.map(node => {
        let isParentCollapsed = false;
        let parentId = null;
        
        if (node.id.startsWith('ad-')) {
          parentId = '6';
          if (collapsedBranches['6']) isParentCollapsed = true;
        } else if (node.id.startsWith('wild-')) {
          parentId = '7';
          if (collapsedBranches['7']) isParentCollapsed = true;
        } else if (node.id.startsWith('shot-')) {
          parentId = '9';
          if (collapsedBranches['9']) isParentCollapsed = true;
        } else if (node.id.startsWith('video-') && node.id !== '3') {
          parentId = '3';
          if (collapsedBranches['3']) isParentCollapsed = true;
        }
        
        let parentOffsetX = 0;
        let parentOffsetY = 0;
        if (parentId && parentPositions[parentId]) {
          parentOffsetX = parentPositions[parentId].x - node.position.x;
          parentOffsetY = parentPositions[parentId].y - node.position.y;
        }

        const canCollapse = ['3', '6', '7', '9'].includes(node.id);
        
        return { 
          ...node, 
          hidden: false,
          data: {
            ...node.data,
            canCollapse,
            isCollapsed: collapsedBranches[node.id] || false,
            isParentCollapsed,
            parentOffsetX,
            parentOffsetY,
            onToggleCollapse: handleToggle,
            setGlobalNodes: setNodes,
            setGlobalEdges: setEdges,
            isEditMode
          }
        };
      });
    });
    
    setEdges((eds) => eds.map(edge => {
      let isParentCollapsed = false;
      if (edge.target.startsWith('ad-') && collapsedBranches['6']) isParentCollapsed = true;
      if (edge.target.startsWith('wild-') && collapsedBranches['7']) isParentCollapsed = true;
      if (edge.target.startsWith('shot-') && collapsedBranches['9']) isParentCollapsed = true;
      if (edge.target.startsWith('video-') && collapsedBranches['3']) isParentCollapsed = true;
      return { 
        ...edge, 
        hidden: false,
        style: {
          ...edge.style,
          opacity: isParentCollapsed ? 0 : 1,
          transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: isParentCollapsed ? 'none' : 'auto'
        }
      };
    }));
  }, [collapsedBranches, setNodes, setEdges, isEditMode]);

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
    <div id="hero-canvas-section" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {!isFullscreen && (
        <div style={{ padding: '20px 5% 0 5%', zIndex: 10, display: 'flex', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap', gap: '40px' }}>
          <h1 style={{ fontSize: '3.5rem', margin: 0, whiteSpace: 'nowrap' }}>
            Fluid <span className="text-gradient">Node Canvas</span>
          </h1>
          <p style={{ margin: 0, fontSize: '1.1rem', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6', maxWidth: '650px', textAlign: 'left' }}>
            Navigate the Droplet ecosystem through our interactive, physics-based graph. Pan, zoom, and explore <span style={{ fontWeight: 'bold', color: '#FF6A00' }}>connections dynamically.</span>
          </p>
        </div>
      )}
      
      <div ref={containerRef} style={{ width: '100%', minHeight: '500px', height: isFullscreen ? '100vh' : 'calc(100vh - 120px)', position: 'relative', backgroundColor: isFullscreen ? '#050505' : 'transparent', marginTop: '20px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ nodes: [{ id: '1' }, { id: '2' }], maxZoom: 0.5, minZoom: 0.5 }}
        selectionMode="partial"
        panOnDrag={interactionMode === 'pan'}
        selectionOnDrag={interactionMode === 'select'}
        panOnScroll={true}
        selectionKeyCode={['Shift', 'Meta', 'Control']}
        multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
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
            <ZoomToOneButton />
          </Controls>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            <div 
              onClick={() => setIsEditMode(!isEditMode)}
              style={{ 
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', 
                background: 'rgba(20,20,25,0.8)', border: '1px solid rgba(255,255,255,0.1)', 
                padding: '8px', borderRadius: '8px', cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: isEditMode ? '0 0 10px rgba(75, 94, 250, 0.2)' : 'none'
              }}
              title="Toggle Edit Mode"
            >
              <span style={{ color: isEditMode ? 'white' : 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Edit Mode
              </span>
              <div style={{ width: '36px', height: '20px', background: isEditMode ? 'var(--accent-neon)' : 'rgba(255,255,255,0.2)', borderRadius: '10px', position: 'relative', transition: 'all 0.3s' }}>
                <div style={{ width: '16px', height: '16px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: isEditMode ? '18px' : '2px', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
              </div>
            </div>

            <div 
              onClick={() => setInteractionMode(prev => prev === 'pan' ? 'select' : 'pan')}
              style={{ 
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', 
                background: 'rgba(20,20,25,0.8)', border: '1px solid rgba(255,255,255,0.1)', 
                padding: '8px', borderRadius: '8px', cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: interactionMode === 'pan' ? '0 0 10px rgba(0, 255, 204, 0.2)' : 'none'
              }}
              title={interactionMode === 'pan' 
                ? "Pan Mode is ON. Drag to pan. Tip: Hold Shift, Cmd, or Ctrl to draw a selection box or click individual nodes to multi-select." 
                : "Pan Mode is OFF. Drag to select. Tip: Hold Spacebar to pan the canvas."}
            >
              <span style={{ color: interactionMode === 'pan' ? 'white' : 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Pan Mode
              </span>
              <div style={{ width: '36px', height: '20px', background: interactionMode === 'pan' ? '#00ffcc' : 'rgba(255,255,255,0.2)', borderRadius: '10px', position: 'relative', transition: 'all 0.3s' }}>
                <div style={{ width: '16px', height: '16px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: interactionMode === 'pan' ? '18px' : '2px', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
              </div>
            </div>

            {isEditMode && (
              <CanvasPersistencePanel
                user={user}
                canvases={canvases}
                setCanvases={setCanvases}
                activeCanvasId={activeCanvasId}
                setActiveCanvasId={setActiveCanvasId}
                activeCanvasName={activeCanvasName}
                setActiveCanvasName={setActiveCanvasName}
                nodes={nodes}
                setNodes={setNodes}
                edges={edges}
                setEdges={setEdges}
                collapsedBranches={collapsedBranches}
                setCollapsedBranches={setCollapsedBranches}
                interactionMode={interactionMode}
                setInteractionMode={setInteractionMode}
                status={canvasStatus}
                setStatus={setCanvasStatus}
              />
            )}
          </div>
        </Panel>
        <MultiSelectHint interactionMode={interactionMode} />
        <NodeSearch />
        <MiniMap 
          position="bottom-right"
          className="custom-minimap"
          nodeColor={(n) => {
            if (n.id === '1') return '#ffffff';
            if (n.id.startsWith('ad-') || n.id === '6') return '#4B5EFA';
            if (n.id.startsWith('wild-') || n.id === '7') return '#ff00ff';
            if (n.id.startsWith('shot-') || n.id === '9') return '#f5a623';
            if (n.id.startsWith('video-') || n.id === '3') return '#00ffcc';
            return 'rgba(255,255,255,0.2)';
          }}
          maskColor="rgba(0, 0, 0, 0.7)"
          maskStrokeColor="rgba(255, 255, 255, 0.8)"
          maskStrokeWidth={2}
          pannable={true}
          zoomable={true}
        />
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
