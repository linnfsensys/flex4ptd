import AptdApp from "./AptdApp";
import cloneDeep from 'lodash/cloneDeep';
import React, {Component, ReactNode} from "react";
import {
    Action,
    ActionGroup,
    APGIChannelIdClient,
    ClientObjectUpdateType,
    ErrorKey,
    EXCardId,
    GlobalErrorKey,
    GUIAPConfigClient,
    GUICCAPGIClient,
    GUICCInterfaceBaseClient,
    GUICCSTSClient,
    GUIRadioClient,
    GUIRepeaterClient,
    GUISensorClient,
    GUISZClient,
    MapSettings, ModalClass,
    ModalInfo,
    ModalType,
    ObjectType,
    Selected, SelectedLinkInfo,
    STSChannelIdClient, TextField,
    UpdateType
} from "./AptdClientTypes";
import {
    GUIAPConfig,
    GUICCChannel,
    GUICCChannelBase, GUICCChannelClient, GUIPingScanStatus,
    GUIPoint,
    GUITechSupport,
    Mappable,
    MapRenderInfo,
    VirtualCcType
} from "./AptdServerTypes";
import ValidationManager, {ValidationAction} from "./ValidationManager";
import MapAndTray from "./mapTrayCabinet/MapAndTray";
import {Arrow, Balloon, Hilight} from "./help/HelpEngine";
import HttpManager from "./HttpManager";
import UndoManager from "./UndoManager";

export enum DispatchType {
    ORIGINAL = 'ORIGINAL',
    REDO = 'REDO',
}

export interface TopStoreState {
    /** if disabled is true, disable user interaction with mapTrayInfoPanel */
    disabled: boolean,
    loading: boolean,
    selected: Selected | null,
    selectedLinkInfo: SelectedLinkInfo | null,
    //nextSensorZoneNo: number,
    ap: GUIAPConfigClient | null,
    radios: { [id: string]: GUIRadioClient },
    mapRepeaters: { [dotid: string]: GUIRepeaterClient },
    ccCards: { [cardid: string]: GUICCInterfaceBaseClient },
    mapSensors: { [dotid: string]: GUISensorClient },
    sensorZones: { [id: string]: GUISZClient },
    trayDevices: { [dotid: string]: GUISensorClient|GUIRepeaterClient },

    /** map from sensor id to containing sz id */
    sensorDotidToSzId: { [sensorDotid: string]: string },
    /** remember map position of deleted radios */
    lastRadioPositionById: { [radioId: string]: GUIPoint},
    /**
     * validationErrors is Object keyed by ObjectType-DeviceId-FieldName-PossibleArrayIndex
     * value is an array of ErrorMsgs
     */
    validationErrors: { [fieldKey: string]: Array<string> },
    validationGlobalErrors: { [infoPanelKey: string]: Array<string>},
    mapSettings: MapSettings,
    httpManager: HttpManager | null,
    techSupport: GUITechSupport | null,
    pingScanStatus: number | null,
    pingScanNoCancel: boolean,
    pingScanSecsLeft: number | null,
    savePctComplete: number | null,
    currentApTime: number | null,
    currentApTimezone: string | null,
    clientTimeMsAtLastServerUpdate: number | null,
    showHelpGuideOnLaunch: boolean,
    modalStack: Array<ModalInfo>,
    credentialValidationModalStack: Array<ModalInfo>,
    /** user has submitted login/pw for server verification */
    awaitingLoginValidation: boolean,
    userid: string,
    password: string,
    /**
     * constant map from ObjectType to the field name of the top level object of that type
     * within TopStoreState.  e.g., from ObjectType.SENSOR_ZONE to 'sensorZones'
     */
    topStateFieldByObjectType: {[objectType: string]: string},
    apgiChannelTemp: APGIChannelIdClient,
    stsChannelTemp: STSChannelIdClient,
    helpBalloons: Balloon[],
    helpHiLights: Hilight[],
    helpArrows: Arrow[],
    needToClearAll: boolean,
    nextModalClass: number,
    downloadInProgress: boolean,
    uploadInProgress: boolean,
    /**
     * awaitingSaveResult is true if client has sent SaveConfig msg to server and has not yet
     * received a final SaveProgress msg from server (showing success or error)
     */
    awaitingSaveResult: boolean,
    ignorePingScanStatus: boolean,
    /** lastServerStartTime needed so client can distinguish between network drop and server restart */
    lastServerStartTime: number,
    lastGuiActiveTime: number,
    rebootRequiredOnSave: boolean,
    configuredDevicesResolved: boolean,
}

/**
 * This class manages the state of the Persistable Toplevel Store
 * that is part of the state of AptdApp, and is used to send json to the server.
 * It is the single source of truth for the entire App.
 * It is meant to be similar to the idea of a Redux Store, without the full baggage of Redux.
 * It is also the top component in React (except for ErrorBoundary)
 */
export default class TopStore extends Component<{}, TopStoreState> {
    /**
     * This is the setState method for the top store, containing offical app state
     * WARNING: in general, do not use this method!  Rather, use TopStore.dispatch() or TopStore.enact()
     */
    private appSetState: ((setStateFn: ((prevState: Readonly<TopStoreState>) => (Partial<TopStoreState> | TopStoreState | null)), callback?: () => void) => void | (Partial<TopStoreState> | TopStoreState | null));
    public validationManager: ValidationManager;
    public updateTsTimer: NodeJS.Timeout | null;
    public resetToApTimeMilli: number;
    public undoManager: UndoManager | undefined = undefined;


	/**
	 * Note that the caller needs to bind "this" to appSetState.
	 * Other alternative is to just pass in the entire AptdApp object.
	 * Either way seems a bit kludgy but it is because this class is
	 * handling state management for AptdApp.
	 */
    constructor(props: any) {
        super(props);

        this.state = {
            disabled: true,
            loading: false,
            selected: {
                selected: null,
                selectedG: null,
                selectedDeviceType: null,
                selectedDotid: null,
                selectedSzId: null,
            },
            selectedLinkInfo: null,
            //nextSensorZoneNo: 1,
            ap: null,
            radios: {},
            mapRepeaters: {},
            ccCards: {},
            mapSensors: {},
            trayDevices: {},
            sensorZones: {},
            sensorDotidToSzId: {
                //'ABCD': 'sz1',
            },
            lastRadioPositionById: {},
            validationErrors: {},
            validationGlobalErrors: {},
            mapSettings: {
                showCCLinks: true,
                showRFLinks: true,
                showLegend: true,
                showCabinetIcon: false,
                cabinetIconPosition: {x:0, y:0},
                northArrowRotationDegrees: 0,
                textFields: {},
            },
            httpManager: null,
            techSupport: null,
            pingScanStatus: null,
            pingScanNoCancel: false,
            pingScanSecsLeft: null,
            savePctComplete: null,
            currentApTime: null,
            currentApTimezone: null,
            clientTimeMsAtLastServerUpdate: null,
            showHelpGuideOnLaunch: false,
            modalStack: [],
            credentialValidationModalStack: [],
            awaitingLoginValidation: false,
            userid: '',
            password: '',
            topStateFieldByObjectType: {
                [ObjectType.SENSOR_ZONE]: 'sensorZones',
                [ObjectType.RADIO]: 'radios',
                [ObjectType.AP]: 'ap',
                [ObjectType.MAP_REPEATER]: 'mapRepeaters',
                [ObjectType.MAP_SENSOR]: 'mapSensors',
                [ObjectType.TRAY_REPEATER]: 'trayDevices',
                [ObjectType.TRAY_SENSOR]: 'trayDevices',
                [ObjectType.APGI]: 'apgi',
                [ObjectType.STS]: 'sts',
                [ObjectType.STS_ADDR_MAP]: 'ccCards',
                [ObjectType.USERID]: 'userid',
                [ObjectType.PASSWORD]: 'password',
            },
            apgiChannelTemp: {
                shelf: '0',
                slot: '0',
                channel: '1'
            },
            stsChannelTemp: {
                ip: '1',
                group: '0',
                channel: '1'
            },
            helpBalloons: [],
            helpHiLights: [],
            helpArrows: [],
            needToClearAll: false,
            nextModalClass: 0,
            downloadInProgress: false,
            uploadInProgress: false,
            awaitingSaveResult: false,
            ignorePingScanStatus: false,
            lastServerStartTime: 0,
            lastGuiActiveTime: 0,
            rebootRequiredOnSave: false,
            configuredDevicesResolved: false,
        };

        // TODO: fix the ignore
        // @ts-ignore
        this.appSetState = this.setState.bind(this);
        this.validationManager = new ValidationManager(this);
        this.updateTsTimer = null;
        this.resetToApTimeMilli = 10000;
        // Assert: for a bound function, prototype should be undefined!
		        //console.log('TopStore.constructor(): this.appSetState.prototype=', this.appSetState.prototype);
        this.showModal = this.showModal.bind(this);
        this.dismissModal = this.dismissModal.bind(this);
        this.dispatch = this.dispatch.bind(this);
        this.getTopState = this.getTopState.bind(this);
        this.fixUpOrigDataDynamically = this.fixUpOrigDataDynamically.bind(this);
        this.fixUpNewDataDynamically = this.fixUpNewDataDynamically.bind(this);
    }

    render() {
        return (
                <AptdApp dispatch={this.dispatch}
                         appSetState={this.appSetState}
                         topStore={this}
                         selectedDotId={this.state.selected !== null ? this.state.selected.selectedDotid : null}
                />
        );
    }

    public getTopState():Readonly<TopStoreState> {
        return this.state as Readonly<TopStoreState>;
    }

    /**
     *  This method is called to enact a group of Actions (ActionGroup).
     *  It is called either when server msg arrives, or for any action
     *  that does not need Undo/Redo handling.
     *  @param optional parameter callBack is called after last action in actionGroup
     */
    enact(actionGroup: ActionGroup, callBack?: ()=>void):void {
        // could use console.debug() here to skip stack trace on each action which makes logs long.
        console.trace('enact(): actionGroup=', actionGroup);
        for (let index = 0; index < actionGroup.actions.length; index++) {
            const action = actionGroup.actions[index];
            if (index === actionGroup.actions.length - 1) {
                this.dispatch(action, DispatchType.ORIGINAL, callBack);
            } else {
                this.dispatch(action, DispatchType.ORIGINAL);
            }
        }
    }

	/** 
	 * Method to dispatch a bunch of Actions.  
	 * Use this method with caution.  
	 * If this is happening due to a user gesture, 
	 * use UndoManager.enactActions() instead.
	 */
    public dispatchAll(actions: Action[], callBack?: ()=>void): void {
        let actionIndex = 0;
        for (const action of actions) {
            if (actionIndex < actions.length - 1) {
                this.dispatch(action, DispatchType.ORIGINAL);
            } else {
                this.dispatch(action, DispatchType.ORIGINAL, callBack);
            }
        }
    }

