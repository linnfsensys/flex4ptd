import React, { useState, useEffect, useCallback } from 'react';
import { useSelection, useRadios, useAP } from '../store/hooks';
import { ObjectType, UpdateType, Action } from '../AptdClientTypes';
import { ChannelMode } from '../AptdServerTypes';
import ReadOnlyField from '../fields/ReadOnlyField';
import SelectField, { Option } from '../fields/SelectField';
import TopStore from '../TopStore';
import UndoManager from '../UndoManager';
import '../infoPanels/InfoPanel.css';

interface RadioPanelProps {
  topStore?: TopStore;
  undoManager?: UndoManager;
}

/**
 * RadioPanel component - using Zustand hooks to manage radio devices
 * this is the Zustand version of InfoPanelRadio
 */
const RadioPanel: React.FC<RadioPanelProps> = ({ 
  topStore,
  undoManager
}) => {
  // use Zustand hooks to get the state and actions
  const { radios, updateRadio, getRadio } = useRadios();
  const { ap } = useAP();
  const { selected } = useSelection();
  
  // local state
  const [selectedRadio, setSelectedRadio] = useState<string | null>(null);
  
  // when the selection changes, update the local state
  useEffect(() => {
    if (selected && selected.selectedDeviceType === ObjectType.RADIO) {
      setSelectedRadio(selected.selectedDotid);
    } else {
      setSelectedRadio(null);
    }
  }, [selected]);
  
  // if there is no selected radio device, display an empty panel
  if (!selectedRadio || !radios[selectedRadio]) {
    return (
      <div className="radio-panel">
        <div className="info-panel-header">Radio</div>
        <div>No radio selected</div>
      </div>
    );
  }
  
  const radioModel = radios[selectedRadio];
  
  // channel mode options
  const channelModeOptions: Array<Option> = [
    { value: 'MANUAL', text: 'Fixed' },
    { value: 'AUTO', text: 'Automatic' }
  ];
  
  // channel options
  const channelOptions: Array<Option> = [
    { value: '1', text: 'Channel 1' },
    { value: '2', text: 'Channel 2' },
    { value: '3', text: 'Channel 3' },
    { value: '4', text: 'Channel 4' },
    { value: '5', text: 'Channel 5' },
    { value: '6', text: 'Channel 6' },
    { value: '7', text: 'Channel 7' },
    { value: '8', text: 'Channel 8' }
  ];
  
  // transform the channel value to the store format
  const transformChannelValueToStore = (channelValue: string): {[fieldName: string]: string} => {
    return { desiredChannel: channelValue };
  };
  
  // handle the channel mode change
  const handleChannelModeChange = (value: string) => {
    updateRadio(selectedRadio, { channelMode: value });
  };
  
  // disable the disallowed options
  const disableDisallowedOptions = (radioId: string, allChannelOptions: Array<Option>): Array<Option> => {
    // here we can implement the logic to disable specific channels
    return allChannelOptions;
  };
  
  // create the actual TopStore and UndoManager instances
  const actualTopStore = topStore || {
    getTopState: () => ({
      radios,
      ap
    }),
    dispatch: (action: Action) => {
      if (action.objectType === ObjectType.RADIO && action.updateType === UpdateType.UPDATE) {
        updateRadio(action.objectId, action.newData);
      }
    }
  } as unknown as TopStore;
  
  const actualUndoManager = undoManager || {} as UndoManager;
  
  return (
    <div className="radio-panel">
      <div className="info-panel-header">Radio {selectedRadio}</div>
      
      <table className="radio-form">
        <tbody>
          <ReadOnlyField 
            label="Radio ID"
            text={radioModel.id}
            idName={`radioId_${selectedRadio}`}
            fieldName="id"
            deviceType={ObjectType.RADIO}
            deviceId={selectedRadio}
          />
          
          <ReadOnlyField 
            label="Radio Type"
            text={radioModel.apConnection || ''}
            idName={`radioType_${selectedRadio}`}
            fieldName="apConnection"
            deviceType={ObjectType.RADIO}
            deviceId={selectedRadio}
          />
          
          <SelectField 
            label="Channel Mode"
            value={radioModel.channelMode || 'MANUAL'}
            options={channelModeOptions}
            idName={`channelMode_${selectedRadio}`}
            fieldName="channelMode"
            objectType={ObjectType.RADIO}
            objectId={selectedRadio}
            topStore={actualTopStore}
            undoManager={actualUndoManager}
            onValueChanged={handleChannelModeChange}
            className="channelMode"
            key={`channelMode_${selectedRadio}`}
          />
          
          {radioModel.channelMode === 'MANUAL' && (
            <SelectField 
              label="Channel"
              value={radioModel.desiredChannel || '1'}
              options={disableDisallowedOptions(selectedRadio, channelOptions)}
              idName={`channel_${selectedRadio}`}
              fieldName="desiredChannel"
              objectType={ObjectType.RADIO}
              objectId={selectedRadio}
              topStore={actualTopStore}
              undoManager={actualUndoManager}
              transformValueToStore={transformChannelValueToStore}
              className="channel"
              key={`channel_${selectedRadio}`}
            />
          )}
          
          <ReadOnlyField 
            label="Current Channel"
            text={radioModel.knownChannel || ''}
            idName={`currentChannel_${selectedRadio}`}
            fieldName="knownChannel"
            deviceType={ObjectType.RADIO}
            deviceId={selectedRadio}
          />
        </tbody>
      </table>
    </div>
  );
};

export default RadioPanel; 