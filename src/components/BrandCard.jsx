import React from 'react';
import { Handle, Position } from '@xyflow/react';

export default function BrandCard({ data, isConnectable, selected }) {
  return (
    <div 
      className="glass-panel" 
      style={{ 
        width: '320px', 
        padding: '20px', 
        cursor: 'grab',
        borderColor: selected ? 'var(--accent-neon)' : 'rgba(255,255,255,0.1)',
        boxShadow: selected ? '0 0 25px rgba(76, 92, 255, 0.6), 0 4px 30px rgba(0, 0, 0, 0.2)' : '0 4px 30px rgba(0, 0, 0, 0.1)',
        transform: selected ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
        transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      }}
    >
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} style={{ background: 'var(--bg-color)', border: '2px solid var(--accent-neon)' }} />
      
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '20px', marginBottom: '4px' }}>{data.title}</h3>
        {data.subtitle && <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>{data.subtitle}</p>}
      </div>

      {data.image && (
        <div style={{ width: '100%', height: '180px', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
          <img src={data.image} alt={data.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {data.video && (
        <div style={{ width: '100%', height: '180px', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
          <video src={data.video} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {data.colors && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px', padding: '10px 0' }}>
          {data.colors.map((color, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div 
                style={{
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '50%', 
                  backgroundColor: color.hex,
                  border: '1px solid rgba(255,255,255,0.2)',
                  flexShrink: 0
                }}
                title={color.hex}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>{color.name}</span>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{color.hex}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.description && (
        <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'rgba(255,255,255,0.8)' }}>
          {data.description}
        </p>
      )}

      <Handle type="source" position={Position.Right} isConnectable={isConnectable} style={{ background: 'var(--bg-color)', border: '2px solid var(--accent-neon)' }} />
    </div>
  );
}
