import React, {ReactNode} from 'react';
import SelectField, {Option} from '../fields/SelectField';
import ReadOnlyField from "../fields/ReadOnlyField";
import {
    BatteryStatus,
    EnactType,
    GUIRadioClient,
    GUIRepeaterClient,
    GUISensorClient,
    ModalType,
    ObjectType,
    UpdateType
} from "../AptdClientTypes";
import {ChannelMode, getSNHardwareType, Location} from "../AptdServerTypes";
import TopStore from "../TopStore";
import UndoManager from "../UndoManager";
import ValidationManager from "../ValidationManager";
import RssiSlider from '../widgets/RssiSlider';
import CheckboxField from "../fields/CheckboxField";
import RadioButtonGroupField from "../fields/RadioButtonGroupField";
import './InfoPanel.css';
import './InfoPanelRepeater.css';
import InfoPanel from "./InfoPanel";
import AptdButton from "../AptdButton";
import WebSocketManager from "../WebSocketManager";


interface InfoPanelRepeaterProps {
    repeaterId: string,
    repeaterModel: GUIRepeaterClient,
    topStore: TopStore,
    undoManager: UndoManager,
}

interface InfoPanelRepeaterState {
    desiredDownstreamChannel: string,
}

const ErrorAsteriskIcon:any = require('../assets/icons/icons8-asterisk-96.png');
const WarningIcon:any = require('../assets/icons/icons8-warning-96.png');

/**
 * this version uses local state. We keep top-level state in AptdApp as the
 * source of *verified* truth, but need local state to reflect user input,
 * in case where user makes errors.  Local state is in InputField components.
 */
class InfoPanelRepeater extends React.Component<InfoPanelRepeaterProps, InfoPanelRepeaterState> {
    private repeaterId: string;
    private channelOptions: Array<Option>;
    private readonly allChannelOptions: Array<Option>;
    private readonly autoValue:string = 'AUTO';

    private readonly downstreamAntennaOptions: Array<Option>;
    private readonly repeaterBrandNameBySNHardwareType: {[key:string]: string} = {
        "RPT1": "Original Repeater",       // no longer in production
        "RPT2": "Long-life Repeater",
        "RPT3": "FLEX Repeater",
        "RPT4": "FlexNode Line Powered",
        "RPT5": "FlexRepeat3 Solar",
    };
    private readonly batteryStatusOptions: Array<Option>;


    constructor(props: InfoPanelRepeaterProps) {
        super(props);
        console.debug('lifecycle constructor(): start. this.props.repeaterId=', props.repeaterId);
        this.repeaterId = this.props.repeaterId;  // hidden unique id#

        // state is copied from props szModel
        this.state = {
            desiredDownstreamChannel: this.props.repeaterModel.desiredDownstreamChannel,
        };

        this.replaceRepeater = this.replaceRepeater.bind(this);
        this.doReplace = this.doReplace.bind(this);
        this.doNothing = this.doNothing.bind(this);
        this.getBatteryStatus = this.getBatteryStatus.bind(this);

        let autoText = 'Auto';
        if (this.props.repeaterModel.knownDownstreamChannel !== '-1') {
            autoText += ' (currently ' + this.props.repeaterModel.knownDownstreamChannel + ')';
        }
        this.allChannelOptions = [
            {value: this.autoValue, text: autoText},
            {value: '0', text: '0'},
            {value: '1', text: '1'},
            {value: '2', text: '2'},
            {value: '3', text: '3'},
            {value: '4', text: '4'},
            {value: '5', text: '5'},
            {value: '6', text: '6'},
            {value: '7', text: '7'},
            {value: '8', text: '8'},
            {value: '9', text: '9'},
            {value: '10', text: '10'},
            {value: '11', text: '11'},
            {value: '12', text: '12'},
            {value: '13', text: '13'},
            {value: '14', text: '14'},
            {value: '15', text: '15'},
        ];
        this.channelOptions = [];
        this.downstreamAntennaOptions = [
            {value: 'INTERNAL', text: 'Internal'},
            {value: 'EXTERNAL', text: 'External'},
        ];
        this.batteryStatusOptions = [
            {value: 'GOOD', text: 'Good'},
            {value: 'REPLACE', text: 'Replace Device!'},
        ];
    }