    /**
     * Used to merge subcomponent state into top level persistable state.
     *        State for Aptd element of type 'objectType' with id 'id'
     * Usage: in general, it is better to use UndoManager.enactActionsToStore() because
     *        that gives undo/redo capabiity, and log/debug capability.
     * This method is used upon user gestures, redo of user gestures, and also upon
     *        changes arriving from Server-originated Config and Status messages.
     * TODO: There are probably more cases that can be handled
     *       by generic methods.
     * @see reverse() does the opposite of dispatch.
     */
    public dispatch(action: Action,
                    dispatchType: DispatchType = DispatchType.ORIGINAL,
                    callBack?: ()=>void): void {

        let revisedAction: Action = action;
        if (action.newDataDynamicFrom !== undefined && dispatchType === DispatchType.REDO) {
            // This is only used in case where action.updateType === ADD
            if (action.updateType !== UpdateType.ADD) {
                throw new Error('unexpected updateType when newDataDynamicFrom defined');
            }
            revisedAction = this.fixUpNewDataDynamically(action);
            console.debug('dispatch(): after fixup, revisedAction=', revisedAction, 'action=', action);
        }

        const deviceType: ObjectType = revisedAction.objectType;
        switch (deviceType) {
            case ObjectType.SENSOR_ZONE:
                this.dispatchSzAction(revisedAction, callBack);
                break;

            case ObjectType.MAP_SENSOR:
                this.dispatchMapSensorAction(revisedAction, callBack);
                break;

            case ObjectType.TRAY_SENSOR:
            case ObjectType.TRAY_REPEATER:
                this.dispatchTrayDeviceAction(revisedAction, callBack);
                break;

            case ObjectType.MAP_REPEATER:
                this.dispatchMapRepeaterAction(revisedAction, callBack);
                break;

            case ObjectType.RADIO:
                this.dispatchRadioAction(revisedAction, callBack);
                break;

            case ObjectType.CCCARD:
                this.dispatchCcCardAction(revisedAction, callBack);
                break;

            case ObjectType.CC_CHANNEL:
                this.dispatchCcChannelAction(revisedAction, callBack);
                break;

            // Not used in drag-drop. covered by CC_CHANNEL case above.
            // But is used when modifying channel properties in InfoPanel

            case ObjectType.CC_LINK:
                this.dispatchCcLinkAction(revisedAction, callBack);
                break;
            
            case ObjectType.SDLC_CHANNEL:
                this.dispatchSdlcChannelAction(revisedAction, callBack);
                break;

            case ObjectType.AP:
                this.dispatchAPAction(revisedAction, callBack);
                break;

            case ObjectType.LAST_GUI_ACTIVE_TIME:
                this.appSetState((prevState: TopStoreState) => {
                    let lastGuiActiveTime: number = revisedAction.newData as number;
                    return {
                        lastGuiActiveTime: lastGuiActiveTime,
                    };
                }, callBack);
                break;

            case ObjectType.TECH_SUPPORT_PROPS:
                this.dispatchTechSupportPropsAction(revisedAction, callBack);
                break;

            case ObjectType.TECH_SUPPORT_LOGGERS:
                this.dispatchTechSupportLoggersAction(revisedAction, callBack);
                break;

            case ObjectType.TECH_SUPPORT:
                this.dispatchTechSupportAction(revisedAction, callBack);
                break;

            case ObjectType.SELECTED:
                this.dispatchSelectedAction(revisedAction, callBack);
                break;

            case ObjectType.SELECTED_LINK_INFO:
                this.dispatchSelectedLinkInfoAction(revisedAction, callBack);
                break;

            case ObjectType.DOTID_TO_SZID:
                this.dispatchDotidToSzidAction(revisedAction, callBack);
                break;

            case ObjectType.VALIDATION_ERRORS:
                throw new Error('invalid objectType: validation errors');

            case ObjectType.GLOBAL_VALIDATION_ERRORS:
                throw new Error('invalid objectType: global validation errors');

            case ObjectType.PING_SCAN_STATUS:
                this.appSetState((prevState: TopStoreState) => {
                    // we use ignorePingScanStatus to provide reassuring UI experience
                    // to the person who presses the button.
                    if (! prevState.ignorePingScanStatus) {
                        let guiPingScanStatus: GUIPingScanStatus = revisedAction.newData as GUIPingScanStatus;
                        return {
                            pingScanStatus: guiPingScanStatus.percentComplete,
                            pingScanNoCancel: guiPingScanStatus.noCancel,
                            pingScanSecsLeft: Math.round(guiPingScanStatus.maxPingScanSecs * (1 - guiPingScanStatus.percentComplete/100.0)),
                        };
                    } else {
                        return null;
                    }
                }, callBack);
                break;

            case ObjectType.IGNORE_PING_SCAN_STATUS:
                this.appSetState((prevState: TopStoreState) => {
                    let ignorePingScanStatus: boolean = revisedAction.newData as boolean;
                    return {
                        ignorePingScanStatus: ignorePingScanStatus,
                    };
                }, callBack);
                break;

            case ObjectType.REBOOT_REQUIRED_ON_SAVE:
                this.appSetState((prevState: TopStoreState) => {
                    let rebootRequiredOnSave: boolean = revisedAction.newData as boolean;
                    return {
                        rebootRequiredOnSave: rebootRequiredOnSave,
                    };
                }, callBack);
                break;

            case ObjectType.SAVE_PERCENT_COMPLETE:
                this.appSetState((prevState: TopStoreState) => {
                    if (revisedAction.updateType === UpdateType.UPDATE) {
                        const savePctComplete: number | null = revisedAction.newData as number | null;
                        return {savePctComplete: savePctComplete};
                    } else {
                        throw new Error('unexpected updateType');
                    }
                }, callBack);
                break;

            case ObjectType.AP_TIME_UPDATE:
                this.dispatchApTimeAction(revisedAction, callBack);
                break;

            case ObjectType.MAP_SETTINGS:
                // note: although all these fields originate from GUIAPConfig and
                //       are saved back to GUIAPConfig, their value in topStore.state.ap
                //       is not the source of truth.  rather, it is kept in topStore.state.mapSettings
                this.dispatchGenericUpdateAction('mapSettings', revisedAction, callBack);
                break;

            case ObjectType.APGI:
                this.dispatchApgiAction(revisedAction, callBack);
                break;

            case ObjectType.APGI_CHANNEL:
                this.dispatchApgiChannelAction(revisedAction, callBack);
                break;

            case ObjectType.APGI_TEMP_CHANNEL:
                this.dispatchGenericUpdateAction('apgiChannelTemp', revisedAction, callBack);
                break;

            case ObjectType.STS:
                this.dispatchStsAction(revisedAction, callBack);
                break;

            case ObjectType.STS_CHANNEL:
                this.dispatchStsChannelAction(revisedAction, callBack);
                break;

            case ObjectType.STS_ADDR_MAP:
                this.dispatchStsAddrMapAction(revisedAction, callBack);
                break;

            case ObjectType.STS_TEMP_CHANNEL:
                this.dispatchGenericUpdateAction('stsChannelTemp', revisedAction, callBack);
                break;

            case ObjectType.HELP_BALLOONS:
                this.dispatchGenericUpdateAction('helpBalloons', revisedAction, callBack);
                break;

            case ObjectType.HELP_ARROWS:
                this.dispatchGenericUpdateAction('helpArrows', revisedAction, callBack);
                break;

            case ObjectType.HELP_HILIGHTS:
                this.dispatchGenericUpdateAction('helpHiLights', revisedAction, callBack);
                break;

            case ObjectType.USERID:
                this.appSetState((prevState: TopStoreState) => {
                    if (revisedAction.updateType === UpdateType.UPDATE) {
                        const userid: {[key:string]:string} = revisedAction.newData as {[key:string]:string};
                        return userid;
                    } else {
                        throw new Error('unexpected updateType');
                    }
                }, callBack);
                break;

            case ObjectType.PASSWORD:
                this.appSetState((prevState: TopStoreState) => {
                    if (revisedAction.updateType === UpdateType.UPDATE) {
                        const pw:  {[key:string]:string} = revisedAction.newData as  {[key:string]:string};
                        return pw;
                    } else {
                        throw new Error('unexpected updateType');
                    }
                }, callBack);
                break;

            // TODO: following name seems misleading.  it refers to cursor type
            case ObjectType.CLIENT:
                let newState:boolean = revisedAction.newData as boolean;
                if (revisedAction.objectId === ClientObjectUpdateType.DISABLED) {
                    this.appSetState((prevState: TopStoreState) => {
                        return {disabled: newState};
                    }, callBack);
                }
                else if (revisedAction.objectId === ClientObjectUpdateType.LOADING) {
                    this.appSetState((prevState: TopStoreState) => {
                        return {loading: newState};
                    }, callBack);
                }                 
                break;

            case ObjectType.AWAITING_LOGIN_VALIDATION:
                let newAwaitingLoginValidationState:boolean = revisedAction.newData as boolean;
                this.appSetState((prevState: TopStoreState) => {
                    return {awaitingLoginValidation: newAwaitingLoginValidationState};
                }, callBack);
                break;

            case ObjectType.CONFIGURED_DEVICES_RESOLVED:
                let newConfiguredDevicesResolved:boolean = revisedAction.newData as boolean;
                this.appSetState((prevState: TopStoreState) => {
                    return {configuredDevicesResolved: newConfiguredDevicesResolved};
                }, callBack);
                break;

            case ObjectType.AWAITING_SAVE_RESULT:
                let newAwaitingSaveResult:boolean = revisedAction.newData as boolean;
                this.appSetState((prevState: TopStoreState) => {
                    return {awaitingSaveResult: newAwaitingSaveResult};
                }, callBack);
                break;

            case ObjectType.DOWNLOAD_IN_PROGRESS:
                const newDownloadState: boolean = revisedAction.newData as boolean;
                this.appSetState((prevState: TopStoreState) => {
                    return {
                        downloadInProgress: newDownloadState,
                        //disabled: newDownloadState,
                    };
                }, callBack);
                break;

            // TODO: use the following instead of ObjectType.CLIENT
            case ObjectType.UPLOAD_IN_PROGRESS:
                const newUploadState: boolean = revisedAction.newData as boolean;
                this.appSetState((prevState: TopStoreState) => {
                    return {
                        uploadInProgress: newUploadState,
                        //disabled: newUploadState,
                    };
                }, callBack);
                break;

            default:
                throw new Error('unexpected objectType: ' + deviceType);
        }
    }

    private dispatchSzAction(action: Action, callBack?: ()=>void): void {
        const id: string = action.objectId;
        const newData: Partial<GUISZClient> = cloneDeep(action.newData);
        switch (action.updateType) {
            case UpdateType.UPDATE:
            case UpdateType.ADD:
                this.appSetState((prevState: TopStoreState) => {
                    if (id.startsWith('clientSz') && newData.id !== undefined) {
                        //Update ID to server assigned Id
                        let szs = cloneDeep(prevState.sensorZones);
                        delete szs[id];
                        szs[newData.id] = newData;

                        let sensorDotidToSz = cloneDeep(prevState.sensorDotidToSzId);
                        if (newData.sensorIds !== undefined) {
                            for (let sensorIndex = 0; sensorIndex < newData.sensorIds.length; sensorIndex++) {
                                let dotid: string = newData.sensorIds[sensorIndex];
                                sensorDotidToSz[dotid] = newData.id;
                            }
                        }

                        let selected: Selected = cloneDeep(prevState.selected);
                        if (selected !== null && selected !== undefined && selected.selectedSzId === id) {
                            selected.selectedSzId = newData.id;
                        }
                        return {sensorZones: szs, sensorDotidToSzId: sensorDotidToSz, selected: selected};
                    }

                    let szs = cloneDeep(prevState.sensorZones);
                    szs[id] = {...szs[id], ...newData};

                    let sensorDotidToSz = cloneDeep(prevState.sensorDotidToSzId);
                    if (newData.sensorIds !== undefined) {
                        for (let sensorIndex = 0; sensorIndex < newData.sensorIds.length; sensorIndex++) {
                            let dotid: string = newData.sensorIds[sensorIndex];
                            sensorDotidToSz[dotid] = id;
                        }
                    }
                    return {sensorZones: szs, sensorDotidToSzId: sensorDotidToSz};
                }, callBack);
                break;
            case UpdateType.DELETE:
                this.appSetState((prevState: TopStoreState) => {
                    let newSzs = cloneDeep(prevState.sensorZones);
                    delete newSzs[id];
                    return {sensorZones: newSzs};
                }, callBack);
                break;
            default:
                console.error('unexpected updateType: ' + action.updateType);
                break;
        }
    }
    private dispatchMapSensorAction(action: Action, callBack?: ()=>void): void {
        const id: string = action.objectId;
        const newSensorData: Partial<GUISensorClient> = cloneDeep(action.newData);
        switch (action.updateType) {
            case UpdateType.ADD:
            case UpdateType.UPDATE:
                this.appSetState((prevState: TopStoreState) => {
                    const newMapSensors: {[dotid: string]: GUISensorClient} = cloneDeep(prevState.mapSensors);
                    const newMapSensor: GUISensorClient = {...newMapSensors[id], ...newSensorData};
                    // In case a Radio or Repeater was Deleted, verify RF Links
                    const newMapDevice = this.removeLinksWithInvalidDstId(newMapSensor, prevState) as GUISensorClient;
                    newMapSensors[id] = newMapDevice;
                    return {mapSensors: newMapSensors};
                }, callBack);
                break;

            case UpdateType.DELETE:
                // we do a simple delete, and rely on the calling actionGroup
                // to make sure the related data is updated correctly
                // (sensorZones, sensorDotidToSzId, selection)
                this.appSetState((prevState: TopStoreState) => {
                    let mapSensors = cloneDeep(prevState.mapSensors);
                    delete mapSensors[id];
                    return {
                        mapSensors: mapSensors,
                    };
                }, callBack);
                break;

            default:
                throw new Error('unexpected updateType: ' + action.updateType);
        }
    }
    private dispatchMapRepeaterAction(action: Action, callBack?: ()=>void): void {
        const id: string = action.objectId;
        switch (action.updateType) {
            case UpdateType.ADD:
                {
                    const newRepeaterData: GUIRepeaterClient = cloneDeep(action.newData);
                    this.appSetState((prevState: TopStoreState) => {
                        let repeaters = cloneDeep(prevState.mapRepeaters);
                        repeaters[id] = newRepeaterData;
                        return {mapRepeaters: repeaters};
                    }, callBack);
                }
                break;

            case UpdateType.UPDATE:
                {
                    const newRepeaterData: Partial<GUIRepeaterClient> = cloneDeep(action.newData);
                    this.appSetState((prevState: TopStoreState) => {
                        let newMapRepeaters: {[dotid: string]: GUIRepeaterClient} = cloneDeep(prevState.mapRepeaters);
                        const newMapRepeater: GUIRepeaterClient = {...newMapRepeaters[id], ...newRepeaterData};

                        // In case a Radio was deleted, verify RF Links
                        let newMapDevice = this.removeLinksWithInvalidDstId(newMapRepeater, prevState) as GUIRepeaterClient;
                        // other data changes, or move location
                        newMapRepeaters[id] = newMapDevice;
                        return {mapRepeaters: newMapRepeaters};
                    }, callBack);
                }
                break;

            case UpdateType.DELETE:
                this.appSetState((prevState: TopStoreState) => {
                    let mapRepeaters: {[dotid: string]: GUIRepeaterClient} = cloneDeep(prevState.mapRepeaters);
                    delete mapRepeaters[id];
                    return {
                        mapRepeaters: mapRepeaters,
                    };
                }, callBack);
                break;

            default:
                throw new Error('unexpected updateType: ' + action.updateType);
        }
    }

