import React, {ReactNode} from 'react';
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
import './InfoPanelStsChannels.css'
import {
    CCChanEnableOption,
    CCHoldover,
    DelayExtOption,
    DelayTime,
    ExtensionTime,
    FailsafeTriggerOption,
    GUICCChannel, GUICCChannelClient,
    PPMode,
    WatchDogFailsafeOption
} from "../AptdServerTypes";
import SelectField, {Option} from "../fields/SelectField";
import RangeField from "../fields/RangeField";
import STSChannelIconG from "../mapTrayCabinet/STSChannelIconG";
import ValidationManager from "../ValidationManager";
import CheckboxField from "../fields/CheckboxField";
import AptdButton from "../AptdButton";
import AptdApp from "../AptdApp";


interface InfoPanelStsChannelsProps {
    stsModel: GUICCSTSClient,
    topStore: TopStore,
    undoManager: UndoManager,
}

interface InfoPanelStsChannelsState {
    ip: string,
    group: string,
    channel: string,
    duplicateChannelErrorPresent: boolean
}

const ErrorAsteriskIcon:any = require('../assets/icons/icons8-asterisk-96.png');

/**
 * this version uses local state. We keep top-level state in AptdApp as the
 * source of *verified* truth, but need local state to reflect user input,
 * in case where user makes errors.  Local state is in InputField components.
 */
export default class InfoPanelStsChannels extends React.Component<InfoPanelStsChannelsProps, InfoPanelStsChannelsState> {
    ipOptions: Option[] = [];

    constructor(props: InfoPanelStsChannelsProps) {
        super(props);
        //console.debug('lifecycle InfoPanelSTS constructor(): start. this.props.ccId=', this.props.ccModel.id);

        this.onAddChannel = this.onAddChannel.bind(this);
        this.onDeleteChannels = this.onDeleteChannels.bind(this);
        this.isValidKey = this.isValidKey.bind(this);
        this.setUsedChannelsPerGroup = this.setUsedChannelsPerGroup.bind(this);
        this.onGroupOrChannelUpdate = this.onGroupOrChannelUpdate.bind(this);
        this.onIPSelectionChange = this.onIPSelectionChange.bind(this);

        // valid IP? values from 1st STS tab
        const ipKeys: string[] = Object.keys(this.props.stsModel.addrMap)
            .filter(this.isValidKey)
            .sort();

        this.state = {
            // use the first valid IP? value
            ip: ipKeys.length > 0 ? ipKeys.sort()[0].substring(2) : "1",
            group: "0",
            channel: "1",
            duplicateChannelErrorPresent: false,
        };
    }


