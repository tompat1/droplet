import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, X } from 'lucide-react';

const COOKIE_STORAGE_KEY = 'droplet_cookie_consent_v1';

export default function CookieConsentBanner() {
  const [consent, setConsent] = useState(() => {
    try {
      return localStorage.getItem(COOKIE_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  const [isVisible, setIsVisible] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  useEffect(() => {
    // Show banner after short delay if consent is not yet stored
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [consent]);

  useEffect(() => {
    const handleOpenSettings = () => {
      setIsVisible(true);
    };
    window.addEventListener('openDropletCookieSettings', handleOpenSettings);
    return () => window.removeEventListener('openDropletCookieSettings', handleOpenSettings);
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(COOKIE_STORAGE_KEY, 'accepted');
    } catch {
      // ignore
    }
    setConsent('accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    try {
      localStorage.setItem(COOKIE_STORAGE_KEY, 'declined');
    } catch {
      // ignore
    }
    setConsent('declined');
    setIsVisible(false);
  };

  return (
    <>
      {/* Cookie Consent Banner Bar */}
      {isVisible && (
        <div
          role="region"
          aria-label="Cookie Consent"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 99990,
            padding: '16px 24px',
            background: 'rgba(8, 9, 15, 0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderTop: '1px solid rgba(0, 255, 204, 0.24)',
            boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.7), 0 0 25px rgba(0, 255, 204, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: isVisible ? 'translateY(0)' : 'translateY(100%)'
          }}
        >
          <div
            style={{
              width: 'min(1400px, 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              flexWrap: 'wrap'
            }}
          >
            {/* Icon + Message */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 540px', minWidth: 0 }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'rgba(0, 255, 204, 0.12)',
                  border: '1px solid rgba(0, 255, 204, 0.35)',
                  color: '#00ffcc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 0 12px rgba(0, 255, 204, 0.2)'
                }}
              >
                <Cookie size={19} />
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.45', color: 'rgba(255, 255, 255, 0.88)' }}>
                We use analytics cookies to understand how the site is used. You can decline without losing any functionality — picks, records, and your account all work the same either way. See our{' '}
                <button
                  type="button"
                  onClick={() => setIsPrivacyOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00ffcc',
                    textDecoration: 'underline',
                    padding: 0,
                    font: 'inherit',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                >
                  Privacy Policy
                </button>.
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={handleDecline}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: 'rgba(255, 255, 255, 0.82)',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.82)';
                }}
              >
                DECLINE
              </button>

              <button
                type="button"
                onClick={handleAccept}
                style={{
                  padding: '9px 22px',
                  borderRadius: '8px',
                  border: '1px solid rgba(0, 255, 204, 0.55)',
                  background: 'rgba(0, 255, 204, 0.18)',
                  color: '#00ffcc',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 0 16px rgba(0, 255, 204, 0.25)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 255, 204, 0.28)';
                  e.currentTarget.style.boxShadow = '0 0 22px rgba(0, 255, 204, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 255, 204, 0.18)';
                  e.currentTarget.style.boxShadow = '0 0 16px rgba(0, 255, 204, 0.25)';
                }}
              >
                ACCEPT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {isPrivacyOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Droplet Privacy Policy"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(4, 5, 10, 0.82)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
          onClick={() => setIsPrivacyOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(640px, 100%)',
              background: 'rgba(12, 13, 22, 0.95)',
              border: '1px solid rgba(0, 255, 204, 0.28)',
              borderRadius: '20px',
              padding: '28px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 255, 204, 0.15)',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              maxHeight: '85vh',
              overflowY: 'auto'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: 'rgba(0, 255, 204, 0.14)',
                    border: '1px solid rgba(0, 255, 204, 0.35)',
                    color: '#00ffcc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <ShieldCheck size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}>
                  Droplet Privacy & Cookies
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivacyOpen(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'rgba(255, 255, 255, 0.82)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: 0 }}>
                Droplet respects your creative freedom and data privacy. We use essential local storage and optional analytics cookies to help us improve performance and understand user interaction across the canvas.
              </p>
              
              <div style={{ padding: '14px 16px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <strong style={{ color: '#00ffcc', fontSize: '0.85rem' }}>● Local Canvas Data</strong>
                <span>All canvas nodes, brand guides, AI prompts, and generated assets remain stored locally in your browser session or secure Workers AI allocation.</span>
              </div>

              <div style={{ padding: '14px 16px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <strong style={{ color: '#00ffcc', fontSize: '0.85rem' }}>● No Data Selling</strong>
                <span>We never sell or monetize your prompt data, custom brand guidelines, or generated media assets to third parties.</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <button
                type="button"
                onClick={() => {
                  handleAccept();
                  setIsPrivacyOpen(false);
                }}
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  background: 'rgba(0, 255, 204, 0.2)',
                  border: '1px solid rgba(0, 255, 204, 0.5)',
                  color: '#00ffcc',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Accept & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
