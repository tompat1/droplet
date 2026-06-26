import React from 'react';

export default function ConnectorLine() {
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
      pointerEvents: 'none'
    }}>
      <svg width="20" height="150" viewBox="0 0 20 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Glow effect behind the line */}
        <line x1="10" y1="0" x2="10" y2="150" stroke="#4B5EFA" strokeWidth="8" strokeOpacity="0.3" style={{ filter: 'blur(4px)' }} />
        
        {/* The main dashed moving line */}
        <line x1="10" y1="0" x2="10" y2="150" stroke="#4B5EFA" strokeWidth="4" className="animated-connector" />
        
        {/* Connection node points */}
        <circle cx="10" cy="10" r="5" fill="#050505" stroke="#4B5EFA" strokeWidth="3" />
        <circle cx="10" cy="140" r="6" fill="#050505" stroke="#4B5EFA" strokeWidth="3" />
      </svg>
    </div>
  );
}
