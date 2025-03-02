import { create } from 'zustand';
import { SaveColor } from '../constants/SaveColorEnum';
import TopStore from '../TopStore';
import { UpdateType, ObjectType } from '../AptdClientTypes';

// 定义TopBar状态接口
interface TopBarState {
  // 撤销和重做状态
  undoEnabled: boolean;
  redoEnabled: boolean;
  undoLabel: string;
  redoLabel: string;
  
  // 保存状态
  saveEnabled: boolean;
  saveColor: SaveColor;
  savePctComplete: number | null;
  
  // 扫描状态
  pingScanStatus: number | null;
  pingScanSecsLeft: number | null;
  pingScanNoCancel: boolean;
  
  // 其他状态
  configuredDevicesResolved: boolean;
  awaitingSaveResult: boolean;
  thisUserInitiatedSave: boolean;
  helpEnabled: boolean;
  
  // 动作
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

// 创建TopBar状态存储
export const useTopBarStore = create<TopBarState>((set) => ({
  // 初始状态
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
  
  // 动作函数
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

// 添加一个hooks封装，使得更方便使用
export const useTopBar = () => {
  const store = useTopBarStore();
  return {
    // 状态
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
    
    // 动作
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