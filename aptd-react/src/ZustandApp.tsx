import React from 'react';
import useStore from './store/store';
import ExampleComponent from './store/ExampleComponent';
import MapPanel from './components/MapPanel';
import RadioPanel from './components/RadioPanel';
import APTabsPanel from './components/APTabsPanel';
import WebSocketManager from './WebSocketManager';
import HttpManager from './HttpManager';
import TopStore from './TopStore';

interface ZustandAppProps {
  webSocketManager?: WebSocketManager | null;
  httpManager?: HttpManager | null;
  topStore?: TopStore;
}

const ZustandApp: React.FC<ZustandAppProps> = ({ 
  webSocketManager = null, 
  httpManager = null,
  topStore
}) => {
  const ap = useStore(state => state.ap);
  const radios = useStore(state => state.radios);
  const mapSensors = useStore(state => state.mapSensors);

  // only show some basic information to verify data is loaded correctly
  return (
    <div className="zustand-app">
      <h3>Zustand App (测试)</h3>
      <div>
        <h4>AP 配置:</h4>
        <pre>{JSON.stringify(ap, null, 2)}</pre>
      </div>
      <div>
        <h4>无线电数量: {Object.keys(radios).length}</h4>
      </div>
      <div>
        <h4>地图传感器数量: {Object.keys(mapSensors).length}</h4>
      </div>
      
      {/* 添加示例组件 */}
      <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
        <ExampleComponent />
      </div>
      
      {/* 添加地图设置面板 */}
      <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
        <h3>Zustand版地图设置面板</h3>
        <MapPanel />
      </div>
      
      {/* 添加无线电设备面板 */}
      <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#f0f8ff' }}>
        <h3>Zustand版无线电设备面板</h3>
        <RadioPanel />
      </div>

      {/* 添加AP标签页面板 */}
      {topStore && webSocketManager && httpManager && (
        <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#fff0f5' }}>
          <h3>Zustand版AP信息面板（标签页）</h3>
          <APTabsPanel 
            webSocketManager={webSocketManager} 
            httpManager={httpManager}
            topStore={topStore}
          />
        </div>
      )}
    </div>
  );
};

export default ZustandApp;