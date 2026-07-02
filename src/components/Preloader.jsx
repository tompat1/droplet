import React, { useEffect, useState, useRef, useMemo } from 'react';
import gsap from 'gsap';
import assetFiles from '../assetsData.json';
import audioTracks from '../audioData.json';

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
    const totalDuration = 5000;
    const intervalTime = 50;
    const totalSteps = totalDuration / intervalTime;
    let currentStep = 0;
    let timer;

    const interval = setInterval(() => {
      currentStep++;
      const currentProgress = (currentStep / totalSteps) * 100;

      if (currentProgress >= 100) {
        setProgress(100);
        setCurrentFile('System ready.');
        clearInterval(interval);

        timer = setTimeout(() => {
          if (containerRef.current) {
            gsap.to(containerRef.current, {
              opacity: 0,
              duration: 1,
              ease: 'power2.inOut',
              onComplete: () => setIsVisible(false),
            });
          }
        }, 500);
      } else {
        setProgress(currentProgress);
        const assetIndex = Math.floor((currentProgress / 100) * allAssets.length);
        if (allAssets[assetIndex]) {
          setCurrentFile(`Loading: ${allAssets[assetIndex]}`);
        }
      }
    }, intervalTime);

    return () => {
      clearInterval(interval);
      if (timer) clearTimeout(timer);
    };
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
          opacity: 0.8,
        }}
      />

      {/* Hidden audio preloads */}
      <div style={{ display: 'none' }}>
        {audioTracks.map((t, i) => (
          <audio key={i} src={t.src} preload="auto" />
        ))}
      </div>

      {/* Loading Bar & Progress */}
      <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'absolute', bottom: '25%' }}>
        <div style={{
          width: '500px',
          maxWidth: '90vw',
          height: '6px',
          background: 'rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.1)',
          overflow: 'hidden',
          borderRadius: '6px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
        }}>
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #FF5B24, #FFB347)',
              transition: 'width 0.1s linear',
              boxShadow: '0 0 15px #FF5B24, 0 0 30px #FFB347'
            }}
          />
        </div>

        <div style={{
          marginTop: '15px',
          fontSize: '1.5rem',
          color: '#fff',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: '700',
          textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 10px #FF5B24'
        }}>
          {Math.round(progress)}%
        </div>

        <div style={{
          marginTop: '12px',
          fontSize: '1rem',
          color: 'rgba(255,255,255,0.9)',
          fontFamily: 'monospace',
          height: '24px',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          maxWidth: '90vw',
          textOverflow: 'ellipsis',
          textShadow: '0 2px 5px rgba(0,0,0,0.8)'
        }}>
          {currentFile}
        </div>
      </div>
    </div>
  );
}