    private dispatchTrayDeviceAction(action: Action, callBack?: ()=>void): void {
        switch (action.updateType) {
            case UpdateType.ADD:
            case UpdateType.UPDATE:
                const newData: GUISensorClient|GUIRepeaterClient = cloneDeep(action.newData);
                // Q: What if adding a TRAY_SENSOR or TRAY_REPEATER and it is already there?
                // A: Currently just update it.
                // Caution. an unexpected update could wipe out user changes
                this.appSetState((prevState: TopStoreState) => {
                    let trayDevices = cloneDeep(prevState.trayDevices);
                    const newTrayDevice: GUISensorClient | GUIRepeaterClient = {...trayDevices[action.objectId], ...newData};
                    // add the traySensor with dotid
                    trayDevices[action.objectId] = newTrayDevice;
                    // reorder tray devices by altering their x-coordinates
                    // TODO: probably do not need to sort on UPDATE
                    TopStore.orderTray(trayDevices);
                    return {trayDevices: trayDevices};
                }, callBack);
                break;

            case UpdateType.DELETE:
                this.appSetState((prevState: TopStoreState) => {
                    let trayDevices = cloneDeep(prevState.trayDevices);
                    delete trayDevices[action.objectId];
                    TopStore.orderTray(trayDevices);
                    return {trayDevices: trayDevices};
                }, callBack);
                break;

            default:
                throw new Error('unexpected updateType' + action.updateType);
        }
    }

    private dispatchRadioAction(action: Action, callBack?: ()=>void): void {
        switch (action.updateType) {
            case UpdateType.ADD: {
                    const newRadioData: GUIRadioClient = cloneDeep(action.newData);
                    this.appSetState((prevState: TopStoreState) => {
                        let radios = cloneDeep(prevState.radios);
                        radios[action.objectId] = newRadioData;
                        return {radios: radios};
                    }, callBack);
                }
                break;

            case UpdateType.UPDATE: {
                    const newRadioData: Partial<GUIRadioClient> = cloneDeep(action.newData);
                    this.appSetState((prevState: TopStoreState) => {
                        let radios = cloneDeep(prevState.radios);
                        //Make sure this Radio was not Deleted
                        if (radios[action.objectId] === null || radios[action.objectId] === undefined) {
                            //This is one of the Undo actions we do not want to allow
                            return null;
                        }
                        // other data changes, or move location
                        radios[action.objectId] = {...radios[action.objectId], ...newRadioData};
                        return {radios: radios};
                    }, callBack);
                }
                break;

            case UpdateType.DELETE:
                // Check if any devices are connected to Radio
                // If not, delete radio, otherwise--mark as unheard with icon
                this.appSetState((prevState: TopStoreState) => {
                    let radios: { [id: string]: GUIRadioClient } = cloneDeep(prevState.radios);

                    let radioConnected = false;
                    for (let mapSensor of Object.values(prevState.mapSensors)) {
                        if (mapSensor.info.rfLink !== null && mapSensor.info.rfLink !== undefined &&
                            mapSensor.info.rfLink.dstId === action.objectId) {
                            radioConnected = true;
                            break;
                        }
                    }
                    if (! radioConnected) {
                        for (let mapRepeaters of Object.values(prevState.mapRepeaters)) {
                            if (mapRepeaters.info.rfLink !== null &&
                                mapRepeaters.info.rfLink !== undefined &&
                                mapRepeaters.info.rfLink.dstId === action.objectId) {
                                radioConnected = true;
                                break;
                            }
                        }
                    }

                    if (! radioConnected) {
                        // remember radio location for future use--it might come back.
                        const updatedLastPositions = cloneDeep(this.state.lastRadioPositionById);
                        updatedLastPositions[action.objectId] = radios[action.objectId].info.position;

                        delete radios[action.objectId];
                        let selected = cloneDeep(prevState.selected);
                        selected = this.clearDeletedDeviceFromSelected(ObjectType.RADIO, action.objectId);
                        // only way radio delete can happen is from server
                        // so ok to purge undo stack.
                        if (this.undoManager !== undefined) {
                            this.undoManager.removeFromUndoStack(action.objectId);
                            this.undoManager.removeFromRedoStack(action.objectId);
                        }

                        return {
                            radios: radios,
                            lastRadioPositionById: updatedLastPositions,
                            selected: selected
                        };
                    }

                    // assert radioConnected so mark it unheard, meaning: delete in future.
                    radios[action.objectId].unheard = true
                    return {radios: radios};
                }, callBack);

                break;

            default:
                throw new Error('unexpected updateType: ' + action.updateType);
        }
    }

    private dispatchCcCardAction(action: Action, callBack?: ()=>void): void {
        if (action.updateType === UpdateType.ADD) {
            const newCard: GUICCInterfaceBaseClient = cloneDeep(action.newData) as GUICCInterfaceBaseClient;
            this.dispatchCcCardAdd(action.objectId, newCard, callBack);
        } else if (action.updateType === UpdateType.UPDATE) {
            const newCardData: Partial<GUICCInterfaceBaseClient> = cloneDeep(action.newData) as Partial<GUICCInterfaceBaseClient>;
            this.dispatchCcCardUpdate(action.objectId, newCardData, callBack);
        } else if (action.updateType === UpdateType.DELETE) {
            // Check if any devices are connected to ccCard
            // If not delete ccCard otherwise mark as unheard with icon
            this.dispatchCcCardDelete(action.objectId);
        } else {
            throw new Error('unexpected updateType: ' + action.updateType);
        }
    }

    private dispatchCcCardDelete(objectId: string, forceDelete?: boolean) {
        this.appSetState((prevState: TopStoreState) => {
            let ccCards: { [cardid: string]: GUICCInterfaceBaseClient } = cloneDeep(prevState.ccCards);
            if (ccCards === null || ccCards === undefined || Object.keys(ccCards).length === 0) {
                return null;
            }

            let ccCardConnected = false;
            let updatedMapSensors:{[dotid: string]: GUISensorClient} = cloneDeep(prevState.mapSensors);
            if (objectId === 'SDLC' || objectId === 'STS' || objectId === 'APGI') {
                if (forceDelete !== null && forceDelete) {
                    for (let mapSensor of Object.values(updatedMapSensors)) {
                        updatedMapSensors[mapSensor.id].info.ccLinks = [];
                    }
                }
                for (let mapSensor of Object.values(updatedMapSensors)) {
                    if (mapSensor.info.ccLinks !== null &&
                        mapSensor.info.ccLinks !== undefined &&
                        mapSensor.info.ccLinks.length > 0) {
                        ccCardConnected = true;
                        break;
                    }
                }
            } else {
                // CC cards case
                for (let mapSensor of Object.values(prevState.mapSensors)) {
                    if (mapSensor.info.ccLinks !== null && mapSensor.info.ccLinks !== undefined) {
                        for (let ccLink of mapSensor.info.ccLinks) {
                            let ccCardName = ccLink.dstId.slice(0, ccLink.dstId.length - 5);
                            if (ccCardName === objectId) {
                                ccCardConnected = true;
                                break;
                            }
                        }
                    }
                }
            }

            if (! ccCardConnected) {
                let cardType = ccCards[objectId].otype;
                let dotid = objectId;
                let objectType = ObjectType.CCCARD
                if (cardType === 'GUICCSDLC') {
                    objectType = ObjectType.SDLC_BANK;
                }
                else if (cardType === 'GUICCAPGI') {
                    objectType = ObjectType.APGI;
                }
                else if (cardType === 'GUICCSTS') {
                    objectType = ObjectType.STS;
                }
                let selected = cloneDeep(prevState.selected);
                selected = this.clearDeletedDeviceFromSelected(objectType, dotid);
                delete ccCards[objectId];
                TopStore.orderCabinet(ccCards);

                let updateAp: GUIAPConfigClient = cloneDeep(prevState.ap);
                updateAp.virtualCCMode = VirtualCcType.NONE;

                // ccCard and SDLCcard delete can only come from server, so ok to purge undo stack
                if (cardType !== 'GUICCAPGI' && cardType !== 'GUICCSTS' && this.undoManager !== undefined) {
                    this.undoManager.removeFromUndoStack(objectId);
                    this.undoManager.removeFromRedoStack(objectId);
                }

                return {
                    ccCards: ccCards,
                    selected: selected,
                    mapSensors: updatedMapSensors,
                    ap: updateAp
                };
            }

            ccCards[objectId].unheard = true;
            return {ccCards: ccCards};
        });
    }

    private dispatchCcCardUpdate(objectId: string, newCardData: Partial<GUICCInterfaceBaseClient>, callBack?: (() => void)) {
        this.appSetState((prevState: TopStoreState) => {
            let ccCards = cloneDeep(prevState.ccCards);
            // other data changes, or move location
            ccCards[objectId] = {...ccCards[objectId], ...newCardData};
            if (objectId !== 'APGI' && objectId !== 'STS' && objectId !== 'SDLC') {
                // presumably the 'EX' card case, so there could be >1 cards, so sort them.
                TopStore.orderCabinet(ccCards);
            }
            return {ccCards: ccCards};
        }, callBack);
    }

    private dispatchCcCardAdd(objectId: string, newCard: GUICCInterfaceBaseClient, callBack: (() => void) | undefined) {
        this.appSetState((prevState: TopStoreState) => {
            let ccCards: { [cardId: string]: GUICCInterfaceBaseClient };
            if (objectId === 'APGI' ||
                objectId === 'STS' ||
                objectId === 'SDLC') {
                // create just 1 card:
                // that is all there will ever be.
                ccCards = {[objectId]: newCard};
            } else {
                // assert: this is the plain CC_CARD (EX) case.
                // add in the new card.
                ccCards = cloneDeep(prevState.ccCards);
                ccCards[objectId] = newCard;
                TopStore.orderCabinet(ccCards);
            }
            return {ccCards: ccCards};
        }, callBack);
    }

    private dispatchCcChannelAction(action: Action, callBack?: ()=>void): void {
        const newChannelData: Partial<GUICCChannel> = cloneDeep(action.newData);
        // changes to a single channel of a CC Card of any type:
        if (action.updateType === UpdateType.UPDATE) {
            this.appSetState((prevState: TopStoreState) => {
                if (Object.keys(prevState.ccCards).length === 0) {
                    // could happen due to server side delete
                    console.warn('cannot undo in this case because no CC cards. doing nothing');
                    return null;
                }
                let chId = action.objectId; 
                let channelType: ObjectType = this.getChannelType(chId);
                let cardId: string = MapAndTray.getCardIdFromChannelId(chId, channelType);  // e.g. S3-S15 or SDLC or APGI
                let ccCards = cloneDeep(prevState.ccCards);
                if (ccCards[cardId] !== null && ccCards[cardId] !== undefined) {
                    ccCards[cardId].channelsById[chId] = {...ccCards[cardId].channelsById[chId], ...newChannelData};
                }
                return {ccCards: ccCards};
            }, callBack);
        } else {
            throw new Error('unexpected updateType: ' + action.updateType);
        }
    }

    private dispatchCcLinkAction(action: Action, callBack?: ()=>void): void {
        const newChannelData: Partial<GUICCChannel> = cloneDeep(action.newData);
        // changes to a single channel of a CC Card of any type:
        if (action.updateType === UpdateType.UPDATE) {
            this.appSetState((prevState: TopStoreState) => {
                if (Object.keys(prevState.ccCards).length === 0) {
                    // could happen due to server side delete
                    console.warn('cannot undo in this case because no CC cards. doing nothing');
                    return null;
                }
                let chId = action.objectId; // e.g. S3-S15-CH_2
                let channelType: ObjectType = this.getChannelType(chId);
                let cardId: string = MapAndTray.getCardIdFromChannelId(chId, channelType);  // e.g. S3-S15 or SDLC or APGI
                let ccCards = cloneDeep(prevState.ccCards);
                let sensorFailSafe = ccCards[cardId].channelsById[chId].sensorFailSafe;
                let newSsFailSafe =  {...sensorFailSafe, ...newChannelData};
                if (ccCards[cardId] !== null && ccCards[cardId] !== undefined) {
                    ccCards[cardId].channelsById[chId] = {...ccCards[cardId].channelsById[chId], 'sensorFailSafe':newSsFailSafe};
                }
                return {ccCards: ccCards};
            }, callBack);
        } else {
            throw new Error('unexpected updateType: ' + action.updateType);
        }
    }

    private dispatchSdlcChannelAction(action: Action, callBack?: ()=>void): void {
        const newData: any = cloneDeep(action.newData);
        // changes to a single channel of a SDLC device
        if (action.updateType === UpdateType.UPDATE) {
            let chId = action.objectId; // e.g. B3-CH_16

            this.appSetState((prevState: TopStoreState) => {
                let ccCards = cloneDeep(prevState.ccCards);
                ccCards['SDLC'].channelsById[chId] = {
                    ...ccCards['SDLC'].channelsById[chId],
                    ...newData
                };
                return {ccCards: ccCards};
            }, callBack);
        } else {
            throw new Error('unexpected updateType: ' + action.updateType);
        }
    }

