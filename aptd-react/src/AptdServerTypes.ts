/**
 * The types in this file are meant to mimic exactly the types and enums used
 * by APTD Server to send messages to the client.
 * Of these, those named GUI*Status contain status updates, while those named
 * GUI* contain initial configuration info for a given object.
 */

export type ServerObjectType =
    'GUIRadio'
    | 'GUIRadioStatus'
    | 'GUISpeed2SensorZone'
    | 'GUISpeed3SensorZone'
    | 'GUIStopbarSensorZone'
    | 'GUICountSensorZone'
    | 'GUISensorZoneStatus'
    | 'GUISensor'
    | 'GUISensorStatus'
    | 'GUIPingScanStatus'
    | 'GUITime'
    | 'GUIRepeater'
    | 'GUIRepeaterStatus'
    | 'GUIAPConfig'
    | 'GUICCCard'
    | 'GUICCSDLC'
    | 'GUICCAPGI'
    | 'GUICCSTS'
    | 'GUICCStatus'
    | 'GUICCSDLCStatus'
    | 'GUICCAPGIStatus'
    | 'GUICCSTSStatus'
    | 'GUICCSDLCChannel'
    | 'GUICCSTSChannel'
    | 'GUICCChannel'
    | 'GUISaveProgress'
    | 'GUITechSupport'
    | 'GUIReboot'
    | 'ResetConfig'
    | 'GUISyncNTP'
    | 'GUICCCardIdentify'
    | 'GUIFirmwareUpdateConfirm'
    | 'GUIFirmwareUpdateCancel'
    | 'GUIFirmwareUpdateComplete'
    | 'GUIFirmwareUpdateUnseenWarn'
    | 'SaveConfig'
    | 'SaveInitConfig'
    | 'GUISensorUpdateProgress'
    | 'GUIRadioUpdateProgress'
    | 'GUIRepeaterUpdateProgress'
    | 'GUICCUpdateProgress'
    | 'GUIConfigChangeProgress'
    | 'GUIValidCredentials'
    | 'GUISessionTimeout'
    | 'GUIActive'
    | 'AuthReject'
    | 'UnsupportedConfigReject'
    | 'ClearConfig'
    | 'GUIReplaceSensor'
    | 'TooManyClientsReject'
    | 'GUIStartupState'
    | 'GUIClientDisconnect';

export interface ServerMessage {
    otype: ServerObjectType;
}

export interface GUIPoint {
    x: number,
    y: number
}

export enum Location {
    TRAY = 'TRAY',
    MAP = 'MAP',
    MAP_AUTO = 'MAP_AUTO',
}

export enum LinkType {
    RF = 'RF',
    CC = 'CC',
}

export interface GUIPoint {
    x: number,
    y: number,
}

export interface Line {
    aPoint: GUIPoint,
    bPoint: GUIPoint,
}

export interface GUILink {
    type: LinkType,
    /** dstId is the id of the parent device in the RF hierarchy */
    dstId: string,
    lines: Array<Line>,
    selected?: boolean,
    location: Location,
}

export interface GUIRFLink extends GUILink {
}
export interface GUICCLink extends GUILink {
}

export interface MapRenderInfo {
    location: Location,
    position: GUIPoint,
    /** degrees measured clockwise from the horizontal. values integer [0-359]
     *  e.g., pointing East is 0, pointing South is 90, pointing North is 270 */
    rotationDegrees: number,
    rfLink?: GUIRFLink,
    ccLinks: Array<GUICCLink>
}

export interface Mappable extends ServerMessage {
    info: MapRenderInfo,
    id: string,
    /**
     * if true, unheard means we intend to delete this device,
     * once all incoming links are removed.
     */
    unheard: boolean,
    rssi?: number
}

export enum GUISensorType {
    UNKNOWN = "UNKNOWN",
    MAG = "MAG",
    RAD = "RAD"
}

export enum GUISensorApplication {
    UNKNOWN = "UNKNOWN",
    UNUSED = "UNUSED",
    VO = "VO",
    VOS = "VOS",
    STOPBAR = "STOPBAR",
    BIKE = "BIKE"
}

export interface GUISensor extends Mappable {
    enabled: boolean,
    id: string,
    id64: string,
    hwType: GUISensorType,
    /** The fwVer format is: [software version].[hardware version].[config] */
    fwVer: string,
    app: GUISensorApplication,

