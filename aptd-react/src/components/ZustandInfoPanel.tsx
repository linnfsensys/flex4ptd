import React from 'react';
import { useSelection } from '../store/hooks';
import { ObjectType, GUICCAPGIClient, GUICCSTSClient } from '../AptdClientTypes';
import '../infoPanels/InfoPanel.css';
import TopStore from '../TopStore';
import UndoManager from '../UndoManager';
import WebSocketManager from '../WebSocketManager';
import HttpManager from '../HttpManager';
import MapImagesManager from '../MapImagesManager';

// Import all the info panels
import InfoPanelMap from '../infoPanels/InfoPanelMap';
import InfoPanelSensor from '../infoPanels/InfoPanelSensor';
import InfoPanelSensorZone from '../infoPanels/InfoPanelSensorZone';
import InfoPanelRadio from '../infoPanels/InfoPanelRadio';
import InfoPanelRepeater from '../infoPanels/InfoPanelRepeater';
import InfoPanelAP, { ActiveTab } from '../infoPanels/InfoPanelAP';
import InfoPanelCC, { CCActiveTab } from '../infoPanels/InfoPanelCC';
import InfoPanelSTS, { STSActiveTab } from '../infoPanels/InfoPanelSTS';
import InfoPanelAPGI from '../infoPanels/InfoPanelAPGI';
import InfoPanelTextField from '../infoPanels/InfoPanelTextField';
import InfoPanelTechSupport, { TechSupportActiveTab } from '../infoPanels/InfoPanelTechSupport';

interface ZustandInfoPanelProps {
  mapCabinetTrayHeight: number;
  topStore: TopStore;
  undoManager: UndoManager;
  webSocketManager: WebSocketManager | null;
  httpManager: HttpManager;
  onRequireLoginChanged: () => void;
  mapImagesManager: MapImagesManager;
}

/**
 * ZustandInfoPanel - A container component that displays the appropriate info panel
 * based on the current selection in the Zustand store
 */
