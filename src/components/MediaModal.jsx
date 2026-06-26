import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function MediaModal({ media, onClose, onNext, onPrev }) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIsZoomed(false);
    setPan({ x: 0, y: 0 });
  }, [media]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && onNext && !isZoomed) onNext();
      if (e.key === 'ArrowLeft' && onPrev && !isZoomed) onPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev, isZoomed]);

  if (!media) return null;

  const handlePointerDown = (e) => {
    if (media.type !== 'image') return;
    if (isZoomed) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
    setDragStartPos({ x: e.clientX, y: e.clientY });
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !isZoomed || media.type !== 'image') return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handlePointerUp = (e) => {
    if (media.type !== 'image') return;
    
    // Distinguish click from drag
    const dx = e.clientX - dragStartPos.x;
    const dy = e.clientY - dragStartPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) {
      toggleZoom();
    }

    if (isDragging) {
      setIsDragging(false);
    }
    e.target.releasePointerCapture(e.pointerId);
  };

  const toggleZoom = () => {
    if (media.type !== 'image') return;
    if (isZoomed) {
      setIsZoomed(false);
      setPan({ x: 0, y: 0 });
    } else {
      setIsZoomed(true);
    }
  };

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

      {!isZoomed && onPrev && (
        <button 
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          style={{
            position: 'absolute',
            left: '30px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
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
            e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
          }}
        >
          <ChevronLeft size={32} />
        </button>
      )}

      {!isZoomed && onNext && (
        <button 
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          style={{
            position: 'absolute',
            right: '30px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
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
            e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
          }}
        >
          <ChevronRight size={32} />
        </button>
      )}

      <div 
        onClick={e => e.stopPropagation()} 
        style={{
          position: 'relative',
          width: media.type === 'video' ? '100vw' : 'auto',
          height: media.type === 'video' ? '100vh' : 'auto',
          maxWidth: media.type === 'video' ? '100vw' : '90%',
          maxHeight: media.type === 'video' ? '100vh' : '90%',
          borderRadius: media.type === 'video' ? '0' : '16px',
          overflow: isZoomed ? 'visible' : 'hidden',
          boxShadow: media.type === 'video' ? 'none' : '0 20px 60px rgba(0,0,0,0.6)',
          border: (isZoomed || media.type === 'video') ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'transparent'
        }}
      >
        {media.type === 'image' ? (
          <img 
            src={media.src} 
            alt={media.title} 
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            draggable={false}
            style={{ 
              width: '100%', 
              height: '100%', 
              maxHeight: '90vh',
              objectFit: 'contain',
              cursor: isZoomed ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${isZoomed ? 2.5 : 1})`,
              transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
              willChange: 'transform'
            }} 
          />
        ) : (
          <video 
            src={media.src} 
            controls 
            autoPlay 
            style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '100vh' }} 
          />
        )}
      </div>

      {media.type === 'image' && !isZoomed && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 10002,
        }}>
          <div style={{
            padding: '12px 24px',
            background: 'rgba(5, 5, 5, 0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '30px',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.9rem',
            boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
            animation: 'fadeIn 0.5s ease-out'
          }}>
            Click to zoom, drag to pan
          </div>
        </div>
      )}
    </div>
  );
}
