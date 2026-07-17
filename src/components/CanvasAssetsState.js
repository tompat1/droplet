import { createContext, useContext } from 'react';

export const CanvasAssetsContext = createContext({
  canvasNodes: [],
  canvasEdges: [],
  canvasName: '',
  setCanvasSnapshot: () => {}
});

export function useCanvasAssets() {
  return useContext(CanvasAssetsContext);
}
