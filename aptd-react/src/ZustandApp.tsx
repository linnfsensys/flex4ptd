import React, { useEffect, useState } from 'react';
import useStore from './store/store';
import ExampleComponent from './store/ExampleComponent';
import MapPanel from './components/MapPanel';
import RadioPanel from './components/RadioPanel';
import APTabsPanel from './components/APTabsPanel';
import SensorZonePanel from './components/SensorZonePanel';
import RepeaterPanel from './components/RepeaterPanel';
import SensorPanel from './components/SensorPanel';
import WebSocketManager from './WebSocketManager';
import HttpManager from './HttpManager';
import TopStore from './TopStore';
import MapImagesManager from './MapImagesManager';
import { ObjectType } from './AptdClientTypes';

interface ZustandAppProps {
  webSocketManager?: WebSocketManager | null;
  httpManager?: HttpManager | null;
  topStore?: TopStore;
  mapImagesManager?: MapImagesManager | null;
}

const ZustandApp: React.FC<ZustandAppProps> = ({ 
  webSocketManager = null, 
  httpManager = null,
  topStore,
  mapImagesManager = null
}) => {
  const selected = useStore(state => state.selected);
  
  // 监听选择变化，决定显示哪个面板
  const [activePanel, setActivePanel] = useState<string>('map');
  
  // 当选择变化时更新活动面板
  useEffect(() => {
    if (!selected || !selected.selectedDeviceType) {
      setActivePanel('map');
    } else if (selected.selectedDeviceType === ObjectType.AP) {
      setActivePanel('ap');
    } else if (selected.selectedDeviceType === ObjectType.RADIO) {
      setActivePanel('radio');
    } else if (selected.selectedDeviceType === ObjectType.SENSOR_ZONE) {
      setActivePanel('sensorZone');
    } else if (selected.selectedDeviceType === ObjectType.MAP_REPEATER) {
      setActivePanel('repeater');
    } else if (selected.selectedDeviceType === ObjectType.MAP_SENSOR) {
      setActivePanel('sensor');
    } else if (
      selected.selectedDeviceType === ObjectType.MAP || 
      selected.selectedDeviceType === ObjectType.MAP_SETTINGS ||
      selected.selectedDeviceType === ObjectType.MAP_NORTH_ARROW_ICON
    ) {
      setActivePanel('map');
    }
  }, [selected]);

  return (
    <div className="zustand-app">
      <h3>Zustand App (测试)</h3>
      
      {/* 根据活动面板显示不同的内容 */}
      {activePanel === 'map' && (
        <div style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
          <MapPanel 
            topStore={topStore}
            webSocketManager={webSocketManager}
            httpManager={httpManager}
            mapImagesManager={mapImagesManager}
          />
        </div>
      )}
      
      {activePanel === 'radio' && (
        <div style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#f0f8ff' }}>
          <RadioPanel 
            topStore={topStore}
            undoManager={topStore?.undoManager}
          />
        </div>
      )}

      {activePanel === 'repeater' && (
        <div style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#fff8f0' }}>
          <RepeaterPanel 
            topStore={topStore}
            undoManager={topStore?.undoManager}
            webSocketManager={webSocketManager}
          />
        </div>
      )}

      {activePanel === 'sensorZone' && (
        <div id="sensorSzPanel" style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#f0fff0' }}>
          <SensorZonePanel 
            topStore={topStore}
            undoManager={topStore?.undoManager}
            webSocketManager={webSocketManager}
          />
        </div>
      )}

      {activePanel === 'sensor' && (
        <div id="sensorPanel" style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#fffff0' }}>
          <SensorPanel 
            topStore={topStore}
            undoManager={topStore?.undoManager}
            webSocketManager={webSocketManager}
          />
        </div>
      )}

      {activePanel === 'ap' && topStore && webSocketManager && httpManager && (
        <div style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#fff0f5' }}>
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