import React from 'react';
import { Handle, Position } from '@xyflow/react';

export default function BrandCard({ data, isConnectable }) {
  return (
    <div className="glass-panel" style={{ width: '320px', padding: '20px', cursor: 'grab' }}>
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

      {data.description && (
        <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'rgba(255,255,255,0.8)' }}>
          {data.description}
        </p>
      )}

      <Handle type="source" position={Position.Right} isConnectable={isConnectable} style={{ background: 'var(--bg-color)', border: '2px solid var(--accent-neon)' }} />
    </div>
  );
}
