import * as React from 'react';
import {ReactNode} from 'react';
import InfoPanelSensor from './InfoPanelSensor';
import InfoPanelSensorZone from './InfoPanelSensorZone';
import InfoPanelRadio from './InfoPanelRadio';
import InfoPanelAP, {ActiveTab} from './InfoPanelAP';
import InfoPanelMap from './InfoPanelMap';
import './InfoPanel.css';
import InfoPanelRepeater from "./InfoPanelRepeater";
import InfoPanelCC, {CCActiveTab} from "./InfoPanelCC";
import InfoPanelTechSupport, {TechSupportActiveTab} from "./InfoPanelTechSupport";
import TopStore, {TopStoreState} from "../TopStore";
import {
    GUICCAPGIClient,
    GUICCCardClient,
    GUICCSTSClient,
    GUIRepeaterClient,
    GUISDLCClient,
    GUISensorClient,
    ObjectType,
    Selected, TextField
} from "../AptdClientTypes";
import UndoManager from "../UndoManager";
import InfoPanelAPGI from "./InfoPanelAPGI";
import InfoPanelTextField from './InfoPanelTextField';
import InfoPanelSTS, {STSActiveTab} from "./InfoPanelSTS";
import WebSocketManager from "../WebSocketManager";
import HttpManager from "../HttpManager";
import MapImagesManager from "../MapImagesManager";


export interface Errors {
    value: string,
    errmsgs: Array<string>
}


interface InfoPanelProps {
    mapCabinetTrayHeight: number,
    selected: Selected | null,
    topStore: TopStore,
    undoManager: UndoManager,
    webSocketManager: WebSocketManager | null,
    httpManager: HttpManager,
    onRequireLoginChanged: ()=>void,
    mapImagesManager: MapImagesManager,
}

interface InfoPanelState {
    apActiveTab: ActiveTab,
    ccActiveTab: CCActiveTab,
    stsActiveTab: STSActiveTab,
    techSupportActiveTab: TechSupportActiveTab,
}

class InfoPanel extends React.Component<InfoPanelProps, InfoPanelState> {
    static readonly batteryUserViewByBatteryStatus: {[status: string]: string} = {
        UNKNOWN: '',  // no data available
        GOOD: 'Good',
        REPLACE: 'Replace Device!',
    };

    constructor(props: InfoPanelProps) {
        super(props);
        this.state = {
            apActiveTab: ActiveTab.NETWORK,
            ccActiveTab: CCActiveTab.BASIC,
            /** TODO: if all STS IPs are defined, then active tab should default to channels */
            stsActiveTab: STSActiveTab.IPS,
            techSupportActiveTab: TechSupportActiveTab.JOBS,
        };
        this.setAPActiveTab = this.setAPActiveTab.bind(this);
        this.setCCActiveTab = this.setCCActiveTab.bind(this);
        this.setSTSActiveTab = this.setSTSActiveTab.bind(this);
        this.setTechSupportActiveTab = this.setTechSupportActiveTab.bind(this);
    }

	/**
     * TODO: What is the best way to conditionally render 1 subcomponent of this Component?
     *       Are the various InfoPanel* components re-instantiated each time they are shown?
     * @see https://medium.com/@cowi4030/optimizing-conditional-rendering-in-react-3fee6b197a20
     */
    render(): ReactNode {
        let height: number = this.props.mapCabinetTrayHeight - 14;
        const mystyles = {
            height: "" + height + "px",
            maxHeight: "" + Math.max(578, height) + "px",
        } as React.CSSProperties;

        let result: React.ReactNode = null;
        const model = this.props.topStore.getTopState();
        const selected:Selected | null = this.props.selected;

        if (model.ap === null) {
            // GUIAPConfig not yet arrived
            result = null
        } else if (selected === undefined || selected === null || (selected.selectedDotid === 'noChannelId' && selected.selectedDeviceType === 'SDLC_BANK' && selected.selected === null) ||
                   (selected.selectedDeviceType === null && selected.selectedDotid === null)) {
            result = this.renderInfoPanelMap();
        } else {
            const selectedProp: Selected = selected as Selected;
            switch (selected.selectedDeviceType) {
                 case ObjectType.TEXT_FIELD:
                    result = this.renderInfoPanelTextField(selected);
                    break;
                case ObjectType.MAP_NORTH_ARROW_ICON:
                case ObjectType.MAP_SETTINGS:
                case ObjectType.MAP:
                    result = this.renderInfoPanelMap();
                    break;

                case ObjectType.TRAY_SENSOR:
                    result = this.renderInfoPanelForTraySensor(selectedProp, selected);
                    break;

                case ObjectType.SENSOR_ZONE:
                    result = this.renderInfoPanelSensorZone(selected);
                    break;

                case ObjectType.RADIO:
                    result = this.renderInfoPanelRadio(selected, model);
                    break;

                case ObjectType.MAP_REPEATER:
                case ObjectType.TRAY_REPEATER:
                    result = this.renderInfoPanelRepeater(selected, model);
                    break;

                case ObjectType.CCCARD:
                    result = this.renderInfoPanelCC(selected, model);
                    break;

                case ObjectType.SDLC_BANK:
                    result = this.renderInfoPanelSdlc(selected, model);
                    break;

                case ObjectType.AP:
                    result = this.renderInfoPanelAP(model);
                    break;

                case ObjectType.APGI:
                    result = this.renderInfoPanelApgi(model);
                    break;

                case ObjectType.STS:
                    result = this.reanderInfoPanelSts(model);
                    break;

                case ObjectType.TECH_SUPPORT:
                    result = this.renderInfoPanelTechSupport(model);
                    break;

                default:
                    console.error('unexpected selectedDeviceType: ' + selected.selectedDeviceType);
                    result = null;
                    break;
            }
        }

        return (
            <div id="infoPanel" style={mystyles}>
                {result}
            </div>
        );
    }