    private dispatchApgiChannelAction(action: Action, callBack?: ()=>void): void {
        const newChannelData: Partial<GUICCChannelClient> =
            cloneDeep(action.newData) as Partial<GUICCChannelClient>;
        if (action.updateType === UpdateType.UPDATE) {
            this.appSetState((prevState: TopStoreState) => {
                let apgi: GUICCAPGIClient;
                if (Object.values(prevState.ccCards).length === 1 &&
                    prevState.ccCards['APGI'] !== null &&
                    prevState.ccCards['APGI'] !== undefined) {
                    // APGI has only 1 "card"
                    const theCard: GUICCAPGIClient = prevState.ccCards['APGI'] as GUICCAPGIClient;
                    const newCard = cloneDeep(theCard);
                    let theChannel: GUICCChannelClient = newCard.channelsById[action.objectId];
                    newCard.channelsById[action.objectId] = {...theChannel, ...newChannelData};
                    return {ccCards: {'APGI': newCard}};
                } else {
                    console.error('unexpected updateType: ', action.updateType);
                    return null;
                }
            }, callBack);
        } else {
            throw new Error('unexpected updateType' + action.updateType);
        }
    }

    private dispatchAPAction(action: Action, callBack?: ()=>void): void {
        if (action.updateType === UpdateType.ADD) {
            const newAp: GUIAPConfigClient = cloneDeep(action.newData);
            this.appSetState((prevState: TopStoreState) => {
                return {
                    ap: newAp,
                    showHelpGuideOnLaunch: ! newAp.initialized,
                };
            }, callBack);
        } else if (action.updateType === UpdateType.UPDATE) {
            const newAPData: Partial<GUIAPConfigClient> = cloneDeep(action.newData);
            this.appSetState((prevState: TopStoreState) => {
                let ap: GUIAPConfigClient = cloneDeep(prevState.ap);
                let mapSensors: {[dotid: string]: GUISensorClient} = cloneDeep(prevState.mapSensors);
                if (newAPData.virtualCCMode !== undefined &&
                    newAPData.virtualCCMode !== ap.virtualCCMode) {
                    for (let dotid of Object.keys(mapSensors)) {
                        mapSensors[dotid].info.ccLinks = []
                    }
                }
                // other data changes, or move location
                ap = {...ap, ...newAPData};
                return {ap: ap, mapSensors: mapSensors};
            }, callBack);
        } else {
            throw new Error('unexpected updateType: ' + action.updateType);
        }
    }
    private dispatchTechSupportPropsAction(action: Action, callBack?: ()=>void): void {
        const newData: string[] = cloneDeep(action.newData);
        if (action.updateType === UpdateType.UPDATE) {
            this.appSetState((prevState: TopStoreState) => {
                let ts: GUITechSupport = cloneDeep(prevState.techSupport);
                const objectId:number = parseInt(action.objectId, 10);
                ts.props[objectId].value = newData[objectId];
                return {techSupport: ts};
            });
        } else {
            throw new Error('unexpected updateType: ' + action.updateType);
        }
    }
    private dispatchTechSupportLoggersAction(action: Action, callBack?: ()=>void): void {
        const newData: {[key: string]: string} = cloneDeep(action.newData);
        if (action.updateType === UpdateType.UPDATE) {
            this.appSetState((prevState: TopStoreState) => {
                let ts = cloneDeep(prevState.techSupport);
                ts.loggers[action.objectId] = newData['useValue'];
                return {techSupport: ts};
            });
        } else {
            throw new Error('unexpected updateType: ' + action.updateType);
        }
    }

    private dispatchTechSupportAction(action: Action, callBack?: ()=>void): void {
        const newData: any = cloneDeep(action.newData);
        if (action.updateType === UpdateType.ADD) {
            this.appSetState((prevState: TopStoreState) => {
                let ts = cloneDeep(prevState.techSupport);
                ts = {...ts, ...newData};
                return {techSupport: ts};
            });
        } else {
            throw new Error('unexpected updateType: ' + action.updateType);
        }
    }

    private dispatchSelectedAction(action: Action, callBack?: ()=>void): void {
        const newData: Selected = cloneDeep(action.newData);
        // assert: updateType is UPDATE
        if (action.updateType !== UpdateType.UPDATE) {
            throw new Error('unexpected updateType: ' + action.updateType);
        }
        this.appSetState((prevState: TopStoreState) => {
            if (this.selectedDeviceHasBeenRemoved(newData)) {
                return {selected: null};
            }
            return {selected: {...prevState.selected, ...newData}};
        }, callBack);
    }


    private dispatchSelectedLinkInfoAction(action: Action, callBack?: ()=>void): void {
        const newData: SelectedLinkInfo = cloneDeep(action.newData);
        // assert: updateType is UPDATE
        if (action.updateType !== UpdateType.UPDATE) {
            console.error('unexpected updateType: ' + action.updateType);
            return;
        }
        this.appSetState((prevState: TopStoreState) => {
            /* not sure if following is needed...
            if (this.selectedDeviceHasBeenRemoved(newData)) {
                return {selected: null};
            }
             */
            return {selectedLinkInfo: {...prevState.selectedLinkInfo, ...newData}};
        }, callBack);
    }


    /**
     * We need to create a formatted Date to present on Bottom bar.
     * Need to keep track of AP current date and increment in Bottom bar.
     * Every ~10 seconds (checked by storing local epoch time for prev update),
     * compare incremented time with new AP time update
     * and update present time if needed (or just show presented time)
     */
    private dispatchApTimeAction(action: Action, callBack?: ()=>void): void {
        // typical value for newDateData: "2020.02.06.12.31.53.PST"
        const newDateData: string = cloneDeep(action.newData);

        this.appSetState((prevState: TopStoreState) => {
            const clientTimeMs:number = (new Date()).getTime();
            const apTimeValues:string[] = newDateData.split(".");
            if (apTimeValues.length >= 7) {
                const year = apTimeValues[0];
                const month = apTimeValues[1];
                const day = apTimeValues[2];
                const hour = apTimeValues[3];
                const minute = apTimeValues[4];
                const second = apTimeValues[5];
                const timezone = apTimeValues[6];
                const apTimeMs: number = new Date(+year, +month - 1, +day, +hour, +minute, +second).getTime();

                const updateTs:boolean = true;

                if (updateTs) {
                    console.debug('TopStore.dispatchApTimeAction(): updating time state');
                    // we want to reflect time at server, not update it.
                    //const currentTs = (new Date()).getTime();
                    //const timeDiff = clientTimeMs - apTimeMs;
                    //apTimeMs = apTimeMs + timeDiff;
                    return {
                        currentApTime: apTimeMs,
                        currentApTimezone: timezone,
                        clientTimeMsAtLastServerUpdate: clientTimeMs,
                    }
                } else {
                    return null;
                }
            } else {
                console.error('dispatchApTimeAction.setStateFn(): invalid time string: ', newDateData);
                return null;
            }
        }, callBack);
    }

    private dispatchApgiAction(action: Action, callBack?: ()=>void): void {
        const newCardData: Partial<GUICCAPGIClient> = cloneDeep(action.newData);
        if (action.updateType === UpdateType.UPDATE) {
            this.appSetState((prevState: TopStoreState) => {
                let apgi: GUICCAPGIClient;
                if (Object.values(prevState.ccCards).length === 1) {
                    const aCard = Object.values(prevState.ccCards)[0] as GUICCAPGIClient;
                    // for APGI, there is only 1 "Card" in ccCards
                    if (aCard.otype === 'GUICCAPGI') {
                        apgi = {...aCard, ...newCardData};
                    } else {
                        throw Error('should not happen.  existing ccCard of type ' + aCard.otype);
                    }
                } else {
                    // Don't throw Error because this can happen on undo after APGI gets DELETE status from Server
                    // That could result in this weird state, so just ignore action.
                    return null;
                }
                return {ccCards: {'APGI': apgi}};
            }, callBack);
        } else if (action.updateType === UpdateType.DELETE) {
            // e.g. if virtual cc mode is set to NONE by user. undoable.
            this.appSetState(()=>({ccCards: {}}), callBack);
        } else {
            throw new Error('unexpected updateType' + action.updateType);
        }
    }

    private dispatchStsAction(action: Action, callBack?: ()=>void): void {
        const newCardData: Partial<GUICCSTSClient> = cloneDeep(action.newData) as Partial<GUICCSTSClient>;
        if (action.updateType === UpdateType.UPDATE) {
            this.appSetState((prevState: TopStoreState) => {
                let sts: GUICCSTSClient;
                if (Object.values(prevState.ccCards).length === 1) {
                    const aCard = Object.values(prevState.ccCards)[0] as GUICCSTSClient;
                    // for STS, there is only 1 "Card" in ccCards
                    if (aCard.otype === 'GUICCSTS') {
                        sts = {...aCard, ...newCardData};
                    } else {
                        throw Error('should not happen.  existing ccCard of type ' + aCard.otype);
                    }
                } else {
                    // This can happen on undo after STS gets DELETE status from Server
                    // That could result in this weird state, so just ignore action.
                    return null;
                }
                return {ccCards: {'STS': sts}};
            }, callBack);
        } else if (action.updateType === UpdateType.DELETE) {
            // e.g. if virtual cc mode is set to NONE by user. undoable.
            this.appSetState(()=>({ccCards: {}}), callBack);
        } else {
            throw new Error('unexpected updateType' + action.updateType);
        }
    }

    private dispatchStsChannelAction(action: Action, callBack?: ()=>void): void {
        const newChannelData: Partial<GUICCChannelClient> = cloneDeep(action.newData) as Partial<GUICCChannelClient>;
        if (action.updateType === UpdateType.UPDATE) {
            this.appSetState((prevState: TopStoreState) => {
                let sts: GUICCSTSClient;
                if (Object.values(prevState.ccCards).length === 1 &&
                    prevState.ccCards['STS'] !== null &&
                    prevState.ccCards['STS'] !== undefined) {
                    // STS has only 1 "card"
                    const theCard: GUICCSTSClient = prevState.ccCards['STS'] as GUICCSTSClient;
                    const newCard = cloneDeep(theCard);
                    let theChannel: GUICCChannelClient = newCard.channelsById[action.objectId];
                    newCard.channelsById[action.objectId] = {...theChannel, ...newChannelData};
                    return {ccCards: {'STS': newCard}};
                } else {
                    console.error('unexpected updateType: ', action.updateType);
                    return null;
                }
            }, callBack);
        } else {
            throw new Error('unexpected updateType' + action.updateType);
        }
    }


    private dispatchDotidToSzidAction(action: Action, callBack?: ()=>void): void {
        if (action.updateType === UpdateType.ADD) {
            const newHashEntries: {[dotid:string]: string} = action.newData as {[dotid:string]: string};
            this.appSetState((prevState: TopStoreState) => {
                const sensorDotidToSz: {[dotid:string]: string} = {...prevState.sensorDotidToSzId, ...newHashEntries};
                return {sensorDotidToSzId: sensorDotidToSz};
            }, callBack);
        } else if (action.updateType === UpdateType.DELETE) {
            // assume that action.objectId is a map sensor dotid
            this.appSetState((prevState: TopStoreState) => {
                let newHash = cloneDeep(prevState.sensorDotidToSzId);
                delete newHash[action.objectId];
                return {sensorDotidToSzId: newHash};
            }, callBack);
        } else {
                throw new Error('unexpected updateType: ' + action.updateType);
        }

    }

    private dispatchStsAddrMapAction(action: Action, callBack?: ()=>void): void {
        const newData: Partial<GUICCSTSClient> = cloneDeep(action.newData);
        if (action.updateType === UpdateType.UPDATE) {
            this.appSetState((prevState:TopStoreState) => {
                let stsNew = cloneDeep(prevState.ccCards);
                if (stsNew['STS'] === null || stsNew['STS'] === undefined) {
                    console.warn("cannot update STS addr map");
                    return null;
                }
                stsNew['STS'].addrMap = {...newData.addrMap};
                return {ccCards: stsNew};
            }, callBack);
        } else {
            throw new Error('unexpected updateType' + action.updateType);
        }
    }

    /**
     * this method handles generic update action for any
     * topKey of TopStoreState that does not use action.objectId
     */
    private dispatchGenericUpdateAction(topKey: keyof TopStoreState, action: Action, callBack?: ()=>void): void {
        if (action.updateType === UpdateType.UPDATE) {
            const newData: MapSettings|APGIChannelIdClient|STSChannelIdClient = cloneDeep(action.newData);
            this.appSetState((prevState: TopStoreState) => {
                let newValue: MapSettings|APGIChannelIdClient|STSChannelIdClient = cloneDeep(prevState[topKey]);
                newValue = {...newValue, ...newData};
                return {[topKey]: newValue};
            }, callBack);
        } else if (action.updateType === UpdateType.ADD) {
            const newData: Balloon[]|Hilight[]|Arrow[] = cloneDeep(action.newData);
            this.appSetState((prevState: TopStoreState) => {
                let newValue: Balloon[]|Hilight[]|Arrow[] = newData;
                return {[topKey]: newValue};
            }, callBack);
        } else {
            throw new Error('unexpected updateType' + action.updateType);
        }
    }

