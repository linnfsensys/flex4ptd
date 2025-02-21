import React from 'react';
import {
    EnactType,
    GUICCSTSClient,
    ObjectType,
    STSChannelIdClient,
    UpdateType,
} from "../AptdClientTypes";
import TopStore from "../TopStore";
import UndoManager from "../UndoManager";
import cloneDeep from 'lodash/cloneDeep';
import './InfoPanelSTS.css'
import {
    CCChanEnableOption,
    CCHoldover,
    ChannelNumber,
    DelayExtOption,
    DelayTime,
    ExtensionTime,
    FailsafeTriggerOption,
    GUICCChannel,
    PPMode,
    WatchDogFailsafeOption
} from "../AptdServerTypes";
import {Option} from "../fields/SelectField";
import InfoPanelStsChannels from "./InfoPanelStsChannels";
import InfoPanelStsIPs from "./InfoPanelStsIPs";

export enum STSActiveTab {
    IPS = "IPS",
    CHANNELS = "CHANNELS",
}

interface InfoPanelSTSProps {
    stsModel: GUICCSTSClient,
    activeTab?: STSActiveTab,
    setSTSActiveTab: (activeTab: STSActiveTab)=>void,
    topStore: TopStore,
    undoManager: UndoManager,
}

interface InfoPanelSTSState {
    activeTab: STSActiveTab,
}

const WarningIcon:any = require('../assets/icons/icons8-warning-96.png');

/**
 * this version uses local state. We keep top-level state in AptdApp as the
 * source of *verified* truth, but need local state to reflect user input,
 * in case where user makes errors.  Local state is in InputField components.
 */
class InfoPanelSTS extends React.Component<InfoPanelSTSProps, InfoPanelSTSState> {
    ipOptions: Option[] = [];

    constructor(props: InfoPanelSTSProps) {
        super(props);
        //console.debug('lifecycle InfoPanelSTS constructor(): start. this.props.ccId=', this.props.ccModel.id);
        let activeTab: STSActiveTab = this.props.activeTab !== undefined ? this.props.activeTab : STSActiveTab.IPS;

        this.state = {
            activeTab: activeTab,
        };

        this.onTabClick = this.onTabClick.bind(this);

        this.onAddChannel = this.onAddChannel.bind(this);
        this.onDeleteChannel = this.onDeleteChannel.bind(this);
    }

    render() {
        let tabContent: React.ReactNode;
        let ipsLiClassList = 'tab ips';
        let channelsLiClassList = 'tab channels';
        let warning = ' STS is not reporting';

        switch (this.state.activeTab) {
            case STSActiveTab.IPS:
                tabContent = (<InfoPanelStsIPs key={'StsIPs'}
                                               stsModel={this.props.stsModel}
                                               topStore={this.props.topStore}
                                               undoManager={this.props.undoManager}
                               />);
                ipsLiClassList += (' active');
                break;
            case STSActiveTab.CHANNELS:
                tabContent = (<InfoPanelStsChannels key={'StsChannesl'}
                                                    stsModel={this.props.stsModel}
                                                    topStore={this.props.topStore}
                                                    undoManager={this.props.undoManager}                                 />);
                channelsLiClassList += (' active');
                break;
            default:
                throw new Error('unexpected activeTab value: ' + this.state.activeTab);
        }

        return (
            <div id='infoPanelSTS'>
                <div id='infoPanelSTSHeader' className="infoPanelHeader">{'STS'}</div>
                {this.props.stsModel.unheard &&
                    <span id='infoPanelUnheardWarning'>
                        <img src={WarningIcon} width={17} alt={'unheard'}></img>
                        {warning}
                    </span>
                }
                <div id='stsForm'>
                    <ul className='tab-list'>
                        <li id='network' className={ipsLiClassList} onClick={this.onTabClick}>IPs</li>
                        <li id='info' className={channelsLiClassList} onClick={this.onTabClick}>Channels</li>
                    </ul>
                    {tabContent}
                </div>
            </div>
        )
    }