    private renderInfoPanelTextField(selected: Selected): React.ReactNode {
        let result: React.ReactNode = null;
        if (selected.selectedDotid !== null) {
            const textField: TextField =
                this.props.topStore.getTopState().mapSettings.textFields[selected.selectedDotid];
            const text: string = textField.editText !== undefined ?
                textField.editText : textField.text;
            if (selected.selectedDotid !== null) {
                result = (<InfoPanelTextField
                                key={selected.selectedDotid}
                                id={selected.selectedDotid}
                                text={text}
                                topStore={this.props.topStore}
                                undoManager={this.props.undoManager}
                          />);
            }
        } else {
            console.error('unexpected null selected.selectedDotid for tf');
        }
        return result;
    }

    private renderInfoPanelMap() {
        const result: React.ReactNode =
            <InfoPanelMap apModel={this.props.topStore.getTopState().ap}
                          mapModel={this.props.topStore.getTopState().mapSettings}
                          topStore={this.props.topStore}
                          undoManager={this.props.undoManager}
                          httpManager={this.props.httpManager}
                          mapImagesManager={this.props.mapImagesManager}
            />;
        return result;
    }

    private renderInfoPanelTechSupport(model: Readonly<TopStoreState>): ReactNode {
        let result: React.ReactNode = null;
        let techSupportModel = model.techSupport;
        result = (
            <div id='techSupportPanel'>
                <InfoPanelTechSupport
                    techSupportModel={techSupportModel}
                    activeTab={this.state.techSupportActiveTab}
                    setTechSupportActiveTab={this.setTechSupportActiveTab}
                    webSocketManager={this.props.webSocketManager}
                    topStore={this.props.topStore}
                    undoManager={this.props.undoManager}
                />
            </div>
        );
        return result;
    }

    private reanderInfoPanelSts(model: Readonly<TopStoreState>): ReactNode {
        let result: React.ReactNode = null;
        const stsModel: GUICCSTSClient = model.ccCards['STS'] as GUICCSTSClient;
        if (stsModel !== null && stsModel !== undefined) {
            result = (
                <div id='ccPanel'>
                    <InfoPanelSTS key={'STS'}
                                  stsModel={stsModel}
                                  setSTSActiveTab={this.setSTSActiveTab}
                                  topStore={this.props.topStore}
                                  undoManager={this.props.undoManager}
                    />
                </div>
            );
        } else {
            console.error('unexpected null stsModel');
            result = null;
        }
        return result;
    }

    private renderInfoPanelApgi(model: Readonly<TopStoreState>): ReactNode {
        let result: React.ReactNode = null;
        const apgiModel: GUICCAPGIClient = model.ccCards['APGI'] as GUICCAPGIClient;
        if (apgiModel !== null && apgiModel !== undefined) {
            result = (
                <div id='ccPanel'>
                    <InfoPanelAPGI key={'APGI'}
                                   apgiModel={apgiModel}
                                   topStore={this.props.topStore}
                                   undoManager={this.props.undoManager}
                    />
                </div>
            );
        } else {
            console.error('unexpected null apgiModel');
            result = null;
        }
        return result;
    }