    /** Work here to clear Selected if cccard/radio is selected when deleted!!! */
    private clearDeletedDeviceFromSelected(type: ObjectType, dotid: String): Selected {
        let updatedSelected = cloneDeep(this.state.selected)
        if (this.state.selected !== null && this.state.selected !== undefined) {
            if (this.state.selected.selectedDeviceType === ObjectType.RADIO || this.state.selected.selectedDeviceType === ObjectType.CCCARD) {
                if (this.state.selected.selectedDeviceType === type && this.state.selected.selectedDotid === dotid) {
                    updatedSelected = null;
                }
            }
            else if (this.state.selected.selectedDeviceType === ObjectType.SDLC_BANK || this.state.selected.selectedDeviceType === ObjectType.STS ||
                    this.state.selected.selectedDeviceType === ObjectType.APGI) {
                if (this.state.selected.selectedDeviceType === type) {
                    updatedSelected = null;
                }
            }
        }
        return updatedSelected;
    }

    private removeLinksWithInvalidDstId(mapDevice: Mappable, prevState: TopStoreState): Mappable {
        if (mapDevice === null || mapDevice === undefined ||
            mapDevice.info === null || mapDevice.info === undefined) {
            return mapDevice;
        }
        let updatedMapDevice: Mappable = cloneDeep(mapDevice);
        if (updatedMapDevice.info.rfLink !== null && updatedMapDevice.info.rfLink !== undefined) {
            const dstId: string = updatedMapDevice.info.rfLink.dstId;
            if ((prevState.mapRepeaters[dstId] === null || prevState.mapRepeaters[dstId] === undefined) &&
                (prevState.radios[dstId] === null || prevState.radios[dstId] === undefined)) {
                updatedMapDevice.info.rfLink = undefined;
            }
        }
        if (Object.keys(prevState.ccCards).length > 0) {
            const aCard = Object.values(prevState.ccCards)[0];
            let channels: {[channelNumber: string]: GUICCChannel} = {};
            switch (aCard.otype) {
                case 'GUICCCard':
                    for (let ccLinkIndex = 0; ccLinkIndex < updatedMapDevice.info.ccLinks.length; ++ccLinkIndex) {
                        let ccLink = updatedMapDevice.info.ccLinks[ccLinkIndex]
                        let ccChannel = ccLink.dstId
                        let ccCardName = ccChannel.slice(0, ccChannel.length-5)
                        if (prevState.ccCards[ccCardName] === null || prevState.ccCards[ccCardName] === undefined) {
                            updatedMapDevice.info.ccLinks.splice(ccLinkIndex, 1);
                            --ccLinkIndex;
                        }
                    }
                    return updatedMapDevice;
                case 'GUICCSDLC':
                    channels = prevState.ccCards['SDLC'].channelsById

                    break;
                case 'GUICCAPGI':
                    channels = prevState.ccCards['APGI'].channelsById
                    break;
                case 'GUICCSTS':
                    channels = prevState.ccCards['STS'].channelsById
                    break;
                default:
                    break;
            }

            if (channels !== null && channels !== undefined) {
                for (let ccLinkIndex = 0; ccLinkIndex < updatedMapDevice.info.ccLinks.length; ++ccLinkIndex) {
                    let ccLink = updatedMapDevice.info.ccLinks[ccLinkIndex]
                    let ccChannel = ccLink.dstId
                    if (channels[ccChannel] === null || channels[ccChannel] === undefined) {
                        updatedMapDevice.info.ccLinks.splice(ccLinkIndex, 1);
                        --ccLinkIndex;
                    }
                }
            }
        }
        else {
            updatedMapDevice.info.ccLinks = []
        }
        return updatedMapDevice;
    }

    /**
     * This method is the inverse of dispatch().
     * It is used to UNDO an Action.
     * @see dispatch
     */
    public reverse(action: Action, callBack?: ()=>void): void {

        let revisedAction: Action = action;
        if (action.origDataDynamicFrom !== undefined) {
            // so far, this is only used in case where action.updateType === DELETE
            if (action.updateType !== UpdateType.DELETE) {
                throw new Error('unexpected updateType when origDataDynamicFrom defined');
            }
            revisedAction = this.fixUpOrigDataDynamically(action);
            console.debug('reverse(): after fixup, revisedAction=', revisedAction, 'action=', action);
        }

        const deviceType: ObjectType = revisedAction.objectType;
        switch (deviceType) {
            case ObjectType.SENSOR_ZONE:
                this.reverseSzAction(revisedAction, callBack);
                break;

            case ObjectType.MAP_SENSOR:
                this.reverseMapSensorAction(revisedAction, callBack);
                break;

            case ObjectType.TRAY_SENSOR:
            case ObjectType.TRAY_REPEATER:
                this.reverseTrayDeviceAction(revisedAction, callBack);
                break;

            case ObjectType.RADIO:
                this.reverseRadioAction(revisedAction, callBack);
                break;

            case ObjectType.MAP_REPEATER:
                this.reverseMapRepeaterAction(revisedAction, callBack);
                break;

            case ObjectType.AP:
                this.reverseAPAction(revisedAction, callBack);
                break;

            case ObjectType.CCCARD:
                this.reverseCcCardAction(revisedAction, callBack);
                break;

            case ObjectType.CC_CHANNEL:
                this.reverseCcChannelAction(revisedAction, callBack);
                break;

            // Not used in drag-drop. covered by CC_CHANNEL case above.
            // But is used when modifying channel properties in InfoPanel.

            case ObjectType.CC_LINK:
                this.reverseCcLinkAction(revisedAction, callBack);
                break;
            
            case ObjectType.SDLC_CHANNEL:
                this.reverseSdlcChannelAction(revisedAction, callBack);
                break;

            case ObjectType.SELECTED:
                this.reverseSelectedAction(revisedAction, callBack);
                break;

            case ObjectType.VALIDATION_ERRORS:
                throw new Error('Should never be undoing a call to update validationErrors');

            case ObjectType.DOTID_TO_SZID:
                if (revisedAction.updateType === UpdateType.UPDATE ||
                    revisedAction.updateType === UpdateType.ADD ||
                    revisedAction.updateType === UpdateType.DELETE) {
                    this.appSetState((prevState: TopStoreState) => {
                        const origHash = revisedAction.origData as {[dotid:string]: string};
                        return {sensorDotidToSzId: origHash};
                    }, callBack);
                } else {
                    throw new Error('unexpected updateType: ' + revisedAction.updateType);
                }
                break;

            case ObjectType.MAP_SETTINGS:
                this.reverseMapSettingsAction(revisedAction, callBack);
                break;

            case ObjectType.APGI:
                this.reverseApgiAction(revisedAction, callBack);
                break;
            case ObjectType.STS:
                this.reverseStsAction(revisedAction, callBack);
                break;

            case ObjectType.APGI_TEMP_CHANNEL:
                this.reverseApgiTempAction(revisedAction, callBack);
                break;
            case ObjectType.STS_TEMP_CHANNEL:
                this.reverseStsTempAction(revisedAction, callBack);
                break;
            case ObjectType.STS_ADDR_MAP:
                this.reverseStsAddrMapAction(revisedAction, callBack);
                break;

            case ObjectType.USERID:
                this.appSetState((prevState: TopStoreState) => {
                    if (revisedAction.updateType === UpdateType.UPDATE) {
                        const userid: {[key:string]:string} = revisedAction.origData as {[key:string]:string};
                        return userid;
                    } else {
                        throw new Error('unexpected updateType');
                    }
                }, callBack);
                break;

            case ObjectType.PASSWORD:
                this.appSetState((prevState: TopStoreState) => {
                    if (revisedAction.updateType === UpdateType.UPDATE) {
                        const pw:  {[key:string]:string} = revisedAction.origData as  {[key:string]:string};
                        return pw;
                    } else {
                        throw new Error('unexpected updateType');
                    }
                }, callBack);
                break;

            default:
                throw new Error('unexpected objectType' + deviceType);
        }
    }

    /**
     * This is used during UNDO, particularly when moving between tray/map.
     * Want to update origData to have the *latest* server-only fields available,
     * relying on what is in the action.origData itself only for info fields,
     * because server-only fields might have changed meanwhile, due to changes coming in from server.
     * TODO: do we need to merge in ALL user-modifiable fields?
     *       Currently only merging in info and its subfields.
     */
    private fixUpOrigDataDynamically(action: Action): Action {
        console.debug('fixUpOrigDataDynamically(): action=', action);
        let newAction = cloneDeep(action);
        if (newAction.origData === null || newAction.origData === undefined) {
            console.error('fixUpOrigDataDynamically(): unexpected null or undefined origData when origDataDynamicFrom is defined');
        } else {
            // assert action.origData is Mappable when origDataDynamicFrom is defined
            const origData: Mappable = newAction.origData as Mappable;
            if (origData.id === null || origData.id === undefined || origData.id === '') {
                console.error('fixUpOrigDataDynamically(): invalid origData.id=', origData.id);
                return newAction;
            }
            switch (action.origDataDynamicFrom) {
                case ObjectType.MAP_REPEATER:
                    newAction.origData = {
                        ...this.state.mapRepeaters[origData.id],
                        info: newAction.origData.info,
                    };
                    break;
                case ObjectType.MAP_SENSOR:
                    newAction.origData = {
                        ...this.state.mapSensors[origData.id],
                        info: newAction.origData.info,
                    };
                    break;
                case ObjectType.TRAY_REPEATER:
                case ObjectType.TRAY_SENSOR:
                    // TODO: does it get purged of links?
                    newAction.origData = {
                        ...this.state.trayDevices[origData.id],
                        info: newAction.origData.info,
                    };
                    break;
                default:
                    console.error('fixUpOrigDataDynamically(): unexpected action.origDataDynamicFrom', action.origDataDynamicFrom);
                    break;
            }
            if (newAction.origData === undefined || newAction.origData === null) {
                console.error('fixUpOrigDataDynamically(): newAction.origData is null or undefined');
            }
            console.debug('fixUpOrigDataDynamically(): after fixup of origDataDynamicFrom: newAction.origData=', newAction.origData);
        }
        return newAction;
    }

    /**
     * This is used when doing a REDO, particularly when moving between tray/map.
     * Want to update newData to be the *latest* value available for server-only fields,
     * relying on what is in the action.newData itself only for user-modifiable fields,
     * because server-only fields might have changed meanwhile, due to changes coming in from server.
     */
    private fixUpNewDataDynamically(action: Action): Action {
        console.debug('fixUpNewDataDynamically(): action=', action);
        let newAction = cloneDeep(action);
        if (newAction.newData === null || newAction.newData === undefined) {
            console.error('fixUpNewDataDynamically(): unexpected null or undefined newData when newDataDynamicFrom is defined');
        } else {
            // assert action.newData is Mappable when newDataDynamicFrom is defined
            const newData: Mappable = newAction.newData as Mappable;
            if (newData.id === undefined || newData.id === null || newData.id === '') {
                console.error('fixUpNewDataDynamically(): unexpected  newData.id:', newData.id);
            }
            switch (action.newDataDynamicFrom) {
                case ObjectType.MAP_REPEATER:
                    newAction.newData = {
                        ...this.state.mapRepeaters[newData.id],
                        info: newAction.newData.info,
                    };
                    break;
                case ObjectType.MAP_SENSOR:
                    newAction.newData = {
                        ...this.state.mapSensors[newData.id],
                        info: newAction.newData.info,
                    }
                    break;
                case ObjectType.TRAY_REPEATER:
                case ObjectType.TRAY_SENSOR:
                    // TODO: does it get purged of links?
                    newAction.newData = {
                        ...this.state.trayDevices[newData.id],
                        info: newAction.newData.info,
                    }
                    break;
                default:
                    console.error('fixUpNewDataDynamically(): unexpected action.newDataDynamicFrom', action.newDataDynamicFrom);
                    break;
            }
            if (newAction.newData === undefined || newAction.newData === null) {
                console.error('fixUpNewDataDynamically(): newAction.newData is null or undefined');
            }
            console.debug('fixUpNewDataDynamically(): after fixup of newDataDynamicFrom: newAction.newData=', newAction.newData);
        }
        return newAction;
    }

    private reverseSzAction(action: Action, callBack?: ()=>void): void {
        const origData = action.origData;
        const deviceId: string = action.objectId;

        switch (action.updateType) {
            case UpdateType.ADD:
                this.appSetState((prevState: TopStoreState) => {
                    const szs:{[szid: string]: GUISZClient} = prevState.sensorZones;
                    delete szs[deviceId];
                    return {sensorZones: szs};
                }, callBack);
                break;

            case UpdateType.UPDATE:
                this.appSetState((prevState: TopStoreState) => {
                    const origSzData = origData as Partial<GUISZClient>;
                    let szs = prevState.sensorZones;
                    szs[deviceId] = {...szs[deviceId], ...origSzData};
                    return {sensorZones: szs};
                }, callBack);
                break;

            case UpdateType.DELETE:
                this.appSetState((prevState: TopStoreState) => {
                    const origSzData = origData as Partial<GUISZClient>;
                    let szs = {...prevState.sensorZones};
                    szs[deviceId] = {...szs[deviceId], ...origSzData};
                    return {sensorZones: szs};
                }, callBack);
                break;

            default:
                throw new Error('unexpected updateType: ' + action.updateType);
        }
    }

