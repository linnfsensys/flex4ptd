import React, {ReactNode} from 'react';
import ReadOnlyField from "../fields/ReadOnlyField";
import InfoPanel from "./InfoPanel";
import {
    BatteryStatus,
    CharacterType,
    EnactType,
    GUIRepeaterClient,
    GUISensorClient,
    ModalType,
    ObjectType,
    UpdateType
} from "../AptdClientTypes";
import TopStore from "../TopStore";
import InputField from "../fields/InputField";
import UndoManager from "../UndoManager";
import {Location} from '../AptdServerTypes';
import WebSocketManager from "../WebSocketManager";
import RssiSlider from "../widgets/RssiSlider";
import ValidationManager from "../ValidationManager";
import './InfoPanel.css';
import './InfoPanelSensor.css';
import AptdButton from "../AptdButton";

interface InfoPanelSensorProps {
    dotid: string | null,
    sensorModel: GUISensorClient,
    indexInSz: number,
    nSensorsInSz: number,
    topStore: TopStore,
    undoManager: UndoManager,
    webSocketManager: WebSocketManager|null,
}
const ErrorAsteriskIcon:any = require('../assets/icons/icons8-asterisk-96.png');
const WarningIcon:any = require('../assets/icons/icons8-warning-96.png');

class InfoPanelSensor extends React.Component<InfoPanelSensorProps, any> {

    constructor(props: InfoPanelSensorProps) {
        super(props);
        this.replaceSensor = this.replaceSensor.bind(this);
        this.doReplace = this.doReplace.bind(this);
        this.doNothing = this.doNothing.bind(this);
        this.getBatteryStatus = this.getBatteryStatus.bind(this);
    }


