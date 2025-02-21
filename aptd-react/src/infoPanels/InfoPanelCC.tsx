import React from 'react';
import './InfoPanel.css';
import './InfoPanelAP.css';
import InfoPanelCCBasic from "./InfoPanelCCBasic";
import {
    GUICCCardClient,
    GUICCInterfaceBaseClient, GUISZClient, ObjectType,
} from "../AptdClientTypes";
import {GUICCChannel, Interface} from "../AptdServerTypes";
import TopStore, {TopStoreState} from "../TopStore";
import UndoManager from "../UndoManager";
import InfoPanelCCAdvanced from "./InfoPanelCCAdvanced";
import WebSocketManager from "../WebSocketManager";
import CheckboxField from '../fields/CheckboxField';


interface InfoPanelCCProps {
    ccId: string,
    ccModel: GUICCInterfaceBaseClient,
    /** bankNo is only used for SDLC */
    bankNo?: number,
    activeTab?: CCActiveTab,
    setCCActiveTab: (activeTab: CCActiveTab)=>void,
    topStore: TopStore,
    undoManager: UndoManager,
    webSocketManager: WebSocketManager | null,
}

export enum CCActiveTab {
    BASIC = 'BASIC',
    ADVANCED = 'ADVANCED',
}

interface InfoPanelCCState {
    activeTab: CCActiveTab,
}

const WarningIcon:any = require('../assets/icons/icons8-warning-96.png');

/**
 * this version uses local state. We keep top-level state in AptdApp as the
 * source of *verified* truth, but need local state to reflect user input,
 * in case where user makes errors.  Local state is in InputField components.
 */
class InfoPanelCC extends React.Component<InfoPanelCCProps, InfoPanelCCState> {

    constructor(props: InfoPanelCCProps) {
        super(props);
        console.debug('lifecycle InfoPanelCC constructor(): start. this.props.ccId=', this.props.ccModel.id);
        let activeTab:CCActiveTab = this.props.activeTab !== undefined ?
            this.props.activeTab : CCActiveTab.BASIC;

        this.state = {
            activeTab: activeTab,
        };

        this.onTabClick = this.onTabClick.bind(this);
    }

    render() {
        let warning: string = '';
        const cardType: string = InfoPanelCC.toCardType(this.props.ccModel.cardInterface);
        let header: string = '';
        switch (this.props.ccModel.cardInterface) {
            case Interface.SDLC:
                header = 'FlexConnect Bank ' + this.props.bankNo;
                warning = ' FlexConnect Bank ' + this.props.bankNo + ' is not reporting';
                break;
            case Interface.CCCard:
            case Interface.EXCard:
                const ccModel: GUICCCardClient = this.props.ccModel as GUICCCardClient;
                header = cardType + ' Card: Shelf ' + ccModel.shelf +
                                    ' Slot ' + ccModel.slot;
                warning = ' ' + cardType + ' Card: Shelf ' + ccModel.shelf +
                                           ' Slot ' + ccModel.slot + ' is not reporting';
                break;
            default:
                throw new Error('unexpected cardType: ' + cardType);
        }
        let tabContent: React.ReactNode;
        let basicLiClassList = 'tab basic';
        let advancedLiClassList = 'tab advanced';
        switch (this.state.activeTab) {
            case CCActiveTab.BASIC:
                tabContent = (<InfoPanelCCBasic key={'CCBasic'}
                                                ccModel={this.props.ccModel}
                                                bankNo={this.props.bankNo}
                                                ccId={'CCBasic'}
                                                topStore={this.props.topStore}
                                                undoManager={this.props.undoManager}
                                                webSocketManager={this.props.webSocketManager}
                              />);
                basicLiClassList += (' active');
                break;

            case CCActiveTab.ADVANCED:
                tabContent = (<InfoPanelCCAdvanced key={'CCAdvanced'}
                                               ccModel={this.props.ccModel}

                                               bankNo={this.props.bankNo}

                                               ccId={'CCAdvanced'}
                                               topStore={this.props.topStore}
                                               undoManager={this.props.undoManager}                              />);
                advancedLiClassList += (' active');
                break;

            default:
                throw new Error('unexpected activeTab value: ' + this.state.activeTab);
        }

        return (
            <div id='infoPanelCC'>
                <div id='infoPanelCCHeader' className="infoPanelHeader">{header}</div>
                {this.props.ccModel.unheard &&
                    <span id='infoPanelUnheardWarning'>
                        <img src={WarningIcon} width={17} alt={'unheard'}></img>
                        {warning}
                    </span>
                }
                <div id='ccForm'>
                    <ul className='tab-list'>
                        {/* <li id='basic' className={basicLiClassList} onClick={this.onTabClick}>Basic</li> */}
                        {/* <li id='advanced' className={advancedLiClassList} onClick={this.onTabClick}>Advanced</li> */}
                    </ul>
                    {tabContent}
                </div>
            </div>
        )
    }

