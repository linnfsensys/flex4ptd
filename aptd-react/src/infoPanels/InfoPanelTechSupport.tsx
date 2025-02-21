import React from 'react';
import './InfoPanel.css';
import './InfoPanelAP.css';
import {GUITechSupport} from "../AptdServerTypes";
import InfoPanelTechSupportJobs from "./InfoPanelTechSupportJobs";
import InfoPanelTechSupportLoggers from "./InfoPanelTechSupportLoggers";
import InfoPanelTechSupportProperties from "./InfoPanelTechSupportProperties";
import WebSocketManager from "../WebSocketManager";
import UndoManager from "../UndoManager";
import TopStore from "../TopStore";

interface InfoPanelTechSupportProps {
    techSupportModel: GUITechSupport | null,
    activeTab?: TechSupportActiveTab,
    setTechSupportActiveTab: (activeTab: TechSupportActiveTab)=>void,
    webSocketManager: WebSocketManager | null,
    topStore: TopStore,
    undoManager: UndoManager,
}

export enum TechSupportActiveTab {
    JOBS = 'JOBS',
    LOGGERS = 'LOGGERS',
    PROPS = 'PROPS'
}

interface InfoPanelTechSupportState {
    activeTab: TechSupportActiveTab,
}

/**
 * this version uses local state. We keep top-level state in AptdApp as the
 * source of *verified* truth, but need local state to reflect user input,
 * in case where user makes errors.  Local state is in InputField components.
 */
class InfoPanelTechSupport extends React.Component<InfoPanelTechSupportProps, InfoPanelTechSupportState> {

    constructor(props: InfoPanelTechSupportProps) {
        super(props);
        console.debug('lifecycle InfoPanelTechSupport constructor(): start');
        let activeTab:TechSupportActiveTab = this.props.activeTab !== undefined ?
            this.props.activeTab : TechSupportActiveTab.JOBS;

        this.state = {
            activeTab: activeTab,
        };

        this.onTabClick = this.onTabClick.bind(this);
    }

    render() {
        const header = 'Tech Support';
        let tabContent: React.ReactNode;
        let jobsLiClassList = 'tab jobs';
        let loggersLiClassList = 'tab loggers';
        let propsLiClassList = 'tab props';
        switch (this.state.activeTab) {
            case TechSupportActiveTab.JOBS:
                tabContent = (<InfoPanelTechSupportJobs key={'TechSupportJobs'}
                                                  techSupportModel={this.props.techSupportModel}
                                                  enactXactsToStore={this.props.undoManager.enactActionsToStore}
                />);
                jobsLiClassList += (' active');
                break;
            case TechSupportActiveTab.LOGGERS:
                tabContent = (<InfoPanelTechSupportLoggers key={'TechSupportLoggers'}
                                               techSupportModel={this.props.techSupportModel}
                                               webSocketManager={this.props.webSocketManager}
                                               topStore={this.props.topStore}
                                               undoManager={this.props.undoManager}
                />);
                loggersLiClassList += (' active');
                break;
            case TechSupportActiveTab.PROPS:
                tabContent = (<InfoPanelTechSupportProperties key={'TechSupportProperties'}
                                                techSupportModel={this.props.techSupportModel}
                                                webSocketManager={this.props.webSocketManager}
                                                topStore={this.props.topStore}
                                                undoManager={this.props.undoManager}
                />);
                propsLiClassList += (' active');
                break;
            default:
                throw new Error('unexpected activeTab value: ' + this.state.activeTab);
        }

        return (
            <div id='infoPanelTechSupport'>
                <div id='infoPanelTechSupportHeader' className="infoPanelHeader">{header}
                </div>
                <div id='techSupportForm'>
                    <ul className='tab-list'>
                        <li id='loggers' className={loggersLiClassList} onClick={this.onTabClick}>Loggers</li>
                        <li id='props' className={propsLiClassList} onClick={this.onTabClick}>Props</li>
                        <li id='jobs' className={jobsLiClassList} onClick={this.onTabClick}>Jobs</li>
                    </ul>
                    {tabContent}
                </div>
            </div>
        )
    }

    private onTabClick(event: React.MouseEvent<HTMLLIElement, MouseEvent>):void {
        const liClicked: HTMLLIElement = event.currentTarget;
        if (liClicked.classList.contains('jobs')) {
            this.props.setTechSupportActiveTab(TechSupportActiveTab.JOBS);
            this.setState({activeTab: TechSupportActiveTab.JOBS});
        } else if (liClicked.classList.contains('loggers')) {
            this.props.setTechSupportActiveTab(TechSupportActiveTab.LOGGERS);
            this.setState({activeTab: TechSupportActiveTab.LOGGERS});
        } else if (liClicked.classList.contains('props')) {
            this.props.setTechSupportActiveTab(TechSupportActiveTab.PROPS);
            this.setState({activeTab: TechSupportActiveTab.PROPS});
        }
    }



}

export default InfoPanelTechSupport;