    render() {
        const header = 'Repeater ' + this.props.repeaterId;
        const warning: string = 'Repeater ' + this.props.repeaterId + ' is not reporting'
        const key = 'repeaterChannel_' + this.props.repeaterId;
        const downstreamChannelString = (this.props.repeaterModel.channelMode === ChannelMode.AUTO ||
            this.props.repeaterModel.desiredDownstreamChannel === '-1') ?
            ChannelMode.AUTO : this.props.repeaterModel.desiredDownstreamChannel;

        /* desiredUpstreamChannel will be either the rf parent's desired channel, if manual,
         * or the rf parent's known channel, if rf parent's desired channel is AUTO. */
        const desiredUpstreamChannel:string =
            WebSocketManager.calcDesiredUpstreamChannel(this.props.repeaterModel, this.props.topStore);

        let deviceType = ObjectType.MAP_REPEATER;
        if (this.props.repeaterModel.info.location === Location.TRAY) {
            deviceType = ObjectType.TRAY_REPEATER;
        }

        let hwVersionNumber: number = this.props.repeaterModel.hwVersion;
        let hwEnum: string = getSNHardwareType(hwVersionNumber);
        let hwVersion: string = this.getRepeaterBrandName(hwEnum);
        if (hwVersionNumber === -1 || hwVersionNumber === 0 || hwVersion === null) {
            hwVersion = "";
        }
       
        let swVersionNumber = this.props.repeaterModel.swVersion;
        let swVersion: string = this.props.repeaterModel.swVersion.toString();
        if (swVersionNumber === -1 || swVersionNumber === 0) {
            swVersion = "";
        }

        if (this.props.repeaterModel.info.location !== Location.TRAY) {
            this.channelOptions = this.disableDisallowedOptions(this.props.repeaterId, this.allChannelOptions);
        }

        const batteryStatus: BatteryStatus = this.getBatteryStatus();

        return (
            <div id='infoPanelRepeater'>
                <div id='infoPanelRepeaterHeader' className="infoPanelHeader">{header}
                </div>
                <div id='infoPanelRepeaterGlobalErrors' className='globalErrors'>
                    {this.renderGlobalErrors()}
                </div>
                {(this.props.repeaterModel.unheard || ! this.props.repeaterModel.seen) &&
                    <span id='infoPanelUnheardWarning'>
                        <img src={WarningIcon} width={17} alt={'unheard'}></img>
                        {warning}
                    </span>
                }
                <RssiSlider
                    id={this.props.repeaterId}
                    deviceModel={this.props.repeaterModel}
                    unseen={this.props.repeaterModel.unheard || ! this.props.repeaterModel.seen}
                    topStore={this.props.topStore}
                />
                <div id='repeaterForm'>
                    <table>
                        <tbody>
                        <tr><td><b/></td><td></td></tr>
                        {/*
                        <ReadOnlyField label={'ID'} text={this.props.repeaterId}
                                       idName={'repeaterID'} fieldName={'repeaterID'}
                                       deviceType={deviceType} deviceId={this.props.repeaterId}
                        />
                        */}
                        <ReadOnlyField label={'Factory ID'} text={this.props.repeaterModel.id64}
                                       idName={'repeaterID64'} fieldName={'id64'}
                                       deviceType={deviceType} deviceId={this.props.repeaterId}
                        />

                        {/* desiredUpstreamChannel will be either the rf parent's desired channel, if manual,
                          * or the rf parent's known channel, if rf parent's desired channel is AUTO. */}
                        <ReadOnlyField label={'Upstream Channel'}
                                     text={desiredUpstreamChannel}
                                     key={'repeaterUpstreamChannel_' + this.props.repeaterId}
                                     idName={'repeaterUpstreamChannel_' + this.props.repeaterId}
                                     fieldName='upstreamChannel'
                                     deviceType={deviceType}
                                     deviceId={this.props.repeaterId}
                        />
                        <SelectField label={'Downstream Channel'}
                                     value={downstreamChannelString}
                                     key={key}
                                     options={this.channelOptions}
                                     idName={key}
                                     className={'repeaterDownstreamChannel'}
                                     fieldName='desiredDownstreamChannel'
                                     objectType={deviceType}
                                     disabled={deviceType === ObjectType.TRAY_REPEATER}
                                     objectId={this.props.repeaterId}
                                     transformValueToStore={this.transformDownstreamChannelValueToStore}
                                     topStore={this.props.topStore}
                                     undoManager={this.props.undoManager}
                        />
                        {/* TODO: hwVersion and swVersion need further formatting as types or dotted notation */}
                        <ReadOnlyField label={'Hardware Version'}
                                       text={hwVersion}
                                       key={'repeaterHwVersion_' + this.props.repeaterId}
                                       idName={'repeaterHwVersion_' + this.props.repeaterId}
                                       fieldName='hwVersion'
                                       deviceType={deviceType}
                                       deviceId={this.props.repeaterId}
                        />
                        <ReadOnlyField label={'Software Version'}
                                       text={this.props.repeaterModel.fwVer === undefined ||
                                             this.props.repeaterModel.fwVer === null ?
                                             '' : this.props.repeaterModel.fwVer}
                                       key={'repeaterSwVersion_' + this.props.repeaterId}
                                       idName={'repeaterSwVersion_' + this.props.repeaterId}
                                       fieldName='fwVer'
                                       deviceType={deviceType}
                                       deviceId={this.props.repeaterId}
                        />
                        <ReadOnlyField label='Battery Status'
                                       text={InfoPanel.batteryUserViewByBatteryStatus[batteryStatus]}
                                       theClassName={batteryStatus === BatteryStatus.GOOD ? 'green' : 'red'}
                                       idName='batteryStatusRof'
                                       key='batteryStatus'
                                       fieldName='batteryStatus'
                                       deviceType={ObjectType.MAP_REPEATER}
                                       deviceId={this.props.repeaterId}
                        />

                        <tr className='readOnlyField'>
                            <td className='right'>
                                <span className='buttonPane'>
                                    <AptdButton
                                        id={'replace' + this.props.repeaterId}
                                        key={'replace' + this.props.repeaterId}
                                        theClassName='replaceAnchor gray'
                                        dataDotid={this.props.repeaterId}
                                        disabled={this.props.repeaterModel.info.location === Location.TRAY ||
                                                  ! this.props.repeaterModel.configured}
                                        onClick={this.replaceRepeater}
                                        text='Replace this Repeater'
                                        title=''
                                    />
                                </span>
                            </td>
                            <td>
                                {/* a read-only field: */}
                                <input id='replacementInfo' type='text'
                                       value={this.props.repeaterModel.replacementRepeaterId === '' ||
                                       this.props.repeaterModel.replacementRepeaterId === undefined ?
                                           '' :
                                           '(with ' + this.props.repeaterModel.replacementRepeaterId + ')'}
                                       className='cell readOnlyInput'
                                       readOnly={true}
                                       disabled={true}
                                />
                            </td>
                        </tr>

                        <tr>
                            <td colSpan={2}>
                                <br/>
                                <h4>Antenna(s)</h4>
                                <hr/>
                            </td>
                        </tr>
                        <CheckboxField label='Dual Antennas'
                                       idName='dualAntennasCB'
                                       key='dualAntennasCB'
                                       fieldName='dualAntenna'
                                       value={this.props.repeaterModel.dualAntenna}
                                       objectType={ObjectType.MAP_REPEATER}
                                       objectId={this.props.repeaterId}
                                       disabled={true}
                                       className='cell readOnlyInput'
                                       topStore={this.props.topStore}
                                       undoManager={this.props.undoManager}
                        />
                        <RadioButtonGroupField label='Downstream Antenna'
                                               disabled={deviceType === ObjectType.TRAY_REPEATER ||
                                                         ! this.props.repeaterModel.dualAntenna}
                                               value={this.props.repeaterModel.downstreamAntenna}
                                               idName='downstreamAntennaRbg'
                                               key='downstreamAntennaRbg'
                                               className='downstreamAntennaRbg'
                                               fieldName='downstreamAntenna'
                                               options={this.downstreamAntennaOptions}
                                               objectType={ObjectType.MAP_REPEATER}
                                               objectId={this.props.repeaterId}
                                               topStore={this.props.topStore}
                                               undoManager={this.props.undoManager}
                        />
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }


    private replaceRepeater(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        console.debug('replaceRepeater(): event:', event.target, event.currentTarget);
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
        this.props.topStore.showModal(ModalType.TWO_BUTTON, 'To replace Repeater ' + dotid + ', please enter the 4 character ID of the Repeater you will use to replace it. The replacement Repeater must appear in the Tray.  (After you SAVE, the replacement Repeater will take on the ID ' + dotid + '.)',
            ['Cancel', 'Replace'],
            [this.doNothing, this.doReplace],
            replacementNode, undefined, InfoPanelRepeater.focusOnInput);
    }

    /** is identical to InfoPanelSensor.focusOnInput() */
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
        console.debug('doReplace(): repeaterId=', this.props.repeaterId);
        if (this.props.repeaterId === null) {
            console.error('repeaterId is null');
            return;
        }
        // validate replacement id
        const inputElt: HTMLInputElement = document.getElementById('replacementIdInput') as HTMLInputElement;
        const replacementId: string = inputElt.value.toUpperCase();
        if (! this.isRepeaterInTray(replacementId)) {
            this.props.topStore.dismissModal();
            this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'Replacement ID must be a 4 character dot ID of a Repeater in the Tray');
            return;
        }
        // update topStore
        this.props.undoManager.enactActionsToStore({
            actions: [{
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.MAP_REPEATER,
                newData: {
                    replacementRepeaterId: replacementId,
                },
                objectId: this.props.repeaterId,
                origData: {
                    replacementRepeaterId: this.props.repeaterModel.replacementRepeaterId,
                }
            }],
            description: 'Replace Repeater',
        }, EnactType.USER_ACTION);