    // rf config
    channel: number,

    // CC channel mapping
    ccExtension: number,
    ccDelay: number,

    replacementSensorId?: string,
}

/**Server Config Messages send hwVersion as a number
 * Server Status Messages send hWType as a SNHardwareType*/
export enum SNHardwareType {
    UNKNOWN = 0, DOT2 = 65535, DOT3 = 3, DOT4 = 4, DOT5 = 5, DOT6 = 6,
    DOTACC = 7, DOT8 = 8, PSHBTN5 = 9, APS1 = 257, APS2 = 258, APS3 = 259,
    RPT1 = 513, RPT2 = 514, RPT3 = 515, RPT4 = 516, TMOTE = 512, SPP1 = 768
}
/** Convert hwType to enum number value*/
export function getSNHardwareTypeKey(hwType: SNHardwareType): number {
    let key: number = Number(SNHardwareType[hwType]);
    return key;
}
/** Convert key number value to enum string type.
 *  e.g. getSNHardwareType(513) returns "RPT1" */
export function getSNHardwareType(key: number): string {
    let value: string  = SNHardwareType[key];
    return value;
}


export enum StatusStatus {
    NEW = 'NEW', UPDATE = 'UPDATE', DELETE = 'DELETE',
};


export enum Alert {
    NONE = 'NONE',
    OLD_FIRMWARE = 'OLD_FIRMWARE',
}

/**
 * Describes a configurable object, may represent a physical device ( e.g. a Sensor )
 * or an abstract object ( e.g. a Sensor Zone )
 */
export enum ConfigType {
    ACCESS_POINT = 'ACCESS_POINT',
    CCCARD = 'CCCARD',
    CCCARD_CHANNEL = 'CCCARD_CHANNEL',
    CCSTS = 'CCSTS',
    STS_VIRTUAL_CC_CHANNEL = 'STS_VIRTUAL_CC_CHANNEL',
    CCAPGI = 'CCAPGI',
    APGI_VIRTUAL_CC_CHANNEL = 'APGI_VIRTUAL_CC_CHANNEL',
    CCSDLC = 'CCSDLC',
    RADIO = 'RADIO',
    REPEATER = 'REPEATER',
    SENSOR = 'SENSOR',
    SINGLE_SENSOR_ZONE = 'SINGLE_SENSOR_ZONE',
    SPEED_2_SENSOR_ZONE = 'SPEED_2_SENSOR_ZONE',
    SPEED_3_SENSOR_ZONE = 'SPEED_3_SENSOR_ZONE',
    URAD_SENSOR_ZONE = 'URAD_SENSOR_ZONE',
    SZ = 'SZ',
}

export interface GUIDeviceStatusBase extends ServerMessage {
    type: ConfigType,
    status: StatusStatus,
    alert: Alert,
}

export interface GUISensorStatus extends GUIDeviceStatusBase {
    id: string,
    factoryId: string,
    rssi: number,
    detect: boolean,
    seen: boolean,
    firmware: number,
    voltage: number,
    channel: number,
    timeslot: number,
    hwType: GUISensorType,
    /** The fwVer format is: [software version].[hardware version].[config] */
    fwVer: string,
}

export interface GUISensorZone extends Mappable {
    id: string,
    name: string,
    //desc: string,
}

export interface GUIStopbarSensorZone extends GUISensorZone {
    sensorId: string,
    stopbarSensitivity: number
}

export interface GUICountSensorZone extends GUISensorZone {
    sensorId: string
}

export interface GUISpeed2SensorZone extends GUISensorZone {
    leadSensorId: string,
    mmSpacing: number,
    mmLengthCorrection: number,
    trailSensorId: string
}

export interface GUISpeed3SensorZone extends GUISensorZone {
    leadSensorId: string,
    mmLeadMidSpacing: number,
    mmLeadMidLengthCorrection: number,
    midSensorId: string,
    mmMidTrailSpacing: number,
    mmMidTrailLengthCorrection: number,
    trailSensorId: string,
}


export interface GUISensorZoneStatus extends GUIDeviceStatusBase {
    id: string,
}

export enum APConnection {
    SPP0 = "SPP0",
    SPP1 = "SPP1"
}