    /* for StsChannel
    render() {
        return (
            <div id='infoPanelSTS'>
                <div id='infoPanelSTSHeader' className="infoPanelHeader">STS</div>
                <div id='stsForm'>
                    <h4>Configured Channels</h4>
                    {* in sort below, we use custom sort *}
                    {Object.keys(this.props.stsModel.channelsById).sort(AptdApp.compareSTSChannels).map((channelId: string) => {
                        const simpleChannelId = STSChannelIconG.toSimpleChannelId(channelId);
                        return <p key={channelId}>{simpleChannelId}
                                    <button key={'delete-' + channelId}
                                            id={'delete-' + channelId}
                                            data-channelid={channelId}
                                            onClick={this.onDeleteChannel}
                                    >Delete
                                    </button>
                               </p>
                    })}
                    <hr/>
                    <h4>New Channel</h4>
                    <table>
                        <tbody>
                                <SelectField className={'ip'} key={'ip'} label={''} idName={'stsChannelIP'} value={this.props.topStore.getTopState().stsChannelTemp.ip} options={this.ipOptions} prompt={'Use other tab to add IP addresses'} objectType={ObjectType.STS_TEMP_CHANNEL} objectId={'ip'}  undoManager={this.props.undoManager} topStore={this.props.topStore} fieldName={'ip'} />
                                <InputField label={'Group'} key={'group'} idName={'stsChannelGroup'} text={this.props.topStore.getTopState().stsChannelTemp.group} prompt={'Enter a value between 0 and 255'} objectType={ObjectType.STS_TEMP_CHANNEL} objectId={'group'} characterType={CharacterType.NONNEGATIVE_INTEGER} maxLength={3} fieldName='group' undoManager={this.props.undoManager} topStore={this.props.topStore}/>
                                <InputField label={'Channel'} fieldName={'channel'} idName={'stsChannelChannel'} text={this.props.topStore.getTopState().stsChannelTemp.channel} prompt={'Enter a value between 1 and 32'} objectType={ObjectType.STS_TEMP_CHANNEL} characterType={CharacterType.NONNEGATIVE_INTEGER} objectId={'channel'} maxLength={2} undoManager={this.props.undoManager} topStore={this.props.topStore} />
                            <tr>
                                <td>
                                    <button id={'addChannel'} onClick={this.onAddChannel}>Add Channel</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }
    */

    private onTabClick(event: React.MouseEvent<HTMLLIElement, MouseEvent>):void {
        const liClicked: HTMLLIElement = event.currentTarget;
        if (liClicked.classList.contains('ips')) {
            this.props.setSTSActiveTab(STSActiveTab.IPS);
            this.setState({activeTab: STSActiveTab.IPS});
        } else if (liClicked.classList.contains('channels')) {
            this.props.setSTSActiveTab(STSActiveTab.CHANNELS);
            this.setState({activeTab: STSActiveTab.CHANNELS});
        } else {
            throw new Error('unexpected li');
        }
    }


    onAddChannel() {
        const topState = this.props.topStore.getTopState();
        const NEW_CHANNEL: GUICCChannel = {
            sensorFailSafe: {},
            channelNumber: '',
            delayExtOption: DelayExtOption.OFF,
            delayTime: DelayTime.T0,
            extTime: ExtensionTime.T0,
            failsafeTriggerOption: FailsafeTriggerOption.ANY_SENSOR,
            holdover: CCHoldover.T0,
            id: "",
            msDelay: 0,
            msExtension: 0,
            otype: "",
            ppMode: PPMode.PRESENSE,
            sensors: [],
            watchDogFailsafeOption: WatchDogFailsafeOption.PRESENT,
            enabled: CCChanEnableOption.ENABLED,
        };
        const channelId: string = InfoPanelSTS.toChannelId(topState.stsChannelTemp);
        let channelsById = topState.ccCards['STS'].channelsById;
        let newChannelsById = cloneDeep(channelsById);
        newChannelsById[channelId] = {
            ...NEW_CHANNEL,
            channelNumber: InfoPanelSTS.toChannelNumber(topState.stsChannelTemp.channel),
            id: InfoPanelSTS.toChannelId(topState.stsChannelTemp),
        };
        this.props.undoManager.enactActionsToStore({
            actions: [{
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.STS,
                objectId: 'STS',
                newData: {channelsById: newChannelsById},
                origData: {channelsById: channelsById},
            }],
            description: 'Add STS Channel',
        }, EnactType.USER_ACTION);
    }

    onDeleteChannel(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        const topState = this.props.topStore.getTopState();
        if (event.target === null) {
            console.error('null event.target');
            throw new Error('null event target');
        }
        const target: HTMLElement = event.target as HTMLElement;
        let channelId:string|undefined = target.dataset['channelid'];
        let channelsById: {[channelId: string]: GUICCChannel} = topState.ccCards['STS'].channelsById;
        let newChannelsById = cloneDeep(channelsById);
        if (channelId === undefined) {
            console.error('delete target lacks channelId');
            return;
        }
        delete newChannelsById[channelId];
        this.props.undoManager.enactActionsToStore({
            actions: [{
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.STS,
                objectId: 'STS',
                newData: {channelsById: newChannelsById},
                origData: {channelsById: channelsById},
            }],
            description: 'Delete STS Channel',
        }, EnactType.USER_ACTION);
    }

	/** @returns e.g., "IP15-G16-CH_4" */
    private static toChannelId(stsChannelTemp: STSChannelIdClient): string {
        return 'IP' + stsChannelTemp.ip + '-' +
            'G' + stsChannelTemp.group + '-' +
            'CH_' + stsChannelTemp.channel;
    }


    private static toChannelNumber(channel: string): ChannelNumber {
        return 'CH_' + channel as ChannelNumber;
    }
}

export default InfoPanelSTS;