    /** for StsChannel */
    render() {
        const ipKeys: string[] = Object.keys(this.props.stsModel.addrMap)
                                    .filter(this.isValidKey)
                                    .sort();
        this.ipOptions = [];
        for (let ipKey of ipKeys) {
            const ipNo: string = ipKey.substring(2);
            this.ipOptions.push({value: ipNo, text: ipKey});
        }
        return (
            <div id='infoPanelStsChannel'>
                <div id='stsForm'>
                    <h4>Configured Channels</h4>
                    <table id='configuredChannelsTable'>
                        <thead>
                            <tr key='header' id='colHeaders'>
                                <th></th>
                                <th>Channel Identifier</th>
                                <th>IP</th>
                                <th>Group</th>
                                <th>Channel</th>
                            </tr>
                        </thead>
                        <tbody>
                        {/* in sort below, we use custom sort */}
                        {Object.keys(this.props.stsModel.channelsById)
                            .sort(AptdApp.compareSTSChannels)
                            .map((channelId: string, rowNo: number) => {
                                const simpleChannelId: string = channelId;
                                const stsChannelIdClient: STSChannelIdClient =
                                    AptdApp.toSTSChannelId(simpleChannelId);
                                const theChannel: GUICCChannelClient =
                                    this.props.stsModel.channelsById[channelId] as GUICCChannelClient;
                                return (<tr key={channelId}>
                                            <CheckboxField label='STS channel select'
                                                           showLabel={false}
                                                           value={theChannel.selected === true}
                                                           idName={'channelSelected' + rowNo}
                                                           className=''
                                                           key={'channelSelected' + rowNo}
                                                           fieldName='selected'
                                                           objectType={ObjectType.STS_CHANNEL}
                                                           objectId={channelId}
                                                           row={false}
                                                           topStore={this.props.topStore}
                                                           undoManager={this.props.undoManager}
                                            />
                                            <td>
                                                {STSChannelIconG.toUserChannelIdShorter(simpleChannelId)}
                                            </td>
                                            <td>
                                                IP{stsChannelIdClient.ip} –
                                                {this.props.stsModel.addrMap['IP' + stsChannelIdClient.ip]}
                                            </td>
                                            <td>
                                                {stsChannelIdClient.group}
                                            </td>
                                            <td>
                                                {stsChannelIdClient.channel}
                                            </td>
                                        </tr>)
                            })}
                        </tbody>
                    </table>
                    <table>
                        <tr>
                            <td colSpan={2}>
                                        <span className='buttonPane'>
                                            <AptdButton id={'deleteChannels'}
                                                        text='Delete Selected Channel(s)'
                                                        title='Will delete those channels whose checkboxes are checked'
                                                        // TODO: should maybe disable button if there are no channels selected
                                                        disabled={this.ipOptions.length === 0}
                                                        theClassName='button gray'
                                                        onClick={this.onDeleteChannels}/>
                                        </span>
                            </td>
                        </tr>
                    </table>
                    <hr/>
                    <h4>New Channel</h4>
                    {this.renderAddDuplicateChannelError()}
                    <form autoComplete={'nope'}>
                    <table>
                        <tbody>
                        <SelectField className={'ip'} key={'ip'} label={'IP'}
                                     idName={'stsChannelIP'}
                                     value={this.props.topStore.getTopState().stsChannelTemp.ip}
                                     onValueChanged={this.onIPSelectionChange}
                                     options={this.ipOptions}
                                     prompt={'Use "IPs" tab to add IP addresses'}
                                     objectType={ObjectType.STS_TEMP_CHANNEL} objectId={'ip'}
                                     undoManager={this.props.undoManager}
                                     topStore={this.props.topStore} fieldName={'ip'}
                                     enactType={EnactType.USER_ACTION_NOT_UNDOABLE}/>
                        <RangeField label={'Group'} key={'group'} fieldName='group'
                                    idName={'stsChannelGroup'}
                                    value={+this.props.topStore.getTopState().stsChannelTemp.group}
                                    valueUpdated={this.onGroupOrChannelUpdate}
                                    prompt={'Enter value 0 - 255'}
                                    objectType={ObjectType.STS_TEMP_CHANNEL} objectId={'group'}
                                    max={255} min={0}
                                    showTicks={false}  // too many ticks for too small a space to show
                                    undoManager={this.props.undoManager}
                                    topStore={this.props.topStore}
                                    enactType={EnactType.USER_ACTION_NOT_UNDOABLE}/>
                        <RangeField label={'Channel'} fieldName={'channel'}
                                    idName={'stsChannelChannel'}
                                    value={+this.props.topStore.getTopState().stsChannelTemp.channel}
                                    valueUpdated={this.onGroupOrChannelUpdate}
                                    prompt={'Enter value 1 - 32'}
                                    objectType={ObjectType.STS_TEMP_CHANNEL} objectId={'channel'}
                                    max={32} min={1}
                                    showTicks={true}
                                    undoManager={this.props.undoManager}
                                    topStore={this.props.topStore}
                                    enactType={EnactType.USER_ACTION_NOT_UNDOABLE}/>
                        <tr>
                            <td colSpan={2}>
                                <span className='buttonPane'>
                                    <AptdButton id={'addChannel'}
                                                text='Add Channel'
                                                title=''
                                                disabled={this.ipOptions.length === 0}
                                                theClassName='button gray'
                                                onClick={this.onAddChannel}/>
                                </span>
                            </td>
                        </tr>
                    </tbody>
                    </table>
                    </form>
                </div>
            </div>
        )
    }


    private isValidKey(ipKey: string):boolean {
        const errorKey = ValidationManager.makeErrorKey(ObjectType.STS_ADDR_MAP, 'STS', 'addrMap', ipKey);
        if (this.props.stsModel.addrMap === undefined) {
            return false;
        }
        const addrMapValue = this.props.stsModel.addrMap[ipKey];
        const validKey: boolean =
            (addrMapValue !== undefined &&
             addrMapValue !== '' &&
             this.props.topStore.getTopState().validationErrors[errorKey] === undefined);
        return validKey;
    }

