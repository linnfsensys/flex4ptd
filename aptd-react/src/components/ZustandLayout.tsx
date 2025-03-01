import React from 'react';
import MapAndTrayPanel from './MapAndTrayPanel';
import ZustandInfoPanel from './ZustandInfoPanel';
import TopStore from '../TopStore';
import UndoManager from '../UndoManager';
import WebSocketManager from '../WebSocketManager';
import HttpManager from '../HttpManager';
import MapImagesManager from '../MapImagesManager';
import './ZustandLayout.css';

interface ZustandLayoutProps {
  topStore: TopStore;
  undoManager: UndoManager;
  webSocketManager: WebSocketManager | null;
  httpManager: HttpManager;
  onRequireLoginChanged: () => void;
  mapImagesManager: MapImagesManager;
}

/**
 * ZustandLayout - Main layout component for the Zustand version of the application
 * Contains MapAndTrayPanel on the left and ZustandInfoPanel on the right
 */
const ZustandLayout: React.FC<ZustandLayoutProps> = ({
  topStore,
  undoManager,
  webSocketManager,
  httpManager,
  onRequireLoginChanged,
  mapImagesManager
}) => {
  // Calculate dimensions based on window size
  const [dimensions, setDimensions] = React.useState({
    width: window.innerWidth,
    height: window.innerHeight - 50 // Subtract toolbar height
  });

  // Calculate panel dimensions
  const mapCabinetTrayWidth = Math.floor(dimensions.width * 0.7); // 70% of width for map
  const mapCabinetTrayHeight = dimensions.height;
  const trayHeight = Math.floor(mapCabinetTrayHeight * 0.2); // 20% of height for tray
  const mapHeight = mapCabinetTrayHeight - trayHeight;

  // Update dimensions on window resize
  React.useEffect(() => {
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
      <div className="map-tray-container" style={{ width: mapCabinetTrayWidth }}>
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
      <div className="info-panel-container" style={{ width: dimensions.width - mapCabinetTrayWidth }}>
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
  );
};

export default ZustandLayout; 