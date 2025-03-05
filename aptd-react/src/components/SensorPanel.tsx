import React, { useState, useEffect } from 'react';
import { useSelection, useSensors, useAP } from '../store/hooks';
import { ObjectType, BatteryStatus, CharacterType, EnactType, UpdateType, ModalType } from '../AptdClientTypes';
import { Location } from '../AptdServerTypes';
import ReadOnlyField from '../fields/ReadOnlyField';
import InputField from '../fields/InputField';
import RssiSlider from '../widgets/RssiSlider';
import AptdButton from '../AptdButton';
import TopStore from '../TopStore';
import UndoManager from '../UndoManager';
import WebSocketManager from '../WebSocketManager';
import '../infoPanels/InfoPanel.css';
import '../infoPanels/InfoPanelSensor.css';

// error and warning icons
const ErrorAsteriskIcon: any = require('../assets/icons/icons8-asterisk-96.png');
const WarningIcon: any = require('../assets/icons/icons8-warning-96.png');

interface SensorPanelProps {
  topStore?: TopStore;
  undoManager?: UndoManager;
  webSocketManager?: WebSocketManager | null;
  indexInSz?: number;
  nSensorsInSz?: number;
  sensorId?: string;
}

/**
 * SensorPanel component - using Zustand hooks to manage sensors
 * this is the Zustand version of InfoPanelSensor
 */