    private renderAddDuplicateChannelError(): ReactNode {
        let result: ReactNode = null;

        if (this.state.duplicateChannelErrorPresent) {
            const topState = this.props.topStore.getTopState();
            let currentGroupId = topState.stsChannelTemp.group.toString()
            let currentChannelId = topState.stsChannelTemp.channel.toString()
            result = [
                <span className='duplicateChannelError'>
                <img src={ErrorAsteriskIcon} width={17} alt={'error'}></img>
                {"Channel already exists for IP" + this.state.ip + " with Group " + currentGroupId + " Channel " + currentChannelId}
                </span>
            ];
        }
        return result;
    }

    public onGroupOrChannelUpdate() {
        if (this.state.duplicateChannelErrorPresent) {
            this.setState({
                duplicateChannelErrorPresent: false
            });
        }
    }

    onAddChannel(event: React.MouseEvent<HTMLButtonElement, MouseEvent>|null):void {
        if (event !== null) {
            event.preventDefault();
        }

        const topState = this.props.topStore.getTopState();

        // Check that Group/Channel Pair is available
        const userSpecifiedChannel: string = InfoPanelStsChannels.toSimpleChannelId(topState.stsChannelTemp);
        if (this.props.stsModel.channelsById.hasOwnProperty(userSpecifiedChannel)) {
            //This pair already exists
            this.setState({
                duplicateChannelErrorPresent: true
            });
            return;
        } else {
            //This pair does not exist
            this.setState({
                duplicateChannelErrorPresent: false
            });
        }

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
        let currentGroupId = topState.stsChannelTemp.group.toString()
        let currentChannelId = topState.stsChannelTemp.channel.toString()
        const channelId: string = InfoPanelStsChannels.toSimpleChannelId({
            ip: ((document.getElementById('stsChannelIP')) as HTMLSelectElement).value,
            group: currentGroupId,
            channel: currentChannelId,
        });
        let channelsById = topState.ccCards['STS'].channelsById;
        let newChannelsById = cloneDeep(channelsById);
        newChannelsById[channelId] = {
            ...NEW_CHANNEL,
            channelNumber: InfoPanelStsChannels.toUserChannelId(topState.stsChannelTemp),
            id: channelId,
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


    private deleteChannels(channelIds: string[]) {
        if (channelIds.length === 0) {
            return;
        }
        let channelsById: { [channelId: string]: GUICCChannelClient } =
            this.props.topStore.getTopState().ccCards['STS'].channelsById;
        let newChannelsById = cloneDeep(channelsById);

        // Remove Group/Channel Pair from used table
        //let deleteGroupId: string = '';
        //let deleteChannelId: string = '';

        for (const channelId of channelIds) {
            if (channelId === undefined) {
                console.error('channelId is undefined');
                return;
            }
            delete newChannelsById[channelId];

            // Remove Group/Channel Pair from used table
            //deleteGroupId = this.getGroupId(channelId);
            //deleteChannelId = this.getChannelId(channelId);
        }
        this.props.undoManager.enactActionsToStore({
            actions: [{
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.STS,
                objectId: 'STS',
                newData: {channelsById: newChannelsById},
                origData: {channelsById: channelsById},
            }],
            description: 'Delete STS Channel(s)',
        }, EnactType.USER_ACTION);
    }

    onDeleteChannels(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        let channelIdsToDelete: string[] = [];
        Object.keys(this.props.stsModel.channelsById)
            .forEach((channelId: string, rowNo: number) => {
                const simpleChannelId: string = channelId;
                const theChannel: GUICCChannelClient =
                    this.props.stsModel.channelsById[channelId] as GUICCChannelClient;
                if (theChannel.selected === true) {
                    console.debug('onDeleteChannels(): about to delete channel', simpleChannelId);
                    channelIdsToDelete.push(simpleChannelId);
                }
            });
        this.deleteChannels(channelIdsToDelete);
    }


        /** @returns e.g., "IP5-G16-C4" */
    public static toUserChannelId(stsChannelTemp: STSChannelIdClient): string {
        return 'IP' + stsChannelTemp.ip + '-' +
            'G' + stsChannelTemp.group + '-' +
            'C' + stsChannelTemp.channel;
    }

    /** @returns e.g. "IP5-16-4" */
    public static toUserChannelIdShorter(stsChannelId: STSChannelIdClient): string {
        return 'IP' + stsChannelId.ip + '-' +
            stsChannelId.group + '-' +
            stsChannelId.channel;
    }

    /** @returns e.g., "5-16-4" */
    public static toSimpleChannelId(stsChannelTemp: STSChannelIdClient): string {
        return stsChannelTemp.ip + '-' +
            stsChannelTemp.group + '-' +
            stsChannelTemp.channel;
    }

    addUsedGroupChannelPair(channelId: string, currentUsedChannelsPerGroupSet: Set<string>): Set<string> {
        if (currentUsedChannelsPerGroupSet === null || currentUsedChannelsPerGroupSet === undefined) {
            currentUsedChannelsPerGroupSet = new Set<string>();
        }
        currentUsedChannelsPerGroupSet.add(channelId);
        return currentUsedChannelsPerGroupSet;
    }

    removeUsedGroupChannelPair(channelId: string, currentUsedChannelsPerGroupSet: Set<string>): Set<string> {
        if (currentUsedChannelsPerGroupSet !== null && currentUsedChannelsPerGroupSet !== undefined) {
            currentUsedChannelsPerGroupSet.delete(channelId);
        }
        return currentUsedChannelsPerGroupSet;
    }

    public setUsedChannelsPerGroup(ipAddr: string): {[groupdId: string]: Set<string>} {
        let usedChannelsPerGroup: {[groupId: string]: Set<string>} = {};
        for (let ccChannel of Object.values(this.props.stsModel.channelsById)) {
            if (this.getIP(ccChannel.id) !== ipAddr) {
                continue;
            }
            let groupdId = this.getGroupId(ccChannel.id);
            let channelId = this.getChannelId(ccChannel.id);
            //let channelSet = usedChannelsPerGroup[groupdId];
            usedChannelsPerGroup[groupdId] = this.addUsedGroupChannelPair(channelId, usedChannelsPerGroup[groupdId]);
        }
        return usedChannelsPerGroup;
    }

    public onIPSelectionChange(ipAddr: string) {
        let usedChannelsPerGroup = this.setUsedChannelsPerGroup(ipAddr);
        this.setState({
            ip: ipAddr,
            duplicateChannelErrorPresent: false
        });
    }

    private getIP(channelId: string): string {
        let indexOfIP = channelId.search("IP");
        let indexOfG = channelId.search("G");
        if (indexOfIP !== -1 && indexOfG !== -1) {
            return channelId.slice(indexOfIP+2, indexOfG);
        }
        let channelIdSplit = channelId.split('-');
        if (channelIdSplit.length === 3) {
            return channelIdSplit[0];
        }
        return "0"
    }

    private getGroupId(channelId: string): string {
        let indexOfG = channelId.search("G");
        let indexOfC = channelId.search("C");
        if (indexOfG !== -1 && indexOfC !== -1) {
            return channelId.slice(++indexOfG, indexOfC);
        }
        let channelIdSplit = channelId.split('-');
        if (channelIdSplit.length === 3) {
            return channelIdSplit[1];
        }
        return "0"
    }
    private getChannelId(channelId: string): string {
        let indexOfC = channelId.search("C");
        if (indexOfC !== -1) {
            return channelId.slice(++indexOfC, channelId.length);
        }
        let channelIdSplit = channelId.split('-');
        if (channelIdSplit.length === 3) {
            return channelIdSplit[2];
        }
        return "1";
    }

    componentDidMount() {
        // valid IP? values from 1st STS tab
        const ipKeys: string[] = Object.keys(this.props.stsModel.addrMap)
            .filter((ipKey: string)=>(this.props.stsModel.addrMap[ipKey] !== undefined));

        let ipAddr = ipKeys.length > 0 ? ipKeys.sort()[0].substring(2) : "1"
        let usedChannelsPerGroup = this.setUsedChannelsPerGroup(ipAddr);
        this.setState({
            // use the first valid IP? value
            ip: ipAddr,
            group: "0",
            channel: "1",
        }, () => {
            const newData = {
                ip: this.state.ip,
                group: this.state.group,
                channel: this.state.channel,
            };
            this.props.undoManager.enactActionsToStore({
                actions: [{
                    updateType: UpdateType.UPDATE,
                    objectType: ObjectType.STS_TEMP_CHANNEL,
                    objectId: 'STS_TEMP_CHANNEL',
                    newData: newData,
                    origData: null,
                }],
                description: 'set default sts temp channel configs',
            }, EnactType.USER_ACTION_NOT_UNDOABLE);
        });
    }
}