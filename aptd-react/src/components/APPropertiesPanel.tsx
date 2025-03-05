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
 * gateway properties settings panel component - Zustand version
 * corresponding to the original InfoPanelAPProperties component
 * provides color code and system context settings
 */
const APPropertiesPanel: React.FC<APPropertiesPanelProps> = ({ 
  topStore, 
  undoManager 
}) => {
  const { ap } = useMapDevices();
  
  // system context options
  const systemContextOptions: Array<Option> = [
    { text: 'Default', value: 'DEFAULT' },
    { text: 'SCOOT', value: 'SCOOT' },
    { text: 'MOVA', value: 'MOVA' },
  ];
  
  // hexadecimal digit options
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
  
  // color code high options
  const colorCodeHighOptions = HEX_NIBBLE_OPTIONS;
  
  // color code low options
  const colorCodeLowOptions = HEX_NIBBLE_OPTIONS;
  
  // color code mode options
  const colorCodeModeOptions: Array<Option> = [
    { text: 'Auto', value: ColorCodeMode.AUTO },
    { text: 'Manual', value: ColorCodeMode.MANUAL },
  ];

  if (!ap) {
    return <div>Loading...</div>;
  }

  // get the properties of the ap object, use the default value if it does not exist
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
                <h4>Color Code</h4>
                <hr />
              </td>
            </tr>
            <RadioButtonGroupField 
              label="Color Code Mode" 
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
                  label="Color Code High Nibble" 
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
                  label="Color Code Low Nibble" 
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
                <h4>System Context</h4>
                <hr />
              </td>
            </tr>
            <SelectField 
              label="System Context" 
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
                <h4>Map Settings</h4>
                <hr />
              </td>
            </tr>
            <SelectField 
              label="Map Image" 
              idName="mapImageIndex" 
              fieldName="mapImageIndex"
              objectType={ObjectType.AP}
              objectId="AP"
              options={[
                { text: 'No Map', value: '-1' },
                { text: 'Map 1', value: '0' },
                { text: 'Map 2', value: '1' },
                { text: 'Map 3', value: '2' },
                { text: 'Map 4', value: '3' },
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