const ZustandInfoPanel: React.FC<ZustandInfoPanelProps> = ({
  mapCabinetTrayHeight,
  topStore,
  undoManager,
  webSocketManager,
  httpManager,
  onRequireLoginChanged,
  mapImagesManager
}) => {
  // Get the current selection from the Zustand store
  const { selected } = useSelection();
  
  // State for active tabs in different panels
  const [apActiveTab, setAPActiveTab] = React.useState<ActiveTab>(ActiveTab.NETWORK);
  const [ccActiveTab, setCCActiveTab] = React.useState<CCActiveTab>(CCActiveTab.BASIC);
  const [stsActiveTab, setSTSActiveTab] = React.useState<STSActiveTab>(STSActiveTab.IPS);
  const [techSupportActiveTab, setTechSupportActiveTab] = React.useState<TechSupportActiveTab>(TechSupportActiveTab.JOBS);
  
  // Calculate the height for the panel
  const height = mapCabinetTrayHeight - 14;
  const styles = {
    height: `${height}px`,
    maxHeight: `${Math.max(578, height)}px`,
  } as React.CSSProperties;
  
  // Render the appropriate panel based on selection
  const renderPanel = () => {
    const model = topStore.getTopState();
    
    if (model.ap === null) {
      // GUIAPConfig not yet arrived
      return null;
    }
    
    if (!selected || (selected.selectedDeviceType === null && selected.selectedDotid === null)) {
      return renderInfoPanelMap();
    }
    
    switch (selected.selectedDeviceType) {
      case ObjectType.TEXT_FIELD:
        return renderInfoPanelTextField();
      
      case ObjectType.MAP_NORTH_ARROW_ICON:
      case ObjectType.MAP_SETTINGS:
      case ObjectType.MAP:
        return renderInfoPanelMap();
      
      case ObjectType.TRAY_SENSOR:
      case ObjectType.MAP_SENSOR:
        return renderInfoPanelSensor();
      
      case ObjectType.SENSOR_ZONE:
        return renderInfoPanelSensorZone();
      
      case ObjectType.RADIO:
        return renderInfoPanelRadio();
      
      case ObjectType.MAP_REPEATER:
      case ObjectType.TRAY_REPEATER:
        return renderInfoPanelRepeater();
      
      case ObjectType.CCCARD:
        return renderInfoPanelCC();
      
      case ObjectType.SDLC_BANK:
        return renderInfoPanelSdlc();
      
      case ObjectType.AP:
        return renderInfoPanelAP();
      
      case ObjectType.APGI:
        return renderInfoPanelApgi();
      
      case ObjectType.STS:
        return renderInfoPanelSts();
      
      case ObjectType.TECH_SUPPORT:
        return renderInfoPanelTechSupport();
      
      default:
        console.error('Unexpected selectedDeviceType:', selected.selectedDeviceType);
        return null;
    }
  };
  
  // Render methods for each panel type
  const renderInfoPanelTextField = () => {
    if (!selected || !selected.selectedDotid) {
      console.error('Unexpected null selected.selectedDotid for text field');
      return null;
    }
    
    const textField = topStore.getTopState().mapSettings.textFields[selected.selectedDotid];
    const text = textField.editText !== undefined ? textField.editText : textField.text;
    
    return (
      <InfoPanelTextField
        key={selected.selectedDotid}
        id={selected.selectedDotid}
        text={text}
        topStore={topStore}
        undoManager={undoManager}
      />
    );
  };
  
  const renderInfoPanelMap = () => {
    return (
      <InfoPanelMap 
        apModel={topStore.getTopState().ap}
        mapModel={topStore.getTopState().mapSettings}
        topStore={topStore}
        undoManager={undoManager}
        httpManager={httpManager}
        mapImagesManager={mapImagesManager}
      />
    );
  };
  
  const renderInfoPanelSensor = () => {
    if (!selected || !selected.selectedDotid) {
      console.error('Unexpected null selected.selectedDotid for sensor');
      return null;
    }
    
    const model = topStore.getTopState();
    let sensorModel;
    let indexInSz = NaN;
    let nSensorsInSz = NaN;
    
    if (selected.selectedDeviceType === ObjectType.TRAY_SENSOR) {
      sensorModel = model.trayDevices[selected.selectedDotid];
    } else {
      sensorModel = model.mapSensors[selected.selectedDotid];
      
      // If sensor is in a zone, get its index
      if (selected.selectedSzId) {
        const szModel = model.sensorZones[selected.selectedSzId];
        if (szModel && szModel.sensorIds) {
          indexInSz = szModel.sensorIds.indexOf(selected.selectedDotid);
          nSensorsInSz = szModel.sensorIds.length;
        }
      }
    }
    
    if (!sensorModel) {
      console.error('Could not find sensor with dotid', selected.selectedDotid);
      return null;
    }
    
    return (
      <InfoPanelSensor
        key={selected.selectedDotid}
        dotid={selected.selectedDotid}
        indexInSz={indexInSz}
        nSensorsInSz={nSensorsInSz}
        sensorModel={sensorModel}
        topStore={topStore}
        undoManager={undoManager}
        webSocketManager={webSocketManager}
      />
    );
  };
  
  const renderInfoPanelSensorZone = () => {
    if (!selected || !selected.selectedSzId) {
      console.error('Unexpected null selectedSzId');
      return null;
    }
    
    const szModel = topStore.getTopState().sensorZones[selected.selectedSzId];
    
    return (
      <div id="sensorSzPanel">
        <InfoPanelSensorZone
          key={selected.selectedSzId}
          szId={selected.selectedSzId}
          szModel={szModel}
          selected={selected}
          topStore={topStore}
          undoManager={undoManager}
          webSocketManager={webSocketManager}
        />
      </div>
    );
  };
  
  const renderInfoPanelRadio = () => {
    if (!selected || !selected.selectedDotid) {
      console.error('Unexpected null selected.selectedDotid for radio');
      return null;
    }
    
    const radioModel = topStore.getTopState().radios[selected.selectedDotid];
    
    if (!radioModel) {
      console.error('Could not find radio with id', selected.selectedDotid);
      return null;
    }
    
    return (
      <div id="radioPanel">
        <InfoPanelRadio
          key={selected.selectedDotid}
          radioModel={radioModel}
          topStore={topStore}
          undoManager={undoManager}
        />
      </div>
    );
  };
  
  const renderInfoPanelRepeater = () => {
    if (!selected || !selected.selectedDotid) {
      console.error('Unexpected null selected.selectedDotid for repeater');
      return null;
    }
    
    const model = topStore.getTopState();
    let repeaterModel;
    
    if (selected.selectedDeviceType === ObjectType.TRAY_REPEATER) {
      repeaterModel = model.trayDevices[selected.selectedDotid];
    } else {
      repeaterModel = model.mapRepeaters[selected.selectedDotid];
    }
    
    if (!repeaterModel) {
      console.error('Could not find repeater with id', selected.selectedDotid);
      return null;
    }
    
    return (
      <div id="repeaterPanel">
        <InfoPanelRepeater
          key={selected.selectedDotid}
          repeaterId={selected.selectedDotid}
          repeaterModel={repeaterModel}
          topStore={topStore}
          undoManager={undoManager}
        />
      </div>
    );
  };
  
  const renderInfoPanelCC = () => {
    if (!selected || !selected.selectedDotid) {
      console.error('Unexpected null selected.selectedDotid for CC');
      return null;
    }
    
    const ccModel = topStore.getTopState().ccCards[selected.selectedDotid];
    
    if (!ccModel) {
      console.error('Could not find CC with id', selected.selectedDotid);
      return null;
    }
    
    return (
      <div id="ccPanel">
        <InfoPanelCC
          key={selected.selectedDotid}
          ccId={selected.selectedDotid}
          ccModel={ccModel}
          setCCActiveTab={setCCActiveTab}
          topStore={topStore}
          undoManager={undoManager}
          webSocketManager={webSocketManager}
        />
      </div>
    );
  };
  
  const renderInfoPanelSdlc = () => {
    if (!selected || !selected.selectedDotid) {
      console.error('Unexpected null selected.selectedDotid for SDLC');
      return null;
    }
    
    const ccModel = topStore.getTopState().ccCards['SDLC'];
    
    if (!ccModel) {
      console.error('Could not find SDLC model');
      return null;
    }
    
    return (
      <div id="ccPanel">
        <InfoPanelCC
          key={selected.selectedDotid}
          ccId={selected.selectedDotid}
          bankNo={+selected.selectedDotid}
          ccModel={ccModel}
          setCCActiveTab={setCCActiveTab}
          topStore={topStore}
          undoManager={undoManager}
          webSocketManager={webSocketManager}
        />
      </div>
    );
  };
  
  const renderInfoPanelAP = () => {
    const apModel = topStore.getTopState().ap;
    
    if (!apModel) {
      console.error('Unexpected null apModel');
      return null;
    }
    
    return (
      <div id="apPanel">
        <InfoPanelAP
          key="AP"
          apModel={apModel}
          apId="AP"
          activeTab={apActiveTab}
          setAPActiveTab={setAPActiveTab}
          topStore={topStore}
          undoManager={undoManager}
          webSocketManager={webSocketManager}
          httpManager={httpManager}
          onRequireLoginChanged={onRequireLoginChanged}
        />
      </div>
    );
  };
  
  const renderInfoPanelApgi = () => {
    const apgiModel = topStore.getTopState().ccCards['APGI'] as GUICCAPGIClient;
    
    if (!apgiModel) {
      console.error('Unexpected null apgiModel');
      return null;
    }
    
    return (
      <div id="ccPanel">
        <InfoPanelAPGI
          key="APGI"
          apgiModel={apgiModel}
          topStore={topStore}
          undoManager={undoManager}
        />
      </div>
    );
  };
  
  const renderInfoPanelSts = () => {
    const stsModel = topStore.getTopState().ccCards['STS'] as GUICCSTSClient;
    
    if (!stsModel) {
      console.error('Unexpected null stsModel');
      return null;
    }
    
    return (
      <div id="ccPanel">
        <InfoPanelSTS
          key="STS"
          stsModel={stsModel}
          setSTSActiveTab={setSTSActiveTab}
          topStore={topStore}
          undoManager={undoManager}
        />
      </div>
    );
  };
  
  const renderInfoPanelTechSupport = () => {
    const techSupportModel = topStore.getTopState().techSupport;
    
    return (
      <div id="techSupportPanel">
        <InfoPanelTechSupport
          techSupportModel={techSupportModel}
          activeTab={techSupportActiveTab}
          setTechSupportActiveTab={setTechSupportActiveTab}
          webSocketManager={webSocketManager}
          topStore={topStore}
          undoManager={undoManager}
        />
      </div>
    );
  };
  
  return (
    <div id="infoPanel" style={styles}>
      {renderPanel()}
    </div>
  );
};

export default ZustandInfoPanel; 