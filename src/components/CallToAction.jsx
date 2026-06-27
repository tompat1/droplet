import React, { useState, useEffect } from 'react';

const ConvergingLines = () => {
  const lineColors = ['#4B5EFA', '#ff00ff', '#00ffcc', '#FF5B24'];
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, pointerEvents: 'none', zIndex: 0 }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto', position: 'relative', height: '100%' }}>
        
        {/* Match InteractiveGallery content box width precisely with 5vw */}
        <div style={{ position: 'absolute', left: '5vw', right: '5vw', top: 0, bottom: '480px', display: 'flex', flexDirection: 'column' }}>
          
          {/* Straight Lines Section (Flexible height) */}
          <div style={{ flex: 1, position: 'relative', minHeight: '20px' }}>
            {/* Desktop: 4 Lines */}
            <div className="gallery-lines-desktop" style={{ width: '100%', height: '100%', position: 'absolute' }}>
              {lineColors.map((color, i) => (
                <div key={`s-d-${i}`} style={{ position: 'absolute', left: `${12.5 + (i * 25)}%`, top: 0, bottom: 0, width: '2px', transform: 'translateX(-50%)' }}>
                  <svg width="20" height="100%" style={{ overflow: 'visible', position: 'absolute', left: '-9px' }}>
                    <line x1="10" y1="0" x2="10" y2="100%" stroke={color} strokeWidth="16" strokeOpacity="0.2" className="pulsating-glow" />
                    <line x1="10" y1="0" x2="10" y2="100%" stroke={color} strokeWidth="8" className="animated-connector" />
                  </svg>
                </div>
              ))}
            </div>

            {/* Tablet: 2 Lines */}
            <div className="gallery-lines-tablet" style={{ width: '100%', height: '100%', position: 'absolute' }}>
              {[lineColors[0], lineColors[2]].map((color, i) => (
                <div key={`s-t-${i}`} style={{ position: 'absolute', left: `${25 + (i * 50)}%`, top: 0, bottom: 0, width: '2px', transform: 'translateX(-50%)' }}>
                  <svg width="20" height="100%" style={{ overflow: 'visible', position: 'absolute', left: '-9px' }}>
                    <line x1="10" y1="0" x2="10" y2="100%" stroke={color} strokeWidth="16" strokeOpacity="0.2" className="pulsating-glow" />
                    <line x1="10" y1="0" x2="10" y2="100%" stroke={color} strokeWidth="8" className="animated-connector" />
                  </svg>
                </div>
              ))}
            </div>

            {/* Mobile: 1 Line */}
            <div className="gallery-line-mobile" style={{ width: '100%', height: '100%', position: 'absolute' }}>
              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', transform: 'translateX(-50%)' }}>
                <svg width="20" height="100%" style={{ overflow: 'visible', position: 'absolute', left: '-9px' }}>
                  <line x1="10" y1="0" x2="10" y2="100%" stroke={lineColors[0]} strokeWidth="16" strokeOpacity="0.2" className="pulsating-glow" />
                  <line x1="10" y1="0" x2="10" y2="100%" stroke={lineColors[0]} strokeWidth="8" className="animated-connector" />
                </svg>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default function CallToAction() {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div id="call-to-action" style={{ textAlign: 'center', position: 'relative', zIndex: 10, paddingBottom: '120px' }}>
      <ConvergingLines />
      
      <div style={{ paddingTop: '80px', position: 'relative', zIndex: 2 }}>
        <div className="glass-panel" style={{ 
        maxWidth: '700px', 
        margin: '0 auto 80px auto', 
        padding: '40px',
        color: 'rgba(255,255,255,0.9)', 
        fontSize: '1.5rem', 
        lineHeight: '1.7',
        fontWeight: '300',
        textShadow: '0 2px 10px rgba(0,0,0,0.5)'
      }}>
        "This is brand momentum in motion.<br />From one identity to endless variations, assets, and campaigns. At any moment"
      </div>
      </div>

      <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', padding: '60px 40px' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>Ready to Dive In?</h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', marginBottom: '40px' }}>
          See how Droplet can turn one brand mark into a complete digital asset system.
        </p>
        
        <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <input 
            type="email" 
            placeholder="Enter your email address" 
            style={{
              padding: '16px 24px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color 0.3s'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
          />
          <button 
            type="submit"
            style={{
              padding: '16px 32px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--accent-blue)',
              color: '#fff',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(75, 94, 250, 0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 25px rgba(75, 94, 250, 0.6)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(75, 94, 250, 0.4)';
            }}
          >
            Request a Demo
          </button>
        </form>
      </div>

      {showBackToTop && (
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="scroll-arrow-btn"
          style={{ 
            position: 'fixed', 
            top: 'auto', 
            bottom: '40px', 
            right: '40px',
            zIndex: 9999,
            animation: 'fadeIn 0.5s ease-out, bounce-subtle 2s infinite ease-in-out'
          }}
          title="Back to Top"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(180deg)' }}>
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      )}
    </div>
  );
}
