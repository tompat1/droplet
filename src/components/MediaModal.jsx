import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function MediaModal({ media, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!media) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        background: 'rgba(5, 5, 5, 0.85)',
        backdropFilter: 'blur(24px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px'
      }}
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '30px',
          right: '30px',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: '#fff',
          cursor: 'pointer',
          zIndex: 10000,
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}
        onMouseOver={e => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseOut={e => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <X size={24} />
      </button>

      <div 
        onClick={e => e.stopPropagation()} // Prevent clicks on the media from closing the modal
        style={{
          position: 'relative',
          maxWidth: '90%',
          maxHeight: '90%',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {media.type === 'image' ? (
          <img 
            src={media.src} 
            alt={media.title} 
            style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '90vh' }} 
          />
        ) : (
          <video 
            src={media.src} 
            controls 
            autoPlay 
            style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '90vh' }} 
          />
        )}
      </div>
    </div>
  );
}