export type ChannelString =
    'AUTO'
    | '0'
    | '1'
    | '2'
    | '3'
    | '4'
    | '5'
    | '6'
    | '7'
    | '8'
    | '9'
    | '10'
    | '11'
    | '12'
    | '13'
    | '14'
    | '15';
export type GUIChannel = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export enum ChannelMode {
    AUTO = "AUTO",
    MANUAL = "MANUAL"
}

export interface IntToChannelString {
    [key: number]: ChannelString
}

export type ChannelStringToInt = { [key in ChannelString]: number };

export interface GUIRadio extends Mappable {
    id64: string,
    apConnection: APConnection,
    channel: GUIChannel,
    channelMode: ChannelMode,
    colorCode: number,
    firmwareVersion: number,
    hardwareVersion: number,
}

export interface GUIRadioStatus extends GUIDeviceStatusBase {
    id: string,
    channel: number,
    channelMode: ChannelMode,
    colorCode: number,
    timeslot: number,
    apConnection: APConnection,
    firmware: number,
}

export enum Antenna {
    INTERNAL = "INTERNAL",
    EXTERNAL = "EXTERNAL",
}

export interface GUIRepeater extends Mappable {
    id: string;
    id64: string;
    hwVersion: number,
    swVersion: number,
    /** The fwVer format is: [software version].[hardware version].[config] */
    fwVer: string,
    downstreamChannel: GUIChannel,
    channelMode: ChannelMode,
    upstreamChannel: GUIChannel,
    dualAntenna: boolean,
    downstreamAntenna: Antenna,
    timeslot: number,
    replacementRepeaterId?: string,
}

export interface GUIRepeaterStatus extends GUIDeviceStatusBase {
    id: string,
    factoryId: string,
    downChan: GUIChannel,
    seen: boolean,
    firmware: number,
    /** The fwVer format is: [software version].[hardware version].[config] */
    fwVer: string,
    hwType: SNHardwareType,
    rssi: number,
    timeslot: number,
    upChan: GUIChannel,
    voltage: number,
    colorCode: number,
    /** isFlexRepeater becomes dualAntenna */
    isFlexRepeater: boolean,
    downstreamAntenna: Antenna,
}

export enum EthMode {
    DISABLED = "DISABLED", M10 = "M10", AUTO = "AUTO",
}

export enum IPMode {
    DISABLED = "DISABLED", STATIC = "STATIC", DHCP = "DHCP",
}

export enum VPNType {
    DISABLED = "DISABLED", PPTP = "PPTP", PPIP = "PPIP", OpenVPN = "OpenVPN"
}

export enum NTPOption {
    NTP_SYNC = "NTP_SYNC", FREERUN = "FREERUN"
}

export enum UnitTypes {
    IMPERIAL = "IMPERIAL", METRIC = "METRIC"
}


export enum UploadFirmwareResponses {
    VALID = "VALID", // valid upload, all files good
    INVALID = "INVALID", // invalid upload, bad checksum, etc.
    UPDATE_PENDING = "UPDATE_PENDING", // there is an update pending, upload is rejected
    INTERNAL_ERROR = "INTERNAL_ERROR" // internal barfage, upload rejected
}

export enum FirmwareType {
    RADIO = "RADIO",
    REPEATER = "REPEATER",
    SENSOR = "SENSOR",
    IPK = "IPK",
    HC = "HC",
}


export enum VirtualCcType {
    NONE = "NONE", STS = "STS", APGI = "APGI"
}

export enum APGIReportType {
    MAPPED = "MAPPED", CONFIGURED = "CONFIGURED", ALL = "ALL"
}

export enum NetworkSecurityTypes {
    HTTP = "HTTP", HTTPS = "HTTPS"
}

export enum ColorCodeMode {
    AUTO = "AUTO", MANUAL = "MANUAL"
}

export enum TransmitInterval {
    T03125 = "T03125", T0625 = "T0625", T0125 = "T0125", T025 = "T025",
    T05 = "T05", T1 = "T1", T2 = "T2", T3 = "T3", T5 = "T5", T6 = "T6"
}

export enum ReportLatency {
    T0125 = "T0125", T025 = "T025", T05 = "T05", T1 = "T1", T2 = "T2", T3 = "T3",
    T5 = "T5", T10 = "T10", T30 = "T30",
}

