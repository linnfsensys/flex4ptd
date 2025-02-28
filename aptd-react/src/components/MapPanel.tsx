import React, { useEffect, useRef } from 'react';
import { useMapSettings, useActions, useAppState, useMapDevices } from '../store/hooks';
import CheckboxField from './CheckboxField';
import AptdButton from '../AptdButton';
import { TextField, ObjectType, UpdateType } from '../AptdClientTypes';
import cloneDeep from 'lodash/cloneDeep';
import TimeZoneUnitsMapDisplay from '../TimeZoneUnitsMapDisplay';
import '../infoPanels/InfoPanel.css';
import '../infoPanels/InfoPanelMap.css';
import TopStore from '../TopStore';
import UndoManager from '../UndoManager';
import HttpManager from '../HttpManager';
import MapImagesManager from '../MapImagesManager';
import WebSocketManager from '../WebSocketManager';

interface MapPanelProps {
  topStore?: TopStore;
  webSocketManager?: WebSocketManager | null;
  httpManager?: HttpManager | null;
  mapImagesManager?: MapImagesManager | null;
}

/**
 * MapPanel组件 - 使用Zustand hooks管理地图设置
 * 这是InfoPanelMap的Zustand版本
 */
const MapPanel: React.FC<MapPanelProps> = ({ 
  topStore,
  webSocketManager = null,
  httpManager = null,
  mapImagesManager = null
}) => {
  // 使用Zustand hooks获取状态和操作
  const { mapSettings, updateMapSettings } = useMapSettings();
  const { dispatch } = useActions();
  const { disabled } = useAppState();
  const { ap } = useMapDevices();
  
  // 使用ref保存最新的mapSettings值，以便在回调中访问
  const mapSettingsRef = useRef(mapSettings);
  
  // 更新ref值
  useEffect(() => {
    mapSettingsRef.current = mapSettings;
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
    // 使用updateMapSettings更新地图设置
    updateMapSettings({
      [name]: checked
    });
  };

  // 使用传入的实例或创建模拟实例
  const actualTopStore = topStore || {
    getTopState: () => ({
      ap,
      mapSettings
    }),
    dispatch: dispatch
  } as unknown as TopStore;
  
  const actualUndoManager = (topStore && topStore.undoManager) || {} as UndoManager;
  const actualHttpManager = httpManager || {} as HttpManager;
  const actualMapImagesManager = mapImagesManager || {} as MapImagesManager;

  return (
    <div id="infoPanelMap">
      <div id="infoPanelMapHeader" className="infoPanelHeader">地图设置</div>
      
      {/* 添加 TimeZoneUnitsMapDisplay 组件 */}
      <TimeZoneUnitsMapDisplay 
        mapChooserRowSize={3}
        mapVerbiage="背景地图"
        apModel={ap}
        initialization={false}
        topStore={actualTopStore}
        undoManager={actualUndoManager}
        httpManager={actualHttpManager}
        mapImagesManager={actualMapImagesManager}
      />
      
      <div>
        <table>
          <tbody>
            <tr><td><b/></td><td></td></tr>
            <tr>
              <td colSpan={2}>
                <h4>地图功能</h4>
                <hr/>
              </td>
            </tr>
            <tr className="checkboxField row showRFLinks">
              <td className="cell right">
                <input 
                  type="checkbox" 
                  className="left" 
                  id="showRFLinks" 
                  checked={mapSettings.showRFLinks || false}
                  onChange={(e) => handleCheckboxChange(e.target.checked, 'showRFLinks')}
                  disabled={disabled}
                />
              </td>
              <td className="left">
                <label htmlFor="showRFLinks" className="cell checkboxFieldLabel left">
                  显示RF连接&nbsp;
                </label>
              </td>
            </tr>
            <tr className="checkboxField row showCCLinks">
              <td className="cell right">
                <input 
                  type="checkbox" 
                  className="left" 
                  id="showCCLinks" 
                  checked={mapSettings.showCCLinks || false}
                  onChange={(e) => handleCheckboxChange(e.target.checked, 'showCCLinks')}
                  disabled={disabled}
                />
              </td>
              <td className="left">
                <label htmlFor="showCCLinks" className="cell checkboxFieldLabel left">
                  显示CC连接&nbsp;
                </label>
              </td>
            </tr>
            <tr className="checkboxField row showLegend">
              <td className="cell right">
                <input 
                  type="checkbox" 
                  className="left" 
                  id="showLegend" 
                  checked={mapSettings.showLegend || false}
                  onChange={(e) => handleCheckboxChange(e.target.checked, 'showLegend')}
                  disabled={disabled}
                />
              </td>
              <td className="left">
                <label htmlFor="showLegend" className="cell checkboxFieldLabel left">
                  显示图例&nbsp;
                </label>
              </td>
            </tr>
            <tr className="checkboxField row showCabinetIcon">
              <td className="cell right">
                <input 
                  type="checkbox" 
                  className="left" 
                  id="showCabinetIcon" 
                  checked={mapSettings.showCabinetIcon || false}
                  onChange={(e) => handleCheckboxChange(e.target.checked, 'showCabinetIcon')}
                  disabled={disabled}
                />
              </td>
              <td className="left">
                <label htmlFor="showCabinetIcon" className="cell checkboxFieldLabel left">
                  显示机柜图标&nbsp;
                </label>
              </td>
            </tr>
          </tbody>
        </table>
        <table>
          <tbody>
            <tr><td><b/></td><td></td></tr>
            <tr>
              <td className="textBox">
                <span id="textButtonAndNote" className="buttonPane">
                  <AptdButton 
                    id="textButtonId"
                    title="在地图上创建文本框"
                    theClassName="textBox gray"
                    text="添加文本字段"
                    onClick={handleAddTextField}
                    disabled={disabled}
                  />
                  <span>
                    点击此按钮向地图添加文本框
                  </span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MapPanel; 