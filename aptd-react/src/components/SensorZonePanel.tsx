import React, { useState, useEffect } from 'react';
import { useSelection, useSensorZones, useSensors, useAP, useUnitConversion } from '../store/hooks';
import { ObjectType, CharacterType, BatteryStatus } from '../AptdClientTypes';
import { UnitTypes, ServerObjectType, Location } from '../AptdServerTypes';
import InputField from '../fields/InputField';
import SelectField, { Option } from '../fields/SelectField';
import RangeField from '../fields/RangeField';
import ReadOnlyField from '../fields/ReadOnlyField';
import TopStore from '../TopStore';
import UndoManager from '../UndoManager';
import WebSocketManager from '../WebSocketManager';
import AptdButton from '../AptdButton';
import RssiSlider from '../widgets/RssiSlider';
import SensorPanel from './SensorPanel';
import '../infoPanels/InfoPanel.css';
import '../infoPanels/InfoPanelSensorZone.css';
import '../infoPanels/InfoPanelSensor.css';

// sensor zone use enum
enum SensorZoneUse {
  STOPBAR = 'STOPBAR',
  COUNT = 'COUNT',
  SPEED = 'SPEED'
}

interface SensorZonePanelProps {
  topStore?: TopStore;
  undoManager?: UndoManager;
  webSocketManager?: WebSocketManager | null;
}

// import the warning icon
const WarningIcon = require('../assets/icons/icons8-warning-96.png');
const ErrorAsteriskIcon = require('../assets/icons/icons8-asterisk-96.png');

/**
 * SensorZonePanel component - using Zustand hooks to manage the sensor zone
 * this is the Zustand version of InfoPanelSensorZone
 */