    private renderInfoPanelAP(model: Readonly<TopStoreState>): ReactNode {
        let result: React.ReactNode = null;
        const apModel = model.ap;
        if (apModel !== null) {
            result = (
                <div id='apPanel'>
                    <InfoPanelAP key={'AP'}
                                 apModel={apModel}
                                 apId={'AP'}
                                 activeTab={this.state.apActiveTab}
                                 setAPActiveTab={this.setAPActiveTab}
                                 topStore={this.props.topStore}
                                 undoManager={this.props.undoManager}
                                 webSocketManager={this.props.webSocketManager}
                                 httpManager={this.props.httpManager}
                                 onRequireLoginChanged={this.props.onRequireLoginChanged}
                    />
                </div>
            );
        } else {
            console.error('unexpected null apModel');
            result = null;
        }
        return result;
    }

    private renderInfoPanelSdlc(selected: Selected, model: Readonly<TopStoreState>): ReactNode {
        let result: React.ReactNode = null;
        // use selectedDotid as bankNo
        if (selected.selectedDotid !== null) {
            const ccModel = model.ccCards['SDLC'] as GUISDLCClient;
            if (ccModel !== null && ccModel !== undefined) {
                result = (
                    <div id='ccPanel'>
                        <InfoPanelCC key={selected.selectedDotid}
                                     ccId={selected.selectedDotid}
                                     bankNo={+selected.selectedDotid}
                                     ccModel={ccModel}
                                     setCCActiveTab={this.setCCActiveTab}
                                     topStore={this.props.topStore}
                                     undoManager={this.props.undoManager}
                                     webSocketManager={this.props.webSocketManager}
                        />
                    </div>
                );
            } else {
                console.error('unexpected null selectedDotid for sdlc');
                result = null;
            }
        } else {
            console.error('unexpected null selectedDotid for sdlc');
            result = null;
        }
        return result;
    }

    private renderInfoPanelCC(selected: Selected, model: Readonly<TopStoreState>): ReactNode {
        let result: React.ReactNode = null;
        if (selected.selectedDotid !== null) {
            const ccModel = model.ccCards[selected.selectedDotid] as GUICCCardClient;
            if (ccModel !== null && ccModel !== undefined) {
                result = (
                    <div id='ccPanel'>
                        <InfoPanelCC key={selected.selectedDotid}
                                     ccId={selected.selectedDotid}
                                     ccModel={ccModel}
                                     setCCActiveTab={this.setCCActiveTab}
                                     topStore={this.props.topStore}
                                     undoManager={this.props.undoManager}
                                     webSocketManager={this.props.webSocketManager}
                        />
                    </div>
                );
            } else {
                console.error('unexpected null selectedDotid for cc');
                result = null;
            }
        } else {
            console.error('unexpected null selectedDotid for cc');
            result = null;
        }
        return result;
    }

    private renderInfoPanelRepeater(selected: Selected, model: Readonly<TopStoreState>): ReactNode {
        let result: React.ReactNode = null;
        if (selected.selectedDotid !== null) {
            let repeaterModel: GUIRepeaterClient | null;
            if (selected.selectedDeviceType === ObjectType.TRAY_REPEATER) {
                repeaterModel = model.trayDevices[selected.selectedDotid] as GUIRepeaterClient;
            } else if (selected.selectedDeviceType === ObjectType.MAP_REPEATER) {
                repeaterModel = model.mapRepeaters[selected.selectedDotid];
            } else {
                console.error('unexpected selectedDeviceType', selected.selectedDeviceType);
                repeaterModel = null;
            }
            if (repeaterModel === null || repeaterModel === undefined) {
                console.error('unexpected null repeaterModel');
                result = null;
            } else {
                result = (
                    <div id='repeaterPanel'>
                        <InfoPanelRepeater key={selected.selectedDotid}
                                           repeaterId={selected.selectedDotid}
                                           repeaterModel={repeaterModel}
                                           topStore={this.props.topStore}
                                           undoManager={this.props.undoManager}
                        />
                    </div>
                );
            }
        } else {
            console.error('unexpected null selectedDotid for repeater');
            result = null;
        }
        return result;
    }

    private renderInfoPanelRadio(selected: Selected, model: Readonly<TopStoreState>): ReactNode {
        let result: React.ReactNode = null;
        if (selected.selectedDotid !== null) {
            const radioModel = model.radios[selected.selectedDotid];
            if (radioModel !== null && radioModel !== undefined) {
                result = (
                    <div id='radioPanel'>
                        <InfoPanelRadio key={selected.selectedDotid}
                                        radioModel={radioModel}
                                        topStore={this.props.topStore}
                                        undoManager={this.props.undoManager}
                        />
                    </div>
                );
            } else {
                console.error('unexpected null selectedDotid for radio');
                result = null;
            }
        } else {
            console.error('unexpected null selectedDotid for radio');
            result = null;
        }
        return result;
    }

