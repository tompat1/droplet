import React, { useState, useEffect, useRef } from 'react';
import EditableText from './EditableText';

const values = [
  {
    title: "Content is King",
    description: "With Droplet's powerful asset creation, management, and Brand truth you will always deliver, in no-time.",
    bgImage: "/assets/value_bg/value_bg_1.webp"
  },
  {
    title: "Context is King",
    description: "One single point of truth for all assets in any form. Always.",
    bgImage: "/assets/value_bg/value_bg_2.webp"
  },
  {
    title: "Continuity is King",
    description: "All the same, all the way, brand delivery in a predictable way, whether brand color, typography, styling or anything brand related. Always true to brand.",
    bgImage: "/assets/value_bg/value_bg_3.webp"
  },
  {
    title: "Cut the Noise",
    description: "Remove the hallucinations and only work with brand trust and brand approval within your own quality-approved context.",
    bgImage: "/assets/value_bg/value_bg_4.webp"
  }
];

export default function CoreValues() {
  const containerRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // rect.height is 400vh. We subtract 100vh so progress is exactly 1 when the bottom of the container hits the bottom of the viewport
      const scrollableDistance = rect.height - window.innerHeight;
      
      if (scrollableDistance <= 0) return;
      
      let p = -rect.top / scrollableDistance;
      p = Math.max(0, Math.min(1, p));
      setProgress(p);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const numItems = values.length;
  // activeIndexFloat goes from 0 to (numItems - 1)
  const activeIndexFloat = progress * (numItems - 1);
  const activeIndex = Math.round(activeIndexFloat);

  return (
    <section 
      id="core-values" 
      ref={containerRef}
      style={{ 
        width: '100%', 
        height: '400vh', // 4 screens of scrolling duration
        position: 'relative', 
        zIndex: 5,
        backgroundColor: 'transparent'
      }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        .sticky-scroll-container {
          display: flex;
          flex-direction: column;
        }
        .sticky-left, .sticky-right {
          flex: 1;
          display: flex;
          align-items: center;
          width: 100%;
        }
        .sticky-left {
          justify-content: center;
        }
        .sticky-right {
          justify-content: center;
          overflow: hidden;
        }
        .core-value-spine {
          display: none;
        }
        .mobile-spine {
          display: block;
        }
        .desktop-spine {
          display: none;
        }
        @media (min-width: 768px) {
          .sticky-scroll-container {
            flex-direction: row;
          }
          .sticky-left {
            justify-content: flex-end;
            padding-right: 5%;
          }
          .sticky-right {
            justify-content: flex-start;
            padding-left: 5%;
          }
          .mobile-spine {
            display: none;
          }
          .desktop-spine {
            display: block;
          }
        }
        /* Spine Background Animation */
        .dash-v {
          position: absolute;
          top: 0; bottom: 0; left: 0; right: 0;
          background: repeating-linear-gradient(to bottom, #4B5EFA 0, #4B5EFA 10px, transparent 10px, transparent 20px);
          background-size: 100% 20px;
          animation: moveSpineV 1s linear infinite;
        }
        .dash-h {
          position: absolute;
          top: 0; bottom: 0; left: 0; right: 0;
          background: repeating-linear-gradient(to right, #4B5EFA 0, #4B5EFA 10px, transparent 10px, transparent 20px);
          background-size: 20px 100%;
        }
        .animate-right { animation: moveSpineHRight 1s linear infinite; }
        .animate-left { animation: moveSpineHLeft 1s linear infinite; }

        .spine-glow {
          position: absolute;
          top: -8px; bottom: -8px; left: -8px; right: -8px;
          background: #4B5EFA;
          filter: blur(8px);
          opacity: 0.3;
        }
        @keyframes moveSpineV {
          0% { background-position: 0 0; }
          100% { background-position: 0 20px; }
        }
        @keyframes moveSpineHRight {
          0% { background-position: 0 0; }
          100% { background-position: 20px 0; }
        }
        @keyframes moveSpineHLeft {
          0% { background-position: 0 0; }
          100% { background-position: -20px 0; }
        }
      `}} />

      {/* Sticky Inner Container */}
      <div className="sticky-scroll-container" style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
        padding: '0 5%'
      }}>
        
        {/* Full Section Backgrounds */}
        {values.map((val, idx) => (
          <div 
            key={`bg-${idx}`}
            style={{
              position: 'absolute',
              top: 0, left: 0, width: '100%', height: '100%',
              background: `linear-gradient(rgba(5, 5, 5, 0.15), rgba(5, 5, 5, 0.15)), url(${val.bgImage}) center/cover no-repeat`,
              opacity: activeIndex === idx ? 1 : 0,
              transition: 'opacity 1s ease-in-out',
              zIndex: -1,
              pointerEvents: 'none'
            }}
          />
        ))}
        {/* MOBILE SPINE: Straight down the middle */}
        <div className="core-value-spine mobile-spine" style={{
          position: 'absolute', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '4px', zIndex: 0, pointerEvents: 'none'
        }}>
          <div className="spine-glow"></div>
          <div className="dash-v"></div>
        </div>

        {/* DESKTOP SPINE: Center -> Left -> Center */}
        <div className="core-value-spine desktop-spine" style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
          zIndex: 0, pointerEvents: 'none'
        }}>
          {/* 1. Top vertical segment */}
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '4px', height: '15vh' }}>
            <div className="spine-glow"></div>
            <div className="dash-v"></div>
          </div>
          {/* 2. Horizontal segment (moving left) */}
          <div style={{ position: 'absolute', top: '15vh', left: '25%', width: '25%', height: '4px', transform: 'translateY(-50%)' }}>
            <div className="spine-glow"></div>
            <div className="dash-h animate-left"></div>
          </div>
          {/* 3. Left vertical segment (running through glass boxes) */}
          <div style={{ position: 'absolute', top: '15vh', left: '25%', bottom: '15vh', width: '4px', transform: 'translateX(-50%)' }}>
            <div className="spine-glow"></div>
            <div className="dash-v"></div>
          </div>
          {/* 4. Horizontal segment (moving right, returning to center) */}
          <div style={{ position: 'absolute', bottom: '15vh', left: '25%', width: '25%', height: '4px', transform: 'translateY(50%)' }}>
            <div className="spine-glow"></div>
            <div className="dash-h animate-right"></div>
          </div>
          {/* 5. Bottom vertical segment (exiting through center) */}
          <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '4px', height: '15vh' }}>
            <div className="spine-glow"></div>
            <div className="dash-v"></div>
          </div>
        </div>
        
        {/* LEFT COLUMN: Descriptions */}
        <div className="sticky-left" style={{ position: 'relative', height: '100%' }}>
          <div style={{ maxWidth: '500px', width: '100%', position: 'relative', height: '300px' }}>
            {values.map((val, idx) => {
              const isActive = idx === activeIndex;
              return (
                <div 
                  key={idx}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    width: '100%',
                    transform: `translateY(-50%) ${isActive ? 'scale(1)' : 'scale(0.95)'}`,
                    opacity: isActive ? 1 : 0,
                    transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                    pointerEvents: isActive ? 'auto' : 'none',
                    willChange: 'transform, opacity'
                  }}
                >
                  <div className="glass-panel" style={{ 
                    padding: '40px', 
                    borderRadius: '24px', 
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(20, 20, 20, 0.6)', 
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden'
                  }}>
                    <h3 style={{ fontSize: '2rem', marginBottom: '20px', color: '#fff' }}>
                      <EditableText contentKey={`coreValues.${idx}.title`} fallback={val.title} />
                    </h3>
                    <p style={{ 
                      fontSize: '1.25rem', 
                      lineHeight: '1.6', 
                      color: 'rgba(255,255,255,0.8)', 
                      margin: 0 
                    }}>
                      <EditableText contentKey={`coreValues.${idx}.description`} fallback={val.description} multiline />
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Scrolling Words */}
        <div className="sticky-right" style={{ 
          position: 'relative', 
          height: '100%',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)'
        }}>

          <div style={{
            position: 'absolute',
            top: '40vh', // 50vh center minus half of item height (10vh)
            left: 0,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            // Move up based on activeIndexFloat
            // height of each item is 20vh
            transform: `translateY(${-activeIndexFloat * 20}vh)`,
            willChange: 'transform'
          }}>
            {values.map((val, idx) => {
              // Distance from the currently perfect centered index
              const distance = Math.abs(activeIndexFloat - idx);
              const isHighlight = distance < 0.3;
              
              // Scale and opacity falloff based on distance from center
              const scale = Math.max(0.6, 1 - distance * 0.15);
              const opacity = Math.max(0.05, 1 - distance * 0.4);

              return (
                <div 
                  key={idx} 
                  style={{
                    height: '20vh',
                    display: 'flex',
                    alignItems: 'center',
                    transform: `scale(${scale})`,
                    transformOrigin: 'left center',
                    opacity: opacity,
                    willChange: 'transform, opacity'
                  }}
                >
                  <h2 style={{ 
                    fontSize: 'clamp(3.5rem, 6vw, 7rem)', 
                    lineHeight: '1', 
                    margin: 0, 
                    whiteSpace: 'nowrap',
                    letterSpacing: '-0.03em',
                    color: isHighlight ? '#00ffcc' : 'rgba(255,255,255,0.8)',
                    textShadow: isHighlight ? '0 0 40px rgba(0, 255, 204, 0.4)' : 'none',
                    fontWeight: isHighlight ? 700 : 500,
                    transition: 'color 0.3s ease, text-shadow 0.3s ease, font-weight 0.3s ease'
                  }}>
                    <EditableText contentKey={`coreValues.${idx}.title`} fallback={val.title} />
                  </h2>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
