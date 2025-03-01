import React, {Component, ReactNode} from 'react';
import './TopBar.css';
import {GUIRadioClient, ModalType, ObjectType, UpdateType} from "./AptdClientTypes"
import WebSocketManager from "./WebSocketManager";
import AptdApp, {SaveColor} from "./AptdApp";
import UndoManager from "./UndoManager";
import TopStore from "./TopStore";
import AptdButton from "./AptdButton";
import HelpEngine, {HelpLocType} from "./help/HelpEngine";
import ProgressBar from "./widgets/ProgressBar";
import HelpEngineBalloon from './help/HelpEngineBalloon';
import {GUIPoint} from './AptdServerTypes';

interface TopBarProps {
    undoEnabled: boolean,
    redoEnabled: boolean,
    saveEnabled: boolean,
    doUndo: ()=>void,
    doRedo: ()=>void,
    undoLabel: string,
    redoLabel: string,
    saveColor: SaveColor,
    pingScanStatus: number | null,
    pingScanSecsLeft: number | null,
    savePctComplete: number | null,
    showModal: (modalType: ModalType, description: string, buttonLabels?: string[], buttonOnClicks?: Array<()=>void>) => void,
    //sendSaveMsg: ()=>void,
    websocketManager: WebSocketManager | null,
    topStore: TopStore,
    undoManager: UndoManager,
    helpEngine: HelpEngine,
    onHelpGuideClicked: ()=>void,
    children?: ReactNode,
}

// HR: apparently, couldn't easily use the import syntax for images, due to Typescript.
// TODO: there may be a way to do it.
const UndoIcon:any = require('./assets/icons/iconfinder_reload-refresh-repeat-arrow_2937372.png');
const RedoIcon:any = require('./assets/icons/iconfinder_reload-refresh-arrow-repeat_2937371.png');
const SaveIcon:any = require('./assets/icons/iconfinder_exit-enter-leave-door-in_2931189.png');
const GreenRadarIcon:any = require('./assets/icons/radar_35px_green.gif');
const GoldRadarIcon:any = require('./assets/icons/radar_35px_gold.gif');
const SensysLogo:any = require('./assets/icons/sensys_logo_white.svg');
const SensConfigLogo:any = require('./assets/icons/SensConfig-logo-02.svg');

class TopBar extends Component<TopBarProps, any> {
    private saveProgressVisible: boolean;

    constructor(props: TopBarProps) {
        super(props);
        this.saveProgressVisible = false;

        this.onStopScanClicked = this.onStopScanClicked.bind(this);
        this.onStartScanClicked = this.onStartScanClicked.bind(this);
        this.onSaveClicked = this.onSaveClicked.bind(this);
        this.onGetTechSupportClicked = this.onGetTechSupportClicked.bind(this);
        this.onProductNameClick = this.onProductNameClick.bind(this);
        this.renderHelpBalloonOverlay = this.renderHelpBalloonOverlay.bind(this);
        this.isRadioAvailable = this.isRadioAvailable.bind(this);
        this.convertStringAttributeToNumber = this.convertStringAttributeToNumber.bind(this);
    }