    render(): ReactNode {
        let objectType = ObjectType.MAP_SENSOR;
        if (this.props.sensorModel === undefined) {
            console.error('sensorModel is undefined');
            return null;
        }
        if (this.props.sensorModel.info.location === Location.TRAY) {
            objectType = ObjectType.TRAY_SENSOR;
        }

        let position: string = '';
        if (! isNaN(this.props.nSensorsInSz) && this.props.nSensorsInSz > 1 &&
            ! isNaN(this.props.indexInSz)) {
            switch (this.props.indexInSz) {
                case 0:
                    position = ' (Lead)';
                    break;
                case 1:
                    if (this.props.nSensorsInSz === 2) {
                        position = ' (Trail)';
                    } else if (this.props.nSensorsInSz === 3) {
                        position = ' (Middle)';
                    } else {
                        throw new Error('unexpected nSensorsInSz: ' + this.props.nSensorsInSz);
                    }
                    break;
                case 2:
                    position = ' (Trail)';
                    break;
                default:
                    throw new Error('unexpected indexInSz: ' + this.props.indexInSz);
            }
        }
        const header: string = 'Sensor ' + this.props.dotid + position;
        const warning: string = 'Sensor ' + this.props.dotid + ' is not reporting';
        const sensorZones = Object.values(this.props.topStore.getTopState().sensorZones);
        const stopBarCheck = sensorZones.find(sensorZone => sensorZone.sensorIds.indexOf(this.props.dotid) !== -1)
        const batteryStatus:BatteryStatus = this.getBatteryStatus();
        const dotidCode = (this.props.dotid !== null) ?
            (<React.Fragment>
                {/*
                <ReadOnlyField key={'dotid' + this.props.dotid} label={'ID'}
                               text={this.props.dotid} idName={'dotid' + this.props.dotid}
                               fieldName={'id'} deviceType={objectType} deviceId={this.props.dotid}
                />
                */}
                <ReadOnlyField key={'id64' + this.props.dotid} label={'Factory ID'}
                               idName={'id64' + this.props.dotid}
                               text={this.props.sensorModel.id64}
                               fieldName={'id64'} deviceType={objectType}
                               deviceId={this.props.dotid}
                />
                <ReadOnlyField key={'firmware' + this.props.dotid} label={'Software Version'}
                               idName={'firmware' + this.props.dotid}
                               text={this.props.sensorModel.fwVer === undefined ||
                                     this.props.sensorModel.fwVer === null ?
                                     '' : this.props.sensorModel.fwVer}
                               fieldName={'fwVer'} deviceType={objectType}
                               deviceId={this.props.dotid}
                />
                <ReadOnlyField label='Battery Status'
                               text={InfoPanel.batteryUserViewByBatteryStatus[batteryStatus]}
                               theClassName={batteryStatus === BatteryStatus.GOOD ? 'green' : 'red'}
                               idName='batteryStatusRof'
                               key='batteryStatus'
                               fieldName='batteryStatus'
                               deviceType={ObjectType.MAP_SENSOR}
                               deviceId={this.props.dotid}
                />

                <InputField key={'ccExtension' + this.props.dotid} fieldName={'ccExtension'}
                            idName={'ccExtension' + this.props.dotid} label={'Extension Time'}
                            unit={'msec'} maxLength={5} objectId={this.props.dotid}
                            objectType={objectType}
                            disabled={objectType === ObjectType.TRAY_SENSOR || ((this.props.topStore.state.ap.systemContext === 'SCOOT' || this.props.topStore.state.ap.systemContext === 'MOVA') && stopBarCheck['otype'] !== "GUIStopbarSensorZone")}
                            text={this.props.sensorModel.ccExtension.toString()}
                            characterType={CharacterType.NONNEGATIVE_INTEGER}
                            transformValueToStore={InfoPanel.toNumber}
                            topStore={this.props.topStore} undoManager={this.props.undoManager}/>
                <InputField key={'ccDelay' + this.props.dotid} fieldName={'ccDelay'}
                            idName={'ccDelay' + this.props.dotid} label={'Delay Time'}
                            unit={'msec'} maxLength={5} objectId={this.props.dotid}
                            objectType={objectType}
                            disabled={objectType === ObjectType.TRAY_SENSOR}
                            text={this.props.sensorModel.ccDelay.toString()}
                            characterType={CharacterType.NONNEGATIVE_INTEGER}
                            transformValueToStore={InfoPanel.toNumber}
                            topStore={this.props.topStore} undoManager={this.props.undoManager}/>
                <tr className='readOnlyField'>
                    <td className='right'>
                        <span className='buttonPane'>
                            <AptdButton id={'replace' + this.props.dotid}
                               key={'replace' + this.props.dotid}
                               theClassName='replaceAnchor gray'
                               dataDotid={this.props.dotid}
                               disabled={this.props.sensorModel.info.location === Location.TRAY ||
                                         ! this.props.sensorModel.configured}
                               onClick={this.replaceSensor}
                               text='Replace this Sensor'
                               title=''
                            />
                        </span>
                    </td>
                    <td>
                        {/* a read-only field: */}
                        <input type='text'
                               value={this.props.sensorModel.replacementSensorId === '' ||
                                      this.props.sensorModel.replacementSensorId === undefined ?
                                      '' :
                                      '(with ' + this.props.sensorModel.replacementSensorId + ')'}
                               className='cell readOnlyInput replacementInfo'
                               readOnly={true}
                               disabled={true}
                        />
                    </td>
                </tr>
            </React.Fragment>) : null;

        let dotid = this.props.dotid;
        if (dotid === null) {
            dotid = "";
        }

        return (
            <div className='infoPanelSensor' data-sensorId={dotid}>
                <div className='infoPanelSensorHeader infoPanelHeader'>{header}
                </div>
                <div id='infoPanelSensorGlobalErrors' className='globalErrors'>{this.renderGlobalErrors()}
                </div>
                {(this.props.sensorModel.unheard || ! this.props.sensorModel.seen) &&
                    <span id='infoPanelUnheardWarning'>
                        <img src={WarningIcon} width={17} alt={'unheard'}></img>
                        {warning}
                    </span>
                }
                <RssiSlider
                    id={dotid}
                    deviceModel={this.props.sensorModel}
                    unseen={this.props.sensorModel.unheard || ! this.props.sensorModel.seen}
                    topStore={this.props.topStore}
                />
                <table className='sensorForm'>
                    <tbody>
                        {dotidCode}
                    </tbody>
                </table>
                <hr/>
            </div>
        )
    }

