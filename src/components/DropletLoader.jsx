import React from 'react';

export default function DropletLoader({ label = 'Loading', size = 180, compact = false }) {
  const ringSize = size;
  const logoSize = Math.round(size * 0.58);
  const beadSize = Math.max(9, Math.round(size * 0.065));

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      style={{
        width: ringSize,
        maxWidth: '80vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: compact ? 8 : 14,
        color: 'rgba(255,255,255,0.86)'
      }}
    >
      <style>{`
        @keyframes droplet-loader-revolve {
          0% { transform: rotateX(14deg) rotateY(0deg) rotateZ(-5deg); }
          50% { transform: rotateX(-8deg) rotateY(180deg) rotateZ(5deg); }
          100% { transform: rotateX(14deg) rotateY(360deg) rotateZ(-5deg); }
        }

        @keyframes droplet-loader-orbit {
          from { transform: rotate(0deg) translateX(calc(var(--loader-size) * 0.46)) rotate(0deg); }
          to { transform: rotate(360deg) translateX(calc(var(--loader-size) * 0.46)) rotate(-360deg); }
        }

        @keyframes droplet-loader-pulse {
          0%, 100% { opacity: 0.55; transform: scale(0.92); }
          50% { opacity: 1; transform: scale(1.04); }
        }

        @media (prefers-reduced-motion: reduce) {
          .droplet-loader-logo,
          .droplet-loader-bead,
          .droplet-loader-glow {
            animation: none !important;
          }
        }
      `}</style>

      <div
        style={{
          '--loader-size': `${ringSize}px`,
          width: ringSize,
          height: ringSize,
          maxWidth: '80vw',
          maxHeight: '80vw',
          position: 'relative',
          display: 'grid',
          placeItems: 'center',
          perspective: `${ringSize * 4}px`
        }}
      >
        <div
          className="droplet-loader-glow"
          style={{
            position: 'absolute',
            inset: '12%',
            borderRadius: '999px',
            background: 'radial-gradient(circle, rgba(75, 94, 250, 0.48), rgba(0, 255, 204, 0.12) 48%, rgba(0,0,0,0) 72%)',
            filter: 'blur(18px)',
            animation: 'droplet-loader-pulse 2.4s ease-in-out infinite'
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: '8%',
            borderRadius: '999px',
            border: '1px solid rgba(75, 94, 250, 0.64)',
            boxShadow: '0 0 26px rgba(75, 94, 250, 0.36), inset 0 0 22px rgba(0, 255, 204, 0.08)',
            transform: 'rotateX(68deg)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: '17%',
            borderRadius: '999px',
            border: '1px solid rgba(0, 255, 204, 0.42)',
            transform: 'rotateX(18deg) rotateY(62deg)',
            boxShadow: '0 0 18px rgba(0, 255, 204, 0.2)'
          }}
        />
        <div
          className="droplet-loader-bead"
          style={{
            width: beadSize,
            height: beadSize,
            position: 'absolute',
            left: `calc(50% - ${beadSize / 2}px)`,
            top: `calc(50% - ${beadSize / 2}px)`,
            borderRadius: '999px',
            background: 'linear-gradient(135deg, #FFB347, #FF5B24)',
            boxShadow: '0 0 16px rgba(255, 106, 0, 0.85)',
            animation: 'droplet-loader-orbit 1.8s linear infinite'
          }}
        />
        <div
          className="droplet-loader-logo"
          style={{
            width: logoSize,
            height: logoSize,
            borderRadius: '24%',
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04))',
            border: '1px solid rgba(255,255,255,0.16)',
            boxShadow: '0 24px 55px rgba(0,0,0,0.38), 0 0 30px rgba(75, 94, 250, 0.28), inset 0 1px 0 rgba(255,255,255,0.22)',
            transformStyle: 'preserve-3d',
            animation: 'droplet-loader-revolve 2.8s cubic-bezier(0.65, 0, 0.35, 1) infinite'
          }}
        >
          <img
            src="/assets/branding/droplet_logo.png"
            alt=""
            style={{
              width: '78%',
              height: '78%',
              objectFit: 'contain',
              transform: 'translateZ(24px)',
              filter: 'drop-shadow(0 10px 12px rgba(0,0,0,0.32))'
            }}
          />
        </div>
      </div>
      {label && (
        <div
          style={{
            fontSize: compact ? 11 : 13,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            textShadow: '0 0 16px rgba(75, 94, 250, 0.55)',
            textAlign: 'center'
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