    render(): ReactNode {
        const nodeMode = process.env.NODE_ENV;
        let productionMode: boolean = false;
        if (nodeMode === 'production') {
            productionMode = true;
        }

        const undoButtonText = productionMode ? '' : 'Undo ' + this.props.undoLabel;
        const redoButtonText = productionMode ? '' : 'Redo ' + this.props.redoLabel;
        let pingScanStatus:number|null = this.props.pingScanStatus;
        if (pingScanStatus === 100) {
            pingScanStatus = null;
        }

        // The complexity here is how long to keep savePercentComplete at 100% after a Save.
        // We don't want to reset it right away.
        // So we reset it when user makes an undoable gesture that would require a save.
        let saveProgressLabel: string;
        let savePercentComplete: number;
        if (this.props.savePctComplete === null) {
            saveProgressLabel = '';
            savePercentComplete = 0;
        } else if ((this.props.websocketManager === null || ! this.props.websocketManager.thisUserInitiatedSave) &&
                   (this.props.saveEnabled || this.props.saveColor === SaveColor.PINK)) {
            // if not in mid-save, and save button enabled, show progress as zero
            // TODO: by using thisUserInitiatedSave, it means other users will not see save progress indicator
            saveProgressLabel = '0% complete';
            savePercentComplete = 0;
        } else {
            saveProgressLabel = '' + this.props.savePctComplete + '% complete';
            savePercentComplete = this.props.savePctComplete;
        }

        this.saveProgressVisible = this.props.savePctComplete !== null &&
                                   this.props.websocketManager !== null /* &&
                                   // ideally we would want save progress bar to show only for
                                   // originating user, but it is too hard to make this work after
                                   // a comms loss, so eliminating...
                                   this.props.websocketManager.thisUserInitiatedSave */;

        
        let helpGuidePresent = this.props.helpEngine.isHelpEnabled();
        let helpBalloonOverlay: ReactNode = null;

        if (helpGuidePresent) {
            helpBalloonOverlay = this.renderHelpBalloonOverlay(); 
        }

        let saveTitle: string = '';
        if (this.props.saveColor === SaveColor.PINK) {
            saveTitle = 'Please fix all validation errors before Saving';
        } else if (this.props.saveColor === SaveColor.YELLOW && pingScanStatus !== null) {
            saveTitle = 'Please wait for scan to complete before doing Save';
        }

        const configuredDevicesResolved:boolean =
            this.props.topStore.getTopState().configuredDevicesResolved;

        return (
            <div id='topBar'>
                <span id='sensysLogoSpan'>
                    <a href='#' id='sensysLogoA' className='logo'
                       title='Sensys Networks: SensConfig'
                    >
                        <img id='sensysLogo' src={SensysLogo} />
                    </a>
                </span>
                {helpBalloonOverlay}
                <span className='buttonBar buttonPane' id='helpAndScan'>
                    <span id="pingScanAndProgress">
                        <AptdButton id='helpButton'
                                    text={helpGuidePresent ? 'Hide Help': 'Show Help'}
                                    title=''
                                    theClassName='blue'
                                    helpEngine={this.props.helpEngine}
                                    onClick={this.props.onHelpGuideClicked}
                        />

                        {pingScanStatus !== null ?
                            <AptdButton id={'stopScan'}
                                        title={''}
                                        helpEngine={this.props.helpEngine}
                                        text={'Stop Finding Devices'}
                                        disabled={this.props.topStore.getTopState().pingScanNoCancel}
                                        onClick={this.onStopScanClicked}
                            />
                            :
                            <AptdButton id={'startScan'}
                                        title={''}
                                        helpEngine={this.props.helpEngine}
                                        text={'Find Devices'}  // new label requested by Robert
                                        disabled={! this.isRadioAvailable() ||
                                                  ! configuredDevicesResolved}
                                        onClick={this.onStartScanClicked}
                            />
                        }

                        <img src={GoldRadarIcon} width={25} alt={'scan'}
                             className={pingScanStatus === null ? 'invisible': 'visible'}>
                        </img>
                        {/* Ping Scan Progress Bar */}
                        <ProgressBar
                            label={'Device Scan will finish in ' + this.props.pingScanSecsLeft + ' secs'}
                            label2='Please wait'
                            idName={'scanProgress'}
                            value={this.props.pingScanStatus === null ? 0 : this.props.pingScanStatus}
                            visible={pingScanStatus !== null}
                            max={100} />
                    </span>
                </span>

                <span id="appLogo" onClick={this.onProductNameClick}>
                    {/*SensConfig*/}
                    <a href='#' id='sensConfigLogoA' className='logo'
                       title=''
                    >
                        <img id='sensConfigLogo' src={SensConfigLogo} />
                    </a>
                </span>

                <span id='awaitingResolution'>
                    {configuredDevicesResolved ||
                        <>
                            <img src={GreenRadarIcon} width={35} height={35}
                                 alt={'scanning for devices'}
                                 className='visible'>
                            </img>
                            <span id='awaitingResolutionMsg'>
                                Receiving Device Configuration
                            </span>
                        </>
                    }
                </span>
                <span className='buttonBar buttonPane' id='undoRedoSave'>
                    {/* save progress bar*/}
                    <ProgressBar
                        label={saveProgressLabel}
                        idName={'saveProgress'}
                        value={savePercentComplete}
                        visible={this.saveProgressVisible}
                        max={100} 
                    />

                    <AptdButton id={'undo'}
                                title={undoButtonText}
                                helpEngine={this.props.helpEngine}
                                disabled={! this.props.undoEnabled}
                                imgIcon={UndoIcon} imgWidth={12} imgAlt={'undo action'}
                                text={'Undo'}
                                onClick={() => {
                                    AptdApp.blurFocusedField();
                                    AptdApp.unfocusInfoPanelTextField();
                                    // setTimeout allows textField updates to TopStore
                                    setTimeout(this.props.doUndo, 500);
                                }}
                    />
                    <AptdButton id={'redo'}
                                title={redoButtonText}
                                helpEngine={this.props.helpEngine}
                                disabled={! this.props.redoEnabled}
                                imgIcon={RedoIcon} imgWidth={12} imgAlt={'redo action'}
                                text={'Redo'}
                                onClick={() => {
                                    AptdApp.blurFocusedField();
                                    AptdApp.unfocusInfoPanelTextField();
                                    // setTimeout allows textField updates to TopStore
                                    setTimeout(this.props.doRedo, 500);
                                }}
                    />
                    <AptdButton id={'save'}
                                title={saveTitle}
                                helpEngine={this.props.helpEngine}
                                disabled={! this.props.saveEnabled}
                                imgIcon={SaveIcon} imgWidth={12} imgAlt={'save configuration'}
                                text={'Save'}
                                onClick={() => {
                                    AptdApp.blurFocusedField();
                                    AptdApp.unfocusInfoPanelTextField();
                                    // setTimeout allows textField updates to TopStore
                                    setTimeout(this.onSaveClicked, 1000);
                                }}
                                theClassName={this.props.saveColor === SaveColor.PINK ?
                                    'pink red' : this.props.saveColor}
                    />
                    {this.props.children}
                </span>
            </div>
        )
    }

