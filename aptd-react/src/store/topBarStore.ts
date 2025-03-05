import { create } from 'zustand';
import { SaveColor } from '../constants/SaveColorEnum';
import TopStore from '../TopStore';
import { UpdateType, ObjectType } from '../AptdClientTypes';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { useCallback } from 'react';

/**
 * Define TopBar state interface
 */
interface TopBarState {
  // Undo and redo state
  undoEnabled: boolean;
  redoEnabled: boolean;
  undoLabel: string;
  redoLabel: string;
  
  // Save state
  saveEnabled: boolean;
  saveColor: SaveColor;
  savePctComplete: number | null;
  
  // Scan status
  pingScanStatus: number | null;
  pingScanSecsLeft: number | null;
  pingScanNoCancel: boolean;
  
  // Other states
  configuredDevicesResolved: boolean;
  awaitingSaveResult: boolean;
  thisUserInitiatedSave: boolean;
  helpEnabled: boolean;
  
  // Actions
  setUndoState: (undoEnabled: boolean, redoEnabled: boolean, undoLabel: string, redoLabel: string) => void;
  setSaveState: (saveEnabled: boolean, saveColor: SaveColor) => void;
  setSavePctComplete: (savePctComplete: number | null) => void;
  setPingScanStatus: (status: number | null, secsLeft: number | null) => void;
  setPingScanNoCancel: (noCancel: boolean) => void;
  setConfiguredDevicesResolved: (resolved: boolean) => void;
  setAwaitingSaveResult: (awaiting: boolean) => void;
  setThisUserInitiatedSave: (initiated: boolean) => void;
  setHelpEnabled: (enabled: boolean) => void;
}

/**
 * Create TopBar state store
 */
export const useTopBarStore = create<TopBarState>((set) => ({
  // Initial state
  undoEnabled: false,
  redoEnabled: false,
  undoLabel: '',
  redoLabel: '',
  saveEnabled: false,
  saveColor: SaveColor.GRAY,
  savePctComplete: null,
  pingScanStatus: null,
  pingScanSecsLeft: null,
  pingScanNoCancel: false,
  configuredDevicesResolved: false,
  awaitingSaveResult: false,
  thisUserInitiatedSave: false,
  helpEnabled: false,
  
  // Action functions
  setUndoState: (undoEnabled, redoEnabled, undoLabel, redoLabel) => 
    set({ undoEnabled, redoEnabled, undoLabel, redoLabel }),
  
  setSaveState: (saveEnabled, saveColor) => 
    set({ saveEnabled, saveColor }),
  
  setSavePctComplete: (savePctComplete) => 
    set({ savePctComplete }),
  
  setPingScanStatus: (pingScanStatus, pingScanSecsLeft) => 
    set({ pingScanStatus, pingScanSecsLeft }),
  
  setPingScanNoCancel: (pingScanNoCancel) => 
    set({ pingScanNoCancel }),
  
  setConfiguredDevicesResolved: (configuredDevicesResolved) => 
    set({ configuredDevicesResolved }),
  
  setAwaitingSaveResult: (awaitingSaveResult) => 
    set({ awaitingSaveResult }),
  
  setThisUserInitiatedSave: (thisUserInitiatedSave) => 
    set({ thisUserInitiatedSave }),
  
  setHelpEnabled: (helpEnabled) => 
    set({ helpEnabled }),
}));

/**
 * Add a hooks wrapper for easier use
 */
export const useTopBar = () => {
  const store = useTopBarStore();
  return {
    // State
    undoEnabled: store.undoEnabled,
    redoEnabled: store.redoEnabled,
    undoLabel: store.undoLabel,
    redoLabel: store.redoLabel,
    saveEnabled: store.saveEnabled,
    saveColor: store.saveColor,
    savePctComplete: store.savePctComplete,
    pingScanStatus: store.pingScanStatus,
    pingScanSecsLeft: store.pingScanSecsLeft,
    pingScanNoCancel: store.pingScanNoCancel,
    configuredDevicesResolved: store.configuredDevicesResolved,
    awaitingSaveResult: store.awaitingSaveResult,
    thisUserInitiatedSave: store.thisUserInitiatedSave,
    helpEnabled: store.helpEnabled,
    
    // Actions
    setUndoState: store.setUndoState,
    setSaveState: store.setSaveState,
    setSavePctComplete: store.setSavePctComplete,
    setPingScanStatus: store.setPingScanStatus,
    setPingScanNoCancel: store.setPingScanNoCancel,
    setConfiguredDevicesResolved: store.setConfiguredDevicesResolved,
    setAwaitingSaveResult: store.setAwaitingSaveResult,
    setThisUserInitiatedSave: store.setThisUserInitiatedSave,
    setHelpEnabled: store.setHelpEnabled,
  };
};

export default useTopBarStore; 