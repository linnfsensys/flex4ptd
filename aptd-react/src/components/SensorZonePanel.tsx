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
import '../infoPanels/InfoPanel.css';
import '../infoPanels/InfoPanelSensorZone.css';
import '../infoPanels/InfoPanelSensor.css';

// 传感器区域用途枚举
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

// 导入警告图标
const WarningIcon = require('../assets/icons/icons8-warning-96.png');
const ErrorAsteriskIcon = require('../assets/icons/icons8-asterisk-96.png');

/**
 * SensorZonePanel组件 - 使用Zustand hooks管理传感器区域
 * 这是InfoPanelSensorZone的Zustand版本
 */
const SensorZonePanel: React.FC<SensorZonePanelProps> = ({
  topStore,
  undoManager,
  webSocketManager
}) => {
  // 使用Zustand hooks获取状态
  const { selected } = useSelection();
  const { sensorZones, updateSensorZone, getSensorsInZone } = useSensorZones();
  const { mapSensors, updateSensor, getSensorBatteryStatus } = useSensors();
  const { ap, getSystemContext, getUnitType } = useAP();
  const { mmToInches, inchesToMm, isImperial } = useUnitConversion();
  
  // 获取选中的传感器区域ID
  const szId = selected && selected.selectedSzId ? selected.selectedSzId : null;
  
  // 获取选中的传感器区域
  const szModel = szId ? sensorZones[szId] : null;
  
  // 传感器区域用途选项
  const useOptions: Array<Option> = [
    {value: SensorZoneUse.STOPBAR, text: 'Stopbar'},
    {value: SensorZoneUse.COUNT, text: 'Count'},
    {value: SensorZoneUse.SPEED, text: 'Speed'},
  ];
  
  // 如果没有选中的传感器区域，显示空面板
  if (!szModel || !szId) {
    return (
      <div id="infoPanelSensorZone">
        <div id="infoPanelSensorZoneHeader" className="infoPanelHeader">Sensor Zone</div>
        <div>未选择传感器区域</div>
      </div>
    );
  }
  
  // 转换用途到服务器对象类型
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
  
  // 转换服务器对象类型到用途
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
  
  // 转换用途值到存储格式
  const transformValueToStore = (useValue: string) => {
    const newGUISensorZoneType: ServerObjectType = convertUseToOtype(useValue as SensorZoneUse);
    let szClient: any = {otype: newGUISensorZoneType};
    
    if (useValue === SensorZoneUse.STOPBAR) {
      const stopbarSensitivityVal = szModel.stopbarSensitivity !== undefined ? 
        szModel.stopbarSensitivity : 6; // 默认灵敏度值
      szClient.stopbarSensitivity = stopbarSensitivityVal;
    } else {
      szClient.stopbarSensitivity = undefined;
    }
    
    return szClient;
  };
  
  // 获取调整后的灵敏度值
  const getAdjustedSensitivity = (): number => {
    if (!szModel.stopbarSensitivity) {
      return 6; // 默认值
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
  
  // 检查是否存在otype错误
  const checkOtypeError = (): boolean => {
    if (!topStore) return false;
    
    const errorKey = `${ObjectType.SENSOR_ZONE}:${szId}:otype`;
    const validationErrors = topStore.getTopState().validationErrors || {};
    const errMsgs = validationErrors[errorKey];
    
    return errMsgs !== undefined && errMsgs.length > 0;
  };
  
  // 渲染全局错误
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
  
  // 渲染传感器全局错误
  const renderSensorGlobalErrors = (sensorId: string): React.ReactNode[] => {
    if (!topStore) return [];
    
    const result: React.ReactNode[] = [];
    const errorKey = `InfoPanel:${ObjectType.MAP_SENSOR}:${sensorId}`;
    const globalErrors = topStore.getTopState().validationGlobalErrors[errorKey];
    
    if (globalErrors !== undefined) {
      for (let errno = 0; errno < globalErrors.length; errno++) {
        if (errno > 0) {
          result.push(<br key={`br-${errno}`} />);
        }
        result.push(
          <span className="globalError" key={errno.toString()}>
            <img src={ErrorAsteriskIcon} width={17} alt="error" />
            {globalErrors[errno]}
          </span>
        );
      }
    }
    
    return result;
  };
  
  // 电池状态文本映射
  const batteryStatusText: {[key in BatteryStatus]: string} = {
    [BatteryStatus.GOOD]: 'Good',
    [BatteryStatus.REPLACE]: 'Replace',
    [BatteryStatus.UNKNOWN]: 'Unknown'
  };
  
  // 处理替换传感器
  const handleReplaceSensor = (sensorId: string) => {
    // 这里应该实现替换传感器的逻辑
    console.log(`替换传感器 ${sensorId}`);
    
    // 在实际应用中，这里应该显示一个模态框让用户输入替换传感器的ID
    // 然后更新状态
  };
  
  // 渲染传感器
  const renderSensors = () => {
    if (!szModel || !szModel.sensorIds || !szModel.sensorIds.length) {
      return null;
    }
    
    return szModel.sensorIds.map((sensorId, index) => {
      const sensorModel = mapSensors[sensorId];
      if (!sensorModel) return null;
      
      // 确定传感器位置文本
      let position = '';
      if (szModel.sensorIds.length > 1) {
        switch (index) {
          case 0:
            position = ' (Lead)';
            break;
          case 1:
            if (szModel.sensorIds.length === 2) {
              position = ' (Trail)';
            } else if (szModel.sensorIds.length === 3) {
              position = ' (Middle)';
            }
            break;
          case 2:
            position = ' (Trail)';
            break;
        }
      }
      
      const header = `Sensor ${sensorId}${position}`;
      const warning = `Sensor ${sensorId} is not reporting`;
      const objectType = sensorModel.info.location === Location.TRAY ? 
        ObjectType.TRAY_SENSOR : ObjectType.MAP_SENSOR;
      
      const batteryStatus = getSensorBatteryStatus(sensorId);
      const isUnheard = sensorModel.unheard || !sensorModel.seen;
      
      // 检查是否是停车检测区域
      const stopBarCheck = szModel.otype === 'GUIStopbarSensorZone';
      const systemContext = getSystemContext();
      
      return (
        <React.Fragment key={`sensor-${sensorId}`}>
          <div className="infoPanelSensor" data-sensorid={sensorId}>
            <div className="infoPanelSensorHeader infoPanelHeader">{header}</div>
            <div id="infoPanelSensorGlobalErrors" className="globalErrors">
              {renderSensorGlobalErrors(sensorId)}
            </div>
            
            {isUnheard && (
              <span id="infoPanelUnheardWarning">
                <img src={WarningIcon} width={17} alt="unheard" />
                {warning}
              </span>
            )}
            
            <RssiSlider
              id={sensorId}
              deviceModel={sensorModel}
              unseen={isUnheard}
              topStore={topStore}
            />
            
            <table className="sensorForm">
              <tbody>
                <ReadOnlyField 
                  key={`id64${sensorId}`} 
                  label="Factory ID"
                  idName={`id64${sensorId}`}
                  text={sensorModel.id64}
                  fieldName="id64" 
                  deviceType={objectType}
                  deviceId={sensorId}
                />
                
                <ReadOnlyField 
                  key={`firmware${sensorId}`} 
                  label="Software Version"
                  idName={`firmware${sensorId}`}
                  text={sensorModel.fwVer === undefined || sensorModel.fwVer === null ? 
                    '' : sensorModel.fwVer}
                  fieldName="fwVer" 
                  deviceType={objectType}
                  deviceId={sensorId}
                />
                
                <ReadOnlyField 
                  label="Battery Status"
                  text={batteryStatusText[batteryStatus]}
                  theClassName={batteryStatus === BatteryStatus.GOOD ? 'green' : 'red'}
                  idName="batteryStatusRof"
                  key="batteryStatus"
                  fieldName="batteryStatus"
                  deviceType={ObjectType.MAP_SENSOR}
                  deviceId={sensorId}
                />
                
                <InputField 
                  key={`ccExtension${sensorId}`} 
                  fieldName="ccExtension"
                  idName={`ccExtension${sensorId}`} 
                  label="Extension Time"
                  unit="msec" 
                  maxLength={5} 
                  objectId={sensorId}
                  objectType={objectType}
                  disabled={objectType === ObjectType.TRAY_SENSOR || 
                    ((systemContext === 'SCOOT' || systemContext === 'MOVA') && !stopBarCheck)}
                  text={sensorModel.ccExtension.toString()}
                  characterType={CharacterType.NONNEGATIVE_INTEGER}
                  transformValueToStore={(value) => ({ value: parseInt(value) })}
                  topStore={actualTopStore} 
                  undoManager={actualUndoManager}
                />
                
                <InputField 
                  key={`ccDelay${sensorId}`} 
                  fieldName="ccDelay"
                  idName={`ccDelay${sensorId}`} 
                  label="Delay Time"
                  unit="msec" 
                  maxLength={5} 
                  objectId={sensorId}
                  objectType={objectType}
                  disabled={objectType === ObjectType.TRAY_SENSOR}
                  text={sensorModel.ccDelay.toString()}
                  characterType={CharacterType.NONNEGATIVE_INTEGER}
                  transformValueToStore={(value) => ({ value: parseInt(value) })}
                  topStore={actualTopStore} 
                  undoManager={actualUndoManager}
                />
                
                <tr className="readOnlyField">
                  <td className="right">
                    <span className="buttonPane">
                      <AptdButton 
                        id={`replace${sensorId}`}
                        key={`replace${sensorId}`}
                        theClassName="replaceAnchor gray"
                        dataDotid={sensorId}
                        disabled={sensorModel.info.location === Location.TRAY || !sensorModel.configured}
                        onClick={() => handleReplaceSensor(sensorId)}
                        text="Replace this Sensor"
                        title=""
                      />
                    </span>
                  </td>
                  <td>
                    <input 
                      type="text"
                      value={sensorModel.replacementSensorId === '' || 
                        sensorModel.replacementSensorId === undefined ? 
                        '' : `(with ${sensorModel.replacementSensorId})`}
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
          
          {/* 如果不是最后一个传感器，添加间隔设置 */}
          {index < szModel.sensorIds.length - 1 && (
            <React.Fragment>
              <table key={`between${index}`} className="betweenSensors">
                <tbody>
                  {isImperial() ? (
                    <React.Fragment key={`spacings${index}`}>
                      {/* Imperial 版本 */}
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
                      {/* 公制版本 */}
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
  
  // 创建实际的TopStore和UndoManager实例
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