    /** @returns true iff there is at least 1 radio that is heard */
    private isRadioAvailable():boolean {
        const allUnheard:boolean = Object.values(this.props.topStore.getTopState().radios)
                                        .every((radio:GUIRadioClient)=>(radio.unheard));
        //console.debug('isRadioAvailable(): about to return', ! allUnheard);
        return ! allUnheard;
    }

    private convertStringAttributeToNumber(stringAttribute: string | null): number {
        let numberVal = 0;
        if (stringAttribute !== null && stringAttribute.includes("px")) {
            numberVal = Number(stringAttribute.slice(0, stringAttribute.length - 2));
        }
        return numberVal;
    }

    renderHelpBalloonOverlay(): ReactNode {
        let helpBalloonDiv = document.getElementById('balloonOverlayDiv');
        let helpBalloonRect = document.getElementById('SaveBalloon0');
        if (helpBalloonDiv !== null && helpBalloonRect !== null) {
            let balloonRectWidth = this.convertStringAttributeToNumber(window.getComputedStyle(helpBalloonRect).width);
            balloonRectWidth = balloonRectWidth + 10;
            let saveButton = document.getElementById("save");
            let progessDiv = document.getElementById("saveProgressDiv");
            let progessBar = document.getElementById("saveProgress");
            let redoButton = document.getElementById("redo");
            let buttonBar = document.getElementById("buttonBar");
            if (saveButton !== null && progessBar !== null && progessDiv !== null && redoButton !== null && buttonBar !== null) {
                let progressBarWidth = progessBar.clientWidth;
                let progressDivMarginLeft = this.convertStringAttributeToNumber(window.getComputedStyle(progessDiv).marginLeft);
                let saveButtonWidth = this.convertStringAttributeToNumber(window.getComputedStyle(saveButton).width);
                let saveButtonMarginLeft = this.convertStringAttributeToNumber(window.getComputedStyle(saveButton).marginLeft);
                let buttonBarRight = this.convertStringAttributeToNumber(window.getComputedStyle(buttonBar).right);
                let rightDis = progressBarWidth + progressDivMarginLeft + saveButtonWidth + saveButtonMarginLeft + buttonBarRight;
                helpBalloonDiv.setAttribute("style","width:" + balloonRectWidth + "px;right:" + rightDis + "px;");
            }
        }
        let balloon: ReactNode = null;
        let balloon_index = -1;
        for (let helpBalloon of this.props.topStore.getTopState().helpBalloons) {
            balloon_index += 1;
            if (helpBalloon.location.helpLocType === HelpLocType.BUTTON_TOP_BAR &&
                helpBalloon.location.locObjectType === ObjectType.BUTTON_TOP_BAR) {

                let trayLoc: GUIPoint = {x: 10, y: 10};
                balloon = (
                    <div id={'balloonOverlayDiv'} className="balloonOverlay">
                        <svg className="balloonOverlay">
                            <g>
                                <HelpEngineBalloon
                                    key={helpBalloon.location.helpLocType + helpBalloon.location.locObjectId}
                                    id={'SaveBalloon' + balloon_index}
                                    balloon={helpBalloon}
                                    position={trayLoc}
                                    mapImageScale={1}
                                    helpEngine={this.props.helpEngine}
                                    onHelpGuideClicked={this.props.onHelpGuideClicked}
                                />
                            </g>
                        </svg>
                    </div>
                );
            }
        }
        return balloon;
    }


