import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import assetFiles from '../assetsData.json';
import MediaModal from './MediaModal';

gsap.registerPlugin(ScrollTrigger);

export default function InteractiveGallery() {
  const galleryRef = useRef(null);
  const [activeMedia, setActiveMedia] = useState(null);

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
    <div ref={galleryRef} style={{ padding: '80px 5%', maxWidth: '1600px', margin: '0 auto', position: 'relative', zIndex: 5 }}>
      {/* Background Neon Thread */}
      <div style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: '50%',
        width: '4px',
        transform: 'translateX(-50%)',
        zIndex: 0,
        pointerEvents: 'none'
      }}>
        <svg width="20" height="100%" style={{ overflow: 'visible', position: 'absolute', left: '-8px' }}>
          <line x1="10" y1="0" x2="10" y2="100%" stroke="#4B5EFA" strokeWidth="8" strokeOpacity="0.2" className="pulsating-glow" />
          <line x1="10" y1="0" x2="10" y2="100%" stroke="#4B5EFA" strokeWidth="4" className="animated-connector" />
        </svg>
      </div>

      <div style={{ position: 'relative', zIndex: 2, marginBottom: '60px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '3rem', marginBottom: '16px' }}>Asset <span className="text-gradient">Gallery</span></h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto', lineHeight: '1.6' }}>
          Here's the perfect example of the variety and power of all the different branding materials in their raw, highest-quality format. This is how you build the Droplet brand.
        </p>
      </div>
      
      {categories.map((category, catIndex) => (
        <div key={catIndex} style={{ position: 'relative', zIndex: 2, marginBottom: '80px' }}>
          <h3 style={{ 
            fontSize: '2rem', 
            marginBottom: '32px', 
            borderBottom: '1px solid rgba(255,255,255,0.1)', 
            paddingBottom: '16px',
            color: 'var(--text-color)' 
          }}>
            {category.title}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {category.assets.map((filename, index) => {
              const isVideo = category.title === 'Videos' || filename.match(/\.(mp4|webm|mov)$/i);
              const basename = filename.split('/').pop();
              const title = basename.replace(/\.(webp|png|jpg|mp4|webm|mov)$/i, '');
              const mediaSrc = isVideo ? `/assets/videos/${filename}` : `/assets/branding/${filename}`;
              
              return (
                <div 
                  key={`${catIndex}-${index}`} 
                  className="gallery-item glass-panel" 
                  style={{ padding: '16px', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                  onClick={() => setActiveMedia({ type: isVideo ? 'video' : 'image', src: mediaSrc, title })}
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
              );
            })}
          </div>
        </div>
      ))}
      
      <MediaModal media={activeMedia} onClose={() => setActiveMedia(null)} />
    </div>
  );
}
