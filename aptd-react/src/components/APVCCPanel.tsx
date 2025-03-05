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
 * AP virtual CC settings panel component - Zustand version
 * corresponds to the original InfoPanelAPVCC component
 * provides virtual CC type and APGI report type settings
 */
const APVCCPanel: React.FC<APVCCPanelProps> = ({ 
  topStore, 
  undoManager 
}) => {
  const { ap, ccCards } = useMapDevices();
  
  // virtual CC type options
  const vccOptions: Array<Option> = [
    { text: 'None', value: VirtualCcType.NONE },
    { text: 'STS', value: VirtualCcType.STS },
    { text: 'APGI', value: VirtualCcType.APGI },
  ];

  // handle virtual CC type change
  const handleVirtualCcTypeChange = useCallback((value: string) => {
    // if APGI type is selected, but APGI report type is not configured, set the default value
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

  // APGI report type options
  const apgiReportTypeOptions: Array<Option> = [
    { text: '已映射', value: APGIReportType.MAPPED },
    { text: '已配置', value: APGIReportType.CONFIGURED },
    { text: '全部', value: APGIReportType.ALL }
  ];

  if (!ap) {
    return <div>加载中...</div>;
  }

  // check if there is an APGI card
  const apgi = Object.values(ccCards).find(card => 
    card.cardInterface === Interface.APGI
  );

  return (
    <div className="info-panel-content">
      <table className="info-panel-table">
        <tbody>
          <tr>
            <td colSpan={2} className="info-panel-section-header">Virtual CC Settings</td>
          </tr>
          
          <SelectField
            label="Virtual CC Type"
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
              label="APGI Report Type"
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
              text="STS virtual CC channels will be configured in the STS configuration panel." 
              idName="stsNote"
            />
          )}
          
          {(ap as any).virtualCcType === VirtualCcType.APGI && (
            <Note 
              text="APGI virtual CC channels will be configured in the APGI configuration panel." 
              idName="apgiNote"
            />
          )}
          
          {Object.values(ccCards).length === 0 && (ap as any).virtualCcType !== VirtualCcType.NONE && (
            <Note 
              text="Warning: No CC cards detected. Virtual CC functionality requires at least one CC card." 
              idName="noCardNote"
            />
          )}
          
          {apgi && (ap as any).virtualCcType === VirtualCcType.APGI && (
            <tr>
              <td colSpan={2}>
                <div className="info-panel-subsection">
                  <h5>APGI Channels</h5>
                  <p>APGI channels will be displayed in the APGI configuration panel.</p>
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