    private onStopScanClicked(event: React.MouseEvent<HTMLButtonElement, MouseEvent>):void {
        AptdApp.blurFocusedField();
        AptdApp.unfocusInfoPanelTextField();
        if (this.props.websocketManager === null) {
            console.error('websocketManager is null');
            this.props.showModal(ModalType.ONE_BUTTON_ERROR, 'SensConfig is unable to connect.')
        } else {
            // setTimeout allows textField updates to TopStore
            setTimeout(this.props.websocketManager.stopPingScan, 500);
        }
    }

    private onStartScanClicked(event: React.MouseEvent<HTMLButtonElement, MouseEvent>):void {
        AptdApp.blurFocusedField();
        AptdApp.unfocusInfoPanelTextField();
        if (this.props.websocketManager === null) {
            console.error('websocketManager is null');
            this.props.showModal(ModalType.ONE_BUTTON_ERROR, 'SensConfig is unable to connect.')
        } else {
            // setTimeout allows textField updates to TopStore
            setTimeout(this.props.websocketManager.startPingScan, 500);
        }
    }


    onSaveClicked():void {
        console.debug('user clicked Save button. about to send Save msg to server');
        if (this.props.websocketManager === null) {
            console.error('websocketManager is null');
            this.props.showModal(ModalType.ONE_BUTTON_ERROR, 'SensConfig is unable to connect.')
        } else {
            this.props.websocketManager.sendSaveMsg();
            this.props.topStore.enact({
                actions: [{
                    objectType: ObjectType.AWAITING_SAVE_RESULT,
                    newData: true,
                    updateType: UpdateType.UPDATE,
                    objectId: '',
                }],
                description: 'set awaitingSaveResult to true',
            });
            this.props.undoManager.clearDoneStack();
        }
    }

    private onGetTechSupportClicked():void {
        console.debug('user made Get Tech Support gesture.');
        if (this.props.websocketManager === null) {
            console.error('websocketManager is null');
            this.props.showModal(ModalType.ONE_BUTTON_ERROR, 'SensConfig is unable to connect.')
        } else {
            this.props.websocketManager.getTechSupportData();
        }
    }

    /**
     * If user holds CTRL-SHIFT (Windows) or CMD-SHIFT (for mac) while clicking,
     * show tech support page.
     * Also, suppress standard browser behaviors if user ctrl-clicks or meta-clicks Product Name.
     */
    private onProductNameClick(event: React.MouseEvent) {
        const isMac: boolean = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        if (event.ctrlKey === true || event.metaKey === true || event.altKey === true || event.shiftKey === true) {
            // suppress standard browser behaviors.
            // note: on Windows metaKey is WINDOWS key.
            //       on Mac,    metaKey is COMMAND key.
            event.preventDefault();
        }
        if (event.ctrlKey === true || (isMac && event.metaKey === true)) {
            if (event.shiftKey === true) {
                this.onGetTechSupportClicked();
            }
        }
    }
}

export default TopBar;
