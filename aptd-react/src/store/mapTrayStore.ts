import { create } from 'zustand';
import { GUIPoint } from '../AptdServerTypes';

interface MapTrayState {
  // Zoom and pan state
  zoomLevel: number;
  pan: { x: number; y: number };
  
  // Dragging state
  isDragging: boolean;
  dragStart: { x: number; y: number } | null;
  dragOffset: { x: number; y: number };
  
  // Actions
  setZoomLevel: (level: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  startDragging: (point: { x: number; y: number }) => void;
  updateDragging: (point: { x: number; y: number }) => void;
  stopDragging: () => void;
  resetView: () => void;
}

export const useMapTrayStore = create<MapTrayState>((set) => ({
  // Initial state
  zoomLevel: 1.0,
  pan: { x: 0, y: 0 },
  isDragging: false,
  dragStart: null,
  dragOffset: { x: 0, y: 0 },
  
  // Actions
  setZoomLevel: (level) => set({ zoomLevel: level }),
  
  setPan: (pan) => set({ pan }),
  
  startDragging: (point) => set({
    isDragging: true,
    dragStart: point,
    dragOffset: { x: 0, y: 0 }
  }),
  
  updateDragging: (point) => set((state) => {
    if (!state.isDragging || !state.dragStart) return state;
    
    // Calculate the new drag offset
    const dx = point.x - state.dragStart.x;
    const dy = point.y - state.dragStart.y;
    
    // Update the pan position based on the drag offset
    return {
      dragOffset: { x: dx, y: dy },
      pan: {
        x: state.pan.x + dx / state.zoomLevel,
        y: state.pan.y + dy / state.zoomLevel
      },
      dragStart: point
    };
  }),
  
  stopDragging: () => set({
    isDragging: false,
    dragStart: null,
    dragOffset: { x: 0, y: 0 }
  }),
  
  resetView: () => set({
    zoomLevel: 1.0,
    pan: { x: 0, y: 0 }
  })
}));

export default useMapTrayStore; 