import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';

export default function BrandCard({ id, data, isConnectable, selected }) {
  const isEditMode = data.isEditMode !== false; // defaults to true

  const { setNodes, setEdges, getNode } = useReactFlow();
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(data.title || '');
  
  const [isEditingSubtitle, setIsEditingSubtitle] = useState(false);
  const [tempSubtitle, setTempSubtitle] = useState(data.subtitle || '');

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [tempDesc, setTempDesc] = useState(data.description || '');

  const [isHoveringImage, setIsHoveringImage] = useState(false);

  // Generative UI State
  const [genState, setGenState] = useState('idle'); // idle | pipeline | prompt | generating
  const [genPipeline, setGenPipeline] = useState(null); // 'image' | 'video'
  const [genPrompt, setGenPrompt] = useState('');
  const [genRefs, setGenRefs] = useState([]);

  const handleSaveText = (e) => {
    e?.stopPropagation();
    const updater = data.setGlobalNodes || setNodes;
    updater((nds) => nds.map(n => {
      if (n.id === id) {
        return { ...n, data: { ...n.data, title: tempTitle, subtitle: tempSubtitle, description: tempDesc } };
      }
      return n;
    }));
    setIsEditingTitle(false);
    setIsEditingSubtitle(false);
    setIsEditingDesc(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSaveText(e);
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(5);

  useEffect(() => {
    let timer;
    if (isDeleting && deleteCountdown > 0) {
      timer = setTimeout(() => setDeleteCountdown(c => c - 1), 1000);
    } else if (isDeleting && deleteCountdown === 0) {
      const updater = data.setGlobalNodes || setNodes;
      updater((nds) => nds.filter(n => n.id !== id));
    }
    return () => clearTimeout(timer);
  }, [isDeleting, deleteCountdown, id, setNodes, data]);

  const handleDeleteInitiate = (e) => {
    e.stopPropagation();
    setIsDeleting(true);
    setDeleteCountdown(5);
  };

  const handleCancelDelete = (e) => {
    e.stopPropagation();
    setIsDeleting(false);
  };

  const handleConfirmDelete = (e) => {
    e.stopPropagation();
    const updater = data.setGlobalNodes || setNodes;
    updater((nds) => nds.filter(n => n.id !== id));
  };

  const handleChangeImage = (e) => {
    e.stopPropagation();
    const newUrl = window.prompt("Enter new image URL:", data.image);
    if (newUrl) {
      const updater = data.setGlobalNodes || setNodes;
      updater((nds) => nds.map(n => n.id === id ? { ...n, data: { ...n.data, image: newUrl } } : n));
    }
  };

  const handleGenerateRun = () => {
    setGenState('generating');
    
    setTimeout(() => {
      const parentNode = getNode(id);
      const newId = `generated-${Date.now()}`;
      
      const isVideo = genPipeline === 'video';
      const placeholderImg = isVideo ? null : `https://placehold.co/600x400/222/fff?text=AI+${encodeURIComponent((genPrompt || 'Asset').substring(0, 10))}`;
      const placeholderVideo = isVideo ? 'https://www.w3schools.com/html/mov_bbb.mp4' : null;

      const newNode = {
        id: newId,
        type: 'brandCard',
        position: { x: parentNode.position.x + 400, y: parentNode.position.y },
        data: { 
          title: isVideo ? 'New AI Video' : 'New AI Image', 
          subtitle: `Pipeline: ${genPipeline}`,
          description: genPrompt || `Generated from ${data.title}`,
          image: placeholderImg,
          video: placeholderVideo,
          setGlobalNodes: data.setGlobalNodes,
          setGlobalEdges: data.setGlobalEdges
        }
      };
      const newEdge = { 
        id: `e-${id}-${newId}`, source: String(id), target: String(newId), type: 'smoothstep', animated: true, style: { stroke: isVideo ? '#00ffcc' : '#4B5EFA', strokeWidth: 4 } 
      };
      
      const nodeUpdater = data.setGlobalNodes || setNodes;
      const edgeUpdater = data.setGlobalEdges || setEdges;
      nodeUpdater(nds => [...nds, newNode]);
      edgeUpdater(eds => [...eds, newEdge]);
      
      setGenState('idle');
      setGenPrompt('');
      setGenRefs([]);
    }, 2000);
  };
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
        <div style={{ flexGrow: 1, paddingRight: '10px' }}>
          {isEditingTitle ? (
            <input 
              autoFocus value={tempTitle} onChange={e => setTempTitle(e.target.value)} onBlur={handleSaveText} onKeyDown={handleKeyDown}
              style={{ fontSize: '20px', marginBottom: '4px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--accent-neon)', borderRadius: '4px', width: '100%', outline: 'none' }}
            />
          ) : (
            <h3 onClick={() => setIsEditingTitle(true)} style={{ fontSize: '20px', marginBottom: '4px', cursor: 'text' }}>{data.title || 'Add title...'}</h3>
          )}
          
          {isEditingSubtitle ? (
            <input 
              autoFocus value={tempSubtitle} onChange={e => setTempSubtitle(e.target.value)} onBlur={handleSaveText} onKeyDown={handleKeyDown}
              style={{ fontSize: '14px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--accent-neon)', borderRadius: '4px', width: '100%', outline: 'none' }}
            />
          ) : (
            <div 
              onClick={(e) => { 
                if (isEditMode) {
                  e.stopPropagation(); 
                  setIsEditingSubtitle(true); 
                }
              }}
              style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', cursor: isEditMode ? 'text' : 'default', minHeight: '16px' }}
            >{data.subtitle || 'Add subtitle...'}</div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {data.canCollapse && (
            <button 
              onClick={(e) => { e.stopPropagation(); data.onToggleCollapse(id); }}
              style={{ 
                background: data.isCollapsed ? 'var(--accent-neon)' : 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px', fontFamily: 'monospace', transition: 'all 0.2s ease', boxShadow: data.isCollapsed ? '0 0 10px rgba(75, 94, 250, 0.4)' : 'none'
              }}
              title={data.isCollapsed ? "Expand Branch" : "Collapse Branch"}
            >
              {data.isCollapsed ? '+' : '−'}
            </button>
          )}
          {isEditMode && (
            <button 
              onClick={handleDeleteInitiate}
              style={{ 
                background: 'rgba(255,50,50,0.15)', border: 'none', color: '#ff8888', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px', transition: 'all 0.2s ease'
              }}
              title="Delete Node"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {data.image && (
        <div 
          onMouseEnter={() => setIsHoveringImage(true)}
          onMouseLeave={() => setIsHoveringImage(false)}
          style={{ width: '100%', height: '180px', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px', position: 'relative' }}
        >
          <img src={data.image} alt={data.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {isEditMode && (
            <div 
              onClick={handleChangeImage}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isHoveringImage ? 1 : 0, transition: 'opacity 0.2s', cursor: 'pointer', color: 'white', fontWeight: 'bold', backdropFilter: 'blur(2px)' }}
            >
              Change Image
            </div>
          )}
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

      {isEditingDesc ? (
        <textarea 
          autoFocus value={tempDesc} onChange={e => setTempDesc(e.target.value)} onBlur={handleSaveText}
          style={{ fontSize: '14px', lineHeight: '1.5', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--accent-neon)', borderRadius: '4px', width: '100%', minHeight: '60px', outline: 'none', resize: 'vertical' }}
        />
      ) : (
        <p 
          onClick={(e) => { 
            if (isEditMode) {
              e.stopPropagation(); 
              setIsEditingDesc(true); 
            }
          }}
          style={{ fontSize: '14px', lineHeight: '1.5', color: 'rgba(255,255,255,0.8)', cursor: isEditMode ? 'text' : 'default', minHeight: '20px' }}
        >
          {data.description || 'Add description...'}
        </p>
      )}

      {isEditMode && (
      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {genState === 'idle' && (
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
            onClick={(e) => { e.stopPropagation(); setGenState('pipeline'); }}
          >
            <span>✨</span> Generate Branch
          </button>
        )}

        {genState === 'pipeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>Select AI Pipeline:</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={(e) => { e.stopPropagation(); setGenPipeline('image'); setGenState('prompt'); }}
                style={{ flex: 1, padding: '8px', background: 'rgba(75, 94, 250, 0.2)', border: '1px solid rgba(75, 94, 250, 0.5)', borderRadius: '6px', color: 'white', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 'bold' }}
              >🖼️ Image</button>
              <button 
                onClick={(e) => { e.stopPropagation(); setGenPipeline('video'); setGenState('prompt'); }}
                style={{ flex: 1, padding: '8px', background: 'rgba(0, 255, 204, 0.2)', border: '1px solid rgba(0, 255, 204, 0.5)', borderRadius: '6px', color: 'white', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 'bold' }}
              >🎥 Video</button>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setGenState('idle'); }}
              style={{ padding: '6px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '12px' }}
            >Cancel</button>
          </div>
        )}

        {genState === 'prompt' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>{genPipeline === 'image' ? '🖼️ Image Prompt' : '🎥 Video Prompt'}:</span>
            <textarea 
              autoFocus
              placeholder="Describe what you want to generate..."
              value={genPrompt}
              onChange={(e) => setGenPrompt(e.target.value)}
              style={{ width: '100%', minHeight: '60px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: 'white', padding: '8px', fontSize: '12px', resize: 'vertical', outline: 'none' }}
            />
            
            {genRefs.length > 0 && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {genRefs.map((refUrl, idx) => (
                  <div key={idx} style={{ width: '30px', height: '30px', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.3)' }}>
                    <img src={refUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
            
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                const url = window.prompt("Enter reference image URL:");
                if (url) setGenRefs([...genRefs, url]);
              }}
              style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '4px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '11px', textAlign: 'left' }}
            >+ Add Reference Image</button>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button 
                onClick={(e) => { e.stopPropagation(); handleGenerateRun(); }}
                style={{ flex: 1, padding: '8px', background: 'var(--accent-neon)', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
              >✨ Run</button>
              <button 
                onClick={(e) => { e.stopPropagation(); setGenState('idle'); setGenPrompt(''); setGenRefs([]); }}
                style={{ padding: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: 'white', cursor: 'pointer' }}
              >Cancel</button>
            </div>
          </div>
        )}

        {genState === 'generating' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-neon)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1.5s linear infinite' }}>
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
            </svg>
            <span style={{ fontSize: '13px', color: 'var(--accent-neon)', fontWeight: 'bold' }}>Generating AI Asset...</span>
          </div>
        )}
      </div>
      )}

      <Handle type="source" position={Position.Right} isConnectable={isConnectable} style={{ background: 'var(--bg-color)', border: '2px solid var(--accent-neon)' }} />

      {isDeleting && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(20,20,25,0.95)', backdropFilter: 'blur(12px)',
          borderRadius: '16px', zIndex: 10, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', color: '#ff8888', gap: '16px',
          border: '1px solid rgba(255,50,50,0.3)'
        }}>
          <style>{`
            @keyframes spin { 100% { transform: rotate(360deg); } }
          `}</style>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1.5s linear infinite' }}>
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
            </svg>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Deleting in {deleteCountdown}...</span>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={handleCancelDelete}
              style={{ 
                padding: '8px 20px', 
                background: 'rgba(255,255,255,0.1)', 
                border: '1px solid rgba(255,255,255,0.3)', 
                color: 'white', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontWeight: '600',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              Cancel
            </button>
            <button 
              onClick={handleConfirmDelete}
              style={{ 
                padding: '8px 20px', 
                background: 'rgba(255,50,50,0.15)', 
                border: '1px solid rgba(255,50,50,0.4)', 
                color: '#ff8888', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontWeight: '600',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,50,50,0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,50,50,0.15)'}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
