import React, {ChangeEvent} from 'react';
import './InfoPanel.css';
import SelectField, {Option} from "../fields/SelectField";
import {
    Action,
    GUIAPConfigClient,
    ObjectType,
    UpdateType,
} from "../AptdClientTypes";
import {
    ColorCodeMode, SystemContext,
    //FirmwareType,
} from "../AptdServerTypes";
import TopStore from "../TopStore";
import UndoManager from "../UndoManager";
import WebSocketManager from "../WebSocketManager";
import HttpManager from "../HttpManager";
import RadioButtonGroupField from "../fields/RadioButtonGroupField";
import './InfoPanelAPInfo.css';


interface InfoPanelAPPropertiesProps {
    apId: string,
    apModel: GUIAPConfigClient,
    topStore: TopStore,
    undoManager: UndoManager,
    webSocketManager: WebSocketManager | null
    httpManager: HttpManager | null
}

interface InfoPanelAPPropertiesState {
}


/**
 * this version uses local state. We keep top-level state in TopStore as the
 * source of *verified* truth, but need local state to reflect user input,
 * in case where user makes errors.  Local state is in InputField, SelectField components.
 */
class InfoPanelAPProperties extends React.Component<InfoPanelAPPropertiesProps, InfoPanelAPPropertiesState> {
    private readonly colorCodeHighOptions: Array<Option>;
    private readonly colorCodeLowOptions: Array<Option>;
    private readonly colorCodeModeOptions: Array<Option>;
    private readonly systemContextOptions: Array<Option> = [
        {text: 'Default', value: 'DEFAULT'},
        {text: 'SCOOT', value: 'SCOOT'},
        {text: 'MOVA', value: 'MOVA'},
    ];

    private readonly HEX_NIBBLE_OPTIONS = [
        {text: '0', value: "0"},
        {text: '1', value: "1"},
        {text: '2', value: "2"},
        {text: '3', value: "3"},
        {text: '4', value: "4"},
        {text: '5', value: "5"},
        {text: '6', value: "6"},
        {text: '7', value: "7"},
        {text: '8', value: "8"},
        {text: '9', value: "9"},
        {text: 'A', value: "A"},
        {text: 'B', value: "B"},
        {text: 'C', value: "C"},
        {text: 'D', value: "D"},
        {text: 'E', value: "E"},
        {text: 'F', value: "F"}
    ];


    constructor(props: InfoPanelAPPropertiesProps) {
        super(props);
        console.debug('lifecycle InfoPanelAPProperties constructor(): start. this.props.apId=', this.props.apModel.id);

        this.colorCodeHighOptions = [
            {text: '0', value: "0"},
            {text: '1', value: "1"},
            {text: '2', value: "2"},
            {text: '3',  value: "3"},
            {text: '4', value: "4"},
            {text: '5', value: "5"},
            {text: '6', value: "6"},
            {text: '7', value: "7"},
        ];
        this.colorCodeLowOptions = this.HEX_NIBBLE_OPTIONS;

        this.colorCodeModeOptions = [
            {text: 'Auto (currently ' + this.props.apModel.colorCode + ')', value: ColorCodeMode.AUTO},
            {text: 'Manual', value: ColorCodeMode.MANUAL},
        ];

        this.state = {
        };

        this.onChangeSystemContextAddActions = this.onChangeSystemContextAddActions.bind(this);
    }


    transformValueToStore(useValue:string):{[fieldName:string]: string} {
        return {useValue};
    }

    private updateColorCodeOptions() {
        this.colorCodeModeOptions[0].text = 'Auto (currently ' + this.props.apModel.colorCode + ')';
    }

