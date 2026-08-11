import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, KeyRound, Send, Settings, Sparkles, Trash2, X } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useCanvasAssets } from './CanvasAssetsState';
import { useSiteContent } from './SiteContentContext';
import { askConcierge, buildDropletConciergeContext } from '../services/aiService';

const PROVIDER_STORAGE_KEY = 'droplet_ai_concierge_provider_v1';
const KEYS_STORAGE_KEY = 'droplet_ai_provider_keys_v1';

const PROMPT_CHIPS = [
  'What should I generate next from this canvas?',
  'Turn the strongest nodes into a campaign direction.',
  'Find gaps in the brand system.',
  'Tighten the editable site copy.'
];

const PROVIDERS = [
  { value: 'auto', label: 'Auto' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'groq', label: 'Groq' }
];

const emptyKeys = {
  openAiKey: '',
  geminiKey: '',
  openRouterKey: '',
  groqKey: ''
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

export default function AiConciergeDrawer() {
  const { user } = useAuth();
  if (!user) return null;
  return <AiConciergeDrawerInner user={user} />;
}

function AiConciergeDrawerInner({ user }) {
  const { canvasNodes, canvasEdges, canvasName } = useCanvasAssets();
  const { content } = useSiteContent();
  const [isOpen, setIsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
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

    setHistory((items) => [
      ...items,
      {
        role: 'assistant',
        text: result.answer || 'No answer returned.',
        model: result.aiModel,
        warning: result.warning
      }
    ]);
    setLoading(false);
  }, [dropletContext, history, loading, provider, providerKeys]);

  const handleSubmit = (event) => {
    event.preventDefault();
    submitPrompt(prompt);
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
                  <span>Provider</span>
                  <select value={provider} onChange={(event) => setProvider(event.target.value)}>
                    {PROVIDERS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <div className="ai-key-grid">
                  <label>
                    <span>OpenAI key</span>
                    <input type="password" value={providerKeys.openAiKey} onChange={(event) => updateKey('openAiKey', event.target.value)} autoComplete="off" />
                  </label>
                  <label>
                    <span>Gemini key</span>
                    <input type="password" value={providerKeys.geminiKey} onChange={(event) => updateKey('geminiKey', event.target.value)} autoComplete="off" />
                  </label>
                  <label>
                    <span>OpenRouter key</span>
                    <input type="password" value={providerKeys.openRouterKey} onChange={(event) => updateKey('openRouterKey', event.target.value)} autoComplete="off" />
                  </label>
                  <label>
                    <span>Groq key</span>
                    <input type="password" value={providerKeys.groqKey} onChange={(event) => updateKey('groqKey', event.target.value)} autoComplete="off" />
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
                </div>
              )}
              {history.map((item, index) => (
                <article key={`${item.role}-${index}`} className={`ai-message ai-message-${item.role}`}>
                  <div className="ai-message-body">{item.text}</div>
                  {item.model && <div className="ai-message-model">{item.model}</div>}
                </article>
              ))}
              {loading && (
                <article className="ai-message ai-message-assistant">
                  <div className="ai-message-body">Thinking through the canvas...</div>
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
                placeholder="Ask about the current canvas..."
                disabled={loading}
                rows={3}
              />
              <button type="submit" disabled={loading || !prompt.trim()} aria-label="Send prompt" title="Send prompt">
                <Send size={18} aria-hidden="true" />
              </button>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
