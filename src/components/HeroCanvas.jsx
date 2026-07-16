import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
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
import { readImageFileAsDataUrl } from '../lib/mediaFiles';

const FullscreenIcon = () => (
  <svg viewBox="2 2 20 20" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d="M3 3h7v2H5v5H3V3zm18 0h-7v2h5v5h2V3zM3 21h7v-2H5v-5H3v7zm18 0h-7v-2h5v-5h2v7z" />
  </svg>
);

const ExitFullscreenIcon = () => (
  <svg viewBox="2 2 20 20" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d="M10 10H3V8h5V3h2v7zm4 0h7V8h-5V3h-2v7zm-4 4H3v2h5v5h2v-7zm4 0h7v2h-5v5h-2v-7z" />
  </svg>
);

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 16V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M4 20h16" />
  </svg>
);

const IMPORT_GRID_X = 380;
const IMPORT_GRID_Y = 430;
const MAX_IMPORT_FILES = 24;

const titleFromFileName = (fileName = 'Imported Image') => {
  const cleaned = String(fileName || 'Imported Image')
    .split('/')
    .pop()
    .replace(/\.(webp|png|jpe?g|gif|svg)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned || /^image$/i.test(cleaned)) return 'Imported Image';
  return cleaned.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const isEditableTarget = (target) => (
  target instanceof HTMLElement &&
  Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
);

const imageFilesFromList = (files) => Array.from(files || []).filter((file) => file?.type?.startsWith('image/'));

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
            title="Clear search"
            aria-label="Clear search"
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

const createBrandGuideCanvasSnapshot = ({ brandName, guideUrl, guideNotes }) => {
  const title = `${brandName} Brand Guide`;
  const description = guideNotes || `Single source of truth for ${brandName}: logo, typography, colors, tone, layout rules, and all visual decisions used by generated branches.`;

  return {
    nodes: [
      {
        id: 'padding-node',
        position: { x: -500, y: 0 },
        style: { opacity: 0, pointerEvents: 'none', border: 'none', background: 'transparent', width: 1, height: 1 },
        data: { label: '' }
      },
      {
        id: 'brand-guide-source',
        type: 'brandCard',
        position: { x: 80, y: 120 },
        data: {
          title,
          subtitle: 'Single Source of Truth',
          image: guideUrl,
          description,
          brandName,
          isBrandGuideSource: true,
          sourceOfTruth: true,
          referenceRole: 'brand-guide',
          nodeGroup: 'brand-guide'
        }
      }
    ].map(sanitizeNodeForSave),
    edges: [],
    viewport: { x: 180, y: 90, zoom: 0.9 },
    settings: {
      interactionMode: 'pan',
      sourceOfTruthNodeId: 'brand-guide-source',
      brandName
    },
    collapsedBranches: {}
  };
};

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
  delete data.pushUndoAction;

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
  setStatus,
  isCanvasDirty,
  setIsCanvasDirty,
  isVisible
}) => {
  const { getViewport, setViewport, fitView } = useReactFlow();
  const [isBusy, setIsBusy] = useState(false);
  const [draftName, setDraftName] = useState(activeCanvasName || 'Fluid Node Canvas');
  const hasAutoLoadedCanvas = useRef(false);
  const brandGuideInputRef = useRef(null);
  const brandGuideResolverRef = useRef(null);
  const activeCanvasFromList = canvases.find((canvas) => canvas.id === activeCanvasId);
  const displayCanvasName = activeCanvasName || activeCanvasFromList?.name || 'Unsaved Canvas';
  const isNameDirty = draftName.trim() !== (activeCanvasName || 'Fluid Node Canvas');
  const canSave = user && !isBusy && (!activeCanvasId || isCanvasDirty || isNameDirty);

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
    const nextCanvases = payload.canvases || [];
    setCanvases(nextCanvases);
    return nextCanvases;
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
    setIsCanvasDirty(false);

    if (snapshot.viewport && Number.isFinite(snapshot.viewport.zoom)) {
      setViewport(snapshot.viewport, { duration: 250 });
    } else {
      window.requestAnimationFrame(() => fitView({ duration: 350, nodes: [{ id: '1' }, { id: '2' }], maxZoom: 0.5 }));
    }
  }, [fitView, setActiveCanvasId, setActiveCanvasName, setCollapsedBranches, setEdges, setInteractionMode, setIsCanvasDirty, setNodes, setViewport]);

  useEffect(() => {
    if (!user) {
      hasAutoLoadedCanvas.current = false;
      return;
    }

    if (hasAutoLoadedCanvas.current || activeCanvasId || isCanvasDirty) return;

    hasAutoLoadedCanvas.current = true;
    refreshCanvases()
      .then((nextCanvases) => {
        const latestCanvas = nextCanvases?.[0];
        if (!latestCanvas) return;
        setStatus('Loading latest saved canvas...');
        return canvasApi.get(latestCanvas.id);
      })
      .then((payload) => {
        if (!payload?.canvas) return;
        applyCanvasSnapshot(payload.canvas);
        setStatus('Canvas loaded.');
      })
      .catch((err) => setStatus(err.message));
  }, [activeCanvasId, applyCanvasSnapshot, isCanvasDirty, refreshCanvases, setStatus, user]);

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

  const saveCanvas = useCallback(async ({ silent = false } = {}) => {
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
    setStatus(silent ? 'Autosaving canvas...' : activeCanvasId ? 'Saving canvas...' : 'Creating canvas...');
    try {
      const result = activeCanvasId
        ? await canvasApi.update(activeCanvasId, payload)
        : await canvasApi.create(payload);
      const saved = result.canvas;
      setActiveCanvasId(saved.id);
      setActiveCanvasName(saved.name);
      setDraftName(saved.name);
      await refreshCanvases();
      setIsCanvasDirty(false);
      setStatus(silent ? 'Autosaved.' : 'Canvas saved.');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setIsBusy(false);
    }
  }, [activeCanvasId, activeCanvasName, collapsedBranches, draftName, edges, getViewport, interactionMode, nodes, refreshCanvases, setActiveCanvasId, setActiveCanvasName, setIsCanvasDirty, setStatus, user]);

  useEffect(() => {
    if (!user || !activeCanvasId || !isCanvasDirty || isBusy) return undefined;

    const timer = window.setTimeout(() => {
      saveCanvas({ silent: true });
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [activeCanvasId, isBusy, isCanvasDirty, saveCanvas, user]);

  const createNewCanvas = async () => {
    if (!user) {
      setStatus('Login to create canvases.');
      return;
    }

    const brandNameInput = window.prompt('Brand name for this new canvas:', 'New Brand');
    if (brandNameInput === null) return;
    const brandName = brandNameInput.trim();
    if (!brandName) {
      setStatus('Brand name is required to create a canvas.');
      return;
    }

    setStatus('Choose a branding guide image from your device...');
    let guideUrl = '';
    try {
      guideUrl = await chooseBrandGuideImage();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Branding guide upload failed.');
      return;
    }

    const guideNotesInput = window.prompt('Optional: add key brand rules, fonts, colors, tone, or usage notes:', '');
    if (guideNotesInput === null) return;
    const guideNotes = guideNotesInput.trim();
    const name = window.prompt('Name this new canvas:', `${brandName} Fluid Node Canvas`);
    if (!name) return;

    const snapshot = createBrandGuideCanvasSnapshot({ brandName, guideUrl, guideNotes });
    const payload = {
      name: name.trim() || `${brandName} Fluid Node Canvas`,
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
      setIsCanvasDirty(false);
      setStatus('New canvas created.');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  const chooseBrandGuideImage = () => new Promise((resolve, reject) => {
    brandGuideResolverRef.current = { resolve, reject };
    brandGuideInputRef.current?.click();
  });

  const handleBrandGuideUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    const resolver = brandGuideResolverRef.current;
    brandGuideResolverRef.current = null;
    if (!resolver) return;
    if (!file) {
      resolver.reject(new Error('Branding guide image is required for new brand canvases.'));
      return;
    }

    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      resolver.resolve(dataUrl);
    } catch (error) {
      resolver.reject(error);
    }
  };

  if (!isVisible) return null;

  const panelStyle = {
    width: '100%',
    background: 'rgba(4,4,8,0.62)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '14px',
    padding: '14px',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)'
  };

  const controlStyle = {
    minHeight: '40px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.13)',
    background: 'rgba(255,255,255,0.07)',
    color: '#fff',
    padding: '0 12px',
    outline: 'none',
    fontSize: '0.88rem'
  };

  return (
    <div style={panelStyle}>
      <input
        ref={brandGuideInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleBrandGuideUpload}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.48)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Canvas</div>
          <div style={{ fontSize: '0.98rem', fontWeight: 850, lineHeight: 1.15 }}>{user ? displayCanvasName : 'Login required'}</div>
        </div>
        <button type="button" onClick={createNewCanvas} disabled={!user || isBusy} title={user ? 'Create a new Fluid Node Canvas' : 'Login to create a canvas'} aria-label="Create new canvas" style={{ ...controlStyle, minWidth: '70px', cursor: user && !isBusy ? 'pointer' : 'not-allowed', opacity: user ? 1 : 0.5, fontWeight: 850 }}>
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
            onChange={(event) => {
              setDraftName(event.target.value);
              setStatus('');
            }}
            disabled={isBusy}
            style={controlStyle}
            aria-label="Canvas name"
          />

          <button
            type="button"
            onClick={saveCanvas}
            disabled={!canSave}
            title={!user ? 'Login to save canvases' : !canSave ? 'Canvas is already saved' : activeCanvasId ? 'Save canvas changes' : 'Create and save this canvas'}
            aria-label={!canSave ? 'Canvas saved' : activeCanvasId ? 'Save canvas' : 'Create and save canvas'}
            style={{
              ...controlStyle,
              borderColor: canSave ? 'rgba(75,94,250,0.72)' : 'rgba(255,255,255,0.1)',
              background: canSave ? 'linear-gradient(135deg, rgba(75,94,250,0.88), rgba(0,255,204,0.28))' : 'rgba(255,255,255,0.08)',
              color: canSave ? '#fff' : 'rgba(255,255,255,0.45)',
              cursor: canSave ? 'pointer' : 'not-allowed',
              fontWeight: 800
            }}
          >
            {isBusy ? 'Working...' : !canSave ? 'Saved' : activeCanvasId ? 'Save Canvas' : 'Create & Save'}
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

const CanvasToolbox = ({
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
  canvasStatus,
  setCanvasStatus,
  isCanvasDirty,
  setIsCanvasDirty,
  isEditMode,
  setIsEditMode,
  undoStack,
  undoLastAction,
  isFullscreen,
  toggleFullscreen,
  onImportImagesClick
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [toolboxPosition, setToolboxPosition] = useState(() => {
    try {
      const stored = localStorage.getItem('hero-canvas-toolbox-position');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) return parsed;
      }
    } catch {
      return { x: 16, y: 16 };
    }
    return { x: 16, y: 16 };
  });
  const dragRef = useRef(null);
  const { zoom } = useViewport();
  const { zoomIn, zoomOut, zoomTo, fitView } = useReactFlow();
  const zoomPercent = Math.round(zoom * 100);

  const clampToolboxPosition = useCallback((position) => {
    const width = isMinimized ? 58 : Math.min(360, window.innerWidth - 40);
    const height = isMinimized ? 390 : 560;
    const maxX = Math.max(8, window.innerWidth - width - 8);
    const maxY = Math.max(8, window.innerHeight - height - 8);
    return {
      x: Math.min(Math.max(8, position.x), maxX),
      y: Math.min(Math.max(8, position.y), maxY)
    };
  }, [isMinimized]);

  useEffect(() => {
    localStorage.setItem('hero-canvas-toolbox-position', JSON.stringify(toolboxPosition));
  }, [toolboxPosition]);

  const startToolboxDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      offsetX: event.clientX - toolboxPosition.x,
      offsetY: event.clientY - toolboxPosition.y
    };
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      setToolboxPosition(clampToolboxPosition({
        x: moveEvent.clientX - drag.offsetX,
        y: moveEvent.clientY - drag.offsetY
      }));
    };

    const handlePointerUp = () => {
      dragRef.current = null;
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const toolboxStyle = {
    width: isMinimized ? '58px' : 'min(360px, calc(100vw - 40px))',
    background: 'linear-gradient(145deg, rgba(30,30,38,0.86), rgba(9,9,14,0.9))',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: isMinimized ? '18px' : '18px',
    padding: isMinimized ? '8px' : '14px',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    gap: isMinimized ? '7px' : '12px',
    boxShadow: '0 22px 70px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.08)'
  };

  const iconButtonStyle = {
    width: isMinimized ? '40px' : '42px',
    height: '40px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.075)',
    color: '#fff',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    fontWeight: 900,
    fontSize: '1.2rem',
    lineHeight: 1,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)'
  };

  const zoomChipStyle = {
    minWidth: isMinimized ? '40px' : '58px',
    height: '40px',
    borderRadius: '12px',
    border: '1px solid rgba(75, 94, 250, 0.28)',
    background: 'rgba(75, 94, 250, 0.16)',
    color: '#fff',
    display: 'grid',
    placeItems: 'center',
    fontFamily: 'monospace',
    fontSize: isMinimized ? '0.72rem' : '0.86rem',
    fontWeight: 900,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
    pointerEvents: 'none'
  };

  const fitViewButtonStyle = {
    ...iconButtonStyle,
    borderColor: 'rgba(255, 106, 0, 0.52)',
    background: 'linear-gradient(135deg, rgba(255, 106, 0, 0.24), rgba(255, 179, 71, 0.08))',
    color: '#ffb347',
    boxShadow: '0 0 16px rgba(255, 106, 0, 0.18), inset 0 1px 0 rgba(255,255,255,0.1)'
  };

  const dragHandleStyle = {
    minHeight: isMinimized ? '30px' : '36px',
    color: 'rgba(255,255,255,0.3)',
    cursor: 'grab',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    touchAction: 'none',
    padding: isMinimized ? '2px 0' : '4px',
    transition: 'color 0.2s ease'
  };

  const dragDots = (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="5" r="2" />
      <circle cx="15" cy="5" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="9" cy="19" r="2" />
      <circle cx="15" cy="19" r="2" />
    </svg>
  );

  const horizontalDragDots = (
    <svg width="32" height="18" viewBox="0 0 32 18" fill="currentColor" aria-hidden="true">
      <circle cx="6" cy="6" r="2" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="26" cy="6" r="2" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="16" cy="12" r="2" />
      <circle cx="26" cy="12" r="2" />
    </svg>
  );

  const modeButton = (active, accent) => ({
    minHeight: '58px',
    flex: 1,
    borderRadius: '14px',
    border: active ? `1px solid ${accent}` : '1px solid rgba(255,255,255,0.1)',
    background: active
      ? `linear-gradient(135deg, ${accent}33, rgba(255,255,255,0.055))`
      : 'rgba(5,5,10,0.55)',
    color: active ? '#fff' : 'rgba(255,255,255,0.56)',
    cursor: 'pointer',
    padding: '9px 10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: '4px',
    boxShadow: active ? `0 0 18px ${accent}22` : 'none'
  });

  const toggleStyle = (active, accent) => ({
    width: '34px',
    height: '18px',
    borderRadius: '999px',
    background: active ? accent : 'rgba(255,255,255,0.18)',
    position: 'relative',
    flexShrink: 0
  });

  const toggleKnobStyle = (active) => ({
    width: '14px',
    height: '14px',
    borderRadius: '999px',
    background: '#fff',
    position: 'absolute',
    top: '2px',
    left: active ? '18px' : '2px',
    transition: 'left 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.28)'
  });

  return (
    <Panel position="top-left" style={{ margin: 0, zIndex: 15, transform: `translate(${toolboxPosition.x}px, ${toolboxPosition.y}px)` }}>
      <div style={toolboxStyle}>
        {isMinimized ? (
          <>
            <div
              onPointerDown={startToolboxDrag}
              style={dragHandleStyle}
              title="Drag canvas tools"
              aria-label="Drag canvas tools"
              onMouseEnter={(event) => { event.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
              onMouseLeave={(event) => { event.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
            >
              {horizontalDragDots}
            </div>
            <button type="button" onClick={() => setIsMinimized(false)} style={iconButtonStyle} title="Expand canvas tools" aria-label="Expand canvas tools">›</button>
            <button type="button" onClick={() => zoomOut({ duration: 250 })} style={iconButtonStyle} title="Zoom out" aria-label="Zoom out">−</button>
            <div style={zoomChipStyle}>{zoomPercent}%</div>
            <button type="button" onClick={() => zoomIn({ duration: 250 })} style={iconButtonStyle} title="Zoom in" aria-label="Zoom in">+</button>
            <button type="button" onClick={() => fitView({ duration: 350, padding: 0.18 })} style={fitViewButtonStyle} title="Fit view" aria-label="Fit view">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 9V4h5" />
                <path d="M20 9V4h-5" />
                <path d="M4 15v5h5" />
                <path d="M20 15v5h-5" />
              </svg>
            </button>
            <button type="button" onClick={onImportImagesClick} style={iconButtonStyle} title="Upload images to canvas" aria-label="Upload images to canvas">
              <UploadIcon />
            </button>
            <button type="button" onClick={() => zoomTo(1, { duration: 350 })} style={{ ...iconButtonStyle, fontSize: '0.78rem', fontFamily: 'monospace' }} title="Zoom 1:1" aria-label="Zoom 1:1">1:1</button>
            <button type="button" onClick={toggleFullscreen} style={iconButtonStyle} title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
              {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
            </button>
            <button type="button" onClick={() => setIsEditMode((value) => !value)} style={{ ...iconButtonStyle, borderColor: isEditMode ? 'rgba(75,94,250,0.75)' : iconButtonStyle.border, color: isEditMode ? '#fff' : 'rgba(255,255,255,0.62)', background: isEditMode ? 'rgba(75,94,250,0.24)' : iconButtonStyle.background, fontSize: '0.72rem' }} title="Toggle edit mode" aria-label="Toggle edit mode">ED</button>
            <button type="button" onClick={() => setInteractionMode((prev) => prev === 'pan' ? 'select' : 'pan')} style={{ ...iconButtonStyle, borderColor: interactionMode === 'pan' ? 'rgba(0,255,204,0.62)' : iconButtonStyle.border, color: interactionMode === 'pan' ? '#fff' : 'rgba(255,255,255,0.62)', background: interactionMode === 'pan' ? 'rgba(0,255,204,0.18)' : iconButtonStyle.background, fontSize: '0.68rem' }} title={interactionMode === 'pan' ? 'Pan mode is on' : 'Selection mode is on'} aria-label="Toggle pan mode">
              {interactionMode === 'pan' ? 'PAN' : 'SEL'}
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div
                onPointerDown={startToolboxDrag}
                style={{ ...dragHandleStyle, flex: 1, justifyContent: 'flex-start', gap: '10px' }}
                title="Drag canvas tools"
                aria-label="Drag canvas tools"
                onMouseEnter={(event) => { event.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
                onMouseLeave={(event) => { event.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
              >
                {dragDots}
                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.52)', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Canvas Tools
                </span>
              </div>
              <button type="button" onClick={() => setIsMinimized(true)} style={{ ...iconButtonStyle, width: '40px', height: '36px' }} title="Minimize canvas tools" aria-label="Minimize canvas tools">‹</button>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button type="button" onClick={() => zoomOut({ duration: 250 })} style={iconButtonStyle} title="Zoom out" aria-label="Zoom out">−</button>
              <div style={zoomChipStyle}>{zoomPercent}%</div>
              <button type="button" onClick={() => zoomIn({ duration: 250 })} style={iconButtonStyle} title="Zoom in" aria-label="Zoom in">+</button>
              <button type="button" onClick={() => fitView({ duration: 350, padding: 0.18 })} style={fitViewButtonStyle} title="Fit view" aria-label="Fit view">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 9V4h5" />
                  <path d="M20 9V4h-5" />
                  <path d="M4 15v5h5" />
                  <path d="M20 15v5h-5" />
                </svg>
              </button>
              <button type="button" onClick={onImportImagesClick} style={iconButtonStyle} title="Upload images to canvas" aria-label="Upload images to canvas">
                <UploadIcon />
              </button>
              <button type="button" onClick={() => zoomTo(1, { duration: 350 })} style={{ ...iconButtonStyle, fontSize: '0.78rem', fontFamily: 'monospace' }} title="Zoom 1:1" aria-label="Zoom 1:1">1:1</button>
              <button type="button" onClick={toggleFullscreen} style={iconButtonStyle} title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
                {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsEditMode((value) => !value)}
                style={modeButton(isEditMode, '#4B5EFA')}
                title="Toggle edit mode"
                aria-label="Toggle edit mode"
              >
                <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Edit</span>
                  <span style={toggleStyle(isEditMode, '#4B5EFA')}><span style={toggleKnobStyle(isEditMode)} /></span>
                </span>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.48)' }}>{isEditMode ? 'Cards unlocked' : 'View only'}</span>
              </button>

              <button
                type="button"
                onClick={() => setInteractionMode((prev) => prev === 'pan' ? 'select' : 'pan')}
                style={modeButton(interactionMode === 'pan', '#00ffcc')}
                title={interactionMode === 'pan' ? 'Pan mode is on' : 'Selection mode is on'}
                aria-label="Toggle pan and selection mode"
              >
                <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{interactionMode === 'pan' ? 'Pan' : 'Select'}</span>
                  <span style={toggleStyle(interactionMode === 'pan', '#00ffcc')}><span style={toggleKnobStyle(interactionMode === 'pan')} /></span>
                </span>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.48)' }}>{interactionMode === 'pan' ? 'Drag moves view' : 'Drag selects'}</span>
              </button>
            </div>

            {isEditMode && (
              <button
                type="button"
                onClick={undoLastAction}
                disabled={undoStack.length === 0}
                title={undoStack[0]?.label || 'Nothing to restore'}
                aria-label={undoStack[0]?.label || 'Nothing to restore'}
                style={{
                  minHeight: '42px',
                  width: '100%',
                  borderRadius: '12px',
                  border: undoStack.length > 0 ? '1px solid rgba(255, 106, 0, 0.48)' : '1px solid rgba(255,255,255,0.1)',
                  background: undoStack.length > 0 ? 'rgba(255, 106, 0, 0.16)' : 'rgba(255,255,255,0.055)',
                  color: undoStack.length > 0 ? '#fff' : 'rgba(255,255,255,0.38)',
                  cursor: undoStack.length > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em'
                }}
              >
                ↶ {undoStack[0]?.label || 'Undo Delete'}
              </button>
            )}

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
              isCanvasDirty={isCanvasDirty}
              setIsCanvasDirty={setIsCanvasDirty}
              isVisible={isEditMode}
            />
          </>
        )}
      </div>
    </Panel>
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
  const [isCanvasDirty, setIsCanvasDirty] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  
  const containerRef = useRef(null);
  const canvasSnapRef = useRef({
    lastScrollY: typeof window !== 'undefined' ? window.scrollY : 0,
    lastSnapAt: 0
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [collapsedBranches, setCollapsedBranches] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [interactionMode, setInteractionMode] = useState('pan');
  const [isImportDragActive, setIsImportDragActive] = useState(false);
  const reactFlowInstanceRef = useRef(null);
  const canvasUploadInputRef = useRef(null);
  const dragDepthRef = useRef(0);
  const lastCanvasPointerRef = useRef({ x: 0, y: 0 });

  const graphChangeTypes = useMemo(() => new Set(['position', 'dimensions', 'add', 'remove', 'replace']), []);
  const edgeChangeTypes = useMemo(() => new Set(['add', 'remove', 'replace']), []);
  const setPersistentNodes = useCallback((updater) => {
    setIsCanvasDirty(true);
    setNodes(updater);
  }, [setNodes]);
  const setPersistentEdges = useCallback((updater) => {
    setIsCanvasDirty(true);
    setEdges(updater);
  }, [setEdges]);
  const pushUndoAction = useCallback((action) => {
    setUndoStack((stack) => [action, ...stack].slice(0, 12));
  }, []);

  const canvasMedias = useMemo(() => nodes
    .filter(node => node.data && (node.data.image || node.data.video || node.data.colors))
    .map(node => ({
      type: node.data.image ? 'image' : (node.data.video ? 'video' : 'palette'),
      src: node.data.image || node.data.video || 'palette-' + node.id,
      title: node.data.title,
      colors: node.data.colors,
      nodeGroup: node.data.nodeGroup || 'canvas'
    })), [nodes]);

  const clientPointToCanvasPoint = useCallback((clientX, clientY) => {
    const instance = reactFlowInstanceRef.current;
    if (instance?.screenToFlowPosition) {
      return instance.screenToFlowPosition({ x: clientX, y: clientY });
    }

    const rect = containerRef.current?.getBoundingClientRect();
    return {
      x: clientX - (rect?.left || 0),
      y: clientY - (rect?.top || 0)
    };
  }, []);

  const containerCenterCanvasPoint = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return clientPointToCanvasPoint(window.innerWidth / 2, window.innerHeight / 2);
    return clientPointToCanvasPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, [clientPointToCanvasPoint]);

  const createImportedImageCards = useCallback(async (files, originPoint, source = 'upload') => {
    const imageFiles = imageFilesFromList(files).slice(0, MAX_IMPORT_FILES);
    if (imageFiles.length === 0) return;

    const skippedCount = imageFilesFromList(files).length - imageFiles.length;
    setCanvasStatus(`Importing ${imageFiles.length} image${imageFiles.length === 1 ? '' : 's'}...`);

    const importedNodes = [];
    const failedNames = [];
    for (let index = 0; index < imageFiles.length; index += 1) {
      const file = imageFiles[index];
      try {
        const image = await readImageFileAsDataUrl(file);
        const column = index % 3;
        const row = Math.floor(index / 3);
        importedNodes.push({
          id: `import-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          type: 'brandCard',
          position: {
            x: originPoint.x + column * IMPORT_GRID_X,
            y: originPoint.y + row * IMPORT_GRID_Y
          },
          data: {
            title: titleFromFileName(file.name),
            subtitle: source === 'paste' ? 'Pasted Image' : 'Imported Asset',
            image,
            description: source === 'paste'
              ? 'Pasted into the Fluid Node Canvas. Use it as a reference, branch from it, or fold it into the brand system.'
              : `Uploaded from ${file.name || 'device'}. Use it as a reference, branch from it, or fold it into the brand system.`,
            nodeGroup: 'imports',
            isImported: true,
            importedAt: new Date().toISOString()
          }
        });
      } catch (error) {
        failedNames.push(file.name || `image ${index + 1}`);
        console.warn('Image import failed:', error);
      }
    }

    if (importedNodes.length > 0) {
      setNodes((nds) => [...nds, ...importedNodes]);
      setIsCanvasDirty(true);
      setIsEditMode(true);
    }

    const importedText = importedNodes.length === 1 ? 'Imported 1 image.' : `Imported ${importedNodes.length} images.`;
    const skippedText = skippedCount > 0 ? ` Skipped ${skippedCount} over the ${MAX_IMPORT_FILES}-file limit.` : '';
    const failedText = failedNames.length > 0 ? ` ${failedNames.length} could not be imported.` : '';
    setCanvasStatus(importedNodes.length > 0 ? `${importedText}${skippedText}${failedText}` : `No images imported.${failedText}`);
  }, [setNodes]);

  const openCanvasUploadPicker = useCallback(() => {
    canvasUploadInputRef.current?.click();
  }, []);

  const handleCanvasUpload = useCallback((event) => {
    const files = event.target.files;
    event.target.value = '';
    createImportedImageCards(files, containerCenterCanvasPoint(), 'upload');
  }, [containerCenterCanvasPoint, createImportedImageCards]);

  const hasFileDrag = (event) => Array.from(event.dataTransfer?.types || []).includes('Files');

  const handleCanvasDragEnter = useCallback((event) => {
    if (!hasFileDrag(event)) return;
    dragDepthRef.current += 1;
    setIsImportDragActive(true);
  }, []);

  const handleCanvasDragLeave = useCallback((event) => {
    if (!hasFileDrag(event)) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsImportDragActive(false);
  }, []);

  const handleCanvasDragOver = useCallback((event) => {
    if (!hasFileDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleCanvasDrop = useCallback((event) => {
    if (!hasFileDrag(event)) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsImportDragActive(false);
    createImportedImageCards(event.dataTransfer.files, clientPointToCanvasPoint(event.clientX, event.clientY), 'drop');
  }, [clientPointToCanvasPoint, createImportedImageCards]);

  const handleCanvasPointerMove = useCallback((event) => {
    lastCanvasPointerRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const handleCanvasPointerDown = useCallback(() => {
    containerRef.current?.focus?.({ preventScroll: true });
  }, []);

  const undoLastAction = useCallback(() => {
    setUndoStack((stack) => {
      const [action, ...rest] = stack;
      if (!action) return stack;

      if (action.type === 'delete-node') {
        setNodes((nds) => {
          const withoutDuplicate = nds.filter((node) => node.id !== action.node.id);
          return [...withoutDuplicate, action.node];
        });
        setEdges((eds) => {
          const restoredEdgeIds = new Set(action.edges.map((edge) => edge.id));
          const withoutDuplicates = eds.filter((edge) => !restoredEdgeIds.has(edge.id));
          return [...withoutDuplicates, ...action.edges];
        });
        setIsCanvasDirty(true);
        setCanvasStatus('Restored deleted node.');
      }

      return rest;
    });
  }, [setEdges, setNodes]);

  useEffect(() => {
    const handleToggle = (id) => {
      setCollapsedBranches(prev => ({ ...prev, [id]: !prev[id] }));
      setIsCanvasDirty(true);
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
            setGlobalNodes: setPersistentNodes,
            setGlobalEdges: setPersistentEdges,
            pushUndoAction,
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
  }, [collapsedBranches, setNodes, setEdges, isEditMode, pushUndoAction, setPersistentEdges, setPersistentNodes]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleOpenEditor = () => {
      setIsEditMode(true);
    };
    window.addEventListener('openHeroCanvasEditor', handleOpenEditor);
    return () => window.removeEventListener('openHeroCanvasEditor', handleOpenEditor);
  }, []);

  useEffect(() => {
    const handlePaste = (event) => {
      if (isEditableTarget(event.target)) return;
      const canvasElement = containerRef.current;
      if (!canvasElement) return;
      const isCanvasFocused = document.activeElement === canvasElement || canvasElement.contains(document.activeElement);
      const isPointerOverCanvas = canvasElement.matches(':hover');
      if (!isCanvasFocused && !isPointerOverCanvas && !isFullscreen) return;

      const clipboardFiles = imageFilesFromList(event.clipboardData?.files);
      const itemFiles = Array.from(event.clipboardData?.items || [])
        .filter((item) => item.type?.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter(Boolean);
      const files = clipboardFiles.length > 0 ? clipboardFiles : itemFiles;
      if (files.length === 0) return;

      event.preventDefault();
      const lastPointer = lastCanvasPointerRef.current;
      const originPoint = lastPointer.x || lastPointer.y
        ? clientPointToCanvasPoint(lastPointer.x, lastPointer.y)
        : containerCenterCanvasPoint();
      createImportedImageCards(files, originPoint, 'paste');
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [clientPointToCanvasPoint, containerCenterCanvasPoint, createImportedImageCards, isFullscreen]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  useEffect(() => {
    if (isFullscreen) return undefined;

    const handleCanvasSnap = () => {
      if (window.innerWidth < 980) return;
      const canvasElement = containerRef.current;
      if (!canvasElement) return;

      const currentScrollY = window.scrollY;
      const previousScrollY = canvasSnapRef.current.lastScrollY;
      const scrollDelta = currentScrollY - previousScrollY;
      canvasSnapRef.current.lastScrollY = currentScrollY;

      if (scrollDelta <= 2) return;

      const now = Date.now();
      if (now - canvasSnapRef.current.lastSnapAt < 1800) return;

      const rect = canvasElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const isApproachingCanvas = rect.top > 48 && rect.top < viewportHeight * 0.68 && rect.bottom > viewportHeight * 0.45;
      const isAlreadyFramed = Math.abs(rect.top - 60) < 18 && rect.bottom < viewportHeight - 32;
      if (!isApproachingCanvas || isAlreadyFramed) return;

      const topOffset = Math.max(48, Math.min(72, viewportHeight * 0.07));
      const targetTop = currentScrollY + rect.top - topOffset;
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

      canvasSnapRef.current.lastSnapAt = now;
      window.scrollTo({
        top: targetTop,
        behavior: reducedMotion ? 'auto' : 'smooth'
      });
    };

    window.addEventListener('scroll', handleCanvasSnap, { passive: true });
    return () => window.removeEventListener('scroll', handleCanvasSnap);
  }, [isFullscreen]);

  const onConnect = useCallback(
    (params) => {
      setIsCanvasDirty(true);
      setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'rgba(255,255,255,0.5)', strokeWidth: 2 } }, eds));
    },
    [setEdges]
  );

  const handleNodesChange = useCallback((changes) => {
    if (changes.some((change) => graphChangeTypes.has(change.type))) {
      setIsCanvasDirty(true);
    }
    onNodesChange(changes);
  }, [graphChangeTypes, onNodesChange]);

  const handleEdgesChange = useCallback((changes) => {
    if (changes.some((change) => edgeChangeTypes.has(change.type))) {
      setIsCanvasDirty(true);
    }
    onEdgesChange(changes);
  }, [edgeChangeTypes, onEdgesChange]);

  const onNodeClick = useCallback((event, node) => {
    const src = node.data.image || node.data.video || (node.data.colors ? 'palette-' + node.id : null);
    if (src) {
      const groupMedias = canvasMedias.filter(m => m.nodeGroup === (node.data.nodeGroup || 'canvas'));
      const index = groupMedias.findIndex(m => m.src === src);
      if (index !== -1) {
        setActiveGroupMedias(groupMedias);
        setActiveIndex(index);
      }
    }
  }, [canvasMedias]);

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
      
      <div
        ref={containerRef}
        tabIndex={0}
        onDragEnter={handleCanvasDragEnter}
        onDragLeave={handleCanvasDragLeave}
        onDragOver={handleCanvasDragOver}
        onDrop={handleCanvasDrop}
        onPointerMove={handleCanvasPointerMove}
        onPointerDown={handleCanvasPointerDown}
        style={{ width: '100%', minHeight: '500px', height: isFullscreen ? '100vh' : 'calc(100vh - 120px)', position: 'relative', backgroundColor: isFullscreen ? '#050505' : 'transparent', marginTop: '20px', outline: 'none' }}
      >
      <input
        ref={canvasUploadInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleCanvasUpload}
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onInit={(instance) => { reactFlowInstanceRef.current = instance; }}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
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
        <CanvasToolbox
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
          canvasStatus={canvasStatus}
          setCanvasStatus={setCanvasStatus}
          isCanvasDirty={isCanvasDirty}
          setIsCanvasDirty={setIsCanvasDirty}
          isEditMode={isEditMode}
          setIsEditMode={setIsEditMode}
          undoStack={undoStack}
          undoLastAction={undoLastAction}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
          onImportImagesClick={openCanvasUploadPicker}
        />
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

      {isImportDragActive && (
        <div
          style={{
            position: 'absolute',
            inset: '18px',
            zIndex: 30,
            pointerEvents: 'none',
            border: '1px solid rgba(0,255,204,0.72)',
            borderRadius: '18px',
            background: 'rgba(2, 8, 12, 0.58)',
            boxShadow: '0 0 0 1px rgba(75,94,250,0.35), 0 24px 90px rgba(0,0,0,0.45), inset 0 0 40px rgba(0,255,204,0.08)',
            backdropFilter: 'blur(8px)',
            display: 'grid',
            placeItems: 'center'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 18px',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(8,8,14,0.82)',
              color: '#fff',
              fontWeight: 900,
              letterSpacing: '0.02em',
              boxShadow: '0 14px 40px rgba(0,0,0,0.35)'
            }}
          >
            <UploadIcon />
            Drop images to create canvas cards
          </div>
        </div>
      )}
      
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
