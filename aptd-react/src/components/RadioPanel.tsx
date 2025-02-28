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
 * RadioPanel组件 - 使用Zustand hooks管理无线电设备
 * 这是InfoPanelRadio的Zustand版本
 */
const RadioPanel: React.FC<RadioPanelProps> = ({ 
  topStore,
  undoManager
}) => {
  // 使用Zustand hooks获取状态和操作
  const { radios, updateRadio, getRadio } = useRadios();
  const { ap } = useAP();
  const { selected } = useSelection();
  
  // 本地状态
  const [selectedRadio, setSelectedRadio] = useState<string | null>(null);
  
  // 当选择变化时更新本地状态
  useEffect(() => {
    if (selected && selected.selectedDeviceType === ObjectType.RADIO) {
      setSelectedRadio(selected.selectedDotid);
    } else {
      setSelectedRadio(null);
    }
  }, [selected]);
  
  // 如果没有选中的无线电设备，显示空面板
  if (!selectedRadio || !radios[selectedRadio]) {
    return (
      <div className="radio-panel">
        <div className="info-panel-header">Radio</div>
        <div>No radio selected</div>
      </div>
    );
  }
  
  const radioModel = radios[selectedRadio];
  
  // 通道模式选项
  const channelModeOptions: Array<Option> = [
    { value: 'MANUAL', text: 'Fixed' },
    { value: 'AUTO', text: 'Automatic' }
  ];
  
  // 通道选项
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
  
  // 转换通道值到存储格式
  const transformChannelValueToStore = (channelValue: string): {[fieldName: string]: string} => {
    return { desiredChannel: channelValue };
  };
  
  // 处理通道模式变化
  const handleChannelModeChange = (value: string) => {
    updateRadio(selectedRadio, { channelMode: value });
  };
  
  // 禁用不允许的选项
  const disableDisallowedOptions = (radioId: string, allChannelOptions: Array<Option>): Array<Option> => {
    // 这里可以实现禁用特定通道的逻辑
    return allChannelOptions;
  };
  
  // 创建实际的TopStore和UndoManager实例
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