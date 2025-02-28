import React, {ReactNode} from 'react';
import MapAndTray from './mapTrayCabinet/MapAndTray';
import TopStore, {TopStoreState,} from './TopStore';
import UndoManager from './UndoManager';
import TopBar from './TopBar';
import InfoPanel from './infoPanels/InfoPanel';
import BottomBar from './BottomBar';
import WebSocketManager from "./WebSocketManager";
import Modal from "./Modal";
import {
    Action,
    ActionGroup,
    APGIChannelIdClient,
    CharacterType,
    EnactType,
    GUISensorClient,
    GUISZClient,
    ModalClass,
    ModalInfo,
    ModalType,
    ObjectType,
    Selected,
    STSChannelIdClient,
    UpdateType
} from "./AptdClientTypes";
import {RequireLogin} from "./AptdServerTypes";
import TimeZoneUnitsMapDisplay from "./TimeZoneUnitsMapDisplay";
import HelpEngine from "./help/HelpEngine";
import HttpManager from "./HttpManager";
import CheckboxField from "./fields/CheckboxField";
import InputField from "./fields/InputField";
import MapImagesManager from "./MapImagesManager";
import './AptdApp.css';
import './button.css';


import ZustandBridge from './store/ZustandBridge';
import ZustandApp from './ZustandApp';
interface LogManager {
    enableLogging: Function;
    disableLogging: Function;
}

export enum SaveColor {
    PINK = 'pink',
    YELLOW = 'yellow',
    GRAY = 'gray',
}

interface AptdAppProps {
    dispatch: (action:Action)=>void,
    appSetState: ((setStateFn: ((prevState: Readonly<TopStoreState>) => (Partial<TopStoreState> | TopStoreState | null)), callback?: () => void) => void | (Partial<TopStoreState> | TopStoreState | null)),
    topStore: TopStore,
    /** purpose is to trigger a render of InfoPanel when selection changes */
    selectedDotId: string|null,
}
interface AptdAppState {
    helpEngine: HelpEngine,
    size_update: boolean,
    undoManager: UndoManager,
    httpManager: HttpManager,
    helpGuideHidden: boolean,
    logManager: LogManager,
    mapImagesManager: MapImagesManager | null,
}


export class AptdApp extends React.Component<AptdAppProps, AptdAppState> {
    private mapCabinetTrayWidth: number;
    private mapCabinetTrayHeight: number;
    private readonly trayHeight: number;
    private readonly mapHeight: number;
    private webSocketManager: WebSocketManager | null = null;
    private showInitializationModal: boolean;

    public static DEFAULT_SENSITIVITY:number = 6;


    constructor(props: AptdAppProps) {
        super(props);
        this.mapCabinetTrayWidth = 500;
        this.mapCabinetTrayHeight = 540;
        this.trayHeight = 60;
        this.mapHeight = this.mapCabinetTrayHeight;

        const undoManager:UndoManager = new UndoManager(this.props.topStore);
        const helpEngine = new HelpEngine(undoManager, this.props.topStore);
        const httpManager: HttpManager = new HttpManager(this.props.topStore);

        this.showInitializationModal = true;

        // overall app state is not kept in AptdApp.state.
        // rather, it is kept in TopStore.state
        this.state = {
            logManager: this.makeLogManager(),
            size_update: false,
            undoManager: undoManager,
            helpEngine: helpEngine,
            httpManager: httpManager,
            helpGuideHidden: false,
            mapImagesManager: null,
        };

        TopStore.orderTray(this.props.topStore.getTopState().trayDevices);
        TopStore.orderCabinet(this.props.topStore.getTopState().ccCards);

        // These bindings are necessary to make `this` work in the callback
        this.getMapSensorsForSz = this.getMapSensorsForSz.bind(this);
        this.onInitializationSave = this.onInitializationSave.bind(this);
        this.onHelpGuideClicked = this.onHelpGuideClicked.bind(this);
        this.onRequireLoginChanged = this.onRequireLoginChanged.bind(this);
        this.testCredentials = this.testCredentials.bind(this);
        this.backOutRequiredLoginAndDismiss = this.backOutRequiredLoginAndDismiss.bind(this);
        this.renderInitializationContent = this.renderInitializationContent.bind(this);
        this.renderUseridPwNode = this.renderUseridPwNode.bind(this);
        this.makeMapImagesManager = this.makeMapImagesManager.bind(this);
        this.onBeforeUnloadWithoutChanges = this.onBeforeUnloadWithoutChanges.bind(this);
        this.onBeforeUnloadWithUnsavedChanges = this.onBeforeUnloadWithUnsavedChanges.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);

