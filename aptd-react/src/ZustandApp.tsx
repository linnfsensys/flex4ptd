import React from 'react';
import useStore from './store/store';

const ZustandApp: React.FC = () => {
  const ap = useStore(state => state.ap);
  const radios = useStore(state => state.radios);
  const mapSensors = useStore(state => state.mapSensors);

  // only show some basic information to verify data is loaded correctly
  return (
    <div className="zustand-app">
      <h3>Zustand App (testing)</h3>
      <div>
        <h4>AP config:</h4>
        <pre>{JSON.stringify(ap, null, 2)}</pre>
      </div>
      <div>
        <h4>number of radios: {Object.keys(radios).length}</h4>
      </div>
      <div>
        <h4>number of map sensors: {Object.keys(mapSensors).length}</h4>
      </div>
    </div>
  );
};

export default ZustandApp;