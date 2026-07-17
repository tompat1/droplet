import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi, siteContentApi } from '../lib/apiClient';
import { SiteContentContext } from './SiteContentContext';

export function SiteContentProvider({ children }) {
  const [content, setContent] = useState({});
  const [status, setStatus] = useState('');

  useEffect(() => {
    siteContentApi.list()
      .then((payload) => setContent(payload.content || {}))
      .catch((error) => {
        console.warn('Site content load failed:', error);
      });
  }, []);

  const getText = useCallback((key, fallback = '') => {
    const item = content[key];
    return typeof item?.value === 'string' ? item.value : fallback;
  }, [content]);

  const updateText = useCallback(async (key, value) => {
    setStatus('Saving text...');
    setContent((current) => ({
      ...current,
      [key]: {
        ...(current[key] || {}),
        value
      }
    }));

    try {
      await adminApi.updateSiteContent(key, { value });
      setStatus('Text saved.');
    } catch (error) {
      setStatus(error.message);
      throw error;
    }
  }, []);

  const value = useMemo(() => ({
    content,
    getText,
    updateText,
    status
  }), [content, getText, status, updateText]);

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}
