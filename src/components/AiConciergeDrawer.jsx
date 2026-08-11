import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, FileText, Grid3X3, ImagePlus, KeyRound, Send, Settings, Sparkles, Trash2, WandSparkles, X } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useCanvasAssets } from './CanvasAssetsState';
import { useSiteContent } from './SiteContentContext';
import { askConcierge, buildDropletConciergeContext, buildProviderKeyHeaders } from '../services/aiService';

const PROVIDER_STORAGE_KEY = 'droplet_ai_concierge_provider_v1';
const KEYS_STORAGE_KEY = 'droplet_ai_provider_keys_v1';

const PROMPT_CHIPS = [
  'Render a campaign image from this canvas.',
  'Edit the selected asset into a premium ad variant.',
  'Turn the strongest nodes into a campaign direction.',
  'Find gaps in the brand system.',
  'Tighten the editable site copy.'
];

const PROVIDERS = [
  { value: 'auto', label: 'Auto free cycle' },
  { value: 'deepseek-free', label: 'DeepSeek R1 free' },
  { value: 'workers-ai', label: 'Workers AI Llama' },
  { value: 'openrouter-free', label: 'OpenRouter free' },
  { value: 'groq-free', label: 'Groq free' },
  { value: 'grok', label: 'Grok / xAI' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'claude', label: 'Claude' },
  { value: 'openai', label: 'OpenAI' }
];

const emptyKeys = {
  openAiKey: '',
  geminiKey: '',
  openRouterKey: '',
  groqKey: '',
  grokKey: '',
  claudeKey: ''
};

const readStoredProvider = () => {
  try {
    const stored = localStorage.getItem(PROVIDER_STORAGE_KEY);
    return PROVIDERS.some((provider) => provider.value === stored) ? stored : 'auto';
  } catch {
    return 'auto';
  }
};

const readStoredKeys = () => {
  try {
    return { ...emptyKeys, ...(JSON.parse(localStorage.getItem(KEYS_STORAGE_KEY) || '{}') || {}) };
  } catch {
    return emptyKeys;
  }
};

const assetActionPattern = /\b(render|generate|create|make|edit|remix|variant|iterate|revise|rework|asset|image|visual|poster|ad|campaign|video|shot)\b/i;

const detectAssetAction = (value, selectedCount = 0) => {
  const text = String(value || '').trim();
  if (!text || !assetActionPattern.test(text)) return null;
  const pipeline = /\b(video|motion|clip|film|reel)\b/i.test(text) ? 'video' : 'image';
  const mode = selectedCount > 0 && /\b(edit|remix|variant|iterate|revise|rework|change|selected|this)\b/i.test(text)
    ? 'edit'
    : 'render';
  return { mode, pipeline, prompt: text };
};

const canvasActionFromPlanner = (actions = [], selectedCount = 0) => {
  const action = actions.find((item) => item?.type === 'create_asset' || item?.type === 'edit_asset');
  if (!action?.prompt) return null;
  const pipeline = action.pipeline === 'video' ? 'video' : 'image';
  const mode = action.type === 'edit_asset' || selectedCount > 0 ? 'edit' : 'render';
  return { mode, pipeline, prompt: action.prompt };
};

const executablePlannerActions = (actions = []) => actions
  .filter((action) => ['create_asset', 'edit_asset', 'rewrite_copy', 'organize_canvas'].includes(action?.type))
  .slice(0, 3);

export default function AiConciergeDrawer() {
  const { user } = useAuth();
  if (!user) return null;
  return <AiConciergeDrawerInner user={user} />;
}

