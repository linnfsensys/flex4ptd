import React, {Component, ReactNode} from 'react';
import './InfoPanel.css';
import './InfoPanelSensorZone.css';
import InputField from "../fields/InputField";
import SelectField, {Option} from '../fields/SelectField';
import RangeField from "../fields/RangeField";
import {CharacterType, GUISZClient, ObjectType, Selected} from "../AptdClientTypes";
import {ServerObjectType, UnitTypes} from "../AptdServerTypes";
import TopStore from "../TopStore";
import InfoPanelSensor from "./InfoPanelSensor";
import UndoManager from "../UndoManager";
import ValidationManager from "../ValidationManager";
import WebSocketManager from "../WebSocketManager";
import Note from "../fields/Note";
import { AptdApp } from '../AptdApp';

/** represents client's state in InfoPanelSensorZone */
export enum SensorZoneUse {
    STOPBAR = 'STOPBAR',
    COUNT = 'COUNT',
    SPEED = 'SPEED'
}

interface InfoPanelSensorZoneProps {
    szId: string,
    szModel: GUISZClient,
    selected: Selected,
    topStore: TopStore,
    undoManager: UndoManager,
    webSocketManager: WebSocketManager|null,
}

interface InfoPanelSensorZoneState {
    use: SensorZoneUse,
}



/**
 * this version uses local state. We keep top-level state in AptdApp as the
 * source of *verified* truth, but need local state to reflect user input,
 * in case where user makes errors.  Local state is in InputField components.
 */
class InfoPanelSensorZone extends Component<InfoPanelSensorZoneProps, InfoPanelSensorZoneState> {
    private szId: string;
    private useOptions: Array<Option>;

    constructor(props: InfoPanelSensorZoneProps) {
        super(props);
        console.debug('lifecycle constructor(): start. this.props.szId=', this.props.szId, 'ipsz: adding for grep. selectedDotid=', this.props.selected !== undefined ? this.props.selected.selectedDotid : '?');
        this.szId = this.props.szId;  // hidden unique id#

        // state is copied from props szModel
        this.state = {
            use: this.props.szModel === undefined ? SensorZoneUse.STOPBAR :
                    InfoPanelSensorZone.convertOtypeToUse(this.props.szModel.otype),
        };

        this.convertUseToOtype = this.convertUseToOtype.bind(this);
        this.transformValueToStore = this.transformValueToStore.bind(this);
        this.renderSensor = this.renderSensor.bind(this);
        this.focusAndScroll = this.focusAndScroll.bind(this);

        this.useOptions = [
            {value: SensorZoneUse.STOPBAR, text: 'Stopbar'},
            {value: SensorZoneUse.COUNT, text: 'Count'},
            {value: SensorZoneUse.SPEED, text: 'Speed'},
        ];
    }

