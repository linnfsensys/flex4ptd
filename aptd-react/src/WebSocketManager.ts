import TopStore, {TopStoreState} from "./TopStore";
import cloneDeep from "lodash/cloneDeep";
import AptdApp from "./AptdApp";
import {
    Action,
    ActionGroup,
    ClientObjectUpdateType,
    GUIAPConfigClient,
    GUICCAPGIClient,
    GUICCCardClient,
    GUICCInterfaceBaseClient,
    GUICCSTSClient,
    GUIRadioClient,
    GUIRepeaterClient,
    GUISaveConfig,
    GUISDLCClient,
    GUISensorClient,
    GUISZClient,
    MapSettings,
    ModalClass,
    ModalType,
    ObjectType,
    Selected,
    TextField,
    UpdateType
} from "./AptdClientTypes";
import {
    ChannelMode,
    ChannelNumber,
    ColorCodeMode,
    CompleteStatus,
    ConfigChangeStatus,
    getSNHardwareTypeKey,
    GUIActive,
    GUIAPConfig,
    GUICCCardIdentify,
    GUICCUpdateProgress,
    GUICCChannel,
    GUICCChannelBase,
    GUICCInterfaceBase,
    GUICCStatus,
    GUICCSTS,
    GUIChannel,
    GUIClientDisconnect,
    GUIConfigChangeProgress,
    GUIFirmwareUpdateCancel,
    GUIFirmwareUpdateComplete,
    GUIFirmwareUpdateConfirm,
    GUIFirmwareUpdateUnseenWarn,
    GUIPingScanStatus,
    GUIPoint,
    GUIRadio,
    GUIRadioStatus,
    GUIRadioUpdateProgress,
    GUIReboot,
    ResetConfig,
    GUIRepeater,
    GUIRepeaterStatus,
    GUIRepeaterUpdateProgress,
    GUIReplaceSensor,
    GUISaveProgress,
    GUISensor,
    GUISensorStatus,
    GUISensorType,
    GUISensorUpdateProgress,
    GUISensorZone,
    GUISensorZoneStatus,
    GUISpeed2SensorZone,
    GUISpeed3SensorZone,
    GUIStartupState,
    GUIStopbarSensorZone,
    GUISyncNTP,
    GUITechSupport,
    GUIText,
    GUITime,
    GUIValidCredentials,
    Interface,
    Location,
    Mappable,
    MapRenderInfo,
    RejectReason,
    RequireLogin,
    Resolution,
    SaveInitConfig,
    ServerMessage,
    Severity,
    Status,
    StatusStatus,
    UpdateProgressStatus,
} from "./AptdServerTypes";
import UndoManager from "./UndoManager";
import {ReactNode} from "react";
import MapImagesManager, {MapDatum} from "./MapImagesManager";
import MapAndTray from "./mapTrayCabinet/MapAndTray";


/**
 * This class handles all communication between APTD client (this code) and APTD server.
 * That communication send/receive is done via a WebSocket which is created and
 * kept in this class.
 */
export default class WebSocketManager {
    private readonly websocketUrlString: string;
    public webSocket: WebSocket | null;
    private topStore: TopStore;
    public nServerMsgs: number;
    private undoManager: UndoManager;
    public connected: boolean;
    public connectionAttempted: boolean;
    private reconnectIntervalMs: number;
    public serverTimedOut: boolean;
    /** Epoch millis of time of receipt of last GUITime msg from server */
    private lastGuiTimeReceived: number;
    /**
     *  Should be twice the expected interval for GUITime events.
     *  TODO: may want to make checkTimeIntervalMillis dependent on a server Property.
     */
    private checkTimeTimeoutThresholdMillis: number = 20000;
    /** Should be a little more than checkTimeTimeoutThresholdMillis */
    private checkTimeIntervalMillis: number = 21000;
    private gaveURadWarning: boolean = false;
    /** TODO: since used externally, thisUserInitiatedSave should probably be kept in TopStore instead */
    public thisUserInitiatedSave: boolean = false;
    private aptdApp: AptdApp;

    constructor(websocketUrlString: string, topStore: TopStore, undoManager: UndoManager, aptdApp: AptdApp) {
        console.debug('WebSocketManager.constructor(): starting');
        this.topStore = topStore;
        this.undoManager = undoManager;
        this.nServerMsgs = 0;
        this.connected = false;
        this.connectionAttempted = false;
        this.reconnectIntervalMs = 5000; // msec
        this.websocketUrlString = websocketUrlString;
        this.webSocket = null;
        this.serverTimedOut = false;
        this.lastGuiTimeReceived = 0;
        this.aptdApp = aptdApp;

        this.afterAPPosted = this.afterAPPosted.bind(this);
        this.afterMapSensorPosted = this.afterMapSensorPosted.bind(this);
        this.afterSZPosted = this.afterSZPosted.bind(this);
        this.announceAndTryToReconnect = this.announceAndTryToReconnect.bind(this);
        this.checkLastGuiTime = this.checkLastGuiTime.bind(this);
        this.clearIgnorePingScanStatus = this.clearIgnorePingScanStatus.bind(this);
        this.clearSaveState = this.clearSaveState.bind(this);
        this.connect = this.connect.bind(this);
        this.doLogin = this.doLogin.bind(this);
        this.enableInput = this.enableInput.bind(this);
        this.explainTD2 = this.explainTD2.bind(this);
        this.isOnMap = this.isOnMap.bind(this);
        this.isInTray = this.isInTray.bind(this);
        this.onClose = this.onClose.bind(this);
        this.onError = this.onError.bind(this);
        this.onMessage = this.onMessage.bind(this);
        this.onOpen = this.onOpen.bind(this);
        this.resetBusyStatus = this.resetBusyStatus.bind(this);
        this.resetBusyStatusForAllDevices = this.resetBusyStatusForAllDevices.bind(this);
        this.sendSaveMsg = this.sendSaveMsg.bind(this);
        this.setIgnorePingScanStatus = this.setIgnorePingScanStatus.bind(this);
        this.startPingScan = this.startPingScan.bind(this);
        this.stopPingScan = this.stopPingScan.bind(this);

        console.debug('WebSocketManager.constructor(): about to connect()');
        this.connect();
    }

    public connect(): void {
        console.info('WebSocketManager.connect(): about to create new WebSocket');

        // first, download a non-existent file to make sure we send the session cookie.
        // this is important on reconnect.
        const rootDivElt:HTMLDivElement|null = document.getElementById('root') as HTMLDivElement;
        if (rootDivElt === null) {
            console.error('connect(): rootDivElt is null');
        } else {
            const existingDummyElt:HTMLImageElement|null =
                document.getElementById('dummyImage') as HTMLImageElement;
            if (existingDummyElt !== null) {
                rootDivElt.removeChild(existingDummyElt);
            }
            const dummyImgElt:HTMLImageElement = document.createElement('img');
            // dummyImgElt is intended to be not found, and not displayed
            dummyImgElt.setAttribute('src', '/imageDir/dummy-for-client-cookie.png');
            dummyImgElt.setAttribute('height', '1');
            dummyImgElt.setAttribute('width', '1');
            dummyImgElt.setAttribute('id', 'dummyImage');
            rootDivElt.appendChild(dummyImgElt);
            console.debug('WebSocketManager.connect(): created dummyImgElt');
            const incompleteImages:HTMLImageElement[] = [dummyImgElt].filter((img:HTMLImageElement) => ! img.complete);
            // TODO: test for incompleteImages.length may be unnecessary, given Promise's guarantees
            if (incompleteImages.length === 1) {
                Promise.all(incompleteImages
                    .map((img: HTMLImageElement) =>
                        new Promise((resolve: (value?:unknown)=>void) => {
                            img.onload = img.onerror = resolve;
                        })
                    )).then(() => {
                        console.debug('WebSocketManager.connect(): dummy image finished loading or failed to load. about to create WebSocket');
                        this.createWebSocket();
                });
            } else if (incompleteImages.length === 0) {
                console.debug('WebSocketManager.connect(): dummy image already loaded or failed to load. about to create WebSocket');
                this.createWebSocket();
            } else {
                console.error('invalid incompleteImages.length=', incompleteImages.length);
            }
        }
    }

    private createWebSocket():void {
        this.webSocket = new WebSocket(this.websocketUrlString);
        this.webSocket.onopen = this.onOpen;
        this.webSocket.onmessage = this.onMessage;
        this.webSocket.onclose = this.onClose;
        this.webSocket.onerror = this.onError;
    }

    private onOpen(event: Event):void {
        console.info("WebSocketManager.onOpen(): the WebSocket connection to APTD server was opened: ", event);
        if (this.webSocket !== null && this.webSocket.readyState === 1) {
            this.webSocket.send('{"otype":"GUIClientConnect"}');
            console.debug("WebSocketManager.onOpen(): sent GUIClientConnect req");

            this.connected = true;
            this.connectionAttempted = true;
            // use this as occasion to reset savePercentComplete and device busy status
            this.resetBusyStatusForAllDevices(true);
            this.setConfiguredDevicesResolved(false);   // will need to be resolved by server GUIStartupState
        } else {
            console.warn("WebSocketManager.onOpen(): webSocket is null or not ready for send");
            // TODO: do we need to retry it?
        }
    };

    /**
     * When Websocket closes.  Can happen due to reboot or to loss of connection.
     */
    private onClose(e: CloseEvent):void {
        console.info("WebSocketManager.onClose(): the WebSocket connection closed. CloseEvent:", e);
        this.connected = false;
        this.reconnectIntervalMs = 5000; // msec

        // if user was doing a save, remove the save blocking Modal and all save state
        if (this.topStore.isAnyModal(ModalClass.SAVING)) {
            this.clearSaveState();
        }
        // Remove possible modal dialogs related to unsupported config or external update.
        // This is safe because server will re-send msgs upon reconnect if they are still relevant.
        this.topStore.dismissAnyModal(ModalClass.UNSUPPORTED_CONFIG);
        this.topStore.dismissAnyModal(ModalClass.EXTERNAL_UPDATE);

        let rebooting: boolean = false;
        if (this.topStore.isAnyModal(ModalClass.REBOOTING)) {
            rebooting = true;
            this.topStore.dismissAnyModal(ModalClass.REBOOTING);
        }

        if (! this.serverTimedOut  && ! rebooting) {
            // presumably there was a communications loss.
            console.info('onClose(): server not timed out and not rebooting. about to announce and try to reconnect');
            this.announceAndTryToReconnect(true);
        } else {
            console.info("onClose(): serverTimedOut or rebooting");
            let nonRebootMsg = 'Your session has timed out due to inactivity. ';
            if (this.undoManager.undoStackChangedSinceLastSave()) {
                nonRebootMsg += '(Any unsaved changes will be lost). ';
            }
            const rebootMsg = 'An expected reboot of the Gateway has occurred. ';
            if (this.topStore.getTopState().ap !== null &&
                this.topStore.getTopState().ap!.requireLogin === RequireLogin.ENABLED) {
                // login required
                const description = rebooting ?
                    rebootMsg + 'Now you must login again.' :
                    nonRebootMsg + 'Please login again.';
                this.topStore.showModal(ModalType.ONE_BUTTON_SUCCESS, description,
                    ['Login'], [this.doLogin],
                    undefined, ModalClass.SESSION_TIMED_OUT);
            } else {
                // login not required
                const description = rebooting ?
                    rebootMsg + 'Now you must start again.' :
                    nonRebootMsg + 'Please start again.';
                this.topStore.showModal(ModalType.ONE_BUTTON_SUCCESS, description,
                    ['Start again'], [this.doLogin],
                    undefined, ModalClass.SESSION_TIMED_OUT);
            }
        }

        console.debug('onClose(): doing some possible clearing of topstore');
        /* HR: we comment this out because now, after reboot, we always force
         *     user to start again from index.html.
        // After an APTD server reboot, may want to clear all client state,
        // and allow APTD server to repopulate everything.
        if (this.topStore.getTopState().needToClearAll) {
            if (this.topStore.getTopState().ap !== null &&
                this.topStore.getTopState().ap!.requireLogin !== RequireLogin.ENABLED) {
	
                console.info('onClose(): clearing configured topStore, undoManager state');
                this.topStore.clearConfig();
                this.undoManager.clearDoneStack();
                this.undoManager.clearUndoneStack();
                // following will disable the save button until next undoable action or undo or redo
                this.undoManager.setDoneStackLengthAtLastSuccessfulSave();
            }
            this.topStore.setState({needToClearAll: false});
        }
         */
        this.topStore.clearTray();
    };

    /**
     * Note: due to WebSocket spec, the error message does not reveal
     * the kind of error.  This is to deny security probing.
     * @see https://stackoverflow.com/questions/31002592/javascript-doesnt-catch-error-in-websocket-instantiation
     * TODO: probably need some user-facing announcement here.
     */
    private onError(ev: Event) : any | null {
        console.error("onError(): websocket error: ", ev);

        if (this.topStore.getTopState().awaitingLoginValidation === true) {
            // we are awaiting login validation from server, but it will never come,
            // so back out requireLogin change.
            const actionGroup: ActionGroup = {
                actions: [{
                    objectType: ObjectType.AP,
                    objectId: 'AP',
                    newData: {requireLogin: RequireLogin.DISABLED},
                    updateType: UpdateType.UPDATE,
                }, {
                    objectType: ObjectType.AWAITING_LOGIN_VALIDATION,
                    objectId: '',
                    newData: false,
                    updateType: UpdateType.UPDATE,
                }],
                description: 'update requireLogin based on credentials',
            };
            this.topStore.enact(actionGroup);
            this.backoutRequireLogin();
        } else {
            // This is the more common case.
            // Error in connecting to websocket, or error during websocket connection
            // Would need to reproduce announceAndTryToReconnect() here, but does it really distinguish?
            // We could distinguish this.connected here.... (better than in onClose).
        }

        // TODO: is the following needed? I understand socket will close anyway?
        if (this.webSocket !== null) {
            console.debug('webSocket.onError(): about to close webSocket');
            this.webSocket.close();
        }
    }

    public closeWebSocket() {
        if (this.webSocket !== null) {
            this.webSocket.close();
        }
    }


    private clearSaveState() {
        this.topStore.dismissAnyModal(ModalClass.SAVING);
        this.resetBusyStatusForAllDevices(true);
        this.setConfiguredDevicesResolved(true);
        this.thisUserInitiatedSave = false;
        this.topStore.enact({
            actions: [{
                objectType: ObjectType.AWAITING_SAVE_RESULT,
                newData: false,
                updateType: UpdateType.UPDATE,
                objectId: '',
            }],
            description: 'set awaitingSaveResult to false',
        });
    }

    private setAwaitingSaveResult() {
        this.topStore.enact({
            actions: [{
                objectType: ObjectType.AWAITING_SAVE_RESULT,
                newData: true,
                updateType: UpdateType.UPDATE,
                objectId: '',
            }],
            description: 'set awaitingSaveResult to true',
        });
    }


    private doLogin() {
        // Q: either of these options would work. what is best?
        // window.location.href = '/logout.html';
        // A: in absence of a server session, web server will redirect to login.html
        // Per Max, use this one:
        window.location.href = '/index.html';
    }

    /** announces a connection problem via Modal */
    private announceAndTryToReconnect(reconnect:boolean = true, wasConnected:boolean = false):void {
        console.info('WebSocketManager(): announceAndTryToReconnect()');
        if (this.topStore.isAnyModal(ModalClass.SESSION_TIMED_OUT)) {
            // we don't want to reconnect because Session timed out
            return;
        }
        let willReboot: boolean = false;
        const topModalClasses: string|undefined = this.topStore.getTopModalClasses();
        if (topModalClasses !== undefined &&
            topModalClasses.includes(ModalClass.RECONNECTING as string)) {
                // have already shown announcement.  no need to show again
                // do nothing here
        } else {
            if (topModalClasses !== undefined &&
                topModalClasses === ModalClass.REBOOTING) {
                this.topStore.dismissModal(ModalClass.REBOOTING);
            }
            willReboot = (topModalClasses === undefined ? false : topModalClasses.includes(ModalClass.REBOOTING));
            // The following modal dialog is either dismissed in the lines above,
            // or in onAPReceived().  Note: \u2026 is ellipsis character.
            const description = (willReboot ?
                'A reboot of the Gateway was required. \nThe connection with the Gateway has been lost as a normal part of the reboot process. Reconnecting\u2026.' :
                (wasConnected ?
                    'The connection with the Gateway has been lost.  Trying to reconnect\u2026.':
                    // Following wording covers more cases, e.g. when cannot connect at startup.
                    'Cannot connect with the Gateway. Trying to reconnect\u2026.'));
            this.topStore.showModal(ModalType.NO_OK, description,
                [], [], undefined,
                willReboot ? ModalClass.REBOOTING + ' ' + ModalClass.RECONNECTING : ModalClass.RECONNECTING);
        }

        if (reconnect) {
            // Q: following is recursive call: will it blow up due to stack overflow?
            // A: in my overnight tests, it does not blow up.
            setTimeout(this.connect, this.reconnectIntervalMs);
            // TODO: should we use more exponential increase in reconnectInterval?
            this.reconnectIntervalMs += 5000;
        }
    }


    /**
     * Upon receipt of msg from server, update the TopStore accordingly.
     * For "GUI*" Config msgs, if UpdateType is Add, add the item.
     * If UpdateType is ADD and item already in TopStore, replace only non-user-modifiable fields. (??)
     * If UpdateType is UPDATE, replace non-user-modifiable fields. (How different from ADD??)
     * If UpdateType is DELETE, delete from TopStore (or mark as unheard, if there are still rf-links to it, for Repeater, Radioo).
     * For "GUI*Status" msgs, always update the appropriate item in TopStore.
     */
    private onMessage(msg: MessageEvent): void {
        const topState:TopStoreState = this.topStore.getTopState();
        const data: ServerMessage = JSON.parse(msg.data);
        //if (data.otype !== 'GUITime') {
        //console.debug('onMessage: raw msg.data=', msg.data);
        // console.info("received a message: (" + this.nServerMsgs + ") otype=",
        //     data.otype, "msg.data=", data);
        //}

        switch (data.otype) {
            case 'GUITime':
                const guiTime:GUITime = data as GUITime;
                const time:string = guiTime.time;
                this.onTimeReceived(time);
                break;
            case 'GUIPingScanStatus':
                const msgData:GUIPingScanStatus = data as GUIPingScanStatus;
                this.onPingScanStatusReceived(msgData);
                break;
            case 'GUISensor':
                const sensorConfigMsg:GUISensor = data as GUISensor;
                switch (sensorConfigMsg.info.location) {
                    case Location.MAP:
                    case Location.MAP_AUTO:
                        // add to mapSensors, indexed by dotid
                        this.onMapSensorReceived(sensorConfigMsg);
                        break;

                    case Location.TRAY:
                        this.onTraySensorReceived(sensorConfigMsg);
                        break;
                    default:
                        throw new Error('unexpected sensor location' + sensorConfigMsg.info.location);
                }
                break;

            case 'GUISensorStatus':
                const sensorStatusMsg:GUISensorStatus = data as GUISensorStatus;
                this.onSensorStatusReceived(sensorStatusMsg);
                break;

            case 'GUIStopbarSensorZone':
            case 'GUICountSensorZone':
                this.onSZStopbarOrCountReceived(data, topState);
                break;

            case 'GUISpeed2SensorZone':
                this.onSZSpeed2Received(data, topState);
                break;

            case 'GUISpeed3SensorZone':
                this.onSZSpeed3Receivd(data, topState);
                break;

            case 'GUISensorZoneStatus':
                this.onSZStatusReceived(data as GUISensorZoneStatus);
                break;

            case 'GUIRepeater':
                const repeaterConfigMsg: GUIRepeater = data as GUIRepeater;
                switch (repeaterConfigMsg.info.location) {
                    case Location.MAP:
                    case Location.MAP_AUTO:
                        // add to mapRepeaters, indexed by dotid
                        this.onMapRepeaterReceived(repeaterConfigMsg);
                        break;

                    case Location.TRAY:
                        this.onTrayRepeaterReceived(repeaterConfigMsg);
                        break;
                    default:
                        throw new Error('unexpected repeater location' + repeaterConfigMsg.info.location);
                }
                break;

            case 'GUIRepeaterStatus':
                const repeaterStatusMsg = data as GUIRepeaterStatus;
                this.onRepeaterStatusReceived(repeaterStatusMsg);
                break;

            case 'GUIAPConfig':
                this.onAPReceived(data);
                break;

            case 'GUICCCard':
            case 'GUICCSDLC':
            case 'GUICCAPGI':
            case 'GUICCSTS':
                this.onCCReceived(data);
                break;

            case 'GUICCStatus':
            case 'GUICCSDLCStatus':
            case 'GUICCAPGIStatus':
            case 'GUICCSTSStatus':
                const ccStatusMsg = data as GUICCStatus;
                this.onCCStatusReceived(ccStatusMsg);
                break;

            case 'GUIRadio':
                this.onRadioReceived(data, topState);
                break;

            case 'GUIRadioStatus':
                const radioStatusMsg = data as GUIRadioStatus;
                this.onRadioStatusReceived(radioStatusMsg);
                break;

            case 'GUISaveProgress':
                this.onSaveProgressReceived(data);
                break;

            case 'GUITechSupport':
                this.onGUITechSupportReceived(data);
                break;

            case 'GUISensorUpdateProgress':
                this.onSensorUpdateProgressReceived(data);
                break;
            case 'GUIRepeaterUpdateProgress':
                this.onRepeaterUpdateProgressReceived(data);
                break;
            case 'GUIRadioUpdateProgress':
                this.onRadioUpdateProgressReceived(data);
                break;
            case 'GUICCUpdateProgress':
                this.onCCUpdateProgressReceived(data);
                break;
            case 'GUIFirmwareUpdateUnseenWarn':
                this.onFirmwareUpdateUnseenWarn(data);
                break;

            case 'GUIFirmwareUpdateComplete':
                this.onFirmwareUpdateComplete(data);
                break;

            case 'GUIConfigChangeProgress':
                this.onConfigChangeProgress(data);
                break;

            case 'GUIValidCredentials':
                this.onCredentialsValidityReceived(data);
                break;

            case 'GUISessionTimeout':
                this.onSessionTimeoutReceived(data);
                break;

            case 'AuthReject':
                this.onAuthRejectReceived(data);
                break;

            case 'TooManyClientsReject':
                this.onTooManyClientsRejectReceived(data);
                break;

            case 'ClearConfig':
                this.onClearConfig(data, topState);
                break;

            case 'GUIStartupState':
                this.onStartupStateReceived(data);
                break;

            default:
                console.error('Not yet handling otype: ' + data.otype);
                break;
        }
        this.nServerMsgs++;
    }