export enum Watchdog {
    T10 = "T10", T30 = "T30", T60 = "T60", T90 = "T90", T120 = "T120", T240 = "T240", T300 = "T300",
    OFF = "OFF"
}

export enum ExtraLatency {
    NONE = "NONE", T0125 = "T0125", T0250 = "T0250", T0375 = "T0375", T0500 = "T0500",
    T0625 = "T0625", T0750 = "T0750", T0875 = "T0875", T1 = "T1",
}

export enum EventQueue {
    Q4_4 = "Q4_4", Q6_6 = "Q6_6", Q6_4 = "Q6_4", Q8_8 = "Q8_8", Q8_6 = "Q8_6",
    Q10_10 = "Q10_10", Q10_8 = "Q10_8", Q12_12 = "Q12_12", Q12_10 = "Q12_10",
    Q12_8 = "Q12_8", Q14_12 = "Q14_12", Q14_10 = "Q14_10", Q16_16 = "Q16_16",
    Q16_14 = "Q16_14", Q16_12 = "Q16_12", Q16_10 = "Q16_10"
}

export enum OnsetFilter {
    OFF = "OFF", T1 = "T1", T2 = "T2", T3 = "T3", T4 = "T4", T6 = "T6", T9 = "T9",
    T15 = "T15"
}

export enum Threshold {
    T4 = "T4", T5 = "T5", T6 = "T6", T7 = "T7", T8 = "T8", T9 = "T9", T10 = "T10", T11 = "T11",
    T12 = "T12", T14 = "T14", T16 = "T16", T19 = "T19", T22 = "T22", T26 = "T26", T32 = "T32",
    T40 = "T40",
}

export enum Holdover {
    OFF = "OFF", T1 = "T1", T2 = "T2", T3 = "T3", T4 = "T4", T5 = "T5", T6 = "T6", T8 = "T8",
    T10 = "T10", T13 = "T13", T16 = "T16", T20 = "T20", T25 = "T25", T31 = "T31", T39 = "T39", T48 = "T48"
}

export enum SwapXY {
    ENABLED = "ENABLED", DISABLED = "DISABLED"
}

export enum SyncReportingOption {
    ENABLED = "ENABLED", DISABLED = "DISABLED"
}

export enum TempReportingOption {
    ENABLED = "ENABLED", DISABLED = "DISABLED"
}

export enum RetransmitOption {
    ENABLED = "ENABLED", DISABLED = "DISABLED"
}

export enum RewritePacketOption {
    ENABLED = "ENABLED", DISABLED = "DISABLED"
}

export enum DblRptrTimeslotOption {
    ENABLED = "ENABLED", DISABLED = "DISABLED"
}

export enum GlobalSync {
    ENABLED = "ENABLED", DISABLED = "DISABLED"
}

export enum CCPolarity {
    NORMAL = "NORMAL", REVERSE = "REVERSE"
}

export enum RequireLogin {
    ENABLED = 'ENABLED',
    DISABLED = 'DISABLED'
}

export type SystemContext =
    'DEFAULT' |
    'SCOOT' |
    'MOVA';


export interface GUIAPConfig extends Mappable {
    id: string,
    // Identification
    serialNumber: string,
    apFirmwareVersion: string,
    apHardwareVersion: string,
    aptdVersion: string,

    // Backhaul Network
    ethMode: EthMode,
    ipAddrMode: IPMode,
    ipAddr: string,
    hostname: string,
    netMask: string,
    gateway: string,
    dns: string,
    dhcpMonitorHost: string,

    // Security
    requireLogin: RequireLogin,
    vpnType: VPNType,
    snapsServerHost: string,
    pppMonitorHost: string,
    vpnUsername: string,
    vpnPassword: string,

    // Operating System
    ntpOption: NTPOption,
    ntpHosts: string[],
    timeZone: string,
    units: UnitTypes,
    networkSecurity: string,
    licenseCapabilities: string,

    // RF
    colorCode: string,
    colorCodeMode: string,

    // Event Timing
    transmitInterval: TransmitInterval,
    maxReportLatency: ReportLatency,
    watchdog: Watchdog,
    extraLatency: ExtraLatency,
    eventQueue: EventQueue,