    render(): JSX.Element | null {
        if (this.props.szModel === undefined) {
            // nothing to render
            console.error('InfoPanelSensorZone.render(): this.props.szModel is undefined');
            return null;
        }
        const header = 'Sensor Zone';
        const key = 'sensorZoneUse_' + this.props.szId;
        let infoPanelSensors: Array<ReactNode> = [];
        const selected:Selected | null = this.props.selected;
        if (selected === null) {
            console.error('unexpected null selected');
            return null;
        }
        if (selected.selectedSzId === null || selected.selectedSzId === undefined) {
            console.error('unexpected null or undefined selectedSzId');
            return null;
        } else {
            const szModel = this.props.szModel;
            if (szModel === null || szModel === undefined) {
                console.warn('unexpected null szModel');
                return null;
            }
            const selectedSzId: string = selected.selectedSzId as string;
            infoPanelSensors = szModel.sensorIds.map(this.renderSensor(szModel, selected, selectedSzId));
        }

        let otypeErrorPresent = false;
        const errorKey: string = ValidationManager.makeErrorKey(ObjectType.SENSOR_ZONE, this.props.szId, 'otype');
        const errMsgs: string[] = this.props.topStore.getTopState().validationErrors[errorKey];
        if (errMsgs !== undefined && errMsgs.length > 0) {
            otypeErrorPresent = true;
        }

        return (
            <div id='infoPanelSensorZone'>
                <div id='infoPanelSensorZoneHeader' className="infoPanelHeader">{header}</div>
                <div id='infoPanelSZGlobalErrors' className='globalErrors'>{this.renderGlobalErrors()}</div>
                <table id='szForm'>
                    <tbody>
                    {/* HR: I argue the label should be "Sensor Zone Name",
                            to distinguish from Sensor(s) which are on the same info panel*/}
                    <InputField label={'Name'}
                                text={this.props.szModel.name}
                                key={'szName_' + this.props.szId}
                                idName={'szName'}
                                fieldName={'name'}
                                maxLength={32}
                                objectType={ObjectType.SENSOR_ZONE}
                                required={true}
                                objectId={this.props.szId}
                                characterType={CharacterType.NAME_WITH_BLANKS}
                                topStore={this.props.topStore}
                                undoManager={this.props.undoManager}
                    />

                    {/*
                    <InputField label={'Description'}
                                text={this.props.szModel.desc}
                                key={'szDescription_' + this.props.szId}
                                idName={'szDescription'}
                                fieldName={'desc'}
                                maxLength={25}
                                objectType={ObjectType.SENSOR_ZONE}
                                objectId={this.props.szId}
                                characterType={CharacterType.NAME_WITH_BLANKS}
                                topStore={this.props.topStore}
                                undoManager={this.props.undoManager}
                                />
                    */}

                    {/* HR: I argue the label should be "Sensor Zone Use",
                            to distinguish from Sensor(s) which are on the same info panel*/}
                    <SelectField label='Used for'
                                 value={InfoPanelSensorZone.convertOtypeToUse(this.props.szModel.otype)}
                                 key={key}
                                 options={this.useOptions}
                                 idName={key}
                                 className={'szUse'}
                                 fieldName={'otype'}
                                 objectType={ObjectType.SENSOR_ZONE}
                                 objectId={this.props.szId}
                                 transformValueToStore={this.transformValueToStore}
                                 topStore={this.props.topStore}
                                 undoManager={this.props.undoManager}
                    />
                    {/* HR: Max wishes the stopbar sensitivity to be always visible, but disabled if inapplicable.
                            However, this is a problem because using <input type=range> must always show a value.
                    */}
                    <RangeField label={'Stopbar Sensitivity'}
                                disabled={(this.props.szModel.otype !== 'GUIStopbarSensorZone' ||
                                           this.props.szModel.stopbarSensitivity === undefined) ||
                                           otypeErrorPresent}
                                value={this.getAdjustedSensitivity()}
                                min={this.props.topStore.state.ap!.systemContext === 'DEFAULT' ? 1 : 4}
                                max={this.props.topStore.state.ap!.systemContext === 'DEFAULT' ? 15 : 9}
                                step={1}
                                key={'szSensitivity' + this.props.szId}
                                idName={'szSensitivity'}
                                fieldName={'stopbarSensitivity'}
                                objectType={ObjectType.SENSOR_ZONE}
                                objectId={this.props.szId}
                                showMoreLess={true}
                                undoManager={this.props.undoManager}
                                topStore={this.props.topStore}
                    />
                    </tbody>
                </table>
                <hr/>
                {infoPanelSensors}
            </div>
        )
    }

    /**
     * After rendering InfoPanel, want to scroll to the selected Sensor,
     * if there is one.
     * This method is called after initial render.
     */
    componentDidMount() {
        console.debug('ipsz: (for grep): componentDidMount()');
        const selectedSensorId:string|null = this.props.selected.selectedDotid;
        if (selectedSensorId !== null) {
            this.focusAndScroll(selectedSensorId);
        } else {
            console.error('ipsz: unexpected null selectedSensorId');
        }
    }

