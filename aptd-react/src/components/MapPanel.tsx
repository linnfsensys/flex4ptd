import React, { useEffect, useRef } from 'react';
import { useMapSettings, useActions, useAppState, useMapDevices, useAP } from '../store/hooks';
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
import MapAndTrayPanel from './MapAndTrayPanel';

interface MapPanelProps {
  topStore?: TopStore;
  webSocketManager?: WebSocketManager | null;
  httpManager?: HttpManager | null;
  mapImagesManager?: MapImagesManager | null;
  undoManager?: UndoManager;
}

/**
 * MapPanel component - using Zustand hooks to manage map settings
 * this is the Zustand version of InfoPanelMap
 */
const MapPanel: React.FC<MapPanelProps> = ({ 
  topStore,
  webSocketManager = null,
  httpManager = null,
  mapImagesManager = null,
  undoManager
}) => {
  // use Zustand hooks to get the state and actions
  const { mapSettings, updateMapSettings } = useMapSettings();
  const { dispatch } = useActions();
  const { disabled } = useAppState();
  const { ap } = useAP();
  
  // use ref to save the latest mapSettings value, so it can be accessed in the callback
  const mapSettingsRef = useRef(mapSettings);
  
  // update the ref value
  useEffect(() => {
    mapSettingsRef.current = mapSettings;
  }, [mapSettings]);

  // handle the add text field operation
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
      text: 'New Text',
      position: { x: 100, y: 100 },
      rotationDegrees: 0,
      editText: 'New Text'
    };

    const newTextFieldId = `${textFieldString}${nextTextFieldId}`;
    currentTextFields[newTextFieldId] = newTextField;

    // use updateMapSettings to update the map settings
    updateMapSettings({
      textFields: currentTextFields
    });
  };

  // handle the checkbox change
  const handleCheckboxChange = (checked: boolean, name: string) => {
    // use updateMapSettings to update the map settings
    updateMapSettings({
      [name]: checked
    });
  };

  // create the actual TopStore instance (if needed)
  const actualTopStore = topStore || {
    getTopState: () => ({
      ap,
      mapSettings
    }),
    dispatch: dispatch
  } as unknown as TopStore;
  
  // create the actual UndoManager instance (if needed)
  const actualUndoManager = undoManager || (topStore && topStore.undoManager) || {} as UndoManager;
  
  const actualHttpManager = httpManager || {} as HttpManager;
  const actualMapImagesManager = mapImagesManager || {} as MapImagesManager;

  return (
    <div className="map-panel-container">
      {/* add MapAndTrayPanel component */}
      <div className="map-and-tray-container" style={{ height: '600px', marginBottom: '20px' }}>
        <MapAndTrayPanel 
          topStore={topStore}
          undoManager={undoManager}
          mapImagesManager={mapImagesManager}
          mapCabinetTrayWidth={800}
          mapCabinetTrayHeight={600}
          trayHeight={150}
          mapHeight={450}
        />
      </div>
      
      {/* map settings panel */}
      <div id="infoPanelMap">
        <div id="infoPanelMapHeader" className="infoPanelHeader">Map Settings</div>
        
        {/* add TimeZoneUnitsMapDisplay component */}
        <TimeZoneUnitsMapDisplay 
          mapChooserRowSize={3}
          mapVerbiage="Background Map"
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
                  <h4>Map Features</h4>
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
                    Show RF Links&nbsp;
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
                    Show CC Links&nbsp;
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
                    Show Legend&nbsp;
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
                    Show Cabinet Icon&nbsp;
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
                      title="Create a text box on the map"
                      theClassName="textBox gray"
                      text="Add Text Field"
                      onClick={handleAddTextField}
                      disabled={disabled}
                    />
                    <span>
                      Click this button to add a text box to the map
                    </span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MapPanel; 