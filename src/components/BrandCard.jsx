import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { generationApi } from '../lib/apiClient';
import { downloadMediaSource, mediaFilename, readImageFileAsDataUrl } from '../lib/mediaFiles';
import DropletLoader from './DropletLoader';

const GENERATION_PROVIDERS = {
  cloudflare_flux_klein: {
    label: 'Cloudflare FLUX.2 Klein',
    shortLabel: 'FLUX Klein',
    pipeline: 'image',
    accent: '#f5d76e'
  },
  cloudflare_flux_klein_9b: {
    label: 'Cloudflare FLUX.2 Klein 9B',
    shortLabel: 'FLUX 9B',
    pipeline: 'image',
    accent: '#ffb84d'
  },
  cloudflare_flux_schnell: {
    label: 'Cloudflare FLUX Schnell',
    shortLabel: 'FLUX',
    pipeline: 'image',
    accent: '#00ffcc'
  },
  cloudflare_sdxl: {
    label: 'Cloudflare SDXL',
    shortLabel: 'SDXL',
    pipeline: 'image',
    accent: '#8fd3ff'
  },
  cloudflare_sdxl_lightning: {
    label: 'Cloudflare SDXL Lightning',
    shortLabel: 'Lightning',
    pipeline: 'image',
    accent: '#ffe66d'
  },
  cloudflare_sd_img2img: {
    label: 'Cloudflare SD Img2Img',
    shortLabel: 'Img2Img',
    pipeline: 'image',
    accent: '#92ffb8'
  },
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
  },
  grok_image: {
    label: 'Grok Images',
    shortLabel: 'Grok',
    pipeline: 'image',
    accent: '#ffffff'
  }
};

const FREE_IMAGE_PROVIDER_KEYS = [
  'cloudflare_flux_klein',
  'cloudflare_flux_klein_9b',
  'cloudflare_flux_schnell',
  'cloudflare_sdxl',
  'cloudflare_sdxl_lightning',
  'cloudflare_sd_img2img'
];

const API_KEY_PROVIDER_KEYS = [
  'openai_image',
  'gemini_banana_pro',
  'grok_image',
  'google_veo'
];

const generatedNodeId = (prefix = 'generated') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const isBrandGuideNode = (node) => {
  const nodeData = node?.data || {};
  return node?.type === 'brandCard' && (
    nodeData.isBrandGuideSource === true ||
    nodeData.sourceOfTruth === true ||
    nodeData.referenceRole === 'brand-guide' ||
    Array.isArray(nodeData.colors)
  );
};

const labelMemberIdsFromNodes = (labelNode, nodes) => {
  const memberIds = new Set(Array.isArray(labelNode?.data?.memberIds) ? labelNode.data.memberIds : []);
  nodes.forEach((node) => {
    if (node.type === 'brandCard' && node.data?.labelGroupId === labelNode.id) {
      memberIds.add(node.id);
    }
  });
  return [...memberIds];
};

const brandGuideNodesForAsset = (assetNode, nodes) => {
  const allGuideNodes = nodes.filter(isBrandGuideNode);
  if (!assetNode) return allGuideNodes;

  const scopedGuideIds = new Set();
  if (isBrandGuideNode(assetNode)) scopedGuideIds.add(assetNode.id);
  const labelId = assetNode.data?.labelGroupId;
  if (labelId) {
    const labelNode = nodes.find((node) => node.id === labelId && node.type === 'labelNode');
    if (labelNode) {
      labelMemberIdsFromNodes(labelNode, nodes).forEach((memberId) => {
        const memberNode = nodes.find((node) => node.id === memberId);
        if (isBrandGuideNode(memberNode)) scopedGuideIds.add(memberId);
      });
      (Array.isArray(labelNode.data?.sourceOfTruthNodeIds) ? labelNode.data.sourceOfTruthNodeIds : [])
        .forEach((sourceId) => scopedGuideIds.add(sourceId));
    }
  }

  const scopedGuideNodes = allGuideNodes.filter((node) => scopedGuideIds.has(node.id));
  return scopedGuideNodes.length > 0 ? scopedGuideNodes : allGuideNodes;
};

const brandGuidePayloadFromNode = (node) => ({
  id: node.id,
  title: node.data?.title || '',
  subtitle: node.data?.subtitle || '',
  description: node.data?.description || '',
  image: node.data?.image || '',
  brandName: node.data?.brandName || '',
  colors: Array.isArray(node.data?.colors) ? node.data.colors : [],
  labelGroupId: node.data?.labelGroupId || '',
  labelTitle: node.data?.labelTitle || ''
});