    private onTabClick(event: React.MouseEvent<HTMLLIElement, MouseEvent>):void {
        const liClicked: HTMLLIElement = event.currentTarget;
        if (liClicked.classList.contains('basic')) {
            this.props.setCCActiveTab(CCActiveTab.BASIC);
            this.setState({activeTab: CCActiveTab.BASIC});
        } else if (liClicked.classList.contains('advanced')) {
            this.props.setCCActiveTab(CCActiveTab.ADVANCED);
            this.setState({activeTab: CCActiveTab.ADVANCED});
        } else {
            throw new Error('unexpected li classlist' + liClicked.classList);
        }
    }

    /** converts Interface enum to user-viewable string */
    private static toCardType(intface:Interface): string {
        let type:string = '';
        switch(intface) {
            case Interface.CCCard: type='CC'; break;
            case Interface.EXCard: type='EX'; break;
            case Interface.SDLC: type='Flex Connect (SDLC)'; break;
            default: console.error('unexpected interface ', intface);
        }
        return type;
    }

    public static renderSensorsForChannel(sensorDotIds: string[], channelId: string, topState: TopStoreState, topStore: TopStore, undoManager: UndoManager, channel: GUICCChannel) {
        const sensorInfo: React.ReactNode[] = [];
        sensorDotIds.sort((a, b) =>  {
            let an = topState.sensorZones[topState.sensorDotidToSzId[a]].name.split(' ')[2];
            let bn = topState.sensorZones[topState.sensorDotidToSzId[b]].name.split(' ')[2];
            return ("" + an).localeCompare(bn, undefined, {numeric: true});
        }).map(sensorDotId => {
            const szId: string = topState.sensorDotidToSzId[sensorDotId];
            const sensorZone: GUISZClient = topState.sensorZones[szId];
            const ccCards = topState.ccCards;
            let includeFailSafe = true;
            if(ccCards.SDLC) {
                includeFailSafe = ccCards.SDLC.channelsById[channelId].sensorFailSafe[sensorDotId];
            } else {
                let subChannelId = channelId.split('-')
                const key = subChannelId[0]+'-'+subChannelId[1];
                includeFailSafe = ccCards[key].channelsById[channelId].sensorFailSafe[sensorDotId];
            }
            let selectedLinkInfoMatches: boolean = false;
            if (topState.selectedLinkInfo !== null &&
                topState.selectedLinkInfo !== undefined) {
                selectedLinkInfoMatches =
                    (sensorDotId === topState.selectedLinkInfo.deviceId &&
                     channelId === topState.selectedLinkInfo.channelId &&
                     topState.selectedLinkInfo.linkType === 'ccLink'
                    );
            }
            let srClass = selectedLinkInfoMatches ? 'sensor-highlight' : '';
            sensorInfo.push(
                <tr className={srClass} key={sensorDotId}>
                    <td colSpan={6} className='sensorInfo'>
                        <span className='sensor-row'>
                            <span className='card-ss'>Sensor Zone: <b>{sensorZone.name}</b>, </span>
                            <span className='card-ss'>Sensor: <b>{sensorDotId}</b>, </span>
                            <span className='card-ss'>Failsafe: 
                                <CheckboxField
                                    label={'Failsafe'}
                                    showLabel={false}
                                    value={includeFailSafe}
                                    className={'fsEnable'}
                                    objectId={channelId}
                                    objectType={ObjectType.CC_LINK}
                                    fieldName={sensorDotId}
                                    idName={'failsafe'+ sensorDotId}
                                    key={'failsafe' + sensorDotId}
                                    topStore={topStore}
                                    undoManager={undoManager}
                                />
                            </span>
                        </span>
                    </td>
                </tr>
            )
        })
        return sensorInfo;
    }
}

export default InfoPanelCC;