    // Sensor Filters
    onsetFilter: OnsetFilter,
    detectZ: Threshold,
    undetectZ: Threshold,
    undetectX: Threshold,
    holdover: Holdover,
    swapXY: SwapXY,

    syncReportingOption: SyncReportingOption,
    tempReportingOption: TempReportingOption,
    retransmitRSSILQIOption: RetransmitOption,
    rewritePacketOption: RewritePacketOption,
    doubleRepeaterTimeslotOption: DblRptrTimeslotOption,
    globalSync: GlobalSync,

    systemContext: SystemContext,

    // CC Cards
    polarity: CCPolarity,
    msCCFixedLatency: number,
    virtualCCMode: VirtualCcType,
    apgiReportMode: APGIReportType,

    // GUI Display
    /** min value for rssi high range */
    rssiHigh: number,
    /** min value for rssi medium range */
    rssiMed: number,
    /** min value for rssi low range, and max for rssi alert range */
    rssiLow: number,
    /* rssiAlert is not used by client */
    rssiAlert: number,
    compassDirection: number,
    hideRFLinks: boolean,
    hideCCLinks: boolean,
    hideCabinetIcon: boolean,
    hideLegend: boolean,
    /** cabinetIconLocation in GUIAPConfigClient is not authoritative.  Use Topstore.state.mapSettings */
    cabinetIconLocation?: GUIPoint,
    guiTexts: GUIText[],
    /**
     * initialized is false
     *  if no one has ever done an APTD save on this AP,
     *  i.e if APTD-virgin AP.
     *  i.e. if this is the first time APTD is running on this AP.
     */
    initialized: boolean,
    /** mapImage is the label field in mapDatum or 'Custom-map'. use only for persistence! */
    mapImage: string,
    /** maxMapBackgroundImageSize is max upload file size in K bytes */
    maxMapBackgroundImageSize: number,
    /** array of all filenames in /etc/apeg/aptd/webdocs/images/maps */
    mapFiles: string[],
    /* -1 mean undefined.  1 means no scaling. */
    zoomLevel: number,
    /** pan offset for the map and everything on it */
    pan: GUIPoint,
    sensorLowBatteryThreshold: number,
    repeaterLowBatteryThreshold: number,
    allTimeZones: {[tzUserText:string]: string},
    /** needed so client can distinguish between network drop and server restart */
    runSeqNum: number,
    showDashedCardConnectionLines: boolean
}

export interface GUIText {
    /**
     * the persisted, or to-be-persisted text, updated in
     * InfoPanelTextField.onBlur().
     */
    text: string,
    position: GUIPoint | null,
    rotationDegrees: number
}


export enum Shelf {
    S0 = 'S0',
    S1 = 'S1',
    S2 = 'S2',
    S3 = 'S3',
    S4 = 'S4',
    S5 = 'S5',
    S6 = 'S6',
    S7 = 'S7',
    S8 = 'S8',
    S9 = 'S9',
    S10 = 'S10',
    S11 = 'S11',
    S12 = 'S12',
    S13 = 'S13',
    S14 = 'S14',
    S15 = 'S15'
}

export enum Slot {
    S0 = 'S0',
    S1 = 'S1',
    S2 = 'S2',
    S3 = 'S3',
    S4 = 'S4',
    S5 = 'S5',
    S6 = 'S6',
    S7 = 'S7',
    S8 = 'S8',
    S9 = 'S9',
    S10 = 'S10',
    S11 = 'S11',
    S12 = 'S12',
    S13 = 'S13',
    S14 = 'S14',
    S15 = 'S15'
}

export enum ChannelNumber {
    CH_1 = 'CH_1', CH_2 = 'CH_2', CH_3 = 'CH_3', CH_4 = 'CH_4',
    CH_5 = 'CH_5', CH_6 = 'CH_6', CH_7 = 'CH_7', CH_8 = 'CH_8',
    CH_9 = 'CH_9', CH_10 = 'CH_10', CH_11 = 'CH_11', CH_12 = 'CH_12',
    CH_13 = 'CH_13', CH_14 = 'CH_14', CH_15 = 'CH_15', CH_16 = 'CH_16'
}

export function getChannelIndex(channelNo: string): number {
    let channelNo_split = channelNo.split("_");
    if (channelNo_split.length > 0) {
        return Number(channelNo_split[channelNo_split.length-1]);
    }
    return -1;
}

