import React, {ReactNode} from 'react';
import './InfoPanelCCBasic.css';
import SelectField, {Option} from "../fields/SelectField";
import Note from "../fields/Note";
import {GUICCInterfaceBaseClient, ModalType, ObjectType} from "../AptdClientTypes";
import {
    CCChanEnableOption,
    CCHoldover,
    ChannelNumber,
    DelayExtOption,
    DelayTime,
    ExtensionTime,
    GUICCChannel,
    GUICCChannelBase,
    Interface,
    PPMode
} from "../AptdServerTypes";
import CheckboxField from "../fields/CheckboxField";
import ReadOnlyField from "../fields/ReadOnlyField";
import TopStore from "../TopStore";
import UndoManager from "../UndoManager";
import WebSocketManager from "../WebSocketManager";
import InfoPanelCC from "./InfoPanelCC";


interface InfoPanelCCBasicProps {
    ccId: string,
    ccModel: GUICCInterfaceBaseClient,
    /** bankNo is only used for SDLC */
    bankNo?: number,
    topStore: TopStore,
    undoManager: UndoManager,
    webSocketManager: WebSocketManager | null,
}

interface InfoPanelCCBasicState {
    ccModel: GUICCInterfaceBaseClient,
}


/**
 * This InfoPanel is used for CC/EX Card and for SDLC Bank (where SDLC=FlexConnect).
 * When used for CC/EX card, it shows a table of updatable channel info for 4 channels.
 * When used for SDLC "Bank", it shows a table of updatable channel info for 16 channels for a "bank"
 */
class InfoPanelCCBasic extends React.Component<InfoPanelCCBasicProps, InfoPanelCCBasicState> {
    private enabledOptions: Array<Option>;
    private ppOptions: Array<Option>;
    private delayExtOptions: Array<Option>;
    private delayTimeOptions: Array<Option>;
    private extTimeOptions: Array<Option>;
    private holdoverOptions: Array<Option>;
    private channelObjectType: ObjectType;