    /**
     * After rendering InfoPanel, want to scroll to the selected Sensor,
     * if there is one.
     * But only on the 1st update with new selection -- otherwise
     * the scrolling would happen on every refresh!
     * This method is not called on initial render
     */
    componentDidUpdate(prevProps:Readonly<InfoPanelSensorZoneProps>,
                       prevState:Readonly<InfoPanelSensorZoneState>) {
        // Scroll to show the selected sensor info
        const selectedSensorId:string|null = this.props.selected.selectedDotid;
        if (selectedSensorId !== null) {
            if (selectedSensorId !== prevProps.selected.selectedDotid) {
                console.debug('ipsz: selectedSensorId('+selectedSensorId+') differs from prev. will focus & scroll');
                this.focusAndScroll(selectedSensorId);
            } else {
                //console.warn('ipsz: selected sensor matches previous: ', selectedSensorId, '. doing nothing here.');
            }
        } else {
            console.error('ipsz: unexpected null selectedSensorId');
        }
    }

    private getAdjustedSensitivity(): number {
        return this.props.szModel.stopbarSensitivity ?
                    (this.props.topStore.state.ap!.systemContext !== 'DEFAULT' &&  this.props.szModel.stopbarSensitivity < 4) ? 
                        4
                        :
                        ((this.props.topStore.state.ap!.systemContext !== 'DEFAULT' &&  this.props.szModel.stopbarSensitivity > 9) ?
                            9
                            :
                            this.props.szModel.stopbarSensitivity)
                        
                    :
                    6
    }

    private focusAndScroll(selectedSensorId: string) {
        if (this.props.szModel === undefined) {
            console.warn("focusAndScroll(): szModel undefined");
            return;
        }
        if (this.props.szModel.sensorIds.includes(selectedSensorId)) {
            // Want to *focus* on the 1st input field that has an error, so user can type
            // without moving mouse.  Usually this would be Separation field.
            // If no errors, focus on 1st Separation field.
            const errorInputs: NodeListOf<HTMLInputElement> =
                document.querySelectorAll<HTMLInputElement>('input.inputText.error');

            if (errorInputs.length > 0) {
                console.debug('ipsz: about to focus on 1st input with error');
                errorInputs[0].focus({preventScroll: true});
            } else {
                const separationInputs: NodeListOf<HTMLInputElement> =
                    document.querySelectorAll<HTMLInputElement>('input.inputText.separation');
                const allInputs: NodeListOf<HTMLInputElement> =
                    document.querySelectorAll<HTMLInputElement>('input.inputText.cell');
                if (separationInputs.length > 0) {
                    // focus on 1st Separation field
                    console.debug('ipsz: about to focus on 1st Separation field');
                    separationInputs[0].focus({preventScroll: true});
                } else if (allInputs.length > 0) {
                    // focus on 1st input field (generally the name)
                    // focus on 1st Separation field
                    console.debug('ipsz: about to focus on 1st input field');
                    allInputs[0].focus({preventScroll: true});
                } else {
                    console.debug('ipsz: no focus happening');
                }
            }

            // Now *scroll* into view the info for selected sensor
            const sensorDiv =
                document.querySelector('div.infoPanelSensor[data-sensorId="' + selectedSensorId + '"]');
            if (sensorDiv !== null) {
                console.debug('ipsz: about to scroll into view: ', selectedSensorId);
                sensorDiv.scrollIntoView({block: 'end', behavior: 'smooth'});
            } else {
                console.error('ipsz: unexpected null sensorDiv');
            }
        } else {
            console.error('ipsz: unexpectedly, sz sensors do not included selected: ', selectedSensorId);
        }
    }