export function getChannelNumber(channelIndex: Number): ChannelNumber | null {
    if (channelIndex < 0) {
        return null;
    }
    for (let channelNo of Object.values(ChannelNumber)) {
        let channelNo_split = channelNo.split("_");
        if (channelNo_split.length > 0) {
            let index = Number(channelNo_split[channelNo_split.length-1])
            if (index === channelIndex) {
                return channelNo;
            }
        }
    }
    return null;
}

export enum DelayTime {
    T0 = "T0",
    T1 = "T1", T2 = "T2", T3 = "T3", T4 = "T4", T5 = "T5", T6 = "T6",
    T7 = "T7",
    T8 = "T8",
    T9 = "T9",
    T10 = "T10",
    T11 = "T11",
    T12 = "T12",
    T13 = "T13",
    T14 = "T14",
    T15 = "T15",
    T16 = "T16",
    T17 = "T17",
    T18 = "T18",
    T19 = "T19",
    T20 = "T20",
    T21 = "T21",
    T22 = "T22",
    T23 = "T23",
    T24 = "T24",
    T25 = "T25",
    T26 = "T26",
    T27 = "T27",
    T28 = "T28",
    T29 = "T29",
    T30 = "T30",
    T31 = "T31",
}

export enum ExtensionTime {
    T0 = "T0",
    T0_5 = "T0_5",
    T1 = "T1",
    T1_5 = "T1_5",
    T2 = "T2",
    T2_5 = "T2_5",
    T3 = "T3",
    T3_5 = "T3_5",
    T4 = "T4",
    T4_5 = "T4_5",
    T5 = "T5",
    T5_5 = "T5_5",
    T6 = "T6",
    T6_5 = "T6_5",
    T7 = "T7",
    T7_5 = "T7_5",
}

export enum CCHoldover {
    T0 = "T0",
    T005 = "T005",
    T010 = "T010",
    T015 = "T015",
    T020 = "T020",
    T025 = "T025",
    T030 = "T030",
    T035 = "T035",
    T040 = "T040",
    T045 = "T045",
    T050 = "T050",
    T055 = "T055",
    T060 = "T060",
    T065 = "T065",
    T070 = "T070",
    T075 = "T075",
}

export enum WatchDogFailsafeOption {
    PRESENT = 'PRESENT',
    NOT_PRESENT = 'NOT_PRESENT',
}

export enum FailsafeTriggerOption {
    ANY_SENSOR = 'ANY_SENSOR',
    ALL_SENSORS = 'ALL_SENSORS',
}

export interface GUICCChannel extends GUICCChannelBase {
    channelNumber: ChannelNumber|string,
    enabled: CCChanEnableOption,
    ppMode: PPMode,
    delayExtOption: DelayExtOption,
    delayTime: DelayTime,
    extTime: ExtensionTime,
    holdover: CCHoldover,
    watchDogFailsafeOption: WatchDogFailsafeOption,
    failsafeTriggerOption: FailsafeTriggerOption,
    msExtension: number,
    msDelay: number,
}

export interface GUICCChannelClient extends GUICCChannel {
    /** selected in UI for possible delete */
    selected?: boolean,
}

export enum CCChanEnableOption {
    ENABLED = 'ENABLED',
    DISABLED = 'DISABLED'
}

export enum PPMode {
    PULSE = 'PULSE',
    /** PRESENCE is mis-spelled but that is how it is on server */
    PRESENSE = 'PRESENSE'
}

export enum DelayExtOption {
    OFF = "OFF",
    EXTENSION = "EXTENSION",
    DELAY = "DELAY"
}

/** card interface */
export enum Interface {
    CCCard = "CCCard",
    EXCard = "EXCard",
    SDLC = "SDLC",
    APGI = "APGI",
    STS = "STS"
}

export type IDCCChannelBase = string;
export type IDCCChannel = ChannelNumber;

/** base type for all CC Cards */
export interface GUICCInterfaceBase extends Mappable {
}
/** base type for all CC Card Channels */
export interface GUICCChannelBase {
    id: string;
    otype: string;
    sensors: Array<string>;
    sensorFailSafe: {
        [key: string] : boolean;
    };
}