function AiConciergeDrawerInner({ user }) {
  const { canvasActions, canvasNodes, canvasEdges, canvasName } = useCanvasAssets();
  const { content, updateText } = useSiteContent();
  const [isOpen, setIsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [canvasActionLoading, setCanvasActionLoading] = useState(false);
  const [provider, setProvider] = useState(readStoredProvider);
  const [providerKeys, setProviderKeys] = useState(readStoredKeys);

  const dropletContext = useMemo(() => buildDropletConciergeContext({
    canvasNodes,
    canvasEdges,
    canvasName,
    siteContent: content,
    user
  }), [canvasEdges, canvasName, canvasNodes, content, user]);

  useEffect(() => {
    localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
  }, [provider]);

  useEffect(() => {
    localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(providerKeys));
  }, [providerKeys]);

  const selectedAssetCount = useMemo(() => canvasNodes.filter((node) => node?.selected === true && node?.type === 'brandCard').length, [canvasNodes]);

  const runAssetAction = useCallback(async (rawPrompt, pipeline = 'image') => {
    const actionPrompt = String(rawPrompt || '').trim();
    if (!actionPrompt || canvasActionLoading) return;

    if (!canvasActions?.createAssetBranch) {
      setHistory((items) => [
        ...items,
        {
          role: 'assistant',
          text: 'The canvas is still loading. Try again once the Fluid Node Canvas is visible.'
        }
      ]);
      return;
    }

    setHistory((items) => [
      ...items,
      { role: 'user', text: actionPrompt },
      {
        role: 'assistant',
        text: selectedAssetCount > 0
          ? `Creating an edited branch from ${selectedAssetCount} selected asset${selectedAssetCount === 1 ? '' : 's'}...`
          : 'Rendering a new asset on the current canvas...'
      }
    ]);
    setPrompt('');
    setCanvasActionLoading(true);

    try {
      const result = await canvasActions.createAssetBranch({
        prompt: actionPrompt,
        pipeline,
        providerHeaders: buildProviderKeyHeaders(providerKeys)
      });
      setHistory((items) => [
        ...items,
        {
          role: 'assistant',
          text: selectedAssetCount > 0
            ? `Done. I added "${result.title}" as an edited branch${result.parentTitle ? ` from "${result.parentTitle}"` : ''}.`
            : `Done. I rendered "${result.title}" on the canvas.`,
          model: result.model || result.provider || 'canvas-generation'
        }
      ]);
    } catch (error) {
      setHistory((items) => [
        ...items,
        {
          role: 'assistant',
          text: error instanceof Error ? error.message : 'I could not render that asset.'
        }
      ]);
    } finally {
      setCanvasActionLoading(false);
    }
  }, [canvasActionLoading, canvasActions, providerKeys, selectedAssetCount]);

  const runCopyAction = useCallback(async (action) => {
    if (!action?.contentKey || !action?.value || canvasActionLoading) return;
    setCanvasActionLoading(true);
    setHistory((items) => [
      ...items,
      { role: 'assistant', text: `Applying copy update to ${action.contentKey}...` }
    ]);
    try {
      await updateText(action.contentKey, action.value);
      setHistory((items) => [
        ...items,
        { role: 'assistant', text: `Done. Updated ${action.contentKey}.` }
      ]);
    } catch (error) {
      setHistory((items) => [
        ...items,
        { role: 'assistant', text: error instanceof Error ? error.message : 'I could not update that copy.' }
      ]);
    } finally {
      setCanvasActionLoading(false);
    }
  }, [canvasActionLoading, updateText]);

  const runOrganizeAction = useCallback(async (action) => {
    if (canvasActionLoading) return;
    if (!canvasActions?.organizeCanvas) {
      setHistory((items) => [
        ...items,
        { role: 'assistant', text: 'The canvas is still loading. Try again once the Fluid Node Canvas is visible.' }
      ]);
      return;
    }
    setCanvasActionLoading(true);
    setHistory((items) => [
      ...items,
      { role: 'assistant', text: 'Organizing the current canvas...' }
    ]);
    try {
      const result = await canvasActions.organizeCanvas(action);
      setHistory((items) => [
        ...items,
        { role: 'assistant', text: `Done. Organized ${result.count} canvas card${result.count === 1 ? '' : 's'} across ${result.groups} group${result.groups === 1 ? '' : 's'}.` }
      ]);
    } catch (error) {
      setHistory((items) => [
        ...items,
        { role: 'assistant', text: error instanceof Error ? error.message : 'I could not organize the canvas.' }
      ]);
    } finally {
      setCanvasActionLoading(false);
    }
  }, [canvasActionLoading, canvasActions]);

  const runPlannerAction = useCallback((action) => {
    if (action?.type === 'create_asset' || action?.type === 'edit_asset') {
      return runAssetAction(action.prompt, action.pipeline === 'video' ? 'video' : 'image');
    }
    if (action?.type === 'rewrite_copy') return runCopyAction(action);
    if (action?.type === 'organize_canvas') return runOrganizeAction(action);
    return undefined;
  }, [runAssetAction, runCopyAction, runOrganizeAction]);

  const submitPrompt = useCallback(async (rawPrompt) => {
    const nextPrompt = String(rawPrompt || '').trim();
    if (!nextPrompt || loading) return;

    const recentHistory = history.slice(-8);
    const userMessage = { role: 'user', text: nextPrompt };
    setHistory((items) => [...items, userMessage]);
    setPrompt('');
    setLoading(true);

    const result = await askConcierge({
      prompt: nextPrompt,
      provider,
      providerKeys,
      project: dropletContext.project,
      context: dropletContext.context,
      history: recentHistory
    });

    const plannerActions = executablePlannerActions(result.actions);
    const action = canvasActionFromPlanner(plannerActions, selectedAssetCount) || detectAssetAction(nextPrompt, selectedAssetCount);
    setHistory((items) => [
      ...items,
      {
        role: 'assistant',
        text: result.answer || 'No answer returned.',
        model: result.aiModel,
        warning: result.warning,
        action,
        plannerActions: plannerActions.filter((item) => !(item.type === 'create_asset' || item.type === 'edit_asset'))
      }
    ]);
    setLoading(false);
  }, [dropletContext, history, loading, provider, providerKeys, selectedAssetCount]);

  const handleSubmit = (event) => {
    event.preventDefault();
    submitPrompt(prompt);
  };

  const handleRenderSubmit = () => {
    const action = detectAssetAction(prompt, selectedAssetCount);
    runAssetAction(prompt, action?.pipeline || 'image');
  };

  const updateKey = (key, value) => {
    setProviderKeys((keys) => ({ ...keys, [key]: value }));
  };

  const clearKeys = () => {
    setProviderKeys(emptyKeys);
  };

  const summary = dropletContext.context.assetSummary;

  return (
    <>
      <button
        type="button"
        className="ai-concierge-launch"
        onClick={() => setIsOpen(true)}
        aria-label="Open Droplet concierge"
        title="Open Droplet concierge"
      >
        <Sparkles size={18} aria-hidden="true" />
        <span>Concierge</span>
      </button>

      {isOpen && (
        <div className="ai-concierge-shell" role="dialog" aria-modal="true" aria-label="Droplet concierge">
          <div className="ai-concierge-backdrop" onClick={() => setIsOpen(false)} />
          <aside className="ai-concierge-panel">
            <header className="ai-concierge-header">
              <div className="ai-concierge-title">
                <span className="ai-concierge-mark"><Bot size={18} aria-hidden="true" /></span>
                <div>
                  <h2>Droplet Concierge</h2>
                  <p>{summary.totalNodes} nodes / {summary.generatedCount} branches / {summary.brandGuideCount} guides</p>
                </div>
              </div>
              <div className="ai-concierge-actions">
                <button type="button" onClick={() => setSettingsOpen((open) => !open)} aria-label="AI settings" title="AI settings">
                  <Settings size={17} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => setHistory([])} aria-label="Clear chat" title="Clear chat">
                  <Trash2 size={17} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => setIsOpen(false)} aria-label="Close concierge" title="Close concierge">
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            </header>

            {settingsOpen && (
              <section className="ai-concierge-settings" aria-label="Concierge provider settings">
                <label>
                  <span>Agent</span>
                  <select value={provider} onChange={(event) => setProvider(event.target.value)}>
                    {PROVIDERS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <div className="ai-key-grid">
                  <label>
                    <span>OpenRouter key</span>
                    <input type="password" value={providerKeys.openRouterKey} onChange={(event) => updateKey('openRouterKey', event.target.value)} autoComplete="off" />
                  </label>
                  <label>
                    <span>Groq key</span>
                    <input type="password" value={providerKeys.groqKey} onChange={(event) => updateKey('groqKey', event.target.value)} autoComplete="off" />
                  </label>
                  <label>
                    <span>Grok / xAI key</span>
                    <input type="password" value={providerKeys.grokKey} onChange={(event) => updateKey('grokKey', event.target.value)} autoComplete="off" />
                  </label>
                  <label>
                    <span>Gemini key</span>
                    <input type="password" value={providerKeys.geminiKey} onChange={(event) => updateKey('geminiKey', event.target.value)} autoComplete="off" />
                  </label>
                  <label>
                    <span>OpenAI key</span>
                    <input type="password" value={providerKeys.openAiKey} onChange={(event) => updateKey('openAiKey', event.target.value)} autoComplete="off" />
                  </label>
                  <label>
                    <span>Claude key</span>
                    <input type="password" value={providerKeys.claudeKey} onChange={(event) => updateKey('claudeKey', event.target.value)} autoComplete="off" />
                  </label>
                </div>
                <button type="button" className="ai-key-clear" onClick={clearKeys}>
                  <KeyRound size={15} aria-hidden="true" />
                  <span>Clear Keys</span>
                </button>
              </section>
            )}

            <div className="ai-concierge-messages" aria-live="polite">
              {history.length === 0 && (
                <div className="ai-concierge-empty">
                  <strong>{dropletContext.context.canvasName}</strong>
                  <span>{summary.imageCount + summary.videoCount} media assets available</span>
                  {selectedAssetCount > 0 && <span>{selectedAssetCount} selected for edits</span>}
                </div>
              )}
              {history.map((item, index) => (
                <article key={`${item.role}-${index}`} className={`ai-message ai-message-${item.role}`}>
                  <div className="ai-message-body">{item.text}</div>
                  {item.model && <div className="ai-message-model">{item.model}</div>}
                  {item.action && (
                    <button
                      type="button"
                      className="ai-message-action"
                      onClick={() => runAssetAction(item.action.prompt, item.action.pipeline)}
                      disabled={canvasActionLoading}
                    >
                      <WandSparkles size={15} aria-hidden="true" />
                      <span>{item.action.mode === 'edit' ? 'Edit Selected' : 'Render On Canvas'}</span>
                    </button>
                  )}
                  {Array.isArray(item.plannerActions) && item.plannerActions.map((plannedAction, actionIndex) => (
                    <button
                      key={`${plannedAction.type}-${actionIndex}`}
                      type="button"
                      className="ai-message-action"
                      onClick={() => runPlannerAction(plannedAction)}
                      disabled={canvasActionLoading}
                    >
                      {plannedAction.type === 'rewrite_copy'
                        ? <FileText size={15} aria-hidden="true" />
                        : <Grid3X3 size={15} aria-hidden="true" />}
                      <span>{plannedAction.label || (plannedAction.type === 'rewrite_copy' ? 'Apply Copy' : 'Organize Canvas')}</span>
                    </button>
                  ))}
                </article>
              ))}
              {(loading || canvasActionLoading) && (
                <article className="ai-message ai-message-assistant">
                  <div className="ai-message-body">{canvasActionLoading ? 'Working on the canvas...' : 'Thinking through the canvas...'}</div>
                </article>
              )}
            </div>

            <div className="ai-chip-row">
              {PROMPT_CHIPS.map((chip) => (
                <button key={chip} type="button" onClick={() => submitPrompt(chip)} disabled={loading}>
                  {chip}
                </button>
              ))}
            </div>

            <form className="ai-concierge-form" onSubmit={handleSubmit}>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={selectedAssetCount > 0 ? 'Ask, or render an edited branch from the selected asset...' : 'Ask, or render a new asset on the current canvas...'}
                disabled={loading || canvasActionLoading}
                rows={3}
              />
              <button type="submit" disabled={loading || canvasActionLoading || !prompt.trim()} aria-label="Send prompt" title="Send prompt">
                <Send size={18} aria-hidden="true" />
              </button>
              <button type="button" onClick={handleRenderSubmit} disabled={loading || canvasActionLoading || !prompt.trim()} aria-label={selectedAssetCount > 0 ? 'Edit selected asset' : 'Render asset'} title={selectedAssetCount > 0 ? 'Edit selected asset' : 'Render asset'}>
                <ImagePlus size={18} aria-hidden="true" />
              </button>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