    private renderInfoPanelForTraySensor(selectedProp: Selected, selected: Selected): React.ReactNode {
        let result: React.ReactNode = null;
        if (selectedProp.selectedDotid === null) {
            console.error('unexpected null selectedDotid');
            result = null;
        } else {
            const traySensor: GUISensorClient | null =
                this.props.topStore.getTopState().trayDevices[selectedProp.selectedDotid] as GUISensorClient;
            if (traySensor === null) {
                console.error('could not find Tray Sensor with dotid ', selectedProp.selectedDotid);
                result = null;
            } else {
                result = (<InfoPanelSensor key={selected.selectedDotid === null ? undefined : selected.selectedDotid}
                                           dotid={selected.selectedDotid}
                                           indexInSz={NaN}
                                           nSensorsInSz={NaN}
                                           sensorModel={traySensor}
                                           topStore={this.props.topStore}
                                           undoManager={this.props.undoManager}
                                           webSocketManager={this.props.webSocketManager}
                />);
            }
        }
        return result;
    }

    private renderInfoPanelSensorZone(selected: Selected | null): ReactNode {
        let result: ReactNode;
        if (selected === null) {
            console.error('unexpected null selected');
            result = null;
            return;
        }
        if (selected.selectedSzId === null) {
            console.error('unexpected null selectedSzId');
            result = null;
        } else {
            const szModel = this.props.topStore.getTopState().sensorZones[selected.selectedSzId];
            result = (
                <div id='sensorSzPanel'>
                    <InfoPanelSensorZone key={selected.selectedSzId}
                                         szId={selected.selectedSzId}
                                         szModel={szModel}
                                         selected={selected}
                                         topStore={this.props.topStore}
                                         undoManager={this.props.undoManager}
                                         webSocketManager={this.props.webSocketManager}
                    />
                </div>
            );
        }
        return result;
    }

    setAPActiveTab(activeTab:ActiveTab):void {
        this.setState({apActiveTab: activeTab});
    }
    setCCActiveTab(activeTab:CCActiveTab):void {
        this.setState({ccActiveTab: activeTab});
    }
    setSTSActiveTab(activeTab:STSActiveTab):void {
        this.setState({stsActiveTab: activeTab});
    }
    setTechSupportActiveTab(activeTab:TechSupportActiveTab):void {
        this.setState({techSupportActiveTab: activeTab});
    }

    public static validateRequiredInteger(value: string): Errors {
        if (value === null || value === '') {
            return {value: '', errmsgs: ['A numeric value is required']};
        } else if (! value.match(/^-{0,1}\d+$/)) {
            return {value: value, errmsgs: ['Value must be an integer']};
        } else {
            // fine
            return {value: value, errmsgs: []};
        }
    }


    /**
     * The most minimal validator: everything is fine!!
     * This is intended for use with select or radio buttons,
     * Not with a field where user can enter arbitrary text.
     */
    static noValidate(value: string): Errors  {
        return {value: value, errmsgs: []};
    }

    /**
     * @return empty errmsgs if value param is in dotted quad format, i.e. nnn.nnn.nnn.nnn
     * @param value
     */
    static validateDottedQuad(value: string): Errors {
        let errmsgs: Array<string> = [];
        let result = {value: value, errmsgs: errmsgs};
        if (! InfoPanel.hasOnlyNumbersAndDots(value)) {
            result.errmsgs.push('value must be in dotted quad form: nnn.nnn.nnn.nnn');
        } else if (! InfoPanel.isDottedQuad(value)) {
            result.errmsgs.push('value must be in dotted quad form: nnn.nnn.nnn.nnn');
        }
        return result;
    }

    static hasOnlyNumbersAndDots(value: string): boolean {
        //return value.match(/[\d.]*/);
        return /^[\d.]*$/.test(value);
    }

    static isDottedQuad(value: string): boolean {
        const blocks: string[] = value.split('.');
        if (blocks.length === 4) {
            return blocks.every(function isValidBlock(block: string) {
                const blockAsInt: number = parseInt(block,10);
                return blockAsInt >= 0 && blockAsInt <= 255;
            });
        }
        return false;
    }


    /**
     * @return name, trimmed left, with only alphanumeric, space, hyphen, underscore, at-sign chars
     *
    static purifyName(name: string): string {
        let cleanName = name.trimLeft();
        // allow only alphanumeric, space, hyphen, underscore, at-sign.  Remove others
        cleanName = cleanName.replace(/[^\w \-_@]/g, '');
        return cleanName;
    }
     */

    static toNumber(field: string): number {
        return +field;
    }
}

export default InfoPanel;
