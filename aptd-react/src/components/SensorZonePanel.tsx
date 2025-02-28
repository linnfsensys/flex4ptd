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
  
  // 渲染传感器
  const renderSensors = () => {
    if (!szModel || !szModel.sensorIds || !szModel.sensorIds.length) {
      return null;
    }
    
    return szModel.sensorIds.map((sensorId, index) => {
      // 创建实际的TopStore和UndoManager实例
      const actualTopStore = topStore || {} as TopStore;
      const actualUndoManager = undoManager || {} as UndoManager;
      
      return (
        <React.Fragment key={`sensor-${sensorId}`}>
          {/* 使用SensorPanel组件渲染传感器信息 */}
          <SensorPanel
            topStore={actualTopStore}
            undoManager={actualUndoManager}
            webSocketManager={webSocketManager}
            indexInSz={index}
            nSensorsInSz={szModel.sensorIds.length}
            sensorId={sensorId}
          />
          
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