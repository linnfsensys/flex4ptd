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
 * AP标签页面板组件 - Zustand版本
 * 整合所有AP相关的面板，包括网络、工具、虚拟CC和属性标签页
 */
const APTabsPanel: React.FC<APTabsPanelProps> = ({ 
  webSocketManager, 
  httpManager, 
  topStore,
  undoManager
}) => {
  // 使用本地状态管理当前选中的标签页
  const [activeTab, setActiveTab] = useState<string>('utilities');
  
  // 处理标签页切换
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };
  
  // 如果未提供undoManager，则使用topStore中的undoManager
  const actualUndoManager = undoManager || topStore.undoManager;
  
  // 处理需要登录密码变更的回调
  const handleRequireLoginChanged = () => {
    // 这里可以添加需要登录密码变更的处理逻辑
    console.log('需要登录密码已变更');
  };
  
  return (
    <div className="ap-tabs-panel">
      {/* 标签页导航 */}
      <div className="tabs">
        <ul>
          <li 
            className={activeTab === 'network' ? 'active' : ''} 
            onClick={() => handleTabChange('network')}
          >
            网络
          </li>
          <li 
            className={activeTab === 'utilities' ? 'active' : ''} 
            onClick={() => handleTabChange('utilities')}
          >
            工具
          </li>
          <li 
            className={activeTab === 'virtualcc' ? 'active' : ''} 
            onClick={() => handleTabChange('virtualcc')}
          >
            虚拟CC
          </li>
          <li 
            className={activeTab === 'properties' ? 'active' : ''} 
            onClick={() => handleTabChange('properties')}
          >
            属性
          </li>
        </ul>
      </div>
      
      {/* 标签页内容 */}
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