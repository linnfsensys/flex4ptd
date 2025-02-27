import React from 'react';
import useStore from './store/store';
import ExampleComponent from './store/ExampleComponent';

const ZustandApp: React.FC = () => {
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
    </div>
  );
};

export default ZustandApp;