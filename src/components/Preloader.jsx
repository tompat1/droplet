import React, { useEffect, useState, useRef, useMemo } from 'react';
import gsap from 'gsap';
import assetFiles from '../assetsData.json';

export default function Preloader() {
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef(null);

  const allAssets = useMemo(() => {
    const list = [];
    Object.keys(assetFiles).forEach(key => {
      assetFiles[key].forEach(filename => {
        list.push(filename.split('/').pop());
      });
    });
    return list;
  }, []);

  useEffect(() => {
    const totalDuration = 5000; // 5 seconds
    const intervalTime = 50; // update every 50ms
    const totalSteps = totalDuration / intervalTime;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const currentProgress = (currentStep / totalSteps) * 100;
      
      if (currentProgress >= 100) {
        setProgress(100);
        setCurrentFile('System ready.');
        clearInterval(interval);
        
        const timer = setTimeout(() => {
          if (containerRef.current) {
            gsap.to(containerRef.current, {
              opacity: 0,
              duration: 1,
              ease: 'power2.inOut',
              onComplete: () => setIsVisible(false)
            });
          }
        }, 500);
      } else {
        setProgress(currentProgress);
        // Map progress percentage to an index in the allAssets array
        const assetIndex = Math.floor((currentProgress / 100) * allAssets.length);
        if (allAssets[assetIndex]) {
          setCurrentFile(`Loading: ${allAssets[assetIndex]}`);
        }
      }
    }, intervalTime);
    
    return () => clearInterval(interval);
  }, [allAssets]);

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
              transition: 'width 0.1s linear',
              boxShadow: '0 0 10px var(--accent-blue)'
            }} 
          />
        </div>
        
        <div style={{ marginTop: '15px', fontSize: '1rem', color: 'rgba(255,255,255,0.8)', fontVariantNumeric: 'tabular-nums', fontWeight: '500' }}>
          {Math.round(progress)}%
        </div>

        <div style={{ 
          marginTop: '20px', 
          fontSize: '0.8rem', 
          color: 'rgba(255,255,255,0.4)', 
          fontFamily: 'monospace',
          height: '20px',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          maxWidth: '80vw',
          textOverflow: 'ellipsis'
        }}>
          {currentFile}
        </div>
      </div>
    </div>
  );
}
