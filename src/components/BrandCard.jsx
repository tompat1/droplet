import React from 'react';
import { Handle, Position } from '@xyflow/react';

export default function BrandCard({ id, data, isConnectable, selected }) {
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
      
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '20px', marginBottom: '4px' }}>{data.title}</h3>
          {data.subtitle && <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>{data.subtitle}</p>}
        </div>
        {data.canCollapse && (
          <button 
            onClick={(e) => { e.stopPropagation(); data.onToggleCollapse(id); }}
            style={{ 
              background: data.isCollapsed ? 'var(--accent-neon)' : 'rgba(255,255,255,0.1)', 
              border: 'none', 
              color: 'white', 
              borderRadius: '6px', 
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '18px',
              fontFamily: 'monospace',
              transition: 'all 0.2s ease',
              boxShadow: data.isCollapsed ? '0 0 10px rgba(75, 94, 250, 0.4)' : 'none'
            }}
            title={data.isCollapsed ? "Expand Branch" : "Collapse Branch"}
          >
            {data.isCollapsed ? '+' : '−'}
          </button>
        )}
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

      <div style={{ marginTop: '20px' }}>
        <button
          style={{
            width: '100%',
            padding: '10px',
            background: 'rgba(75, 94, 250, 0.15)',
            border: '1px dashed rgba(75, 94, 250, 0.4)',
            borderRadius: '8px',
            color: 'var(--accent-neon)',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(4px)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(75, 94, 250, 0.3)';
            e.currentTarget.style.border = '1px solid rgba(75, 94, 250, 0.8)';
            e.currentTarget.style.boxShadow = '0 0 10px rgba(75, 94, 250, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(75, 94, 250, 0.15)';
            e.currentTarget.style.border = '1px dashed rgba(75, 94, 250, 0.4)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          onClick={(e) => {
            e.stopPropagation();
            alert(`AI Generation Flow triggered for "${data.title}"\n\nImagine a prompt dialog opening here, passing the context of this node to Google Veo or OpenAI to generate new brand assets!`);
          }}
        >
          <span>✨</span> Generate Branch
        </button>
      </div>

      <Handle type="source" position={Position.Right} isConnectable={isConnectable} style={{ background: 'var(--bg-color)', border: '2px solid var(--accent-neon)' }} />
    </div>
  );
}
