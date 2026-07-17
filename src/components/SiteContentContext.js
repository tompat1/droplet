import { createContext, useContext } from 'react';

export const SiteContentContext = createContext(null);

export function useSiteContent() {
  const value = useContext(SiteContentContext);
  if (!value) throw new Error('useSiteContent must be used within SiteContentProvider');
  return value;
}