    constructor(props: InfoPanelCCBasicProps) {
        super(props);
        console.debug('lifecycle InfoPanelCCBasic constructor(): start. this.props.apId=', this.props.ccModel.id);

        this.state = {
            ccModel: this.props.ccModel
        };
        this.channelObjectType = ObjectType.CC_CHANNEL;
        this.enabledOptions = [{value: CCChanEnableOption.ENABLED, text: 'Enabled'},
            {value: CCChanEnableOption.DISABLED, text: 'Disabled'}];
        this.ppOptions = [{value: PPMode.PRESENSE, text: 'Presence'},
            {value: PPMode.PULSE, text: 'Pulse'}];
        this.delayExtOptions = [{value: DelayExtOption.OFF, text: 'None'},
            {value: DelayExtOption.DELAY, text: 'Delay'},
            {value: DelayExtOption.EXTENSION, text: 'Ext'}];
        this.delayTimeOptions = [{value: DelayTime.T0, text: '0'},
            {value: DelayTime.T1, text: '1'},
            {value: DelayTime.T2, text: '2'},
            {value: DelayTime.T3, text: '3'},
            {value: DelayTime.T4, text: '4'},
            {value: DelayTime.T5, text: '5'},
            {value: DelayTime.T6, text: '6'},
            {value: DelayTime.T7, text: '7'},
            {value: DelayTime.T8, text: '8'},
            {value: DelayTime.T9, text: '9'},
            {value: DelayTime.T10, text: '10'},
            {value: DelayTime.T11, text: '11'},
            {value: DelayTime.T12, text: '12'},
            {value: DelayTime.T13, text: '13'},
            {value: DelayTime.T14, text: '14'},
            {value: DelayTime.T15, text: '15'},
            {value: DelayTime.T16, text: '16'},
            {value: DelayTime.T17, text: '17'},
            {value: DelayTime.T18, text: '18'},
            {value: DelayTime.T19, text: '19'},
            {value: DelayTime.T20, text: '20'},
            {value: DelayTime.T21, text: '21'},
            {value: DelayTime.T22, text: '22'},
            {value: DelayTime.T23, text: '23'},
            {value: DelayTime.T24, text: '24'},
            {value: DelayTime.T25, text: '25'},
            {value: DelayTime.T26, text: '26'},
            {value: DelayTime.T27, text: '27'},
            {value: DelayTime.T28, text: '28'},
            {value: DelayTime.T29, text: '29'},
            {value: DelayTime.T30, text: '30'},
            {value: DelayTime.T31, text: '31'},
        ];
        this.extTimeOptions = [
            {value: ExtensionTime.T0, text: '0'},
            {value: ExtensionTime.T0_5, text: '0.5'},
            {value: ExtensionTime.T1, text: '1'},
            {value: ExtensionTime.T1_5, text: '1.5'},
            {value: ExtensionTime.T2, text: '2'},
            {value: ExtensionTime.T2_5, text: '2.5'},
            {value: ExtensionTime.T3, text: '3'},
            {value: ExtensionTime.T3_5, text: '3.5'},
            {value: ExtensionTime.T4, text: '4'},
            {value: ExtensionTime.T4_5, text: '4.5'},
            {value: ExtensionTime.T5, text: '5'},
            {value: ExtensionTime.T5_5, text: '5.5'},
            {value: ExtensionTime.T6, text: '6'},
            {value: ExtensionTime.T6_5, text: '6.5'},
            {value: ExtensionTime.T7, text: '7'},
            {value: ExtensionTime.T7_5, text: '7.5'},
        ];
        this.holdoverOptions = [
            {value: CCHoldover.T0, text: '0'},
            {value: CCHoldover.T005, text: '0.05'},
            {value: CCHoldover.T010, text: '0.10'},
            {value: CCHoldover.T015, text: '0.15'},
            {value: CCHoldover.T020, text: '0.20'},
            {value: CCHoldover.T025, text: '0.25'},
            {value: CCHoldover.T030, text: '0.30'},
            {value: CCHoldover.T035, text: '0.35'},
            {value: CCHoldover.T040, text: '0.40'},
            {value: CCHoldover.T045, text: '0.45'},
            {value: CCHoldover.T050, text: '0.50'},
            {value: CCHoldover.T055, text: '0.55'},
            {value: CCHoldover.T060, text: '0.60'},
            {value: CCHoldover.T065, text: '0.65'},
            {value: CCHoldover.T070, text: '0.70'},
            {value: CCHoldover.T075, text: '0.75'},
        ];

        this.renderChannel = this.renderChannel.bind(this);
        this.renderDelayOrExtTime = this.renderDelayOrExtTime.bind(this);
        this.sendIdentifyCard = this.sendIdentifyCard.bind(this);
    }