const SensorZonePanel: React.FC<SensorZonePanelProps> = ({
  topStore,
  undoManager,
  webSocketManager
}) => {
  // use Zustand hooks to get the state
  const { selected } = useSelection();
  const { sensorZones, updateSensorZone, getSensorsInZone } = useSensorZones();
  const { mapSensors, updateSensor, getSensorBatteryStatus } = useSensors();
  const { ap, getSystemContext, getUnitType } = useAP();
  const { mmToInches, inchesToMm, isImperial } = useUnitConversion();
  
  // get the selected sensor zone ID
  const szId = selected && selected.selectedSzId ? selected.selectedSzId : null;
  
  // get the selected sensor zone
  const szModel = szId ? sensorZones[szId] : null;
  
  // sensor zone use options
  const useOptions: Array<Option> = [
    {value: SensorZoneUse.STOPBAR, text: 'Stopbar'},
    {value: SensorZoneUse.COUNT, text: 'Count'},
    {value: SensorZoneUse.SPEED, text: 'Speed'},
  ];
  
  // if there is no selected sensor zone, display an empty panel
  if (!szModel || !szId) {
    return (
      <div id="infoPanelSensorZone">
        <div id="infoPanelSensorZoneHeader" className="infoPanelHeader">Sensor Zone</div>
        <div>No sensor zone selected</div>
      </div>
    );
  }
  
  // convert use to server object type
  const convertUseToOtype = (use: SensorZoneUse): ServerObjectType => {
    let otype: ServerObjectType;
    switch (use) {
      case SensorZoneUse.STOPBAR:
        otype = 'GUIStopbarSensorZone';
        break;
      case SensorZoneUse.COUNT:
        otype = 'GUICountSensorZone';
        break;
      case SensorZoneUse.SPEED:
        otype = 'GUISpeed2SensorZone';
        if (szModel.otype === 'GUISpeed3SensorZone' || szModel.sensorIds.length === 3) {
          otype = 'GUISpeed3SensorZone';
        }
        break;
      default: 
        throw new Error('unexpected use: ' + use);
    }
    return otype;
  };
  
  // convert server object type to use
  const convertOtypeToUse = (otype: ServerObjectType): SensorZoneUse => {
    let use: SensorZoneUse;
    switch (otype) {
      case 'GUIStopbarSensorZone':
        use = SensorZoneUse.STOPBAR;
        break;
      case 'GUICountSensorZone':
        use = SensorZoneUse.COUNT;
        break;
      case 'GUISpeed2SensorZone':
      case 'GUISpeed3SensorZone':
        use = SensorZoneUse.SPEED;
        break;
      default: 
        throw new Error('unexpected otype: ' + otype);
    }
    return use;
  };
  
  // convert use value to store format
  const transformValueToStore = (useValue: string) => {
    const newGUISensorZoneType: ServerObjectType = convertUseToOtype(useValue as SensorZoneUse);
    let szClient: any = {otype: newGUISensorZoneType};
    
    if (useValue === SensorZoneUse.STOPBAR) {
      const stopbarSensitivityVal = szModel.stopbarSensitivity !== undefined ? 
        szModel.stopbarSensitivity : 6; // default sensitivity value
      szClient.stopbarSensitivity = stopbarSensitivityVal;
    } else {
      szClient.stopbarSensitivity = undefined;
    }
    
    return szClient;
  };
  
  // get the adjusted sensitivity value
  const getAdjustedSensitivity = (): number => {
    if (!szModel.stopbarSensitivity) {
      return 6; // default value
    }
    
    const systemContext = getSystemContext();
    const isDefault = systemContext === 'DEFAULT';
    const sensitivity = szModel.stopbarSensitivity;
    
    if (!isDefault && sensitivity < 4) {
      return 4;
    } else if (!isDefault && sensitivity > 9) {
      return 9;
    } else {
      return sensitivity;
    }
  };
  
  // check if there is an otype error
  const checkOtypeError = (): boolean => {
    if (!topStore) return false;
    
    const errorKey = `${ObjectType.SENSOR_ZONE}:${szId}:otype`;
    const validationErrors = topStore.getTopState().validationErrors || {};
    const errMsgs = validationErrors[errorKey];
    
    return errMsgs !== undefined && errMsgs.length > 0;
  };
  
  // render the global errors
  const renderGlobalErrors = (): React.ReactNode[] => {
    if (!topStore) return [];
    
    const result: React.ReactNode[] = [];
    const errorKey = `InfoPanel:${ObjectType.SENSOR_ZONE}:${szId}`;
    const globalErrors = topStore.getTopState().validationGlobalErrors[errorKey];
    
    if (globalErrors !== undefined) {
      for (let errno = 0; errno < globalErrors.length; errno++) {
        if (errno > 0) {
          result.push(<br key={`br-${errno}`} />);
        }
        result.push(<span key={errno}>{globalErrors[errno]}</span>);
      }
    }
    
    return result;
  };
  
  // render the sensors
  const renderSensors = () => {
    if (!szModel || !szModel.sensorIds || !szModel.sensorIds.length) {
      return null;
    }
    
    return szModel.sensorIds.map((sensorId, index) => {
      // create the actual TopStore and UndoManager instances
      const actualTopStore = topStore || {} as TopStore;
      const actualUndoManager = undoManager || {} as UndoManager;
      
      return (
        <React.Fragment key={`sensor-${sensorId}`}>
          {/* use the SensorPanel component to render the sensor information */}
          <SensorPanel
            topStore={actualTopStore}
            undoManager={actualUndoManager}
            webSocketManager={webSocketManager}
            indexInSz={index}
            nSensorsInSz={szModel.sensorIds.length}
            sensorId={sensorId}
          />
          
          {/* if it is not the last sensor, add the spacing settings */}
          {index < szModel.sensorIds.length - 1 && (
            <React.Fragment>
              <table key={`between${index}`} className="betweenSensors">
                <tbody>
                  {isImperial() ? (
                    <React.Fragment key={`spacings${index}`}>
                      {/* Imperial version */}
                      <tr>
                        <InputField 
                          label="Separation"
                          text={mmToInches(szModel.spacingsMm[index])}
                          idName={`${szId}separation${index}`}
                          key={`${szId}separation${index}`}
                          row={false}
                          fieldName="spacingsMm"
                          fieldIndex={index}
                          classToAdd="separation"
                          maxLength={6}
                          objectId={szId}
                          objectType={ObjectType.SENSOR_ZONE}
                          unit="in"
                          characterType={CharacterType.NONNEGATIVE_FLOAT}
                          required={true}
                          transformValueToStore={inchesToMm}
                          topStore={actualTopStore}
                          undoManager={actualUndoManager}
                        />
                        <td rowSpan={4} className="downArrow">
                          &darr;
                        </td>
                      </tr>
                      <InputField  
                        label="Length Correction"
                        text={mmToInches(szModel.lengthCorrectionsMm[index])}
                        idName={`${szId}lengthCorrection${index}`}
                        key={`${szId}lengthCorrection${index}`}
                        fieldName="lengthCorrectionsMm"
                        fieldIndex={index}
                        maxLength={6}
                        objectId={szId}
                        objectType={ObjectType.SENSOR_ZONE}
                        unit="in"
                        characterType={CharacterType.FLOAT}
                        required={false}
                        transformValueToStore={inchesToMm}
                        topStore={actualTopStore}
                        undoManager={actualUndoManager}
                      />
                    </React.Fragment>
                  ) : (
                    <React.Fragment key={`spacings${index}`}>
                      {/* metric version */}
                      <tr>
                        <InputField 
                          label="Separation*"
                          text={szModel.spacingsMm[index]}
                          idName={`${szId}separation${index}`}
                          key={`${szId}separation${index}`}
                          row={false}
                          fieldName="spacingsMm"
                          fieldIndex={index}
                          classToAdd="separation"
                          maxLength={5}
                          objectId={szId}
                          objectType={ObjectType.SENSOR_ZONE}
                          unit="mm"
                          characterType={CharacterType.NONNEGATIVE_INTEGER}
                          topStore={actualTopStore}
                          undoManager={actualUndoManager}
                        />
                        <td rowSpan={4} className="downArrow">
                          &darr;
                        </td>
                      </tr>
                      <InputField 
                        label="Length Correction"
                        text={szModel.lengthCorrectionsMm[index]}
                        idName={`${szId}lengthCorrection${index}`}
                        key={`${szId}lengthCorrection${index}`}
                        fieldName="lengthCorrectionsMm"
                        fieldIndex={index}
                        maxLength={5}
                        objectId={szId}
                        objectType={ObjectType.SENSOR_ZONE}
                        unit="mm"
                        characterType={CharacterType.INTEGER}
                        topStore={actualTopStore}
                        undoManager={actualUndoManager}
                      />
                    </React.Fragment>
                  )}
                </tbody>
              </table>
              <hr/>
            </React.Fragment>
          )}
        </React.Fragment>
      );
    });
  };
  
  // create the actual TopStore and UndoManager instances
  const actualTopStore = topStore || {
    getTopState: () => ({
      sensorZones,
      mapSensors,
      ap,
      validationErrors: {},
      validationGlobalErrors: {}
    }),
  } as unknown as TopStore;
  
  const actualUndoManager = undoManager || {} as UndoManager;
  
  const otypeErrorPresent = checkOtypeError();
  const key = 'sensorZoneUse_' + szId;
  
  return (
    <div id="infoPanelSensorZone">
      <div id="infoPanelSensorZoneHeader" className="infoPanelHeader">Sensor Zone</div>
      <div id="infoPanelSZGlobalErrors" className="globalErrors">{renderGlobalErrors()}</div>
      <table id="szForm">
        <tbody>
          <InputField 
            label="Name"
            text={szModel.name}
            key={'szName_' + szId}
            idName="szName"
            fieldName="name"
            maxLength={32}
            objectType={ObjectType.SENSOR_ZONE}
            required={true}
            objectId={szId}
            characterType={CharacterType.NAME_WITH_BLANKS}
            topStore={actualTopStore}
            undoManager={actualUndoManager}
          />
          
          <SelectField 
            label="Used for"
            value={convertOtypeToUse(szModel.otype)}
            key={key}
            options={useOptions}
            idName={key}
            className="szUse"
            fieldName="otype"
            objectType={ObjectType.SENSOR_ZONE}
            objectId={szId}
            transformValueToStore={transformValueToStore}
            topStore={actualTopStore}
            undoManager={actualUndoManager}
          />
          
          <RangeField 
            label="Stopbar Sensitivity"
            disabled={(szModel.otype !== 'GUIStopbarSensorZone' ||
                      szModel.stopbarSensitivity === undefined) ||
                      otypeErrorPresent}
            value={getAdjustedSensitivity()}
            min={getSystemContext() === 'DEFAULT' ? 1 : 4}
            max={getSystemContext() === 'DEFAULT' ? 15 : 9}
            step={1}
            key={'szSensitivity' + szId}
            idName="szSensitivity"
            fieldName="stopbarSensitivity"
            objectType={ObjectType.SENSOR_ZONE}
            objectId={szId}
            showMoreLess={true}
            undoManager={actualUndoManager}
            topStore={actualTopStore}
          />
        </tbody>
      </table>
      <hr/>
      {renderSensors()}
    </div>
  );
};

export default SensorZonePanel; 