export interface GUICCCard extends GUICCInterfaceBase {
    /** id has special format, e.g. S3-S15 */
    cardInterface: Interface,
    majorFirmwareVersion: number,
    minorFirmwareVersion: number,
    shelf: Shelf,
    slot: Slot;
    ccChannels: GUICCChannel[];
}

export interface GUICCSDLC extends GUICCInterfaceBase {
    cardInterface: Interface,
    majorFirmwareVersion: number,
    minorFirmwareVersion: number,
    channels: GUICCChannel[],
}
export interface GUICCAPGI extends GUICCInterfaceBase {
    mode: APGIReportType,
    ccChannels: string[],
}
export interface GUICCSTS extends GUICCInterfaceBase {
    /** ip addresses keyed by ADDR_1, ADDR_2... or IP1, IP2... */
    addrMap: {[addr: string]: string},
    /** each channel of the form IP1-G123-CH_32 */
    ccChannels: GUICCChannel[],
}

export interface GUICCStatus extends GUIDeviceStatusBase {
    id: string
}

/** status for GUISaveProgress */
export enum Status {
    STARTED = 'STARTED',
    WAITING_FOR_SCAN_TO_COMPLETE = 'WAITING_FOR_SCAN_TO_COMPLETE',
    IN_PROGRESS = "IN_PROGRESS",
    UPDATING_FIRMWARE = "UPDATING_FIRMWARE",
    ERROR_VALIDATION = "ERROR_VALIDATION",
    ERROR_CANT_LOCATE_ALL_DEVICES = "ERROR_CANT_LOCATE_ALL_DEVICES",
    ERROR_POOR_RADIO_SIGNAL_STRENGTH = "ERROR_POOR_RADIO_SIGNAL_STRENGTH",
    ERROR_NO_MORE_RETRIES = "ERROR_NO_MORE_RETRIES",
    ERROR_UPDATE_IN_PROGRESS = "ERROR_UPDATE_IN_PROGRESS",
    ERROR_INTERNAL = "ERROR_INTERNAL",
    COMPLETE = "COMPLETE",
    COMPLETE_NO_CHANGES_MADE = "COMPLETE_NO_CHANGES_MADE",
    COMPLETE_REBOOT = "COMPLETE_REBOOT",
}

export enum ConfigChangeStatus {
    QUEUED = 'QUEUED',
    STARTED = 'STARTED',
    DONE = 'DONE',
    ERROR = 'ERROR'
}

export enum UpdateProgressStatus {
    IN_PROGRESS = 'IN_PROGRESS',
    IN_PROGRESS_DELAY = 'IN_PROGRESS_DELAY',
    CANCELLED_NOT_HEARD = 'CANCELLED_NOT_HEARD',
    CANCELLED_USER = 'CANCELLED_USER',
    CANCELLED_TIMEOUT = 'CANCELLED_TIMEOUT',
    COMPLETE = 'COMPLETE',
}

export interface GUISaveProgress extends ServerMessage {
    id: string,
    status: Status,
    percentComplete: number,
}

export interface GUIUpdateProgressBase extends ServerMessage {
    id: string,
    status: UpdateProgressStatus,
    percentComplete: number,
}

export interface GUISensorUpdateProgress extends GUIUpdateProgressBase {
}
export interface GUIRepeaterUpdateProgress extends GUIUpdateProgressBase {
}
export interface GUIRadioUpdateProgress extends GUIUpdateProgressBase {
}
export interface GUICCUpdateProgress extends GUIUpdateProgressBase {
}

export interface GUIConfigChangeProgress extends ServerMessage {
    id: string
    status: ConfigChangeStatus,
}

export interface GUITechSupport extends ServerMessage {
    jobs: Array<GUITechSupportJob>,
    loggers: {[key: string]: string},
    op: String,
    otype: "GUITechSupport",
    props: Array<GUITechSupportProp>
}

export interface GUITechSupportJob {
    name: string,
    interval: string,
    numRuns: string,
}

export interface GUITechSupportLogger {
    name: string,
    logLevel: string
}

export interface GUITechSupportProp {
    name: string,
    value: string,
    comment: string,
    canEdit: boolean
}

export interface SaveInitConfig extends ServerMessage {
    units: UnitTypes,
    timeZone: string,
    mapImage: string,
    requireLogin: RequireLogin,
}