const PROMPT_HELP_SECTIONS = [
  {
    title: 'Creative brief',
    text: 'Name the subject, audience, use case, and campaign feeling.'
  },
  {
    title: 'Composition',
    text: 'Call out framing, angle, placement, negative space, and exact text.'
  },
  {
    title: 'Lighting + style',
    text: 'Specify lighting, material texture, realism level, and mood.'
  },
  {
    title: 'Brand lock',
    text: 'Mention colors naturally; Droplet will map them to brand-guide colors.'
  },
  {
    title: 'Preserve refs',
    text: 'Say what must stay unchanged when using reference images.'
  }
];
const PROMPT_STARTERS = [
  'Create a polished campaign image for...',
  'Use the brand guide as the source of truth and generate...',
  'Keep the product identity unchanged while changing...',
  'Compose a premium studio shot with...',
  'Make a social ad with exact copy: "..."'
];

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
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);

  // Generative UI State
  const [genState, setGenState] = useState('idle'); // idle | pipeline | prompt | generating
  const [genPipeline, setGenPipeline] = useState(null); // 'image' | 'video'
  const [genProvider, setGenProvider] = useState(null);
  const [genPrompt, setGenPrompt] = useState('');
  const [genRefs, setGenRefs] = useState([]);
  const [genError, setGenError] = useState('');
  const [isPromptHelpOpen, setIsPromptHelpOpen] = useState(false);

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
  const [deleteCountdown, setDeleteCountdown] = useState(3);
  const [isRerenderingDeleted, setIsRerenderingDeleted] = useState(false);

  const rerenderDeletedGeneratedNode = useCallback(async (deletedNode, deletedEdges) => {
    const deletedData = deletedNode.data || {};
    const providerKey = deletedData.generationProvider;
    const provider = GENERATION_PROVIDERS[providerKey];
    const prompt = String(deletedData.generationPrompt || '').trim();
    if (!provider || !prompt) return;

    setIsRerenderingDeleted(true);
    try {
      const sourceNodes = getNodes().filter((node) => node.id !== deletedNode.id);
      const parentNode = sourceNodes.find((node) => node.id === deletedData.generatedFromNodeId) || null;
      const guideIds = new Set(Array.isArray(deletedData.generationBrandGuideNodeIds) ? deletedData.generationBrandGuideNodeIds : []);
      const brandGuideNodes = sourceNodes.filter((node) => guideIds.has(node.id));
      const brandGuide = {
        nodes: brandGuideNodes.map(brandGuidePayloadFromNode)
      };
      const refs = Array.from(new Set(Array.isArray(deletedData.generationRefs) ? deletedData.generationRefs : []));
      const result = await generationApi.createBranch({
        provider: providerKey,
        pipeline: provider.pipeline,
        prompt,
        refs,
        brandGuide,
        parent: parentNode ? {
          id: parentNode.id,
          title: parentNode.data?.title || '',
          subtitle: parentNode.data?.subtitle || '',
          description: parentNode.data?.description || '',
          image: parentNode.data?.image || ''
        } : {
          id: deletedData.generatedFromNodeId || 'rerender',
          title: deletedData.title || 'Deleted render',
          subtitle: deletedData.subtitle || '',
          description: deletedData.description || '',
          image: ''
        }
      });

      const isVideo = provider.pipeline === 'video';
      const title = result?.branch?.title || `${isVideo ? 'Video' : 'Image'} Rerender`;
      const mediaUrl = result?.branch?.imageDataUrl || result?.branch?.imageUrl || result?.branch?.posterUrl || '';
      const newId = generatedNodeId('rerendered');
      const newNode = {
        ...deletedNode,
        id: newId,
        selected: true,
        data: {
          ...deletedData,
          title,
          subtitle: result?.branch?.subtitle || `${provider.label} rerender`,
          description: result?.branch?.description || prompt,
          image: mediaUrl || makeGeneratedPlaceholder({
            isVideo,
            title,
            prompt,
            providerLabel: provider.shortLabel
          }),
          video: result?.branch?.videoUrl || undefined,
          generationModel: result?.branch?.model || '',
          generationStatus: result?.branch?.status || (result?.mock ? 'mock' : 'ready'),
          generationOperationName: result?.branch?.operationName || '',
          generationMock: result?.mock === true || result?.branch?.mock === true,
          generationUsage: result?.usage || result?.branch?.usage || null,
          generationRerenderedFromNodeId: deletedNode.id,
          generationRerenderedAt: new Date().toISOString(),
          setGlobalNodes: data.setGlobalNodes,
          setGlobalEdges: data.setGlobalEdges
        }
      };
      const sourceEdge = deletedEdges.find((edge) => edge.target === deletedNode.id && edge.source !== deletedNode.id);
      const labelEdge = deletedEdges.find((edge) => edge.target === deletedNode.id && edge.data?.isLabelLink);
      const nextEdges = [
        sourceEdge ? { ...sourceEdge, id: `e-${sourceEdge.source}-${newId}`, target: newId, style: { ...(sourceEdge.style || {}), stroke: provider.accent } } : null,
        labelEdge ? { ...labelEdge, id: `label-${labelEdge.source}-${newId}`, target: newId } : null
      ].filter(Boolean);

      const nodeUpdater = data.setGlobalNodes || setNodes;
      const edgeUpdater = data.setGlobalEdges || setEdges;
      nodeUpdater((nds) => [...nds.map((node) => ({ ...node, selected: false })), newNode]);
      if (nextEdges.length) edgeUpdater((eds) => [...eds, ...nextEdges]);
      data.onGenerationUsageUpdate?.(result?.usage || result?.branch?.usage);
      window.requestAnimationFrame(() => {
        setCenter(newNode.position.x + 160, newNode.position.y + 180, { zoom: 0.9, duration: 700 });
      });
    } catch (error) {
      const nodeUpdater = data.setGlobalNodes || setNodes;
      const edgeUpdater = data.setGlobalEdges || setEdges;
      nodeUpdater((nds) => [...nds, deletedNode]);
      edgeUpdater((eds) => [...eds, ...deletedEdges]);
      data.onGenerationError?.(error instanceof Error ? error.message : 'Rerender failed');
    } finally {
      setIsRerenderingDeleted(false);
    }
  }, [data, getNodes, setCenter, setEdges, setNodes]);

  const deleteNodeAndEdges = useCallback(({ rerender = false } = {}) => {
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

    if (rerender && deletedNode?.data?.isGenerated && deletedNode.data?.generationProvider && deletedNode.data?.generationPrompt) {
      rerenderDeletedGeneratedNode(deletedNode, deletedEdges);
    }
  }, [data, getEdges, getNode, id, rerenderDeletedGeneratedNode, setEdges, setNodes]);

  useEffect(() => {
    let timer;
    if (isDeleting && deleteCountdown > 0) {
      timer = setTimeout(() => setDeleteCountdown(c => c - 1), 1000);
    } else if (isDeleting && deleteCountdown === 0) {
      deleteNodeAndEdges({ rerender: data.isGenerated === true });
    }
    return () => clearTimeout(timer);
  }, [data.isGenerated, deleteCountdown, deleteNodeAndEdges, isDeleting]);

  const handleDeleteInitiate = (e) => {
    e.stopPropagation();
    setIsDeleting(true);
    setDeleteCountdown(3);
  };

  const handleCancelDelete = (e) => {
    e.stopPropagation();
    setIsDeleting(false);
  };

  const handleConfirmDelete = (e) => {
    e.stopPropagation();
    deleteNodeAndEdges({ rerender: data.isGenerated === true });
  };

  const handleDeleteWithoutRerender = (e) => {
    e.stopPropagation();
    deleteNodeAndEdges({ rerender: false });
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

  const openImagePreview = (event) => {
    event.stopPropagation();
    if (!data.image) return;
    setIsImagePreviewOpen(true);
  };

  useEffect(() => {
    if (!isImagePreviewOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsImagePreviewOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImagePreviewOpen]);

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

  const applyPromptStarter = (starter) => {
    setGenPrompt((current) => {
      const trimmed = current.trim();
      return trimmed ? `${trimmed}\n${starter}` : starter;
    });
    setGenError('');
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
        generationUsage: result?.usage || result?.branch?.usage || null,
        nodeGroup: `generated-${id}`,
        labelGroupId: parentNode.data?.labelGroupId || undefined,
        labelTitle: parentNode.data?.labelTitle || undefined,
        sourceFolderName: parentNode.data?.sourceFolderName || undefined,
        setGlobalNodes: data.setGlobalNodes,
        setGlobalEdges: data.setGlobalEdges
      }
    };
  };

  const handleGenerateRun = async () => {
    const providerKey = genProvider || (genPipeline === 'video' ? 'google_veo' : 'cloudflare_flux_klein');
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
      const brandGuideNodes = brandGuideNodesForAsset(parentNode, existingNodes);
      const brandGuideRefs = brandGuideNodes
        .map((node) => node.data?.image)
        .filter(Boolean);
      const mergedRefs = Array.from(new Set([...brandGuideRefs, ...genRefs]));
      const brandGuide = {
        nodes: brandGuideNodes.map(brandGuidePayloadFromNode)
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
      const labelEdge = parentNode.data?.labelGroupId ? {
        id: `label-${parentNode.data.labelGroupId}-${newNode.id}`,
        source: String(parentNode.data.labelGroupId),
        target: String(newNode.id),
        type: 'smoothstep',
        animated: true,
        data: { isLabelLink: true, labelId: parentNode.data.labelGroupId },
        style: { stroke: 'rgba(0,255,204,0.72)', strokeWidth: 3 }
      } : null;
      
      const nodeUpdater = data.setGlobalNodes || setNodes;
      const edgeUpdater = data.setGlobalEdges || setEdges;
      nodeUpdater(nds => [...nds, newNode]);
      edgeUpdater(eds => [...eds, ...[newEdge, labelEdge].filter(Boolean)]);
      
      setGenState('idle');
      setGenProvider(null);
      setGenPipeline(null);
      setGenPrompt('');
      setGenRefs([]);
      data.onGenerationUsageUpdate?.(result?.usage || result?.branch?.usage);
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
          onClick={isEditMode ? openImagePreview : undefined}
          style={{ width: '100%', height: '180px', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px', position: 'relative', cursor: isEditMode ? 'zoom-in' : 'default' }}
        >
          <img src={data.image} alt={data.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <button
            type="button"
            onClick={openImagePreview}
            title="View full image"
            aria-label="View full image"
            style={{ position: 'absolute', top: '8px', right: '48px', zIndex: 3, width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(0,0,0,0.52)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'zoom-in', opacity: isHoveringImage || data.isGenerated ? 1 : 0, transition: 'opacity 0.2s', backdropFilter: 'blur(6px)' }}
          >
            ⛶
          </button>
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
              <button type="button" onClick={openImagePreview} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(0,0,0,0.44)', color: '#fff', cursor: 'zoom-in', fontWeight: 800 }}>
                View
              </button>
            </div>
          )}
        </div>
      )}

      {isImagePreviewOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Full image preview for ${data.title || 'asset'}`}
          onClick={(event) => {
            event.stopPropagation();
            setIsImagePreviewOpen(false);
          }}
          style={{ position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(0,0,0,0.84)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px' }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{ width: 'min(96vw, 1400px)', height: 'min(88vh, 980px)', display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', color: '#fff' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.52)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Full Image</div>
                <div style={{ fontSize: '1rem', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.title || 'Canvas Asset'}</div>
              </div>
              <button type="button" onClick={() => setIsImagePreviewOpen(false)} style={{ width: '42px', height: '42px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1 }} aria-label="Close full image preview">
                ×
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0, borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(10,10,15,0.82)', display: 'grid', placeItems: 'center' }}>
              <img src={data.image} alt={data.title || 'Canvas asset'} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
          </div>
        </div>,
        document.body
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
            <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(0,255,204,0.75)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cloudworker free allocation</span>
              <select
                value={FREE_IMAGE_PROVIDER_KEYS.includes(genProvider) ? genProvider : ''}
                onChange={(e) => {
                  e.stopPropagation();
                  const providerKey = e.target.value;
                  if (!providerKey) return;
                  const provider = GENERATION_PROVIDERS[providerKey];
                  setGenProvider(providerKey);
                  setGenPipeline(provider.pipeline);
                  setGenState('prompt');
                }}
                style={{ minHeight: '36px', borderRadius: '7px', border: '1px solid rgba(0,255,204,0.34)', background: 'rgba(0,255,204,0.08)', color: '#fff', padding: '0 9px', fontSize: '12px', fontWeight: 850, outline: 'none', cursor: 'pointer' }}
                aria-label="Select Cloudworker free allocation image pipeline"
              >
                <option value="">Choose a Cloudworker renderer...</option>
                {FREE_IMAGE_PROVIDER_KEYS.map((providerKey) => (
                  <option key={providerKey} value={providerKey}>{GENERATION_PROVIDERS[providerKey].label}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,184,77,0.78)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>API-key renderers</span>
              <select
                value={API_KEY_PROVIDER_KEYS.includes(genProvider) ? genProvider : ''}
                onChange={(e) => {
                  e.stopPropagation();
                  const providerKey = e.target.value;
                  if (!providerKey) return;
                  const provider = GENERATION_PROVIDERS[providerKey];
                  setGenProvider(providerKey);
                  setGenPipeline(provider.pipeline);
                  setGenState('prompt');
                }}
                style={{ minHeight: '36px', borderRadius: '7px', border: '1px solid rgba(255,184,77,0.34)', background: 'rgba(255,184,77,0.08)', color: '#fff', padding: '0 9px', fontSize: '12px', fontWeight: 850, outline: 'none', cursor: 'pointer' }}
                aria-label="Select API key renderer"
              >
                <option value="">Choose a key-backed renderer...</option>
                {API_KEY_PROVIDER_KEYS.map((providerKey) => (
                  <option key={providerKey} value={providerKey}>{GENERATION_PROVIDERS[providerKey].label}</option>
                ))}
              </select>
            </label>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.48)', lineHeight: 1.35 }}>
              DeepSeek is used as a text/planning agent, not an image renderer. Cloudworker options render first through the Workers AI free allocation.
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setGenState('idle'); setGenProvider(null); setGenPipeline(null); setGenError(''); }}
              style={{ padding: '6px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '12px' }}
            >Cancel</button>
          </div>
        )}

        {genState === 'prompt' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>{genPipeline === 'image' ? '🖼️' : '🎥'} {GENERATION_PROVIDERS[genProvider]?.label || 'AI'} Prompt:</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsPromptHelpOpen((open) => !open); }}
                style={{ padding: '5px 8px', background: isPromptHelpOpen ? 'rgba(0,255,204,0.18)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '999px', color: '#fff', cursor: 'pointer', fontSize: '10px', fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase' }}
                title="Open prompt helper"
                aria-label="Open prompt helper"
              >
                Guide
              </button>
            </div>
            {isPromptHelpOpen && (
              <div style={{ padding: '9px', border: '1px solid rgba(0,255,204,0.22)', borderRadius: '8px', background: 'rgba(0,255,204,0.06)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.78)', lineHeight: 1.35 }}>
                  Write it like a compact creative brief: subject, composition, lighting, style, exact copy, and what must stay unchanged from references.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '5px' }}>
                  {PROMPT_HELP_SECTIONS.map((section) => (
                    <div key={section.title} style={{ display: 'grid', gridTemplateColumns: '86px 1fr', gap: '7px', fontSize: '10px', lineHeight: 1.3 }}>
                      <strong style={{ color: 'rgba(0,255,204,0.82)' }}>{section.title}</strong>
                      <span style={{ color: 'rgba(255,255,255,0.6)' }}>{section.text}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {PROMPT_STARTERS.map((starter) => (
                    <button
                      type="button"
                      key={starter}
                      onClick={(e) => { e.stopPropagation(); applyPromptStarter(starter); }}
                      style={{ padding: '5px 7px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.055)', color: 'rgba(255,255,255,0.72)', cursor: 'pointer', fontSize: '10px', textAlign: 'left' }}
                    >
                      {starter}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.48)', lineHeight: 1.35 }}>
                  Color words are brand-locked at generation time: if you write "orange", Droplet asks the provider to use the closest brand-guide color and exact hex when available.
                </div>
              </div>
            )}
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
            <span style={{ fontSize: '18px', fontWeight: 'bold', textAlign: 'center' }}>
              {isRerenderingDeleted ? 'Rerendering...' : data.isGenerated ? `Rerendering in ${deleteCountdown}...` : `Deleting in ${deleteCountdown}...`}
            </span>
            {data.isGenerated && (
              <span style={{ maxWidth: '230px', color: 'rgba(255,255,255,0.68)', fontSize: '12px', lineHeight: 1.35, textAlign: 'center' }}>
                Choose rerender to replace it with a fresh asset, or delete to remove this card from the canvas.
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button 
              onClick={handleCancelDelete}
              disabled={isRerenderingDeleted}
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
            {data.isGenerated && (
              <button
                onClick={handleDeleteWithoutRerender}
                disabled={isRerenderingDeleted}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.075)',
                  border: '1px solid rgba(255,255,255,0.24)',
                  color: 'rgba(255,255,255,0.86)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.075)'}
              >
                Delete
              </button>
            )}
            <button 
              onClick={handleConfirmDelete}
              disabled={isRerenderingDeleted}
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
              {data.isGenerated ? 'Rerender Now' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
