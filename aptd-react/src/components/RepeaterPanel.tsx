import React, { useState, useEffect } from 'react';
import { useSelection, useRepeaters, useAP } from '../store/hooks';
import { ObjectType, BatteryStatus } from '../AptdClientTypes';
import { ChannelMode, Location, getSNHardwareType } from '../AptdServerTypes';
import ReadOnlyField from '../fields/ReadOnlyField';
import SelectField, { Option } from '../fields/SelectField';
import CheckboxField from '../fields/CheckboxField';
import RadioButtonGroupField from '../fields/RadioButtonGroupField';
import RssiSlider from '../widgets/RssiSlider';
import AptdButton from '../AptdButton';
import TopStore from '../TopStore';
import UndoManager from '../UndoManager';
import WebSocketManager from '../WebSocketManager';
import '../infoPanels/InfoPanel.css';
import '../infoPanels/InfoPanelRepeater.css';

// 错误和警告图标
const ErrorAsteriskIcon: any = require('../assets/icons/icons8-asterisk-96.png');
const WarningIcon: any = require('../assets/icons/icons8-warning-96.png');

interface RepeaterPanelProps {
  topStore?: TopStore;
  undoManager?: UndoManager;
  webSocketManager?: WebSocketManager | null;
}

/**
 * RepeaterPanel组件 - 使用Zustand hooks管理中继器
 * 这是InfoPanelRepeater的Zustand版本
 */