        // TODO: remove for production!  or make it conditional on dev build
        // HR: using this for debugging ONLY!!!
        //this.state.logManager.enableLogging();
    }

    render() {
        this.mapCabinetTrayWidth = document.body.clientWidth - 367;
        let topbar = document.getElementById("topBar");
        if (topbar !== null) {
            this.mapCabinetTrayHeight = window.innerHeight - (topbar.clientHeight + 4);
        }
        let bottomBar = document.getElementById("bottomBar");
        if (bottomBar !== null) {
            this.mapCabinetTrayHeight -= (bottomBar.clientHeight + 10);
        }
        // hr: following is a fudge factor.  without it, there is a vertical scrollbar on the app.
        this.mapCabinetTrayHeight -= 3;

        const topState: TopStoreState = this.props.topStore.getTopState();

        if (topState.showHelpGuideOnLaunch && !this.state.helpEngine.isHelpEnabled() && !this.state.helpGuideHidden) {
            this.state.helpEngine.setHelpEnabled(true);
        }

        const selected: Selected | null = topState.selected;
        //console.debug('render(): topState.selectedDotid=', selected !== undefined && selected !== null ? selected.selectedDotid : null);
        const undoManager = this.state.undoManager;

        const body: HTMLBodyElement = document.querySelector('body') as HTMLBodyElement;
        body.className = (this.props.topStore.getTopState().ap === null && !navigator.userAgent.includes("Firefox/")) ? 'waiting' : '';

        return (
          <div id="aptdApp" onMouseMove={this.onMouseMove}>
            {process.env.NODE_ENV === "development" && (
              <ZustandBridge topStore={this.props.topStore} />
            )}

            {/* add Zustand testing UI, controlled by development flag */}
            {process.env.NODE_ENV === "development" &&
              process.env.REACT_APP_SHOW_ZUSTAND === "true" && (
                <div
                  className="zustand-test-container"
                  style={{
                    position: "fixed",
                    right: 10,
                    top: 10,
                    zIndex: 9999,
                    background: "rgba(255,255,255,0.9)",
                    padding: 10,
                    border: "1px solid #ccc",
                    borderRadius: 5,
                    maxWidth: 400,
                    maxHeight: 600,
                    overflow: "auto"
                  }}
                >
                  <ZustandApp 
                    topStore={this.props.topStore}
                    webSocketManager={this.webSocketManager}
                    httpManager={this.state.httpManager}
                  />
                </div>
              )}
            <TopBar
              undoEnabled={
                undoManager.hasUndoableXacts() &&
                !undoManager.isBelowSaveLevel()
              }
              redoEnabled={undoManager.hasRedoableXacts()}
              doUndo={undoManager.onUndoClicked}
              doRedo={undoManager.onRedoClicked}
              undoLabel={undoManager.getUndoLabel()}
              redoLabel={undoManager.getRedoLabel()}
              saveEnabled={AptdApp.isSaveEnabled(
                this.props.topStore,
                this.state.undoManager
              )}
              saveColor={this.getSaveColor()}
              savePctComplete={topState.savePctComplete}
              pingScanStatus={topState.pingScanStatus}
              pingScanSecsLeft={topState.pingScanSecsLeft}
              showModal={this.props.topStore.showModal}
              websocketManager={this.webSocketManager}
              topStore={this.props.topStore}
              undoManager={undoManager}
              helpEngine={this.state.helpEngine}
              onHelpGuideClicked={this.onHelpGuideClicked}
            />
            <div
              id={"mapTrayInfoPanel"}
              className={
                topState.downloadInProgress || topState.ap === null
                  ? "blockInput"
                  : topState.uploadInProgress || topState.loading
                  ? "showLoading"
                  : ""
              }
            >
              <MapAndTray
                scale={topState.ap !== null ? topState.ap.zoomLevel : 1.0}
                pan={topState.ap !== null ? topState.ap.pan : { x: 0, y: 0 }}
                mapCabinetTrayWidth={this.mapCabinetTrayWidth}
                mapCabinetTrayHeight={this.mapCabinetTrayHeight}
                trayHeight={this.trayHeight}
                mapHeight={this.mapHeight}
                mapSensors={topState.mapSensors}
                trayDevices={topState.trayDevices}
                sensorZones={topState.sensorZones}
                ap={topState.ap}
                radios={topState.radios}
                mapRepeaters={topState.mapRepeaters}
                ccCards={topState.ccCards}
                sensorDotidToSzId={topState.sensorDotidToSzId}
                selectedDotid={
                  selected !== undefined && selected !== null
                    ? selected.selectedDotid
                    : null
                }
                selectedSzId={
                  selected !== undefined && selected !== null
                    ? selected.selectedSzId
                    : null
                }
                selected={selected}
                topStore={this.props.topStore}
                undoManager={undoManager}
                getMapSensorsForSz={this.getMapSensorsForSz}
                helpEngine={this.state.helpEngine}
                mapImagesManager={this.state.mapImagesManager}
                onHelpGuideClicked={this.onHelpGuideClicked}
              />

              <InfoPanel
                mapCabinetTrayHeight={this.mapCabinetTrayHeight}
                selected={selected}
                topStore={this.props.topStore}
                undoManager={undoManager}
                webSocketManager={this.webSocketManager}
                httpManager={this.state.httpManager}
                onRequireLoginChanged={this.onRequireLoginChanged}
                mapImagesManager={this.state.mapImagesManager!}
              />
            </div>
            <BottomBar
              currentApTime={topState.currentApTime}
              currentApTimezone={topState.currentApTimezone}
              clientTimeMsAtLastServerUpdate={
                topState.clientTimeMsAtLastServerUpdate
              }
              connected={
                this.webSocketManager !== undefined &&
                this.webSocketManager !== null &&
                this.webSocketManager.connected
              }
              webSocketManager={this.webSocketManager}
              topStore={this.props.topStore}
            />

            {/* Following Modal Dialog is shown only on user's initial virgin use of APTD.
             * Specifically, when there is no /etc/apeg/aptd/aptdConf.xml file
             */}
            <div
              id={"apInitModal"}
              className={topState.loading ? "showLoading" : ""}
            >
              <Modal
                /* show if not initialized, or if ap === null */
                show={
                  topState.ap !== null &&
                  !topState.ap.initialized &&
                  this.showInitializationModal
                }
                type={ModalType.ONE_BUTTON_SUCCESS}
                description={
                  "Welcome to SensConfig.\n" +
                  "To start, please choose these initial settings..."
                }
                onClicks={[this.onInitializationSave]}
                buttonLabels={["Next"]}
                modalClasses={"fullscreen-dark-backdrop"}
                node={this.renderInitializationContent()}
                topStore={this.props.topStore}
              />
            </div>
            {/* Note Modal stack is last component, so it is on top of all the others,
             * and prevents clicks from going through */}
            {this.renderCredentialValidationDialogStack()}
          </div>
        );
    }


    private onMouseMove():void {
        if (this.webSocketManager === null) {
            return;
        }
        const now:number = new Date().getTime();
        const guiActiveIntervalMsec:number = 10000;
        if (now - this.props.topStore.getTopState().lastGuiActiveTime > guiActiveIntervalMsec) {
            this.webSocketManager.sendGUIActiveMsg();
        }
    }


    /**
     * renders content for the initial first-time-only Modal Popup
     */
    private renderInitializationContent(): ReactNode {
        const content: ReactNode =
            <>
                <TimeZoneUnitsMapDisplay mapChooserRowSize={5}
                                         mapVerbiage="Choose an initial map (can be modified later)"
                                         initialization={true}
                                         apModel={this.props.topStore.getTopState().ap}
                                         topStore={this.props.topStore}
                                         undoManager={this.state.undoManager}
                                         httpManager={this.state.httpManager}
                                         mapImagesManager={this.state.mapImagesManager!}
                />
                <table>
                    <tbody>
                    <CheckboxField label={'Require Login Password'}
                                   value={this.props.topStore.getTopState().ap === null ?
                                          false :
                                          this.props.topStore.getTopState().ap!.requireLogin === RequireLogin.ENABLED}
                                   idName={'requireLogin'} className={'requireLogin'}
                                   key={'requireLogin'} fieldName={'requireLogin'}
                                   objectType={ObjectType.AP}
                                   objectId={'AP'}
                                   transformValueToStore={this.transformBooleanToRequireLogin}
                                   onChange={this.onRequireLoginChanged}
                                   topStore={this.props.topStore}
                                   undoManager={this.state.undoManager}/>
                    </tbody>
                </table>
            </>;
        return content;
    }

    /**
     * TODO: does this re-render as soon as there is a change?
     *       If not, use getDerivedStateFromProps()
     */
    private renderCredentialValidationDialogStack(): ReactNode {
        return <React.Fragment>
            {
                this.props.topStore.getTopState().credentialValidationModalStack.map((modalDialog: ModalInfo, index) =>
                    <Modal
                        modalClasses={modalDialog.modalClass !== undefined ? modalDialog.modalClass : ''}
                        id={'modal' + index}
                        key={'modal' + index}
                        show={modalDialog.modalShow}
                        type={modalDialog.modalType}
                        description={modalDialog.modalDescription}
                        onClicks={modalDialog.modalOnClicks}
                        buttonLabels={modalDialog.modalLabels}
                        node={modalDialog.modalNode}
                        onMouseMove={this.onMouseMove}
                        topStore={this.props.topStore}
                    />
                )
            }
        </React.Fragment>
    }

    /**
     * TODO: currently only can enable or disable all levels of console logging.
     *       Could add a method to selectively enable certain levels.
     */
    makeLogManager(): LogManager {
        let origLog: ((message?: any, ...optionalParams: any[])=> void)|null = null;
        let origWarn: ((message?: any, ...optionalParams: any[])=> void)|null = null;
        let origInfo: ((message?: any, ...optionalParams: any[])=> void)|null = null;
        let origDebug: ((message?: any, ...optionalParams: any[])=> void)|null = null;
        let origTrace: ((message?: any, ...optionalParams: any[])=> void)|null = null;

        function enableLogging(): void {
            if (origLog === null || origWarn === null || origInfo === null ||
                origDebug === null || origTrace === null) {
                return;
            }
            console.log = origLog;
            console.warn = origWarn;
            console.info = origInfo;
            console.debug = origDebug;
            console.trace = origTrace;
        }

        /** note: we do not disable console.error() */
        function disableLogging(): void {
            origLog = console.log;
            origWarn = console.warn;
            origInfo = console.info;
            origDebug = console.debug;
            origTrace = console.trace;
            console.log = console.warn = console.info = console.debug = console.trace = doNothing;
        }
        function doNothing() {}
        return {
            enableLogging: enableLogging,
            disableLogging: disableLogging,
        };
    }

    /**
     * Since MapImagesManager is a singleton, this should only be called once, after GUIAPConfig received
     */
    public makeMapImagesManager(mapFiles: string[], label: string): void {
        this.setState({mapImagesManager: new MapImagesManager(mapFiles, label, this.props.topStore)});
    }

    componentDidMount(): void {
        console.log('Aptd.componentDidMount(): lifecycle start');
        const nodeMode = process.env.NODE_ENV;
        console.log('nodeMode=', nodeMode);
        //console.log('process.env.REACT_APP_DEV_LOGGING = ', process.env.REACT_APP_DEV_LOGGING);
        let websocketUrl:URL;
        // establish connection with APTD server and get server msgs
        if (nodeMode === 'production') {
            websocketUrl = new URL('/test.ws', window.location.href);
            this.state.logManager.disableLogging();
            // HR: enabling just for debugging test
            //this.state.logManager.enableLogging();

            /* cannot get this to work
            console.log('process.env.REACT_APP_DEV_LOGGING = ', process.env.REACT_APP_DEV_LOGGING);
            if (process.env.REACT_APP_DEV_LOGGING === "ENABLED") {
                this.state.logManager.enableLogging();
            }
            */
        } else if (nodeMode === 'development') {
            const websocketUrlString = window.location.protocol + '//' + '192.168.3.226' + ':8080/test.ws';
            websocketUrl = new URL(websocketUrlString);
        } else {
            throw new Error('unexpected nodeMode=' + nodeMode);
        }

        if (websocketUrl.protocol.startsWith('https')) {
            websocketUrl.protocol = 'wss';
        } else if (websocketUrl.protocol.startsWith('http')) {
            websocketUrl.protocol = 'ws';
        } else {
            throw new Error('unexpected websocketUrl.protocol: ' + websocketUrl.protocol);
        }
        const wsUrlString = websocketUrl.toString();
        console.info('Aptd: about to create new WS connection to ', wsUrlString);

        this.webSocketManager = new WebSocketManager(wsUrlString, this.props.topStore, this.state.undoManager, this);
        // TODO: is it bad to clone undoManager here?  after all, it is a singleton.
        //       but not cloning violates the setState way of doing things.
        //       So looks like either way is wrong!
        if (this.webSocketManager !== null) {
            this.setState((prevState: AptdAppState) => {
                // const newUndoManager = cloneDeep(prevState.undoManager);
                const newUndoManager = prevState.undoManager;
                newUndoManager.setWebSocketManager(this.webSocketManager!);
                return {
                    undoManager: newUndoManager,
                };
            });
        } else {
            console.error('AptdApp.componentDidMount(): failed to instantiate webSocketManager');
        }

        window.addEventListener("resize", this.updateSize);
        this.state.helpEngine.showStateAndAwaitNext(null);
    }


    componentWillUnmount() {
        window.removeEventListener("resize", this.updateSize);
    }

    updateSize = () => {
        this.setState({size_update: true})
    };

    onHelpGuideClicked():void {
        let helpGuideHidden = false;
        if (this.state.helpEngine.isHelpEnabled()) {
            helpGuideHidden = true;
        }
        this.state.helpEngine.setHelpEnabled(! this.state.helpEngine.isHelpEnabled());
        this.setState({helpGuideHidden: helpGuideHidden})
    }

    onInitializationSave(event: React.MouseEvent<HTMLButtonElement, MouseEvent>):void {
        this.showInitializationModal = false;
        if (this.webSocketManager === null) {
            console.error('websocketManager is null');
            this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'SensConfig is unable to connect.');
        } else {
            this.webSocketManager.sendSaveInitConfig();
            if (this.props.topStore.getTopState().rebootRequiredOnSave) {
                this.props.topStore.showModal(ModalType.NO_OK,
                    "The settings you have chosen require a reboot of the Gateway.  " +
                    "Please be patient while the Gateway restarts.",
                    undefined, undefined, undefined,
                    ModalClass.REBOOTING);
                this.webSocketManager.sendRebootMsg();
                this.props.topStore.enact({
                    actions: [{
                        updateType: UpdateType.UPDATE,
                        objectId: '',
                        objectType: ObjectType.REBOOT_REQUIRED_ON_SAVE,
                        newData: false,
                    }],
                    description: 'clear reboot required',
                });
            }
        }
    }

    getSaveColor():SaveColor {
        const topState:TopStoreState = this.props.topStore.getTopState();
        let nErrors:number = Object.keys(topState.validationErrors).length +
            Object.keys(topState.validationGlobalErrors).length;
        if (nErrors > 0) {
            return SaveColor.PINK;
        } else if (this.state.undoManager.undoStackChangedSinceLastSave()) {
            return SaveColor.YELLOW;
        } else {
            return SaveColor.GRAY;
        }
    }


    /** @returns 1, 2, or 3 sensors as a hash from sensor dotid to GUISensor objects */
    private getMapSensorsForSz(szid: string): {[sensorId: string]: GUISensorClient} | undefined {
        const topState:TopStoreState = this.props.topStore.getTopState();
        if (szid === null || szid === undefined) {
            return undefined;
        }
        let mapSensorHash: {[sensorId: string]: GUISensorClient} = {};

        const sensorZone:GUISZClient = topState.sensorZones[szid];
        if (sensorZone === undefined) {
            console.error('unexpected undefined sensorZone for ', szid);
        } else {
            for (let dotid of sensorZone.sensorIds) {
                mapSensorHash[dotid] = topState.mapSensors[dotid];
            }
        }
        return mapSensorHash;
    }


    /**
     * TODO: Save should be disabled possibly if any map device has too-low RF level?
     * Currently save is enabled if button is green (no validation errors),
     * there are changes since last save, and
     * we are not in midst of a ping scan.
     */
    private static isSaveEnabled(topStore: TopStore, undoManager: UndoManager): boolean {
        const topState:TopStoreState = topStore.getTopState();
        const saveEnabled: boolean =
            topState.configuredDevicesResolved &&
            Object.keys(topState.validationErrors).length === 0 &&
            Object.keys(topState.validationGlobalErrors).length === 0 &&
            // see bug 14558: we now ignore state of undo stack.
            // undoManager.undoStackChangedSinceLastSave() &&
            (topState.pingScanStatus === null || topState.pingScanStatus === 100) &&
            ! topState.awaitingSaveResult;
        return saveEnabled;
    }

    /**
     *  Q: is there a less expensive way to do this?  this runs often!
     *  A: yes, could put this code in enactActionsToStore, constructor, onUndoClicked, removeFromUndoStack instead.  If needed for performance.
     */
    componentDidUpdate(prevProps: Readonly<AptdAppProps>, prevState: Readonly<{}>, snapshot?: any): void {
        if (this.state.undoManager.undoStackChangedSinceLastSave()) {
            window.onbeforeunload = this.onBeforeUnloadWithUnsavedChanges;
        } else {
            window.onbeforeunload = this.onBeforeUnloadWithoutChanges;
        }
    }

    /**
     * following message does not show up...,
     * but a generic one does in Edge, and other browsers,
     * which is very similar.  Browsers do not allow a custom msg in this case.
     * alert('You have unsaved configuration changes.  If you leave the page now, you may lose those changes. Are you sure you want to leave this page?');
     */
    private onBeforeUnloadWithUnsavedChanges(event: BeforeUnloadEvent) {
        // preventDefault and returning '' seem to trigger browser to deliver a canned prompt
        if (this.webSocketManager !== null) {
            if (this.webSocketManager.serverTimedOut) {
                // do nothing.  don't want to trigger a double message to user.
            } else {
                event.preventDefault();
            }
        } else {
            event.preventDefault();
        }

        if (this.webSocketManager !== null) {
            console.debug('onBeforeUnloadWithUnsavedChanges(): about to close websocket');
            // send the formal aptd client close transaction; allows for a clean server cleanup
            this.webSocketManager.sendClientDisconnectMsg();
            this.webSocketManager.closeWebSocket();
        }

        if (this.webSocketManager !== null) {
            if (this.webSocketManager.serverTimedOut) {
                // do nothing.  don't want to trigger a double message to user.
            } else {
                event.returnValue = '';
            }
        } else {
            event.returnValue = '';
        }
    }


    private onBeforeUnloadWithoutChanges(event: BeforeUnloadEvent) {
        if (this.webSocketManager !== null && this.webSocketManager.webSocket !== null) {
            console.debug('onBeforeUnloadWithoutChanges(): about to close websocket');
            // send the formal aptd client close transaction; allows for a clean server cleanup
            this.webSocketManager.sendClientDisconnectMsg();
            this.webSocketManager.closeWebSocket();
        }
    }


    /**
     * compare APGI channels for sorting: first by shelf, then slot, then channel, numerically.
     * An APGI channel id looks similar to CC channel id: e.g., S1-S15-CH_14
     */
    public static compareAPGIChannels(ch1: string, ch2: string): number {
        const apgiCh1: APGIChannelIdClient = AptdApp.parseAPGIClientChannelId(ch1);
        const apgiCh2: APGIChannelIdClient = AptdApp.parseAPGIClientChannelId(ch2);
        //console.debug('compareAPGIChannels(): ch1=', ch1, 'ch2=', ch2, 'apgiCh1=', apgiCh1, 'apgiCh2=', apgiCh2);
        if (+apgiCh1.shelf > +apgiCh2.shelf) {
            return 1;
        } else if (+apgiCh1.shelf < +apgiCh2.shelf) {
            return -1;
        } else if (+apgiCh1.slot > +apgiCh2.slot) {
            return 1;
        } else if (+apgiCh1.slot < +apgiCh2.slot) {
            return -1;
        } else if (+apgiCh1.channel > +apgiCh2.channel) {
            return 1;
        } else if (+apgiCh1.channel < +apgiCh2.channel) {
            return -1;
        } else {
            return 0;
        }
    }

    /**
     * compare STS channels for sorting: first by shelf, then slot, then channel, numerically.
     * An STS channel id looks like...
     */
    public static compareSTSChannels(ch1: string, ch2: string): number {
        const stsCh1: STSChannelIdClient = AptdApp.toSTSChannelId(ch1);
        const stsCh2: STSChannelIdClient = AptdApp.toSTSChannelId(ch2);
        //console.debug('compareAPGIChannels(): ch1=', ch1, 'ch2=', ch2, 'apgiCh1=', apgiCh1, 'apgiCh2=', apgiCh2);
        if (+stsCh1.ip > +stsCh2.ip) {
            return 1;
        } else if (+stsCh1.ip < +stsCh2.ip) {
            return -1;
        } else if (+stsCh1.group > +stsCh2.group) {
            return 1;
        } else if (+stsCh1.group < +stsCh2.group) {
            return -1;
        } else if (+stsCh1.channel > +stsCh2.channel) {
            return 1;
        } else if (+stsCh1.channel < +stsCh2.channel) {
            return -1;
        } else {
            return 0;
        }
    }

    /** converts eg. "IP1G0C1" to STSChannelIdClient structure */
    public static toSTSChannelId(ch: string): STSChannelIdClient {
        let found: RegExpMatchArray|null = ch.match(/^(\d+)-(\d+)-(\d+)$/);
        if (found === null) {
            found = ch.match(/^IP(\d+)G(\d+)C(\d+)$/);
            if (found === null) {
                return {ip: '-1', group: '-1', channel: '-1'};
            }
            return {
                ip: found[1],
                group: found[2],
                channel: found[3]
            };
        }
        return {
            ip: found[1],
            group: found[2],
            channel: found[3]
        };
    }

    public static parseAPGIClientChannelId(ch: string): APGIChannelIdClient {
        let found: RegExpMatchArray|null = ch.match(/^S(\d+)-S(\d+)-CH_(\d+)$/);
        if (found === null) {
            return {shelf: '-1', slot: '-1', channel: '-1'};
        }
        return {
            shelf: found[1],
            slot: found[2],
            channel: found[3]
        };
    }

    public static parseAPGIServerChannelId(ch: string): APGIChannelIdClient {
        let found: RegExpMatchArray|null = ch.match(/^S(\d+)-S(\d+)-CH_(\d+)$/);
        if (found === null) {
            return {shelf: '-1', slot: '-1', channel: '-1'};
        }
        return {
            shelf: found[1],
            slot: found[2],
            channel: found[3]
        };
    }

    /** @returns e.g., "S15-S16-CH_4" */
    public static makeAPGIClientChannelIdString(apgiChannelTemp: APGIChannelIdClient): string {
        return 'S' + apgiChannelTemp.shelf + '-' +
            'S' + apgiChannelTemp.slot + '-' +
            'CH_' + apgiChannelTemp.channel;
    }


    public transformBooleanToRequireLogin(bool: boolean):  {[fieldname: string]: string} {
        if (bool) {
            return {requireLogin: RequireLogin.ENABLED};
        } else {
            return {requireLogin: RequireLogin.DISABLED};
        }
    }

    public onRequireLoginChanged(): void {
        console.debug('onRequireLoginChanged(): starting [valid]');
        if (this.props.topStore.getTopState().ap !== null &&
            this.props.topStore.getTopState().ap!.requireLogin === RequireLogin.ENABLED) {
            // need to prompt user for login/pw
            this.props.topStore.showModal(ModalType.TWO_BUTTON,
                "In order to enable the Require Login feature, please enter the User Id and Password provided on the label of the Gateway",
                ['Cancel', 'Continue'],
                [this.backOutRequiredLoginAndDismiss, this.testCredentials],
                this.renderUseridPwNode(), ModalClass.VALIDATE_CREDENTIALS);
        }
    }

    private backOutRequiredLoginAndDismiss() {
        this.props.topStore.dismissModal(ModalClass.VALIDATE_CREDENTIALS);
        const turnOffRequireLogin: ActionGroup = {
            description: 'turn off require login',
            actions: [{
                objectType: ObjectType.AP,
                objectId: 'AP',
                updateType: UpdateType.UPDATE,
                newData: {requireLogin: RequireLogin.DISABLED},
            }, {
                objectType: ObjectType.AWAITING_LOGIN_VALIDATION,
                objectId: '',
                updateType: UpdateType.UPDATE,
                newData: false,
            }],
        };
        this.props.topStore.enact(turnOffRequireLogin, this.props.topStore.dismissModal);
        // also need to pop UndoManager.doneStack, removing setting of requireLogin
        this.popRequireLoginFromDoneStack(this.props.topStore.undoManager);
    }

    public popRequireLoginFromDoneStack(undoManager: UndoManager|undefined) {
        if (undoManager !== undefined) {
            // assert top of doneStack is change to Require Login
            const doneStack = undoManager.getDoneStack();
            if (! doneStack[doneStack.length - 1].description.startsWith('Require Login')) {
                console.error('unexpected state. top of doneStack is', doneStack[doneStack.length - 1].description);
                return;
            }
            doneStack.pop();
        }
    }

    public renderUseridPwNode(): ReactNode {
        return (
            <>
                <table>
                    <tbody>
                    <InputField label={'User Id'} text={''} idName={'userid'} fieldName={'userid'}
                                maxLength={30} objectType={ObjectType.USERID} objectId={'userid'}
                                enactType={EnactType.USER_ACTION_NOT_UNDOABLE}
                                characterType={CharacterType.NAME} topStore={this.props.topStore}
                                undoManager={this.state.undoManager}/>
                    <InputField label={'Password'} password={true} text={''} idName={'password'}
                                fieldName={'password'} maxLength={30}
                                enactType={EnactType.USER_ACTION_NOT_UNDOABLE}
                                objectType={ObjectType.PASSWORD} objectId={'password'}
                                characterType={CharacterType.TEXT} topStore={this.props.topStore}
                                undoManager={this.state.undoManager}/>
                    </tbody>
                </table>
            </>
        );
    }

    public testCredentials(): void {
        console.debug('testCredentials(): start');
        if (this.webSocketManager !== null) {
            this.webSocketManager.sendValidateCredentialsMsg();
            this.props.topStore.dismissModal(ModalClass.VALIDATE_CREDENTIALS);
            this.props.topStore.showModal(ModalType.NO_OK, 
                "Validating Gateway Login Credentials", 
                [], [], undefined, ModalClass.VALIDATE_CREDENTIALS);
            // note: the action continues later
            //       in WebsocketManager.onCredentialsValidityReceived()
        } else {
            console.error('testCredentials: null webSocketManager');
        }
    }

    /** force an onBlur() on the InfoPanelTextField's textarea, if shown. */
    public static unfocusInfoPanelTextField() {
        const infoPanelTextField: HTMLTextAreaElement =
            document.querySelector('.editTextField') as HTMLTextAreaElement;
        if (infoPanelTextField !== null) {
            infoPanelTextField.blur();
        }
    }

    /** force a blur on whatever field is currently focused, as 
        onBlur() is not always called when one might want. */
    public static blurFocusedField() {
        if (document.activeElement !== null) {
            (document.activeElement as unknown as HTMLOrSVGElement).blur();
            console.debug("blurFocusedField(): did blur() on activeElement");
        } else {
            console.debug("blurFocusedField(): no activeElement");
        }
    }
}

export default AptdApp;
