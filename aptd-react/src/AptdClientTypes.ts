// TODO: consider using union types instead of enum.
//       union types have better runtime error checking,
//       but enum is iterable if that is any use.
//       Also, enum has greater IDE support (for compile-time checking).


import {Errors} from "./infoPanels/InfoPanel";
import {
    APConnection,
    APGIReportType,
    ChannelMode,
    GUIAPConfig,
    GUICCChannel,
    GUICCInterfaceBase,
    GUIChannel,
    GUIRadio,
    GUIRepeater,
    GUISensor,
    GUISensorZone,
    Interface,
    Mappable,
    ServerMessage,
    Shelf,
    Slot,
    GUIText,
    GUITechSupport,
    GUICCChannelBase,
    ConfigChangeStatus,
    GUIPoint, Antenna
} from "./AptdServerTypes";
import TopStore, {} from "./TopStore";
import {Arrow, Balloon, Hilight} from "./help/HelpEngine";
import {ReactNode} from "react";


export enum ObjectType {
    AP = 'AP',
    AP_TIME_UPDATE = 'AP_TIME_UPDATE',
    APGI = 'APGI',
    APGI_CHANNEL = 'APGI_CHANNEL',
    APGI_TEMP_CHANNEL = 'APGI_TEMP_CHANNEL',
    AWAITING_LOGIN_VALIDATION = 'AWAITING_LOGIN_VALIDATION',
    AWAITING_SAVE_RESULT = 'AWAITING_SAVE_RESULT',
    BUTTON_TOP_BAR = 'BUTTON_TOP_BAR',
    CABINET_ICON = 'CABINET_ICON',
    CC_CHANNEL = 'CC_CHANNEL',
    CC_LINK = 'CC_LINK',
    /** CCCARD used for CC cards and EX cards */
    CCCARD = 'CC_CARD',
    /** TODO: CLIENT seems misleading.  it refers to cursor type.
              Use UPLOAD_IN_PROGRESS instead. */
    CLIENT = 'CLIENT',
    CONFIGURED_DEVICES_RESOLVED = 'CONFIGURED_DEVICES_RESOLVED',
    CREDENTIALS_VALID = 'CREDENTIALS_VALID',
    DOTID_TO_SZID = 'DOTID_TO_SZID',
    DOWNLOAD_IN_PROGRESS = 'DOWNLOAD_IN_PROGRESS',
    GLOBAL_VALIDATION_ERRORS = 'GLOBAL_VALIDATION_ERRORS',
    HELP_ARROWS = 'HELP_ARROWS',
    HELP_BALLOONS = 'HELP_BALLOONS',
    HELP_HILIGHTS = 'HELP_HILIGHTS',
    IGNORE_PING_SCAN_STATUS = 'IGNORE_PING_SCAN_STATUS',
    IPK = 'IPK',
    MAP = 'MAP',
    MAP_NORTH_ARROW_ICON = 'MAP_NORTH_ARROW_ICON',
    MAP_REPEATER = 'MAP_REPEATER',
    MAP_SENSOR = 'MAP_SENSOR',
    MAP_SETTINGS = 'MAP_SETTINGS',
    MODAL = 'MODAL',
    PASSWORD = 'PASSWORD',
    PING_SCAN_STATUS = 'PING_SCAN_STATUS',
    RADIO = 'RADIO',
    REBOOT_REQUIRED_ON_SAVE = 'REBOOT_REQUIRED_ON_SAVE',
    RF_LINK = 'RF_LINK',
    SAVE_CONFIG = 'SAVE_CONFIG',
    SAVE_PERCENT_COMPLETE = 'SAVE_PERCENT_COMPLETE',
    SDLC_BANK = 'SDLC_BANK',
    SDLC_CHANNEL = 'SDLC_CHANNEL',
    SELECTED = 'SELECTED',
    SELECTED_LINK_INFO = 'SELECTED_LINK_INFO',
    SENSOR_ZONE = 'SENSOR_ZONE',
    STS = 'STS',
    STS_ADDR_MAP = 'STS_ADDR_MAP',
    STS_CHANNEL = 'STS_CHANNEL',
    STS_TEMP_CHANNEL = 'STS_TEMP_CHANNEL',
    TECH_SUPPORT = 'TECH_SUPPORT',
    TECH_SUPPORT_LOGGERS = 'TECH_SUPPORT_LOGGERS',
    TECH_SUPPORT_PROPS = 'TECH_SUPPORT_PROPS',
    TEXT_FIELD = 'TEXT_FIELD',
    TRAY = 'TRAY',
    TRAY_REPEATER = 'TRAY_REPEATER',
    TRAY_SENSOR = 'TRAY_SENSOR',
    UPLOAD_IN_PROGRESS = 'UPLOAD_IN_PROGRESS',
    USERID = 'USERID',
    VALIDATION_ERRORS = 'VALIDATION_ERRORS',
    LAST_GUI_ACTIVE_TIME = 'LAST_GUI_ACTIVE_TIME',
}

