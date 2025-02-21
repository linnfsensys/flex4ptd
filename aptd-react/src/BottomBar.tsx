import React, {ReactNode} from 'react';
import './BottomBar.css'
import WebSocketManager from "./WebSocketManager";
import TopStore from "./TopStore";
import Modal from "./Modal";
import {ModalType} from "./AptdClientTypes";
import {RequireLogin} from "./AptdServerTypes";
import AptdButton from "./AptdButton";

interface BottomBarProps {
    /** current ap (aptd server) epoch time in millis */
    currentApTime: number | null,
    currentApTimezone: string | null,
    clientTimeMsAtLastServerUpdate: number | null,
    connected: boolean,
    webSocketManager: WebSocketManager | null,
    topStore: TopStore,
}

interface BottomBarState {
    /** current ap (aptd server) epoch time in millis, updated by client as time progresses */
    currentApTime: number | null,
    currentClientDate: number,
    lastServerApTime: number | null,
    prevTimestampUpdateTs: number | null,
    createNewTimer: boolean,
    showEasterEgg: boolean,
}

const EasterEggImage:any = require('./assets/icons/aptd-team.png');

class BottomBar extends React.Component<BottomBarProps, BottomBarState> {
    public updateTsTimer: NodeJS.Timeout | null;

    constructor(props: BottomBarProps) {
        super(props);
        const now: number = Date.now();
        this.updateTsTimer = null;
        this.state = {
            currentApTime: null,
            currentClientDate: now,
            lastServerApTime: null,
            prevTimestampUpdateTs: null,
            createNewTimer: false,
            showEasterEgg: false,
        };
        this.createTimer = this.createTimer.bind(this);
        this.updateTimestamp = this.updateTimestamp.bind(this);
        this.showEasterEgg = this.showEasterEgg.bind(this);
        this.closeEasterEgg = this.closeEasterEgg.bind(this);
        this.renderLogoutButton = this.renderLogoutButton.bind(this);
        this.renderEasterEgg = this.renderEasterEgg.bind(this);
    }

    static getDerivedStateFromProps(nextProps: BottomBarProps, prevState:  BottomBarState): Partial<BottomBarState> | null {
        let derivedState:  Partial<BottomBarState> | null = null;
        
        if (nextProps.currentApTime !== prevState.lastServerApTime) {
            const now: number = Date.now();
            derivedState = {
                currentApTime: nextProps.currentApTime,
                currentClientDate: now,
                lastServerApTime: nextProps.currentApTime,
                prevTimestampUpdateTs: nextProps.clientTimeMsAtLastServerUpdate,
                createNewTimer: true
            };
        } else {
            derivedState = {
                createNewTimer: false
            };
        }
        return derivedState;
    }

    private showEasterEgg() {
        this.setState(() => ( {showEasterEgg: true}));
    }

    private closeEasterEgg():void {
        this.setState(() => ( {showEasterEgg: false}));
    }

    /**
     * @return true iff 2nd number (minor version number) is odd -- i.e. engineering version.
     *         So for 1.2.0.48, return false.
     *            for 1.1.0.56 return true.
     * @param versionString e.g. 1.2.0.48 (four parts)
     */
    private isBeta(versionString: string): boolean {
        return (+(versionString.split('.')[1]) % 2 === 1);
    }

    render() {
        if (this.state.createNewTimer) {
            //console.debug('BottomBar.render(): creating new timer. ');
            this.createTimer();
        }
        let theAP = this.props.topStore.getTopState().ap;
        let aptdVersion = "";
        let beta = "";
        if (theAP !== null) {
            aptdVersion = 'Version ' + theAP.aptdVersion;
            if (this.isBeta(theAP.aptdVersion)) {
                beta = "(BETA Release)";
            }
        }

        let time: string = "";
        if (this.state.currentApTime !== null) {
            const d: Date = new Date(this.state.currentApTime);
            time = "Gateway time: " + d.toLocaleString() + " (" + this.props.currentApTimezone + ")";
        }
        return (
            <div id="bottomBar">
                <span id={'versionSpan'} className='noselect' onClick={this.showEasterEgg}>
                    {aptdVersion} <span id='betaSpan'>{beta}</span>
                </span>
                <span id='logoutSpan' className='buttonPane'>
                    {this.renderLogoutButton()}
                </span>
                <span id={'middleSpan'}/>
                <span id='timeSpan'>{time} &mdash;&nbsp;
                    <span id='connected'>
                        {this.props.connected === true ? "Connected" : "Not Connected"}
                    </span>
                </span>
                <Modal
                    modalClasses='bottomModal'
                    show={this.state.showEasterEgg}
                    type={ModalType.ONE_BUTTON_SUCCESS}
                    description={'Hello from the developers of SensConfig!'}
                    onClicks={[this.closeEasterEgg]}
                    node={this.renderEasterEgg()}
                    buttonLabels={['Close']}
                    topStore={this.props.topStore}
                />
            </div>
        )
    }

    private renderEasterEgg(): ReactNode {
        return (
            <img src={EasterEggImage} width={471} alt={"The developers of SensConfig"}></img>
        )
    }

    private renderLogoutButton(): ReactNode {
        let requireLogin:RequireLogin = RequireLogin.DISABLED;
        let ap = this.props.topStore.getTopState().ap;
        if (ap !== null) {
            requireLogin = ap.requireLogin;
        }
        if (requireLogin === RequireLogin.ENABLED) {
            return (
                <AptdButton id='logout'
                            text='Logout'
                            disabled={ap!.requireLoginStateSaved ? false : true}
                            title=''
                            theClassName='gray'
                            onClick={this.doLogout}
                />
            );
        }
        else {
            return null;
        }
    }

    private doLogout() {
        window.location.href = '/login.html';
    }

    /** creates a timer that every second updates the time */
    private createTimer():void {
        if (this.updateTsTimer !== null) {
            clearTimeout(this.updateTsTimer);
            this.updateTsTimer = null;
        }
        this.updateTsTimer = setInterval(this.updateTimestamp, 1000);
    }

    private updateTimestamp(): void {
        this.setState((prevState: BottomBarState) => {
            if (prevState.currentApTime !== null && prevState.prevTimestampUpdateTs !== null) {
                const currentTs:number = (new Date()).getTime();
                const timeDiff:number = currentTs - prevState.prevTimestampUpdateTs;
                let apTime = prevState.currentApTime + timeDiff;
                return {
                    currentApTime: apTime, 
                    prevTimestampUpdateTs: currentTs,
                    createNewTimer: false
                };    
            }
            return  null;
        });
    }
}

export default BottomBar;
