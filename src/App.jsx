import React from 'react';
import HeroCanvas from './components/HeroCanvas';
import ConnectorLine from './components/ConnectorLine';
import InteractiveGallery from './components/InteractiveGallery';
import ThreeScene from './components/ThreeScene';
import CallToAction from './components/CallToAction';
import Preloader from './components/Preloader';

import Overhero from './components/Overhero';

function App() {
  return (
    <>
      <Preloader />
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
      
      {/* 3D WebGL Layer (Temporarily Hidden) */}
      {/* <ThreeScene /> */}

      <main style={{ position: 'relative', zIndex: 1 }}>
        <Overhero />
        <ConnectorLine />
        <HeroCanvas />
        <ConnectorLine />
        <InteractiveGallery />
        <CallToAction />
      </main>
    </>
  );
}

export default App;
