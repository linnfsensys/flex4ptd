import React, { useState } from 'react';
import ZustandLayout from './ZustandLayout';
import TopStore from '../TopStore';
import UndoManager from '../UndoManager';
import WebSocketManager from '../WebSocketManager';
import HttpManager from '../HttpManager';
import MapImagesManager from '../MapImagesManager';
import './ZustandApp.css';

interface ZustandAppProps {
  topStore: TopStore;
  undoManager: UndoManager;
  webSocketManager: WebSocketManager | null;
  httpManager: HttpManager;
  onRequireLoginChanged: () => void;
  mapImagesManager: MapImagesManager;
  onSwitchToOriginal: () => void;
}

/**
 * ZustandApp - Main component for the Zustand version of the application
 * Includes a toggle button to switch back to the original version
 */
const ZustandApp: React.FC<ZustandAppProps> = ({
  topStore,
  undoManager,
  webSocketManager,
  httpManager,
  onRequireLoginChanged,
  mapImagesManager,
  onSwitchToOriginal
}) => {
  return (
    <div className="zustand-app">
      <ZustandLayout
        topStore={topStore}
        undoManager={undoManager}
        webSocketManager={webSocketManager}
        httpManager={httpManager}
        onRequireLoginChanged={onRequireLoginChanged}
        mapImagesManager={mapImagesManager}
        onSwitchToOriginal={onSwitchToOriginal}
      />
    </div>
  );
};

export default ZustandApp; 