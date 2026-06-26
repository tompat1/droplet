import React from 'react';
import HeroCanvas from './components/HeroCanvas';
import InteractiveGallery from './components/InteractiveGallery';
import ThreeScene from './components/ThreeScene';
import CallToAction from './components/CallToAction';

function App() {
  return (
    <>
      <div className="app-background" style={{ zIndex: -4 }}></div>
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          zIndex: -3,
          opacity: 0.15,
          pointerEvents: 'none'
        }}
      >
        <source src="/assets/videos/videomp_.mp4" type="video/mp4" />
      </video>
      
      {/* 3D WebGL Layer */}
      <ThreeScene />

      <main style={{ position: 'relative', zIndex: 1 }}>
        <HeroCanvas />
        <InteractiveGallery />
        <CallToAction />
      </main>
    </>
  );
}

export default App;