    private onFirmwareUpdateUnseenWarn(data: ServerMessage) {
        console.info('onFirmwareUpdateUnseenWarn: received');
        const fuuw: GUIFirmwareUpdateUnseenWarn = data as GUIFirmwareUpdateUnseenWarn;
        if (fuuw.unseen.length > 0) {
            const unseenDeviceIds: string = fuuw.unseen.join(', ');
            // TODO: at the point this message arises, is there already a dialog in place
            //       about firmware upgrade?  should this modify that dialog?
            this.topStore.showModal(ModalType.ONE_BUTTON_ERROR,
                'The following configured device(s) are not currently seen, and will not get upgraded: ' +
                unseenDeviceIds);
        } else {
            console.error('onFirmwareUpdateUnseenWarn(): unexpected empty unseen');
        }
    }

    private onFirmwareUpdateComplete(data: ServerMessage) {
        const fuc: GUIFirmwareUpdateComplete = data as GUIFirmwareUpdateComplete;
        const status: CompleteStatus = fuc.status;
        let showStatus: string = 'unknown';
        switch (status) {
            case CompleteStatus.ERROR: showStatus = 'error'; break;
            case CompleteStatus.SUCCESS: showStatus = 'success'; break;
            case CompleteStatus.UNSEEN: showStatus = 'problem'; break;
        }

        // mark all map devices (Repeaters, Sensors) as not uploading.
        // These devices should already have been notified through a progress msg,
        // but this step is to guarantee we get back to a normal state.
        // TODO: The set of devices could be sent as part of the msg.
        // for now need to mark all
        for (const mapSensorId of Object.keys(this.topStore.getTopState().mapSensors)) {
            this.removeSensorUploadingState(mapSensorId);
        }
        for (const mapRepeaterId of Object.keys(this.topStore.getTopState().mapRepeaters)) {
            this.removeRepeaterUploadingState(mapRepeaterId);
        }
        for (const radioId of Object.keys(this.topStore.getTopState().radios)) {
            this.removeRadioUploadingState(radioId);
        }
        this.topStore.dismissAnyModal(ModalClass.FIRMWARE_UPGRADING);
        if (status === CompleteStatus.SUCCESS_REBOOT) {
            this.topStore.showModal(ModalType.NO_OK,
                'Firmware update of Gateway succeeded. ' +
                'Gateway will now reboot. This may take up to 10 minutes.',
                undefined, undefined, undefined, ModalClass.REBOOTING);
        } else {
            let description = 'Firmware Update is done. Status is ' + showStatus;
            if (showStatus === 'unknown') {
                description += '. Please check individual devices to verify that software version is changed.';
            }
            if (showStatus === 'problem') {
                description += '. Some configured devices are not seen. Firmware update cannot proceed.';
            }
            this.topStore.showModal(ModalType.ONE_BUTTON_SUCCESS, description);
        }
        document.body.style.cursor = "default";
    }

    private removeSensorUploadingState(mapDeviceId: string) {
        let updatedSensor: GUISensorClient = cloneDeep(this.topStore.getTopState().mapSensors[mapDeviceId]);
        updatedSensor.uploading = false;
        updatedSensor.percentComplete = undefined;
        this.topStore.enact({
            actions: [{
                objectId: mapDeviceId,
                objectType: ObjectType.MAP_SENSOR,
                newData: updatedSensor,
                updateType: UpdateType.UPDATE,
            }],
            description: 'turn off sensor firmware uploading',
        });
    }
    private removeRepeaterUploadingState(mapDeviceId: string) {
        let updatedRepeater: GUIRepeaterClient = cloneDeep(this.topStore.getTopState().mapRepeaters[mapDeviceId]);
        updatedRepeater.uploading = false;
        updatedRepeater.percentComplete = undefined;
        this.topStore.enact({
            actions: [{
                objectId: mapDeviceId,
                objectType: ObjectType.MAP_REPEATER,
                newData: updatedRepeater,
                updateType: UpdateType.UPDATE,
            }],
            description: 'turn off repeater firmware uploading',
        });
    }
    private removeRadioUploadingState(mapDeviceId: string) {
        let updatedRadio: GUIRadioClient = cloneDeep(this.topStore.getTopState().radios[mapDeviceId]);
        updatedRadio.uploading = false;
        updatedRadio.percentComplete = undefined;
        this.topStore.enact({
            actions: [{
                objectId: mapDeviceId,
                objectType: ObjectType.RADIO,
                newData: updatedRadio,
                updateType: UpdateType.UPDATE,
            }],
            description: 'turn off radio firmware uploading',
        });
    }

    private onSaveProgressReceived(data: ServerMessage):void {
        const saveProgress: GUISaveProgress = data as GUISaveProgress;

        // following section is to handle situation after comms loss during a Save
        const topModalClasses: string|undefined = this.topStore.getTopModalClasses();
        if (topModalClasses !== undefined && topModalClasses.includes(ModalClass.RECONNECTING as string)) {
            this.topStore.dismissModal(ModalClass.RECONNECTING);
        }
        if (topModalClasses !== ModalClass.SAVING) {
            this.topStore.dismissAnyModal(ModalClass.SAVING);
            this.topStore.showModal(ModalType.NO_OK,
                "A Save of Configuration to the Gateway is in progress",
                undefined, undefined, undefined, ModalClass.SAVING);
        }

        switch (saveProgress.status) {
            case Status.COMPLETE:
            case Status.COMPLETE_NO_CHANGES_MADE:
                console.info('GUISaveProgress: ', saveProgress.status);
                // following will disable the save button until next undoable action or undo or redo
                this.undoManager.setDoneStackLengthAtLastSuccessfulSave();

                // dismiss the saving modal, if present  (might be absent after comms loss)
                this.topStore.dismissAnyModal(ModalClass.SAVING);

                if (this.thisUserInitiatedSave === true) {
                    let msg: string = 'Save to Gateway was successful';
                    if (saveProgress.status === Status.COMPLETE_NO_CHANGES_MADE) {
                        msg = 'Save to Gateway resulted in no changes';
                    }
                    this.topStore.showModal(ModalType.ONE_BUTTON_SUCCESS, msg);
                    this.thisUserInitiatedSave = false;
                } else {
                    // (bug 13607, comment 6) we don't know for sure that this user did not
                    // initiate save: there might have been a comms disconnection.

                    // only want to show 1 save complete msg, no matter how many saves happen
                    this.topStore.dismissAnyModal(ModalClass.SAVE_COMPLETE);
                    // TODO: may want this text in the modal: 'For best results, please refresh this page (F5 or Ctrl-R).'
                    //       However, it seems that server sends a ClearConfig msg, which obviates the need for it.
                    this.topStore.showModal(ModalType.ONE_BUTTON_SUCCESS,
                        'The configuration on this Gateway has been successfully updated.',
                        undefined, undefined, undefined, ModalClass.SAVE_COMPLETE);
                }
                this.resetReplacementDeviceForAllDevices();
                // following is in case server didn't do it (e.g. for other user):
                this.clearSaveState();
                break;

            case Status.COMPLETE_REBOOT:
                console.info('GUISaveProgress: COMPLETE_REBOOT');
                // following will disable the save button until next undoable action or undo or redo
                this.undoManager.setDoneStackLengthAtLastSuccessfulSave();

                // dismiss the save modal
                this.topStore.dismissAnyModal(ModalClass.SAVING);

                if (this.thisUserInitiatedSave === true) {
                    this.topStore.showModal(ModalType.NO_OK,
                        'Save to Gateway was successful. Gateway will now reboot.',
                        undefined, undefined, undefined, ModalClass.REBOOTING);
                    this.thisUserInitiatedSave = false;
                } else {
                    // (bug 13607, comment 6) we don't know for sure that this user did not
                    // initiate save: there might have been a comms disconnection.
                    this.topStore.showModal(ModalType.NO_OK,
                        'The configuration on this Gateway has been successfully updated. Gateway will now reboot.',
                        undefined, undefined, undefined, ModalClass.REBOOTING);
                }
                this.resetReplacementDeviceForAllDevices();
                // following is in case server didn't do it:
                this.clearSaveState();
                break;

            case Status.STARTED:
            case Status.IN_PROGRESS:
                // assert: saveProgress.percentComplete <= 100
                // handle percent completion on save: show progress
                console.info('GUISaveProgress: percentComplete =', saveProgress.percentComplete);

                // show the saving modal.
                // TODO: we might prefer just to keep up the existing SAVING modal, so it would not
                //       not jump if user tries to move it.
                //       But problem is there are more than one forms of it it right now, and could change.
                //       Notably for scan in progress msg.
                this.topStore.dismissAnyModal(ModalClass.SAVING);
                // we block input here, in addition to upon user
                // initiation of save, to handle case of save external to APTD
                if (this.thisUserInitiatedSave) {
                    // show a modal blocker with no text box.
                    // This is so user can still see what's happening.
                    this.topStore.showModal(ModalType.NO_MSG, '', [],
                        [], undefined, ModalClass.SAVING);
                } else {
                    this.topStore.showModal(ModalType.NO_OK,
                        'A config change for this Gateway has been initiated. ' +
                        'You can continue to make changes after config change is complete.',
                        [], [], undefined, ModalClass.SAVING);
                }

                this.updateSavePercentComplete(saveProgress.percentComplete);
                this.setAwaitingSaveResult();
                break;

            case Status.UPDATING_FIRMWARE:
                // assert: saveProgress.percentComplete <= 100
                // handle percent completion on save: show progress
                console.info('GUISaveProgress: percentComplete =', saveProgress.percentComplete);

                this.topStore.dismissAnyModal(ModalClass.SAVING);
                // we block input here, in addition to upon user
                // initiation of save, to handle case of save external to APTD
                if (this.thisUserInitiatedSave) {
                    // show a modal blocker with no text box.
                    // This is so user can still see what's happening.
                    this.topStore.showModal(ModalType.NO_OK,
                        'Some configured devices require an update to their firmware. ' +
                        'That will take place now and may take several minutes.', [],
                        [], undefined, ModalClass.SAVING);
                } else {
                    this.topStore.showModal(ModalType.NO_OK,
                        'A config change for this Gateway required a firmware upgrade on some devices. ' +
                        'That will take place now and may take several minutes. ' +
                        'You can continue to make changes after the config change is complete.',
                        [], [], undefined, ModalClass.SAVING);
                }

                this.updateSavePercentComplete(saveProgress.percentComplete);
                this.setAwaitingSaveResult();
                break;


            case Status.WAITING_FOR_SCAN_TO_COMPLETE:
                console.info('onSaveProgressReceived(): WAITING_FOR_SCAN_TO_COMPLETE case');
                // dismiss the save modal.
                this.topStore.dismissAnyModal(ModalClass.SAVING);

                if (this.thisUserInitiatedSave) {
                    this.topStore.showModal(ModalType.NO_OK,
                        'Waiting for scan to finish before completing Save actions.',
                        [], [], undefined,
                        ModalClass.SAVING);
                } else {
                    this.topStore.showModal(ModalType.NO_OK,
                        'Due to a Save initiated by another user, a Scan needs to run before the Save can take place. Please wait.',
                        [], [], undefined, ModalClass.SAVING);
                }

                this.setAwaitingSaveResult();
                // set mode so scanning shows.
                this.setConfiguredDevicesResolved(false);
                break;

            case Status.ERROR_VALIDATION:
            case Status.ERROR_INTERNAL:
                console.error('Server Save problem. Status returned: ', saveProgress.status);
                // following will clear any Saving Modal
                this.clearSaveState();
                if (this.thisUserInitiatedSave) {
                    this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'A problem occurred in saving this configuration.');
                    this.thisUserInitiatedSave = false;
                } else {
                    this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'A problem occurred in saving the configuration.');
                }
                break;

