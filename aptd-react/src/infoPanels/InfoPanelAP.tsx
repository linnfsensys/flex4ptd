import React from 'react';
import './InfoPanel.css';
import InfoPanelAPNetwork from "./InfoPanelAPNetwork";
import InfoPanelAPInfo from "./InfoPanelAPInfo";
import './InfoPanelAP.css';
import InfoPanelAPVCC from "./InfoPanelAPVCC";
import TopStore from "../TopStore";
import UndoManager from "../UndoManager";
import WebSocketManager from "../WebSocketManager";
import {GUIAPConfigClient, GUICCAPGIClient} from "../AptdClientTypes";
import HttpManager from "../HttpManager";
import InfoPanelAPProperties from "./InfoPanelAPProperties";


export enum ActiveTab {
    NETWORK = 'NETWORK',
    INFO = 'INFO',
    VIRTUAL_CC = 'VIRTUAL_CC',
    PROPERTIES = 'PROPERTIES',
}

interface InfoPanelAPProps {
    apId: string,
    apModel: GUIAPConfigClient,
    activeTab?: ActiveTab,
    setAPActiveTab: (activeTab: ActiveTab)=>void,
    webSocketManager: WebSocketManager | null,
    topStore: TopStore,
    undoManager: UndoManager,
    httpManager: HttpManager,
    onRequireLoginChanged: ()=>void,
}

interface InfoPanelAPState {
    activeTab: ActiveTab,
}


/**
 * this version uses local state. We keep top-level state in AptdApp as the
 * source of *verified* truth, but need local state to reflect user input,
 * in case where user makes errors.  Local state is in InputField components.
 */
class InfoPanelAP extends React.Component<InfoPanelAPProps, InfoPanelAPState> {

    constructor(props: InfoPanelAPProps) {
        super(props);
        console.debug('lifecycle InfoPanelAP constructor(): start. this.props.apId=', this.props.apModel.id);
        let activeTab:ActiveTab = this.props.activeTab !== undefined ?
            this.props.activeTab : ActiveTab.NETWORK;

        this.state = {
            activeTab: activeTab,
        };

        this.onTabClick = this.onTabClick.bind(this);
    }

    render() {
        const apegId: string = this.props.apModel.serialNumber === undefined ?
                               '' : 'apeg' + this.props.apModel.serialNumber;
        const header = 'Gateway ' + apegId;
        let tabContent: React.ReactNode;
        let networkLiClassList = 'tab network';
        let infoLiClassList = 'tab info';
        let virtual_ccLiClassList = 'tab virtual_cc';
        let propertiesLiClassList = 'tab properties';
        switch (this.state.activeTab) {
            case ActiveTab.NETWORK:
                tabContent = (<InfoPanelAPNetwork key={'APNetwork'}
                                                  apModel={this.props.apModel}
                                                  apId={'AP'}
                                                  topStore={this.props.topStore}
                                                  undoManager={this.props.undoManager}
                                                  webSocketManager={this.props.webSocketManager}
                                                  onRequireLoginChanged={this.props.onRequireLoginChanged}
                              />);
                networkLiClassList += (' active');
                break;
            case ActiveTab.INFO:
                tabContent = (<InfoPanelAPInfo key={'APInfo'}
                                               apModel={this.props.apModel}
                                               apId={'AP'}
                                               webSocketManager={this.props.webSocketManager}
                                               topStore={this.props.topStore}
                                               undoManager={this.props.undoManager}
                                               httpManager={this.props.httpManager}
                            />);
                infoLiClassList += (' active');
                break;
            case ActiveTab.VIRTUAL_CC:
                tabContent = (<InfoPanelAPVCC key={'APVCC'}
                                              apModel={this.props.apModel}
                                              apgi={this.props.topStore.getTopState().ccCards['APGI'] as GUICCAPGIClient}
                                              apId={'AP'}
                                              topStore={this.props.topStore}
                                              undoManager={this.props.undoManager}
                             />);
                virtual_ccLiClassList += (' active');
                break;
            case ActiveTab.PROPERTIES:
                tabContent = (<InfoPanelAPProperties key={'APProperties'}
                                               apModel={this.props.apModel}
                                               apId={'AP'}
                                               webSocketManager={this.props.webSocketManager}
                                               topStore={this.props.topStore}
                                               undoManager={this.props.undoManager}
                                               httpManager={this.props.httpManager}
                />);
                propertiesLiClassList += (' active');
                break;
            default:
                throw new Error('unexpected activeTab value: ' + this.state.activeTab);
        }

        return (
            <div id='infoPanelAP'>
                <div id='infoPanelAPHeader' className="infoPanelHeader">{header}</div>
                <div id='apForm'>
                    <ul className='tab-list'>
                        <li id='network' className={networkLiClassList} onClick={this.onTabClick}>Network</li>
                        <li id='info' className={infoLiClassList} onClick={this.onTabClick}>Utilities</li>
                        <li id='virtual_cc' className={virtual_ccLiClassList} onClick={this.onTabClick}>Virtual CC</li>
                        <li id='properties' className={propertiesLiClassList} onClick={this.onTabClick}>Properties</li>
                    </ul>
                    {tabContent}
                </div>
            </div>
        )
    }

    private onTabClick(event: React.MouseEvent<HTMLLIElement, MouseEvent>):void {
        const liClicked: HTMLLIElement = event.currentTarget;
        if (liClicked.classList.contains('network')) {
            this.props.setAPActiveTab(ActiveTab.NETWORK);
            this.setState({activeTab: ActiveTab.NETWORK});
        } else if (liClicked.classList.contains('info')) {
            this.props.setAPActiveTab(ActiveTab.INFO);
            this.setState({activeTab: ActiveTab.INFO});
        } else if (liClicked.classList.contains('virtual_cc')) {
            this.props.setAPActiveTab(ActiveTab.VIRTUAL_CC);
            this.setState({activeTab: ActiveTab.VIRTUAL_CC});
        } else if (liClicked.classList.contains('properties')) {
            this.props.setAPActiveTab(ActiveTab.PROPERTIES);
            this.setState({activeTab: ActiveTab.PROPERTIES});
        } else {
            console.error('unexpected click on ' + liClicked.classList);
        }
    }

}

export default InfoPanelAP;