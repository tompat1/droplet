import React, { lazy, Suspense } from 'react';
import ConnectorLine from './components/ConnectorLine';
import InteractiveGallery from './components/InteractiveGallery';
import CallToAction from './components/CallToAction';
import Preloader from './components/Preloader';
import AuthControls from './components/AuthControls';
import { AuthProvider } from './components/AuthProvider';
import { SiteContentProvider } from './components/SiteContentProvider';
import { CanvasAssetsProvider } from './components/CanvasAssetsProvider';
import DropletLoader from './components/DropletLoader';

import Overhero from './components/Overhero';
import CoreValues from './components/CoreValues';

const HeroCanvas = lazy(() => import('./components/HeroCanvas'));
// const ThreeScene = lazy(() => import('./components/ThreeScene'));

function App() {
  return (
    <AuthProvider>
      <SiteContentProvider>
        <Preloader />
        <AuthControls />
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
        {/* <Suspense fallback={null}>
          <ThreeScene />
        </Suspense> */}

        <main style={{ position: 'relative', zIndex: 1 }}>
          <Overhero />
          <ConnectorLine targetId="core-values" />
          <CoreValues />
          <ConnectorLine targetId="hero-canvas-section" />
          <CanvasAssetsProvider>
            <Suspense fallback={<div style={{ width: '100%', height: 'calc(100vh - 120px)', minHeight: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(20,20,25,0.2)', borderRadius: '16px', margin: '20px auto', maxWidth: '1600px' }}><DropletLoader label="Loading canvas" size={180} /></div>}>
              <HeroCanvas />
            </Suspense>
            <ConnectorLine targetId="asset-gallery" />
            <InteractiveGallery />
          </CanvasAssetsProvider>
          <CallToAction />
        </main>
      </SiteContentProvider>
    </AuthProvider>
  );
}

export default App;
