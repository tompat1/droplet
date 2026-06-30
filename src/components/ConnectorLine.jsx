import React from 'react';

export default function ConnectorLine({ targetId }) {
  const scrollDown = () => {
    if (targetId) {
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      marginTop: '-20px',
      marginBottom: '-60px',
      position: 'relative', 
      zIndex: 10,
    }}>
      <svg width="40" height="150" viewBox="0 0 40 150" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible', pointerEvents: 'none' }}>
        {/* Glow effect behind the line */}
        <line x1="20" y1="0" x2="20" y2="130" stroke="#4B5EFA" strokeWidth="8" strokeOpacity="0.3" style={{ filter: 'blur(4px)' }} />
        
        {/* The main dashed moving line */}
        <line x1="20" y1="0" x2="20" y2="130" stroke="#4B5EFA" strokeWidth="4" className="animated-connector" />
        
        {/* Connection node points */}
        <circle cx="20" cy="10" r="5" fill="#050505" stroke="#4B5EFA" strokeWidth="3" />
      </svg>

      <button 
        onClick={scrollDown}
        className="scroll-arrow-btn"
        title="Scroll down"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    </div>
  );
}
