import React, { useEffect, useRef, useState, useMemo } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import assetFiles from '../assetsData.json';
import MediaModal from './MediaModal';
import { defaultAvailableTags, defaultAssetTags } from '../defaultTags';
import EditableText from './EditableText';

gsap.registerPlugin(ScrollTrigger);

const BackgroundLines = () => {
  const lineColors = ['#4B5EFA', '#ff00ff', '#00ffcc', '#FF5B24'];
  return (
    <div style={{ position: 'absolute', left: '5vw', right: '5vw', top: 0, bottom: 0, pointerEvents: 'none', zIndex: -1 }}>
      {/* Desktop: 4 Lines */}
      <div className="gallery-lines-desktop" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {/* Branching SVG */}
        <svg width="100%" height="80px" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, overflow: 'visible' }}>
          {lineColors.map((color, i) => {
            const targetX = 12.5 + (i * 25);
            return (
              <g key={`branch-${i}`}>
                <path d={`M 50 0 C 50 50, ${targetX} 50, ${targetX} 100`} fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.5" style={{ filter: 'blur(2px)' }} />
                <path d={`M 50 0 C 50 50, ${targetX} 50, ${targetX} 100`} fill="none" stroke={color} strokeWidth="0.5" className="animated-connector" />
              </g>
            );
          })}
        </svg>
        {/* Straight Vertical Lines */}
        {lineColors.map((color, i) => (
          <div key={`line-${i}`} style={{ position: 'absolute', left: `${12.5 + (i * 25)}%`, top: '80px', bottom: 0, width: '2px', transform: 'translateX(-50%)' }}>
            <svg width="20" height="100%" style={{ overflow: 'visible', position: 'absolute', left: '-9px' }}>
              <line x1="10" y1="0" x2="10" y2="100%" stroke={color} strokeWidth="16" strokeOpacity="0.2" className="pulsating-glow" />
              <line x1="10" y1="0" x2="10" y2="100%" stroke={color} strokeWidth="8" className="animated-connector" />
            </svg>
          </div>
        ))}
      </div>

      {/* Tablet: 2 Lines */}
      <div className="gallery-lines-tablet" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <svg width="100%" height="80px" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, overflow: 'visible' }}>
          {[lineColors[0], lineColors[2]].map((color, i) => {
            const targetX = 25 + (i * 50);
            return (
              <g key={`branch-t-${i}`}>
                <path d={`M 50 0 C 50 50, ${targetX} 50, ${targetX} 100`} fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.5" style={{ filter: 'blur(2px)' }} />
                <path d={`M 50 0 C 50 50, ${targetX} 50, ${targetX} 100`} fill="none" stroke={color} strokeWidth="0.5" className="animated-connector" />
              </g>
            );
          })}
        </svg>
        {[lineColors[0], lineColors[2]].map((color, i) => (
          <div key={`line-t-${i}`} style={{ position: 'absolute', left: `${25 + (i * 50)}%`, top: '80px', bottom: 0, width: '2px', transform: 'translateX(-50%)' }}>
            <svg width="20" height="100%" style={{ overflow: 'visible', position: 'absolute', left: '-9px' }}>
              <line x1="10" y1="0" x2="10" y2="100%" stroke={color} strokeWidth="16" strokeOpacity="0.2" className="pulsating-glow" />
              <line x1="10" y1="0" x2="10" y2="100%" stroke={color} strokeWidth="8" className="animated-connector" />
            </svg>
          </div>
        ))}
      </div>

      {/* Mobile: 1 Line */}
      <div className="gallery-line-mobile" style={{ position: 'absolute', top: 0, left: '50%', bottom: 0, width: '2px', transform: 'translateX(-50%)' }}>
        <svg width="20" height="100%" style={{ overflow: 'visible', position: 'absolute', left: '-9px' }}>
          <line x1="10" y1="0" x2="10" y2="100%" stroke={lineColors[0]} strokeWidth="16" strokeOpacity="0.2" className="pulsating-glow" />
          <line x1="10" y1="0" x2="10" y2="100%" stroke={lineColors[0]} strokeWidth="8" className="animated-connector" />
        </svg>
      </div>
    </div>
  );
};

