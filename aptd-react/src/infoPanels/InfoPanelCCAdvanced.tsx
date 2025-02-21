import React, {ReactNode} from 'react';
import './InfoPanelCCBasic.css';
import SelectField, {Option} from "../fields/SelectField";
import {GUICCInterfaceBaseClient, ObjectType} from "../AptdClientTypes";
import {
    ChannelNumber,
    FailsafeTriggerOption,
    GUICCChannel,
    GUICCChannelBase,
    Interface,
    WatchDogFailsafeOption
} from "../AptdServerTypes";
import TopStore from "../TopStore";
import UndoManager from "../UndoManager";
import InfoPanelCCBasic from "./InfoPanelCCBasic";
import InfoPanelCC from "./InfoPanelCC";


interface InfoPanelCCAdvancedProps {
    ccId: string,
    ccModel: GUICCInterfaceBaseClient,
    /** bankNo is only used for SDLC */
    bankNo?: number,
    topStore: TopStore,
    undoManager: UndoManager,
}

interface InfoPanelCCAdvancedState {
    ccModel: GUICCInterfaceBaseClient,
}


/**
 * This InfoPanel is used for CC/EX Card and for SDLC Bank.
 * When used for CC/EX card, it shows a table of updatable channel info for 4 channels.
 * When used for SDLC "Bank", it shows a table of updatable channel info for 16 channels for a "bank"
 */
class InfoPanelCCAdvanced extends React.Component<InfoPanelCCAdvancedProps, InfoPanelCCAdvancedState> {
    private channelObjectType: ObjectType;
    private failsafeModeOptions: Array<Option>;
    private failsafeTriggerOptions: Array<Option>;

    constructor(props: InfoPanelCCAdvancedProps) {
        super(props);
        console.debug('lifecycle InfoPanelCCAdvanced constructor(): start. this.props.ccModel.id=', this.props.ccModel.id);

        this.state = {
            ccModel: this.props.ccModel
        };
        this.channelObjectType = ObjectType.CC_CHANNEL;

        this.failsafeModeOptions = [
            {value: WatchDogFailsafeOption.PRESENT, text: 'Present'},
            {value: WatchDogFailsafeOption.NOT_PRESENT, text: 'Not Present'}
        ];
        this.failsafeTriggerOptions = [
            {value: FailsafeTriggerOption.ANY_SENSOR, text: 'Any Sensor'},
            {value: FailsafeTriggerOption.ALL_SENSORS, text: 'All Sensors'}
        ];

        this.renderChannel = this.renderChannel.bind(this);
    }


    render():ReactNode {
        let channels:{[channelNumber:string]: GUICCChannelBase} = this.props.ccModel.channelsById;
        let channelKeys: string[] = new Array<string>();
        switch (this.props.ccModel.cardInterface) {
            case Interface.CCCard:
            case Interface.EXCard:
                // assert: channelKeys are always CH_1, ... CH_4
                channelKeys = Object.keys(channels).sort();
                this.channelObjectType = ObjectType.CC_CHANNEL;
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
                break;
            default:
                throw new Error('unexpected cardInterface: ' + this.props.ccModel.cardInterface);
        }

        return (
            <div id='infoCCAdvanced'>
                <div id='ccAdvancedForm'>
                    <table>
                        <tbody>
                            <tr/>
                            <tr/>
                            <tr/>
                        </tbody>
                    </table>
                    <br/>
                    <table id='notesTable'>
                        <tbody>
                        <tr>
                            <td><strong>Failsafe Mode. </strong>
                                Typical value is Present
                            </td>
                        </tr>
                        <tr>
                            <td><strong>Failsafe Trigger. </strong>
                                Typical value is "Any Sensor"
                            </td>
                        </tr>
                        </tbody>
                    </table>
                    <br/>
                    <table id='channelsTable'>
                        <thead>
                            <tr id='colHeaders' className='row'>
                                <th className='cell'>Chan No.</th>
                                <th className='cell'>Failsafe Mode</th>
                                <th className='cell'>Failsafe Trigger</th>
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
        let channelsById:{[channelNumber:string]: GUICCChannelBase} = this.props.ccModel.channelsById;
        const channel: GUICCChannel = channelsById[channelNo] as GUICCChannel;
        const sensorDotIds: string[] = channel.sensors;
        const sensorInfo: ReactNode[] =
            InfoPanelCC.renderSensorsForChannel(sensorDotIds, channelNo, this.props.topStore.getTopState(), this.props.topStore, this.props.undoManager, channel);

        const channelHtml: ReactNode =
            <React.Fragment key={channelNo}>
                <tr id='chNums' key={channelNo} className={'row'}>
                    <td key={channelNo}
                          className={'cell'}>Ch {InfoPanelCCBasic.toNum(channel.channelNumber)}
                    </td>
                    <SelectField label={'Present/Not'}
                                 showLabel={false}
                                 showErrorTd={false}
                                 value={channel.watchDogFailsafeOption}
                                 className={'chFsMode'}
                                 objectId={channel.id}
                                 objectType={this.channelObjectType}
                                 fieldName={'watchDogFailsafeOption'}
                                 row={false}
                                 idName={'chFsMode' + channelNo}
                                 key={'chFsMode' + channelNo}
                                 options={this.failsafeModeOptions}
                                 topStore={this.props.topStore}
                                 undoManager={this.props.undoManager}
                    />
                    <SelectField label={'Failsafe Trigger'}
                                 showLabel={false}
                                 showErrorTd={false}
                                 value={channel.failsafeTriggerOption}
                                 className={'chFsTrigger'}
                                 objectId={channel.id}
                                 objectType={this.channelObjectType}
                                 fieldName={'failsafeTriggerOption'}
                                 row={false}
                                 idName={'chFsTrigger' + channelNo}
                                 key={'chFsTrigger' + channelNo}
                                 options={this.failsafeTriggerOptions}
                                 topStore={this.props.topStore}
                                 undoManager={this.props.undoManager}
                    />
                </tr>
                {sensorInfo}
            </React.Fragment>;
        return channelHtml;
    }
}

export default InfoPanelCCAdvanced;