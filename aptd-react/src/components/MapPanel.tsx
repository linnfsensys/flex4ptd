import React, { useEffect, useRef } from 'react';
import { useMapSettings, useActions, useAppState } from '../store/hooks';
import CheckboxField from './CheckboxField';
import AptdButton from '../AptdButton';
import { TextField, ObjectType, UpdateType } from '../AptdClientTypes';
import cloneDeep from 'lodash/cloneDeep';

/**
 * MapPanel组件 - 使用Zustand hooks管理地图设置
 * 这是InfoPanelMap的Zustand版本
 */
const MapPanel: React.FC = () => {
  // 使用Zustand hooks获取状态和操作
  const { mapSettings, updateMapSettings } = useMapSettings();
  const { dispatch } = useActions();
  const { disabled } = useAppState();
  
  // 使用ref保存最新的mapSettings值，以便在回调中访问
  const mapSettingsRef = useRef(mapSettings);
  
  // 更新ref值
  useEffect(() => {
    mapSettingsRef.current = mapSettings;
    console.log('MapPanel: mapSettings更新', mapSettings);
  }, [mapSettings]);

  // 处理添加文本字段的操作
  const handleAddTextField = () => {
    let currentTextFields: {[id:string]: TextField} = 
      cloneDeep(mapSettings.textFields || {});
    let currentTextFieldKeys: string[] = [];
    let nextTextFieldId = 0;
    const textFieldString = "textField";
    
    if (currentTextFields !== undefined) {
      currentTextFieldKeys = Object.keys(currentTextFields);
      if (currentTextFieldKeys.length > 0) {
        const lastTextFieldId: number = Number(
          currentTextFieldKeys[currentTextFieldKeys.length - 1].substr(textFieldString.length)
        );
        nextTextFieldId = lastTextFieldId + 1;
        if (nextTextFieldId === null || nextTextFieldId === undefined) {
          nextTextFieldId = 0;
        }
      }
    } else {
      console.error('textFields undefined');
      return;
    }

    const newTextField: TextField = {
      text: '新文本',
      position: { x: 100, y: 100 },
      rotationDegrees: 0,
      editText: '新文本'
    };

    const newTextFieldId = `${textFieldString}${nextTextFieldId}`;
    currentTextFields[newTextFieldId] = newTextField;

    // 使用updateMapSettings更新地图设置
    updateMapSettings({
      textFields: currentTextFields
    });
  };

  // 处理复选框变化
  const handleCheckboxChange = (checked: boolean, name: string) => {
    console.log(`更改${name}为${checked}`);
    // 使用updateMapSettings更新地图设置
    updateMapSettings({
      [name]: checked
    });
    
    // 添加调试信息
    setTimeout(() => {
      // 使用ref访问最新的mapSettings，而不是调用hook
      console.log(`更新后的${name}值:`, mapSettingsRef.current[name]);
    }, 100);
  };

  return (
    <div className="info-panel-map">
      <h3>地图设置</h3>
      
      <div className="map-settings-section">
        <h4>显示选项</h4>
        <CheckboxField
          label="显示RF链接"
          checked={mapSettings.showRFLinks || false}
          onChange={(checked: boolean) => handleCheckboxChange(checked, 'showRFLinks')}
          disabled={disabled}
        />
        <CheckboxField
          label="显示CC链接"
          checked={mapSettings.showCCLinks || false}
          onChange={(checked: boolean) => handleCheckboxChange(checked, 'showCCLinks')}
          disabled={disabled}
        />
        <CheckboxField
          label="显示图例"
          checked={mapSettings.showLegend || false}
          onChange={(checked: boolean) => handleCheckboxChange(checked, 'showLegend')}
          disabled={disabled}
        />
      </div>
      
      <div className="map-settings-section">
        <h4>文本字段</h4>
        <div>
          <AptdButton
            id="addTextFieldButton"
            text="添加文本字段"
            title="添加新的文本字段到地图"
            onClick={handleAddTextField}
            disabled={disabled}
          />
        </div>
        <div>
          {mapSettings.textFields && Object.keys(mapSettings.textFields).length > 0 ? (
            <p>文本字段数量: {Object.keys(mapSettings.textFields).length}</p>
          ) : (
            <p>没有文本字段</p>
          )}
        </div>
      </div>
      
      {/* 显示当前设置状态 */}
      <div className="map-settings-debug">
        <h4>当前设置状态</h4>
        <p>显示RF链接: {mapSettings.showRFLinks ? '是' : '否'}</p>
        <p>显示CC链接: {mapSettings.showCCLinks ? '是' : '否'}</p>
        <p>显示图例: {mapSettings.showLegend ? '是' : '否'}</p>
      </div>
    </div>
  );
};

export default MapPanel; 