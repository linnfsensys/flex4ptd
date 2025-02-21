import React, {ChangeEvent, ReactNode} from 'react';
import './InfoPanel.css';
import cloneDeep from 'lodash/cloneDeep';
import SelectField, {Option} from '../fields/SelectField';
import ReadOnlyField from "../fields/ReadOnlyField";
import {
    Action,
    GUIRadioClient,
    GUIRepeaterClient,
    ObjectType,
    UpdateType
} from "../AptdClientTypes";
import {ChannelMode} from "../AptdServerTypes";
import UndoManager from "../UndoManager";
import TopStore from "../TopStore";
import ValidationManager from "../ValidationManager";


interface InfoPanelRadioProps {
    radioModel: GUIRadioClient,
    topStore: TopStore,
    undoManager: UndoManager,
}

interface InfoPanelRadioState {
    desiredChannel: string,
}

const ErrorAsteriskIcon:any = require('../assets/icons/icons8-asterisk-96.png');
const WarningIcon:any = require('../assets/icons/icons8-warning-96.png');


/**
 * this version uses local state. We keep top-level state in AptdApp as the
 * source of *verified* truth, but need local state to reflect user input,
 * in case where user makes errors.  Local state is in InputField components.
 */
class InfoPanelRadio extends React.Component<InfoPanelRadioProps, InfoPanelRadioState> {
    private readonly allChannelOptions: Array<Option>;
    private readonly autoValue:string = 'AUTO';
    private channelOptions: Array<Option>;

