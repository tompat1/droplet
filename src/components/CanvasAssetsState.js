import { createContext, useContext } from 'react';

export const CanvasAssetsContext = createContext({
  canvasNodes: [],
  canvasEdges: [],
  canvasName: '',
  canvasActions: {},
  setCanvasSnapshot: () => {},
  setCanvasActions: () => {}
});

export function useCanvasAssets() {
  return useContext(CanvasAssetsContext);
}