const SensorPanel: React.FC<SensorPanelProps> = ({ 
  topStore,
  undoManager,
  webSocketManager,
  indexInSz = -1,
  nSensorsInSz = 0,
  sensorId
}) => {
  // use Zustand hooks to get the state and actions
  const { mapSensors, updateSensor, getSensor, replaceSensor, getSensorBatteryStatus } = useSensors();
  const { ap } = useAP();
  const { selected } = useSelection();
  
  // local state
  const [selectedSensor, setSelectedSensor] = useState<string | null>(sensorId || null);
  
  // when the selection changes, update the local stateection changes, update the local state
  useEffect(() => {
    // if nsorId i is provided, use itided, use it
    if (sensorId) {
      setSelectedSensor(sensorId);
    } else if (selected && selected.selectedDeviceType === ObjectType.MAP_SENSOR) {
      setSelectedSensor(selected.selectedDotid);
    } else {
      setSelectedSensor(null);
    }
  }, [selected, sensorId]);
  
  // if there is no selected sensor, display an empty panel
  if (!selectedSensor || !mapSensors[selectedSensor]) {
    return (
      <div className="infoPanelSensor">
        <div className="infoPanelHeader">Sensor</div>
        <div>No sensor selected</div>
      </div>
    );
  }
  
  const sensorModel = mapSensors[selectedSensor];
  
  // determine the device type
  let deviceType = ObjectType.MAP_SENSOR;
  if (sensorModel.info.location === Location.TRAY) {
    deviceType = ObjectType.TRAY_SENSOR;
  }
  
  // determine the sensor position label (Lead, Middle, Trail)
  let position: string = '';
  if (nSensorsInSz > 1 && indexInSz >= 0) {
    switch (indexInSz) {
      case 0:
        position = ' (Lead)';
        break;
      case 1:
        if (nSensorsInSz === 2) {
          position = ' (Trail)';
        } else if (nSensorsInSz === 3) {
          position = ' (Middle)';
        }
        break;
      case 2:
        position = ' (Trail)';
        break;
    }
  }
  
  // get the battery status
  const batteryStatus: BatteryStatus = getSensorBatteryStatus(selectedSensor);
  
  // battery status text mapping
  const batteryUserViewByBatteryStatus: {[key in BatteryStatus]: string} = {
    [BatteryStatus.GOOD]: 'Good',
    [BatteryStatus.REPLACE]: 'Replace Device!',
    [BatteryStatus.UNKNOWN]: ''
  };
  
  // check if the sensor is in the stop bar area
  const sensorZones = topStore ? Object.values(topStore.getTopState().sensorZones) : [];
  const stopBarCheck = sensorZones.find(sensorZone => 
    sensorZone.sensorIds && sensorZone.sensorIds.indexOf(selectedSensor) !== -1
  );
  
  // render the global errors
  const renderGlobalErrors = () => {
    const result: React.ReactNode[] = [];
    if (!selectedSensor) return result;
    
    const errorKey = `InfoPanel:${ObjectType.MAP_SENSOR}:${selectedSensor}`;
    const globalErrors = topStore?.getTopState().validationGlobalErrors[errorKey] || [];
    
    globalErrors.forEach((error, index) => {
      if (index > 0) {
        result.push(<br key={`br-${index}`} />);
      }
      result.push(
        <span className="globalError" key={index}>
          <img src={ErrorAsteriskIcon} width={17} alt="error" />
          {error}
        </span>
      );
    });
    
    return result;
  };
  
  // check if the sensor is in the tray
  const isSensorInTray = (sensorId: string): boolean => {
    if (!topStore) return false;
    
    const device = topStore.getTopState().trayDevices[sensorId];
    if (!device) return false;
    
    return device.otype === 'GUISensor';
  };
  
  // handle the replace sensor
  const handleReplaceSensor = () => {
    if (!selectedSensor || !topStore || !undoManager) return;
    
    // create the replace sensor form
    const replacementNode = (
      <form id="popupForm">
        <table>
          <tbody>
            <tr className="inputField row">
              <td>
                <label htmlFor="replacementIdInput" className="cell label inputLabel right">
                  Replacement ID
                </label>
              </td>
              <td>
                <input id="replacementIdInput" className="cell inputText" type="text" maxLength={4} />
              </td>
            </tr>
          </tbody>
        </table>
      </form>
    );
    
    // display the replace sensor modal
    topStore.showModal(
      ModalType.ONE_BUTTON_SUCCESS,
      `To replace Sensor ${selectedSensor}, please enter the 4 character ID of the Sensor you will use to replace it. The replacement Sensor must appear in the Tray. (After you SAVE, the replacement Sensor will take on the ID ${selectedSensor}.)`,
      ['Cancel', 'Replace'],
      [
        () => topStore.dismissModal(),
        () => {
          // validate the replacement ID
          const inputElt = document.getElementById('replacementIdInput') as HTMLInputElement;
          const replacementId = inputElt.value.toUpperCase();
          
          if (!isSensorInTray(replacementId)) {
            topStore.dismissModal();
            topStore.showModal(
              ModalType.ONE_BUTTON_ERROR, 
              'Replacement ID must be a 4 character dot ID of a Sensor in the Tray'
            );
            return;
          }
          
          // update the sensor
          undoManager.enactActionsToStore({
            actions: [{
              updateType: UpdateType.UPDATE,
              objectType: ObjectType.MAP_SENSOR,
              newData: {
                replacementSensorId: replacementId,
              },
              objectId: selectedSensor,
              origData: {
                replacementSensorId: sensorModel.replacementSensorId,
              }
            }],
            description: 'Replace Sensor',
          }, EnactType.USER_ACTION);
          
          topStore.dismissModal();
        }
      ],
      replacementNode,
      undefined,
      () => {
        // focus to the input box
        const replacementIdInput = document.getElementById('replacementIdInput');
        if (replacementIdInput) {
          replacementIdInput.focus();
        }
      }
    );
  };
  
  // create the actual TopStore and UndoManager instances
  const actualTopStore = topStore || {
    getTopState: () => ({
      mapSensors,
      ap,
      validationGlobalErrors: {}
    }),
    showModal: () => {},
    dismissModal: () => {}
  } as unknown as TopStore;
  
  const actualUndoManager = undoManager || {} as UndoManager;
  
  return (
    <div className="infoPanelSensor" data-sensorId={selectedSensor}>
      <div className="infoPanelSensorHeader infoPanelHeader">
        Sensor {selectedSensor}{position}
      </div>
      
      <div id="infoPanelSensorGlobalErrors" className="globalErrors">
        {renderGlobalErrors()}
      </div>
      
      {(sensorModel.unheard || !sensorModel.seen) && (
        <span id="infoPanelUnheardWarning">
          <img src={WarningIcon} width={17} alt="unheard" />
          Sensor {selectedSensor} is not reporting
        </span>
      )}
      
      <RssiSlider
        id={selectedSensor}
        deviceModel={sensorModel}
        unseen={sensorModel.unheard || !sensorModel.seen}
        topStore={actualTopStore}
      />
      
      <table className="sensorForm">
        <tbody>
          <ReadOnlyField 
            label="Factory ID"
            text={sensorModel.id64}
            idName={`id64${selectedSensor}`}
            fieldName="id64"
            deviceType={deviceType}
            deviceId={selectedSensor}
          />
          
          <ReadOnlyField 
            label="Software Version"
            text={sensorModel.fwVer === undefined || sensorModel.fwVer === null ? '' : sensorModel.fwVer}
            idName={`firmware${selectedSensor}`}
            fieldName="fwVer"
            deviceType={deviceType}
            deviceId={selectedSensor}
          />
          
          <ReadOnlyField 
            label="Battery Status"
            text={batteryUserViewByBatteryStatus[batteryStatus]}
            theClassName={batteryStatus === BatteryStatus.GOOD ? 'green' : 'red'}
            idName="batteryStatusRof"
            key="batteryStatus"
            fieldName="batteryStatus"
            deviceType={ObjectType.MAP_SENSOR}
            deviceId={selectedSensor}
          />
          
          <InputField 
            fieldName="ccExtension"
            idName={`ccExtension${selectedSensor}`}
            label="Extension Time"
            unit="msec"
            maxLength={5}
            objectId={selectedSensor}
            objectType={deviceType}
            disabled={deviceType === ObjectType.TRAY_SENSOR || 
              ((ap?.systemContext === 'SCOOT' || ap?.systemContext === 'MOVA') && 
               stopBarCheck && stopBarCheck.otype !== "GUIStopbarSensorZone")}
            text={sensorModel.ccExtension.toString()}
            characterType={CharacterType.NONNEGATIVE_INTEGER}
            transformValueToStore={(value) => Number(value)}
            topStore={actualTopStore}
            undoManager={actualUndoManager}
          />
          
          <InputField 
            fieldName="ccDelay"
            idName={`ccDelay${selectedSensor}`}
            label="Delay Time"
            unit="msec"
            maxLength={5}
            objectId={selectedSensor}
            objectType={deviceType}
            disabled={deviceType === ObjectType.TRAY_SENSOR}
            text={sensorModel.ccDelay.toString()}
            characterType={CharacterType.NONNEGATIVE_INTEGER}
            transformValueToStore={(value) => Number(value)}
            topStore={actualTopStore}
            undoManager={actualUndoManager}
          />
          
          <tr className="readOnlyField">
            <td className="right">
              <span className="buttonPane">
                <AptdButton
                  id={`replace${selectedSensor}`}
                  key={`replace${selectedSensor}`}
                  theClassName="replaceAnchor gray"
                  dataDotid={selectedSensor}
                  disabled={sensorModel.info.location === Location.TRAY || !sensorModel.configured}
                  onClick={handleReplaceSensor}
                  text="Replace this Sensor"
                  title=""
                />
              </span>
            </td>
            <td>
              <input 
                type="text"
                value={sensorModel.replacementSensorId === '' || sensorModel.replacementSensorId === undefined ? 
                  '' : 
                  `(with ${sensorModel.replacementSensorId})`
                }
                className="cell readOnlyInput replacementInfo"
                readOnly={true}
                disabled={true}
              />
            </td>
          </tr>
        </tbody>
      </table>
      <hr/>
    </div>
  );
};

export default SensorPanel; 