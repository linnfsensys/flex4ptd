import React, { useCallback } from 'react';
import { useMapDevices } from '../store/hooks';
import SelectField, { Option } from '../fields/SelectField';
import { ObjectType, UpdateType, ActionGroup } from '../AptdClientTypes';
import { APGIReportType, VirtualCcType, GUIAPConfig, Interface } from '../AptdServerTypes';
import Note from '../fields/Note';
import '../infoPanels/InfoPanel.css';
import TopStore from '../TopStore';
import UndoManager from '../UndoManager';

interface APVCCPanelProps {
  topStore: TopStore;
  undoManager: UndoManager;
}

/**
 * 网关虚拟CC设置面板组件 - Zustand版本
 * 对应原来的InfoPanelAPVCC组件
 * 提供虚拟CC类型和APGI报告类型设置
 */
const APVCCPanel: React.FC<APVCCPanelProps> = ({ 
  topStore, 
  undoManager 
}) => {
  const { ap, ccCards } = useMapDevices();
  
  // 虚拟CC类型选项
  const vccOptions: Array<Option> = [
    { text: '无', value: VirtualCcType.NONE },
    { text: 'STS', value: VirtualCcType.STS },
    { text: 'APGI', value: VirtualCcType.APGI },
  ];

  // 处理虚拟CC类型变更
  const handleVirtualCcTypeChange = useCallback((value: string) => {
    // 如果选择了APGI类型，但没有配置APGI报告类型，则设置默认值
    if (value === VirtualCcType.APGI && (ap as any).apgiReportType === undefined) {
      const actionGroup: ActionGroup = {
        description: 'Set APGI Report Type',
        actions: [{
          objectType: ObjectType.AP,
          objectId: 'ap',
          updateType: UpdateType.UPDATE,
          newData: {
            apgiReportType: APGIReportType.MAPPED
          }
        }]
      };
      topStore.enact(actionGroup);
    }
  }, [ap, topStore]);

  // APGI报告类型选项
  const apgiReportTypeOptions: Array<Option> = [
    { text: '已映射', value: APGIReportType.MAPPED },
    { text: '已配置', value: APGIReportType.CONFIGURED },
    { text: '全部', value: APGIReportType.ALL }
  ];

  if (!ap) {
    return <div>加载中...</div>;
  }

  // 检查是否有APGI卡
  const apgi = Object.values(ccCards).find(card => 
    card.cardInterface === Interface.APGI
  );

  return (
    <div className="info-panel-content">
      <table className="info-panel-table">
        <tbody>
          <tr>
            <td colSpan={2} className="info-panel-section-header">虚拟CC设置</td>
          </tr>
          
          <SelectField
            label="虚拟CC类型"
            idName="virtualCcType"
            fieldName="virtualCcType"
            objectType={ObjectType.AP}
            objectId="ap"
            options={vccOptions}
            value={(ap as any).virtualCcType || VirtualCcType.NONE}
            topStore={topStore}
            undoManager={undoManager}
            className="info-panel-select"
            key="virtualCcType"
            onValueChanged={handleVirtualCcTypeChange}
          />
          
          {(ap as any).virtualCcType === VirtualCcType.APGI && (
            <SelectField
              label="APGI报告类型"
              idName="apgiReportType"
              fieldName="apgiReportType"
              objectType={ObjectType.AP}
              objectId="ap"
              options={apgiReportTypeOptions}
              value={(ap as any).apgiReportType || APGIReportType.MAPPED}
              topStore={topStore}
              undoManager={undoManager}
              className="info-panel-select"
              key="apgiReportType"
            />
          )}
          
          {(ap as any).virtualCcType === VirtualCcType.STS && (
            <Note 
              text="STS虚拟CC通道将在STS配置面板中配置。" 
              idName="stsNote"
            />
          )}
          
          {(ap as any).virtualCcType === VirtualCcType.APGI && (
            <Note 
              text="APGI虚拟CC通道将在APGI配置面板中配置。" 
              idName="apgiNote"
            />
          )}
          
          {Object.values(ccCards).length === 0 && (ap as any).virtualCcType !== VirtualCcType.NONE && (
            <Note 
              text="警告：没有检测到CC卡。虚拟CC功能需要至少一张CC卡。" 
              idName="noCardNote"
            />
          )}
          
          {apgi && (ap as any).virtualCcType === VirtualCcType.APGI && (
            <tr>
              <td colSpan={2}>
                <div className="info-panel-subsection">
                  <h5>APGI通道</h5>
                  <p>APGI通道将在APGI配置面板中显示。</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default APVCCPanel; 