    private renderSensor(szModel: GUISZClient, selected: Selected, selectedSzId: string): (sensorId: string, index: number)=>ReactNode {
        return (sensorId: string, index: number) => {
            const spacingMm: string = szModel.spacingsMm[index];
            const lengthCorrectionMm: string = szModel.lengthCorrectionsMm[index];
            const isImperial = this.props.topStore.getTopState().ap!.units === UnitTypes.IMPERIAL;

            return <React.Fragment key={'fragment' + sensorId}>
                <InfoPanelSensor dotid={sensorId}
                                 sensorModel={this.props.topStore.getTopState().mapSensors[sensorId]}
                                 key={sensorId}
                                 indexInSz={index}
                                 nSensorsInSz={szModel.sensorIds.length}
                                 topStore={this.props.topStore}
                                 undoManager={this.props.undoManager}
                                 webSocketManager={this.props.webSocketManager}
                />
                {
                    (index < szModel.sensorIds.length - 1) ?
                        <React.Fragment>
                            <table key={'between' + index} className='betweenSensors'>
                                <tbody>
                                {isImperial ?
                                    <React.Fragment key={'spacings' + index}>
                                        {/* 'Imperial' version */}
                                        <tr>
                                            <InputField label={'Separation'}
                                                        text={WebSocketManager.mmToInches(spacingMm)}
                                                        idName={selected.selectedSzId + 'separation' + index}
                                                        key={selected.selectedSzId + 'separation' + index}
                                                        row={false}
                                                        fieldName='spacingsMm'
                                                        fieldIndex={index}
                                                        classToAdd={'separation'}
                                                        maxLength={6}
                                                        objectId={selectedSzId}
                                                        objectType={ObjectType.SENSOR_ZONE}
                                                        unit={'in'}
                                                        characterType={CharacterType.NONNEGATIVE_FLOAT}
                                                        required={true}
                                                        transformValueToStore={WebSocketManager.inchesToMm}
                                                        topStore={this.props.topStore}
                                                        undoManager={this.props.undoManager}
                                            />
                                            <td rowSpan={4} className='downArrow'>
                                                &darr;
                                            </td>
                                        </tr>
                                        <InputField  label = {'Length Correction'}
                                                     text={WebSocketManager.mmToInches(lengthCorrectionMm)}
                                                     idName={selected.selectedSzId + 'lengthCorrection' + index}
                                                     key={selected.selectedSzId + 'lengthCorrection' + index}
                                                     fieldName='lengthCorrectionsMm'
                                                     fieldIndex={index}
                                                     maxLength={6}
                                                     objectId={selectedSzId}
                                                     objectType={ObjectType.SENSOR_ZONE}
                                                     unit={'in'}
                                                     characterType={CharacterType.FLOAT}
                                                     required={false}
                                                     transformValueToStore={WebSocketManager.inchesToMm}
                                                     topStore={this.props.topStore}
                                                     undoManager={this.props.undoManager}
                                        />
                                    </React.Fragment>
                                    :
                                    <React.Fragment key={'spacings' + index}>
                                        {/* metric case */}
                                        <tr>
                                            <InputField label={'Separation*'}
                                                        text={spacingMm}
                                                        idName={selected.selectedSzId + 'separation' + index}
                                                        key={selected.selectedSzId + 'separation' + index}
                                                        row={false}
                                                        fieldName='spacingsMm'
                                                        fieldIndex={index}
                                                        classToAdd={'separation'}
                                                        maxLength={5}
                                                        objectId={selectedSzId}
                                                        objectType={ObjectType.SENSOR_ZONE}
                                                        unit={'mm'}
                                                        characterType={CharacterType.NONNEGATIVE_INTEGER}
                                                        topStore={this.props.topStore}
                                                        undoManager={this.props.undoManager}
                                            />
                                            <td rowSpan={4} className='downArrow'>
                                                &darr;
                                            </td>
                                        </tr>
                                        <InputField label={'Length Correction'}
                                                    text={lengthCorrectionMm}
                                                    idName={selected.selectedSzId + 'lengthCorrection' + index}
                                                    key={selected.selectedSzId + 'lengthCorrection' + index}
                                                    fieldName='lengthCorrectionsMm'
                                                    fieldIndex={index}
                                                    maxLength={5}
                                                    objectId={selectedSzId}
                                                    objectType={ObjectType.SENSOR_ZONE}
                                                    unit={'mm'}
                                                    characterType={CharacterType.INTEGER}
                                                    topStore={this.props.topStore}
                                                    undoManager={this.props.undoManager}
                                        />
                                    </React.Fragment>
                                }
                                </tbody>
                            </table>
                            <hr/>
                        </React.Fragment>
                        :
                        null
                }
            </React.Fragment>
        };
    }

    
    transformValueToStore(useValue:string):Partial<GUISZClient> {
        const newGUISensorZoneType: ServerObjectType = this.convertUseToOtype(useValue as SensorZoneUse);
        let szClient:Partial<GUISZClient> = {otype: newGUISensorZoneType};
        if (useValue === SensorZoneUse.STOPBAR) {
            var stopbarSensitivityVal = AptdApp.DEFAULT_SENSITIVITY;
            if (this.props.szModel.stopbarSensitivity !== undefined) {
                stopbarSensitivityVal = this.props.szModel.stopbarSensitivity
            }
            
            szClient.stopbarSensitivity = stopbarSensitivityVal
        }
        else {
            szClient.stopbarSensitivity = undefined;
        }
        return szClient;
    }

