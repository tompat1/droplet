import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi, siteContentApi } from '../lib/apiClient';
import { SiteContentContext } from './SiteContentContext';

export function SiteContentProvider({ children }) {
  const [content, setContent] = useState({});
  const [status, setStatus] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    siteContentApi.list()
      .then((payload) => setContent(payload.content || {}))
      .catch((error) => {
        console.warn('Site content load failed:', error);
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const getText = useCallback((key, fallback = '') => {
    const item = content[key];
    return typeof item?.value === 'string' ? item.value : fallback;
  }, [content]);

  const updateText = useCallback(async (key, value) => {
    setStatus('Saving text...');
    let previousItem;
    let hadPrevious = false;
    setContent((current) => {
      hadPrevious = Object.prototype.hasOwnProperty.call(current, key);
      previousItem = current[key];
      return {
        ...current,
        [key]: {
          ...(current[key] || {}),
          value
        }
      };
    });

    try {
      const result = await adminApi.updateSiteContent(key, { value });
      const savedValue = typeof result?.item?.value === 'string' ? result.item.value : value;
      setContent((current) => ({
        ...current,
        [key]: {
          ...(current[key] || {}),
          value: savedValue,
          updatedAt: new Date().toISOString()
        }
      }));
      setStatus('Text saved.');
    } catch (error) {
      setContent((current) => {
        const next = { ...current };
        if (hadPrevious) {
          next[key] = previousItem;
        } else {
          delete next[key];
        }
        return next;
      });
      setStatus(error.message);
      throw error;
    }
  }, []);

  const value = useMemo(() => ({
    content,
    getText,
    updateText,
    status,
    isLoaded
  }), [content, getText, isLoaded, status, updateText]);

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}