    private reverseMapSensorAction(action: Action, callBack?: ()=>void): void {
        const origData = action.origData;
        const deviceId: string = action.objectId;

        switch (action.updateType) {
            case UpdateType.ADD:
                this.appSetState((prevState: TopStoreState) => {
                    let mapSensors = cloneDeep(prevState.mapSensors);
                    delete mapSensors[deviceId];
                    return {mapSensors: mapSensors};
                }, callBack);
                break;
            case UpdateType.UPDATE:
                this.appSetState((prevState: TopStoreState) => {
                    const origSensorData = origData as GUISensorClient;
                    let mapSensors = cloneDeep(prevState.mapSensors);
                    const origSensor: GUISensorClient = {...mapSensors[action.objectId], ...origSensorData};
                    // In case a Radio or Repeater was deleted, purge RF, CC Links
                    let purgedOrigSensor: Mappable = this.removeLinksWithInvalidDstId(origSensor, prevState);
                    console.debug('reverseMapSensorAction(): origSensorData=', origSensorData, 'origSensor=', origSensor, 'purgedOrigSensor=', purgedOrigSensor);
                    mapSensors[deviceId] = {...mapSensors[deviceId], ...purgedOrigSensor};
                    return {mapSensors: mapSensors};
                }, callBack);
                break;
            case UpdateType.DELETE:
                // add back the deleted Sensor
                this.appSetState((prevState: TopStoreState) => {
                    const origSensorData = origData as GUISensorClient;
                    let mapSensors = cloneDeep(prevState.mapSensors);
                    mapSensors[deviceId] = origSensorData;
                    return {mapSensors: mapSensors};
                }, callBack);
                break;
            default:
                // assert: updateType is ADD or UPDATE
                throw new Error('unexpected updateType: ' + action.updateType);
        }
    }
    private reverseMapRepeaterAction(action: Action, callBack?: ()=>void): void {
        const origRepeater: GUIRepeaterClient = cloneDeep(action.origData) as GUIRepeaterClient;
        const repeaterId: string = action.objectId;

        switch (action.updateType) {
            case UpdateType.ADD:
                this.appSetState((prevState: TopStoreState) => {
                    let mapRepeaters = cloneDeep(prevState.mapRepeaters);
                    delete mapRepeaters[repeaterId];
                    return {mapRepeaters: mapRepeaters};
                }, callBack);
                break;

            case UpdateType.UPDATE:
                this.appSetState((prevState: TopStoreState) => {
                    let repeaters = cloneDeep(prevState.mapRepeaters);
                    //In case a Radio was Deleted, verify RF Links
                    const updatedRepeater: GUIRepeaterClient = {...repeaters[action.objectId], ...origRepeater};
                    let amendedOrigRepeater = this.removeLinksWithInvalidDstId(updatedRepeater, prevState);
                    // other data changes, or move location
                    repeaters[repeaterId] = {...repeaters[repeaterId], ...amendedOrigRepeater};
                    return {mapRepeaters: repeaters};
                }, callBack);
                break;

            case UpdateType.DELETE:
                // add back the deleted Repeater
                this.appSetState((prevState: TopStoreState) => {
                    let mapRepeaters = cloneDeep(prevState.mapRepeaters);
                    mapRepeaters[repeaterId] = origRepeater;
                    return {
                        mapRepeaters: mapRepeaters,
                    };
                }, callBack);
                break;

            default:
                throw new Error('unexpected updateType: ' + action.updateType);
        }
    }
    
    private reverseTrayDeviceAction(action: Action, callBack?: ()=>void): void {
        const origData = action.origData;

        switch (action.updateType) {
            case UpdateType.DELETE:
                this.appSetState((prevState: TopStoreState) => {
                    let trayDevices = cloneDeep(prevState.trayDevices);
                    // add back the original tray sensor
                    trayDevices[action.objectId] = origData;
                    // reorder tray sensors
                    TopStore.orderTray(trayDevices);
                    return {trayDevices: trayDevices};
                }, callBack);
                break;
            case UpdateType.UPDATE:
                this.appSetState((prevState: TopStoreState) => {
                    let trayDevices = cloneDeep(prevState.trayDevices);
                    const origTrayDevice: GUISensorClient | GUIRepeaterClient = {...trayDevices[action.objectId], ...cloneDeep(origData)};
                    // add the traySensor with dotid
                    trayDevices[action.objectId] = origTrayDevice;
                    // reorder tray devices by altering their x-coordinates
                    // TODO: probably do not need to sort on UPDATE
                    TopStore.orderTray(trayDevices);
                    return {trayDevices: trayDevices};
                }, callBack);

                // this.appSetState((prevState: TopStoreState) => {
                //     let trayDevices = cloneDeep(prevState.trayDevices);
                //     // add back the original tray sensor
                //     trayDevices[action.objectId] = origData;
                //     // reorder tray sensors
                //     TopStore.orderTray(trayDevices);
                //     return {trayDevices: trayDevices};
                // }, callBack);
                break;
            case UpdateType.ADD:
                this.appSetState((prevState: TopStoreState) => {
                    let trayDevices = cloneDeep(prevState.trayDevices);
                    // remove the added tray sensor
                    delete trayDevices[action.objectId];
                    // reorder tray sensors
                    TopStore.orderTray(trayDevices);
                    return {trayDevices: trayDevices};
                }, callBack);
                break;

            default:
                throw new Error('unexpected updateType' + action.updateType);
        }
    }
    private reverseRadioAction(action: Action, callBack?: ()=>void): void {
        const origData = action.origData;

        if (action.updateType === UpdateType.UPDATE) {
            this.appSetState((prevState: TopStoreState) => {
                const origRadio: GUIRadioClient = origData as GUIRadioClient;
                let radios = cloneDeep(prevState.radios);
                //Make sure this Radio was not Deleted
                if (radios[action.objectId] === null || radios[action.objectId] === undefined) {
                    // This is one of the Undo actions we do not want to allow,
                    // because it is already deleted, presumably from Server!
                    // So just ignore.
                    return {radios: radios};
                }
                // other data changes, or move location
                radios[action.objectId] = {...radios[action.objectId], ...origRadio};
                return {radios: radios};
            }, callBack);
        } else if (action.updateType === UpdateType.DELETE) {
            console.error('unexpected update type: delete of radio');
            //ignore == this should never be a user gesture
            return;
        } else {
            throw new Error('unexpected updateType: ' + action.updateType);
        }
    }
    private reverseAPAction(action: Action, callBack?: ()=>void): void {
        const origData = action.origData;

        if (action.updateType === UpdateType.UPDATE) {
            this.appSetState((prevState: TopStoreState) => {
                const ap = {...cloneDeep(prevState.ap), ...(origData as GUIAPConfig)};
                return {ap: ap};
            }, callBack)
        } else {
            throw new Error('unexpected updateType: ' + action.updateType);
        }
    }

    private reverseCcCardAction(action: Action, callBack?: ()=>void): void {
        const origCard = action.origData as GUICCInterfaceBaseClient;

        if (action.updateType === UpdateType.ADD) {
            this.dispatchCcCardDelete(action.objectId, true);
        } else if (action.updateType === UpdateType.UPDATE) {
            this.dispatchCcCardUpdate(action.objectId, origCard, callBack);
        } else if (action.updateType === UpdateType.DELETE) {
            this.dispatchCcCardAdd(action.objectId, origCard, callBack);
        } else {
            throw new Error('unexpected updateType' + action.updateType);
        }
    }

    private reverseCcChannelAction(action: Action, callBack?: ()=>void): void {
        const origChannelData: Partial<GUICCChannelBase> = cloneDeep(action.origData);
        // changes to a single channel of a CC Card of any type:
        if (action.updateType === UpdateType.UPDATE) {
            this.appSetState((prevState: TopStoreState) => {
                if (Object.keys(prevState.ccCards).length === 0) {
                    // could happen due to server side delete
                    console.warn('cannot undo in this case because no CC cards. doing nothing');
                    return null;
                }
                let chId = action.objectId; // e.g. S3-S15-CH_2
                let channelType: ObjectType = this.getChannelType(chId);
                let cardId: string = MapAndTray.getCardIdFromChannelId(chId, channelType);  // e.g. S3-S15
                let ccCards = cloneDeep(prevState.ccCards);
                if (ccCards[cardId] !== null && ccCards[cardId] !== undefined) {
                    ccCards[cardId].channelsById[chId] = {...ccCards[cardId].channelsById[chId], ...origChannelData};
                }
                return {ccCards: ccCards};
            }, callBack);
        } else {
            throw new Error('unexpected updateType: ' + action.updateType);
        }
    }

    private reverseCcLinkAction(action: Action, callBack?: ()=>void): void {
        const origChannelData: Partial<GUICCChannelBase> = cloneDeep(action.origData);
        // changes to a single channel of a CC Card of any type:
        if (action.updateType === UpdateType.UPDATE) {
            this.appSetState((prevState: TopStoreState) => {
                if (Object.keys(prevState.ccCards).length === 0) {
                    // could happen due to server side delete
                    console.warn('cannot undo in this case because no CC cards. doing nothing');
                    return null;
                }
                let chId = action.objectId; // e.g. S3-S15-CH_2
                let channelType: ObjectType = this.getChannelType(chId);
                let cardId: string = MapAndTray.getCardIdFromChannelId(chId, channelType);  // e.g. S3-S15
                let ccCards = cloneDeep(prevState.ccCards);
                let sensorFailSafe = ccCards[cardId].channelsById[chId].sensorFailSafe;
                let newSsFailSafe = {...sensorFailSafe, ...origChannelData};
                if (ccCards[cardId] !== null && ccCards[cardId] !== undefined) {
                    ccCards[cardId].channelsById[chId] = {...ccCards[cardId].channelsById[chId], 'sensorFailSafe':newSsFailSafe};
                }
                return {ccCards: ccCards};
            }, callBack);
        } else {
            throw new Error('unexpected updateType: ' + action.updateType);
        }
    }

    private reverseSdlcChannelAction(action: Action, callBack?: ()=>void): void {
        const origSdlcChannelData: Partial<GUICCChannel> = cloneDeep(action.origData);

        // changes to a single channel of a SDLC device
        if (action.updateType === UpdateType.UPDATE) {
            let chId = action.objectId; // e.g. B3-CH_16

            this.appSetState((prevState: TopStoreState) => {
                let ccCards = cloneDeep(prevState.ccCards);
                ccCards['SDLC'].channelsById[chId] = {
                    ...ccCards['SDLC'].channelsById[chId],
                    ...origSdlcChannelData
                };
                return {ccCards: ccCards};
            }, callBack);
        } else {
            throw new Error('unexpected updateType: ' + action.updateType);
        }
    }

    private selectedDeviceHasBeenRemoved(selected: Selected | null): boolean {
        if (selected !== null && selected !== undefined && selected.selectedDotid !== null) {
            switch(selected.selectedDeviceType) {
                case ObjectType.RADIO:
                    if (this.state.radios[selected.selectedDotid] === null ||
                        this.state.radios[selected.selectedDotid] === undefined) {
                        console.warn("cannot reverse selected to deleted Radio")
                        return true;
                    }
                    break;
                case ObjectType.SDLC_BANK:
                    //SDLC is different from others because selectedDotid is a Bank number
                    if (this.state.ccCards[selected.selectedDotid] === null ||
                        this.state.ccCards['SDLC'] === undefined) {
                        console.warn("cannot reverse selected to deleted ccCard ", selected.selectedDotid)
                        return true;
                    }
                    break;
                case ObjectType.CCCARD:
                case ObjectType.APGI:
                case ObjectType.STS:
                    if (this.state.ccCards[selected.selectedDotid] === null ||
                        this.state.ccCards[selected.selectedDotid] === undefined) {
                        console.warn("cannot reverse selected to deleted ccCard ", selected.selectedDotid)
                        return true;
                    }
                    break;
                default:
                    break;
            }
        }
        return false;
    }