    convertUseToOtype(use: SensorZoneUse): ServerObjectType {
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
                if (this.props.szModel.otype === 'GUISpeed3SensorZone' ||
                    this.props.szModel.sensorIds.length === 3) {
                    otype = 'GUISpeed3SensorZone';
                }
                break;
            default: throw new Error('unexpected use: ' + use);
        }
        return otype;
    }

    static convertOtypeToUse(otype: ServerObjectType): SensorZoneUse {
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
            default: throw new Error('unexpected otype: ' + otype);
        }
        return use;
    }

    /**
     * 1. Disallow empty
     * 2. Disallow duplicate name (case insensitive)
     *
    private validateName(name: string): Errors  {
        if (name === undefined || name === null || name.trim() === '') {
            return {value: '', errmsgs: ['Sensor Zone Name is required']};
        } else {
            let cleanName = InfoPanel.purifyName(name);
            // test for uniqueness among existing sensor zone names
            const szs = this.props.topStore.getTopState().sensorZones;
            for (let sz of Object.values(szs)) {
                if (sz.name.toUpperCase() === cleanName.toUpperCase() && sz.id !== this.props.szId) {
                    return {value: cleanName, errmsgs: ['Sensor Zone name must be unique']};
                }
            }
            return {value: cleanName, errmsgs: []};
        }
    }
     */
    
    /** minimal. just purify chars
    private validateDescription(description: string): Errors  {
        let cleanDescription = InfoPanel.purifyName(description);
        return {value: cleanDescription, errmsgs: []};
    }
    */

	    /*
    componentDidMount(): void {
        console.debug('InfoPanelSensorZone: lifecycle componentDidMount(): start. this.szId=', this.szId);
        //this.validateAndShowError(this.state.name);
    }

    componentWillUnmount(): void {
        console.debug('InfoPanelSensorZone: lifecycle componentWillUnmount(): start. this.szId=', this.szId);
    }
    */

    private renderGlobalErrors(): ReactNode[] {
        let result: ReactNode[] = [];
        const errorKey: string = ValidationManager.makeInfoPanelKey(ObjectType.SENSOR_ZONE, this.props.szId);
        const globalErrors: string[] = this.props.topStore.getTopState().validationGlobalErrors[errorKey];
        if (globalErrors !== undefined) {
            for (let errno = 0; errno < globalErrors.length; errno++) {
                if (errno > 0) {
                    result.push('<br>');
                }
                result.push(globalErrors[errno]);
            }
        }
        return result;
    }
}

export default InfoPanelSensorZone;