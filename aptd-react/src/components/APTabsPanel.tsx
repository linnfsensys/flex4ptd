import React, { useState } from 'react';
import TopStore from '../TopStore';
import UndoManager from '../UndoManager';
import WebSocketManager from '../WebSocketManager';
import HttpManager from '../HttpManager';
import APNetworkPanel from './APNetworkPanel';
import APInfoPanel from './APInfoPanel';
import APVCCPanel from './APVCCPanel';
import APPropertiesPanel from './APPropertiesPanel';
import '../infoPanels/InfoPanel.css';
import '../infoPanels/InfoPanelAPInfo.css';
import './APTabsPanel.css';

interface APTabsPanelProps {
  webSocketManager: WebSocketManager | null;
  httpManager: HttpManager | null;
  topStore: TopStore;
  undoManager?: UndoManager;
}

/**
 * AP tabs panel component - Zustand version
 * integrates all AP-related panels, including network, utilities, virtual CC, and properties tabs
 */
const APTabsPanel: React.FC<APTabsPanelProps> = ({ 
  webSocketManager, 
  httpManager, 
  topStore,
  undoManager
}) => {
  // use local state to manage the currently selected tab
  const [activeTab, setActiveTab] = useState<string>('utilities');
  
  // handle tab change
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };
  
  // if undoManager is not provided, use the undoManager from topStore
  const actualUndoManager = undoManager || topStore.undoManager;
  
  // handle the callback for the require login password change
  const handleRequireLoginChanged = () => {
    // add the logic for the require login password change here
    console.log('require login password has been changed');
  };
  
  return (
    <div className="ap-tabs-panel">
      {/* tab navigation */}
      <div className="tabs">
        <ul>
          <li 
            className={activeTab === 'network' ? 'active' : ''} 
            onClick={() => handleTabChange('network')}
          >
            Network
          </li>
          <li 
            className={activeTab === 'utilities' ? 'active' : ''} 
            onClick={() => handleTabChange('utilities')}
          >
            Utilities
          </li>
          <li 
            className={activeTab === 'virtualcc' ? 'active' : ''} 
            onClick={() => handleTabChange('virtualcc')}
          >
            Virtual CC
          </li>
          <li 
            className={activeTab === 'properties' ? 'active' : ''} 
            onClick={() => handleTabChange('properties')}
          >
            Properties
          </li>
        </ul>
      </div>
      
      {/* tab content */}
      <div className="tab-content">
        {activeTab === 'network' && (
          <APNetworkPanel 
            webSocketManager={webSocketManager} 
            topStore={topStore} 
            undoManager={actualUndoManager}
            onRequireLoginChanged={handleRequireLoginChanged}
          />
        )}
        
        {activeTab === 'utilities' && (
          <APInfoPanel 
            webSocketManager={webSocketManager} 
            httpManager={httpManager}
            topStore={topStore}
          />
        )}
        
        {activeTab === 'virtualcc' && (
          <APVCCPanel 
            topStore={topStore} 
            undoManager={actualUndoManager}
          />
        )}
        
        {activeTab === 'properties' && (
          <APPropertiesPanel 
            topStore={topStore} 
            undoManager={actualUndoManager}
          />
        )}
      </div>
    </div>
  );
};

export default APTabsPanel; 