export enum ClientObjectUpdateType {
    DISABLED = 'DISABLED',
    LOADING = 'UPLOADING'
}
/**
 * In TopStore, most top level objects are a hash from string id to objects of type TopType.
 * The type TopType is used in TopStore as the type of Action.newData and Action.origData,
 * which are passed to TopStore.dispatch() and TopStore.reverse().
 */
export type TopType = GUISZClient | GUIAPConfigClient | GUISensorClient | GUIRepeaterClient |
    GUIRadioClient | GUICCInterfaceBaseClient | MapSettings |
    GUITechSupport |
    APGIChannelIdClient | STSChannelIdClient | // TODO: unclear if these are ultimately needed
    Selected | SelectedLinkInfo |
    {[ipNum:string]: string} | // TODO: for STS_ADDR_MAP and for dotidToSzId. Should we change this to just string, and use multiple calls?
    GUICCChannelBase |
    Balloon[] | Hilight[] | Arrow[] | GUIPoint |
    string | number | boolean | null;

export enum ModalType {
    TWO_BUTTON = 'TWO_BUTTON',
    /** indicates an error, has a red border, and OK button */
    ONE_BUTTON_ERROR = 'ONE_BUTTON_ERROR',
    /** indicates success or info, and has just one button, 'OK' */
    ONE_BUTTON_SUCCESS = 'ONE_BUTTON_SUCCESS',
    /** no button modal, shows a msg and blocks all user gestures */
    NO_OK = 'NO_OK',
    /** blocks all user gestures, but shows no msg at all */
    NO_MSG = 'NO_MSG',
}

export interface ModalInfo {
    modalType: ModalType,
    modalShow: boolean,
    modalDescription: string,
    modalOnClicks: Array<()=>void>,
    modalLabels: Array<string>,
    modalNode: ReactNode,
    modalClass?: string,
}

/* note: ModalClass value is also used as a css class */
export enum ModalClass {
    SAVING = 'saving',
    RECONNECTING = 'reconnecting',
    REBOOTING = 'rebooting',
    EXTERNAL_UPDATE = 'externalUpdate',
    UNSUPPORTED_CONFIG = 'unsupportedConfig',
    SAVE_COMPLETE = 'saveComplete',
    DOWNLOADING = 'downloading',
    SESSION_TIMED_OUT = 'sessionTimedOut',
    FIRMWARE_UPGRADING = 'firmwareUpgrading',
    FILE_UPLOADING = 'fileUploading',
    VALIDATE_CREDENTIALS = 'validateCredentials',
    RESETTING = 'resetting'
}

export enum TransformType {
    TRANSLATE = 'translate',
    ROTATE = 'rotate'
}

export enum UpdateType {
    ADD = 'ADD',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
}

/** determines what types user can enter into the field */
export enum CharacterType {
    INTEGER = 'INTEGER',
    FLOAT = 'FLOAT',
    NONNEGATIVE_INTEGER = 'NONNEGATIVE_INTEGER',
    NONNEGATIVE_FLOAT = 'NONNEGATIVE_FLOAT',
    DOTTED_QUAD = 'DOTTED_QUAD',
    DOTTED_QUAD_OR_HOSTNAME = 'DOTTED_QUAD_OR_HOSTNAME',
    NAME = 'NAME',
    NAME_WITH_BLANKS = 'NAME_WITH_BLANKS',
    TEXT = 'TEXT',
}

export enum HttpMethod {
    POST = 'POST',
    GET = 'GET'
}


/** represents the current state of the Selected object on Map and in InfoPanel */
export interface Selected {
    selected: any,
    selectedG: any,
    selectedDeviceType: ObjectType | null,
    selectedDotid: string | null,
    selectedSzId: string | null,
}