    private onChangeSystemContextAddActions(event: ChangeEvent<HTMLInputElement>, updateAction: Action):Action[] {
        const sensorZones: Array<any> = Object.values(this.props.topStore.getTopState().sensorZones); 
        let actions: Action[] = [updateAction];
        const sc = (updateAction.newData as any).systemContext;
        for(const [key, value] of Object.entries(this.props.topStore.state.mapSensors)) {
            if(sensorZones.find(sensorZone => sensorZone.sensorIds.indexOf(key) !== -1)['otype'] !== "GUIStopbarSensorZone") {
                if((sc === 'SCOOT' || sc === 'MOVA')) {
                    const action : Action = {
                        newData: {ccExtension: 100},
                        objectId: value.id,
                        objectType: ObjectType.MAP_SENSOR,
                        origData: {ccExtension: value.ccExtension},
                        updateType: UpdateType.UPDATE
                    };
                    actions.push(action);
                } else if(sc === 'DEFAULT') {
                    const action : Action = {
                        newData: {ccExtension: 0},
                        objectId: value.id,
                        objectType: ObjectType.MAP_SENSOR,
                        origData: {ccExtension: value.ccExtension},
                        updateType: UpdateType.UPDATE
                    }
                    actions.push(action);
                }
            } else if(sensorZones.find(sensorZone => sensorZone.sensorIds.indexOf(key) !== -1)['otype'] === "GUIStopbarSensorZone") {
                const sensorZone = sensorZones.find(sensorZone => sensorZone.sensorIds.indexOf(key) !== -1);
                if(sc === 'SCOOT' || sc === 'MOVA') {
                    if(sensorZone['stopbarSensitivity'] < 4) {
                        const action : Action = {
                            newData: {stopbarSensitivity: 4},
                            objectId: sensorZone['id'],
                            objectType: ObjectType.SENSOR_ZONE,
                            origData: {stopbarSensitivity: sensorZone['stopbarSensitivity']},
                            updateType: UpdateType.UPDATE
                        };
                        actions.push(action);
                    } else if(sensorZone['stopbarSensitivity'] > 9) {
                        const action : Action = {
                            newData: {stopbarSensitivity: 9},
                            objectId: sensorZone['id'],
                            objectType: ObjectType.SENSOR_ZONE,
                            origData: {stopbarSensitivity: sensorZone['stopbarSensitivity']},
                            updateType: UpdateType.UPDATE
                        }
                        actions.push(action);
                    }    
                }
            }
        }
        return actions;
    } 


    render() {
        // need to update the color code options from AP.
        // TODO: is there a way to do this only when there is a change?
        this.updateColorCodeOptions();

        return (
            <div id='infoAPProperties'
                 className={this.props.topStore.getTopState().downloadInProgress ||
                            this.props.topStore.getTopState().loading ? 'disabled' : ''}
            >
                <div id='apPropertiesForm'>
                    <table>
                        <tbody>
                        <tr>
                            <td colSpan={3}>
                                <h4>Color Code</h4>
                                <hr/>
                            </td>
                        </tr>
                        <tr id='colorCodeRbgTr'>
                            <td></td>
                            <RadioButtonGroupField
                                showLabel={false}
                                label={'Color Code Mode'}
                                row={false}
                                value={this.props.apModel.colorCodeMode}
                                key={'apColorCodeMode'}
                                options={this.colorCodeModeOptions}
                                idName={'apColorCodeMode'}
                                className={'apColorCodeMode'}
                                fieldName={'colorCodeMode'}
                                objectType={ObjectType.AP}
                                objectId={'AP'}
                                topStore={this.props.topStore}
                                undoManager={this.props.undoManager}
                            />
                        </tr>
                        <tr id='colorCodeTr'>
                            <td></td>
                            <SelectField label={'Set Color Code to '}
                                         row={false}
                                         showLabel={false}
                                         showErrorTd={false}
                                         disabled={this.props.apModel.colorCodeMode === undefined ||
                                                   this.props.apModel.colorCodeMode === ColorCodeMode.AUTO}
                                         value={this.props.apModel.colorCodeHiNibbleManual}
                                         key={'colorCodeHigh'}
                                         options={this.colorCodeHighOptions}
                                         idName={'colorCodeHiNibbleManual'}
                                         className={'colorCodeHigh'}
                                         fieldName={'colorCodeHiNibbleManual'}
                                         objectType={ObjectType.AP}
                                         objectId={'AP'}
                                         topStore={this.props.topStore}
                                         undoManager={this.props.undoManager}
                            />
                            <SelectField label={''}
                                         row={false}
                                         showLabel={false}
                                         disabled={this.props.apModel.colorCodeMode === undefined ||
                                                   this.props.apModel.colorCodeMode === ColorCodeMode.AUTO}
                                         value={this.props.apModel.colorCodeLoNibbleManual}
                                         key={'colorCodeLow'}
                                         options={this.colorCodeLowOptions}
                                         idName={'colorCodeLoNibbleManual'}
                                         className={'colorCodeLow'}
                                         fieldName={'colorCodeLoNibbleManual'}
                                         objectType={ObjectType.AP}
                                         objectId={'AP'}
                                         topStore={this.props.topStore}
                                         undoManager={this.props.undoManager}
                            />
                        </tr>
                        <tr>
                            <td colSpan={3}>
                                <h4>System Context</h4>
                                <hr/>
                            </td>
                        </tr>
                        <RadioButtonGroupField
                            showLabel={true}
                            label={''}
                            //value={InfoPanelAPProperties.toLocale(this.props.apModel.systemContext)}
                            value={this.props.apModel.systemContext}
                            idName={'systemContext'}
                            className={'systemContext'}
                            key={'systemContext'}
                            fieldName={'systemContext'}
                            options={this.systemContextOptions}
                            topStore={this.props.topStore}
                            undoManager={this.props.undoManager}
                            objectType={ObjectType.AP}
                            objectId={'AP'}
                            onChangeAddActions={this.onChangeSystemContextAddActions}
                        />
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }
}

export default InfoPanelAPProperties;