        this.props.topStore.dismissModal();
    }

    private isRepeaterInTray(dotid: string): boolean {
        const device: GUISensorClient|GUIRepeaterClient =
            this.props.topStore.getTopState().trayDevices[dotid];
        if (device === undefined || device === null) {
            return false;
        }
        return device.otype === 'GUIRepeater';
    }

    private doNothing() {
        this.props.topStore.dismissModal();
    }


    private renderGlobalErrors(): ReactNode[] {
        let result: ReactNode[] = [];
        if (this.props.repeaterId === null || this.props.repeaterId === undefined) {
            console.error('unexpected null repeaterId');
            return result;
        }
        const errorKey: string = ValidationManager.makeInfoPanelKey(ObjectType.MAP_REPEATER, this.props.repeaterId);
        const globalErrors: string[] = this.props.topStore.getTopState().validationGlobalErrors[errorKey];
        if (globalErrors !== undefined) {
            for (let errno = 0; errno < globalErrors.length; errno++) {
                if (errno > 0) {
                    //result.push(<br/>);
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

    transformDownstreamChannelValueToStore(downstreamChannelValue:string):{[fieldName:string]: string} {
        let newChannel: string;
        let newChannelMode: string;
        if (downstreamChannelValue === 'AUTO') {
            newChannel = '-1';
            newChannelMode = ChannelMode.AUTO;
        } else {
            const channel:number = +downstreamChannelValue;
            if (channel >=0 && channel <=15) {
                newChannel = downstreamChannelValue.toString();
                newChannelMode = ChannelMode.MANUAL;
            } else {
                console.error('unexpected downstreamChannelValue', downstreamChannelValue);
                newChannel = '-1';
                newChannelMode = ChannelMode.AUTO;
            }
        }
        return {desiredDownstreamChannel: newChannel,
                channelMode: newChannelMode};
    }

    private getRepeaterBrandName(hwEnum: string): string {
        let repeaterName: string = this.repeaterBrandNameBySNHardwareType[hwEnum];
        if (repeaterName === null || repeaterName === undefined) {
            repeaterName = '';
        }
        return repeaterName;
    }

    private getBatteryStatus(): BatteryStatus {
        let batteryStatus: BatteryStatus;
        if (this.props.topStore.getTopState().ap === null) {
            batteryStatus = BatteryStatus.UNKNOWN;
        } else if (this.props.repeaterModel.voltage === -1) {
            batteryStatus = BatteryStatus.UNKNOWN;
        } else if (this.props.repeaterModel.voltage < this.props.topStore.getTopState().ap!.repeaterLowBatteryThreshold) {
            batteryStatus = BatteryStatus.REPLACE;
        } else {
            batteryStatus = BatteryStatus.GOOD;
        }
        return batteryStatus;
    }

    /**
     * @returns copy of allChannelOptions where disabled is set for those that are disallowed
     *          by being already in use by some radio or another repeater (downstream) or
     *          this repeater's current upstream channel
     */
    private disableDisallowedOptions(repeaterId: string, allChannelOptions: Array<Option>): Array<Option> {
        const topState = this.props.topStore.getTopState();
        const thisRepeater:GUIRepeaterClient = topState.mapRepeaters[repeaterId];
        const otherRepeaterDesiredDownstreamChannels: number[] =
            Object.keys(topState.mapRepeaters)
                .map((mapRepeaterId:string) => {
                    const mapRepeater:GUIRepeaterClient = topState.mapRepeaters[mapRepeaterId];
                    return (mapRepeaterId === repeaterId ? -1 :
                        (mapRepeater.channelMode === ChannelMode.MANUAL) ?
                        +mapRepeater.desiredDownstreamChannel : +mapRepeater.knownDownstreamChannel);
                });
        const otherRepeaterKnownDownstreamChannels: number[] =
            Object.keys(topState.mapRepeaters)
                .map((mapRepeaterId:string) => {
                    const mapRepeater:GUIRepeaterClient = topState.mapRepeaters[mapRepeaterId];
                    return (mapRepeaterId === repeaterId ? -1 : +mapRepeater.knownDownstreamChannel);
                });
        const allRadioDesiredChannels: number[] =
            Object.keys(topState.radios)
                .map((mapRadioId:string) => {
                    const radio:GUIRadioClient = topState.radios[mapRadioId];
                    return ((radio.channelMode === ChannelMode.MANUAL) ?
                        +radio.desiredChannel : +radio.knownChannel);
                });
        const allRadioKnownChannels: number[] =
            Object.keys(topState.radios)
                .map((mapRadioId:string) => {
                    const radio:GUIRadioClient = topState.radios[mapRadioId];
                    return +radio.knownChannel;
                });
        const forbiddenChannelArray:number[] =
            otherRepeaterDesiredDownstreamChannels
                .concat(otherRepeaterKnownDownstreamChannels)
                .concat(allRadioDesiredChannels)
                .concat(allRadioKnownChannels)
                .concat(thisRepeater.knownUpstreamChannel)
                .filter((channel:number) => (channel !== -1));
        const forbiddenChannelsSet: Set<number> = new Set<number>(forbiddenChannelArray);
        console.debug('InfoPanelRepeater.disableDisallowedOptions(): forbiddenChannelsSet=', forbiddenChannelsSet);

        // 'AUTO' option is always allowed
        const allowedOptions:Option[] = allChannelOptions.filter((option) =>
            (option.value === this.autoValue || ! forbiddenChannelsSet.has(+option.value)));
        //console.debug('disableDisallowedOptions(): allowedOptions=', allowedOptions);
        const allowedOptionByValue:{[value:string]:Option} = {};
        allowedOptions.forEach((option:Option) => {allowedOptionByValue[option.value] = option});
        //console.debug('disableDisallowedOptions(): allowedOptionByValue=', allowedOptionByValue);
        return allChannelOptions.map((option:Option) =>
            ({...option, disabled: (allowedOptionByValue[option.value] === undefined)}));
    }

}

export default InfoPanelRepeater;
