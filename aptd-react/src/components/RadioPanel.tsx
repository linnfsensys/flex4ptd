import React, { useState, useEffect, useCallback } from 'react';
import { useMapDevices, useActions, useAppState, useSelection } from '../store/hooks';
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
  const { radios } = useMapDevices();
  const { dispatch } = useActions();
  const { disabled } = useAppState();
  const { selected } = useSelection();
  
  // 获取选中的无线电ID
  const radioId = selected && selected.selectedDeviceType === ObjectType.RADIO 
    ? selected.selectedDotid 
    : Object.keys(radios)[0] || null;
  
  // 获取选中的无线电
  const radio = radioId ? radios[radioId] : null;
  
  // 创建通道选项
  const [channelOptions, setChannelOptions] = useState<Option[]>([]);
  const [allChannelOptions, setAllChannelOptions] = useState<Option[]>([]);
  
  // 初始化通道选项
  useEffect(() => {
    const autoText = 'Auto';
    const options: Option[] = [
      {value: 'AUTO', text: autoText},
      {value: '0', text: '0'},
      {value: '1', text: '1'},
      {value: '2', text: '2'},
      {value: '3', text: '3'},
      {value: '4', text: '4'},
      {value: '5', text: '5'},
      {value: '6', text: '6'},
      {value: '7', text: '7'},
      {value: '8', text: '8'},
      {value: '9', text: '9'},
      {value: '10', text: '10'},
      {value: '11', text: '11'},
      {value: '12', text: '12'},
      {value: '13', text: '13'},
      {value: '14', text: '14'},
      {value: '15', text: '15'},
    ];
    setAllChannelOptions(options);
  }, []);
  
  // 更新通道选项
  useEffect(() => {
    if (radio && allChannelOptions.length > 0) {
      // 更新Auto选项的文本
      let autoText = 'Auto';
      if (radio.knownChannel !== '-1') {
        autoText = `Auto (currently ${radio.knownChannel})`;
      }
      
      const updatedOptions = [...allChannelOptions];
      updatedOptions[0] = { ...updatedOptions[0], text: autoText };
      
      // 禁用已被其他无线电或中继器使用的通道
      const disabledOptions = disableDisallowedOptions(radio.id, updatedOptions);
      setChannelOptions(disabledOptions);
    }
  }, [radio, allChannelOptions]);
  
  // 转换通道值为存储格式
  const transformChannelValueToStore = (channelValue: string): {[fieldName: string]: string} => {
    let newChannel: string;
    let newChannelMode: string;
    if (channelValue === 'AUTO') {
      newChannel = '-1';
      newChannelMode = ChannelMode.AUTO;
    } else {
      const channel: number = +channelValue;
      if (channel >= 0 && channel <= 15) {
        newChannel = channelValue.toString();
        newChannelMode = ChannelMode.MANUAL;
      } else {
        console.error('unexpected channelValue', channelValue);
        newChannel = '-1';
        newChannelMode = ChannelMode.AUTO;
      }
    }
    return {
      desiredChannel: newChannel,
      channelMode: newChannelMode
    };
  };
  
  // 处理无线电通道变更时添加额外操作
  const onRadioDesiredChannelChangedAddActions = useCallback((event: React.ChangeEvent<HTMLSelectElement>, updateAction: Action): Action[] => {
    if (!radio || !topStore) return [updateAction];
    
    const actions: Action[] = [updateAction];
    
    // 获取RF子设备（中继器）
    const rfChildren = Object.values(topStore.getTopState().mapRepeaters).filter(repeater => {
      return repeater.info.rfLink && repeater.info.rfLink.dstId === radio.id;
    });
    
    // 获取新的通道值
    const radioDesiredChannel: string = (event.target.value === 'AUTO' ?
      radio.knownChannel : event.target.value);
    
    // 为每个子设备添加更新操作
    for (let mapRepeater of rfChildren) {
      const action: Action = {
        updateType: UpdateType.UPDATE,
        objectType: ObjectType.MAP_REPEATER,
        objectId: mapRepeater.id,
        newData: { desiredUpstreamChannel: radioDesiredChannel },
        origData: { desiredUpstreamChannel: mapRepeater.desiredUpstreamChannel }
      };
      actions.push(action);
    }
    
    return actions;
  }, [radio, topStore]);
  
  // 禁用不允许的通道选项
  const disableDisallowedOptions = (radioId: string, allChannelOptions: Array<Option>): Array<Option> => {
    if (!topStore) return allChannelOptions;
    
    const topState = topStore.getTopState();
    
    // 获取所有中继器的下游通道
    const allRepeaterDesiredDownstreamChannels: number[] =
      Object.values(topState.mapRepeaters)
        .map(mapRepeater => {
          return mapRepeater.channelMode === ChannelMode.MANUAL ?
            +mapRepeater.desiredDownstreamChannel :
            +mapRepeater.knownDownstreamChannel;
        });
    
    const allRepeaterKnownDownstreamChannels: number[] =
      Object.values(topState.mapRepeaters)
        .map(mapRepeater => +mapRepeater.knownDownstreamChannel);
    
    // 获取另一个无线电
    const otherRadio = (radioId === 'SPP0' ?
      topState.radios['SPP1'] :
      topState.radios['SPP0']);
    
    // 获取另一个无线电的通道
    const otherRadioDesiredChannel: number = (otherRadio === undefined ?
      -1 :
      (otherRadio.channelMode === ChannelMode.MANUAL ?
        +otherRadio.desiredChannel : +otherRadio.knownChannel));
    
    const otherRadioKnownChannel: number =
      (otherRadio === undefined ? -1 : +otherRadio.knownChannel);
    
    // 合并所有禁止的通道
    const forbiddenChannelsArray: number[] =
      allRepeaterDesiredDownstreamChannels
        .concat(allRepeaterKnownDownstreamChannels)
        .concat(otherRadioDesiredChannel)
        .concat(otherRadioKnownChannel)
        .filter((channel: number) => (channel !== -1));
    
    const forbiddenChannelsSet: Set<number> = new Set<number>(forbiddenChannelsArray);
    
    // 'AUTO'选项始终允许，其他选项根据是否被禁用来过滤
    const allowedOptions: Option[] = allChannelOptions.filter((option) =>
      (option.value === 'AUTO' || !forbiddenChannelsSet.has(+option.value)));
    
    const allowedOptionByValue: {[value: string]: Option} = {};
    allowedOptions.forEach((option: Option) => {
      allowedOptionByValue[option.value] = option;
    });
    
    return allChannelOptions.map((option: Option) =>
      ({...option, disabled: (allowedOptionByValue[option.value] === undefined)}));
  };
  
  // 如果没有选中的无线电，显示空面板
  if (!radio) {
    return <div id="infoPanelRadio">
      <div id="infoPanelRadioHeader" className="infoPanelHeader">无线电</div>
      <div>未选择无线电设备</div>
    </div>;
  }
  
  // 获取通道字符串
  const channelString = (radio.channelMode === ChannelMode.AUTO ||
                         radio.desiredChannel === '-1') ?
                          ChannelMode.AUTO : radio.desiredChannel;
  
  // 获取标题
  const header = 'Radio-' + radio.apConnection.replace('SPP', '');
  const key = 'radioChannel_' + radio.id;
  
  // 创建实际的TopStore和UndoManager实例
  const actualTopStore = topStore || {
    getTopState: () => ({
      radios,
      mapRepeaters: {},
      validationErrors: {} // 添加空的 validationErrors 对象以避免 undefined 错误
    }),
    dispatch: dispatch
  } as unknown as TopStore;
  
  const actualUndoManager = undoManager || {
    enactActionsToStore: (actionGroup: { actions: Action[], description: string }) => {
      dispatch(actionGroup.actions[0]);
    }
  } as unknown as UndoManager;
  
  return (
    <div id="infoPanelRadio">
      <div id="infoPanelRadioHeader" className="infoPanelHeader">{header}</div>
      <div id="infoPanelRadioGlobalErrors" className="globalErrors">
        {/* 这里可以添加全局错误显示 */}
      </div>
      {radio.unheard && (
        <span id="infoPanelUnheardWarning">
          <img src={require('../assets/icons/icons8-warning-96.png')} width={17} alt="unheard" />
          Radio {radio.id} is not reporting
        </span>
      )}
      <div id="radioForm">
        <table>
          <tbody>
            <ReadOnlyField 
              label="ID" 
              text={radio.id}
              idName="radioID" 
              fieldName="radioID"
              deviceType={ObjectType.RADIO}
              deviceId={radio.id}
            />
            
            <ReadOnlyField 
              label="Firmware Version"
              text={radio.firmware === undefined || radio.firmware === -1 ? 
                '' : radio.firmware.toString()}
              idName="radioFirmware" 
              fieldName="firmware"
              deviceType={ObjectType.RADIO}
              deviceId={radio.id}
            />
            
            <SelectField 
              label="Channel"
              value={channelString}
              key={key}
              options={channelOptions}
              idName={key}
              className="radioChannel"
              fieldName="desiredChannel"
              objectType={ObjectType.RADIO}
              objectId={radio.id}
              onChangeAddActions={onRadioDesiredChannelChangedAddActions}
              transformValueToStore={transformChannelValueToStore}
              topStore={actualTopStore}
              undoManager={actualUndoManager}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RadioPanel; 