    render():ReactNode {
        const channels:{[channelNumber:string]: GUICCChannelBase} = this.props.ccModel.channelsById;
        let channelKeys: string[] = new Array<string>();
        let firmwareVersionText:string;
        switch (this.props.ccModel.cardInterface) {
            case Interface.CCCard:
            case Interface.EXCard:
                // assert: channelKeys are always [CH_1, ... CH_4] or [CH_1, CH_2]
                channelKeys = Object.keys(channels).sort();
                this.channelObjectType = ObjectType.CC_CHANNEL;
                firmwareVersionText = this.props.ccModel.minorFirmwareVersion.toString();
                break;
            case Interface.SDLC:
                this.channelObjectType = ObjectType.SDLC_CHANNEL;
                for (let channelNo of Object.values(ChannelNumber)) {
                    const key = 'B' + this.props.bankNo + '-' + channelNo;
                    if (channels[key] !== null) {
                        channelKeys.push(key);
                    }
                }
                // Q: do we need to sort the channelKeys?
                // A: no: already sorted

                // Note firmwareVersion has special format for SDLC only: major-minor. Why?
                firmwareVersionText = "" + this.props.ccModel.majorFirmwareVersion +
                                      "-" + this.props.ccModel.minorFirmwareVersion;
                break;
            default:
                console.error('unexpected cardInterface: ' + this.props.ccModel.cardInterface);
                return null;
        }

        return (
            <div id='infoCCBasic'>
                <div id='ccBasicForm'>
                    <table>
                        <tbody>
                            <ReadOnlyField label={'Firmware Version'}
                                           text={firmwareVersionText}
                                           idName={'firmwareVersion'}
                                           fieldName={'firmwareVersion'}
                                           deviceType={ObjectType.CCCARD}
                                           deviceId={this.props.ccModel.id}
                            />
                            <tr>
                                <td colSpan={2}>
                                    {this.props.ccModel.cardInterface === Interface.SDLC ? null :
                                    <React.Fragment>
                                        <button onClick={this.sendIdentifyCard}>Identify Card</button>
                                        <Note
                                            text={'Flashes LED light on the card itself'}
                                            idName={'idcardNote'}
                                        />
                                    </React.Fragment>
                                }
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <br/>
                    <table id='notesTable'>
                    <tbody>
                        <tr>
                            <td><strong>Enable Channel. </strong>
                                If checked, enables the channel.
                            </td>
                        </tr>
                        <tr>
                            <td><strong>During Detect. </strong>
                                Typical value is Presence.
                            </td>
                        </tr>
                        <tr>
                            <td><strong>Time for Delay/Ext. </strong>
                                Number of seconds of delay added to initial detection (Delay) or to end of detection (Extension)
                            </td>
                        </tr>
                        <tr>
                            <td><strong>Holdover. </strong>
                                Same as Extension, but offering smaller time choices
                            </td>
                        </tr>
                    </tbody>
                    </table>
                    <br/>
                    <table id='channelsTable'>
                        <thead>
                            <tr id='colHeaders' className='row'>
                                <th className='cell'>Chan No.</th>
                                <th className='cell'>Enable Channel</th>
                                <th className='cell'>During Detect</th>
                                <th className='cell'>Delay / Extension</th>
                                <th className='cell'>Time for Delay / Ext (secs)</th>
                                <th className='cell'>Holdover (secs)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                channelKeys.map(this.renderChannel)
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    private renderChannel(channelNo: string):ReactNode {
        const channelsById:{[channelNumber:string]: GUICCChannelBase} = this.props.ccModel.channelsById;
        const channel: GUICCChannel = channelsById[channelNo] as GUICCChannel;
        const sensorDotIds: string[] = channel.sensors;
        const sensorInfo: ReactNode = 
            InfoPanelCC.renderSensorsForChannel(sensorDotIds, channelNo, this.props.topStore.getTopState(), this.props.topStore, this.props.undoManager, channel);
        const channelHtml: ReactNode =
            <React.Fragment key={channelNo}>
                <tr id='chNums' key={channelNo} className={'row'}>
                    <td key={channelNo}
                          className={'cell'}>Ch {InfoPanelCCBasic.toNum(channel.channelNumber)}
                    </td>
                    <CheckboxField
                        label={'Channel Enabled'}
                        showLabel={false}
                        value={channel.enabled === CCChanEnableOption.ENABLED}
                        className={'chEnabled'}
                        objectId={channel.id}
                        objectType={this.channelObjectType}
                        fieldName={'enabled'}
                        row={false}
                        idName={'chEnabled' + channelNo}
                        key={'chEnabled' + channelNo}
                        options={this.enabledOptions}
                        transformValueToStore={this.transformValueToStore}
                        topStore={this.props.topStore}
                        undoManager={this.props.undoManager}
                    />
                    <SelectField label={'Presence/Pulse'}
                                 showLabel={false}
                                 showErrorTd={false}
                                 value={channel.ppMode}
                                 className={'chPpMode'}
                                 objectId={channel.id}
                                 objectType={this.channelObjectType}
                                 fieldName={'ppMode'}
                                 row={false}
                                 idName={'chPpMode' + channelNo}
                                 key={'chPpMode' + channelNo}
                                 options={this.ppOptions}
                                 topStore={this.props.topStore}
                                 undoManager={this.props.undoManager}
                    />
                    <SelectField label={'Delay/Extension'}
                                 showLabel={false}
                                 showErrorTd={false}
                                 value={channel.delayExtOption}
                                 className={'chDelayExt'}
                                 objectId={channel.id}
                                 objectType={this.channelObjectType}
                                 fieldName={'delayExtOption'}
                                 row={false}
                                 idName={'chDelayExt' + channelNo}
                                 key={'chDelayExt' + channelNo}
                                 options={this.delayExtOptions}
                                 topStore={this.props.topStore}
                                 undoManager={this.props.undoManager}
                    />
                    {this.renderDelayOrExtTime(channelNo)}

                    <SelectField label={'Holdover'}
                                 showLabel={false}
                                 showErrorTd={false}
                                 value={channel.holdover}
                                 className={'chHoldover'}
                                 objectId={channel.id}
                                 objectType={this.channelObjectType}
                                 fieldName={'holdover'}
                                 row={false}
                                 idName={'chHoldover' + channelNo}
                                 key={'chHoldover' + channelNo}
                                 options={this.holdoverOptions}
                                 //unit={'secs'}
                                 disabled={channel.delayExtOption === DelayExtOption.EXTENSION ||
                                           channel.delayExtOption === DelayExtOption.DELAY}
                                 topStore={this.props.topStore}
                                 undoManager={this.props.undoManager}
                    />
                </tr>
                {sensorInfo}
            </React.Fragment>;
        return channelHtml;
    }


    private renderDelayOrExtTime(channelNo: string): ReactNode {
        let channels:{[channelNumber:string]: GUICCChannelBase} = this.props.ccModel.channelsById;
        const channel: GUICCChannel = channels[channelNo] as GUICCChannel;
        let result: ReactNode;
        switch (channel.delayExtOption) {
            case DelayExtOption.DELAY:
                result = <SelectField label={'Time for Delay/Ext (seconds)'}
                                      showLabel={false}
                                      showErrorTd={false}
                                      value={channel.delayTime}
                                      className={'chDelayTime'}
                                      objectId={channel.id}
                                      objectType={this.channelObjectType}
                                      fieldName={'delayTime'}
                                      row={false}
                                      idName={'ccDelayTime'}
                                      key={'chDelayTime' + channelNo}
                                      options={this.delayTimeOptions}
                                      // unit={'secs'}
                                      topStore={this.props.topStore}
                                      undoManager={this.props.undoManager}
                />;
                break;
            case DelayExtOption.EXTENSION:
                result = <SelectField label={'Time for Delay/Ext (seconds)'}
                                      showLabel={false}
                                      showErrorTd={false}
                                      value={channel.extTime}
                                      className={'chExtTime'}
                                      objectId={channel.id}
                                      objectType={this.channelObjectType}
                                      fieldName={'extTime'}
                                      row={false}
                                      idName={'ccExtTime'}
                                      key={'chExtTime' + channelNo}
                                      options={this.extTimeOptions}
                                      // unit={'secs'}
                                      topStore={this.props.topStore}
                                      undoManager={this.props.undoManager}
                          />;
                break;
            case DelayExtOption.OFF:
                result = <SelectField label={'Time for Delay/Ext (seconds)'}
                                      showLabel={false}
                                      showErrorTd={false}
                                      disabled={true}
                                      value={channel.delayTime}
                                      className={'chDelayTime'}
                                      objectId={channel.id}
                                      objectType={this.channelObjectType}
                                      fieldName={'delayTime'}
                                      row={false}
                                      idName={'chDelayTime' + channelNo}
                                      key={'chDelayTime' + channelNo}
                                      options={this.delayTimeOptions}
                                      // unit={'secs'}
                                      topStore={this.props.topStore}
                                      undoManager={this.props.undoManager}
                          />;
                break;
            default:
                throw new Error('unexpected DelayExtOption: ' + channel.delayExtOption);
        }
        return result;
    }

    private sendIdentifyCard() {
        if (this.props.webSocketManager === null) {
            console.error('websocketManager is null');
            this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'SensConfig is unable to connect.');
        } else {
            this.props.webSocketManager.sendIdentifyCard(this.props.ccModel.id);
        }
    }

    private transformValueToStore(enabled: boolean): {[fieldname:string]: string} {
        let enabledOption:CCChanEnableOption;
        if (enabled) {
            enabledOption = CCChanEnableOption.ENABLED;
        } else {
            enabledOption = CCChanEnableOption.DISABLED;
        }
        return {enabled: enabledOption};
    }

	static toNum(ch:string):string {
	    return ch.replace('CH_', '');
    }
}

export default InfoPanelCCBasic;