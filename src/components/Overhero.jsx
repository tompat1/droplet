import React from 'react';
import EditableText from './EditableText';

export default function Overhero() {
  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      overflow: 'hidden' 
    }}>
      <video
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: -1,
          opacity: 0.8
        }}
      >
        <source src="/assets/videos/rotera_kepsarna_utifran_dessa.mp4" type="video/mp4" />
      </video>

      {/* Gradient overlay to ensure text readability against the video */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        background: 'linear-gradient(to bottom, rgba(5,5,5,0.3) 0%, rgba(5,5,5,0.85) 100%)', 
        zIndex: -1 
      }}></div>

      <div style={{ padding: '0 5%', zIndex: 10, textAlign: 'center', marginTop: '-10vh' }}>
        <h1 style={{ fontSize: 'clamp(3rem, 6vw, 6rem)', marginBottom: '24px', letterSpacing: '-0.02em' }}>
          <span className="text-gradient"><EditableText contentKey="overhero.title.brand" fallback="Droplet" /></span>{' '}
          <EditableText contentKey="overhero.title.rest" fallback="Brand Space" />
        </h1>
        <div className="glass-panel" style={{ 
          maxWidth: '700px', 
          padding: '32px 40px', 
          borderRadius: '24px', 
          fontSize: '1.25rem', 
          color: 'rgba(255,255,255,0.95)', 
          lineHeight: '1.7', 
          margin: '0 auto', 
          boxShadow: '0 12px 40px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.1)' 
        }}>
          <p style={{ margin: 0, fontWeight: 300 }}>
            <EditableText
              contentKey="overhero.body.main"
              fallback="From one origin logo to a full brand universe: guides, mockups, videos, merch, and campaign assets, ready whenever your brand needs them."
              multiline
            />{' '}
            <span style={{ fontWeight: 500, color: '#FF6A00' }}>
              <EditableText contentKey="overhero.body.emphasis" fallback="Endless possibilities." />
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
