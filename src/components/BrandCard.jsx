import React, { useState, useEffect, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { generationApi } from '../lib/apiClient';
import { downloadMediaSource, mediaFilename, readImageFileAsDataUrl } from '../lib/mediaFiles';
import DropletLoader from './DropletLoader';

const GENERATION_PROVIDERS = {
  openai_image: {
    label: 'ChatGPT Images',
    shortLabel: 'ChatGPT',
    pipeline: 'image',
    accent: '#4B5EFA'
  },
  gemini_banana_pro: {
    label: 'Gemini Banana Pro',
    shortLabel: 'Banana Pro',
    pipeline: 'image',
    accent: '#ff9f1c'
  },
  google_veo: {
    label: 'Google Veo',
    shortLabel: 'Veo',
    pipeline: 'video',
    accent: '#00ffcc'
  }
};

export default function BrandCard({ id, data, isConnectable, selected }) {
  const isEditMode = data.isEditMode === true; // defaults to false

  const { setNodes, setEdges, getNode, getNodes, getEdges, setCenter } = useReactFlow();
  
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
  const [genProvider, setGenProvider] = useState(null);
  const [genPrompt, setGenPrompt] = useState('');
  const [genRefs, setGenRefs] = useState([]);
  const [genError, setGenError] = useState('');

  // 3D Parallax Tilt State
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHoveringHandle, setIsHoveringHandle] = useState(false);
  const cardRef = React.useRef(null);
  const imageInputRef = React.useRef(null);
  const referenceInputRef = React.useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current || isHoveringHandle) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeaveParallax = () => {
    setTilt({ x: 0, y: 0 });
  };

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

  const deleteNodeAndEdges = useCallback(() => {
    const deletedNode = getNode(id);
    const deletedEdges = getEdges().filter(edge => edge.source === id || edge.target === id);
    if (deletedNode) {
      data.pushUndoAction?.({
        type: 'delete-node',
        label: `Restore ${deletedNode.data?.title || 'node'}`,
        node: deletedNode,
        edges: deletedEdges
      });
    }

    const nodeUpdater = data.setGlobalNodes || setNodes;
    const edgeUpdater = data.setGlobalEdges || setEdges;
    nodeUpdater((nds) => nds.filter(n => n.id !== id));
    edgeUpdater((eds) => eds.filter(edge => edge.source !== id && edge.target !== id));
  }, [data, getEdges, getNode, id, setEdges, setNodes]);

  useEffect(() => {
    let timer;
    if (isDeleting && deleteCountdown > 0) {
      timer = setTimeout(() => setDeleteCountdown(c => c - 1), 1000);
    } else if (isDeleting && deleteCountdown === 0) {
      deleteNodeAndEdges();
    }
    return () => clearTimeout(timer);
  }, [deleteCountdown, deleteNodeAndEdges, isDeleting]);

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
    deleteNodeAndEdges();
  };

  const updateCardImage = useCallback((imageUrl) => {
    const updater = data.setGlobalNodes || setNodes;
    updater((nds) => nds.map(n => n.id === id ? { ...n, data: { ...n.data, image: imageUrl } } : n));
  }, [data, id, setNodes]);

  const handleChangeImage = (e) => {
    e.stopPropagation();
    imageInputRef.current?.click();
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      updateCardImage(dataUrl);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not upload that image.');
    }
  };

  const handleImageUrlChange = (e) => {
    e.stopPropagation();
    const newUrl = window.prompt("Enter new image URL:", data.image);
    if (newUrl) updateCardImage(newUrl);
  };

  const handleDownloadMedia = (event, source, type = 'image') => {
    event.stopPropagation();
    const extension = type === 'video' ? 'mp4' : (source?.startsWith('data:image/png') ? 'png' : 'webp');
    downloadMediaSource(source, mediaFilename(data.title || `${type}-${id}`, extension));
  };

  const handleReferenceUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      setGenRefs((refs) => [...refs, dataUrl]);
      setGenError('');
    } catch (error) {
      setGenError(error instanceof Error ? error.message : 'Could not upload that reference image.');
    }
  };

  const branchOffsetForIndex = (index) => {
    if (index === 0) return 0;
    const row = Math.ceil(index / 2);
    return row * 330 * (index % 2 === 0 ? -1 : 1);
  };

  const makeGeneratedPlaceholder = ({ isVideo, title, prompt, providerLabel = '' }) => {
    const escapedTitle = title.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const escapedPrompt = prompt.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const escapedProvider = providerLabel.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${isVideo ? '#002b24' : '#111318'}"/><stop offset="1" stop-color="${isVideo ? '#00ffcc' : '#4B5EFA'}" stop-opacity=".42"/></linearGradient><filter id="s"><feDropShadow dx="0" dy="16" stdDeviation="12" flood-color="#000" flood-opacity=".35"/></filter></defs><rect width="640" height="420" rx="26" fill="url(#g)"/><g filter="url(#s)" transform="translate(320 176)"><circle r="82" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.28)" stroke-width="2"/><path d="${isVideo ? 'M-24-36l72 36-72 36z' : 'M0-48l14 34h37L21 8l11 36L0 23l-32 21 11-36-30-22h37z'}" fill="white" opacity=".92"/></g><text x="320" y="286" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="18" font-weight="800" fill="rgba(255,255,255,.72)">${escapedProvider}</text><text x="320" y="318" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="24" font-weight="800" fill="white">${escapedTitle}</text><text x="320" y="352" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="15" fill="rgba(255,255,255,.68)">${escapedPrompt.slice(0, 64)}</text></svg>`)}`;
  };

  const buildGeneratedNode = ({ providerKey, prompt, branchIndex, parentNode, result }) => {
    const provider = GENERATION_PROVIDERS[providerKey] || GENERATION_PROVIDERS.openai_image;
    const isVideo = provider.pipeline === 'video';
    const branchTitle = result?.branch?.title || `${isVideo ? 'Video' : 'Image'} Branch ${branchIndex + 1}`;
    const mediaUrl = result?.branch?.imageDataUrl || result?.branch?.imageUrl || result?.branch?.posterUrl || '';
    const placeholderImg = mediaUrl || makeGeneratedPlaceholder({
      isVideo,
      title: branchTitle,
      prompt,
      providerLabel: provider.shortLabel
    });
    const newId = `generated-${Date.now()}`;

    return {
      id: newId,
      type: 'brandCard',
      position: { x: parentNode.position.x + 430, y: parentNode.position.y + branchOffsetForIndex(branchIndex) },
      data: {
        title: branchTitle,
        subtitle: result?.branch?.subtitle || `${provider.label} branch from ${data.title || 'node'}`,
        description: result?.branch?.description || prompt,
        image: placeholderImg,
        video: result?.branch?.videoUrl || undefined,
        isGenerated: true,
        generatedFromNodeId: id,
        generationPipeline: provider.pipeline,
        generationProvider: providerKey,
        generationProviderLabel: provider.label,
        generationModel: result?.branch?.model || '',
        generationPrompt: prompt,
        generationRefs: result?.branch?.refs || genRefs,
        generationBrandGuideNodeIds: result?.branch?.brandGuideNodeIds || [],
        generationStatus: result?.branch?.status || (result?.mock ? 'mock' : 'ready'),
        generationOperationName: result?.branch?.operationName || '',
        generationMock: result?.mock === true || result?.branch?.mock === true,
        nodeGroup: `generated-${id}`,
        setGlobalNodes: data.setGlobalNodes,
        setGlobalEdges: data.setGlobalEdges
      }
    };
  };

  const handleGenerateRun = async () => {
    const providerKey = genProvider || (genPipeline === 'video' ? 'google_veo' : 'openai_image');
    const provider = GENERATION_PROVIDERS[providerKey] || GENERATION_PROVIDERS.openai_image;
    const prompt = genPrompt.trim() || `Generate a ${provider.pipeline} branch from ${data.title}`;
    setGenError('');
    setGenState('generating');

    try {
      const parentNode = getNode(id);
      if (!parentNode) {
        setGenState('idle');
        return;
      }

      const existingNodes = getNodes();
      const branchIndex = existingNodes.filter((node) => node.data?.generatedFromNodeId === id).length;
      const brandGuideNodes = existingNodes.filter((node) => {
        const nodeData = node.data || {};
        return nodeData.isBrandGuideSource === true || nodeData.sourceOfTruth === true || nodeData.referenceRole === 'brand-guide';
      });
      const brandGuideRefs = brandGuideNodes
        .map((node) => node.data?.image)
        .filter(Boolean);
      const mergedRefs = Array.from(new Set([...brandGuideRefs, ...genRefs]));
      const brandGuide = {
        nodes: brandGuideNodes.map((node) => ({
          id: node.id,
          title: node.data?.title || '',
          subtitle: node.data?.subtitle || '',
          description: node.data?.description || '',
          image: node.data?.image || '',
          brandName: node.data?.brandName || ''
        }))
      };
      const result = await generationApi.createBranch({
        provider: providerKey,
        pipeline: provider.pipeline,
        prompt,
        refs: mergedRefs,
        brandGuide,
        parent: {
          id,
          title: data.title || '',
          subtitle: data.subtitle || '',
          description: data.description || '',
          image: data.image || ''
        }
      });
      if (result?.branch) {
        result.branch.refs = mergedRefs;
        result.branch.brandGuideNodeIds = brandGuide.nodes.map((node) => node.id);
      }
      const newNode = buildGeneratedNode({ providerKey, prompt, branchIndex, parentNode, result });

      const newEdge = { 
        id: `e-${id}-${newNode.id}`, source: String(id), target: String(newNode.id), type: 'smoothstep', animated: true, style: { stroke: provider.accent, strokeWidth: 4 } 
      };
      
      const nodeUpdater = data.setGlobalNodes || setNodes;
      const edgeUpdater = data.setGlobalEdges || setEdges;
      nodeUpdater(nds => [...nds, newNode]);
      edgeUpdater(eds => [...eds, newEdge]);
      
      setGenState('idle');
      setGenProvider(null);
      setGenPipeline(null);
      setGenPrompt('');
      setGenRefs([]);
      window.requestAnimationFrame(() => {
        setCenter(newNode.position.x + 160, newNode.position.y + 180, { zoom: 0.9, duration: 700 });
      });
    } catch (error) {
      setGenState('prompt');
      setGenError(error instanceof Error ? error.message : 'Generation failed');
    }
  };
  const isParentCollapsed = data.isParentCollapsed === true;

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeaveParallax}
      className="glass-panel" 
      style={{ 
        width: '320px', 
        padding: '20px', 
        cursor: 'default',
        background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.85) 0%, rgba(10, 10, 15, 0.9) 100%)',
        borderColor: (data.isHighlighted || selected) ? 'rgba(75, 94, 250, 1)' : 'rgba(255,255,255,0.1)',
        boxShadow: data.isHighlighted 
          ? '0 0 30px rgba(75, 94, 250, 0.8), inset 0 0 10px rgba(75, 94, 250, 0.5)' 
          : (selected ? '0 0 25px rgba(76, 92, 255, 0.6), 0 4px 30px rgba(0, 0, 0, 0.2)' : '0 4px 30px rgba(0, 0, 0, 0.1)'),
        opacity: isParentCollapsed ? 0 : 1,
        pointerEvents: isParentCollapsed ? 'none' : 'auto',
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${isParentCollapsed ? `translate(${data.parentOffsetX || 0}px, ${data.parentOffsetY || 0}px) scale(0.1)` : (data.isHighlighted ? 'scale(1.05)' : (selected ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)'))}`,
        transition: isParentCollapsed 
          ? 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)' 
          : (tilt.x === 0 && tilt.y === 0 ? 'all 0.5s ease' : 'transform 0.1s ease-out, box-shadow 0.5s ease, border-color 0.5s ease, opacity 0.5s ease')
      }}
    >
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} style={{ background: 'var(--bg-color)', border: '2px solid var(--accent-neon)' }} />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />
      <input
        ref={referenceInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleReferenceUpload}
      />
      
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flexGrow: 1, paddingRight: '10px' }}>
          {isEditingTitle ? (
            <input 
              autoFocus value={tempTitle} onChange={e => setTempTitle(e.target.value)} onBlur={handleSaveText} onKeyDown={handleKeyDown}
              style={{ fontSize: '20px', marginBottom: '4px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--accent-neon)', borderRadius: '4px', width: '100%', outline: 'none' }}
            />
          ) : (
            <h3 
              onClick={(e) => {
                if (isEditMode || data.isGenerated) {
                  e.stopPropagation();
                  setIsEditingTitle(true);
                }
              }} 
              style={{ fontSize: '20px', marginBottom: '4px', cursor: (isEditMode || data.isGenerated) ? 'text' : 'default' }}
            >
              {data.title || 'Add title...'}
            </h3>
          )}
          
          {isEditingSubtitle ? (
            <input 
              autoFocus value={tempSubtitle} onChange={e => setTempSubtitle(e.target.value)} onBlur={handleSaveText} onKeyDown={handleKeyDown}
              style={{ fontSize: '14px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--accent-neon)', borderRadius: '4px', width: '100%', outline: 'none' }}
            />
          ) : (
            <div 
              onClick={(e) => { 
                if (isEditMode || data.isGenerated) {
                  e.stopPropagation(); 
                  setIsEditingSubtitle(true); 
                }
              }}
              style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', cursor: (isEditMode || data.isGenerated) ? 'text' : 'default', minHeight: '16px' }}
            >{data.subtitle || 'Add subtitle...'}</div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div 
            className="custom-drag-handle" 
            style={{ 
              color: 'rgba(255,255,255,0.3)', 
              cursor: 'grab', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '4px',
              transition: 'color 0.2s ease'
            }} 
            title="Drag Node"
            onMouseEnter={(e) => {
              setIsHoveringHandle(true);
              setTilt({ x: 0, y: 0 });
              e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
            }}
            onMouseLeave={(e) => {
              setIsHoveringHandle(false);
              e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="5" r="2"/>
              <circle cx="15" cy="5" r="2"/>
              <circle cx="9" cy="12" r="2"/>
              <circle cx="15" cy="12" r="2"/>
              <circle cx="9" cy="19" r="2"/>
              <circle cx="15" cy="19" r="2"/>
            </svg>
          </div>
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
          {(isEditMode || data.isGenerated) && (
            <button 
              onClick={handleDeleteInitiate}
              style={{ 
                background: 'rgba(255,50,50,0.15)', border: '1px solid rgba(255,80,80,0.25)', color: '#ff8888', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px', transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,50,50,0.35)'; e.currentTarget.style.color = '#fff'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,50,50,0.15)'; e.currentTarget.style.color = '#ff8888'; }}
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
          <button
            type="button"
            onClick={(event) => handleDownloadMedia(event, data.image, 'image')}
            title="Download image"
            aria-label="Download image"
            style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 3, width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(0,0,0,0.52)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', opacity: isHoveringImage || data.isGenerated ? 1 : 0, transition: 'opacity 0.2s', backdropFilter: 'blur(6px)' }}
          >
            ↓
          </button>
          {isEditMode && (
            <div
              style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: isHoveringImage ? 1 : 0, transition: 'opacity 0.2s', color: 'white', fontWeight: 'bold', backdropFilter: 'blur(2px)' }}
            >
              <button type="button" onClick={handleChangeImage} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(75,94,250,0.72)', color: '#fff', cursor: 'pointer', fontWeight: 800 }}>
                Upload
              </button>
              <button type="button" onClick={handleImageUrlChange} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontWeight: 800 }}>
                URL
              </button>
            </div>
          )}
        </div>
      )}

      {data.video && (
        <div style={{ width: '100%', height: '180px', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px', position: 'relative' }}>
          <video src={data.video} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <button
            type="button"
            onClick={(event) => handleDownloadMedia(event, data.video, 'video')}
            title="Download video"
            aria-label="Download video"
            style={{ position: 'absolute', top: '8px', right: '8px', width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(0,0,0,0.52)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', backdropFilter: 'blur(6px)' }}
          >
            ↓
          </button>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
              <button 
                onClick={(e) => { e.stopPropagation(); setGenProvider('openai_image'); setGenPipeline('image'); setGenState('prompt'); }}
                style={{ padding: '8px', background: 'rgba(75, 94, 250, 0.2)', border: '1px solid rgba(75, 94, 250, 0.5)', borderRadius: '6px', color: 'white', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 'bold', textAlign: 'left' }}
              >🖼️ ChatGPT Images</button>
              <button 
                onClick={(e) => { e.stopPropagation(); setGenProvider('gemini_banana_pro'); setGenPipeline('image'); setGenState('prompt'); }}
                style={{ padding: '8px', background: 'rgba(255, 159, 28, 0.18)', border: '1px solid rgba(255, 159, 28, 0.48)', borderRadius: '6px', color: 'white', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 'bold', textAlign: 'left' }}
              >🍌 Gemini Banana Pro</button>
              <button 
                onClick={(e) => { e.stopPropagation(); setGenProvider('google_veo'); setGenPipeline('video'); setGenState('prompt'); }}
                style={{ padding: '8px', background: 'rgba(0, 255, 204, 0.2)', border: '1px solid rgba(0, 255, 204, 0.5)', borderRadius: '6px', color: 'white', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 'bold', textAlign: 'left' }}
              >🎥 Google Veo</button>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setGenState('idle'); setGenProvider(null); setGenPipeline(null); setGenError(''); }}
              style={{ padding: '6px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '12px' }}
            >Cancel</button>
          </div>
        )}

        {genState === 'prompt' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>{genPipeline === 'image' ? '🖼️' : '🎥'} {GENERATION_PROVIDERS[genProvider]?.label || 'AI'} Prompt:</span>
            <textarea 
              autoFocus
              placeholder="Describe what you want to generate..."
              value={genPrompt}
              onChange={(e) => { setGenPrompt(e.target.value); setGenError(''); }}
              style={{ width: '100%', minHeight: '60px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: 'white', padding: '8px', fontSize: '12px', resize: 'vertical', outline: 'none' }}
            />
            {genError && (
              <div style={{ padding: '7px 8px', border: '1px solid rgba(255, 99, 99, 0.35)', background: 'rgba(255, 70, 70, 0.12)', borderRadius: '6px', color: '#ff9c9c', fontSize: '11px', lineHeight: 1.35 }}>
                {genError}
              </div>
            )}
            
            {genRefs.length > 0 && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {genRefs.map((refUrl, idx) => (
                  <div key={idx} style={{ width: '30px', height: '30px', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.3)' }}>
                    <img src={refUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                onClick={(e) => { e.stopPropagation(); referenceInputRef.current?.click(); }}
                style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '4px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '11px', textAlign: 'left' }}
              >+ Upload Ref</button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const url = window.prompt("Enter reference image URL:");
                  if (url) setGenRefs([...genRefs, url]);
                }}
                style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '4px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '11px', textAlign: 'left' }}
              >+ Ref URL</button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button 
                onClick={(e) => { e.stopPropagation(); handleGenerateRun(); }}
                style={{ flex: 1, padding: '8px', background: 'var(--accent-neon)', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
              >✨ Run</button>
              <button 
                onClick={(e) => { e.stopPropagation(); setGenState('idle'); setGenProvider(null); setGenPipeline(null); setGenPrompt(''); setGenRefs([]); setGenError(''); }}
                style={{ padding: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: 'white', cursor: 'pointer' }}
              >Cancel</button>
            </div>
          </div>
        )}

        {genState === 'generating' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
            <DropletLoader label={`Generating with ${GENERATION_PROVIDERS[genProvider]?.shortLabel || 'AI'}`} size={118} compact />
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