const RepeaterPanel: React.FC<RepeaterPanelProps> = ({ 
  topStore,
  undoManager,
  webSocketManager
}) => {
  // 使用Zustand hooks获取状态和操作
  const { mapRepeaters, updateRepeater, getRepeater, getRepeaterBatteryStatus, 
          getRepeaterBrandName, disableDisallowedOptions, transformDownstreamChannelValueToStore,
          calcDesiredUpstreamChannel } = useRepeaters();
  const { ap } = useAP();
  const { selected } = useSelection();
  
  // 本地状态
  const [selectedRepeater, setSelectedRepeater] = useState<string | null>(null);
  const [desiredDownstreamChannel, setDesiredDownstreamChannel] = useState<string>('AUTO');
  
  // 通道选项
  const autoValue = 'AUTO';
  const allChannelOptions: Array<Option> = [
    {value: autoValue, text: 'Auto'},
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
  
  // 天线选项
  const downstreamAntennaOptions: Array<Option> = [
    {value: 'INTERNAL', text: 'Internal'},
    {value: 'EXTERNAL', text: 'External'},
  ];
  
  // 电池状态选项
  const batteryStatusOptions: Array<Option> = [
    {value: 'GOOD', text: 'Good'},
    {value: 'REPLACE', text: 'Replace Device!'},
  ];
  
  // 电池状态文本映射
  const batteryUserViewByBatteryStatus: {[key in BatteryStatus]: string} = {
    [BatteryStatus.GOOD]: 'Good',
    [BatteryStatus.REPLACE]: 'Replace Device!',
    [BatteryStatus.UNKNOWN]: ''
  };
  
  // 当选择变化时更新本地状态
  useEffect(() => {
    if (selected && selected.selectedDeviceType === ObjectType.MAP_REPEATER) {
      setSelectedRepeater(selected.selectedDotid);
      const repeater = getRepeater(selected.selectedDotid);
      if (repeater) {
        setDesiredDownstreamChannel(
          repeater.channelMode === ChannelMode.AUTO || repeater.desiredDownstreamChannel === '-1' 
            ? ChannelMode.AUTO 
            : repeater.desiredDownstreamChannel
        );
      }
    } else {
      setSelectedRepeater(null);
    }
  }, [selected, getRepeater]);
  
  // 如果没有选中的中继器，显示空面板
  if (!selectedRepeater || !mapRepeaters[selectedRepeater]) {
    return (
      <div id="infoPanelRepeater">
        <div id="infoPanelRepeaterHeader" className="infoPanelHeader">Repeater</div>
        <div>No repeater selected</div>
      </div>
    );
  }
  
  const repeaterModel = mapRepeaters[selectedRepeater];
  
  // 计算下游通道字符串
  const downstreamChannelString = (repeaterModel.channelMode === ChannelMode.AUTO ||
    repeaterModel.desiredDownstreamChannel === '-1') ?
    ChannelMode.AUTO : repeaterModel.desiredDownstreamChannel;
  
  // 计算上游通道
  const desiredUpstreamChannel = calcDesiredUpstreamChannel(selectedRepeater);
  
  // 确定设备类型
  let deviceType = ObjectType.MAP_REPEATER;
  if (repeaterModel.info.location === Location.TRAY) {
    deviceType = ObjectType.TRAY_REPEATER;
  }
  
  // 获取硬件版本信息
  let hwVersionNumber: number = repeaterModel.hwVersion;
  let hwEnum: string = getSNHardwareType(hwVersionNumber);
  let hwVersion: string = getRepeaterBrandName(hwEnum);
  if (hwVersionNumber === -1 || hwVersionNumber === 0 || hwVersion === null) {
    hwVersion = "";
  }
  
  // 获取软件版本信息
  let swVersionNumber = repeaterModel.swVersion;
  let swVersion: string = repeaterModel.swVersion.toString();
  if (swVersionNumber === -1 || swVersionNumber === 0) {
    swVersion = "";
  }
  
  // 获取通道选项
  let channelOptions = allChannelOptions;
  if (repeaterModel.info.location !== Location.TRAY) {
    channelOptions = disableDisallowedOptions(selectedRepeater, allChannelOptions);
  }
  
  // 获取电池状态
  const batteryStatus: BatteryStatus = getRepeaterBatteryStatus(selectedRepeater);
  
  // 渲染全局错误
  const renderGlobalErrors = () => {
    const result: React.ReactNode[] = [];
    if (!selectedRepeater) return result;
    
    const errorKey = `${ObjectType.MAP_REPEATER}-${selectedRepeater}`;
    const globalErrors = topStore?.getTopState().validationGlobalErrors[errorKey] || [];
    
    globalErrors.forEach((error, index) => {
      result.push(
        <span className="globalError" key={index}>
          <img src={ErrorAsteriskIcon} width={17} alt="error" />
          {error}
        </span>
      );
    });
    
    return result;
  };
  
  // 处理替换中继器
  const handleReplaceRepeater = () => {
    if (!selectedRepeater) return;
    
    // 在实际应用中，这里应该显示一个模态框让用户输入替换中继器的ID
    console.log(`替换中继器 ${selectedRepeater}`);
  };
  
  // 创建实际的TopStore和UndoManager实例
  const actualTopStore = topStore || {
    getTopState: () => ({
      mapRepeaters,
      ap,
      validationGlobalErrors: {}
    }),
    showModal: () => {},
    dismissModal: () => {}
  } as unknown as TopStore;
  
  const actualUndoManager = undoManager || {} as UndoManager;
  
  return (
    <div id="infoPanelRepeater">
      <div id="infoPanelRepeaterHeader" className="infoPanelHeader">
        Repeater {selectedRepeater}
      </div>
      
      <div id="infoPanelRepeaterGlobalErrors" className="globalErrors">
        {renderGlobalErrors()}
      </div>
      
      {(repeaterModel.unheard || !repeaterModel.seen) && (
        <span id="infoPanelUnheardWarning">
          <img src={WarningIcon} width={17} alt="unheard" />
          Repeater {selectedRepeater} is not reporting
        </span>
      )}
      
      <RssiSlider
        id={selectedRepeater}
        deviceModel={repeaterModel}
        unseen={repeaterModel.unheard || !repeaterModel.seen}
        topStore={actualTopStore}
      />
      
      <div id="repeaterForm">
        <table>
          <tbody>
            <tr><td><b/></td><td></td></tr>
            
            <ReadOnlyField 
              label="Factory ID"
              text={repeaterModel.id64}
              idName="repeaterID64"
              fieldName="id64"
              deviceType={deviceType}
              deviceId={selectedRepeater}
            />
            
            <ReadOnlyField 
              label="Upstream Channel"
              text={desiredUpstreamChannel}
              key={`repeaterUpstreamChannel_${selectedRepeater}`}
              idName={`repeaterUpstreamChannel_${selectedRepeater}`}
              fieldName="upstreamChannel"
              deviceType={deviceType}
              deviceId={selectedRepeater}
            />
            
            <SelectField 
              label="Downstream Channel"
              value={downstreamChannelString}
              key={`repeaterChannel_${selectedRepeater}`}
              options={channelOptions}
              idName={`repeaterChannel_${selectedRepeater}`}
              className="repeaterDownstreamChannel"
              fieldName="desiredDownstreamChannel"
              objectType={deviceType}
              disabled={deviceType === ObjectType.TRAY_REPEATER}
              objectId={selectedRepeater}
              transformValueToStore={transformDownstreamChannelValueToStore}
              topStore={actualTopStore}
              undoManager={actualUndoManager}
            />
            
            <ReadOnlyField 
              label="Hardware Version"
              text={hwVersion}
              key={`repeaterHwVersion_${selectedRepeater}`}
              idName={`repeaterHwVersion_${selectedRepeater}`}
              fieldName="hwVersion"
              deviceType={deviceType}
              deviceId={selectedRepeater}
            />
            
            <ReadOnlyField 
              label="Software Version"
              text={repeaterModel.fwVer === undefined || repeaterModel.fwVer === null ? '' : repeaterModel.fwVer}
              key={`repeaterSwVersion_${selectedRepeater}`}
              idName={`repeaterSwVersion_${selectedRepeater}`}
              fieldName="fwVer"
              deviceType={deviceType}
              deviceId={selectedRepeater}
            />
            
            <ReadOnlyField 
              label="Battery Status"
              text={batteryUserViewByBatteryStatus[batteryStatus]}
              theClassName={batteryStatus === BatteryStatus.GOOD ? 'green' : 'red'}
              idName="batteryStatusRof"
              key="batteryStatus"
              fieldName="batteryStatus"
              deviceType={ObjectType.MAP_REPEATER}
              deviceId={selectedRepeater}
            />
            
            <tr className="readOnlyField">
              <td className="right">
                <span className="buttonPane">
                  <AptdButton
                    id={`replace${selectedRepeater}`}
                    key={`replace${selectedRepeater}`}
                    theClassName="replaceAnchor gray"
                    dataDotid={selectedRepeater}
                    disabled={repeaterModel.info.location === Location.TRAY || !repeaterModel.configured}
                    onClick={handleReplaceRepeater}
                    text="Replace this Repeater"
                    title=""
                  />
                </span>
              </td>
              <td>
                <input 
                  id="replacementInfo" 
                  type="text"
                  value={repeaterModel.replacementRepeaterId === '' || repeaterModel.replacementRepeaterId === undefined ? 
                    '' : 
                    `(with ${repeaterModel.replacementRepeaterId})`
                  }
                  className="cell readOnlyInput"
                  readOnly={true}
                  disabled={true}
                />
              </td>
            </tr>
            
            <tr>
              <td colSpan={2}>
                <br/>
                <h4>Antenna(s)</h4>
                <hr/>
              </td>
            </tr>
            
            <CheckboxField 
              label="Dual Antennas"
              idName="dualAntennasCB"
              key="dualAntennasCB"
              fieldName="dualAntenna"
              value={repeaterModel.dualAntenna}
              objectType={ObjectType.MAP_REPEATER}
              objectId={selectedRepeater}
              disabled={true}
              className="cell readOnlyInput"
              topStore={actualTopStore}
              undoManager={actualUndoManager}
            />
            
            <RadioButtonGroupField 
              label="Downstream Antenna"
              disabled={deviceType === ObjectType.TRAY_REPEATER || !repeaterModel.dualAntenna}
              value={repeaterModel.downstreamAntenna}
              idName="downstreamAntennaRbg"
              key="downstreamAntennaRbg"
              className="downstreamAntennaRbg"
              fieldName="downstreamAntenna"
              options={downstreamAntennaOptions}
              objectType={ObjectType.MAP_REPEATER}
              objectId={selectedRepeater}
              topStore={actualTopStore}
              undoManager={actualUndoManager}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RepeaterPanel; 