import React from 'react';

export default function CallToAction() {
  return (
    <div style={{ padding: '120px 20px', textAlign: 'center', position: 'relative', zIndex: 10 }}>
      <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', padding: '60px 40px' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>Ready to Dive In?</h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', marginBottom: '40px' }}>
          Request a demo of the Droplet platform and see how we can elevate your brand's digital presence.
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
    </div>
  );
}