    private replaceSensor(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        console.debug('replaceSensor(): event:', event.target, event.currentTarget);
        if (event.target === null) {
            console.error('null event.target');
            return;
        }
        const target: HTMLAnchorElement = event.target as HTMLAnchorElement;
        const dotid:string|undefined = target.dataset['dotid'];
        if (dotid === undefined) {
            console.error('dotid is undefined');
            return;
        }
        const replacementNode: ReactNode =
            <>
                <form id='popupForm'>
                    <table>
                        <tbody>
                            <tr className='inputField row'>
                                <td>
                                    <label htmlFor='replacementIdInput'
                                           className='cell label inputLabel right'>
                                        Replacement ID
                                    </label>
                                </td>
                                <td>
                                    <input id='replacementIdInput' className='cell inputText'
                                           type='text' maxLength={4}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </form>
            </>
        this.props.topStore.showModal(ModalType.TWO_BUTTON, 'To replace Sensor ' + dotid + ', please enter the 4 character ID of the Sensor you will use to replace it. The replacement Sensor must appear in the Tray.  (After you SAVE, the replacement Sensor will take on the ID ' + dotid + '.)',
            ['Cancel', 'Replace'],
            [this.doNothing, this.doReplace],
            replacementNode, undefined, InfoPanelSensor.focusOnInput);
    }

    private static focusOnInput():void {
        const replacementIdInput: HTMLElement|null =
            document.getElementById('replacementIdInput');
        if (replacementIdInput !== null) {
            replacementIdInput.focus();
            console.debug('focusOnInput(): focused on replacementIdInput');
        } else {
            console.error('focusOnInput(): replacmentIdInput is null');
        }
    }

    private doReplace() {
        console.debug('doReplace(): dotid=', this.props.dotid);
        if (this.props.dotid === null) {
            console.error('dotid is null');
            return;
        }
        // validate replacement id
        const inputElt: HTMLInputElement = document.getElementById('replacementIdInput') as HTMLInputElement;
        const replacementId: string = inputElt.value.toUpperCase();
        if (! this.isSensorInTray(replacementId)) {
            this.props.topStore.dismissModal();
            this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'Replacement ID must be a 4 character dot ID of a Sensor in the Tray');
            return;
        }
        // update topStore
        this.props.undoManager.enactActionsToStore({
            actions: [{
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.MAP_SENSOR,
                newData: {
                    replacementSensorId: replacementId,
                },
                objectId: this.props.dotid,
                origData: {
                    replacementSensorId: this.props.sensorModel.replacementSensorId,
                }
            }],
            description: 'Replace Sensor',
        }, EnactType.USER_ACTION);

        this.props.topStore.dismissModal();
    }

    private isSensorInTray(dotid: string): boolean {
        const device: GUISensorClient|GUIRepeaterClient =
            this.props.topStore.getTopState().trayDevices[dotid];
        if (device === undefined || device === null) {
            return false;
        }
        return device.otype === 'GUISensor';
    }

    private doNothing() {
        this.props.topStore.dismissModal();
    }

    private renderGlobalErrors(): ReactNode[] {
        let result: ReactNode[] = [];
        if (this.props.dotid === null) {
            console.error('unexpected null dotid');
            return result;
        }
        const errorKey: string = ValidationManager.makeInfoPanelKey(ObjectType.MAP_SENSOR, this.props.dotid);
        const globalErrors: string[] = this.props.topStore.getTopState().validationGlobalErrors[errorKey];
        if (globalErrors !== undefined) {
            for (let errno = 0; errno < globalErrors.length; errno++) {
                if (errno > 0) {
                    result.push('<br>');
                }
                result.push(
                    <span className='globalError' key={errno.toString()}>
                        <img src={ErrorAsteriskIcon} width={17} alt={'error'}></img>
                        {globalErrors[errno]}
                    </span>
                );
            }
        }
        return result;
    }

    private getBatteryStatus(): BatteryStatus {
        let batteryStatus: BatteryStatus|undefined;
        if (this.props.topStore.getTopState().ap === null) {
            batteryStatus = BatteryStatus.UNKNOWN;
        } else if (this.props.sensorModel.voltage === -1) {
            batteryStatus = BatteryStatus.UNKNOWN;
        } else if (this.props.sensorModel.voltage < this.props.topStore.getTopState().ap!.sensorLowBatteryThreshold) {
            batteryStatus = BatteryStatus.REPLACE;
        } else {
            batteryStatus = BatteryStatus.GOOD;
        }
        return batteryStatus;
    }
}

export default InfoPanelSensor;