    private reverseSelectedAction(action: Action, callBack?: ()=>void): void {
        const origSelectedData: Selected = cloneDeep(action.origData);

        // assert: updateType is UPDATE
        if (action.updateType !== UpdateType.UPDATE) {
            throw new Error('unexpected updateType: ' + action.updateType);
        }
        this.appSetState((prevState: TopStoreState) => {
            if (this.selectedDeviceHasBeenRemoved(origSelectedData)) {
                return {selected: null};
            }
            return {selected: {...prevState.selected, ...origSelectedData}};
        }, callBack);
    }
    private reverseApgiAction(action: Action, callBack?: ()=>void): void {
        if (action.updateType === UpdateType.UPDATE) {
            const origApgiData: Partial<GUICCAPGIClient> = cloneDeep(action.origData);
            this.appSetState((prevState: TopStoreState) => {
                let apgi: GUICCAPGIClient;
                if (Object.values(prevState.ccCards).length > 0) {
                    const aCard = Object.values(prevState.ccCards)[0] as GUICCAPGIClient;
                    // for APGI, there is only 1 "Card" in ccCards
                    if (aCard.otype === 'GUICCAPGI' &&
                        Object.values(prevState.ccCards).length === 1) {
                        apgi = {...aCard, ...origApgiData};
                        return {ccCards: {'APGI': apgi}};
                    } else {
                        // there is a non-apgi cc card.
                        throw new Error('should never happen');
                    }
                } else {
                    // This gets hit if an APGI gets Status DELETE and user tried to Undo
                    console.warn('cannot undo update in this case because no CC cards. doing nothing');
                    return null;
                }
            }, callBack);
        } else if (action.updateType === UpdateType.DELETE) {
            const origApgiData: GUICCAPGIClient = cloneDeep(action.origData);
            // e.g. if virtual cc mode was set to NONE by user. undoing.
            this.appSetState(()=>({ccCards: {'APGI': origApgiData}}), callBack);
        } else {
            throw new Error('unexpected updateType: ' + action.updateType);
        }
    }
    private reverseStsAction(action: Action, callBack?: ()=>void): void {
        if (action.updateType === UpdateType.UPDATE) {
            const origStsData: Partial<GUICCSTSClient> = cloneDeep(action.origData);
            this.appSetState((prevState: TopStoreState) => {
                let sts: GUICCSTSClient;
                if (Object.values(prevState.ccCards).length > 0) {
                    const aCard = Object.values(prevState.ccCards)[0] as GUICCSTSClient;
                    // for APGI, there is only 1 "Card" in ccCards
                    if (aCard.otype === 'GUICCSTS' &&
                        Object.values(prevState.ccCards).length === 1) {
                        sts = {...aCard, ...origStsData};
                        return {ccCards: {'STS': sts}};
                    } else {
                        // there is a non-sts cc card.
                        throw new Error('should never happen');
                    }
                } else {
                    //This gets hit if a STS gets Status DELETE and user tried to Undo
                    console.warn('cannot undo in this case because no CC cards. doing nothing');
                    return null;
                }
            }, callBack);
        } else if (action.updateType === UpdateType.DELETE) {
            const origStsData: GUICCSTSClient = cloneDeep(action.origData);
            // e.g. if virtual cc mode was set to NONE by user. undoing.
            this.appSetState(()=>({ccCards: {'STS': origStsData}}), callBack);
        } else {
            throw new Error('unexpected updateType: ' + action.updateType);
        }
    }
    private reverseApgiTempAction(action: Action, callBack?: ()=>void): void {
        const origData = cloneDeep(action.origData) as APGIChannelIdClient;

        if (action.updateType === UpdateType.UPDATE) {
            this.appSetState((prevState:TopStoreState) => {
                if (prevState.ccCards['APGI'] === null ||
                    prevState.ccCards['APGI'] === undefined ||
                    Object.keys(prevState.ccCards).length < 0) {
                    console.warn("Cannot undo APGI temp action");
                    return null;
                }
                let apgiChannelTemp = {...prevState.apgiChannelTemp};
                apgiChannelTemp = {...apgiChannelTemp, ...origData};
                return {apgiChannelTemp: apgiChannelTemp};
            });
        } else {
            throw new Error('unexpected updateType' + action.updateType);
        }
    }
    private reverseStsTempAction(action: Action, callBack?: ()=>void): void {
        const origData = cloneDeep(action.origData) as STSChannelIdClient;

        if (action.updateType === UpdateType.UPDATE) {
            this.appSetState((prevState:TopStoreState) => {
                if (prevState.ccCards['STS'] === null ||
                    prevState.ccCards['STS'] === undefined ||
                    Object.keys(prevState.ccCards).length < 0) {
                    console.warn("Cannot undo STS temp action");
                    return null;
                }
                let stsChannelTemp = {...prevState.stsChannelTemp};
                stsChannelTemp = {...stsChannelTemp, ...origData};
                return {stsChannelTemp: stsChannelTemp};
            });
        } else {
            throw new Error('unexpected updateType' + action.updateType);
        }
    }
    private reverseStsAddrMapAction(action: Action, callBack?: ()=>void): void {
        const origData = cloneDeep(action.origData) as Partial<GUICCSTSClient>;

        if (action.updateType === UpdateType.UPDATE) {
            this.appSetState((prevState:TopStoreState) => {
                if (prevState.ccCards['STS'] === null ||
                    prevState.ccCards['STS'] === undefined ||
                    Object.keys(prevState.ccCards).length < 0) {
                    console.warn("Cannot undo STS addr map action");
                    return null;
                }
                let stsNew = cloneDeep(prevState.ccCards);
                stsNew['STS'].addrMap = {...origData.addrMap};
                return {ccCards: stsNew};
            });
        } else {
            throw new Error('unexpected updateType' + action.updateType);
        }
    }

    private reverseInitConfigAction(action: Action, callBack?: ()=>void): void {
        const origData: Partial<GUIAPConfigClient> = cloneDeep(action.origData);

        if (action.updateType === UpdateType.UPDATE) {
            this.appSetState((prevState:TopStoreState) => {
                let configNew = cloneDeep(prevState.ap) as GUIAPConfigClient;
                configNew = {...configNew, ...origData};
                return {ap: configNew};
            });
        } else {
            throw new Error('unexpected updateType' + action.updateType);
        }
    }

    private reverseMapSettingsAction(action: Action, callBack?: ()=>void): void {
        const origData: Partial<MapSettings> = cloneDeep(action.origData) as Partial<MapSettings>;

        if (action.updateType === UpdateType.UPDATE) {
            this.appSetState((prevState: TopStoreState) => {
                let mapSettings: MapSettings = {...prevState.mapSettings};
                mapSettings = {...mapSettings, ...origData};
                return {mapSettings: mapSettings};
            }, callBack);
        } else {
            throw new Error('unexpected updateType' + action.updateType);
        }
    }

    /**
     * updates the param sz in place, setting centers to fixed offsets from sz position

    private updateSensorCenters(sz: GUISZClient) {
        let sensorIndex: number = 0;
        for (let sensorId of sz.sensorIds) {
            const sensor: GUISensorClient = this.getTopState().mapSensors[sensorId];
            const sensorPosition = MapAndTray.SENSOR_POSITIONS_WITHIN_SZ[sz.sensorIds.length][sensorIndex];
            sensor.info.position.x = sz.info.position.x + sensorPosition;
            sensor.info.position.y = sz.info.position.y;
            sensorIndex++;
        }
    }
     */

    /**
     * This method takes a hash of trayDevices and rewrites their info.position.x
     * so the devices are ordered first by type (Repeater, then Sensor), then
     * by dotid.
     * TODO: it could be argued that this method should be outside TopStore,
     *       as TopStore should be more low-level.
     * @param trayDevices a hash from dotid to GUISensor or GUIRepeater
     */
    static orderTray(trayDevices: {[dotId: string]: Mappable}):void {
        let deviceIds: Array<string> = this.sortTrayDevices(trayDevices);
        let deviceIndex = 0;
        const deviceInitialX = 20;
        const deviceIconOffsetX = 43;
        for (const deviceId of deviceIds) {
            const device:Mappable = trayDevices[deviceId];
            device.info.position.x = deviceInitialX + (deviceIconOffsetX * deviceIndex);
            device.info.position.y = 20;
            deviceIndex++;
        }
    }

    /** Created separate method to reference from MapAndTray */
    static sortTrayDevices(trayDevices: {[dotId: string]: Mappable}): Array<string> {
        let deviceIds: Array<string> = Object.keys(trayDevices);
        deviceIds.sort((dev1:string, dev2:string) => {
            const device1:Mappable = trayDevices[dev1];
            const device2:Mappable = trayDevices[dev2];
            if (device1.otype === device2.otype) {
                return Number('0x' + device1.id) - Number('0x' + device2.id);
            } else if (device1.otype === 'GUISensor' && device2.otype === 'GUIRepeater') {
                return 1;
            } else if (device1.otype === 'GUIRepeater' && device2.otype === 'GUISensor') {
                return -1;
            } else {
                console.error('unexpected types in tray: ', device1.otype, device2.otype);
                return 1;
            }
        });
        return deviceIds;
    }

    /**
     * Order the cards in the cabinet by their cardIds,
     * using their y positions to set their order.
     * This only happens for EX cards.  All other types have 1 card only.
     */
    static orderCabinet(ccCards: {[cardId: string]: GUICCInterfaceBaseClient}):void {
        let cardIds: Array<string> = Object.keys(ccCards);
        if (cardIds.length > 1) {
            cardIds.sort(TopStore.exCardIdComparator);
        }
        let cardIndex = 0;
        const cardInitialX = 5;
        const cardInitialY = 5;
        const cardOffsetY = 65;
        for (const cardId of cardIds) {
            const card:GUICCInterfaceBaseClient = ccCards[cardId];
            card.info.position.x = cardInitialX;
            card.info.position.y = cardInitialY + cardOffsetY * cardIndex;
            cardIndex++;
        }
    }

    /** ids are of form Snn-Smm for shelf, slot, e.g. S3-S12 */
    public static exCardIdComparator(id1: string, id2: string): number {
        const cardId1: EXCardId = TopStore.parseExCardId(id1);
        const cardId2: EXCardId = TopStore.parseExCardId(id2);
        if (cardId1.shelf > cardId2.shelf) {
            return 1;
        } else if (cardId1.shelf < cardId2.shelf) {
            return -1;
        }

        // assert: shelves are equal
        if (cardId1.slot > cardId2.slot) {
            return 1;
        } else if (cardId1.slot < cardId2.slot) {
            return -1;
        }

        // assert: ids are equal
        return 0;
    }

    public static parseExCardId(id: string): EXCardId {
        let found: RegExpMatchArray|null = id.match(/^S(\d+)-S(\d+)$/);
        if (found === null) {
            return {shelf: -1, slot: -1, };
        }
        return {
            shelf: +found[1],
            slot: +found[2],
        };
    }


    public static parseValidationErrorsKey(errorKey: string): ErrorKey {
        let result: string[] = errorKey.split('-');
        return {
            objectType: result[0] as ObjectType,
            objectId: result[1],
            fieldName: result[2],
            fieldIndex: result.length === 4 ? result[3] : undefined,
        }
    }

    public static parseValidationGlobalErrorsKey(errorKey: string): GlobalErrorKey {
        let result = errorKey.split('-');
        return {
            objectType: result[0] as ObjectType,
            objectId: result[1],
        }
    }

    /**
     * Push a new modal dialog, as represented by a ModalInfo instance, onto the modal stack.
     * TODO: might be nicer to pass an object rather than a bunch of args as params.
     * @param modalClass is either undefined, or a ModalClass, or a concatentation of ModalClasses
     * @param description is the message to be displayed. new-lines are indicated by either '\n' or '. ' in the text.
     * @param callBack is optional method to call *after* the TopStore.appSetState() for creating Modal has run.
     */
    public showModal(modalType: ModalType = ModalType.ONE_BUTTON_SUCCESS, description: string,
                     buttonLabels?: string[], buttonOnClicks?: Array<()=>void>, node?: ReactNode,
                     modalClass?: string, callBack?: ()=>void): void {
        console.debug('showModal(): description=', description,
            'modalType=', modalType, 'modalClass=', modalClass,
            'arguments=', arguments);
        // TODO: looks like TopStore.state.nextModalClass has no purpose and could be removed
        if (modalClass === undefined) {
            modalClass = this.state.nextModalClass.toString();
            this.appSetState((prevState: TopStoreState) => {
                return {nextModalClass: prevState.nextModalClass + 1};
            });
        }
        let buttonLabelsToShow: string[] = [];
        let buttonOnClicksToUse: Array<()=>void> = [];
        if (buttonLabels !== undefined) {
            buttonLabelsToShow = buttonLabels;
        } else if (modalType === ModalType.ONE_BUTTON_ERROR || ModalType.ONE_BUTTON_SUCCESS) {
            buttonLabelsToShow = ['OK'];
        }

        if (buttonOnClicks !== undefined) {
            buttonOnClicksToUse = buttonOnClicks;
        } else if (modalType === ModalType.ONE_BUTTON_ERROR || ModalType.ONE_BUTTON_SUCCESS) {
            buttonOnClicksToUse = [this.dismissModal];
        }

        const newModalInfo: ModalInfo = {
            modalType: modalType,
            modalDescription: description,
            modalLabels: buttonLabelsToShow,
            modalOnClicks: buttonOnClicksToUse,
            modalNode: node,
            modalShow: true,
            modalClass: modalClass,
        };
        this.appSetState((prevState: TopStoreState) => {
            if (modalClass !== undefined && modalClass.includes(ModalClass.VALIDATE_CREDENTIALS)) {
                let newCredentialValidationModalStack: ModalInfo[] = cloneDeep(prevState.credentialValidationModalStack);
                newCredentialValidationModalStack.push(newModalInfo);
                console.trace('showModal(): after push, credentialValidationnModalStack=', newCredentialValidationModalStack);
                return {
                    credentialValidationModalStack: newCredentialValidationModalStack
                };
            }
            let newModalStack: ModalInfo[] = cloneDeep(prevState.modalStack);
            newModalStack.push(newModalInfo);
            console.trace('showModal(): after push, modalStack=', newModalStack);
            return {
                modalStack: newModalStack
            };
        }, callBack);
    }