export interface GUICCCardIdentify extends ServerMessage {
    idCC: string,
}

export interface GUIReboot extends ServerMessage{}
export interface ResetConfig extends ServerMessage{}
export interface GUISyncNTP extends ServerMessage{}

export interface GUIFirmwareUpdateConfirm extends ServerMessage{}
export interface GUIFirmwareUpdateCancel extends ServerMessage{}
export interface GUIFirmwareUpdateUnseenWarn extends ServerMessage{
    unseen: Array<string>,
}
export enum CompleteStatus {
    SUCCESS = 'SUCCESS',
    /** ipkg was installed, so VDS requires a reboot **/
    SUCCESS_REBOOT = 'SUCCESS_REBOOT',
    ERROR = 'ERROR',
    UNKNOWN = 'UNKNOWN',
    /** not all configured devices of desired type are seen */
    UNSEEN = 'UNSEEN',
}
export interface GUIFirmwareUpdateComplete extends ServerMessage {
    status: CompleteStatus,
}

export interface GUIPingScanStatus extends ServerMessage {
    percentComplete: number,
    noCancel: boolean,
    maxPingScanSecs: number,
}

export interface GUIValidCredentials extends ServerMessage {
    username: string,
    password: string,
    valid?: boolean,
}

export interface GUITime extends ServerMessage {
    time: string;
}

export interface GUISesionTimeout extends ServerMessage {}
export interface GUIClientDisconnect extends ServerMessage {}
export interface GUIActive extends ServerMessage {}
export interface AuthReject extends ServerMessage {}

export enum Resolution {
    /**
     * System is ready for the user,
     * configuration is clean and no external changes
     * have been detected
     */
    READY = 'READY',

    /**
     * External change found and configuration successfully updated
     */
    READY_UPDATED = 'READY_UPDATED',

    /**
     * Timeout waiting for discover or pong packets for
     * all devices in configuration, essentially a VDS failure
     */
    UNABLE_TO_FIND_ALL_CONFIGURED_DEVICES = 'UNABLE_TO_FIND_ALL_CONFIGURED_DEVICES',

    /**
     * External change found and the change
     * is not supported by APTD, user must be
     * prevented from using APTD<br>
     *
     * <b>rejectReasons</b> will contain a list of reasons for the rejection
     */
    UNSUPPORTED = 'UNSUPPORTED',
}

export enum RejectReason {
    URAD_SENSOR = 'URAD_SENSOR',
    SAMS = 'SAMS',
    GMG = 'GMG',
    TRANSMIT_INTERVAL = 'TRANSMIT_INTERVAL',
    UNSUPPORTED_SENSOR_ID = 'UNSUPPORTED_SENSOR_ID',    // Unsupported ( by APTD ) sensor id, most likely 'virtual' sensors
    UNSUPPORTED_SENSOR_ZONE = 'UNSUPPORTED_SENSOR_ZONE',
    UNABLE_TO_READ_CONFIG = 'UNABLE_TO_READ_CONFIG',    // Configuration corrupted, unable to read config probably due to apsend or other vds error
    SENSOR_IN_DOWNLOAD_MODE = 'SENSOR_IN_DOWNLOAD_MODE',
    INVALID_DEVICE_HARDWARE = 'INVALID_DEVICE_HARDWARE',
    UNSUPPORTED_VDS_VERSION = 'UNSUPPORTED_VDS_VERSION',
    INCOMPATIBLE_APP_VERSIONS = 'INCOMPATIBLE_APP_VERSIONS',
    FOUND_CCCARDS_FLEXCONNECT = 'FOUND_CCCARDS_FLEXCONNECT',
    CCCARD_TEMPERATURE_ALERT_ENABLED = 'CCCARD_TEMPERATURE_ALERT_ENABLED',
}
export enum Severity {
    LOW = 'LOW',
    HIGH = 'HIGH',
}

/**
 * Sent by server once discover or pong packets are received for
 * all configured devices (or timeout occurs).  This transactions represents the
 * system state upon initial client connection.
 */
export interface GUIStartupState extends ServerMessage {
    resolution: Resolution,
    rejectReasons: RejectReason[],
}


export interface GUIReplaceSensor extends ServerMessage {
    type: ConfigType,
    originalDeviceId: string,
    replacementDeviceId: string,
}