/** 
 * currently 0 or 1 links may be selected.
 * This is separate from the Selected info, which indicates
 * which object on map and InfoPanel is selected.  
 */
export interface SelectedLinkInfo {
    linkType: 'rfLink' | 'ccLink',
    deviceType: 'SENSOR' | 'REPEATER'
    /** deviceId is dotid of Sensor or Repeater */
    deviceId: string,
    /** channelId only applies to ccLink */
    channelId?: string,
    index?: number,
}


/** Transaction to TopStore. Represents (part of) a user gesture or a server data arrival */
export interface Action {
    objectId: string,
    objectType: ObjectType,
    newData: Partial<TopType>,
    /**
     * If present, use the type in newDataDyamicFrom to get the newData value at redo time,
     * based only on newData.id
     */
    newDataDynamicFrom?: ObjectType,
    updateType: UpdateType,
    /**
     * Q: should origData be of type TopType or Partial<TopType> ?
     *       There seem to be arguments for both sides.
     *       Argument for Partial: that way undo does not undo ALL the changes,
     *           o Just the ones that were originally changed.
     *           o That can be good in face of some changes that happen via Server.
     *       Argument for full TopType: e.g. for Selected, always update the full type.
     *           o Also for APGI card delete, want original data to be entire APGI card.
     * A: In general, origData should be Partial<TopType>, because do not want
     *    to modify "read-only" fields, i.e., do not want to modify fields
     *    that user cannot change but Server updates can change.
     */
    origData?: Partial<TopType>,
    /**
     * If present, use the type in origDataDyamicFrom to get the origData value at undo time,
     * based only on origData.id
     */
    origDataDynamicFrom?: ObjectType,
}

/** represents a user gesture */
export interface ActionGroup {
    actions: Array<Action>,
    description: string
}

export enum EnactType {
    USER_ACTION = "USER_ACTION",
    USER_ACTION_NOT_UNDOABLE = "UANOT_UNDOABLE",
    SERVER_CONFIG_NOT_UNDOABLE = "SCNOT_UNDOABLE",
    REDO = "REDO"
}

/** used for Validation Errors in TopStore */
export interface ErrorData {
    fieldName: string,
    /** if fieldIndex is defined, fieldName is presumed to refer to an array */
    fieldIndex?: number,
    devType: ObjectType,
}

export interface HasIdNameValidate {
    idName: string,
    validate: (value: string) => Errors
}

export interface BaseFieldProps {
    idName: string,
    topStore: TopStore,
    objectType: ObjectType,
    objectId: string,
    fieldName: string,
    fieldIndex?: number|string,
}

export enum BatteryStatus {
    GOOD = 'GOOD',
    REPLACE = 'REPLACE',
    UNKNOWN = 'UNKNOWN',
}

export interface GUISensorClient extends GUISensor {
    seen: boolean,
    detect: boolean,
    color?: string,
    selected?: boolean,
    busyStatus?: ConfigChangeStatus,
    uploading?: boolean,
    percentComplete?: number,
    /** firmware (version) comes from GUISensorStatus only; not in GUISensor */
    firmware: number,
    /** a value of -1 means voltage is unknown */
    voltage: number,
    /** Configured is true iff the Repeater was part of original configuration sent from Server,
     *  or result of Save by user. */
    configured?: boolean,
}


/**
 * This interface is for internal client use, and must be converted
 * to an appropriate child of GUISensorZone for saving to server.
 * It is, however, needed because user can change otype without providing
 * appropriate number of Sensors.  We allow, but flag the problem.
 */
export interface GUISZClient extends GUISensorZone {
    selected?: boolean,
    /** 1, 2, or 3 sensor dot ids */
    sensorIds: string[],
    /**
     * 0, 1, or 2 spacings and length corrections.
     * will be converted to integer for server type.
     */
    spacingsMm: Array<string>,
    lengthCorrectionsMm: Array<string>,
    stopbarSensitivity?: number
}


/**
 * Client uses this version of GUIRadio for all internal purposes.
 * This makes handling of channel as string much easier.
 * Client converts back to GUIRadio for save.
 */
