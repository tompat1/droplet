import React from 'react';
import HeroCanvas from './components/HeroCanvas';
import InteractiveGallery from './components/InteractiveGallery';

function App() {
  return (
    <>
      <div className="app-background" style={{ zIndex: -2 }}></div>
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
          zIndex: -1,
          opacity: 0.3,
          pointerEvents: 'none'
        }}
      >
        <source src="/assets/videos/videomp_.mp4" type="video/mp4" />
      </video>
      <main>
        <HeroCanvas />
        <InteractiveGallery />
      </main>
    </>
  );
}

export default App;
