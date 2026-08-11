import { useCallback, useMemo, useState } from 'react';
import { CanvasAssetsContext } from './CanvasAssetsState';

export function CanvasAssetsProvider({ children }) {
  const [snapshot, setSnapshot] = useState({
    canvasNodes: [],
    canvasEdges: [],
    canvasName: ''
  });
  const [canvasActions, setCanvasActionsState] = useState({});

  const setCanvasSnapshot = useCallback(({ nodes = [], edges = [], canvasName = '' }) => {
    setSnapshot({
      canvasNodes: nodes,
      canvasEdges: edges,
      canvasName
    });
  }, []);

  const setCanvasActions = useCallback((actions = {}) => {
    setCanvasActionsState(actions);
  }, []);

  const value = useMemo(() => ({
    ...snapshot,
    canvasActions,
    setCanvasSnapshot,
    setCanvasActions
  }), [canvasActions, setCanvasActions, setCanvasSnapshot, snapshot]);

  return (
    <CanvasAssetsContext.Provider value={value}>
      {children}
    </CanvasAssetsContext.Provider>
  );
}