export interface GUIRadioClient extends Mappable {
    id64: string,
    apConnection: APConnection,
    knownChannel: string,
    desiredChannel: string,
    channelMode: ChannelMode,
    colorCode: number,
    timeslot?: number,
    firmware?: number,
    hardwareVersion: number,
    /** does not go to server */
    selected?: boolean,
    /** uploading is true if repeater is in midst of a firmware upgrade */
    uploading?: boolean,
    percentComplete?: number,
}

/**
 * Client uses this version of GUIRepeater for all internal purposes.
 * This makes handling of channel as string much easier.
 * Client converts back to GUIRepeater for save.
 */
export interface GUIRepeaterClient extends Mappable {
    id: string;
    id64: string;
    hwVersion: number,
    swVersion: number,
    seen: boolean,
    /** The fwVer format is: [software version].[hardware version].[config] */
    fwVer: string,
    knownDownstreamChannel: string,
    desiredDownstreamChannel: string,
    channelMode: ChannelMode,
    knownUpstreamChannel: GUIChannel,
    desiredUpstreamChannel: string,
    dualAntenna: boolean,
    downstreamAntenna: Antenna,
    voltage: number;
    timeslot: number,
    color?: string,
    selected?: boolean,
    busyStatus?: ConfigChangeStatus,
    /** uploading is true if repeater is in midst of a firmware upgrade */
    uploading?: boolean,
    percentComplete?: number,
    replacementRepeaterId?: string,
    /** Configured is true iff the Repeater was part of original configuration sent from Server,
     *  or result of Save by user. */
    configured?: boolean,
}

export interface GUICCInterfaceBaseClient extends Mappable {
    cardInterface: Interface,
    majorFirmwareVersion: number,
    minorFirmwareVersion: number,
    /** channelNumber keys are of form 5-255-32 */
    channelsById: {[channelNumber: string]: GUICCChannel},
}
export interface GUICCCardClient extends GUICCInterfaceBaseClient {
    shelf: Shelf,
    slot: Slot;
}
export interface GUISDLCClient extends GUICCInterfaceBaseClient {
    /**
     * Per max, there will ALWAYS be 16 channels for each bank
     *       so only need to represent the array of active banks
     */
    banks: number[],
}
export interface GUICCAPGIClient extends GUICCInterfaceBaseClient {
    mode: APGIReportType,
}

export interface GUICCSTSClient extends GUICCInterfaceBaseClient {
    addrMap: {[ipNum:string]: string},
}

/** parsed key for TopStore.validationGlobalErrors */
export interface GlobalErrorKey {
    objectType: ObjectType,
    objectId: string,
}

/** parsed key for TopStore.validationErrors */
export interface ErrorKey {
    objectType: ObjectType,
    objectId: string,
    fieldName: string,
    /** index in array (actually a number in string format), if field 'fieldName' is an array type */
    fieldIndex?: string,
}

/** GUIAPConfigClient always has 3 ntpHosts, but they can be blank */
export interface GUIAPConfigClient extends GUIAPConfig {
    /** 1 hex digit in range 0-7 */
    colorCodeHiNibbleManual: string,
    /** 1 hex digit in range 0-F */
    colorCodeLoNibbleManual: string,
    /** used as the sole source of truth about map selection */
    mapImageIndex: number,
    /** used to determine if Logout Button is enabled */
    requireLoginStateSaved: boolean,
}

export interface TextField extends GUIText {
    /**
     * text as result of onChange in InfoPanel.
     * editText is used in preference to "text" field, if exists.
     */
    editText?: string,
}

export interface MapSettings {
    showRFLinks: boolean,
    showCCLinks: boolean,
    showLegend: boolean,
    showCabinetIcon: boolean,
    cabinetIconPosition: GUIPoint,
    northArrowRotationDegrees: number,
    textFields: {[id: string]: TextField},
    mapImage?: File,
}

export interface GUISaveConfig extends ServerMessage {
    ap: GUIAPConfig | null,
    radios: GUIRadio[],
    repeaters: GUIRepeater[],
    sensors: GUISensor[],
    sensorZones: GUISensorZone[],
    ccCards: Array<GUICCInterfaceBase|null>,
}

export interface EXCardId {
    shelf: number,
    slot: number,
}

export interface APGIChannelIdClient {
    shelf: string,
    slot: string,
    channel: string,
}

export interface STSChannelIdClient {
    /** value is in range 1-5 */
    ip: string,
    /** value is in range 0-255 */
    group: string,
    /** value is in range 1-32 */
    channel: string,
}
