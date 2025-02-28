import React from 'react';
import { useMapDevices } from '../store/hooks';
import SelectField, { Option } from '../fields/SelectField';
import { ObjectType } from '../AptdClientTypes';
import { ColorCodeMode } from '../AptdServerTypes';
import RadioButtonGroupField from '../fields/RadioButtonGroupField';
import '../infoPanels/InfoPanel.css';
import '../infoPanels/InfoPanelAPInfo.css';
import TopStore from '../TopStore';
import UndoManager from '../UndoManager';

interface APPropertiesPanelProps {
  topStore: TopStore;
  undoManager: UndoManager;
}

/**
 * 网关属性设置面板组件 - Zustand版本
 * 对应原来的InfoPanelAPProperties组件
 * 提供颜色代码和系统上下文设置
 */
const APPropertiesPanel: React.FC<APPropertiesPanelProps> = ({ 
  topStore, 
  undoManager 
}) => {
  const { ap } = useMapDevices();
  
  // 系统上下文选项
  const systemContextOptions: Array<Option> = [
    { text: '默认', value: 'DEFAULT' },
    { text: 'SCOOT', value: 'SCOOT' },
    { text: 'MOVA', value: 'MOVA' },
  ];
  
  // 十六进制数字选项
  const HEX_NIBBLE_OPTIONS = [
    { text: '0', value: '0' },
    { text: '1', value: '1' },
    { text: '2', value: '2' },
    { text: '3', value: '3' },
    { text: '4', value: '4' },
    { text: '5', value: '5' },
    { text: '6', value: '6' },
    { text: '7', value: '7' },
    { text: '8', value: '8' },
    { text: '9', value: '9' },
    { text: 'A', value: 'A' },
    { text: 'B', value: 'B' },
    { text: 'C', value: 'C' },
    { text: 'D', value: 'D' },
    { text: 'E', value: 'E' },
    { text: 'F', value: 'F' },
  ];
  
  // 颜色代码高位选项
  const colorCodeHighOptions = HEX_NIBBLE_OPTIONS;
  
  // 颜色代码低位选项
  const colorCodeLowOptions = HEX_NIBBLE_OPTIONS;
  
  // 颜色代码模式选项
  const colorCodeModeOptions: Array<Option> = [
    { text: '自动', value: ColorCodeMode.AUTO },
    { text: '手动', value: ColorCodeMode.MANUAL },
  ];

  if (!ap) {
    return <div>加载中...</div>;
  }

  // 获取ap对象的属性，如果不存在则使用默认值
  const colorCodeMode = ap.colorCodeMode || ColorCodeMode.AUTO;
  const colorCodeHiNibbleManual = ap.colorCodeHiNibbleManual || '0';
  const colorCodeLoNibbleManual = ap.colorCodeLoNibbleManual || '0';
  const systemContext = ap.systemContext || 'DEFAULT';
  const mapImageIndex = ap.mapImageIndex !== undefined ? ap.mapImageIndex.toString() : '-1';

  return (
    <div id="infoAPProperties">
      <div id="apPropertiesForm">
        <table>
          <tbody>
            <tr>
              <td colSpan={2}>
                <h4>颜色代码</h4>
                <hr />
              </td>
            </tr>
            <RadioButtonGroupField 
              label="颜色代码模式" 
              idName="colorCodeMode" 
              fieldName="colorCodeMode"
              objectType={ObjectType.AP}
              objectId="AP"
              options={colorCodeModeOptions}
              value={colorCodeMode}
              topStore={topStore}
              undoManager={undoManager}
              className=""
              key="colorCodeMode"
            />
            
            {colorCodeMode === ColorCodeMode.MANUAL && (
              <>
                <SelectField 
                  label="颜色代码高位" 
                  idName="colorCodeHiNibbleManual" 
                  fieldName="colorCodeHiNibbleManual"
                  objectType={ObjectType.AP}
                  objectId="AP"
                  options={colorCodeHighOptions}
                  value={colorCodeHiNibbleManual}
                  topStore={topStore}
                  undoManager={undoManager}
                  className=""
                  key="colorCodeHiNibbleManual"
                />
                <SelectField 
                  label="颜色代码低位" 
                  idName="colorCodeLoNibbleManual" 
                  fieldName="colorCodeLoNibbleManual"
                  objectType={ObjectType.AP}
                  objectId="AP"
                  options={colorCodeLowOptions}
                  value={colorCodeLoNibbleManual}
                  topStore={topStore}
                  undoManager={undoManager}
                  className=""
                  key="colorCodeLoNibbleManual"
                />
              </>
            )}
            
            <tr>
              <td colSpan={2}>
                <h4>系统上下文</h4>
                <hr />
              </td>
            </tr>
            <SelectField 
              label="系统上下文" 
              idName="systemContext" 
              fieldName="systemContext"
              objectType={ObjectType.AP}
              objectId="AP"
              options={systemContextOptions}
              value={systemContext}
              topStore={topStore}
              undoManager={undoManager}
              className=""
              key="systemContext"
            />
            
            <tr>
              <td colSpan={2}>
                <h4>地图设置</h4>
                <hr />
              </td>
            </tr>
            <SelectField 
              label="地图图像" 
              idName="mapImageIndex" 
              fieldName="mapImageIndex"
              objectType={ObjectType.AP}
              objectId="AP"
              options={[
                { text: '无地图', value: '-1' },
                { text: '地图1', value: '0' },
                { text: '地图2', value: '1' },
                { text: '地图3', value: '2' },
                { text: '地图4', value: '3' },
              ]}
              value={mapImageIndex}
              topStore={topStore}
              undoManager={undoManager}
              className=""
              key="mapImageIndex"
            />
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default APPropertiesPanel; 