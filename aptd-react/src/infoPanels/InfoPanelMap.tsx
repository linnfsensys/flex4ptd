import * as React from 'react';
import './InfoPanel.css';
import cloneDeep from 'lodash/cloneDeep';
import {GUIAPConfigClient, MapSettings, TextField, ObjectType, EnactType, UpdateType, Action, Selected} from "../AptdClientTypes";
import TopStore from "../TopStore";
import UndoManager from "../UndoManager";
import CheckboxField from "../fields/CheckboxField";
import TimeZoneUnitsMapDisplay from "../TimeZoneUnitsMapDisplay";
import HttpManager from "../HttpManager";
import MapImagesManager from "../MapImagesManager";
import AptdButton from "../AptdButton";
import './InfoPanelMap.css';

interface InfoPanelMapProps {
    apModel: GUIAPConfigClient | null,
    mapModel: MapSettings,
    topStore: TopStore,
    undoManager: UndoManager,
    httpManager: HttpManager,
    mapImagesManager: MapImagesManager,
}


class InfoPanelMap extends React.Component<InfoPanelMapProps, any> {

    constructor(props: InfoPanelMapProps) {
        super(props);
        this.onTextFieldButtonClicked = this.onTextFieldButtonClicked.bind(this);
    }


    onTextFieldButtonClicked(event: React.MouseEvent<HTMLOrSVGElement>):void {
        let currentTextFields: {[id:string] :TextField} =
            cloneDeep(this.props.topStore.getTopState().mapSettings.textFields);
        let currentTextFieldKeys: string[] = [];
        let nextTextFieldId = 0;
        const textFieldString = "textField";
        if (currentTextFields !== undefined) {
            currentTextFieldKeys = Object.keys(currentTextFields);
            if (currentTextFieldKeys.length > 0) {
                const lastTextFieldId: number = Number(currentTextFieldKeys[currentTextFieldKeys.length - 1].substr(textFieldString.length));
                nextTextFieldId = lastTextFieldId + 1;
                if (nextTextFieldId === null || nextTextFieldId === undefined) {
                    nextTextFieldId = 0;
                }
            }
        } else {
            console.error('textFields undefined');
            return;
        }

        let textFieldId = "textField" + nextTextFieldId;
        currentTextFields[textFieldId] = {position: null, rotationDegrees: 0, text: "Text"};
        let newValue:{[field:string]: {[id:string]: TextField}} = {"textFields": currentTextFields};
        let origValue:{[field:string]: {[id:string]: TextField}} = {"textFields": this.props.topStore.getTopState().mapSettings.textFields};
        const selected: Selected = {
            selectedDeviceType: ObjectType.TEXT_FIELD,
            selected: null,
            selectedG: null,
            selectedDotid: textFieldId,
            selectedSzId: null,
        };
        const xacts: Array<Action> = [{
            updateType: UpdateType.UPDATE,
            objectType: ObjectType.MAP_SETTINGS,
            objectId: '',
            newData: newValue,
            origData: origValue
        },
        {
            updateType: UpdateType.UPDATE,
            objectId: '',
            objectType: ObjectType.SELECTED,
            newData: selected,
            origData: this.props.topStore.getTopState().selected,
        }];
        this.props.undoManager.enactActionsToStore({
            actions: xacts,
            description: "Add a Text Field"
        }, EnactType.USER_ACTION);
    }

    render() {
        return (
            <div id='infoPanelMap'>
                <div id='infoPanelMapHeader' className='infoPanelHeader'>Map Settings Hot Load
                </div>
                <TimeZoneUnitsMapDisplay mapChooserRowSize={3}
                                         mapVerbiage="Background map"
                                         apModel={this.props.topStore.getTopState().ap}
                                         initialization={false}
                                         topStore={this.props.topStore}
                                         undoManager={this.props.undoManager}
                                         httpManager={this.props.httpManager}
                                         mapImagesManager={this.props.mapImagesManager}
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
                            <CheckboxField label='Show RF Connections'
                                           value={this.props.mapModel.showRFLinks}
                                           idName={'showRFLinks'} className={'showRFLinks'}
                                           key={'showRFLinks'} fieldName={'showRFLinks'}
                                           objectType={ObjectType.MAP_SETTINGS} objectId={''}
                                           topStore={this.props.topStore}
                                           undoManager={this.props.undoManager}
                            />
                            <CheckboxField label='Show CC Connections'
                                           value={this.props.mapModel.showCCLinks}
                                           idName={'showCCLinks'} className={'showCCLinks'}
                                           key={'showCCLinks'} fieldName={'showCCLinks'}
                                           objectType={ObjectType.MAP_SETTINGS} objectId={''}
                                           topStore={this.props.topStore}
                                           undoManager={this.props.undoManager}
                            />
                            <CheckboxField label='Show Legend'
                                           value={this.props.mapModel.showLegend}
                                           idName={'showLegend'} className={'showLegend'}
                                           key={'showLegend'} fieldName={'showLegend'}
                                           objectType={ObjectType.MAP_SETTINGS} objectId={''}
                                           topStore={this.props.topStore}
                                           undoManager={this.props.undoManager}
                            />
                            <CheckboxField label='Show Cabinet Icon'
                                           value={this.props.mapModel.showCabinetIcon}
                                           idName={'showCabinetIcon'} className={'showCabinetIcon'}
                                           key={'showCabinetIcon'} fieldName={'showCabinetIcon'}
                                           objectType={ObjectType.MAP_SETTINGS} objectId={''}
                                           topStore={this.props.topStore}
                                           undoManager={this.props.undoManager}
                            />
                        </tbody>
                    </table>
                    <table>
                        <tbody>
                            <tr><td><b/></td><td></td></tr>
                            <tr>
                                <td className="textBox">
                                    <span id='textButtonAndNote' className='buttonPane'>
                                        <AptdButton id='textButtonId'
                                                    title='Create a Text Box on Map'
                                                    theClassName="textBox gray"
                                                    text='Add Text Field'
                                                    onClick={this.onTextFieldButtonClicked}
                                        />
                                        <span>
                                            Press this button to add a text box to the Map
                                        </span>
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }
}

export default InfoPanelMap;