            case Status.ERROR_CANT_LOCATE_ALL_DEVICES:
                // following will clear any Saving Modal
                this.clearSaveState();
                if (this.thisUserInitiatedSave) {
                    this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'A problem occurred in saving this configuration. SensConfig cannot locate all devices you have configured. Please remove devices with yellow warning triangles from the map.');
                    this.thisUserInitiatedSave = false;
                } else {
                    this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'A problem occurred in saving the configuration. SensConfig could not locate all configured devices.');
                }
                break;

            case Status.ERROR_POOR_RADIO_SIGNAL_STRENGTH:
                // following will clear any Saving Modal
                this.clearSaveState();
                if (this.thisUserInitiatedSave) {
                    this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'A problem occurred in saving this configuration. There is inadequate radio signal strength.');
                    this.thisUserInitiatedSave = false;
                } else {
                    this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'A problem occurred in saving the configuration. There is inadequate radio signal strength.');
                }
                break;

            case Status.ERROR_NO_MORE_RETRIES:
                // following will clear any Saving Modal
                this.clearSaveState();
                if (this.thisUserInitiatedSave) {
                    this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'A problem occurred in saving this configuration. The server reached its limit of retries.');
                    this.thisUserInitiatedSave = false;
                } else {
                    this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'A problem occurred in saving the configuration. The server reached its limit of retries.');
                }
                break;

            case Status.ERROR_UPDATE_IN_PROGRESS:
                // following will clear any Saving Modal
                this.clearSaveState();
                if (this.thisUserInitiatedSave) {
                    this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'A problem occurred in saving this configuration. A save is already in progress.');
                    this.thisUserInitiatedSave = false;
                } else {
                    this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'A problem occurred in saving the configuration. A save is already in progress.');
                }
                break;

            default:
                console.error('unexpected status: ', saveProgress.status);
                break;
        }
    }

    /** @param pctComplete: null means we are not in saving mode */
    private updateSavePercentComplete(percentComplete: number|null) {
        const actionGroup2: ActionGroup = {
            actions: [{
                objectId: "",
                objectType: ObjectType.SAVE_PERCENT_COMPLETE,
                newData: percentComplete,
                updateType: UpdateType.UPDATE,
            }],
            description: "update save percent complete"
        };
        this.topStore.enact(actionGroup2);
    }


    private onConfigChangeProgress(data: ServerMessage) {
        console.info('onConfigChangeProgress: received');
        let message: GUIConfigChangeProgress = data as GUIConfigChangeProgress;

        // following section is to handle situation after comms loss during a Save
        const topModalClasses: string|undefined = this.topStore.getTopModalClasses();
        this.topStore.dismissAnyModal(ModalClass.RECONNECTING);
        if (topModalClasses !== ModalClass.SAVING) {
            this.topStore.dismissAnyModal(ModalClass.SAVING);
            this.topStore.showModal(ModalType.NO_OK, "A Save of Configuration to the Gateway is in progress",
                undefined, undefined, undefined, ModalClass.SAVING);
        }

        let statusDotId: string = WebSocketManager.toDotId(message.id);
        let affectedSensor: GUISensorClient | null = null;
        let affectedRepeater: GUIRepeaterClient | null = null;
        const topState:TopStoreState = this.topStore.getTopState();
        let objectType: ObjectType | null = null;
        if (statusDotId in topState.mapSensors) {
            affectedSensor = cloneDeep(topState.mapSensors[statusDotId]);
            objectType = ObjectType.MAP_SENSOR
        } else if (statusDotId in topState.trayDevices) {
            affectedSensor = cloneDeep(topState.trayDevices[statusDotId]) as GUISensorClient;
            objectType = ObjectType.TRAY_SENSOR;
        }
        else if (statusDotId in topState.mapRepeaters) {
            affectedRepeater = cloneDeep(topState.mapRepeaters[statusDotId]);
            objectType = ObjectType.MAP_REPEATER;
        }
        if ((affectedSensor === null && affectedRepeater === null) || objectType === null) {
            console.error('onConfigChangeProgress(): cannot match SensorStatus to existing Sensor or Repeater. dotid=', statusDotId);
            return;
        }

        // finally: the actual update
        if (message.status === ConfigChangeStatus.QUEUED) {
            // apparently we are not showing queued status to user now
        }
        else if (message.status === ConfigChangeStatus.STARTED) {
            if (affectedSensor !== null) {
                affectedSensor.busyStatus = ConfigChangeStatus.STARTED;
            }
            else if (affectedRepeater !== null) {
                affectedRepeater.busyStatus = ConfigChangeStatus.STARTED;
            }
        }
        else if (message.status === ConfigChangeStatus.DONE ||
                 message.status === ConfigChangeStatus.ERROR) {
            if (affectedSensor !== null) {
                affectedSensor.busyStatus = message.status;
            }
            else if (affectedRepeater !== null) {
                affectedRepeater.busyStatus = message.status;
            }
        } else {
            console.error('unexpected message status: ', message.status);
        }

        if (affectedSensor !== null) {
            const actionGroup: ActionGroup = {
                actions: [{
                    objectId: statusDotId,
                    objectType: objectType,
                    newData: affectedSensor,
                    updateType: UpdateType.UPDATE,
                }],
                description: "update Sensor with config status"
            };
            this.topStore.enact(actionGroup);
        }
        else if (affectedRepeater !== null) {
            const actionGroup: ActionGroup = {
                actions: [{
                    objectId: statusDotId,
                    objectType: objectType,
                    newData: affectedRepeater,
                    updateType: UpdateType.UPDATE,
                }],
                description: "update Repeater with config status"
            };
            this.topStore.enact(actionGroup);
        }
    }

    /*
    private onConfigU(data: ServerMessage) {
        console.info('onConfigChangeProgress: received');
        let message: GUIConfigChangeProgress = data as GUIConfigChangeProgress;

        // following section is to handle situation after comms loss during a Save
        const topModalClasses: string|undefined = this.topStore.getTopModalClasses();
        this.topStore.dismissAnyModal(ModalClass.RECONNECTING);
        if (topModalClasses !== ModalClass.SAVING) {
            this.topStore.dismissAnyModal(ModalClass.SAVING);
            this.topStore.showModal(ModalType.NO_OK, "A Save of Configuration to the Gateway is in progress",
                undefined, undefined, undefined, ModalClass.SAVING);
        }

        let statusDotId: string = WebSocketManager.toDotId(message.id);
        let affectedSensor: GUISensorClient | null = null;
        let affectedRepeater: GUIRepeaterClient | null = null;
        const topState:TopStoreState = this.topStore.getTopState();
        let objectType: ObjectType | null = null;
        if (statusDotId in topState.mapSensors) {
            affectedSensor = cloneDeep(topState.mapSensors[statusDotId]);
            objectType = ObjectType.MAP_SENSOR
        } else if (statusDotId in topState.trayDevices) {
            affectedSensor = cloneDeep(topState.trayDevices[statusDotId]) as GUISensorClient;
            objectType = ObjectType.TRAY_SENSOR;
        }
        else if (statusDotId in topState.mapRepeaters) {
            affectedRepeater = cloneDeep(topState.mapRepeaters[statusDotId]);
            objectType = ObjectType.MAP_REPEATER;
        }
        if ((affectedSensor === null && affectedRepeater === null) || objectType === null) {
            console.error('onConfigChangeProgress(): cannot match SensorStatus to existing Sensor or Repeater. dotid=', statusDotId);
            return;
        }

        // finally: the actual update
        if (message.status === ConfigChangeStatus.QUEUED) {
            // apparently we are not showing queued status to user now
        }
        else if (message.status === ConfigChangeStatus.STARTED) {
            if (affectedSensor !== null) {
                affectedSensor.busyStatus = ConfigChangeStatus.STARTED;
            }
            else if (affectedRepeater !== null) {
                affectedRepeater.busyStatus = ConfigChangeStatus.STARTED;
            }
        }
        else if (message.status === ConfigChangeStatus.DONE ||
            message.status === ConfigChangeStatus.ERROR) {
            if (affectedSensor !== null) {
                affectedSensor.busyStatus = message.status;
            }
            else if (affectedRepeater !== null) {
                affectedRepeater.busyStatus = message.status;
            }
        } else {
            console.error('unexpected message status: ', message.status);
        }

        if (affectedSensor !== null) {
            const actionGroup: ActionGroup = {
                actions: [{
                    objectId: statusDotId,
                    objectType: objectType,
                    newData: affectedSensor,
                    updateType: UpdateType.UPDATE,
                }],
                description: "update Sensor with config status"
            };
            this.topStore.enact(actionGroup);
        }
        else if (affectedRepeater !== null) {
            const actionGroup: ActionGroup = {
                actions: [{
                    objectId: statusDotId,
                    objectType: objectType,
                    newData: affectedRepeater,
                    updateType: UpdateType.UPDATE,
                }],
                description: "update Repeater with config status"
            };
            this.topStore.enact(actionGroup);
        }
    }
    */

    /**
     * Update TopStore, and thereby the UI, to show progress in upgrade of repeater firmware
     */
    private onRepeaterUpdateProgressReceived(data: ServerMessage) {
        console.info('onRepeaterUpdateProgressReceived: received');
        let message = data as GUIRepeaterUpdateProgress;

        let statusDotid: string = WebSocketManager.toDotId(message.id);
        let affectedRepeater: GUIRepeaterClient | null = null;
        const topState: TopStoreState = this.topStore.getTopState();
        let objectType: ObjectType | null = null;
        if (statusDotid in topState.mapRepeaters) {
            affectedRepeater = cloneDeep(topState.mapRepeaters[statusDotid]);
            objectType = ObjectType.MAP_REPEATER
        } else if (statusDotid in topState.trayDevices) {
            affectedRepeater = cloneDeep(topState.trayDevices[statusDotid]) as GUIRepeaterClient;
            objectType = ObjectType.TRAY_REPEATER;
        }
        if (affectedRepeater === null || objectType === null) {
            console.error('onRepeaterUpdateProgressReceived(): cannot match RepeaterStatus to existing Repeater. dotid=', statusDotid);
            return;
        }

        // finally: the actual update
        if (message.status === UpdateProgressStatus.IN_PROGRESS ||
            message.status === UpdateProgressStatus.IN_PROGRESS_DELAY) {
            affectedRepeater.uploading = true;
            affectedRepeater.percentComplete = message.percentComplete;
            if (! this.topStore.isAnyModal(ModalClass.FIRMWARE_UPGRADING)) {
                // handle case of interrupted connection or arriving client
                this.topStore.showModal(ModalType.NO_OK,
                    'A firmware upgrade is in progress for configured Repeaters. ' +
                    'Please wait. ',
                    undefined, undefined, undefined,
                    ModalClass.FIRMWARE_UPGRADING);
            }
        } else if (message.status === UpdateProgressStatus.COMPLETE) {
            affectedRepeater.uploading = false;
            affectedRepeater.percentComplete = 100;
            //this.topStore.dismissAnyModal(ModalClass.FIRMWARE_UPGRADING);
        } else {
            affectedRepeater.uploading = false;
            affectedRepeater.percentComplete = 0;
            //this.topStore.dismissAnyModal(ModalClass.FIRMWARE_UPGRADING);
            // following is handled in response to FIRMWARE_UPDATE_COMPLETE
            //this.topStore.showModal(ModalType.ONE_BUTTON_ERROR,
            //    'A problem was encountered in firmware upgrade. Possibly some Repeaters were not upgraded.');
        }
        const actionGroup: ActionGroup = {
            actions: [{
                objectId: statusDotid,
                objectType: objectType,
                newData: affectedRepeater,
                updateType: UpdateType.UPDATE,
            }],
            description: "update Repeater with progress status"
        };
        this.topStore.enact(actionGroup);
    }

    /**
     * Update TopStore, and thereby the UI, to show progress in upgrade of radio firmware
     */
    private onRadioUpdateProgressReceived(data: ServerMessage) {
        console.info('onRadioUpdateProgressReceived: received');
        let message = data as GUIRadioUpdateProgress;

        let statusDotid: string = WebSocketManager.toDotId(message.id);
        let affectedRadio: GUIRadioClient | null = null;
        const topState: TopStoreState = this.topStore.getTopState();
        let objectType: ObjectType | null = null;
        if (statusDotid in topState.radios) {
            affectedRadio = cloneDeep(topState.radios[statusDotid]);
            objectType = ObjectType.RADIO;
        }
        if (affectedRadio === null || objectType === null) {
            console.error('onRadioUpdateProgressReceived(): cannot match RadioStatus to existing Radio. dotid=', statusDotid);
            return;
        }

        // finally: the actual update
        if (message.status === UpdateProgressStatus.IN_PROGRESS ||
            message.status === UpdateProgressStatus.IN_PROGRESS_DELAY) {
            affectedRadio.uploading = true;
            affectedRadio.percentComplete = message.percentComplete;
            if (! this.topStore.isAnyModal(ModalClass.FIRMWARE_UPGRADING)) {
                // handle case of interrupted connection or arriving client
                this.topStore.showModal(ModalType.NO_OK,
                    'A firmware upgrade is in progress for configured Radios. ' +
                    'Please wait. ',
                    undefined, undefined, undefined,
                    ModalClass.FIRMWARE_UPGRADING);
            }
        } else if (message.status === UpdateProgressStatus.COMPLETE) {
            affectedRadio.uploading = false;
            affectedRadio.percentComplete = 100;
            //this.topStore.dismissAnyModal(ModalClass.FIRMWARE_UPGRADING);
        } else {
            affectedRadio.uploading = false;
            affectedRadio.percentComplete = 0;
            //this.topStore.dismissAnyModal(ModalClass.FIRMWARE_UPGRADING);
            // following is handled in response to FIRMWARE_UPDATE_COMPLETE
            //this.topStore.showModal(ModalType.ONE_BUTTON_ERROR,
            //    'A problem was encountered in firmware upgrade. Possibly some radios were not upgraded.');
        }
        const actionGroup: ActionGroup = {
            actions: [{
                objectId: statusDotid,
                objectType: objectType,
                newData: affectedRadio,
                updateType: UpdateType.UPDATE,
            }],
            description: "update Radio with progress status"
        };
        this.topStore.enact(actionGroup);
    }

    private onSensorUpdateProgressReceived(data: ServerMessage) {
        console.info('onSensorUpdateProgressReceived: received');
        let message = data as GUISensorUpdateProgress;

        let statusDotid: string = WebSocketManager.toDotId(message.id);
        let affectedSensor: GUISensorClient | null = null;
        const topState:TopStoreState = this.topStore.getTopState();
        let objectType: ObjectType | null = null;
        if (statusDotid in topState.mapSensors) {
            affectedSensor = cloneDeep(topState.mapSensors[statusDotid]);
            objectType = ObjectType.MAP_SENSOR;
        } else if (statusDotid in topState.trayDevices) {
            affectedSensor = cloneDeep(topState.trayDevices[statusDotid]) as GUISensorClient;
            objectType = ObjectType.TRAY_SENSOR;
        }
        if (affectedSensor === null || objectType === null) {
            console.error('onSensorUpdateProgressReceived(): cannot match SensorStatus to existing Sensor. dotid=', statusDotid);
            return;
        }

        // finally: the actual update
        if (message.status === UpdateProgressStatus.IN_PROGRESS ||
            message.status === UpdateProgressStatus.IN_PROGRESS_DELAY) {
            affectedSensor.uploading = true;
            affectedSensor.percentComplete = message.percentComplete;
            if (! this.topStore.isAnyModal(ModalClass.FIRMWARE_UPGRADING)) {
                // handle case of interrupted connection or arriving client
                this.topStore.showModal(ModalType.NO_OK,
                    'A firmware upgrade is in progress for configured Sensors. ' +
                    'Please wait. ',
                    undefined, undefined, undefined,
                    ModalClass.FIRMWARE_UPGRADING);
            }
        } else if (message.status === UpdateProgressStatus.COMPLETE) {
            affectedSensor.uploading = false;
            affectedSensor.percentComplete = 100;
        } else {
            affectedSensor.uploading = false;
            affectedSensor.percentComplete = 0;
            // following could produce a lot of messages.
            // it is handled in response to FIRMWARE_UPDATE_COMPLETE
            //this.topStore.showModal(ModalType.ONE_BUTTON_ERROR,
            //    'A problem was encountered in firmware upgrade. Possibly some sensors were not upgraded.');
        }

        const actionGroup: ActionGroup = {
            actions: [{
                objectId: statusDotid,
                objectType: objectType,
                newData: affectedSensor,
                updateType: UpdateType.UPDATE,
            }],
            description: "update Sensor with progress status"
        };
        this.topStore.enact(actionGroup);
    }

    private onCCUpdateProgressReceived(data: ServerMessage) {
        console.info('onCCUpdateProgressReceived: received');
        let message = data as GUISensorUpdateProgress;
        let statusDotid: string = WebSocketManager.toDotId(message.id);
        // finally: the actual update
        if (message.status === UpdateProgressStatus.IN_PROGRESS) {
            if (! this.topStore.isAnyModal(ModalClass.FIRMWARE_UPGRADING)) {
                // handle case of interrupted connection or arriving client
                this.topStore.showModal(ModalType.NO_OK,
                    'A firmware upgrade is in progress for configured Cards. ' +
                    'Please wait. ',
                    undefined, undefined, undefined,
                    ModalClass.FIRMWARE_UPGRADING);
            }
        }

        const actionGroup: ActionGroup = {
            actions: [{
                objectId: statusDotid,
                objectType: ObjectType.CCCARD,
                newData: null,
                updateType: UpdateType.UPDATE,
            }],
            description: "update CCCard with progress status"
        };
        this.topStore.enact(actionGroup);
    }

    private onRadioReceived(data: ServerMessage, topState: TopStoreState) {
        let updateType: UpdateType = UpdateType.ADD;
        let description: string = 'add Radio';
        let radioReceivedAsClient: GUIRadioClient = this.toGUIRadioClient(data);
        if (radioReceivedAsClient.info.location === Location.MAP_AUTO ||
            (radioReceivedAsClient.info.location === Location.MAP &&
            radioReceivedAsClient.info.position.x === 0 &&
            radioReceivedAsClient.info.position.y === 0)) {
            // lastPosition is saved for a previously-deleted Radio
            const lastPosition: GUIPoint = this.topStore.getTopState().lastRadioPositionById[radioReceivedAsClient.id];
            if (lastPosition !== undefined) {
                radioReceivedAsClient.info.position = lastPosition;
            } else {
                // use the default MAP_AUTO location for Radio Id to prevent overlap
                const radioIndex = Number(radioReceivedAsClient.id[radioReceivedAsClient.id.length-1]);
                radioReceivedAsClient.info.position = {
                    x: 602 + 114 * radioIndex, y: 673 - 11 * radioIndex
                };
            }
            radioReceivedAsClient.info.location = Location.MAP;
        }
        let newRadio: GUIRadioClient = radioReceivedAsClient;
        newRadio.unheard = false;

        if (this.isOnMap(radioReceivedAsClient)) {
            // Rule: only update fields that User cannot change
            updateType = UpdateType.UPDATE;
            description = 'update Radio';
            let existingRadio: GUIRadioClient = cloneDeep(this.topStore.getTopState().radios[radioReceivedAsClient.id]);
            newRadio = this.updateConfigReadOnlyFields(radioReceivedAsClient, existingRadio) as GUIRadioClient;
            newRadio.unheard = false;
        }

        let actions: Action[] = [{
            objectId: newRadio.id,
            objectType: ObjectType.RADIO,
            newData: newRadio,
            updateType: updateType,
        }];
        const actionGroup: ActionGroup = {
            actions: actions,
            description: description,
        };
        this.topStore.enact(actionGroup);
    }

    private onCCReceived(data: ServerMessage) {
        const topStoreState: TopStoreState = this.topStore.getTopState();
        let ccCardConfig = this.toGUICCCardClient(data as GUICCInterfaceBase);
        ccCardConfig.unheard = false;
        let updateType: UpdateType = UpdateType.ADD as UpdateType;
        if (this.isOnMap(ccCardConfig)) {
            const ccCard:GUICCInterfaceBaseClient = cloneDeep(this.topStore.getTopState().ccCards[ccCardConfig.id]);
            ccCard.rssi = ccCardConfig.rssi;
            ccCard.unheard = false;
            ccCardConfig = ccCard;
            console.warn('duplicate GUICCCard or GUICCSDLC msg for ' + ccCardConfig.id + ', updating');
            updateType = UpdateType.UPDATE;
        } else if (ccCardConfig.cardInterface !== Interface.EXCard &&
                   ccCardConfig.cardInterface !== Interface.CCCard &&
                   topStoreState.ccCards !== null && topStoreState.ccCards !== undefined &&
                   Object.keys(topStoreState.ccCards).length > 0) {
            // for non-EX non-CC card types, only 1 card is allowed.
            console.error('ignoring card because there is already one', ccCardConfig, ccCardConfig.id);
            return;
        }
        let actions = [{
            objectId: ccCardConfig.id,
            objectType: ObjectType.CCCARD,
            newData: ccCardConfig,
            updateType: updateType
        }];
        const actionGroup: ActionGroup = {
            actions: actions,
            description: "add or update CC or SDLC or virtual Card",
        };
        this.topStore.enact(actionGroup);
    }

    /**
     * Upon receipt of GUIAPConfig msg, which comes after new connection, a reconnection,
     * or after ClearConfig, or after a Save.
     * We can distinguish the case of when a reconnection is caused by server restart.
     */
    private onAPReceived(data: ServerMessage) {
        let updateType = UpdateType.ADD;
        const apconfig: GUIAPConfig = data as GUIAPConfig;
        let apReceivedAsClient: GUIAPConfigClient = this.toGUIAPConfigClient(data);
        let mapConfig: MapSettings = this.toMapSettings(apReceivedAsClient);
        let newApConfig: GUIAPConfigClient = apReceivedAsClient;
        // remove MapSettings fields from ap, because they are not the source of truth.
        // we want to prevent confusion.
        // we put them back on Save when sending back to Server.
        this.removeMapSettingsFields(newApConfig);
        const topStateAp = this.topStore.getTopState().ap;
        if (topStateAp !== null) {
            // if this GUIAPConfig comes after restart of server,
            // 1. clear out all config and tray items
            // 2. ADD GUIAPConfig
            if (newApConfig.runSeqNum > topStateAp.runSeqNum) {
                console.debug('onAPReceived(): adding GUIAPConfig after server restart');
                if (this.undoManager.undoStackChangedSinceLastSave()) {
                    // unsaved changes
                    const msg = "The SensConfig Server needed to restart. " +
                        "Any unsaved changes you have made have unfortunately been lost. ";
                    this.topStore.showModal(ModalType.ONE_BUTTON_SUCCESS, msg);
                }
                this.topStore.clearConfig();
                this.topStore.clearTray();
                updateType = UpdateType.ADD;
                newApConfig.unheard = false;
            } else {
                // Presumably this is a reconnect after comm failure but without server restart.
                // Only update certain attributes from server apConfig.
                console.debug('onAPReceived(): updating GUIAPConfig after a comms loss');
                updateType = UpdateType.UPDATE;
                mapConfig = cloneDeep(this.topStore.getTopState().mapSettings);
                let existingAp: GUIAPConfigClient = cloneDeep(topStateAp);
                newApConfig = this.updateConfigReadOnlyFields(apReceivedAsClient, existingAp) as GUIAPConfigClient;
                newApConfig.unheard = false;
                newApConfig.requireLoginStateSaved = apReceivedAsClient.requireLoginStateSaved;
            }
        } else {
            console.debug('onAPReceived(): adding initial GUIAPConfig after client start');
        }

        let actions: Action[] = [{
            objectId: newApConfig.id,
            objectType: ObjectType.AP,
            newData: newApConfig,
            updateType: updateType,
        },{
            objectId: '',
            objectType: ObjectType.MAP_SETTINGS,
            newData: mapConfig,
            updateType: UpdateType.UPDATE,
        }];

        const actionGroup: ActionGroup = {
            actions: actions,
            description: "add/update AP"
        };
        this.topStore.enact(actionGroup, this.afterAPPosted);

        console.debug('onAPReceived(): about to create MapImagesManager');
        this.aptdApp.makeMapImagesManager(apconfig.mapFiles, apconfig.mapImage);

        // Test which modal, if any, is shown.
        // If it is the disconnected modal, then dismiss it.
        this.topStore.dismissAnyModal(ModalClass.RECONNECTING);
        // TODO: do we always dismiss FIRMWARE_UPGRADING here, or only in server restart case above?
        this.topStore.dismissAnyModal(ModalClass.FIRMWARE_UPGRADING);
    }

    /**
     * Remove MapSettings fields from ap, because they are not the source of truth.
     * We want to prevent confusion.
     * We put them back on Save when sending back to Server.
     * @see toServerAP()
     */
    private removeMapSettingsFields(newApConfig: GUIAPConfigClient) {
        delete newApConfig.cabinetIconLocation;
        delete newApConfig.hideCabinetIcon;
        delete newApConfig.hideLegend;
        delete newApConfig.hideRFLinks;
        delete newApConfig.hideCCLinks;
        delete newApConfig.compassDirection;
        delete newApConfig.guiTexts;
        delete newApConfig.mapImage;
    }

    /**
     *  After AP was received from server and posted to TopStore.
     *  Needed because TD2 may allow, or apeg.rc may contain inappropriate
     *  settings that should be flagged upon initial load.
     */
    private afterAPPosted():void {
        this.topStore.validationManager.validateAP('AP');
        this.enableInput();
    }
    /** TODO: this may not be needed */
    private afterMapSensorPosted(mapSensorId:string) {
        this.topStore.validationManager.validateMapSensor(mapSensorId);
    }
    /** TODO: this may not be needed */
    private afterSZPosted(szId:string) {
        this.topStore.validationManager.validateSensorZone(szId);
    }

    private enableInput():void {
        const actionGroup: ActionGroup = {
            actions: [{
                objectId: ClientObjectUpdateType.DISABLED,
                objectType: ObjectType.CLIENT,
                newData: false,
                updateType: UpdateType.UPDATE
            }],
            description: "update global input disabled"
        };
        this.topStore.enact(actionGroup);
    }

    /** GUIRadioClient always has fields firmware and knowchannel
     *  GUIRadio has firmwareVersion and channel which needs conversion*/
    private toGUIRadioClient(data: ServerMessage): GUIRadioClient {
        let radio: GUIRadio = cloneDeep(data as GUIRadio);
        let radioClient: GUIRadioClient = cloneDeep(data as GUIRadio);
        radioClient.firmware = radio.firmwareVersion
        radioClient.knownChannel = WebSocketManager.channelIntToString(radio.channel);
        radioClient.desiredChannel = WebSocketManager.channelIntToString(radio.channel);
        radioClient.uploading = false;
        // @ts-ignore
        delete radioClient.channel;
        return radioClient;
    }

    /** GUIAPConfigClient always has 3 ntpHosts in array, but some can be blank */
    private toGUIAPConfigClient(data: ServerMessage): GUIAPConfigClient {
        let apConfig: GUIAPConfigClient = cloneDeep(data as GUIAPConfig);
        if (apConfig.info.location === Location.MAP_AUTO ||
            (apConfig.info.position.x === 0 &&
            apConfig.info.position.y === 0)) {
            // set an arbitrary initial map position that will work for most maps
            apConfig.info.position = {x: 659, y: 692};
            apConfig.info.location = Location.MAP;
        }
        const numNtpHosts: number = apConfig.ntpHosts.length;
        for (let ntpHostIndex = numNtpHosts; ntpHostIndex < 3; ntpHostIndex++) {
            apConfig.ntpHosts.push('');
        }
        // colorCode*NibbleManual must be valid values, in range [0x01, 0x7c],
        // suitable as initial settings for manual setting of colorCode
        apConfig.colorCodeHiNibbleManual = +apConfig.colorCode[0] <= 7 ? apConfig.colorCode[0] : '0';
        if (apConfig.colorCode[0] !== '7') {
            if (apConfig.colorCode[0] === '0') {
                apConfig.colorCodeLoNibbleManual = apConfig.colorCode[1] === '0' ? '1' : apConfig.colorCode[1];
            } else {
                apConfig.colorCodeLoNibbleManual = apConfig.colorCode[1];
            }
        } else {
            if (+apConfig.colorCode[1] <= 0xC) {
                apConfig.colorCodeLoNibbleManual = apConfig.colorCode[1];
            } else {
                apConfig.colorCodeLoNibbleManual = 'C';
            }
        }

        const mapImagesManager = this.aptdApp.state.mapImagesManager;
        if (mapImagesManager !== null) {
            if (apConfig.mapImage === null || apConfig.mapImage === undefined || apConfig.mapImage === "") {
                apConfig.mapImage = mapImagesManager.mapData[mapImagesManager.defaultInitialMapIndex]!.label;
                apConfig.mapImageIndex = mapImagesManager.defaultInitialMapIndex;
            }
        } else {
            console.debug('toGUIAPConfig(): mapImagesManager is null');
            apConfig.mapImage = '';
            apConfig.mapImageIndex = 0;
        }

        apConfig.requireLoginStateSaved = (apConfig.requireLogin === RequireLogin.ENABLED) ? true : false;

        if (apConfig.zoomLevel === -1) {
            // default zoomLevel is 1 always
            apConfig.zoomLevel = 1;
        }

        // aptdConf.xml saves the map label (the label that appears, localized, as label on the chooser),
        console.debug('toGUIAPConfigClient(); apConfig.mapImage=', apConfig.mapImage, 'apConfigi.mapImageIndex=', apConfig.mapImageIndex);
        return apConfig;
    }

    private toMapSettings(apConfig: GUIAPConfigClient): MapSettings {
        const textFields: GUIText[] = apConfig.guiTexts;
        const textFieldMap: {[id: string]: TextField} = {};
        for (let textFieldIndex = 0; textFieldIndex < textFields.length; ++textFieldIndex) {
            const textFieldId:string = "textField" + textFieldIndex;
            const textField:GUIText = textFields[textFieldIndex];
            textFieldMap[textFieldId] = {
                text: textField.text,
                position: textField.position,
                rotationDegrees: textField.rotationDegrees
            }
        }
        let cabinetIconLocation: GUIPoint = apConfig.cabinetIconLocation === undefined ?
            {x:0,y:0} : {...apConfig.cabinetIconLocation};
        if (cabinetIconLocation.x === 0 && cabinetIconLocation.y === 0) {
            // set an arbitray location for initial cabinet icon location
            // following works with most canned maps
            cabinetIconLocation = {x: 1155, y: 677};
        }

        let mapSettings: MapSettings = {
            showRFLinks: ! apConfig.hideRFLinks,
            showCCLinks: ! apConfig.hideCCLinks,
            showLegend: ! apConfig.initialized || ! apConfig.hideLegend,
            showCabinetIcon: ! apConfig.hideCabinetIcon,
            cabinetIconPosition: cabinetIconLocation,
            northArrowRotationDegrees: apConfig.compassDirection,
            textFields: textFieldMap,
            // mapImage?:
        };
        return mapSettings;
    }

    private toServerAP(apClient: GUIAPConfigClient | null, mapSettings: MapSettings | null): GUIAPConfig | null {
        if (apClient === null) {
            console.error('unexpected null AP');
            return null;
        }
        let apClientClone: GUIAPConfigClient = cloneDeep(apClient);
        if (this.topStore.getTopState().awaitingLoginValidation === true) {
            // for some reason, we have not received needed login validation,
            // so make sure requireLogin is disabled.
            console.info('toServerAP(): awaitingLoginValidation, so back out requireLogin.');
            this.backoutRequireLogin();
            apClientClone.requireLogin = RequireLogin.DISABLED;
        }
        for (let ntpHostIndex = apClientClone.ntpHosts.length-1; ntpHostIndex >= 0; ntpHostIndex--) {
            if (apClientClone.ntpHosts[ntpHostIndex] === "") {
                apClientClone.ntpHosts.pop();
            } else {
                break;
            }
        }
        if (apClient.colorCodeMode === ColorCodeMode.MANUAL) {
            apClientClone.colorCode = WebSocketManager.toColorCode(apClient.colorCodeHiNibbleManual, apClient.colorCodeLoNibbleManual);
        }
        delete apClientClone.colorCodeHiNibbleManual;
        delete apClientClone.colorCodeLoNibbleManual;
        const apServer: GUIAPConfig = apClientClone as GUIAPConfig;

        // TODO: would be better to do the rounding earlier, but at least need it here for server,
        //       which is expecting ints.
        apServer.info.position = {
            x: Math.round(apServer.info.position.x),
            y: Math.round(apServer.info.position.y)
        }

        if (mapSettings !== null) {
            apServer.compassDirection = mapSettings.northArrowRotationDegrees;
            apServer.hideRFLinks = ! mapSettings.showRFLinks;
            apServer.hideCCLinks = ! mapSettings.showCCLinks;
            apServer.hideCabinetIcon = ! mapSettings.showCabinetIcon;
            apServer.hideLegend = ! mapSettings.showLegend;
            apServer.cabinetIconLocation = mapSettings.cabinetIconPosition;
            const textFields: GUIText[] = [];
            for (const textField of Object.values(mapSettings.textFields)) {
                if (textField.editText !== undefined) {
                    console.error('unexpected editText value: ', textField.editText);
                }
                let position: GUIPoint|null = textField.position;
                if (position === null) {
                    position = {x:0, y: 0};
                }
                textFields.push({
                    text: textField.text,
                    position: position,
                    rotationDegrees: textField.rotationDegrees,
                });
            }
            apServer.guiTexts = textFields;
        }

        // ap.mapImage should be persisted as the label of the chosen image
        const mapImagesManager: MapImagesManager|null = this.aptdApp.state.mapImagesManager;
        if (mapImagesManager !== null) {
            console.debug('apServer.mapImage: ', apServer.mapImage);
            const currentMapDatum: MapDatum|null|undefined = mapImagesManager.getCurrentMapDatum();
            apServer.mapImage = (currentMapDatum !== null && currentMapDatum !== undefined ?
                currentMapDatum.label : mapImagesManager.defaultLabel);
            console.debug('revised apServer.mapImage: ', apServer.mapImage);
        } else {
            console.error('null mapImagesManager');
        }
        return apServer;
    }


    private onSZSpeed3Receivd(data: ServerMessage, topState: TopStoreState) {
        const newZone = data as GUISensorZone;
        const newSZ: GUISZClient = this.speed3SZToGUISZClient(newZone as GUISpeed3SensorZone);

        let configuredSzId = this.getConfiguredSzId(newSZ);
        if (configuredSzId !== "") {
            // This SZ is already in APTD's TopStore
            // Do not want to overwrite sensorZone object in case user has made changes since last save.
            let configuredSZ: GUISZClient = cloneDeep(this.topStore.getTopState().sensorZones[configuredSzId]);
            configuredSZ.id = newSZ.id;
            configuredSZ.unheard = false;

            const actionGroup: ActionGroup = {
                actions: [{
                    objectId: configuredSzId,
                    objectType: ObjectType.SENSOR_ZONE,
                    newData: configuredSZ,
                    updateType: UpdateType.UPDATE
                }],
                description: "update Speed3 SensorZone"
            };
            const afterSZPosted = () => {
                this.afterSZPosted(newSZ.id);
                this.fixSzReferences(configuredSzId, newSZ);
            }
            this.topStore.enact(actionGroup, afterSZPosted);
            return;
        }

        // Add new SZ from Server
        if (newSZ.info.location === Location.MAP_AUTO) {
            // make an arbitrary location
            const nSZs = Object.keys(this.topStore.getTopState().sensorZones).length;
            newSZ.info.position = {x: 648, y: 889 + 30 * nSZs};
            newSZ.info.rotationDegrees = 0;
            newSZ.info.location = Location.MAP;
        }

        const sensorActions:Action[] =
            MapAndTray.updateSensorCenterPointsAndLinks(newSZ,
                cloneDeep(this.topStore.getTopState().mapSensors), {}, this.topStore);
        let actions = sensorActions.concat([{
            objectId: newSZ.id,
            objectType: ObjectType.SENSOR_ZONE,
            newData: newSZ,
            updateType: UpdateType.ADD
        }, {
            objectId: newSZ.id,
            objectType: ObjectType.DOTID_TO_SZID,
            newData: {
                [newSZ.sensorIds[0]]: newSZ.id,
                [newSZ.sensorIds[1]]: newSZ.id,
                [newSZ.sensorIds[2]]: newSZ.id
            },
            origData: {...this.topStore.getTopState().sensorDotidToSzId},
            updateType: UpdateType.ADD
        }]);
        const actionGroup: ActionGroup = {
            actions: actions,
            description: "add Speed SensorZone"
        };
        const afterSZPosted = () => {
            this.afterSZPosted(newSZ.id);
        }
        this.topStore.enact(actionGroup, afterSZPosted);
    }

    private onSZSpeed2Received(data: ServerMessage, topState: TopStoreState) {
        const newZone = data as GUISensorZone;
        const newSZ: GUISZClient = this.speed2SZToGUISZClient(newZone as GUISpeed2SensorZone);

        let configuredSzId = this.getConfiguredSzId(newSZ);
        if (configuredSzId !== "") {
            // This SZ is already in APTD's TopStore
            // Do not want to overwrite sensorZone object in case user has made changes since last save.
            let configuredSZ: GUISZClient = cloneDeep(this.topStore.getTopState().sensorZones[configuredSzId]);
            configuredSZ.id = newSZ.id;
            configuredSZ.unheard = false;

            const actionGroup: ActionGroup = {
                actions: [{
                    objectId: configuredSzId,
                    objectType: ObjectType.SENSOR_ZONE,
                    newData: configuredSZ,
                    updateType: UpdateType.UPDATE
                }],
                description: "update Speed2 SensorZone"
            };
            const afterSZPosted = () => {
                this.afterSZPosted(newSZ.id);
                this.fixSzReferences(configuredSzId, newSZ);
            }
            this.topStore.enact(actionGroup, afterSZPosted);
            return;
        }

        // Add new SZ from Server
        if (newSZ.info.location === Location.MAP_AUTO) {
            // make an arbitrary location
            const nSZs = Object.keys(this.topStore.getTopState().sensorZones).length;
            newSZ.info.position = {x: 648, y: 889 + 30 * nSZs};
            newSZ.info.rotationDegrees = 0;
            newSZ.info.location = Location.MAP;
        }

        const sensorActions:Action[] =
            MapAndTray.updateSensorCenterPointsAndLinks(newSZ,
                cloneDeep(this.topStore.getTopState().mapSensors), {}, this.topStore);

        let actions = sensorActions.concat([{
            objectId: newSZ.id,
            objectType: ObjectType.SENSOR_ZONE,
            newData: newSZ,
            updateType: UpdateType.ADD
        }, {
            objectId: newSZ.id,
            objectType: ObjectType.DOTID_TO_SZID,
            newData: {
                [newSZ.sensorIds[0]]: newSZ.id,
                [newSZ.sensorIds[1]]: newSZ.id
            },
            origData: {...this.topStore.getTopState().sensorDotidToSzId},
            updateType: UpdateType.ADD
        }]);
        const actionGroup: ActionGroup = {
            actions: actions,
            description: "add Speed2 SensorZone"
        };
        const afterSZPosted = () => {
            this.afterSZPosted(newSZ.id);
        }
        this.topStore.enact(actionGroup, afterSZPosted);
    }

    private onSZStopbarOrCountReceived(data: ServerMessage, topState: TopStoreState) {
        const newSZ: GUISZClient = this.toGUISZClient(data as GUIStopbarSensorZone);

        let configuredSzId = this.getConfiguredSzId(newSZ);
        if (configuredSzId !== "") {
            // This SZ is already in APTD's TopStore (probably with a client-assigned name)
            // Do not want to overwrite sensorZone object in case user has made changes since last save.
            let configuredSZ: GUISZClient = cloneDeep(this.topStore.getTopState().sensorZones[configuredSzId]);
            configuredSZ.id = newSZ.id;
            configuredSZ.unheard = false;
            // following transaction will delete/add in case of client-assigned id
            const actionGroup: ActionGroup = {
                actions: [{
                    objectId: configuredSzId,
                    objectType: ObjectType.SENSOR_ZONE,
                    newData: configuredSZ,
                    updateType: UpdateType.UPDATE
                }],
                description: "update Count or Stopbar SensorZone"
            };
            const afterSZPosted = () => {
                this.afterSZPosted(newSZ.id);
                this.fixSzReferences(configuredSzId, newSZ);
            }
            this.topStore.enact(actionGroup, afterSZPosted);
            return;
        }

        // Add new SZ from Server
        if (newSZ.info.location === Location.MAP_AUTO) {
            // make an arbitrary location
            const nSZs = Object.keys(this.topStore.getTopState().sensorZones).length;
            newSZ.info.position = {x: 648, y: 889 + 30 * nSZs};
            newSZ.info.rotationDegrees = 0;
            newSZ.info.location = Location.MAP;
        }

        // SZ contains 1 sensor
        const sensorActions:Action[] =
            MapAndTray.updateSensorCenterPointsAndLinks(newSZ,
                cloneDeep(this.topStore.getTopState().mapSensors), {}, this.topStore);

        const actionGroup: ActionGroup = {
            actions: sensorActions.concat([{
                objectId: newSZ.id,
                objectType: ObjectType.SENSOR_ZONE,
                newData: newSZ,
                updateType: UpdateType.ADD
            }, {
                objectId: newSZ.id,
                objectType: ObjectType.DOTID_TO_SZID,
                newData: {[newSZ.sensorIds[0]]: newSZ.id},
                origData: {...this.topStore.getTopState().sensorDotidToSzId},
                updateType: UpdateType.ADD
            }]),
            description: "add Count or Stopbar SensorZone"
        };
        const afterSZPosted = () => {
            this.afterSZPosted(newSZ.id);
        }
        this.topStore.enact(actionGroup, afterSZPosted);
    }

    /**
     * When szid changes from client-assigned to server-assigned,
     * change all references in undo/redo stacks.
     * If that is not desired, only alternative is to disallow Undo after Save.
     */
    private fixSzReferences(configuredSzId: string, newSZ: GUISZClient) {
        // make sure that this is the case where former client-assigned id is now server-assigned
        if (configuredSzId.startsWith("clientSz") && !newSZ.id.startsWith("clientSz")) {
            console.debug("onSZStopbarOrCountReceived(): configuredSzId=", configuredSzId, "newSZ.id=", newSZ.id);
            this.fixSzIdInUndoStacks(configuredSzId, newSZ.id);
        } else {
            console.info('unexpected update of Sensor Zone with GUI*SensorZone. not updating undo stacks');
        }
    }

    /**
     * When szid changes from client-assigned to server-assigned,
     * change all references in undo/redo stacks.
     * If that is not desired, only alternative is to disallow Undo after Save.
     * @see this.fixSzReferences
     */
    private fixSzIdInUndoStacks(configuredSzId: string, newId: string) {
        const validActionGroups = this.undoManager.getUndoStacksValidElements();
        for (const actionGroup of validActionGroups) {
            for (const action of actionGroup.actions) {
                this.fixAction(action, configuredSzId, newId);
            }
        }
        for (const actionGroup of this.undoManager.getRedoStack()) {
            for (const action of actionGroup.actions) {
                this.fixAction(action, configuredSzId, newId);
            }
        }
    }

    /** @see this.fixSzIdInUndoStacks */
    private fixAction(action: Action, configuredSzId: string, newId: string) {
        if (action.objectType === ObjectType.SENSOR_ZONE) {
            if (action.objectId === configuredSzId) {
                action.objectId = newId;
                if (action.newData !== null) {
                    (action.newData as GUISZClient).id = newId;
                }
            }
        } else if (action.objectType === ObjectType.DOTID_TO_SZID) {
            const hash = action.newData as { [dotid: string]: string };
            if (hash !== null) {
                for (const dotid of Object.keys(hash)) {
                    if (hash[dotid] === configuredSzId) {
                        hash[dotid] = newId;
                    }
                }
            }
            const hash2 = action.origData as { [dotid: string]: string };
            if (hash2 !== null) {
                for (const dotid of Object.keys(hash2)) {
                    if (hash2[dotid] === configuredSzId) {
                        hash2[dotid] = newId;
                    }
                }
            }
        } else if (action.objectType === ObjectType.SELECTED) {
            if (action.newData !== null &&
                (action.newData as Selected).selectedSzId === configuredSzId) {
                (action.newData as Selected).selectedSzId = newId;
            }
            if (action.origData !== null &&
                (action.origData as Selected).selectedSzId === configuredSzId) {
                (action.origData as Selected).selectedSzId = newId;
            }
        }
    }

    /**
     * We now allow possibility that tray sensor and map sensor could have same id,
     * but differing id64.
     */
    private onTraySensorReceived(sensorConfigMsg: GUISensor) {
        let updateType: UpdateType = UpdateType.ADD as UpdateType;
        let traySensorReceivedAsClient: GUISensorClient = {
            ...sensorConfigMsg,
            detect: false,
            id: WebSocketManager.toDotId(sensorConfigMsg.id),
            color: sensorConfigMsg.hwType === GUISensorType.RAD ? 'gray' : 'palegoldenrod',
            unheard: false,
            seen: true,
            firmware: -1,
            voltage: -1,
            configured: false,
        };

        let newTraySensor: GUISensorClient = traySensorReceivedAsClient;
        if (this.isOnMap(traySensorReceivedAsClient) &&
            newTraySensor.id64 === this.topStore.getTopState().mapSensors[newTraySensor.id].id64) {
            // this is an error condition. Probably a server error.
            console.error('Tray sensor received with same id and id64 as existing map sensor.  Ignoring!', traySensorReceivedAsClient.id, traySensorReceivedAsClient);
            return;
        }
        if (this.deviceInTray(sensorConfigMsg.id)) {
            updateType = UpdateType.UPDATE;
            let existingTraySensor: GUISensorClient = cloneDeep(this.topStore.getTopState().trayDevices[newTraySensor.id]);
            newTraySensor = this.updateConfigReadOnlyFields(traySensorReceivedAsClient, existingTraySensor) as GUISensorClient;
            newTraySensor.unheard = false;
        } else {
            // ADD case:
            // If Tray Sensor is uRadar, and haven't yet warned user, warn user
            if (sensorConfigMsg.hwType === GUISensorType.RAD && ! this.gaveURadWarning) {
                console.warn('onTraySensorReceived(): received a uRad Sensor');
                this.topStore.showModal(ModalType.TWO_BUTTON, 'Sensor ' + sensorConfigMsg.id + 
                    ' is microRadar. SensConfig does not yet support configuration of microRadar Sensors. To configure Sensor ' + 
                    sensorConfigMsg.id + 
                    ', you will need to use TrafficDot2 instead.  Do you want to continue with SensConfig?', 
                    ['Yes', 'No'], [this.topStore.dismissModal, this.explainTD2]);
                this.gaveURadWarning = true;
            }
        }
        // we in effect just push the new sensor onto state.trayDevices
        const actionGroup: ActionGroup = {
            actions: [{
                objectId: newTraySensor.id,
                objectType: ObjectType.TRAY_SENSOR,
                newData: newTraySensor,
                updateType: updateType
            }],
            description: "add or update Tray Sensor"
        };
        this.topStore.enact(actionGroup);
    }

    private explainTD2(): void {
        //window.location.href = "/logout.html";
        const node: ReactNode = this.topStore.renderTD2InfoNode();
        this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'You can download TrafficDot2 on your local computer. Download TrafficDot2 from:', ['Cancel'], undefined, node);
    }

    private onTrayRepeaterReceived(repeaterConfigMsg: GUIRepeater) {
        let updateType: UpdateType = UpdateType.ADD as UpdateType;
        let clonedRepeaterMsg = {...cloneDeep(repeaterConfigMsg)};
        delete clonedRepeaterMsg['downStreamChannel'];

        let trayRepeaterReceivedAsClient: GUIRepeaterClient = {
            ...clonedRepeaterMsg,
            knownDownstreamChannel: repeaterConfigMsg.downstreamChannel,
            desiredDownstreamChannel: repeaterConfigMsg.downstreamChannel.toString(),
            knownUpstreamChannel: repeaterConfigMsg.upstreamChannel,
            desiredUpstreamChannel: repeaterConfigMsg.upstreamChannel.toString(),
            id: WebSocketManager.toDotId(repeaterConfigMsg.id),
            color: 'palegoldenrod',
            unheard: false,
            seen: true,
            voltage: -1,
            configured: false,
        };
        // @ts-ignore
        delete trayRepeaterReceivedAsClient['upstreamChannel'];

        let newTrayRepeater: GUIRepeaterClient = trayRepeaterReceivedAsClient;
        if (this.isOnMap(trayRepeaterReceivedAsClient) &&
            newTrayRepeater.id64 === this.topStore.getTopState().mapRepeaters[newTrayRepeater.id].id64) {
            // this is an error condition. Probably a server error.
            console.error('Tray repeater received with same id and id64 as existing map repeater.  Ignoring!', trayRepeaterReceivedAsClient.id, trayRepeaterReceivedAsClient);
            return;
        }
        if (this.deviceInTray(repeaterConfigMsg.id)) {
            updateType = UpdateType.UPDATE;
            let exisitingTrayRepeater: GUIRepeaterClient = cloneDeep(this.topStore.getTopState().trayDevices[clonedRepeaterMsg.id]);
            newTrayRepeater = this.updateConfigReadOnlyFields(trayRepeaterReceivedAsClient, exisitingTrayRepeater) as GUIRepeaterClient;
            newTrayRepeater.unheard = false
        }
        
        const actionGroup: ActionGroup = {
            actions: [{
                objectId: newTrayRepeater.id,
                objectType: ObjectType.TRAY_REPEATER,
                newData: newTrayRepeater,
                updateType: updateType
            }],
            description: "add or update Tray Repeater"
        };
        this.topStore.enact(actionGroup);
    }

    /**
     * @param timeStr has format, e.g.: "2021.03.30.00.30.34.BST"
     */
    private onTimeReceived(timeStr: string): void {
        const actionGroup: ActionGroup = {
            actions: [{
                objectId: "timeData",
                objectType: ObjectType.AP_TIME_UPDATE,
                newData: timeStr,
                updateType: UpdateType.UPDATE,
            }],
            description: "update ap time"
        };
        this.topStore.enact(actionGroup);

        // We use receipt of GUITime as a pong from server,
        // and check periodically to make sure we are getting ponged,
        // else we believe connection to websocket from server is down.
        // TODO: may want to make checkTimeIntervalMillis dependent on a server Property.
        this.lastGuiTimeReceived = new Date().getTime();
        setTimeout(this.checkLastGuiTime, this.checkTimeIntervalMillis);
    }

    private checkLastGuiTime(): void {
        if (this.topStore.getTopState().downloadInProgress) {
            // we disable server connectivity time checks during download,
            // because client may be too busy handling download to process GUITime msgs from server.
            console.debug('checkLastGuiTime(): downloadInProgress, so not checking.');
            return;
        }
        const now:number = new Date().getTime();
        const timeSinceLastGuiTime:number = now - this.lastGuiTimeReceived;
        if (timeSinceLastGuiTime > this.checkTimeTimeoutThresholdMillis) {
            // have not received a new GUITime in too long!
            // Presumably connection is down or way too slow.
            console.error('checkLastGuiTime(): have not received a GUITime in > ' +
                this.checkTimeTimeoutThresholdMillis + 'ms.  Closing the websocket.');
            if (this.webSocket !== null) {
                this.webSocket.close(4234, 'client timeout waiting for GUITime');
                this.announceAndTryToReconnect(false, true);
            } else {
                console.error('checkLastGuiTime(): websocket is null');
            }
        }
    }

    private onPingScanStatusReceived(pingScanMsg: GUIPingScanStatus): void {
        let actions: Array<Action> = [{
            objectId: "pingScanStatus",
            objectType: ObjectType.PING_SCAN_STATUS,
            newData: pingScanMsg,
            updateType: UpdateType.UPDATE,
        }];

        const actionGroup: ActionGroup = {
            actions: actions,
            description: "update ping scan status"
        };
        this.topStore.enact(actionGroup);
    }

    private onMapSensorReceived(sensorConfigMsg: GUISensor) {
        let updateType: UpdateType = UpdateType.ADD;
        let description: string = 'add Map Sensor';
        let mapSensorReceivedAsClient: GUISensorClient = {
            ...sensorConfigMsg,
            detect: false,
            id: WebSocketManager.toDotId(sensorConfigMsg.id),
            color: 'palegoldenrod',
            unheard: false,
            seen: true,
            firmware: -1,
            voltage: -1,
            configured: true,
        };
        let newMapSensor: GUISensorClient = mapSensorReceivedAsClient;
        let removeFromTray: boolean = false;
        this.normalizeDstIds(newMapSensor);

        // update RF link if it has location MAP_AUTO
        this.updateRfLink(newMapSensor);

        if (this.isOnMap(newMapSensor) && ! this.topStore.state.awaitingSaveResult) {
            // Do not want to overwrite mapSensor object in case user has made changes since last save.
            // If we are awaitingSaveResult, it is safe to update, as have already transmitted user's changes.
            console.warn('onMapSensorReceived(): GUISensor received for existing sensor:', newMapSensor.id, 'treating as update');
            updateType = UpdateType.UPDATE;
            description = 'update Map Sensor'
            let exisitingMapSensor: GUISensorClient = cloneDeep(this.topStore.getTopState().mapSensors[newMapSensor.id]);
            newMapSensor = this.updateConfigReadOnlyFields(mapSensorReceivedAsClient, exisitingMapSensor) as GUISensorClient;
            newMapSensor.unheard = false;
        }
        if (this.isInTray(newMapSensor)) {
            // this could happen after a ClearConfig.
            // Remove from Tray!
            console.warn('receiving a map sensor but device is in tray already. remove from tray. id=', newMapSensor.id);
            removeFromTray = true;
        }

        let actions: Action[] = removeFromTray ? [{
            objectId: newMapSensor.id,
            objectType: ObjectType.TRAY_SENSOR,
            newData: null,
            updateType: UpdateType.DELETE
        }] : [];
        actions.push({
            objectId: newMapSensor.id,
            objectType: ObjectType.MAP_SENSOR,
            newData: newMapSensor,
            updateType: updateType
        });
        const actionGroup: ActionGroup = {
            actions: actions,
            description: description
        };
        const afterMapSensorPosted = () => {
            this.afterMapSensorPosted(newMapSensor.id);
        }
        this.topStore.enact(actionGroup, afterMapSensorPosted);
    }

    private onRepeaterStatusReceived(repeaterStatusMsg: GUIRepeaterStatus): void {
        let statusDotid: string = WebSocketManager.toDotId(repeaterStatusMsg.id);
        let affectedRepeater: GUIRepeaterClient | null = null;
        const topState:TopStoreState = this.topStore.getTopState();
        let objectType: ObjectType | null = null;
        if (statusDotid in topState.mapRepeaters) {
            affectedRepeater = cloneDeep(topState.mapRepeaters[statusDotid]);
            objectType = ObjectType.MAP_REPEATER
        } else if (statusDotid in topState.trayDevices) {
            affectedRepeater = cloneDeep(topState.trayDevices[statusDotid]) as GUIRepeaterClient;
            objectType = ObjectType.TRAY_REPEATER;
        }
        if (affectedRepeater === null || objectType === null) {
            console.error('onRepeaterStatusReceived(): cannot match RepeaterStatus to existing Repeater. dotid=', statusDotid);
            return;
        }

        // finally: the actual update
        // general principle: we only update fields that user cannot change;
        // otherwise we might clobber user changes! (similar to updateConfigReadOnlyFields())
        if (repeaterStatusMsg.status !== StatusStatus.DELETE) {
            affectedRepeater.seen = repeaterStatusMsg.seen;
            affectedRepeater.rssi = (repeaterStatusMsg.rssi === 0 ? undefined : repeaterStatusMsg.rssi);
            affectedRepeater.knownDownstreamChannel = "" + repeaterStatusMsg.downChan;
            affectedRepeater.color = "" + repeaterStatusMsg.colorCode;
            affectedRepeater.hwVersion = getSNHardwareTypeKey(repeaterStatusMsg.hwType);
            affectedRepeater.swVersion = repeaterStatusMsg.firmware;
            affectedRepeater.fwVer = repeaterStatusMsg.fwVer;
            affectedRepeater.voltage = repeaterStatusMsg.voltage;
            affectedRepeater.knownUpstreamChannel = repeaterStatusMsg.upChan;
            affectedRepeater.dualAntenna = repeaterStatusMsg.isFlexRepeater;
        } else {
            // DELETE case
            affectedRepeater.rssi = undefined;
        }
        let updateType: UpdateType = UpdateType.UPDATE;
        let description: string = '';

        if (repeaterStatusMsg.status === StatusStatus.DELETE) {
            if (objectType === ObjectType.TRAY_REPEATER) {
                if (this.isReplacementDevice(statusDotid, ObjectType.TRAY_REPEATER)) {
                    // for a tray device that is being used as a replacement, we DO remove from tray.
                    affectedRepeater = null;
                    updateType = UpdateType.DELETE;
                    description = 'delete Tray Repeater--using as replacement';
                } else {
                    // according to Max, Robert says we never delete Tray devices.
                    affectedRepeater.unheard = true;
                    affectedRepeater.rssi = undefined;
                    updateType = UpdateType.UPDATE;
                    description = 'update Tray Repeater to unheard';
                }
            } else if (objectType === ObjectType.MAP_REPEATER) {
                affectedRepeater.unheard = true;
                description = 'Update Map Repeater to Unheard;'
            }
        } else if (repeaterStatusMsg.status === StatusStatus.UPDATE ||
                   repeaterStatusMsg.status === StatusStatus.NEW) {
            affectedRepeater.unheard = false;
            updateType = UpdateType.UPDATE;
            description = 'Update Repeater with status';
        } else {
            console.error('unexpected status: ', repeaterStatusMsg.status);
            // do nothing
            return;
        }

        const actionGroup: ActionGroup = {
            actions: [{
                objectId: statusDotid,
                objectType: objectType,
                newData: affectedRepeater,
                updateType: updateType,
            }],
            description: description,
        };
        this.topStore.enact(actionGroup);
    }

    private onCCStatusReceived(ccStatusMsg: GUICCStatus) {
        let statusDotid: string = ccStatusMsg.id;
        const topState:TopStoreState = this.topStore.getTopState();

        if (statusDotid in topState.ccCards) {
            let updateType: UpdateType = UpdateType.UPDATE

            if (ccStatusMsg.status === StatusStatus.DELETE) {
                updateType = UpdateType.DELETE;
            }

            const actionGroup: ActionGroup = {
                actions: [{
                    objectId: statusDotid,
                    objectType: ObjectType.CCCARD,
                    newData: topState.ccCards[statusDotid],
                    updateType: updateType,
                }],
                description: "update ccCard with status"
            };
            this.topStore.enact(actionGroup);

        }
        else {
            console.error('onCCStatusReceived(): cannot match ccCardStatus to existing ccCard. dotid=', statusDotid);
            return;
        }
    }

    private onRadioStatusReceived(radioStatusMsg: GUIRadioStatus) {
        let statusDotid: string = WebSocketManager.toDotId(radioStatusMsg.id);
        const topState:TopStoreState = this.topStore.getTopState();

        if (statusDotid in topState.radios) {
            let updateType: UpdateType = UpdateType.UPDATE;
            let newRadioData: Partial<GUIRadioClient> | null;
            let description: string;

            if (radioStatusMsg.status === StatusStatus.DELETE) {
                updateType = UpdateType.DELETE;
                newRadioData = null;
                description = "server delete of Radio";
            } else if (radioStatusMsg.status === StatusStatus.NEW ||
                       radioStatusMsg.status === StatusStatus.UPDATE) {
                newRadioData = {
                    knownChannel: WebSocketManager.channelIntToString(radioStatusMsg.channel),
                    colorCode: radioStatusMsg.colorCode,
                    timeslot: radioStatusMsg.timeslot,
                    apConnection: radioStatusMsg.apConnection,
                    firmware: radioStatusMsg.firmware,
                };
                description = "update Radio from server status";
            } else {
                console.error('unexpected radio status: ', radioStatusMsg.status);
                // do nothing
                return;
            }

            const actionGroup: ActionGroup = {
                actions: [{
                    objectId: statusDotid,
                    objectType: ObjectType.RADIO,
                    newData: newRadioData,
                    updateType: updateType,
                }],
                description: description,
            };
            this.topStore.enact(actionGroup);

        } else {
            console.error('onRadioStatusReceived(): cannot match RadioStatus to existing Radio. dotid=', statusDotid);
            return;
        }
    }

    private onSZStatusReceived(sensorZoneStatusMsg: GUISensorZoneStatus) {
        console.debug('onSensorZoneStatus(): sensorZoneStatusMsg=', sensorZoneStatusMsg);
        switch (sensorZoneStatusMsg.status) {
            case StatusStatus.UPDATE:
                console.debug('onSensorZoneStatusReceived(): UPDATE: doing nothing');
                break;
            case StatusStatus.DELETE:
                // TODO: do we need to implement unheard here?
                const actionGroup: ActionGroup = {
                    actions: [{
                        objectId: sensorZoneStatusMsg.id,
                        objectType: ObjectType.SENSOR_ZONE,
                        newData: null,
                        updateType: UpdateType.DELETE,
                    }],
                    description: "delete SensorZone. server initiated."
                };
                this.topStore.enact(actionGroup);
                break;
            case StatusStatus.NEW:
                console.warn('unexpected status: ' + sensorZoneStatusMsg.status + '. doing nothing');
                break;
            default:
                console.error('unexpected status: ' + sensorZoneStatusMsg.status);
                break;
        }
    }

    private onSensorStatusReceived(sensorStatusMsg: GUISensorStatus): void {
        let statusDotid: string = WebSocketManager.toDotId(sensorStatusMsg.id);
        let affectedSensor: GUISensorClient | null = null;
        const topState:TopStoreState = this.topStore.getTopState();
        let objectType: ObjectType | null = null;
        let updateType: UpdateType = UpdateType.UPDATE;
        if (statusDotid in topState.mapSensors) {
            affectedSensor = cloneDeep(topState.mapSensors[statusDotid]);
            objectType = ObjectType.MAP_SENSOR
        } else if (statusDotid in topState.trayDevices) {
            affectedSensor = cloneDeep(topState.trayDevices[statusDotid]) as GUISensorClient;
            objectType = ObjectType.TRAY_SENSOR;
        }
        if (affectedSensor === null || objectType === null) {
            console.info('onSensorStatusReceived(): cannot match SensorStatus to existing Sensor. dotid=', statusDotid);
            return;
        }

        // finally: the actual update.
        // general principle: we only update fields that user cannot change;
        // otherwise we might clobber user changes!
        if (sensorStatusMsg.status !== StatusStatus.DELETE) {
            affectedSensor.detect = sensorStatusMsg.detect;
            affectedSensor.rssi = (sensorStatusMsg.rssi === 0 ? undefined : sensorStatusMsg.rssi);
            affectedSensor.firmware = sensorStatusMsg.firmware;
            affectedSensor.fwVer = sensorStatusMsg.fwVer;
            affectedSensor.voltage = sensorStatusMsg.voltage;
            affectedSensor.seen = sensorStatusMsg.seen;
        } else {
            affectedSensor.rssi = undefined;
        }
        let description: string = '';
        if (sensorStatusMsg.status === StatusStatus.DELETE) {
            if (objectType === ObjectType.TRAY_SENSOR) {
                if (this.isReplacementDevice(statusDotid, ObjectType.TRAY_SENSOR)) {
                    // for a tray device that is being used as a replacement, we DO remove from tray.
                    affectedSensor = null;
                    updateType = UpdateType.DELETE;
                    description = 'delete Tray Sensor--using as replacement';
                } else {
                    // according to Max, Robert says we never delete Tray devices.
                    affectedSensor.unheard = true;
                    affectedSensor.rssi = undefined;
                    updateType = UpdateType.UPDATE;
                    description = 'update Tray Sensor to unheard';
                }
            } else if (objectType === ObjectType.MAP_SENSOR) {
                // we update unheard value, but do not ever delete map sensor
                affectedSensor.unheard = true;
                affectedSensor.rssi = undefined;
                updateType = UpdateType.UPDATE;
                description = 'update Map Sensor to unheard';
            } else {
                console.error('unexpecterd objectType: ', objectType);
            }
        } else if (sensorStatusMsg.status === StatusStatus.UPDATE ||
                   sensorStatusMsg.status === StatusStatus.NEW) {
            affectedSensor.unheard = false;
            updateType = UpdateType.UPDATE;
            description = "update Sensor with status";
        } else {
            console.error('unexpected status: ', sensorStatusMsg.status);
            // do nothing
            return;
        }

        const actionGroup: ActionGroup = {
            actions: [{
                objectId: statusDotid,
                objectType: objectType,
                newData: affectedSensor,
                updateType: updateType,
            }],
            description: description,
        };
        this.topStore.enact(actionGroup);
    }

    /**
     *  For the device, modifies the dstId for each rfLink and ccLink to be uppercase.
     *  Note: it modifies the data in the parameter
     */
    private normalizeDstIds(device: Mappable): void {
        if (device.info.rfLink !== undefined) {
            device.info.rfLink.dstId = WebSocketManager.toDotId(device.info.rfLink.dstId);
        }
        for (let ccLink of device.info.ccLinks) {
            if (ccLink.dstId !== undefined) {
                ccLink.dstId = WebSocketManager.toDotId(ccLink.dstId);
            }
        }
    }

    private onMapRepeaterReceived(repeaterConfigMsg: GUIRepeater) {
        let updateType: UpdateType = UpdateType.ADD as UpdateType;
        let removeFromTray: boolean = false;
        let clonedRepeaterMsg: GUIRepeater = {...cloneDeep(repeaterConfigMsg)};
        delete clonedRepeaterMsg['downstreamChannel'];
        let mapRepeaterReceivedAsClient: GUIRepeaterClient = {
            ...clonedRepeaterMsg,
            knownDownstreamChannel: repeaterConfigMsg.downstreamChannel.toString(),
            desiredDownstreamChannel: repeaterConfigMsg.downstreamChannel.toString(),
            knownUpstreamChannel: repeaterConfigMsg.upstreamChannel,
            desiredUpstreamChannel: repeaterConfigMsg.upstreamChannel.toString(),
            id: WebSocketManager.toDotId(repeaterConfigMsg.id),
            color: 'palegoldenrod',
            unheard: false,
            seen: true,
            voltage: -1,
            configured: true,
        };
        // @ts-ignore
        delete mapRepeaterReceivedAsClient['upstreamChannel'];

        let newMapRepeater: GUIRepeaterClient = mapRepeaterReceivedAsClient;
        this.normalizeDstIds(newMapRepeater);
        if (newMapRepeater.info.location === Location.MAP_AUTO) {
            // set an arbitrary initial map position
            const nRepeaters = Object.keys(this.topStore.getTopState().mapRepeaters).length;
            newMapRepeater.info.position.x = 1024 + nRepeaters * 70;
            newMapRepeater.info.position.y = 1039;
            newMapRepeater.info.location = Location.MAP;
        }

        // update RF link if it has location MAP_AUTO
        this.updateRfLink(newMapRepeater);

        if (this.isOnMap(newMapRepeater)) {
            // Do not want to overwrite mapRepeater object in case user has made changes since last save.
            console.warn('onMapRepeaterReceived(): GUIRepeater received for existing Repeater:', newMapRepeater.id, 'updating');
            updateType = UpdateType.UPDATE;
            let existingMapRepeater: GUIRepeaterClient = cloneDeep(this.topStore.getTopState().mapRepeaters[newMapRepeater.id]);
            newMapRepeater = this.updateConfigReadOnlyFields(mapRepeaterReceivedAsClient, existingMapRepeater) as GUIRepeaterClient;
            newMapRepeater.unheard = false;
        }
        if (this.isInTray(newMapRepeater)) {
            // this could happen after a ClearConfig.
            // Remove from Tray!
            console.warn('receiving a map repeater but device is in tray. remove from tray. id=', newMapRepeater.id);
            removeFromTray = true;
        }

        let actions: Action[] = removeFromTray ? [{
            objectId: newMapRepeater.id,
            objectType: ObjectType.TRAY_REPEATER,
            newData: null,
            updateType: UpdateType.DELETE,
        }] : [];
        actions.push({
            objectId: newMapRepeater.id,
            objectType: ObjectType.MAP_REPEATER,
            newData: newMapRepeater,
            updateType: updateType
        });

        const actionGroup: ActionGroup = {
            actions: actions,
            description: "add or replace Map Repeater"
        };
        this.topStore.enact(actionGroup);

        // possibly update other mapRepeaters, if any has rfLink with MAP_AUTO,
        // because we can't expect all links will be resolved in order.
        Object.values(this.topStore.getTopState().mapRepeaters).forEach((mapRepeater:GUIRepeaterClient)=>{
            const repeaterId:string = mapRepeater.id;
            if (repeaterId !== newMapRepeater.id && mapRepeater.info.rfLink !== undefined &&
                mapRepeater.info.rfLink.location === Location.MAP_AUTO) {

                const clonedRepeater = cloneDeep(mapRepeater);
                this.updateRfLink(clonedRepeater);
                if (clonedRepeater.info.rfLink.location === Location.MAP) {
                    // this update needs posting to TopStore
                    this.topStore.enact({actions: [{
                                objectId: clonedRepeater.id,
                                objectType: ObjectType.MAP_REPEATER,
                                newData: clonedRepeater,
                                updateType: UpdateType.UPDATE,
                            }],
                        description: 'update Map Repeater rfLink'
                    });
                }
            }
        });
    }

    /**
     * If mapDevice's rfLink has location MAP_AUTO, update its lines and
     * change location to MAP
     * TODO: this may now be redundant with other methods e.g. MapAndTray.updateLinksOnDevice()
     */
    private updateRfLink(mapDevice: GUIRepeaterClient|GUISensorClient) {
        if (mapDevice.info.rfLink !== undefined) {
            if (mapDevice.info.rfLink.location === Location.MAP_AUTO ||
                // note: 2nd condition should not happen, but just in case...
                mapDevice.info.location === Location.MAP_AUTO ||
                // note: following should not happen but it seems to...
                mapDevice.info.rfLink.lines.length === 1 &&
                mapDevice.info.rfLink.lines[0].aPoint.x === 0 &&
                mapDevice.info.rfLink.lines[0].aPoint.y === 0
            ) {
                const dstId: string = mapDevice.info.rfLink.dstId;
                let bPoint: GUIPoint;
                if (dstId === 'SPP0' || dstId === 'SPP1') {
                    bPoint = this.topStore.getTopState().radios[dstId].info.position;
                } else {
                    const parentRepeater = this.topStore.getTopState().mapRepeaters[dstId];
                    if (parentRepeater !== undefined) {
                        bPoint = parentRepeater.info.position;
                    } else {
                        // perhaps parentRepeater has not arrived yet...
                        console.warn('updateRfLink(): unexpected lack of mapRepeater info for ', dstId);
                        bPoint = {x: 0, y: 0};
                    }
                }
                mapDevice.info.rfLink.lines = [{
                    aPoint: mapDevice.info.position,
                    bPoint: bPoint,
                }];
                if (bPoint.x !== 0 || bPoint.y !== 0) {
                    mapDevice.info.rfLink.location = Location.MAP;
                }
                console.debug('updateRfLink(): at end, mapDevice=', mapDevice);
            }
        }
    }

    private onGUITechSupportReceived(data: ServerMessage) {
        let techSupport = data as GUITechSupport;
        let updateType: UpdateType = UpdateType.ADD as UpdateType;

        const newSelected: Selected = {
            selected: null,
            selectedG: null,
            selectedDeviceType: ObjectType.TECH_SUPPORT,
            selectedDotid: null,
            selectedSzId: ''
        };
        const actionGroup: ActionGroup = {
            actions: [
                {
                    objectId: '',
                    objectType: ObjectType.TECH_SUPPORT,
                    newData: techSupport,
                    updateType: updateType
                },
                {
                    objectId: '',
                    objectType: ObjectType.SELECTED,
                    newData: newSelected,
                    updateType: UpdateType.UPDATE
                }
            ],
            description: "add or replace Tech Support data"
        };
        this.topStore.enact(actionGroup);
    }

    /**
     * Produces a canonical client-side dotid.
     * Server-provided dotid string may lack enough leading zeroes.
     * E.g. for id='1a5' this method returns '01A5'.
     * @return a 4 character hex numeric string (0 padded on left if needed), all uppercase
     * @param id a hex numeric string
     */
    static toDotId(id: string):string {
        let dotid: string = id;
        while (dotid.length < 4) {
            dotid = '0' + dotid;
        }
        return dotid.toUpperCase();
    }

    /**
     * convert Server-formatted GUIRepeater to client-format GUIRepeaterClient
     * for easier manipulation within client code
     *
    static toRepeaterClient(repeater: GUIRepeater): GUIRepeaterClient {
        let repeaterClient: GUIRepeaterClient = {
            ...repeater,
            knownDownstreamChannel: repeater.downstreamChannel.toString(),
            desiredDownstreamChannel: repeater.downstreamChannel.toString(),
            voltage: -1,
        };
        return repeaterClient;
    }
    */

    static channelIntToString(channelInt: number):string {
         switch (channelInt) {
            case -1: return 'AUTO';
            case 0: return '0';
            case 1: return '1';
            case 2: return '2';
            case 3: return '3';
            case 4: return '4';
            case 5: return '5';
            case 6: return '6';
            case 7: return '7';
            case 8: return '8';
            case 9: return '9';
            case 10: return '10';
            case 11: return '11';
            case 12: return '12';
            case 13: return '13';
            case 14: return '14';
            case 15: return '15';
            default:
                console.error('unexpected channel value: ', channelInt);
                return 'AUTO';
        }
        /* TODO: I think this seemingly faster way does not work for -2 index
                 So could remove channelStringByInt constant.
        const channelString = AptdApp.channelStringByInt[channelInt];
        if (channelString === null || channelString === undefined) {
            throw new Error('unexpected channel int: ' + channelInt);
        }
        return channelString;
         */
    }

    deviceInTray(dotid: string): boolean {
        const topState:TopStoreState = this.topStore.getTopState();
        let inTray:boolean = false;
        if (topState.trayDevices[dotid] !== null && topState.trayDevices[dotid] !== undefined) {
            inTray = true;
        }
        return inTray;
    }

    private toGUISZClient(serverSz: GUIStopbarSensorZone): GUISZClient {
        let sensitivity: number = serverSz.stopbarSensitivity;
        if (sensitivity === -1) {
            sensitivity = AptdApp.DEFAULT_SENSITIVITY;
        }
        let szClient:GUISZClient = {
            sensorIds: [serverSz.sensorId],
            spacingsMm: [],
            lengthCorrectionsMm: [],
            info: cloneDeep(serverSz.info),
            //desc: serverSz.desc,
            id: serverSz.id,
            name: serverSz.name,
            otype: serverSz.otype,
            stopbarSensitivity: sensitivity,
            unheard: false
        };
        return szClient;
    }

    public static readonly FOUR_CHANNEL_NUMBERS: ChannelNumber[] =
        [ChannelNumber.CH_1, ChannelNumber.CH_2, ChannelNumber.CH_3, ChannelNumber.CH_4];
    public static readonly TWO_CHANNEL_NUMBERS: ChannelNumber[] =
        [ChannelNumber.CH_1, ChannelNumber.CH_2];
    public static readonly validChannelNums: Set<ChannelNumber> =
        new Set(WebSocketManager.FOUR_CHANNEL_NUMBERS);

    private toGUICCCardClient(ccCard: GUICCInterfaceBase): GUICCInterfaceBaseClient {
        let ccCardCopy = cloneDeep(ccCard);
        let channelHash: {[channelNumber: string]: GUICCChannel} = {};
        let channels: GUICCChannel[];
        let channelNumbers: ChannelNumber[] = [];
        switch (ccCard.otype) {
            case 'GUICCCard':
                // case of EX or CC card.
                channels = ccCardCopy.ccChannels;
                if (channels.length !== 4 && channels.length !== 2) {
                    console.error('toGUICCCardClient(): invalid channels.length=',
                                  channels.length, channels);
                }
                for (let channel of channels) {
                    if (WebSocketManager.validChannelNums.has(channel.channelNumber as ChannelNumber)) {
                        channelHash[channel.id] = channel;
                        if (channel.sensors === undefined) {
                            channel.sensors = [];
                        }
                        channelNumbers.push(channel.channelNumber as ChannelNumber);
                    } else {
                        console.error('toGUICCCardClient(): invalid channelNumber: ', channel.channelNumber);
                    }
                }
                delete ccCardCopy.ccChannels;
                channelNumbers.sort();
                // an EX card can have 4 (typical) or 2 (older cards?) channels
                if (! WebSocketManager.isEqualArrays(channelNumbers, WebSocketManager.FOUR_CHANNEL_NUMBERS) &&
                    ! WebSocketManager.isEqualArrays(channelNumbers, WebSocketManager.TWO_CHANNEL_NUMBERS)) {
                    console.error('toGUICCCardClient(): invalid channelNumbers: ', channelNumbers);
                }
                const result:GUICCCardClient = {...ccCardCopy, channelsById: channelHash};
                return result;

            case 'GUICCAPGI':
                let resultApgi: GUICCAPGIClient;
                channels = ccCardCopy.ccChannels;
                for (let channel of channels) {
                    const clientChannel = channel;
                    channelHash[clientChannel.id] = clientChannel;
                    if (clientChannel.sensors === undefined) {
                        clientChannel.sensors = [];
                    }
                }
                delete ccCardCopy.ccChannels;
                resultApgi = {...ccCardCopy, channelsById: channelHash, cardInterface: Interface.APGI};
                return resultApgi;

            case 'GUICCSTS':
                let resultSts: GUICCSTSClient;
                channels = ccCardCopy.ccChannels;
                for (let channel of channels) {
                    let channel_id = channel.id;
                    const clientChannelId = WebSocketManager.toStsClientChannel(channel_id);
                    channel.id = clientChannelId;
                    //Keep server channel_id to match with ccLink dst_id
                    channelHash[channel_id] = channel;
                    if (channel.sensors === undefined) {
                        channel.sensors = [];
                    }
                }
                delete ccCardCopy.ccChannels;

                let addrMap: {[addr: string]: string} = (ccCardCopy as GUICCSTS).addrMap;
                let clientAddrMap:{[addr: string]: string} = {};
                for (let addr of Object.keys(addrMap)) {
                    const clientAddr: string = addr.replace('ADDR_', 'IP');
                    clientAddrMap[clientAddr] = addrMap[addr];
                }
                ccCardCopy.addrMap = clientAddrMap;

                resultSts = {...ccCardCopy, channelsById: channelHash, cardInterface: Interface.STS};
                return resultSts;

            case 'GUICCSDLC':
                let resultSDLC: GUISDLCClient;
                channels = ccCardCopy.channels;
                let banks: Set<number> = new Set<number>();
                for (let channel of channels) {
                    const bankNo: number = this.getBankNo(channel.id);
                    banks.add(bankNo);
                }
                for (let channel of channels) {
                    channelHash[channel.id] = channel;
                    if (channel.sensors === undefined) {
                        channel.sensors = [];
                    }
                }
                delete ccCardCopy.channels;
                resultSDLC = {
                    ...ccCardCopy,
                    channelsById: channelHash,
                    cardInterface: Interface.SDLC,
                    banks: Array.from(banks.values()).sort(),
                };
                return resultSDLC;

            default:
                throw new Error('toGUICCCardClient(): unexpected otype: ' + ccCard.otype);
        }
    }

    /** converts, e.g. 'B1-C15' to 1 */
    public getBankNo(channelId:string):number {
        const bankNo:number = +channelId.substr(1, 1);
        return bankNo;
    }

    private speed2SZToGUISZClient(sz: GUISpeed2SensorZone): GUISZClient {
        let spacingMm: string = sz.mmSpacing.toString();
        let lengthCorrectionMm: string = sz.mmLengthCorrection.toString();

        let szClient:GUISZClient = {
            sensorIds: [sz.leadSensorId, sz.trailSensorId],
            spacingsMm: [spacingMm],
            lengthCorrectionsMm: [lengthCorrectionMm],
            info: cloneDeep(sz.info),
            //desc: sz.desc,
            id: sz.id,
            name: sz.name,
            otype: sz.otype,
            unheard: false
        };
        return szClient;
    }

    private speed3SZToGUISZClient(sz: GUISpeed3SensorZone): GUISZClient {
        let spacingsMm: string[] = [sz.mmLeadMidSpacing.toString(), sz.mmMidTrailSpacing.toString()];
        let lengthCorrectionsMm: string[] = [sz.mmLeadMidLengthCorrection.toString(), sz.mmMidTrailLengthCorrection.toString()];

        let szClient:GUISZClient = {
            sensorIds: [sz.leadSensorId, sz.midSensorId, sz.trailSensorId],
            spacingsMm: spacingsMm,
            lengthCorrectionsMm: lengthCorrectionsMm,
            info: cloneDeep(sz.info),
            //desc: sz.desc,
            id: sz.id,
            name: sz.name,
            otype: sz.otype,
            unheard: false
        };
        return szClient;
    }

    /** @returns existing configured sz id, if there is one, or "" if not */
    private getConfiguredSzId(configMsg: GUISZClient): string {
        const topState:TopStoreState = this.topStore.getTopState();
        const configured:boolean = configMsg.id in topState.sensorZones;
        let configuredSzId:string|undefined = undefined;
        if (! configured) {
            // Double check names in case sz-id was client-assigned
            // This is to handle the case where Server has renamed a client-assigned name (after save)
            for (let sensorZone of Object.values(topState.sensorZones)) {
                if (sensorZone.id.startsWith('clientSz') && sensorZone.name === configMsg.name) {
                    configuredSzId = sensorZone.id;
                    break;
                }
            }
            if (configuredSzId === undefined) {
                configuredSzId = '';
            }
        } else {
            configuredSzId = configMsg.id;
        }
        console.debug('getConfigredSzId(): configMsg.id=', configMsg.id, 'returning configuredSzId:', configuredSzId);
        return configuredSzId;
    }

    /**
     * General principle: we only update fields that user cannot change;
     * Otherwise we might clobber user changes!
     *
     * Similar code exists for all GUI*Status messages, but not in a single method.
     *
     * It is unclear if in practice this code is ever used.
     * I think updated config msgs are sent after user SAVE succeeds.
     */
    private updateConfigReadOnlyFields(newData: GUIAPConfigClient|GUIRadioClient|GUISensorClient|GUIRepeaterClient,
                                       topStoreData: GUIAPConfigClient|GUIRadioClient|GUISensorClient|GUIRepeaterClient) {

        let type = newData.otype
        if (type !== topStoreData.otype) {
            return topStoreData;
        }
        switch (newData.otype) {
            case 'GUIAPConfig':
                let apUpdatedConfig: GUIAPConfigClient = topStoreData as GUIAPConfigClient;
                let apNewConfig: GUIAPConfigClient = newData as GUIAPConfigClient;
                apUpdatedConfig.serialNumber = apNewConfig.serialNumber;
                apUpdatedConfig.apFirmwareVersion = apNewConfig.apFirmwareVersion;
                apUpdatedConfig.apHardwareVersion = apNewConfig.apHardwareVersion;
                apUpdatedConfig.ethMode = apNewConfig.ethMode;
                apUpdatedConfig.hostname = apNewConfig.hostname;
                apUpdatedConfig.ntpOption = apNewConfig.ntpOption;
                apUpdatedConfig.networkSecurity = apNewConfig.networkSecurity;
                apUpdatedConfig.licenseCapabilities = apNewConfig.licenseCapabilities;
                apUpdatedConfig.transmitInterval = apNewConfig.transmitInterval;
                apUpdatedConfig.maxReportLatency = apNewConfig.maxReportLatency;
                apUpdatedConfig.watchdog = apNewConfig.watchdog;
                apUpdatedConfig.extraLatency = apNewConfig.extraLatency;
                apUpdatedConfig.eventQueue = apNewConfig.eventQueue;
                apUpdatedConfig.onsetFilter = apNewConfig.onsetFilter;
                apUpdatedConfig.detectZ = apNewConfig.detectZ;
                apUpdatedConfig.undetectZ = apNewConfig.undetectZ;
                apUpdatedConfig.undetectX = apNewConfig.undetectX;
                apUpdatedConfig.holdover = apNewConfig.holdover;
                apUpdatedConfig.swapXY = apNewConfig.swapXY;
                apUpdatedConfig.syncReportingOption = apNewConfig.syncReportingOption;
                apUpdatedConfig.tempReportingOption = apNewConfig.tempReportingOption;
                apUpdatedConfig.retransmitRSSILQIOption = apNewConfig.retransmitRSSILQIOption;
                apUpdatedConfig.rewritePacketOption = apNewConfig.rewritePacketOption;
                apUpdatedConfig.doubleRepeaterTimeslotOption = apNewConfig.doubleRepeaterTimeslotOption;
                apUpdatedConfig.globalSync = apNewConfig.globalSync;
                apUpdatedConfig.polarity = apNewConfig.polarity;
                apUpdatedConfig.msCCFixedLatency = apNewConfig.msCCFixedLatency;
                apUpdatedConfig.rssiHigh = apNewConfig.rssiHigh;
                apUpdatedConfig.rssiMed = apNewConfig.rssiMed;
                apUpdatedConfig.rssiLow = apNewConfig.rssiLow;
                apUpdatedConfig.rssiAlert = apNewConfig.rssiAlert;
                apUpdatedConfig.colorCode = apNewConfig.colorCode;
                return apUpdatedConfig;
            case 'GUIRadio':
                let radioUpdatedConfig: GUIRadioClient = topStoreData as GUIRadioClient;
                let radioNewConfig: GUIRadioClient = newData as GUIRadioClient;
                radioUpdatedConfig.id64 = radioNewConfig.id64;
                radioUpdatedConfig.id = radioNewConfig.id;
                radioUpdatedConfig.apConnection = radioNewConfig.apConnection;
                radioUpdatedConfig.colorCode = radioNewConfig.colorCode;
                radioUpdatedConfig.firmware = radioNewConfig.firmware;
                radioUpdatedConfig.hardwareVersion = radioNewConfig.hardwareVersion;
                radioUpdatedConfig.knownChannel = radioNewConfig.knownChannel;
                radioUpdatedConfig.rssi = radioNewConfig.rssi;
                radioUpdatedConfig.otype = radioNewConfig.otype;
                return radioUpdatedConfig;
            case 'GUIRepeater':
                let repeaterUpdatedConfig: GUIRepeaterClient = topStoreData as GUIRepeaterClient;
                let repeaterNewConfig: GUIRepeaterClient = newData as GUIRepeaterClient;
                repeaterUpdatedConfig.id64 = repeaterNewConfig.id64;
                repeaterUpdatedConfig.id = repeaterNewConfig.id;
                repeaterUpdatedConfig.hwVersion = repeaterNewConfig.hwVersion;
                repeaterUpdatedConfig.swVersion = repeaterNewConfig.swVersion;
                repeaterUpdatedConfig.knownUpstreamChannel = repeaterNewConfig.knownUpstreamChannel;
                repeaterUpdatedConfig.dualAntenna = repeaterNewConfig.dualAntenna;
                repeaterUpdatedConfig.configured = (repeaterNewConfig.info.location === Location.MAP ||
                                                    repeaterNewConfig.info.location === Location.MAP_AUTO);
                return repeaterUpdatedConfig;
            case 'GUISensor':
                let sensorUpdatedConfig: GUISensorClient = topStoreData as GUISensorClient;
                let sensorNewConfig: GUISensorClient = newData as GUISensorClient;
                sensorUpdatedConfig.id64 = sensorNewConfig.id64;
                sensorUpdatedConfig.id = sensorNewConfig.id;
                sensorUpdatedConfig.enabled = sensorNewConfig.enabled;
                sensorUpdatedConfig.hwType = sensorNewConfig.hwType;
                sensorUpdatedConfig.app = sensorNewConfig.app;
                sensorUpdatedConfig.channel = sensorNewConfig.channel;
                sensorUpdatedConfig.configured = (sensorNewConfig.info.location === Location.MAP ||
                                                  sensorNewConfig.info.location === Location.MAP_AUTO);
                return sensorUpdatedConfig;
            default:
                throw new Error('unexpected config type: ' + type);
        }   
    }

    /**
     * @returns true if there is an object already in TopStore, on the Map, and of same type and id as configMsg, 
     */
    private isOnMap(configMsg: GUIRadioClient|GUISensorClient|GUIRepeaterClient|GUICCInterfaceBaseClient): boolean {
        const topState:TopStoreState = this.topStore.getTopState();
        let configured:boolean = false;
        switch (configMsg.otype) {
            case 'GUIRadio':
                configured = configMsg.id in topState.radios;
                break;
            case 'GUISensor':
                configured = configMsg.id in topState.mapSensors;
                break;
            case 'GUIRepeater':
                configured = configMsg.id in topState.mapRepeaters;
                break;
            case 'GUICCCard':
            case 'GUICCSDLC':
            case 'GUICCAPGI':
            case 'GUICCSTS':
                configured = configMsg.id in topState.ccCards;
                break;
            default:
                throw new Error('unexpected configMsg type: ' + configMsg.otype);
        }
        return configured;
    }

    private isInTray(newMapDevice: GUISensorClient|GUIRepeaterClient):boolean {
        return (newMapDevice.id in this.topStore.getTopState().trayDevices);
    }

    public startPingScan(): void {
        let startPingScanMsg: Object = {
            otype: 'GUIStartPingScan',
        };
        // fake initial response, to initialize UI and reassure user
        let status0: GUIPingScanStatus = {
            percentComplete: 0,
            noCancel: false,
            maxPingScanSecs: 300,
            otype: 'GUIPingScanStatus',
        };
        const startPingScanMsgString:string = JSON.stringify(startPingScanMsg);
        if (this.webSocket !== null && this.webSocket.readyState === this.webSocket.OPEN) {
            console.debug('about to send GUIStartPingScan');
            this.clearIgnorePingScanStatus();
            this.webSocket.send(startPingScanMsgString);
            // max suggests we don't show a dialog here.
            //this.topStore.presentModal(ModalType.SUCCESS, 'SensConfig is scanning for devices.  Please wait for completion, or hit "Stop Scan"');
            this.onPingScanStatusReceived(status0);
        } else {
            console.error('Closed or null webSocket');
            this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'Ping scan could not be started. Connection to Gateway not open');
        }
    }

    public stopPingScan(): void {
        let stopPingScanMsg:Object = {
            otype: 'GUICancelPingScan'
        };
        // fake status msg
        let status100: GUIPingScanStatus = {
            percentComplete: 100,
            noCancel: false,
            maxPingScanSecs: 300,
            otype: 'GUIPingScanStatus',
        };
        const stopPingScanMsgString:string = JSON.stringify(stopPingScanMsg);
        if (this.webSocket !== null && this.webSocket.readyState === this.webSocket.OPEN) {
            console.debug('about to send GUICancelPingScan');
            this.webSocket.send(stopPingScanMsgString);
            // fake an immediate acknowledgment from server, so as to reassure user
            this.onPingScanStatusReceived(status100);
            // set a flag to ignore further real status msgs, but only for 30 seconds.
            // This is a compromise between desire for good experience for clicking user,
            // and desire that it work right for mutliple clients.
            this.setIgnorePingScanStatus();
            setTimeout(this.clearIgnorePingScanStatus, 30000);
        } else {
            console.error('Closed or null webSocket');
            this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'There was a problem stopping ping scan. Connection to Gateway not open');
        }
    }

    private setIgnorePingScanStatus():void {
        const actionGroup: ActionGroup = {
            actions: [{
                objectId: "",
                objectType: ObjectType.IGNORE_PING_SCAN_STATUS,
                newData: true,
                updateType: UpdateType.UPDATE,
            }],
            description: "ignore ping scan status",
        };
        this.topStore.enact(actionGroup);
    }
    private clearIgnorePingScanStatus():void {
        const actionGroup: ActionGroup = {
            actions: [{
                objectId: "",
                objectType: ObjectType.IGNORE_PING_SCAN_STATUS,
                newData: false,
                updateType: UpdateType.UPDATE,
            }],
            description: "don't ignore ping scan status",
        };
        this.topStore.enact(actionGroup);
    }

    public getTechSupportData(): void {
        let getTechSupportMsg:Object = {otype: 'GUITechSupport'};
        getTechSupportMsg = {...getTechSupportMsg,
            op: 'GET'
        };
        const getTechSupportMsgString:string = JSON.stringify(getTechSupportMsg);
        if (this.webSocket !== null && this.webSocket.readyState === this.webSocket.OPEN) {
            this.webSocket.send(getTechSupportMsgString);
            console.info("sent get tech support msg: ", getTechSupportMsg);
            console.debug("sent get tech support msg: ", getTechSupportMsgString);
        } else {
            console.error('Closed or null webSocket');
            this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'There was a problem getting tech support data. Connection is no longer open')
        }
    }

    public sendGUIActiveMsg(): void {
        const activeMsg: GUIActive = {
            otype: 'GUIActive',
        };
        const activeMsgString: string = JSON.stringify(activeMsg);
        if (this.webSocket !== null && this.webSocket.readyState === this.webSocket.OPEN) {
            const now:number = new Date().getTime();
            this.topStore.enact({
                actions: [{
                    objectType: ObjectType.LAST_GUI_ACTIVE_TIME,
                    objectId: '',
                    updateType: UpdateType.UPDATE,
                    newData: now,
                    origData: null,
                }],
                description: 'set lastGuiActive time',
            })
            console.info('sendGUIActiveMsg(): about to send', activeMsg);
            this.webSocket.send(activeMsgString);
        } else {
            console.warn('sendGUIActiveMsg(): Closed or null webSocket');
        }
    }

    public sendClientDisconnectMsg(): void {
        const disconnectMsg: GUIClientDisconnect = {
            otype: 'GUIClientDisconnect',
        };
        const disconnectMsgString: string = JSON.stringify(disconnectMsg);
        if (this.webSocket !== null && this.webSocket.readyState === this.webSocket.OPEN) {
            console.info('sendClientDisconnectMsg(): about to send', disconnectMsg);
            // Server will do close upon receipt of GUIClientDisconnect,
            // but it is not necessary for client to react to close.
            // We want to avoid
            // a distracting msg to client that connection is lost.
            // User already knows that since user asked to close.
            // And nice cleanup is unneeded because client window about to unload.
            this.webSocket.onclose = (() => null);
            this.webSocket.send(disconnectMsgString);
        } else {
            console.error('sendClientDisconnectMsg(): Closed or null webSocket');
        }
    }


    /**
     * When user presses the SAVE button, prepare and send to APTD Server a Save msg.
     * The Save msg consists of items from TopStore, some of which may need
     * reformatting to conform to Server's GUI* formats.
     */
    public sendSaveMsg(): void {
        const topState:TopStoreState = this.topStore.getTopState();
        const saveMsg:GUISaveConfig = {
            otype: 'SaveConfig',
            ap: this.toServerAP(topState.ap, topState.mapSettings),
            radios: this.toServerRadios(topState.radios),
            sensors: this.toServerSensors(topState.mapSensors),
            sensorZones: this.toServerSensorZones(topState.sensorZones),
            repeaters: this.toServerRepeaters(topState.mapRepeaters),
            ccCards: this.toServerCCCards(topState.ccCards),
        };
        const saveMsgString:string = JSON.stringify(saveMsg);
        if (this.webSocket !== null && this.webSocket.readyState === this.webSocket.OPEN) {
            this.webSocket.send(saveMsgString);
            this.topStore.dismissAnyModal(ModalClass.SAVING);
            // this.topStore.showModal(ModalType.NO_OK, 'SensConfig is saving your changes to the AP.');
            // per Max, we don't show a msg so user can see what is
            // happening 'underneath' the input blocker.
            this.topStore.showModal(ModalType.NO_MSG, '', [], [],
                undefined, ModalClass.SAVING);
            this.thisUserInitiatedSave = true;
            console.info("sent SaveConfig msg: ", saveMsg);
            console.debug("sent SaveConfig msg: ", saveMsgString);

            // set SAVE_PERCENT_COMPLETE to 0 in TopStore
            const actionGroup: ActionGroup = {
                actions: [{
                    objectId: "",
                    objectType: ObjectType.SAVE_PERCENT_COMPLETE,
                    newData: 0,
                    updateType: UpdateType.UPDATE,
                }],
                description: "update save percent complete"
            };
            this.topStore.enact(actionGroup);
        } else {
            console.error('Closed or null webSocket');
            this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'There was a problem during save. Connection is no longer open');
        }
    }

    public sendTechSupportSavePropsMsg(): void {
        const topState:TopStoreState = this.topStore.getTopState();
        let saveMsg:GUITechSupport = cloneDeep(topState.techSupport);
        saveMsg.op = "SET_PROPS"
        const saveMsgString:string = JSON.stringify(saveMsg);
        if (this.webSocket !== null && this.webSocket.readyState === this.webSocket.OPEN) {
            this.webSocket.send(saveMsgString);
            console.info("sent SaveTechSupportProps msg: ", saveMsg);
            console.debug("sent SaveTechSupportProps msg: ", saveMsgString);
        } else {
            console.error('Closed or null webSocket');
            this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'There was a problem during save. Connection is no longer open')
        }
    }

    public sendTechSupportSaveLoggersMsg(): void {
        const topState:TopStoreState = this.topStore.getTopState();
        let saveMsg:GUITechSupport = cloneDeep(topState.techSupport);
        saveMsg.op = "SET_LOG_LEVELS"
        const saveMsgString:string = JSON.stringify(saveMsg);
        if (this.webSocket !== null && this.webSocket.readyState === this.webSocket.OPEN) {
            this.webSocket.send(saveMsgString);
            console.info("sent SaveTechSupport msg: ", saveMsg);
            console.debug("sent SaveTechSupport msg: ", saveMsgString);
        } else {
            console.error('Closed or null webSocket');
            this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'There was a problem during save. Connection is no longer open')
        }
    }

    public sendRebootMsg(): void {
        let rebootMsg: GUIReboot = {otype: 'GUIReboot'};
        const rebootMsgString: string = JSON.stringify(rebootMsg);
        if (this.webSocket !== null && this.webSocket.readyState === this.webSocket.OPEN) {
            this.webSocket.send(rebootMsgString);
            console.info("sent Reboot msg: ");
            console.debug("sent Reboot msg: ", rebootMsgString);
        } else {
            console.error('Closed or null webSocket');
            this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'There was a problem during reboot. Connection is no longer open')
        }
    }

    public sendResetMsg(): void {
        let resetMsg: ResetConfig = {otype: 'ResetConfig'};
        const resetMsgString: string = JSON.stringify(resetMsg);
        if(this.webSocket !== null && this.webSocket.readyState === this.webSocket.OPEN) {
            this.webSocket.send(resetMsgString);
            console.info("sent Reset msg");
            console.debug("sent Reset msg: ", resetMsgString);
        } else {
            console.error('Close or null webSocket');
            this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'There was a problem during reset. Connection is no longer open')
        }
    }

    public sendReplaceSensorMsg(replaceSensor:GUIReplaceSensor) {
        const replaceSensorString: string = JSON.stringify(replaceSensor);
        if (this.webSocket !== null && this.webSocket.readyState === this.webSocket.OPEN) {
            this.webSocket.send(replaceSensorString);
            console.info("sent GUIReplaceSensor msg: ");
            console.debug("sent GUIReplaceSensor msg: ", replaceSensor);
        } else {
            console.error('Closed or null webSocket');
            this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'There was a problem during Replace Sensor. Connection is no longer open')
        }
    }

    public sendSyncNTPMsg(): void {
        let syncMsg:GUISyncNTP = { otype: 'GUISyncNTP'};
        const syncMsgString:string = JSON.stringify(syncMsg);
        if (this.webSocket !== null &&
            this.webSocket !== undefined &&
            this.webSocket.readyState === this.webSocket.OPEN) {
            this.webSocket.send(syncMsgString);
            console.info("sent sync ntp msg: ");
            console.debug("sent sync ntp msg: ", syncMsgString);
        } else {
            console.error('Closed or null webSocket');
            this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'There was a problem sending sync message. Connection is no longer open')
        }
    }

    public sendIdentifyCard(ccId: string): void {
        let identifyCardMsg: GUICCCardIdentify = {otype: 'GUICCCardIdentify', idCC: ccId};
        const identifyCardMsgString: string = JSON.stringify(identifyCardMsg);
        if (this.webSocket !== null && this.webSocket.readyState === this.webSocket.OPEN) {
            this.webSocket.send(identifyCardMsgString);
            console.info("sent identify card msg: ");
            console.debug("sent identify card msg: ", identifyCardMsgString);
        } else {
            console.error('Closed or null webSocket');
            this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'There was a problem during reboot. Connection is no longer open')
        }
    }

    /** This msg is sent after user completes the Initial Modal dialog -- 1st time use only */
    public sendSaveInitConfig(): void {
        const topState:TopStoreState = this.topStore.getTopState();
        const mapImagesManager: MapImagesManager|null = this.aptdApp.state.mapImagesManager;
        if (mapImagesManager === null) {
            console.debug('null mapImagesManager. cannot save');
            return;
        }
        if (topState.ap !== null) {
            const ap:GUIAPConfigClient = cloneDeep(topState.ap);

            if (this.topStore.getTopState().awaitingLoginValidation === true) {
                // for some reason, we have not received needed login validation,
                // so make sure requireLogin is disabled.
                console.info('saveInitConfig(): awaitingLoginValidation, so back out requireLogin.');
                this.backoutRequireLogin();
                ap.requireLogin = RequireLogin.DISABLED;
            }

            const currentMapDatum: MapDatum|null|undefined = mapImagesManager.getCurrentMapDatum();
            const currentLabel: string =
                (currentMapDatum !== null && currentMapDatum !== undefined ?
                 currentMapDatum.label : mapImagesManager.defaultLabel);

            const saveMsg: SaveInitConfig = {
                otype: "SaveInitConfig",
                units: ap.units,
                timeZone: ap.timeZone,
                mapImage: currentLabel,
                requireLogin: ap.requireLogin,
            };

            const saveMsgString:string = JSON.stringify(saveMsg);
            if (this.webSocket !== null && this.webSocket.readyState === this.webSocket.OPEN) {
                this.webSocket.send(saveMsgString);
                console.info("sent SaveInitConfig msg: ", saveMsg);
                console.debug("sent SaveInitConfig msg: ", saveMsgString);
            } else {
                console.error('Closed or null webSocket');
                this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'There was a problem during save. Connection is no longer open');
            }

            let updatedAP: GUIAPConfigClient = ap;
            updatedAP.initialized = true;
            updatedAP.mapImage = currentLabel;
            updatedAP.requireLoginStateSaved = (updatedAP.requireLogin === RequireLogin.ENABLED) ? true : false;
            const actionGroup: ActionGroup = {
                actions: [{
                    objectId: 'AP',
                    objectType: ObjectType.AP,
                    newData: updatedAP,
                    updateType: UpdateType.UPDATE,
                }],
                description: 'setting AP after initialized',
            };
            this.topStore.enact(actionGroup);
        } else {
            console.error('Null ap');
            this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'There was a problem saving the initial config');
        }
        this.undoManager.clearDoneStack();
     }

    public sendConfirmFirmwareUpdateMsg(): void {
        const confirmMsg:GUIFirmwareUpdateConfirm = {otype: 'GUIFirmwareUpdateConfirm'};
        const confirmMsgString:string = JSON.stringify(confirmMsg);
        if (this.webSocket !== null && this.webSocket.readyState === this.webSocket.OPEN) {
            this.webSocket.send(confirmMsgString);
            console.info("sent confirm firmware update msg: ");
            console.debug("sent confirm firmware update msg: ", confirmMsgString);
        } else {
            console.error('Closed or null webSocket');
            this.topStore.showModal(ModalType.ONE_BUTTON_ERROR,
                'There was a problem confirming firmware upgrade. Connection is no longer open');
        }
    }

    public sendCancelFirmwareUpdateMsg(): void {
        const cancelMsg:GUIFirmwareUpdateCancel = {otype: 'GUIFirmwareUpdateCancel'};
        const cancelMsgString:string = JSON.stringify(cancelMsg);
        if (this.webSocket !== null && this.webSocket.readyState === this.webSocket.OPEN) {
            this.webSocket.send(cancelMsgString);
            console.info("sent cancel firmware update msg: ");
            console.debug("sent cancel firmware update msg: ", cancelMsgString);
        } else {
            console.error('Closed or null webSocket');
            this.topStore.showModal(ModalType.ONE_BUTTON_ERROR,
                'There was a problem cancelling firmware upgrade. Connection to Gateway not open');
        }
    }

    private toServerRadios(radios: {[p: string]: GUIRadioClient}): Array<GUIRadio> {
        let result:Array<GUIRadio> = [];
        for (let radio of Object.values(radios)) {
            result.push(this.toServerRadio(radio));
        }
        return result;
    }

    /** converts GUIRadioClient to server's GUIRadio */
    private toServerRadio(radio: GUIRadioClient): GUIRadio {
        const info: MapRenderInfo = cloneDeep(radio.info);
        // TODO: would be better to do the rounding earlier, but at least need it here for server,
        //       which is expecting ints.
        info.position = {
            x: Math.round(radio.info.position.x),
            y: Math.round(radio.info.position.y),
        };
        let serverRadio: GUIRadio = {
            id: radio.id,
            id64: radio.id64,
            apConnection: radio.apConnection,
            channel: (radio.channelMode === ChannelMode.AUTO ?
                     +radio.knownChannel : +radio.desiredChannel) as GUIChannel,
            channelMode: radio.channelMode,
            colorCode: radio.colorCode,
            info: info,
            firmwareVersion: radio.firmware !== undefined ? radio.firmware : -1,
            hardwareVersion: radio.hardwareVersion,
            otype: 'GUIRadio',
            unheard: false
        };
        return serverRadio;
    }

    /**
     * Calculates the desired upstream channel for a Repeater,
     * which is both displayed to user in Info Panel and also returned to server
     * in a SaveConfig msg.
     * @ereturns desiredUpstreamChannel, which will be either the rf parent's desired channel,
     *           if it's manual, or the rf parent's known channel, if rf parent's desired channel
     *           is AUTO.
     */
    public static calcDesiredUpstreamChannel(repeaterModel:GUIRepeaterClient, topStore:TopStore):string {
        let dstId: string | undefined;
        let rfParent: GUIRadioClient | GUIRepeaterClient | undefined;
        if (repeaterModel.info.rfLink === undefined) {
            // This is the case for TRAY repeater, or MAP repeater that is not
            // yet linked to a rf parent.
            if (repeaterModel.knownUpstreamChannel === undefined) {
                return '';
            }
            return repeaterModel.knownUpstreamChannel.toString();
        } else {
            dstId = repeaterModel.info.rfLink.dstId;
            if (dstId === 'SPP0' || dstId === 'SPP1') {
                // parent is Radio
                rfParent = topStore.getTopState().radios[dstId];
                return (rfParent.channelMode === ChannelMode.AUTO ?
                    rfParent.knownChannel : rfParent.desiredChannel);
            } else {
                // parent is Repeater
                rfParent = topStore.getTopState().mapRepeaters[dstId];
                return (rfParent.channelMode === ChannelMode.AUTO ?
                    rfParent.knownDownstreamChannel : rfParent.desiredDownstreamChannel);
            }
        }
    }

    private toServerRepeater(clientRepeater: GUIRepeaterClient): GUIRepeater {
        let repeaterCopy: GUIRepeaterClient = cloneDeep(clientRepeater);
        delete repeaterCopy.desiredDownstreamChannel;
        delete repeaterCopy.knownDownstreamChannel;
        delete repeaterCopy.desiredUpstreamChannel;
        delete repeaterCopy.knownUpstreamChannel;

        const info: MapRenderInfo = repeaterCopy.info;
        // TODO: would be better to do the rounding earlier, but at least need it here for server,
        //       which is expecting ints.
        info.position = {
            x: Math.round(clientRepeater.info.position.x),
            y: Math.round(clientRepeater.info.position.y),
        };

        const desiredUpstreamChannel:string =
            WebSocketManager.calcDesiredUpstreamChannel(clientRepeater, this.topStore);

        let serverRepeater: GUIRepeater = {
            ...repeaterCopy,
            downstreamChannel: (clientRepeater.channelMode === ChannelMode.AUTO ?
                +clientRepeater.knownDownstreamChannel : +clientRepeater.desiredDownstreamChannel) as GUIChannel,
            upstreamChannel: (isNaN(+desiredUpstreamChannel) ? -1 : +desiredUpstreamChannel) as GUIChannel,
        };
        return serverRepeater;
    }

    private toServerRepeaters(clientRepeaters: {[id: string]: GUIRepeaterClient}): Array<GUIRepeater> {
        let repeatersServer: Array<GUIRepeater> = [];
        for (let repeaterClient of Object.values(clientRepeaters)) {
            repeatersServer.push(this.toServerRepeater(repeaterClient));
        }
        return repeatersServer;
    }

    private toServerSensors(clientSensors: {[id: string]: GUISensorClient}): GUISensor[] {
        let sensorsForServer: GUISensor[] = [];
        let usingAPGICCCard = (this.topStore.getTopState().ccCards['APGI'] !== null && this.topStore.getTopState().ccCards['APGI'] !== undefined); 
        for (const sensorClient of Object.values(clientSensors)) {
            sensorsForServer.push(this.toServerSensor(sensorClient, usingAPGICCCard));
        }
        return sensorsForServer;
    }

    private toServerSensor(sensorClient: GUISensorClient, usingAPGICCCard: boolean): GUISensor {
        let sensorCopy: GUISensorClient = cloneDeep(sensorClient);
        delete sensorCopy.detect;
        delete sensorCopy.selected;
        delete sensorCopy.color;
        delete sensorCopy.busyStatus;
        delete sensorCopy.uploading;
        delete sensorCopy.percentComplete;
        if (sensorCopy.hwType === undefined || sensorCopy.hwType === null) {
            sensorCopy.hwType = GUISensorType.UNKNOWN;
        }

        const info: MapRenderInfo = sensorCopy.info;
        // TODO: would be better to do the rounding earlier, but at least need it here for server,
        //       which is expecting ints.
        info.position = {
            x: Math.round(sensorClient.info.position.x),
            y: Math.round(sensorClient.info.position.y),
        };

        let sensorForServer: GUISensor = {
            ...sensorCopy,
        };
        return sensorForServer;
    }

    private toServerCC(cc: GUICCInterfaceBaseClient): GUICCInterfaceBase {
        let ccCopy = cloneDeep(cc);
        delete ccCopy.channelsById;
        let ccChannels: GUICCChannelBase[] = [];
        for (let clientChannel of Object.values(cc.channelsById)) {
            let serverChannel = cloneDeep(clientChannel);
            if (cc.cardInterface === Interface.STS) {
                serverChannel.id = WebSocketManager.toSimpleStsChannelId(serverChannel.id);
            }
            ccChannels.push(serverChannel);
        }
        let serverCC: GUICCInterfaceBase;
        switch (cc.cardInterface) {
            case Interface.SDLC:
                delete ccCopy.banks;
                serverCC = {
                    ...ccCopy,
                    channels: ccChannels,
                };
                break;
            case Interface.CCCard:
            case Interface.EXCard:
                serverCC = {
                    ...ccCopy,
                    ccChannels: ccChannels,
                };
                break;
            case Interface.APGI:
                serverCC = {
                    ...ccCopy,
                    ccChannels: ccChannels,
                };
                break;
            case Interface.STS:
                const ccSts = cc as GUICCSTSClient;
                serverCC = {
                    ...ccCopy,
                    ccChannels: ccChannels,
                    addrMap: WebSocketManager.toServerAddrMap(ccSts.addrMap),
                };
                break;
            default:
                throw new Error('unexpected channel otype: ' + cc.otype);
        }
        return serverCC;
    }

    private toServerCCCards(ccCards: {[id: string]: GUICCInterfaceBaseClient}): Array<GUICCInterfaceBase> {
        let ccsServer: Array<GUICCInterfaceBase> = [];
        for (let ccClient of Object.values(ccCards)) {
            ccsServer.push(this.toServerCC(ccClient));
        }
        return ccsServer;
    }

    private toServerSensorZones(sensorZones: {[p: string]: GUISZClient}): Array<GUISensorZone> {
        let serverSZs: Array<GUISensorZone> = [];
        for (let sz of Object.values(sensorZones)) {
            serverSZs.push(this.toServerSZ(sz));
        }
        return serverSZs;
    }

    /** if id is client-assigned, change to none. */
    private toServerSZ(clientSz: GUISZClient): GUISensorZone {
        let szid: string = clientSz.id;
        if (szid.startsWith('clientSz')) {
            // id is client-assigned
            szid = '-1';
        }
        let serverSZ: GUISensorZone = {
            id: szid,
            name: clientSz.name,
            //desc: clientSz.desc,
            otype: clientSz.otype,
            info: clientSz.info,
            unheard: false
        };
        switch (clientSz.otype) {
            case "GUIStopbarSensorZone":
            case "GUICountSensorZone":
                let serverSZStopbar = serverSZ as GUIStopbarSensorZone;
                serverSZStopbar.sensorId = clientSz.sensorIds[0];
                if (clientSz.otype === "GUIStopbarSensorZone") {
                    if (clientSz.stopbarSensitivity === undefined) {
                        serverSZStopbar.stopbarSensitivity = AptdApp.DEFAULT_SENSITIVITY;
                    } else {
                        serverSZStopbar.stopbarSensitivity = clientSz.stopbarSensitivity;
                    }
                }
                break;
            case "GUISpeed2SensorZone":
                let serverSZSpeed2 = serverSZ as GUISpeed2SensorZone;
                serverSZSpeed2.leadSensorId = clientSz.sensorIds[0];
                serverSZSpeed2.trailSensorId = clientSz.sensorIds[1];
                serverSZSpeed2.mmSpacing = +clientSz.spacingsMm[0];
                serverSZSpeed2.mmLengthCorrection = +clientSz.lengthCorrectionsMm[0];
                break;
            case "GUISpeed3SensorZone":
                let serverSZSpeed3 = serverSZ as GUISpeed3SensorZone;
                serverSZSpeed3.leadSensorId = clientSz.sensorIds[0];
                serverSZSpeed3.midSensorId = clientSz.sensorIds[1];
                serverSZSpeed3.trailSensorId = clientSz.sensorIds[2];
                serverSZSpeed3.mmLeadMidSpacing = +clientSz.spacingsMm[0];
                serverSZSpeed3.mmLeadMidLengthCorrection = +clientSz.lengthCorrectionsMm[0];
                serverSZSpeed3.mmMidTrailSpacing = +clientSz.spacingsMm[1];
                serverSZSpeed3.mmMidTrailLengthCorrection = +clientSz.lengthCorrectionsMm[1];
                break;
        }
        return serverSZ;
    }

    /** @returns inches as a float value with 2 decimal places.
     *           If mm param string canot be converted to number or is blank, return original mm param string */
    public static mmToInches(mm: string): string {
        if (mm === '') {
            return mm;
        }
        const mmN: number = +mm;
        if (isNaN(mmN)) {
            return mm;
        }
        return ((mmN / 25.4).toFixed(1));
    }

    /** @returns mm as an integer value.
     *           If inches param string canot be converted to number or is blank, return original inches param string */
    public static inchesToMm(inches: string): string {
        if (inches === '') {
            return inches;
        }
        const inchesN: number = +inches;
        if (isNaN(inchesN)) {
            return inches;
        }
        return (inchesN * 25.4).toFixed(0);
    }

    /**
     * @return a string containing a 2 hex digit color code
     * @param colorCodeHiNibbleManual assumed to be a string of length 1
     * @param colorCodeLoNibbleManual assumed to be a string of length 1
     */
    private static toColorCode(colorCodeHiNibbleManual: string, colorCodeLoNibbleManual: string): string {
        return colorCodeHiNibbleManual + colorCodeLoNibbleManual;
    }

    /** return a copy of the addrMap param, with the keys changed from e.g. 'IP3' to 'ADDR_3' */
    private static toServerAddrMap(addrMap: { [ip: string]: string }): {[addr: string]: string} {
        let serverAddrMap: {[addr: string]: string} = {};
        for (let ip of Object.keys(addrMap)) {
            const ipAsAddr: string = ip.replace('IP', 'ADDR_');
            serverAddrMap[ipAsAddr] = addrMap[ip];
        }
        return serverAddrMap;
    }

    /** converts STS channel id of form, e.g. "IP3-G254-C31" to "3-254-31" */
    private static toSimpleStsChannelId(channelId: string): string {
        return channelId.replace(/IP/, '')
            .replace(/G/, '-')
            .replace(/C/, '-');
    }

    private static toStsClientChannel(channelId: string): string {
        const channelIdParts: string[] = channelId.split('-');
        return 'IP' + channelIdParts[0] +
            'G' + channelIdParts[1] +
            'C' + channelIdParts[2];
    }

    public sendValidateCredentialsMsg(): void {
        const topState: TopStoreState = this.topStore.getTopState();
        const validateCredentialsMsg: GUIValidCredentials = {
            otype: 'GUIValidCredentials',
            username: topState.userid,
            password: topState.password,
        };
        const validateCredentialsMsgString: string = JSON.stringify(validateCredentialsMsg);
        if (this.webSocket !== null &&
            this.webSocket.readyState === this.webSocket.OPEN) {

            this.webSocket.send(validateCredentialsMsgString);
            console.info('sent ValidCredentials msg', validateCredentialsMsg);

            // turn on awaitingLoginValidation
            this.topStore.enact({
                description: 'Awaiting Login Validation',
                actions: [{
                    updateType: UpdateType.UPDATE,
                    objectType: ObjectType.AWAITING_LOGIN_VALIDATION,
                    objectId: '',
                    newData: true,
                    origData: false,
                }],
            });
            // action continues in onCredentialsValidityReceived()

        } else {
            console.error('Closed or null webSocket');
            // need to back out Require Login, since cannot validate credentials
            this.backoutRequireLogin();

            this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'There was a problem during credentials validation. Connection is no longer open');
        }
    }

    /** back out Require Login, since cannot validate credentials */
    private backoutRequireLogin() {
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
        this.topStore.enact(turnOffRequireLogin);
        // also need to pop UndoManager.doneStack, removing setting of requireLogin
        this.aptdApp.popRequireLoginFromDoneStack(this.topStore.undoManager);
    }

    /** this method is called when server replies with validity of credentials, whether valid or not! */
    private onCredentialsValidityReceived(data: ServerMessage): void {
        const credentials: GUIValidCredentials = data as GUIValidCredentials;
        console.info('GUIValidCredentials: valid=', credentials.valid);
        if (credentials.valid === undefined) {
            console.error('credentials.valid is undefined');
            return;
        }
        const actionGroup: ActionGroup = {
            actions: [{
                objectType: ObjectType.AP,
                objectId: 'AP',
                newData: {requireLogin: credentials.valid ? RequireLogin.ENABLED : RequireLogin.DISABLED},
                updateType: UpdateType.UPDATE,
            }, {
                objectType: ObjectType.AWAITING_LOGIN_VALIDATION,
                objectId: '',
                newData: false,
                updateType: UpdateType.UPDATE,
            }],
            description: 'update requireLogin based on credentials',
        };
        this.topStore.enact(actionGroup);
        this.topStore.dismissModal(ModalClass.VALIDATE_CREDENTIALS);
        if (! credentials.valid) {
            this.aptdApp.popRequireLoginFromDoneStack(this.undoManager);
            this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'The userid and password are not valid. You must present valid userid and password to require login', ['OK'], [() => this.topStore.dismissModal(ModalClass.VALIDATE_CREDENTIALS)], undefined, ModalClass.VALIDATE_CREDENTIALS);
        } else {
            if (this.topStore.getTopState().ap !== null && ! this.topStore.getTopState().ap!.initialized){
            	//Save is not required in this case, login credentials will be in effect after user presses Next
                this.topStore.showModal(ModalType.ONE_BUTTON_SUCCESS, 'The userid and password are correct. Login with those credentials will be required to use SensConfig.', ['OK'], [() => this.topStore.dismissModal(ModalClass.VALIDATE_CREDENTIALS)], undefined, ModalClass.VALIDATE_CREDENTIALS);
            }
            else {
                this.topStore.showModal(ModalType.ONE_BUTTON_SUCCESS, 'The userid and password are correct. After Save, login with those credentials will be required to use SensConfig.', ['OK'], [() => this.topStore.dismissModal(ModalClass.VALIDATE_CREDENTIALS)], undefined, ModalClass.VALIDATE_CREDENTIALS);
            }
        }
    }

    private onSessionTimeoutReceived(data: ServerMessage): void {
        console.info('onSessionTimeoutReceived(): serverTimedOut is true');
        this.serverTimedOut = true;
    }

    /**
     *  Sent by Server when WebSocket is established if the client's session is invalid.
     *  The AuthReject msg should be followed by a WebSocket disconnect that will then
     *  provoke an onClose() call
     */
    private onAuthRejectReceived(data: ServerMessage) {
        console.info('onAuthRejectReceived(): serverTimedOut is true');
        this.serverTimedOut = true;
    }

    private onStartupStateReceived(data: ServerMessage) {
        const startupStateMsg:GUIStartupState = data as GUIStartupState;
        console.info('onStartupStateReceived(): startupStateMsg=', startupStateMsg);
        switch (startupStateMsg.resolution) {
            case Resolution.READY:
                // set global flag to allow save and remove 'waiting for startup state' indicator
                this.setConfiguredDevicesResolved(true);
                break;
            case Resolution.READY_UPDATED:
                // set global flag to allow save and remove 'waiting for startup state' indicator
                this.setConfiguredDevicesResolved(true);

                let description = "An external update has changed the configuration of this Gateway.  ";
                if (this.undoManager.undoStackChangedSinceLastSave()) {
                    description += "We regret that any unsaved changes you made are now gone.  ";
                }
                description += "The Map will now show the new state of the Gateway's configuration.";
                this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, description,
                    undefined, undefined, undefined, ModalClass.EXTERNAL_UPDATE);

                // note: server will (probably) send ClearConfig next,
                // and then client will clear all config devices and tray
                break;
            case Resolution.UNSUPPORTED:
                this.announceRejectReasons(startupStateMsg.rejectReasons);
                break;
            case Resolution.UNABLE_TO_FIND_ALL_CONFIGURED_DEVICES:
                // server timed out before being able to get info on all config devices

                // set global flag to allow save and remove 'waiting for startup state' indicator
                this.setConfiguredDevicesResolved(true);

                let unseenDevicesMsg = 'SensConfig is unable to see all configured devices. ' +
                    '(Unseen devices are indicated by yellow triangles on the Map). . ' +
                    'We recommend you press the "Find Devices" button; when all devices are seen, do a Save. ' +
                    'You may need to move a device on Map slightly to enable the Save button. ';
                if (Object.keys(this.topStore.getTopState().ccCards).length > 0) {
                    // We add warning msg if this AP is associated with a Traffic Signal
                    unseenDevicesMsg += '\nNote: Clicking the "Find Devices" button will put the detection system ' +
                    'into constant call while it searches for nearby devices. ' +
                    'The search typically takes 2 minutes.';
                }
                this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, unseenDevicesMsg,
                    undefined, undefined, undefined, ModalClass.EXTERNAL_UPDATE);
                break;
            default:
                console.error('unexpected resolution: ', startupStateMsg.resolution);
                break;
        }
    }

    private onConfigComplete() {

    }

    private announceRejectReasons(reasons: Array<RejectReason>) {
        let rejectMsg: string = "";
        const prelude: string = 'Unfortunately, SensConfig does not support the configuration on this Gateway. \n';
        if (reasons.some(WebSocketManager.isHighSeverity)) {
            rejectMsg = prelude;
        }
        for (const reason of reasons) {
            switch (reason) {
                case RejectReason.GMG:
                    // \u2122 unicode for TM character
                    // \u2022 unicode for bullet
                    rejectMsg += '\u2022 SensConfig does not support GiveMeGreen! configuration. ';
                    break;
                case RejectReason.SAMS:
                    rejectMsg += '\u2022  SensConfig does not support SAMS configuration. '
                    break;
                case RejectReason.URAD_SENSOR:
                    rejectMsg += '\u2022  SensConfig does not support configurations containing micro-radar Sensors. ';
                    break;
                case RejectReason.TRANSMIT_INTERVAL:
                    rejectMsg += '\u2022  SensConfig does not support the externally configured Transmit Interval ' +
                        '(Only 0.125 is supported). ';
                    break;
                case RejectReason.UNSUPPORTED_SENSOR_ID:
                    rejectMsg += '\u2022  Configuration contains unsupported sensor id, ' +
                        'most likely a \'virtual\' sensor. ';
                    break;
                case RejectReason.UNSUPPORTED_SENSOR_ZONE:
                    rejectMsg += '\u2022  A configured Sensor Zone has a Sensor with unsupported mode. ';
                    break;
                case RejectReason.UNABLE_TO_READ_CONFIG:
                    rejectMsg += '\u2022  SensConfig encountered an internal error in reading the Gateway configuration.  ';
                    break;
                case RejectReason.SENSOR_IN_DOWNLOAD_MODE:
                    rejectMsg += '\u2022  A configured Sensor is in Download mode. Please wait 45 minutes before starting SensConfig.  ';
                    break;
                case RejectReason.INVALID_DEVICE_HARDWARE:
                    rejectMsg += '\u2022  Some device in this Gateway\'s configuration has a hardware version that is too old for SensConfig.  ';
                    break;
                case RejectReason.UNSUPPORTED_VDS_VERSION:
                    rejectMsg += '\u2022  VDS version on this Gateway is too old for SensConfig.  ';
                    break;
                case RejectReason.INCOMPATIBLE_APP_VERSIONS:
                    rejectMsg += '\u2022  C app versions on this Gateway are incompatible with SensConfig.  ';
                    break;
                case RejectReason.FOUND_CCCARDS_FLEXCONNECT:
                    rejectMsg += '\u2022 SensConfig does not support configurations with both a FlexConnect AND contact closure interface cards on the same Gateway.  ';
                    break;
                case RejectReason.CCCARD_TEMPERATURE_ALERT_ENABLED:
                    rejectMsg += '\u2022 SensConfig does not support configurations with Temperature Alerts.  ';
                    break;
                default:
                    console.error('unexpected reason:' + reason);
                    break;
            }
        }
        if (reasons.some(WebSocketManager.isHighSeverity)) {
            rejectMsg += '\nPlease use TrafficDOT2 to configure this Gateway.';
        }

        // remove any previous unsupported config msgs
        this.topStore.dismissAnyModal(ModalClass.UNSUPPORTED_CONFIG);

        if (reasons.some(WebSocketManager.isHighSeverity)) {
            // if any reject reason is high severity, disallow user from continuing
            this.topStore.showModal(ModalType.NO_OK, rejectMsg, [], [],
                undefined, ModalClass.UNSUPPORTED_CONFIG);
        } else {
            // all reject reasons are low severity. Allow user to continue.
            this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, rejectMsg, undefined, undefined,
                undefined, ModalClass.UNSUPPORTED_CONFIG);
        }
    }

    /** currently all reject reasons are high severity! So this is always true. */
    private static isHighSeverity(reason: RejectReason): boolean {
        return (WebSocketManager.severity(reason) === Severity.HIGH);
    }

    /** currently all reject reasons are high severity! So this is really not needed */
    private static severity(rejectReason:RejectReason): Severity {
        let severity:Severity;
        switch (rejectReason) {
            /*
            case RejectReason.UNABLE_TO_READ_CONFIG:
                severity = Severity.LOW;
                break;

             */
            default:
                severity = Severity.HIGH;
                break;
        }
        return severity;
    }


    private onTooManyClientsRejectReceived(data: ServerMessage):void {
        this.topStore.dismissAnyModal(ModalClass.RECONNECTING);
        this.topStore.showModal(ModalType.NO_OK,
            'Cannot connect to Gateway. Too many users are connected. Reconnecting\u2026.',
            [], [], undefined, ModalClass.RECONNECTING);
    }


    /**
     * Server sends this to tell Client to start over, as if from scratch.
     * At the least, Client will remove all configured (on-map) devices from TopStore.
     * Q: should Client also remove all Tray devices?
     * A: YES. Server will now resend all Tray devices after ClearConfig.
     * TODO: after GUIAPConfig comes in, should restore old MapSettings.
     * TODO: after map sensors with cc links with MAP_AUTO come in, compute new values.
     */
    private onClearConfig(data: ServerMessage, topState: TopStoreState) {
        /* Based on discussion with Max, we will show the Modal only for
         * GuiStartupState with Resolution.READY_UPDATED, but not here, because
         * ClearConfig might not always be sent.
         * TODO: are there cases where ClearConfig happens WITHOUT GuiStartupState msg preceding?
         *
        // in case there was already an external update msg showing, remove it
        this.topStore.dismissAnyModal(ModalClass.EXTERNAL_UPDATE);
        let description = "An external update has changed the configuration of this Gateway.  ";
        if (this.undoManager.undoStackChangedSinceLastSave()) {
            description += "We regret that any unsaved changes you made are now gone.  ";
        }
        description += "The Map will now show the new state of the Gateway's configuration.";
        this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, description,
            undefined, undefined, undefined, ModalClass.EXTERNAL_UPDATE);

         */
        if(topState.modalStack.length !== 0 && topState.modalStack[0].modalClass === 'saving') {
            this.topStore.resetConfig();
        } else {
            this.topStore.clearConfig();
        }
        this.topStore.clearTray();
        this.undoManager.clearDoneStack();
        this.undoManager.clearUndoneStack();
        // following will disable the save button until next undoable action or undo or redo
        this.undoManager.setDoneStackLengthAtLastSuccessfulSave();
    }

    private resetReplacementDeviceForAllDevices() {
        for (const mapSensor of Object.values(this.topStore.getTopState().mapSensors)) {
            if (mapSensor.replacementSensorId !== undefined &&
                mapSensor.replacementSensorId !== "") {
                this.resetReplacementDevice(mapSensor);
            }
        }
        for (const mapRepeater of Object.values(this.topStore.getTopState().mapRepeaters)) {
            if (mapRepeater.replacementRepeaterId !== undefined &&
                mapRepeater.replacementRepeaterId !== "") {
                this.resetReplacementDevice(mapRepeater);
            }
        }
    }

    /**
     * This is done if save ends abnormally, e.g. with an error status, or normally.
     * In abnormal case maybe server did not send proper ConfigChangeStatus to all
     * busy devices of the Save.  So we un-busy them.
     * It's done if save ends normally--esp for other users who may have different config on map.
     * Also done at start of save.
     */
    private resetBusyStatusForAllDevices(resetSavePctComplete: boolean = true) {
        for (const mapSensor of Object.values(this.topStore.getTopState().mapSensors)) {
            if (mapSensor.busyStatus === ConfigChangeStatus.STARTED) {
                this.resetBusyStatus(mapSensor);
            }
        }
        for (const mapRepeater of Object.values(this.topStore.getTopState().mapRepeaters)) {
            if (mapRepeater.busyStatus === ConfigChangeStatus.STARTED) {
                this.resetBusyStatus(mapRepeater);
            }
        }
        // also reset busy status on all tray devices.
        // This might apply for a user who did not initiate the save
        for (const trayDevice of Object.values(this.topStore.getTopState().trayDevices)) {
            if (trayDevice.busyStatus === ConfigChangeStatus.STARTED) {
                this.resetBusyStatus(trayDevice);
            }
        }

        if (resetSavePctComplete === true) {
            // set save complete % to null
            const actionGroup: ActionGroup = {
                actions: [{
                    objectId: "",
                    objectType: ObjectType.SAVE_PERCENT_COMPLETE,
                    newData: null,
                    updateType: UpdateType.UPDATE,
                }],
                description: "update save percent complete to null"
            };
            this.topStore.enact(actionGroup);
        }
    }

    private resetBusyStatus(mapDevice: GUISensorClient | GUIRepeaterClient) {
        let newMapDevice: GUISensorClient|GUIRepeaterClient = cloneDeep(mapDevice);
        newMapDevice.busyStatus = undefined;
        const actionGroup: ActionGroup = {
            actions: [{
                objectId: newMapDevice.id,
                objectType: newMapDevice.otype === 'GUISensor' ? ObjectType.MAP_SENSOR : ObjectType.MAP_REPEATER,
                newData: newMapDevice,
                updateType: UpdateType.UPDATE,
            }],
            description: "update Map Device to not busy status"
        };
        this.topStore.enact(actionGroup);
    }

    private resetReplacementDevice(mapDevice: GUISensorClient | GUIRepeaterClient) {
        let newMapDevice:GUISensorClient | GUIRepeaterClient;
        if (mapDevice.otype === "GUISensor") {
            newMapDevice = cloneDeep(mapDevice) as GUISensorClient;
            newMapDevice.replacementSensorId = undefined;
        } else if (mapDevice.otype === "GUIRepeater") {
            newMapDevice = cloneDeep(mapDevice) as GUIRepeaterClient;
            newMapDevice.replacementRepeaterId = undefined;
        } else {
            console.error('unexpected otype: ', mapDevice.otype);
            return;
        }
        const actionGroup: ActionGroup = {
            actions: [{
                objectId: newMapDevice.id,
                objectType: newMapDevice.otype === 'GUISensor' ? ObjectType.MAP_SENSOR : ObjectType.MAP_REPEATER,
                newData: newMapDevice,
                updateType: UpdateType.UPDATE,
            }],
            description: "update Map Device to no specified replacement device"
        };
        this.topStore.enact(actionGroup);
    }

    /**
     * If newMapSensor has location MAP_AUTO assume links need position updating,
     * need to compute the actual lines for the links,
     * and change location to MAP.
     * Modifications are done on the param newMapSensor.
     */
    private computeRFAndCCLinksPoints(newMapSensor: GUISensorClient): void {
        if (newMapSensor.info.ccLinks.length > 0) {
            for (const link of newMapSensor.info.ccLinks) {
                // compute the line from Sensor center to CC card/channel of dstId
                link.location = Location.MAP;
                link.lines = [{
                    aPoint: {x: newMapSensor.info.position.x, y: newMapSensor.info.position.y},
                    // The folowing bPoint is a dummy value. It is even OK to persist it,
                    // because
                    // MapAndTray will calculate the actual bPoint, based on location of channel.
                    // Currently that value is computed in MapAndTray.renderCCLinks()
                    // from value in MapAndTray.ccChannelPosition, but is not persisted anywhere!
                    bPoint: {x: 10, y: 10},
                }];
            }
        }
        if (newMapSensor.info.rfLink !== null && newMapSensor.info.rfLink !== undefined) {
            let dstPos = this.getParentPosition(newMapSensor.info.rfLink.dstId);
            newMapSensor.info.rfLink.lines = [{
                aPoint: {x: newMapSensor.info.position.x, y: newMapSensor.info.position.y},
                bPoint: dstPos,
            }];
        }
    }

    private getParentPosition(deviceId: string): GUIPoint {
        if (this.topStore.getTopState().mapRepeaters[deviceId] !== null && 
            this.topStore.getTopState().mapRepeaters[deviceId] !== undefined) {
            return this.topStore.getTopState().mapRepeaters[deviceId].info.position
        }
        if (this.topStore.getTopState().radios[deviceId] !== null && 
            this.topStore.getTopState().radios[deviceId] !== undefined) {
            return this.topStore.getTopState().radios[deviceId].info.position
        }
        return {x: 0, y: 0};
    }

    private setConfiguredDevicesResolved(resolved:boolean) {
        this.topStore.enact({
            actions: [{
                objectType: ObjectType.CONFIGURED_DEVICES_RESOLVED,
                newData: resolved,
                updateType: UpdateType.UPDATE,
                objectId: '',
            }],
            description: 'set configuredDevicesResolved to ' + resolved,
        });
    }

    /**
     * Works for scalar arrays (array of non-object types).
     * Note: we are comparing for equality of arrays, not set equality.
     * It may be good idea to pre-sort the arrays being compared.
     */
    private static isEqualArrays(array1: string[], array2: string[]): boolean {
        return array1.length === array2.length &&
               array1.every((value:string, index:number) => value === array2[index]);
    }

    private isReplacementDevice(dotid: string,
                                trayObjectType: ObjectType.TRAY_SENSOR|ObjectType.TRAY_REPEATER): boolean {
        let isReplacement:boolean = false;
        if (trayObjectType === ObjectType.TRAY_SENSOR) {
            const mapDevices = this.topStore.getTopState().mapSensors;
            isReplacement = Object.values(mapDevices)
                .some((device:GUISensorClient) => (device.replacementSensorId === dotid));
        } else if (trayObjectType === ObjectType.TRAY_REPEATER) {
            const mapDevices = this.topStore.getTopState().mapRepeaters;
            isReplacement = Object.values(mapDevices)
                .some((device:GUIRepeaterClient) => (device.replacementRepeaterId === dotid));
        } else {
            console.error('unexpected trayObjectType: ', trayObjectType);
        }
        if (isReplacement) {
            console.debug('isReplacementDevice(): true for ', dotid);
        }
        return isReplacement;
    }
}
