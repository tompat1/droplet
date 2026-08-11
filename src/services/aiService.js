const PROVIDER_KEY_HEADERS = {
  openAiKey: 'X-OpenAI-Key',
  geminiKey: 'X-Gemini-Key',
  openRouterKey: 'X-OpenRouter-Key',
  groqKey: 'X-Groq-Key',
  grokKey: 'X-Grok-Key',
  claudeKey: 'X-Anthropic-Key'
};

const textValue = (value, maxLength = 500) => String(value || '').trim().slice(0, maxLength);

const stripDataUrl = (value) => {
  if (typeof value !== 'string') return '';
  if (value.startsWith('data:')) return '[inline-media]';
  return value.slice(0, 500);
};

const compactNode = (node) => {
  const data = node?.data || {};
  return {
    id: textValue(node?.id, 120),
    type: textValue(node?.type || 'node', 80),
    title: textValue(data.title, 160),
    subtitle: textValue(data.subtitle, 160),
    description: textValue(data.description, 700),
    nodeGroup: textValue(data.nodeGroup || data.referenceRole, 120),
    brandName: textValue(data.brandName, 120),
    isBrandGuide: data.isBrandGuideSource === true || data.sourceOfTruth === true || data.referenceRole === 'brand-guide',
    isGenerated: data.isGenerated === true,
    generationProvider: textValue(data.generationProviderLabel || data.generationProvider, 120),
    generationPrompt: textValue(data.generationPrompt, 500),
    generationStatus: textValue(data.generationStatus, 80),
    image: data.image ? stripDataUrl(data.image) : '',
    video: data.video ? stripDataUrl(data.video) : '',
    colors: Array.isArray(data.colors)
      ? data.colors.slice(0, 12).map((color) => ({
        name: textValue(color?.name, 80),
        hex: textValue(color?.hex, 24)
      }))
      : []
  };
};

const summarizeAssets = (nodes = [], edges = []) => {
  const visibleNodes = nodes.filter((node) => node?.id !== 'padding-node' && node?.hidden !== true);
  return {
    totalNodes: visibleNodes.length,
    totalEdges: Array.isArray(edges) ? edges.length : 0,
    imageCount: visibleNodes.filter((node) => node?.data?.image).length,
    videoCount: visibleNodes.filter((node) => node?.data?.video).length,
    generatedCount: visibleNodes.filter((node) => node?.data?.isGenerated === true).length,
    brandGuideCount: visibleNodes.filter((node) => {
      const data = node?.data || {};
      return data.isBrandGuideSource === true || data.sourceOfTruth === true || data.referenceRole === 'brand-guide';
    }).length
  };
};

const groupCounts = (nodes = []) => nodes.reduce((counts, node) => {
  if (node?.id === 'padding-node' || node?.hidden === true) return counts;
  const group = textValue(node?.data?.nodeGroup || node?.type || 'canvas', 80) || 'canvas';
  counts[group] = (counts[group] || 0) + 1;
  return counts;
}, {});

const buildSiteContent = (content = {}) => Object.entries(content)
  .map(([key, item]) => ({
    key: textValue(key, 120),
    value: textValue(item?.value, 900),
    updatedAt: textValue(item?.updatedAt, 80)
  }))
  .filter((item) => item.key && item.value)
  .slice(0, 24);

export function buildDropletConciergeContext({
  canvasNodes = [],
  canvasEdges = [],
  canvasName = 'Fluid Node Canvas',
  siteContent = {},
  user = null
} = {}) {
  const compactAssets = canvasNodes
    .filter((node) => node?.id !== 'padding-node' && node?.hidden !== true)
    .map(compactNode);

  return {
    project: {
      id: 'droplet',
      name: 'Droplet',
      canvasName: textValue(canvasName, 160) || 'Fluid Node Canvas',
      userRole: textValue(user?.role || 'guest', 80),
      userEmail: textValue(user?.email, 160)
    },
    context: {
      canvasName: textValue(canvasName, 160) || 'Fluid Node Canvas',
      assetSummary: summarizeAssets(canvasNodes, canvasEdges),
      groups: groupCounts(canvasNodes),
      assets: compactAssets.slice(0, 36),
      brandGuides: compactAssets.filter((node) => node.isBrandGuide).slice(0, 8),
      generatedMedia: compactAssets.filter((node) => node.isGenerated).slice(0, 12),
      siteContent: buildSiteContent(siteContent),
      pipelines: [
        'ChatGPT Images',
        'Gemini Banana Pro',
        'Google Veo',
        'Canvas import',
        'Editable site copy'
      ]
    }
  };
}

export function sanitizeAssistantText(value) {
  return textValue(value, 8000)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\n{4,}/g, '\n\n\n');
}

export function buildProviderKeyHeaders(providerKeys = {}) {
  const headers = {};
  Object.entries(PROVIDER_KEY_HEADERS).forEach(([key, header]) => {
    const value = textValue(providerKeys[key], 4000);
    if (value) headers[header] = value;
  });
  return headers;
}

function localConciergeFallback(prompt, context = {}) {
  const summary = context.assetSummary || {};
  const brandGuide = Array.isArray(context.brandGuides) && context.brandGuides[0];
  const generatedCount = Number(summary.generatedCount || 0);
  const mediaCount = Number(summary.imageCount || 0) + Number(summary.videoCount || 0);
  const promptText = textValue(prompt, 600);

  return [
    `I can work from the current "${context.canvasName || 'Fluid Node Canvas'}" canvas.`,
    '',
    `Context I see: ${summary.totalNodes || 0} canvas items, ${mediaCount} media assets, ${generatedCount} generated branches, and ${summary.brandGuideCount || 0} brand guide node${summary.brandGuideCount === 1 ? '' : 's'}.`,
    brandGuide ? `Use "${brandGuide.title || brandGuide.brandName}" as the style source of truth.` : 'Add or mark a brand guide/source-of-truth node if you want stricter creative direction.',
    '',
    `For "${promptText}", I would start by identifying the strongest source asset, writing a tighter generation prompt, then creating one image branch and one copy variation so you can compare direction quickly.`
  ].join('\n');
}

export async function askConcierge({
  prompt,
  provider = 'auto',
  project = {},
  context = {},
  history = [],
  providerKeys = {}
}) {
  const headers = buildProviderKeyHeaders(providerKeys);

  try {
    const response = await fetch('/api/ai/concierge', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({
        prompt,
        provider,
        project,
        context: {
          ...context,
          history: history.slice(-8).map((item) => ({
            role: item.role === 'assistant' ? 'assistant' : 'user',
            text: textValue(item.text, 1200)
          }))
        }
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `AI request failed with ${response.status}`);
    if (!payload.answer) throw new Error(payload.error || 'AI endpoint did not return an answer');
    return {
      success: payload.success !== false,
      answer: sanitizeAssistantText(payload.answer || ''),
      aiModel: payload.aiModel || 'droplet-concierge',
      actions: Array.isArray(payload.actions) ? payload.actions : [],
      recommendations: Array.isArray(payload.recommendations) ? payload.recommendations : []
    };
  } catch (error) {
    return {
      success: true,
      answer: sanitizeAssistantText(localConciergeFallback(prompt, context)),
      aiModel: 'droplet-client-fallback',
      actions: [],
      recommendations: [],
      warning: error instanceof Error ? error.message : String(error)
    };
  }
}
