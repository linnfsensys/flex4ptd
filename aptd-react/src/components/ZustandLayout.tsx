import React, { useCallback, useEffect, useState } from 'react';
import MapAndTrayPanel from './MapAndTrayPanel';
import ZustandInfoPanel from './ZustandInfoPanel';
import TopBarZustand from './TopBarZustand';
import TopStore from '../TopStore';
import UndoManager from '../UndoManager';
import WebSocketManager from '../WebSocketManager';
import HttpManager from '../HttpManager';
import MapImagesManager from '../MapImagesManager';
import AptdApp from '../AptdApp';
import { SaveColor } from '../constants/SaveColorEnum';
import HelpEngine from '../help/HelpEngine';
import { ModalType } from '../AptdClientTypes';
import './ZustandLayout.css';

interface ZustandLayoutProps {
  topStore: TopStore;
  undoManager: UndoManager;
  webSocketManager: WebSocketManager | null;
  httpManager: HttpManager;
  onRequireLoginChanged: () => void;
  mapImagesManager: MapImagesManager;
  onSwitchToOriginal: () => void;
}

/**
 * ZustandLayout - Main layout component for the Zustand version of the application
 * Contains TopBarZustand at the top, MapAndTrayPanel on the left and ZustandInfoPanel on the right
 */
const ZustandLayout: React.FC<ZustandLayoutProps> = ({
  topStore,
  undoManager,
  webSocketManager,
  httpManager,
  onRequireLoginChanged,
  mapImagesManager,
  onSwitchToOriginal
}) => {
  // 获取TopStore的当前状态
  const topState = topStore.getTopState();
  const selected = topState.selected;
  
  // 创建本地的helpEngine状态
  const [helpEngine] = useState(() => new HelpEngine(undoManager, topStore));
  
  // 处理帮助指南点击
  const onHelpGuideClicked = useCallback(() => {
    const isCurrentlyEnabled = helpEngine.isHelpEnabled();
    helpEngine.setHelpEnabled(!isCurrentlyEnabled);
  }, [helpEngine]);
  
  // 获取保存按钮颜色
  const getSaveColor = useCallback((): SaveColor => {
    // 检查是否有验证错误 
    const hasValidationErrors = Object.keys(topState.validationErrors || {}).length > 0 ||
                               Object.keys(topState.validationGlobalErrors || {}).length > 0;
    
    if(hasValidationErrors) {
      return SaveColor.PINK;
    } else if(topState.pingScanStatus !== null && topState.pingScanStatus < 100) {
      return SaveColor.YELLOW;
    } else {
      return SaveColor.GRAY;
    }
  }, [topState.validationErrors, topState.validationGlobalErrors, topState.pingScanStatus]);
  
  // 检查是否可以保存
  const isSaveEnabled = useCallback((topStore: TopStore, undoManager: UndoManager): boolean => {
    // 检查是否有验证错误
    const hasValidationErrors = Object.keys(topState.validationErrors || {}).length > 0 ||
                               Object.keys(topState.validationGlobalErrors || {}).length > 0;
    
    if(topState.pingScanStatus !== null && topState.pingScanStatus < 100) {
      // 正在扫描，禁用保存
      return false;
    }
    if(hasValidationErrors) {
      // 有验证错误，禁用保存
      return false;
    }
    if(!undoManager.hasUndoableXacts()) {
      // 没有可撤销的操作，禁用保存
      return false;
    }
    // 默认启用保存
    return true;
  }, [topState.pingScanStatus, topState.validationErrors, topState.validationGlobalErrors]);
  
  // 显示模态对话框
  const showModal = (modalType: ModalType, description: string, buttonLabels?: string[], buttonOnClicks?: Array<() => void>) => {
    topStore.showModal(modalType, description, buttonLabels, buttonOnClicks);
  };
  
  // Calculate dimensions based on window size
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight - 50 // Subtract toolbar height
  });

  // 使用黄金比例计算布局
  // 黄金比例约为1.618:1
  const GOLDEN_RATIO = 1.618;
  const INFO_PANEL_WIDTH = 400; // 固定宽度，单位像素
  const mapCabinetTrayWidth = dimensions.width - INFO_PANEL_WIDTH; // 剩余宽度给地图面板
  const mapCabinetTrayHeight = dimensions.height - 40; // 减去TopBar高度
  const trayHeight = 60; // 使用固定值 60，与原始版本一致
  const mapHeight = mapCabinetTrayHeight - trayHeight;

  // Update dimensions on window resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight - 50 // Subtract toolbar height
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="zustand-layout">
      <div className="top-bar-container">
        <TopBarZustand
          undoEnabled={
            undoManager.hasUndoableXacts() &&
            !undoManager.isBelowSaveLevel()
          }
          redoEnabled={undoManager.hasRedoableXacts()}
          saveEnabled={isSaveEnabled(topStore, undoManager)}
          doUndo={undoManager.onUndoClicked}
          doRedo={undoManager.onRedoClicked}
          undoLabel={undoManager.getUndoLabel()}
          redoLabel={undoManager.getRedoLabel()}
          saveColor={getSaveColor()}
          pingScanStatus={topState.pingScanStatus}
          pingScanSecsLeft={topState.pingScanSecsLeft}
          savePctComplete={topState.savePctComplete}
          showModal={showModal}
          websocketManager={webSocketManager}
          topStore={topStore}
          undoManager={undoManager}
          helpEngine={helpEngine}
          onHelpGuideClicked={onHelpGuideClicked}
          onSwitchToOriginal={onSwitchToOriginal}
        />
      </div>
      
      <div className="zustand-main-content">
        <div className="map-tray-container" style={{ width: `${mapCabinetTrayWidth}px` }}>
          <MapAndTrayPanel
            topStore={topStore}
            undoManager={undoManager}
            mapImagesManager={mapImagesManager}
            mapCabinetTrayWidth={mapCabinetTrayWidth}
            mapCabinetTrayHeight={mapCabinetTrayHeight}
            trayHeight={trayHeight}
            mapHeight={mapHeight}
          />
        </div>
        <div className="info-panel-container" style={{ width: `${INFO_PANEL_WIDTH}px` }}>
          <ZustandInfoPanel
            mapCabinetTrayHeight={mapCabinetTrayHeight}
            topStore={topStore}
            undoManager={undoManager}
            webSocketManager={webSocketManager}
            httpManager={httpManager}
            onRequireLoginChanged={onRequireLoginChanged}
            mapImagesManager={mapImagesManager}
          />
        </div>
      </div>
    </div>
  );
};

export default ZustandLayout; 