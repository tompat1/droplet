import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Copy, Check, Download } from 'lucide-react';
import { downloadMediaSource, mediaFilename } from '../lib/mediaFiles';

const getActivePortalTarget = () => {
  if (typeof document === 'undefined') return null;
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    document.querySelector('#hero-canvas-viewport') ||
    document.body
  );
};

export default function MediaModal({ media, onClose, onNext, onPrev }) {
  const [portalTarget, setPortalTarget] = useState(getActivePortalTarget);
  const [isZoomed, setIsZoomed] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  useEffect(() => {
    setIsZoomed(false);
    setPan({ x: 0, y: 0 });
    setCopiedPrompt(false);
  }, [media]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setPortalTarget(getActivePortalTarget());
    };
    handleFullscreenChange();
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!media) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && onNext && !isZoomed) onNext();
      if (e.key === 'ArrowLeft' && onPrev && !isZoomed) onPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev, isZoomed, media]);

  if (!media) return null;

  const promptText = media.prompt || media.description || media.generationPrompt || '';

  const handleCopyPrompt = async (e) => {
    e?.stopPropagation();
    if (!promptText) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(promptText);
      } else {
        const ta = document.createElement('textarea');
        ta.value = promptText;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2200);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  };

  const handleDownload = (e) => {
    e?.stopPropagation();
    if (!media.src) return;
    const type = media.type || 'image';
    const ext = type === 'video' ? 'mp4' : (media.src?.startsWith('data:image/png') ? 'png' : 'webp');
    downloadMediaSource(media.src, mediaFilename(media.title || 'rendered-asset', ext));
  };

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

  const target = getActivePortalTarget() || portalTarget || (typeof document !== 'undefined' ? document.body : null);
  if (!target) return null;

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        background: 'rgba(4, 4, 8, 0.88)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: '20px',
          left: '24px',
          right: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10005,
          pointerEvents: 'auto'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {media.title || 'Rendered Asset'}
              </h2>
              {media.generationProviderLabel && (
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '20px',
                  background: 'rgba(0, 255, 204, 0.14)',
                  border: '1px solid rgba(0, 255, 204, 0.35)',
                  color: '#00ffcc',
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap'
                }}>
                  ● {media.generationProviderLabel}
                </span>
              )}
            </div>
            {media.subtitle && (
              <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {media.subtitle}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {media.onTweak && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                media.onTweak();
              }}
              title="Tweak this asset using the same pipeline"
              aria-label="Tweak this asset"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '10px 18px',
                borderRadius: '30px',
                background: 'rgba(0, 255, 204, 0.22)',
                border: '1px solid rgba(0, 255, 204, 0.5)',
                color: '#00ffcc',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
              }}
            >
              <span>✨</span> Tweak Asset
            </button>
          )}

          {promptText && (
            <button
              type="button"
              onClick={handleCopyPrompt}
              title={copiedPrompt ? "Copied!" : "Copy Prompt"}
              aria-label="Copy Prompt"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '10px 18px',
                borderRadius: '30px',
                background: copiedPrompt ? 'rgba(0, 255, 204, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                border: copiedPrompt ? '1px solid rgba(0, 255, 204, 0.6)' : '1px solid rgba(255, 255, 255, 0.2)',
                color: copiedPrompt ? '#00ffcc' : '#fff',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
              }}
            >
              {copiedPrompt ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedPrompt ? 'Copied!' : 'Copy Prompt'}</span>
            </button>
          )}

          {media.src && (
            <button
              type="button"
              onClick={handleDownload}
              title="Download asset"
              aria-label="Download asset"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
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
              <Download size={20} />
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.72rem',
                color: 'rgba(255, 255, 255, 0.65)',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
                userSelect: 'none',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
              }}
            >
              ESC to exit
            </span>
            <button 
              type="button"
              onClick={onClose}
              title="Close Lightbox (ESC to exit)"
              aria-label="Close Lightbox (ESC to exit)"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
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
              <X size={22} />
            </button>
          </div>
        </div>
      </div>

      {!isZoomed && onPrev && (
        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          style={{
            position: 'absolute',
            left: '30px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            width: '56px',
            height: '56px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#fff',
            cursor: 'pointer',
            zIndex: 10000,
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
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
          <ChevronLeft size={30} />
        </button>
      )}

      {!isZoomed && onNext && (
        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          style={{
            position: 'absolute',
            right: '30px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            width: '56px',
            height: '56px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#fff',
            cursor: 'pointer',
            zIndex: 10000,
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
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
          <ChevronRight size={30} />
        </button>
      )}

      {/* Media Viewport */}
      <div 
        onClick={e => e.stopPropagation()} 
        style={{
          position: 'relative',
          width: media.type === 'video' ? '100vw' : 'auto',
          height: media.type === 'video' ? '100vh' : 'auto',
          maxWidth: media.type === 'video' ? '100vw' : '88%',
          maxHeight: media.type === 'video' ? '100vh' : (promptText && !isZoomed ? '72vh' : '84vh'),
          borderRadius: media.type === 'video' ? '0' : '16px',
          overflow: isZoomed ? 'visible' : 'hidden',
          boxShadow: media.type === 'video' ? 'none' : '0 20px 60px rgba(0,0,0,0.6)',
          border: (isZoomed || media.type === 'video') ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'transparent',
          transition: 'max-height 0.3s ease'
        }}
      >
        {media.type === 'image' ? (
          <img 
            src={media.src} 
            alt={media.title || 'Rendered asset'} 
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            draggable={false}
            style={{ 
              width: '100%', 
              height: '100%', 
              maxHeight: promptText && !isZoomed ? '72vh' : '84vh',
              objectFit: 'contain',
              cursor: isZoomed ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${isZoomed ? 2.5 : 1})`,
              transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
              willChange: 'transform'
            }} 
          />
        ) : media.type === 'video' ? (
          <video 
            src={media.src} 
            controls 
            autoPlay 
            style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '100vh' }} 
          />
        ) : media.type === 'palette' ? (
          <div style={{ background: 'var(--bg-color)', padding: '40px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '30px', textAlign: 'center', color: '#fff' }}>{media.title}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '30px' }}>
              {media.colors?.map((color, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: color.hex, border: '2px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>{color.name}</span>
                    <span style={{ fontSize: '14px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>{color.hex}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Bottom Prompt Bar Overlay */}
      {promptText && !isZoomed && (
        <div 
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(90vw, 840px)',
            background: 'rgba(12, 12, 20, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: '18px',
            padding: '14px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(75, 94, 250, 0.15)',
            zIndex: 10004
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.68rem', color: 'rgba(0, 255, 204, 0.85)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Generation Prompt
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {media.onTweak && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                    media.onTweak();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    background: 'rgba(0, 255, 204, 0.22)',
                    border: '1px solid rgba(0, 255, 204, 0.5)',
                    color: '#00ffcc',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  title="Tweak this asset using the same pipeline"
                >
                  <span>✨</span> Tweak Asset
                </button>
              )}
              <button
                type="button"
                onClick={handleCopyPrompt}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  background: copiedPrompt ? 'rgba(0, 255, 204, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                  border: copiedPrompt ? '1px solid rgba(0, 255, 204, 0.5)' : '1px solid rgba(255, 255, 255, 0.14)',
                  color: copiedPrompt ? '#00ffcc' : 'rgba(255, 255, 255, 0.85)',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {copiedPrompt ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedPrompt ? 'Copied Prompt' : 'Copy Prompt'}</span>
              </button>
            </div>
          </div>
          <div style={{
            fontSize: '0.9rem',
            lineHeight: 1.45,
            color: 'rgba(255, 255, 255, 0.92)',
            maxHeight: '80px',
            overflowY: 'auto',
            wordBreak: 'break-word'
          }}>
            {promptText}
          </div>
        </div>
      )}

      {/* Click to zoom hint overlay */}
      {media.type === 'image' && !isZoomed && !promptText && (
        <div style={{
          position: 'absolute',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          zIndex: 10002,
        }}>
          <div style={{
            padding: '10px 20px',
            background: 'rgba(5, 5, 5, 0.65)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '30px',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.85rem',
            boxShadow: '0 4px 15px rgba(0,0,0,0.4)'
          }}>
            Click image to zoom, drag to pan
          </div>
        </div>
      )}
    </div>,
    target
  );
}