export default function InteractiveGallery() {
  const galleryRef = useRef(null);

  const allAssets = useMemo(() => {
    const list = [];
    Object.keys(assetFiles).forEach(key => {
      if (key === 'Canvas Ads' || key === 'Canvas In The Wild Products' || key === 'Canvas Products Shots') return;
      assetFiles[key].forEach(filename => {
        const isVideo = key === 'Campaign Videos' || filename.match(/\.(mp4|webm|mov)$/i);
        const basename = filename.split('/').pop();
        const title = basename.replace(/\.(webp|png|jpg|mp4|webm|mov)$/i, '').replace(/[-_]/g, ' ');
        const mediaSrc = isVideo ? `/assets/videos/${filename}` : `/assets/branding/${filename}`;
        list.push({ type: isVideo ? 'video' : 'image', src: mediaSrc, title });
      });
    });
    return list;
  }, []);

  const [activeIndex, setActiveIndex] = useState(null);
  const activeMedia = activeIndex !== null ? allAssets[activeIndex] : null;

  const handleNext = () => setActiveIndex(prev => (prev + 1) % allAssets.length);
  const handlePrev = () => setActiveIndex(prev => (prev - 1 + allAssets.length) % allAssets.length);

  const [highlightedSrc, setHighlightedSrc] = useState(null);

  // Tagging System State
  const [isTaggingMode, setIsTaggingMode] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState(new Set());
  const [showTaggingToggle, setShowTaggingToggle] = useState(false);

  useEffect(() => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isTagPath = window.location.pathname === '/tag' || window.location.search.includes('tag') || window.location.hash.includes('tag');
    if (isLocal || isTagPath) {
      setShowTaggingToggle(true);
    }
  }, []);
  
  const [availableTags, setAvailableTags] = useState(() => {
    try {
      const stored = localStorage.getItem('gallery-available-tags');
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.from(new Set([...defaultAvailableTags, ...parsed]));
      }
    } catch(e) {
      console.warn('Failed to parse available tags from localStorage:', e);
    }
    return defaultAvailableTags;
  });

  const [assetTags, setAssetTags] = useState(() => {
    try {
      const stored = localStorage.getItem('gallery-asset-tags');
      if (stored) return JSON.parse(stored);
    } catch(e) {
      console.warn('Failed to parse asset tags from localStorage:', e);
    }
    return defaultAssetTags;
  });

  const [newTagInput, setNewTagInput] = useState('');

  useEffect(() => {
    localStorage.setItem('gallery-available-tags', JSON.stringify(availableTags));
  }, [availableTags]);

  useEffect(() => {
    localStorage.setItem('gallery-asset-tags', JSON.stringify(assetTags));
    window.dispatchEvent(new CustomEvent('customTagsUpdated'));
  }, [assetTags]);

  useEffect(() => {
    if (!isTaggingMode) {
      setSelectedAssets(new Set()); // clear selection when exiting
    }
  }, [isTaggingMode]);

  useEffect(() => {
    const handleOpenGalleryItem = (e) => {
      const src = e.detail;
      setHighlightedSrc(src);
      
      setTimeout(() => {
        const elId = `gallery-item-${src.replace(/[^a-zA-Z0-9]/g, '-')}`;
        const el = document.getElementById(elId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);

      setTimeout(() => {
        setHighlightedSrc(null);
      }, 3000);
    };
    window.addEventListener('openGalleryItem', handleOpenGalleryItem);
    return () => window.removeEventListener('openGalleryItem', handleOpenGalleryItem);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.gallery-item', {
        y: 60,
        opacity: 0,
        duration: 0.6,
        stagger: 0.03, // Faster stagger since there are ~60 images
        ease: 'power3.out',
        scrollTrigger: {
          trigger: galleryRef.current,
          start: 'top 85%',
        }
      });
    }, galleryRef);

    return () => ctx.revert();
  }, []);

  const categories = Object.keys(assetFiles)
    .filter(key => key !== 'Canvas Ads' && key !== 'Canvas In The Wild Products' && key !== 'Canvas Products Shots')
    .map(key => ({
      title: key,
      assets: assetFiles[key]
    }));

  return (
    <div id="asset-gallery" ref={galleryRef} style={{ padding: '80px 5%', maxWidth: '1600px', margin: '0 auto', position: 'relative', zIndex: 5 }}>
      <BackgroundLines />

      <div className="glass-panel" style={{ position: 'relative', zIndex: 2, maxWidth: '800px', margin: '0 auto 60px auto', padding: '40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '3rem', marginBottom: '16px' }}>
          <EditableText contentKey="gallery.title.prefix" fallback="Asset" /> <span className="text-gradient"><EditableText contentKey="gallery.title.accent" fallback="Gallery" /></span>
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto', lineHeight: '1.6', marginBottom: '30px' }}>
          <EditableText
            contentKey="gallery.description"
            fallback="Follow the paths and explore the Droplet asset system: ads, mockups, videos, merch, and brand files brought together in one polished gallery"
            multiline
          />
        </p>

        {showTaggingToggle && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', alignItems: 'center' }}>
            <div 
              onClick={() => setIsTaggingMode(!isTaggingMode)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '12px', 
                background: 'rgba(20,20,25,0.8)', border: '1px solid rgba(255,255,255,0.1)', 
                padding: '10px 20px', borderRadius: '12px', cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: isTaggingMode ? '0 0 15px rgba(75, 94, 250, 0.3)' : 'none'
              }}
              title="Toggle Tagging Mode"
            >
              <span style={{ color: isTaggingMode ? 'white' : 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Tagging Mode
              </span>
              <div style={{ width: '44px', height: '24px', background: isTaggingMode ? 'var(--accent-neon)' : 'rgba(255,255,255,0.2)', borderRadius: '12px', position: 'relative', transition: 'all 0.3s' }}>
                <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%', position: 'absolute', top: '3px', left: isTaggingMode ? '23px' : '3px', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
              </div>
            </div>

            {isTaggingMode && (
              <button 
                onClick={() => {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(assetTags, null, 2));
                  const a = document.createElement('a');
                  a.href = dataStr;
                  a.download = 'custom_gallery_tags.json';
                  a.click();
                }}
                style={{
                  padding: '10px 20px', background: 'rgba(0, 255, 204, 0.15)', color: '#00ffcc', border: '1px solid rgba(0, 255, 204, 0.4)', borderRadius: '12px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 255, 204, 0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0, 255, 204, 0.15)'}
              >
                Export Tags (JSON)
              </button>
            )}
          </div>
        )}
      </div>

      {isTaggingMode && (
        <div style={{
          position: 'sticky',
          top: '20px',
          zIndex: 100,
          background: 'rgba(20, 20, 25, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(75, 94, 250, 0.5)',
          borderRadius: '16px',
          padding: '20px',
          margin: '0 auto 60px auto',
          maxWidth: '1200px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 20px rgba(75, 94, 250, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Tag Bank</h3>
            <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
              {selectedAssets.size} asset{selectedAssets.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
            {availableTags.map(tag => (
              <div key={tag} style={{ display: 'flex', alignItems: 'center', background: 'rgba(75, 94, 250, 0.2)', border: '1px solid var(--accent-neon)', borderRadius: '20px', overflow: 'hidden' }}>
                <button
                  onClick={() => {
                    if (selectedAssets.size === 0) return;
                    setAssetTags(prev => {
                      const next = { ...prev };
                      selectedAssets.forEach(src => {
                        const current = next[src] || [];
                        if (!current.includes(tag)) {
                          next[src] = [...current, tag];
                        }
                      });
                      return next;
                    });
                  }}
                  style={{ padding: '8px 12px', background: 'transparent', border: 'none', color: 'white', cursor: selectedAssets.size > 0 ? 'pointer' : 'not-allowed', opacity: selectedAssets.size > 0 ? 1 : 0.5 }}
                >
                  {tag}
                </button>
                <button
                  onClick={() => setAvailableTags(prev => prev.filter(t => t !== tag))}
                  style={{ padding: '8px 10px', background: 'rgba(255,0,0,0.2)', border: 'none', color: '#ff8888', cursor: 'pointer', borderLeft: '1px solid rgba(255,255,255,0.1)' }}
                  title="Delete tag globally"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              value={newTagInput}
              onChange={e => setNewTagInput(e.target.value)}
              placeholder="Create new tag..."
              onKeyDown={e => {
                if (e.key === 'Enter' && newTagInput.trim()) {
                  if (!availableTags.includes(newTagInput.trim())) {
                    setAvailableTags([...availableTags, newTagInput.trim()]);
                  }
                  setNewTagInput('');
                }
              }}
              style={{ flex: 1, padding: '10px 16px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', outline: 'none' }}
            />
            <button
              onClick={() => {
                if (newTagInput.trim() && !availableTags.includes(newTagInput.trim())) {
                  setAvailableTags([...availableTags, newTagInput.trim()]);
                }
                setNewTagInput('');
              }}
              style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}
            >
              Add
            </button>
          </div>
        </div>
      )}
      
      {categories.map((category, catIndex) => (
        <div key={catIndex} style={{ position: 'relative', zIndex: 2, marginTop: catIndex === 0 ? '0' : '120px', marginBottom: '20px' }}>
          <h3 style={{ 
            fontSize: '2rem', 
            marginBottom: '20px', 
            borderBottom: '1px solid rgba(255,255,255,0.1)', 
            paddingBottom: '12px',
            color: 'var(--text-color)' 
          }}>
          <EditableText contentKey={`gallery.category.${category.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.title`} fallback={category.title} />
        </h3>
          <div className="gallery-grid">
            {category.assets.map((filename, index) => {
              const isVideo = category.title === 'Campaign Videos' || filename.match(/\.(mp4|webm|mov)$/i);
              const basename = filename.split('/').pop();
              const title = basename.replace(/\.(webp|png|jpg|mp4|webm|mov)$/i, '').replace(/[-_]/g, ' ');
              const mediaSrc = isVideo ? `/assets/videos/${filename}` : `/assets/branding/${filename}`;
              const isHighlighted = highlightedSrc === mediaSrc;
              const isSelected = selectedAssets.has(mediaSrc);
              const activeTags = assetTags[mediaSrc] || [];
              const elId = `gallery-item-${mediaSrc.replace(/[^a-zA-Z0-9]/g, '-')}`;
              
              return (
                <div key={`${catIndex}-${index}`} className="gallery-grid-cell" style={{ display: 'flex', justifyContent: 'center' }}>
                  <div 
                    id={elId}
                    className="gallery-item glass-panel" 
                    style={{ 
                      padding: '16px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      cursor: 'pointer', 
                      height: '100%', 
                      width: '100%', 
                      maxWidth: '280px',
                      transition: 'box-shadow 0.5s ease, border 0.5s ease',
                      boxShadow: isHighlighted ? '0 0 30px rgba(75, 94, 250, 0.8), inset 0 0 10px rgba(75, 94, 250, 0.5)' : (isSelected ? '0 0 20px rgba(0, 255, 204, 0.4)' : undefined),
                      border: isHighlighted ? '1px solid rgba(75, 94, 250, 1)' : (isSelected ? '1px solid rgba(0, 255, 204, 1)' : undefined)
                    }}
                  onClick={() => {
                    if (isTaggingMode) {
                      setSelectedAssets(prev => {
                        const next = new Set(prev);
                        if (next.has(mediaSrc)) next.delete(mediaSrc);
                        else next.add(mediaSrc);
                        return next;
                      });
                    } else {
                      const globalIndex = allAssets.findIndex(a => a.src === mediaSrc);
                      setActiveIndex(globalIndex);
                    }
                  }}
                >
                  <div style={{ width: '100%', height: '220px', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px', position: 'relative' }}>
                    {isVideo ? (
                      <video 
                        src={mediaSrc} 
                        autoPlay 
                        loop 
                        muted 
                        playsInline
                        className="gallery-media-asset"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }} 
                      />
                    ) : (
                      <img 
                        src={mediaSrc} 
                        alt={title} 
                        loading="lazy"
                        className="gallery-media-asset"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }} 
                      />
                    )}
                  </div>
                  <h3 style={{ fontSize: '1rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {title}
                  </h3>
                  {activeTags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '12px' }}>
                      {activeTags.map(tag => (
                        <div key={tag} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '0.7rem', padding: '2px 8px', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)' }}>
                          <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{tag}</span>
                          {isTaggingMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAssetTags(prev => {
                                  const current = prev[mediaSrc] || [];
                                  return { ...prev, [mediaSrc]: current.filter(t => t !== tag) };
                                });
                              }}
                              style={{ marginLeft: '6px', background: 'transparent', border: 'none', color: '#ff8888', cursor: 'pointer', padding: '0 2px', fontSize: '10px' }}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      
      {activeMedia && (
        <MediaModal 
          media={activeMedia} 
          onClose={() => setActiveIndex(null)} 
          onNext={handleNext} 
          onPrev={handlePrev} 
        />
      )}
    </div>
  );
}