    /**
     * pop the top of modal Stack.
     * @param modalClass If defined, and a ModalClass, and modalClass matches top of modal stack,
     *        then pop the stack.
     *        Note: if modalClass is a click Event, just treat as if it is undefined.
     */
    public dismissModal(modalClass?: ModalClass|Event): void {
        const classToMatch: string|undefined =
            modalClass instanceof Object ? undefined : modalClass as string;
        this.appSetState((prevState: TopStoreState) => {
            let newModalStack: ModalInfo[] = cloneDeep(prevState.modalStack);
            let modalStackName = "modalStack";
            if (classToMatch !== undefined && classToMatch.includes(ModalClass.VALIDATE_CREDENTIALS)) {
                newModalStack = cloneDeep(prevState.credentialValidationModalStack); 
                modalStackName =  "credentialValidationModalStack";
            }
            if (newModalStack.length === 0) {
                console.trace('dismissModal(): ', modalStackName, ' already empty');
                return null;
            }
            const topModalClass = newModalStack[newModalStack.length - 1].modalClass;
            if (classToMatch !== undefined) {
                // pop the stack if classToMatch matches a class of top Modal
                if (topModalClass !== undefined && topModalClass.includes(classToMatch)) {
                    console.trace('dismissModal(): classToMatch=', classToMatch,
                        ', about to pop stack. ', modalStackName, '=', newModalStack);
                    newModalStack.pop();

                    if (topModalClass.includes(ModalClass.VALIDATE_CREDENTIALS)) {
                        return {
                            credentialValidationModalStack: newModalStack
                        };
                    }
                    else {
                        return {
                            modalStack: newModalStack,
                        };
                    }
                } else {
                    console.trace('dismissModal(): not popping stack because class does not match',
                        classToMatch, newModalStack);
                    return null;
                }
            } else {
                // just pop the stack.  no classToMatch.
                console.trace('dismissModal(): no classToMatch. about to pop stack. modalStack=',
                    newModalStack);
                newModalStack.pop();
                return {
                    modalStack: newModalStack,
                };
            }
        });
    }

    /**
     * The same as dismissModal() except it will dismiss all matching ModalInfo occurrences
     * at ANY level of the modal stack.
     */
    public dismissAnyModal(modalClass: ModalClass|Event): void {
        const classToMatch: string|undefined =
            modalClass instanceof Object ? undefined : modalClass as string;
        if (classToMatch === undefined) {
            console.warn('dismissAnyModal(): classToMatch is undefined. doing nothing.');
            return;
        } else {
            console.debug('dismissAnyModal(): classToMatch=', classToMatch);
        }
        this.appSetState((prevState: TopStoreState) => {
            let newModalStack: ModalInfo[] = cloneDeep(prevState.modalStack);
            if (newModalStack.length === 0) {
                console.trace('dismissModal.appSetState(): modalStack already empty');
                return null;
            }
            newModalStack.forEach((modalInfo: ModalInfo, index: number) => {
                // remove from the stack if classToMatch matches a class of modalInfo
                const modalClasses: string|undefined = modalInfo.modalClass;
                if (modalClasses !== undefined && modalClasses.includes(classToMatch)) {
                    newModalStack.splice(index, 1);
                }
            });
            console.trace('dismissAnyModal.appSetState(): about to return stack. newModalStack=', newModalStack, 'classToMatch=', classToMatch);
            return {modalStack: newModalStack};
        });
    }

    /**
     * @returns true if any ModalInfo in modal stack has a class that matches modalClass
     */
    public isAnyModal(modalClass: ModalClass|Event): boolean {
        const classToMatch: string|undefined =
            modalClass instanceof Object ? undefined : modalClass as string;
        if (classToMatch === undefined) {
            console.warn('isAnyModal(): classToMatch is undefined. return false');
            return false;
        }
        const matchesClass: boolean = this.state.modalStack.some((modalInfo: ModalInfo) => {
            // remove from the stack if classToMatch matches a class of modalInfo
            const modalClasses: string|undefined = modalInfo.modalClass;
            return modalClasses !== undefined && modalClasses.includes(classToMatch);
        });
        console.trace('isAnyModal: return stack. matchesClass=', matchesClass, 'classToMatch=', classToMatch);
        return matchesClass;
    }

    /**
     * @returns the class or classes associated with the topmost ModalInfo in the Modal stack
     *          which also happen to be the class(es) that is/are rendered in html
     */
    public getTopModalClasses(): string|undefined {
        if (this.state.modalStack.length === 0) {
            return undefined;
        }
        return this.state.modalStack[this.state.modalStack.length - 1].modalClass;
    }

    /**
     * @deprecated This method is imprecise, and has the some of the same problems
     *       that having NO stack of Modals had.
     *       It would be better not to use this method at all, but rather to rely on ModalClass.
     *       Better to use dismissAnyModal(modalClass) where specifying what kind of Modal to dismiss.
     */
    public dismissAllModals(): void {
        this.appSetState((prevState: TopStoreState) => {
            if (prevState.modalStack.length === 0) {
                console.trace('dismissAllModals(): modalStack already empty');
                return null;
            }
            const newModalStack: ModalInfo[] = [];
            console.trace('dismissAllModals(): about to clear stack. modalStack=', prevState.modalStack);
            return {
                modalStack: newModalStack,
            };
        });
    }

    public renderTD2InfoNode(): ReactNode {
        return (
            <div>
                <a href="https://go.sensysnetworks.com/trafficdot">https://go.sensysnetworks.com/trafficdot</a>
            </div>
        );
    }

    /**
     * TODO: this is ineffecient in the common case.
     *       Is there a better way?
     *       This method also appears in MapAndTray.
     */
    private getChannelType(channelId: string) {
        let channelType: ObjectType = ObjectType.CC_CHANNEL;
        if (channelId.startsWith('B')) {
            channelType = ObjectType.SDLC_CHANNEL;
        } else if (Object.keys(this.state.ccCards)[0] === 'APGI') {
            channelType = ObjectType.APGI_CHANNEL;
        } else if (Object.keys(this.state.ccCards)[0] === 'STS') {
            channelType = ObjectType.STS_CHANNEL;
        }
        return channelType;
    }

    /**
     *  This method is handled not through the standard public dispatch() mechanism.
     *  And there is no reverse().
     */
    public dispatchValidationErrorsActions(actions: ValidationAction[]) {
        for (let action of actions) {
            this.dispatchValidationErrorsAction(action);
        }
    }

    /**
     *  This method is handled not through the standard public dispatch() mechanism.
     *  And there is no reverse().
     */
    private dispatchValidationErrorsAction(action: ValidationAction, callBack?: ()=>void): void {

        if (action.updateType === UpdateType.UPDATE || action.updateType === UpdateType.ADD) {
            this.appSetState((prevState: TopStoreState) => {
                let validationErrors = {...prevState.validationErrors};
                if (validationErrors[action.fieldId] === undefined) {
                    validationErrors[action.fieldId] = [action.errMsg];
                } else {
                    validationErrors[action.fieldId].push(action.errMsg);
                }
                return {validationErrors: validationErrors};
            }, callBack);
        } else if (action.updateType === UpdateType.DELETE) {
            if (action.errorOnType === undefined) {
                /*
                // clear ALL validation errors.  maybe unused.
                this.appSetState((prevState: TopStoreState) => {
                    //delete validationErrors[validationKey];
                    return {validationErrors: {}};
                });

                 */
                throw new Error('unexpected undefined errorOnType ');
            } else if (action.errorOnType !== undefined) {
                // Clear all validation errs that match the object designated by
                // action.errorOnType and action.errorOnId
                this.appSetState((prevState: TopStoreState) => {
                    let validationErrors = {...prevState.validationErrors};
                    let objectId: string = action.errorOnId!;
                    let objectType: ObjectType = action.errorOnType!;

                    for (let fieldKey of Object.keys(validationErrors)) {
                        let keyParts: ErrorKey = TopStore.parseValidationErrorsKey(fieldKey);
                        if (keyParts.objectId === objectId && keyParts.objectType === objectType) {
                            delete validationErrors[fieldKey];
                        }
                    }
                    return {validationErrors: validationErrors};
                });
            } else {
                throw new Error('unexpected state. updateType=' + action.updateType);
            }
        } else {
            throw new Error('unexpected updateType=' + action.updateType);
        }
    }


    /** this is handled not through the standard public dispatch() mechanism.  And there is no reverse(). */
    public dispatchGlobalValidationErrorsActions(actions: ValidationAction[]): void {
        for (let action of actions) {
            this.dispatchGlobalValidationErrorsAction(action);
        }
    }

    /** this is handled not through the standard public dispatch() mechanism. and there is no reverse() */
    private dispatchGlobalValidationErrorsAction(action: ValidationAction): void {
        const fieldId: string = action.fieldId;
        if (action.updateType === UpdateType.ADD || action.updateType === UpdateType.UPDATE) {
            this.appSetState((prevState: TopStoreState) => {
                let globalErrors = {...prevState.validationGlobalErrors};
                if (globalErrors[fieldId] === undefined) {
                    globalErrors[fieldId] = [action.errMsg];
                } else {
                    globalErrors[fieldId].push(action.errMsg);
                }
                return {validationGlobalErrors: globalErrors};
            });
        } else if (action.updateType === UpdateType.DELETE) {
            this.appSetState((prevState: TopStoreState) => {
                let globalErrors = {...prevState.validationGlobalErrors};
                delete globalErrors[action.fieldId];
                return {validationGlobalErrors: globalErrors};
            });
        } else {
            throw new Error('unexpected updateType: ' + action.updateType);
        }
    }

    /**
     * This is kind of the opposite of WebSocketManager.updateConfigReadonlyFields()
     * @see WebSocketManager.updateConfigReadonlyFields()
     * now:  for all uses, we further simplified:
     *       just return the info attribute (and its sub-attributes).
     *       Since that is all that changes in MapAndTray gestures.
     * Idea: instead of using manually in code, I think it could be just inserted in
     *       TopStore.dispatch() to operate on origData, if action.updateType is UPDATE.
     *       Well--I tried that and there is a problem with it--having to do with
     *       timing.  But I don't remember what the problem is.  I think the problem is
     *       that then the origData on update will not have id!
     */
    public static getInfoOf(device: GUISensorClient|GUIRepeaterClient|GUIRadioClient): {[info: string]: MapRenderInfo} {
        let userModifiableDevice = cloneDeep(device);
        switch (device.otype) {
            case "GUISensor":
                let sensor: GUISensorClient = userModifiableDevice as GUISensorClient;
                return {info: sensor.info};

            case "GUIRepeater":
                let repeater: GUIRepeaterClient = userModifiableDevice as GUIRepeaterClient;
                return {info: repeater.info};

            case "GUIRadio":
                let radio: GUIRadioClient = userModifiableDevice as GUIRadioClient;
                return {info: radio.info};

            default:
                throw Error('unexpected device.otype' + device.otype);
        }
    }


    /**
     * At the least, Client will remove all configured (on-map) devices from TopStore,
     * and maybe keep them around just in case.
     */
    public clearConfig(): void {
        console.info('TopStore.clearConfig(): starting');
        this.appSetState((prevState: TopStoreState) => {
            return {
                ap: null,
                mapSettings: {
                    showRFLinks: false,
                    showCCLinks: false,
                    showLegend: false,
                    showCabinetIcon: false,
                    cabinetIconPosition: {x:0, y:0},
                    northArrowRotationDegrees: 0,
                    textFields: {},
                },
                mapSensors: {},
                mapRepeaters: {},
                radios: {},
                sensorZones: {},
                ccCards: {},
                sensorDotidToSzId: {},
                selected: null,
                validationErrors: {},
                validationGlobalErrors: {},
                pingScanStatus: null,
                savePctComplete: null,
            };
        });
    }
    
    public resetConfig(): void {
        console.info('TopStore.resetConfig(): starting');
        this.appSetState((prevState: TopStoreState) => {
            let ccCards: { [cardid: string]: GUICCInterfaceBaseClient } = cloneDeep(prevState.ccCards);
            Object.values(ccCards).map(ccCard => {
                Object.keys(ccCard.channelsById).map(channelId => {
                    ccCard.channelsById[channelId].sensors = [];
                    ccCard.channelsById[channelId].sensorFailSafe = {};
                })
            })
            return {
                ap: null,
                mapSettings: {
                    showRFLinks: false,
                    showCCLinks: false,
                    showLegend: false,
                    showCabinetIcon: false,
                    cabinetIconPosition: {x:0, y:0},
                    northArrowRotationDegrees: 0,
                    textFields: {},
                },
                mapSensors: {},
                mapRepeaters: {},
                radios: {},
                sensorZones: {},
                ccCards: ccCards,
                sensorDotidToSzId: {},
                selected: null,
                validationErrors: {},
                validationGlobalErrors: {},
                pingScanStatus: null,
                savePctComplete: null,
            };
        });
    }

    public clearTray(): void {
        console.info('TopStore.clearTray(): starting');
        this.setState(() => {
            return {
                trayDevices: {}
            };
        });
    }

}
