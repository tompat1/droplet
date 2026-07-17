import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useSiteContent } from './SiteContentContext';

export default function EditableText({ contentKey, fallback, as: Component = 'span', multiline = false, className = '', style, children }) {
  const { isAdmin } = useAuth();
  const { getText, updateText } = useSiteContent();
  const text = getText(contentKey, fallback ?? children ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [status, setStatus] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setDraft(text);
  }, [text]);

  useEffect(() => {
    if (!isEditing) return;
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [isEditing]);

  const save = async () => {
    try {
      await updateText(contentKey, draft);
      setStatus('Saved');
      setIsEditing(false);
    } catch (error) {
      setStatus(error.message);
    }
  };

  const renderedText = multiline
    ? String(text).split('\n').map((line, index, lines) => (
      <React.Fragment key={`${contentKey}-${index}`}>
        {line}
        {index < lines.length - 1 && <br />}
      </React.Fragment>
    ))
    : text;

  return (
    <span className={`editable-text-wrap ${isAdmin ? 'admin-editable' : ''} ${className}`} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.28em', position: 'relative', maxWidth: '100%' }}>
      <Component style={style}>{renderedText}</Component>
      {isAdmin && (
        <>
          <button
            type="button"
            className="content-edit-button"
            onClick={() => {
              setDraft(text);
              setStatus('');
              setIsEditing(true);
            }}
            title="Edit text"
            aria-label="Edit text"
          >
            ✎
          </button>
          {isEditing && (
            <div className="content-edit-popover" onClick={(event) => event.stopPropagation()}>
              <label>
                <span>Edit text</span>
                {multiline ? (
                  <textarea
                    ref={inputRef}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={5}
                  />
                ) : (
                  <input
                    ref={inputRef}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') save();
                      if (event.key === 'Escape') setIsEditing(false);
                    }}
                  />
                )}
              </label>
              {status && <div className="content-edit-status">{status}</div>}
              <div className="content-edit-actions">
                <button type="button" onClick={() => setIsEditing(false)}>Cancel</button>
                <button type="button" onClick={save}>Save</button>
              </div>
            </div>
          )}
        </>
      )}
    </span>
  );
}
