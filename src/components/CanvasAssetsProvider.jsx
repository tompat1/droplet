import { useCallback, useMemo, useState } from 'react';
import { CanvasAssetsContext } from './CanvasAssetsState';

export function CanvasAssetsProvider({ children }) {
  const [snapshot, setSnapshot] = useState({
    canvasNodes: [],
    canvasEdges: [],
    canvasName: ''
  });

  const setCanvasSnapshot = useCallback(({ nodes = [], edges = [], canvasName = '' }) => {
    setSnapshot({
      canvasNodes: nodes,
      canvasEdges: edges,
      canvasName
    });
  }, []);

  const value = useMemo(() => ({
    ...snapshot,
    setCanvasSnapshot
  }), [setCanvasSnapshot, snapshot]);

  return (
    <CanvasAssetsContext.Provider value={value}>
      {children}
    </CanvasAssetsContext.Provider>
  );
}
