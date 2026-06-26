import React, { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { useProgress } from '@react-three/drei';

export default function Preloader() {
  const { progress } = useProgress();
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    // When progress hits 100, fade out after a brief delay
    if (progress === 100) {
      const timer = setTimeout(() => {
        gsap.to(containerRef.current, {
          opacity: 0,
          duration: 1,
          ease: 'power2.inOut',
          onComplete: () => setIsVisible(false)
        });
      }, 800); // 800ms minimum visibility delay
      return () => clearTimeout(timer);
    }
  }, [progress]);

  if (!isVisible) return null;

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#050505',
      }}
    >
      <div 
        className="preloader-bg"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          opacity: 0.8 // slight dim so the text is visible
        }}
      ></div>

      <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1 style={{ fontSize: '3.5rem', marginBottom: '30px', letterSpacing: '4px', textTransform: 'uppercase' }}>
          <span className="text-gradient">Droplet</span>
        </h1>
        
        <div style={{ width: '250px', height: '3px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', borderRadius: '3px' }}>
          <div 
            style={{ 
              width: `${progress}%`, 
              height: '100%', 
              background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))',
              transition: 'width 0.3s ease',
              boxShadow: '0 0 10px var(--accent-blue)'
            }} 
          />
        </div>
        
        <div style={{ marginTop: '15px', fontSize: '1rem', color: 'rgba(255,255,255,0.8)', fontVariantNumeric: 'tabular-nums', fontWeight: '500' }}>
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
}
