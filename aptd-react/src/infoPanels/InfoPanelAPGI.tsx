import React, { ReactNode } from 'react';
import {
    APGIChannelIdClient,
    EnactType,
    GUICCAPGIClient,
    ObjectType,
    UpdateType,
} from "../AptdClientTypes";
import TopStore from "../TopStore";
import UndoManager from "../UndoManager";
import RangeField from "../fields/RangeField";
import cloneDeep from 'lodash/cloneDeep';
import './InfoPanelAPGI.css'
import {
    CCChanEnableOption,
    CCHoldover, ChannelNumber,
    DelayExtOption,
    DelayTime,
    ExtensionTime,
    FailsafeTriggerOption,
    GUICCChannel, GUICCChannelClient,
    PPMode,
    WatchDogFailsafeOption
} from "../AptdServerTypes";
import APGIChannelIconG from "../mapTrayCabinet/APGIChannelIconG";
import AptdApp from "../AptdApp";
import AptdButton from "../AptdButton";
import CheckboxField from "../fields/CheckboxField";


interface InfoPanelAPGIProps {
    apgiModel: GUICCAPGIClient,
    topStore: TopStore,
    undoManager: UndoManager,
}


interface InfoPanelAPGIState {
    duplicateChannelErrorPresent: boolean
}

const WarningIcon:any = require('../assets/icons/icons8-warning-96.png');
const ErrorAsteriskIcon:any = require('../assets/icons/icons8-asterisk-96.png');

/**
 * this version uses local state. We keep top-level state in AptdApp as the
 * source of *verified* truth, but need local state to reflect user input,
 * in case where user makes errors.  Local state is in InputField components.
 */
class InfoPanelAPGI extends React.Component<InfoPanelAPGIProps, InfoPanelAPGIState> {

    constructor(props: InfoPanelAPGIProps) {
        super(props);
        //console.debug('lifecycle InfoPanelAPGI constructor(): start. this.props.ccId=', this.props.ccModel.id);
        this.state = {
            duplicateChannelErrorPresent: false
        };

        this.onAddChannel = this.onAddChannel.bind(this);
        this.onDeleteChannels = this.onDeleteChannels.bind(this);
        this.deleteChannels = this.deleteChannels.bind(this);
        this.onShelfSlotOrChannelUpdate = this.onShelfSlotOrChannelUpdate.bind(this);
    }

