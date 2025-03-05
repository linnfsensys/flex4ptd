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
  // get the current state of the TopStore
  const topState = topStore.getTopState();
  const selected = topState.selected;
  
  // create the local helpEngine state
  const [helpEngine] = useState(() => new HelpEngine(undoManager, topStore));
  
  // handle the help guide click
  const onHelpGuideClicked = useCallback(() => {
    const isCurrentlyEnabled = helpEngine.isHelpEnabled();
    helpEngine.setHelpEnabled(!isCurrentlyEnabled);
  }, [helpEngine]);
  
  // get the save button color
  const getSaveColor = useCallback((): SaveColor => {
    // check if there are validation errors
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
  
  // check if the save is enabled
  const isSaveEnabled = useCallback((topStore: TopStore, undoManager: UndoManager): boolean => {
    // check if there are validation errors
    const hasValidationErrors = Object.keys(topState.validationErrors || {}).length > 0 ||
                               Object.keys(topState.validationGlobalErrors || {}).length > 0;
    
    if(topState.pingScanStatus !== null && topState.pingScanStatus < 100) {
      // scanning, disable the save
      return false;
    }
    if(hasValidationErrors) {
      // there are validation errors, disable the save
      return false;
    }
    if(!undoManager.hasUndoableXacts()) {
      // no undoable actions, disable the save
      return false;
    }
    // default enable the save
    return true;
  }, [topState.pingScanStatus, topState.validationErrors, topState.validationGlobalErrors]);
  
  // show the modal dialog
  const showModal = (modalType: ModalType, description: string, buttonLabels?: string[], buttonOnClicks?: Array<() => void>) => {
    topStore.showModal(modalType, description, buttonLabels, buttonOnClicks);
  };
  
  // Calculate dimensions based on window size
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight - 50 // Subtract toolbar height
  });

  // use the golden ratio to calculate the layout
  // golden ratio is 1.618
  const GOLDEN_RATIO = 1.618;
  const INFO_PANEL_WIDTH = 400; // fixed width, in pixels
  const mapCabinetTrayWidth = dimensions.width - INFO_PANEL_WIDTH; // the remaining width for the map panel
  const mapCabinetTrayHeight = dimensions.height - 40; // subtract the top bar height
  const trayHeight = 60; // use a fixed value of 60, consistent with the original version
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