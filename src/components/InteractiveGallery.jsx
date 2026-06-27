import React, { useEffect, useRef, useState, useMemo } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import assetFiles from '../assetsData.json';
import MediaModal from './MediaModal';

gsap.registerPlugin(ScrollTrigger);

const BackgroundLines = () => {
  const lineColors = ['#4B5EFA', '#ff00ff', '#00ffcc', '#FF5B24'];
  return (
    <div style={{ position: 'absolute', left: '5vw', right: '5vw', top: 0, bottom: 0, pointerEvents: 'none', zIndex: 0 }}>
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
      assetFiles[key].forEach(filename => {
        const isVideo = key === 'Campaign Videos' || filename.match(/\.(mp4|webm|mov)$/i);
        const basename = filename.split('/').pop();
        const title = basename.replace(/\.(webp|png|jpg|mp4|webm|mov)$/i, '');
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

  const categories = Object.keys(assetFiles).map(key => ({
    title: key,
    assets: assetFiles[key]
  }));

  return (
    <div id="asset-gallery" ref={galleryRef} style={{ padding: '80px 5%', maxWidth: '1600px', margin: '0 auto', position: 'relative', zIndex: 5 }}>
      <BackgroundLines />

      <div className="glass-panel" style={{ position: 'relative', zIndex: 2, maxWidth: '800px', margin: '0 auto 60px auto', padding: '40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '3rem', marginBottom: '16px' }}>Asset <span className="text-gradient">Gallery</span></h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto', lineHeight: '1.6' }}>
          Follow the paths and explore the Droplet asset system: ads, mockups, videos, merch, and brand files brought together in one polished gallery
        </p>
      </div>
      
      {categories.map((category, catIndex) => (
        <div key={catIndex} style={{ position: 'relative', zIndex: 2, marginTop: catIndex === 0 ? '0' : '120px', marginBottom: '20px' }}>
          <h3 style={{ 
            fontSize: '2rem', 
            marginBottom: '20px', 
            borderBottom: '1px solid rgba(255,255,255,0.1)', 
            paddingBottom: '12px',
            color: 'var(--text-color)' 
          }}>
            {category.title}
          </h3>
          <div className="gallery-grid">
            {category.assets.map((filename, index) => {
              const isVideo = category.title === 'Campaign Videos' || filename.match(/\.(mp4|webm|mov)$/i);
              const basename = filename.split('/').pop();
              const title = basename.replace(/\.(webp|png|jpg|mp4|webm|mov)$/i, '');
              const mediaSrc = isVideo ? `/assets/videos/${filename}` : `/assets/branding/${filename}`;
              
              return (
                <div key={`${catIndex}-${index}`} className="gallery-grid-cell">
                  <div 
                    className="gallery-item glass-panel" 
                    style={{ padding: '16px', display: 'flex', flexDirection: 'column', cursor: 'pointer', height: '100%' }}
                  onClick={() => {
                    const globalIndex = allAssets.findIndex(a => a.src === mediaSrc);
                    setActiveIndex(globalIndex);
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
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }} 
                        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} 
                        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} 
                      />
                    ) : (
                      <img 
                        src={mediaSrc} 
                        alt={title} 
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }} 
                        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} 
                        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} 
                      />
                    )}
                  </div>
                  <h3 style={{ fontSize: '1rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {title}
                  </h3>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      
      <MediaModal media={activeMedia} onClose={() => setActiveIndex(null)} onNext={handleNext} onPrev={handlePrev} />
    </div>
  );
}