    constructor(props: InfoPanelRadioProps) {
        super(props);
        console.debug('lifecycle constructor(): start. this.props.radioId=', this.props.radioModel.id);

        // state is copied from props szModel
        this.state = {
            desiredChannel: this.props.radioModel.desiredChannel,
        };

        let autoText:string = 'Auto';
        if (this.props.radioModel.knownChannel !== '-1') {
            autoText += ' (currently ' + this.props.radioModel.knownChannel + ')';
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
        this.onRadioDesiredChannelChangedAddActions = this.onRadioDesiredChannelChangedAddActions.bind(this);
    }

    render() {
        // following need not be in every render(), could be in getDerivedStateFromProps()
        let autoText:string = 'Auto';
        if (this.props.radioModel.knownChannel !== '-1') {
            autoText = 'Auto (currently ' + this.props.radioModel.knownChannel + ')';
        }
        this.allChannelOptions[0] = {value: 'AUTO', text: autoText};
        this.channelOptions =
            this.disableDisallowedOptions(this.props.radioModel.id, this.allChannelOptions);

        // header will be Radio-0 or Radio-1.  No reference to SPP
        const header = 'Radio-' + this.props.radioModel.apConnection.replace('SPP', '');
        const key = 'radioChannel_' + this.props.radioModel.id;
        const channelString = (this.props.radioModel.channelMode === ChannelMode.AUTO ||
                               this.props.radioModel.desiredChannel === '-1') ?
                                ChannelMode.AUTO : this.props.radioModel.desiredChannel;
        const warning: string = 'Radio ' + this.props.radioModel.id + ' is not reporting'

        return (
            <div id='infoPanelRadio'>
                <div id='infoPanelRadioHeader' className="infoPanelHeader">{header}</div>
                <div id='infoPanelRadioGlobalErrors' className='globalErrors'>
                    {this.renderGlobalErrors()}
                </div>
                {this.props.radioModel.unheard &&
                    <span id='infoPanelUnheardWarning'>
                        <img src={WarningIcon} width={17} alt={'unheard'}></img>
                        {warning}
                    </span>
                }
                <div id='radioForm'>
                    <table>
                        <tbody>
                        <ReadOnlyField label={'ID'} text={this.props.radioModel.id}
                                       idName={'radioID'} fieldName={'radioID'}
                                       deviceType={ObjectType.RADIO}
                                       deviceId={this.props.radioModel.id}/>
                                       
                        <ReadOnlyField label={'Firmware Version'}
                                       text={this.props.radioModel.firmware === undefined ||
                                             this.props.radioModel.firmware === -1 ?
                                             '' : this.props.radioModel.firmware.toString()}
                                       idName={'radioFirmware'} 
                                       fieldName={'firmware'}
                                       deviceType={ObjectType.RADIO}
                                       deviceId={this.props.radioModel.id}/>

                        <SelectField label={'Channel'}
                                     value={channelString}
                                     key={key}
                                     options={this.channelOptions}
                                     idName={key}
                                     className={'radioChannel'}
                                     fieldName='desiredChannel'
                                     objectType={ObjectType.RADIO}
                                     objectId={this.props.radioModel.id}
                                     onChangeAddActions={this.onRadioDesiredChannelChangedAddActions}
                                     transformValueToStore={this.transformChannelValueToStore}
                                     topStore={this.props.topStore}
                                     undoManager={this.props.undoManager}
                        />
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }

    /**
     * After value has been changed in topStore, update all rf-children of this Radio
     * so their desiredUpstreamChannel matches this new value.
     */
    private onRadioDesiredChannelChangedAddActions(event: ChangeEvent<HTMLSelectElement>, updateAction: Action): Action[] {
        const actions:Action[] = [updateAction];
        const rfChildren:Array<GUIRepeaterClient> = this.getRepeaterChildren();
        const radioDesiredChannel: string = (event.target.value === 'AUTO' ?
            this.props.radioModel.knownChannel : event.target.value);
        for (let mapRepeater of rfChildren) {
            const newMapRepeater:GUIRepeaterClient = cloneDeep(mapRepeater);
            const action:Action = {
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.MAP_REPEATER,
                objectId: mapRepeater.id,
                newData: {desiredUpstreamChannel: radioDesiredChannel},
                origData: {desiredUpstreamChannel: newMapRepeater.desiredUpstreamChannel}
            }
            actions.push(action);
        }
        return actions;
    }

    /**
     * @returns the map repeaters in TopStore.state whose rfLink.dstId matches this radio
     */
    private getRepeaterChildren(): Array<GUIRepeaterClient> {
        const repeaterChildren: GUIRepeaterClient[] = [];
        for (let mapRepeater of Object.values(this.props.topStore.getTopState().mapRepeaters)) {
            if (mapRepeater.info.rfLink === undefined) {
                continue;
            }
            if (mapRepeater.info.rfLink.dstId === this.props.radioModel.id) {
                repeaterChildren.push(mapRepeater);
            }
        }
        return repeaterChildren;
    }

    private renderGlobalErrors(): ReactNode[] {
        let result: ReactNode[] = [];
        if (this.props.radioModel === null || this.props.radioModel === undefined) {
            console.error('unexpected null radioModel');
            return result;
        }
        const errorKey: string = ValidationManager.makeInfoPanelKey(ObjectType.RADIO, this.props.radioModel.id);
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


    transformChannelValueToStore(channelValue:string):{[fieldName:string]: string} {
        let newChannel: string;
        let newChannelMode: string;
        if (channelValue === 'AUTO') {
            newChannel = '-1';
            newChannelMode = ChannelMode.AUTO;
        } else {
            const channel:number = +channelValue;
            if (channel >=0 && channel <=15) {
                newChannel = channelValue.toString();
                newChannelMode = ChannelMode.MANUAL;
            } else {
                console.error('unexpected channelValue', channelValue);
                newChannel = '-1';
                newChannelMode = ChannelMode.AUTO;
            }
        }
        return {desiredChannel: newChannel,
                channelMode: newChannelMode};
    }

    /**
     * @returns copy of allChannelOptions where disabled is set for those that are disallowed
     *          by being already in use by other radio or repeater
     */
    private disableDisallowedOptions(radioId: string, allChannelOptions: Array<Option>): Array<Option> {
        const topState = this.props.topStore.getTopState();
        const allRepeaterDesiredDownstreamChannels: number[] =
            Object.keys(topState.mapRepeaters)
                .map((mapRepeaterId:string) => {
                    const mapRepeater:GUIRepeaterClient = topState.mapRepeaters[mapRepeaterId];
                    return mapRepeater.channelMode === ChannelMode.MANUAL ?
                            +mapRepeater.desiredDownstreamChannel :
                            +mapRepeater.knownDownstreamChannel;
                });
        const allRepeaterKnownDownstreamChannels: number[] =
            Object.keys(topState.mapRepeaters)
                .map((mapRepeaterId:string) => {
                    const mapRepeater:GUIRepeaterClient = topState.mapRepeaters[mapRepeaterId];
                    return +mapRepeater.knownDownstreamChannel;
                });
        const otherRadio: GUIRadioClient|undefined = (radioId === 'SPP0' ?
            topState.radios['SPP1'] :
            topState.radios['SPP0']);
        const otherRadioDesiredChannel:number  = (otherRadio === undefined ?
            -1 :
            (otherRadio.channelMode === ChannelMode.MANUAL ?
                +otherRadio.desiredChannel : +otherRadio.knownChannel));
        const otherRadioKnownChannel:number =
            (otherRadio === undefined ? -1 : +otherRadio.knownChannel);
        const forbiddenChannelsArray: number[] =
            allRepeaterDesiredDownstreamChannels
                .concat(allRepeaterKnownDownstreamChannels)
                .concat(otherRadioDesiredChannel)
                .concat(otherRadioKnownChannel)
            .filter((channel:number) => (channel !== -1));
        const forbiddenChannelsSet: Set<number> = new Set<number>(forbiddenChannelsArray);
        console.debug('InfoPanelRadio.disableDisallowedOptions(): forbiddenChannelsSet=', forbiddenChannelsSet);

        // ch option is allowed if it is not already in use by other radio or map repeater
        // 'AUTO' option is always allowed
        const allowedOptions: Option[] = allChannelOptions.filter((option) =>
            (option.value === this.autoValue || ! forbiddenChannelsSet.has(+option.value)));
        //console.debug('disableDisallowedOptions(): allowedOptions=', allowedOptions);
        const allowedOptionByValue:{[value:string]:Option} = {};
        allowedOptions.forEach((option:Option) => {allowedOptionByValue[option.value] = option});
        //console.debug('disableDisallowedOptions(): allowedOptionByValue=', allowedOptionByValue);

        return allChannelOptions.map((option:Option) =>
            ({...option, disabled: (allowedOptionByValue[option.value] === undefined)}));
    }
}

export default InfoPanelRadio;