    render() {
        let warning = ' APGI is not reporting';
        return (
            <div id='infoPanelAPGI'>
                <div id='infoPanelAPGIHeader' className="infoPanelHeader">APGI</div>
                {this.props.apgiModel.unheard &&
                    <span id='infoPanelUnheardWarning'>
                        <img src={WarningIcon} width={17} alt={'unheard'}></img>
                        {warning}
                    </span>
                }
                <div id='apgiForm'>
                    <h4>Configured Channels</h4>
                    <table id='configuredChannelsTable'>
                        <thead>
                            <tr key='header' id='colHeaders'>
                                <th></th>
                                <th>Channel Identifier</th>
                                <th>Shelf</th>
                                <th>Slot</th>
                                <th>Channel</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* in sort below, we use custom sort */}
                            {Object.keys(this.props.apgiModel.channelsById)
                                .sort(AptdApp.compareAPGIChannels)
                                .map((channelId: string, rowNo: number) => {
                                    const simpleChannelId = APGIChannelIconG.toSimpleChannelId(channelId);
                                    const apgiChannelIdClient: APGIChannelIdClient =
                                        AptdApp.parseAPGIServerChannelId(channelId);
                                    const theChannel: GUICCChannelClient =
                                        this.props.apgiModel.channelsById[channelId] as GUICCChannelClient;
                                    return (<tr key={channelId}>
                                                <CheckboxField label='APGI channel select'
                                                               showLabel={false}
                                                               value={theChannel.selected === true}
                                                               idName={'channelSelected' + rowNo}
                                                               className=''
                                                               key={'channelSelected' + rowNo}
                                                               fieldName='selected'
                                                               objectType={ObjectType.APGI_CHANNEL}
                                                               objectId={channelId}
                                                               row={false}
                                                               topStore={this.props.topStore}
                                                               undoManager={this.props.undoManager}
                                                />
                                                <td>
                                                    {simpleChannelId}
                                                </td>
                                                <td>
                                                    {apgiChannelIdClient.shelf}
                                                </td>
                                                <td>
                                                    {apgiChannelIdClient.slot}
                                                </td>
                                                <td>
                                                    {apgiChannelIdClient.channel}
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
                                                        disabled={false}
                                                        theClassName='gray'
                                                        onClick={this.onDeleteChannels}/>
                                        </span>
                            </td>
                        </tr>
                    </table>
                    <hr/>
                    <h4>New Channel</h4>
                    {this.renderAddDuplicateChannelError()}
                    <table>
                        <tbody>
                        <RangeField label={'Shelf'} idName={'apgiChannelShelf'} fieldName={'shelf'}
                                    value={+this.props.topStore.getTopState().apgiChannelTemp.shelf}
                                    valueUpdated={this.onShelfSlotOrChannelUpdate}
                                    min={0} max={3} step={1}
                                    objectType={ObjectType.APGI_TEMP_CHANNEL}
                                    objectId={'shelf'}
                                    undoManager={this.props.undoManager}
                                    topStore={this.props.topStore}/>
                        <RangeField label={'Slot'} idName={'apgiChannelSlot'} fieldName={'slot'}
                                    value={+this.props.topStore.getTopState().apgiChannelTemp.slot}
                                    valueUpdated={this.onShelfSlotOrChannelUpdate}
                                    min={0} max={15} step={1}
                                    objectType={ObjectType.APGI_TEMP_CHANNEL}
                                    objectId={'slot'}
                                    undoManager={this.props.undoManager}
                                    topStore={this.props.topStore}/>
                        <RangeField label={'Channel'} idName={'apgiChannelChannel'}
                                    fieldName={'channel'}
                                    value={+this.props.topStore.getTopState().apgiChannelTemp.channel}
                                    valueUpdated={this.onShelfSlotOrChannelUpdate}
                                    min={1} max={4} step={1}
                                    objectType={ObjectType.APGI_TEMP_CHANNEL}
                                    objectId={'channel'}
                                    undoManager={this.props.undoManager}
                                    topStore={this.props.topStore}/>
                            <tr>
                                <td>
                                    <span className='buttonPane'>
                                        <AptdButton id={'addChannel'}
                                                    text='Add Channel'
                                                    title=''
                                                    theClassName='gray'
                                                    onClick={this.onAddChannel}
                                        />
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }

    private renderAddDuplicateChannelError(): ReactNode {
        let result: ReactNode = null;

        if (this.state.duplicateChannelErrorPresent) {
            const topState = this.props.topStore.getTopState();
            let currentShelfId = topState.apgiChannelTemp.shelf.toString()
            let currentSlotId = topState.apgiChannelTemp.slot.toString()
            let currentChannelId = topState.apgiChannelTemp.channel.toString()
            result = [
                <span className='duplicateChannelError'>
                <img src={ErrorAsteriskIcon} width={17} alt={'error'}></img>
                {"Channel already exists with Shelf " + currentShelfId + " Slot " + currentSlotId + " Channel " + currentChannelId}
                </span>
            ];
        }
        return result;
    }

    onDeleteChannels(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        let channelIdsToDelete: string[] = [];
        Object.keys(this.props.apgiModel.channelsById)
            .forEach((channelId: string, rowNo: number) => {
                //const simpleChannelId: string = channelId;
                const theChannel: GUICCChannelClient =
                    this.props.apgiModel.channelsById[channelId] as GUICCChannelClient;
                if (theChannel.selected === true) {
                    console.debug('onDeleteChannels(): about to delete channel', channelId);
                    channelIdsToDelete.push(channelId);
                }
            });
        this.deleteChannels(channelIdsToDelete);
    }

    private deleteChannels(channelIds: string[]) {
        if (channelIds.length === 0) {
            return;
        }
        let channelsById: { [channelId: string]: GUICCChannelClient } =
            this.props.topStore.getTopState().ccCards['APGI'].channelsById;
        let newChannelsById = cloneDeep(channelsById);

        for (const channelId of channelIds) {
            if (channelId === undefined) {
                console.error('channelId is undefined');
                return;
            }
            delete newChannelsById[channelId];
        }
        this.props.undoManager.enactActionsToStore({
            actions: [{
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.APGI,
                objectId: 'APGI',
                newData: {channelsById: newChannelsById},
                origData: {channelsById: channelsById},
            }],
            description: 'Delete APGI Channel(s)',
        }, EnactType.USER_ACTION);
    }


    public onShelfSlotOrChannelUpdate() {
        if (this.state.duplicateChannelErrorPresent) {
            this.setState({
                duplicateChannelErrorPresent: false
            });
        }
    }

    onAddChannel() {
        const topState = this.props.topStore.getTopState();
        // Check that Shelf/Slot/Channel Set is available
        const userSpecifiedChannel: string =
            AptdApp.makeAPGIClientChannelIdString(topState.apgiChannelTemp);

        if (this.props.apgiModel.channelsById.hasOwnProperty(userSpecifiedChannel)) {
            //This channel already exists
            this.setState({
                duplicateChannelErrorPresent: true
            });
            return;
        } else {
            //This channel does not exist
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
        const channelId: string = AptdApp.makeAPGIClientChannelIdString(topState.apgiChannelTemp);
        let channelsById = topState.ccCards['APGI'].channelsById;
        let newChannelsById = cloneDeep(channelsById);
        newChannelsById[channelId] = {
            ...NEW_CHANNEL,
            channelNumber: InfoPanelAPGI.toChannelNumber(topState.apgiChannelTemp.channel),
            id: AptdApp.makeAPGIClientChannelIdString(topState.apgiChannelTemp),
        };
        this.props.undoManager.enactActionsToStore({
            actions: [{
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.APGI,
                objectId: 'APGI',
                newData: {channelsById: newChannelsById},
                origData: {channelsById: channelsById},
            }],
            description: 'Add APGI Channel',
        }, EnactType.USER_ACTION);
    }


    private static toChannelNumber(channel: string): ChannelNumber {
        return 'CH_' + channel as ChannelNumber;
    }
}

export default InfoPanelAPGI;
