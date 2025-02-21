import * as React from 'react';
import {ReactNode} from 'react';
import cloneDeep from 'lodash/cloneDeep';
import MapSensorZoneG from './MapSensorZoneG';
import NorthArrowIcon from './NorthArrowIcon';
import TextFieldG from './TextFieldG'
import TraySensorG from './TraySensorG';
import './MapAndTray.css';
import AptdApp from '../AptdApp';
import {RadioG} from './RadioG';
import APG from "./APG";
import MapRepeaterG from "./MapRepeaterG";
import CCCardG from "./CCCardG";
import TopStore, {TopStoreState} from "../TopStore";
import {
    Action,
    ActionGroup,
    EnactType,
    GUIAPConfigClient,
    GUICCAPGIClient,
    GUICCCardClient,
    GUICCInterfaceBaseClient,
    GUICCSTSClient,
    GUIRadioClient,
    GUIRepeaterClient,
    GUISDLCClient,
    GUISensorClient,
    GUISZClient,
    MapSettings,
    ModalInfo,
    ModalType,
    ObjectType,
    Selected,
    SelectedLinkInfo,
    TextField,
    TransformType,
    UpdateType
} from "../AptdClientTypes";
import {
    ChannelMode,
    GUIAPConfig,
    GUICCChannel,
    GUICCLink,
    GUIChannel,
    GUILink,
    GUIPoint,
    GUIRFLink,
    GUISensorType,
    Interface,
    Line,
    LinkType,
    Location,
    Mappable,
    MapRenderInfo,
} from "../AptdServerTypes";
import TrayRepeaterG from "./TrayRepeaterG";
import SDLCG from "./SDLCG";
import ProxySensorG from './ProxySensorG';
import ProxyRepeaterG from "./ProxyRepeaterG";
import ProxySensorMiniG from "./ProxySensorMiniG";
import RFLink from "./RFLink";
import CCLink from "./CCLink";
import ProxyRepeaterMiniG from "./ProxyRepeaterMiniG";
import APGIG from "./APGIG";
import STSG from "./STSG";
import UndoManager from "../UndoManager";
import HelpEngine, {HelpLocType, Hilight} from '../help/HelpEngine';
import HelpEngineBalloon from '../help/HelpEngineBalloon';
import MapImagesManager, {MapDatum} from "../MapImagesManager";
import Modal from "../Modal";

// HR: apparently, couldn't easily use the import syntax for images, due to Typescript.
// TODO: there may be a way to do it.
const MapZoomIn:any = require('../assets/icons/map_zoom_plus.png');
const MapZoomOut:any = require('../assets/icons/map_zoom_minus.png');
const Legend:any = require('../assets/icons/legend-inkscape.svg');
const CabinetIcon:any = require('../assets/icons/cabinetIcon.svg');

export interface Point {
    x: number,
    y: number
}

interface WidthHeight {
    width: number,
    height: number,
}

type TargetType =
    ObjectType.MAP
    | ObjectType.TRAY
    | ObjectType.SENSOR_ZONE
    | ObjectType.RADIO
    | ObjectType.MAP_REPEATER
    | ObjectType.RF_LINK // TODO: is this really used?
    | ObjectType.CC_LINK // TODO: is this really used?
    | ObjectType.CC_CHANNEL
    | ObjectType.SDLC_CHANNEL
    | ObjectType.APGI_CHANNEL
    | ObjectType.STS_CHANNEL
    | null;

interface Dragging {
    elt: SVGElement | HTMLDivElement | null,
    /** TODO: give a better type for eltDatum.  how about TopType? */
    eltDatum: any,
    eltStartLoc: Point | null,
    eltStartDeg: number | null,
    eltDotid: string | null,
    lastLoc: Point | null,
    type: ObjectType | null,
    transformType: TransformType | null,
    target: SVGElement | null,
    targetType: TargetType,
    targetOK?: boolean,
    /** if proxyType is defined, use a separate proxy object while dragging */
    proxyType?: ObjectType | null,
    /** if defined, location of the proxy object while dragging */
    proxyLoc?: Point,
    /** if defined, initial location of the drag proxy */
    proxyStartLoc?: GUIPoint;
    linkSegmentIndex?: number | null,
    linkUpdates?: boolean,
    linkEndPointDrag?: boolean | null,
    linkSensorIds?: string[] | null,
    linkRepeaterIds?: string[] | null,
}


enum DropContext {
    FROM_TRAY = "FROM_TRAY",
    FROM_ANOTHER_SZ = "FROM_ANOTHER_SZ",
    FROM_SAME_SZ = "FROM_SAME_SZ",
}

interface MapAndTrayProps {
    scale: number,
    /** pan offset for the map and everything on it */
    pan: Point,
    mapCabinetTrayWidth: number,
    mapCabinetTrayHeight: number,
    trayHeight: number,
    mapHeight: number,
    mapSensors: {[sensorId: string]: GUISensorClient},
    trayDevices: {[dotid: string]: GUISensorClient|GUIRepeaterClient},
    sensorZones: {[szId: string]: GUISZClient},
    ap: GUIAPConfigClient | null,
    radios: {[radioId: string]: GUIRadioClient},
    mapRepeaters: {[repeaterId: string]: GUIRepeaterClient},
    ccCards: {[cardId: string]: GUICCInterfaceBaseClient},
    //nextSensorZoneNo: number,
    sensorDotidToSzId: {[sensorId: string]: string},
    getMapSensorsForSz: (szid: string) => {[sensorId: string]: GUISensorClient} | undefined,
    selectedDotid: string | null,
    selectedSzId: string | null,
    selected: Selected | null,
    topStore: TopStore,
    undoManager: UndoManager,
    helpEngine: HelpEngine,
    mapImagesManager: MapImagesManager|null,
    onHelpGuideClicked: ()=>void,
}

interface MapAndTrayState {
    dragging: Dragging,
    mapSensors: {[key: string]: GUISensorClient},
    trayDevices: {[dotid: string]: GUISensorClient|GUIRepeaterClient},
    sensorZones: {[key: string]: GUISZClient},
    ap: GUIAPConfigClient | null,
    radios: {[radioId: string]: GUIRadioClient},
    mapRepeaters: {[repeaterId: string]: GUIRepeaterClient},
    lastNotOverlappingLocation: GUIPoint | null,
    lastNotOverlappingRotation: number | null,
    ccCards: {[cardId: string]: GUICCInterfaceBaseClient},
    sensorDotidToSzId: {[key: string]: string},
    /**
     * measured in degrees, with 0 pointing straight up.
     * e.g., 0 is up, 90 is to the right, 180 is down, 270 is to the left.
     * TODO: unfortunately this is a different convention from
     *       RenderInfo.rotationDegrees used for SensorZones
     */
    northArrowIconRotation: number,
    cabinetIconPosition: GUIPoint,
    textFields: {[id:string] :TextField},
    updateText: boolean,
    trayWasScrolled: boolean,
    modalPosition: GUIPoint,
    pan: Point,
}

export default class MapAndTray extends React.Component<MapAndTrayProps, MapAndTrayState> {
    private mapCabinetWidth: number;
    private mapCabinetHeight: number;
    private trayHeight: number;
    private lastTrayDeviceInView: string;
    private mapHeight: number;
    private cabinetWidth: number;
    private cabinetHeight: number;
    private rightCabinetX: number;
    private mapWidth: number;
    private szHeight: number;
    private mapImageWidth: number;
    private mapImageHeight: number;
    /** the top left corner of the map image in the current MapViewBox of the svg */
    private mapImageTopLeftCorner: GUIPoint;
    /** the top left corner of the map image in the whole SVG
     *  (so can be negative if mapImage is larger than MapViewBox)  */
    private mapImageLocationInSvg: GUIPoint;
    private starZoom: number;
    private northArrowPosition: GUIPoint;
    public textFieldStartPosition: GUIPoint;
    private northArrowIconWidth: number;
    private northArrowIconHeight: number;
    private highlightedSensor: string;
    private mapLowerLeftQuadrant: GUIPoint;
    private mapLowerRightQuadrant: GUIPoint;
    private mapUpperLeftQuadrant: GUIPoint;
    private mapUpperRightQuadrant: GUIPoint;
    private helpGestureLoc: GUIPoint;
    private legendPosition: GUIPoint;
    private ccChannelPositionByChannelId: {[channelId: string]: GUIPoint};
    private leftCabinetPresent: Boolean;
    private rightCabinetPresent: Boolean;
    /**
     * this holds the information about the possible 1 link that is selected,
     * which can be either rflink or cclink but not both.
     */
    private selectedLinkInfo: SelectedLinkInfo | null;

    /**
     * SENSOR_POSITIONS_WITHIN_SZ is a constant that shows the layout of sensors within a SZ,
     * keyed by the number of sensors in the SZ
     */
    public static readonly SENSOR_POSITIONS_WITHIN_SZ: {[key: number]: number[]} =
        {1: [0], 2: [-17, 13], 3: [-35, -5, 25]};

    static noDragState: Dragging = {
        elt: null,
        eltDotid: null,
        eltDatum: null,
        transformType: null,
        eltStartDeg: null,
        eltStartLoc: null,
        lastLoc: null,
        type: null,
        target: null,
        targetType: null,
        linkSegmentIndex: null,
        linkSensorIds: null,
    };

    static defaultSelection: Selected = {
        selectedDotid: null,
        selectedSzId: null,
        selectedG: null,
        selectedDeviceType: ObjectType.MAP_SETTINGS,
        selected: null,
    }

    private static readonly MAX_SENSORS_PER_CHANNEL:number = 15;

    constructor(props: MapAndTrayProps) {
        super(props);

        this.trayHeight = props.trayHeight;
        let trayHeight: number = props.trayHeight;
        const trayDiv = document.getElementById('trayDiv');
        if (trayDiv !== null && MapAndTray.hasHorizontalScrollbar(trayDiv)) {
            trayHeight += 16;   // TODO: this is likely browser-dependent
        }
        this.lastTrayDeviceInView = "";

        this.mapCabinetWidth = props.mapCabinetTrayWidth;
        this.mapCabinetHeight = props.mapCabinetTrayHeight - trayHeight - 4;
        this.mapHeight = this.mapCabinetHeight;

        this.cabinetWidth = 60;
        this.cabinetHeight = this.mapHeight;
        this.rightCabinetX = this.mapCabinetWidth - this.cabinetWidth;
        this.mapWidth = this.mapCabinetWidth - this.cabinetWidth;
        this.mapImageHeight = 1680;
        this.mapImageWidth = 1680;
        this.mapImageTopLeftCorner = {x: 0, y: 0};
        this.mapImageLocationInSvg = {x: 0, y: 0};
        this.starZoom = 24;
        this.northArrowPosition = {x: 0, y: 0};
        this.textFieldStartPosition = {x: 0, y: 0};
        this.northArrowIconWidth = 35;
        this.northArrowIconHeight = 70;
        this.highlightedSensor = "";
        this.mapLowerLeftQuadrant = {x: 0, y: 0};
        this.mapLowerRightQuadrant = {x: 0, y: 0};
        this.mapUpperLeftQuadrant = {x: 0, y: 0};
        this.mapUpperRightQuadrant = {x: 0, y: 0};
        this.helpGestureLoc = {x: 0, y: 0};
        this.legendPosition = {x: 0, y: 0};
        this.szHeight = 25;
        this.ccChannelPositionByChannelId = {};
        this.leftCabinetPresent = false;
        this.rightCabinetPresent = false;
        this.selectedLinkInfo = null;

        // TODO: following cloning is expensive, but protects Aptd state from
        //       changes made when dragging in this class.
        //       If it proves too expensive, it is not really needed, but then
        //       changes during drag will bleed through to Aptd ("persistable") state
        // TODO: is cloning needed here?
        let clonedTrayDevices = cloneDeep(props.trayDevices);
        let clonedMapSensors = cloneDeep(props.mapSensors);
        let clonedSensorZones = cloneDeep(props.sensorZones);
        // TODO: not top
        const topModalHeader = document.querySelector('div.modalHeader');
        let topModalHeaderLoc: GUIPoint = {x:0, y:0};
        if (topModalHeader !== null) {
            topModalHeaderLoc = {x: topModalHeader.getBoundingClientRect().left,
                                 y: topModalHeader.getBoundingClientRect().top}  ;
        }
        const mapOffset:Point = {...this.props.pan};

        // state related to drag
        this.state = {
            dragging: {
                elt: null,
                eltDotid: null,
                eltDatum: null,
                transformType: TransformType.TRANSLATE,
                eltStartDeg: null,
                eltStartLoc: null,
                lastLoc: null,
                type: null,
                target: null,
                targetType: null,
                linkSegmentIndex: null,
                linkSensorIds: null,
            },
            trayDevices: clonedTrayDevices,
            mapSensors: clonedMapSensors,
            sensorZones: clonedSensorZones,
            // TODO: probably need to clone the props.radios like clonedTraySensors
            radios: props.radios,
            mapRepeaters: props.mapRepeaters,
            lastNotOverlappingLocation: null,
            lastNotOverlappingRotation: null,
            ccCards: props.ccCards,
            ap: props.ap,
            sensorDotidToSzId: props.sensorDotidToSzId,
            northArrowIconRotation: this.props.topStore.getTopState().mapSettings.northArrowRotationDegrees,
            cabinetIconPosition: this.props.topStore.getTopState().mapSettings.cabinetIconPosition,
            textFields: this.props.topStore.getTopState().mapSettings.textFields,
            updateText: false,
            trayWasScrolled: false,
            modalPosition: topModalHeaderLoc,
            pan: mapOffset,
        };

        this.getModifiedPoint = this.getModifiedPoint.bind(this);
        this.getMousePosition = this.getMousePosition.bind(this);
        this.getSzIdForSensorDotId = this.getSzIdForSensorDotId.bind(this);
        this.hideLegend = this.hideLegend.bind(this);
        this.isInMap = this.isInMap.bind(this);
        //this.isInElement = this.isInElement.bind(this);
        this.isBelowMap = this.isBelowMap.bind(this);
        this.keepTrayDevicesInView = this.keepTrayDevicesInView.bind(this);
        this.onClick = this.onClick.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseEnter = this.onMouseEnter.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
        this.onMouseLeaveMapDraggingTrayDevice = this.onMouseLeaveMapDraggingTrayDevice.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onToggleLegend = this.onToggleLegend.bind(this);
        this.onTrayScroll = this.onTrayScroll.bind(this);
        this.onZoom = this.onZoom.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
        this.renderAP = this.renderAP.bind(this);
        this.renderCards = this.renderCards.bind(this);
        this.renderCCLinks = this.renderCCLinks.bind(this);
        this.renderCentersOfDevices = this.renderCentersOfDevices.bind(this);
        this.renderDragProxy = this.renderDragProxy.bind(this);
        this.renderLegend = this.renderLegend.bind(this);
        this.renderNorthArrowIcon = this.renderNorthArrowIcon.bind(this);
        this.renderRfLinks = this.renderRfLinks.bind(this);
        this.renderScalableMapHelpBalloons = this.renderScalableMapHelpBalloons.bind(this);
        this.renderStaticMapHelpBalloons = this.renderStaticMapHelpBalloons.bind(this);
        this.renderTextFields = this.renderTextFields.bind(this);
        this.renderTrayDevices = this.renderTrayDevices.bind(this);
        this.renderTrayDragProxy = this.renderTrayDragProxy.bind(this);
        this.renderTrayHelpBalloons = this.renderTrayHelpBalloons.bind(this);
    }

    /**
     * Only want to update state from props if props change "significantly"--
     *       i.e., if something changes *visibly* on the map, primarily locations.
     * For example, MapSZG uses state for location, but MapSensorG uses props because
     *       it doesn't have independent user-affected location state.
     * We have a check in here to see if a drag is happening.
     *       If so, then don't do any state update from prop changes!!
     * cf. https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html
     */
    static getDerivedStateFromProps(nextProps: Readonly<MapAndTrayProps>, prevState:  MapAndTrayState): Partial<MapAndTrayState> | null {

        if (prevState.dragging.elt !== null) {
            // user is mid-drag.  Disallow state changes from props
            return null;
        }
        let derivedState:  Partial<MapAndTrayState> | null = null;

        // TODO: if a batch of updates came in at once, trayDevices.length could
        //       stay constant while an ADD and DELETE occurred at once.
        if (Object.keys(nextProps.trayDevices).length !== Object.keys(prevState.trayDevices).length ||
            MapAndTray.trayDeviceFieldsDiffer(nextProps.trayDevices, prevState.trayDevices) ||
            MapAndTray.traySensorsDetectDiffers(nextProps.trayDevices, prevState.trayDevices) ||
            MapAndTray.rssiValueDiffers(nextProps.trayDevices, prevState.trayDevices)) {
            derivedState = {trayDevices: nextProps.trayDevices};
        }

        // TODO: should ideally compare list of ccCard ids with prev list of ccCard ids
        //       or maybe if cc cards have no separate state, we don't need to look.
        //       I think they don't need separate state, because they don't move.
        if (Object.keys(nextProps.ccCards).length !== Object.keys(prevState.ccCards).length) {
            derivedState = {...derivedState,
                ccCards: nextProps.ccCards,
                mapSensors: nextProps.mapSensors};
        }
        if (MapAndTray.ccCardUnheardStatusDiffers(nextProps.ccCards, prevState.ccCards)) {
            derivedState = {...derivedState, ccCards: nextProps.ccCards};
        }

        if (MapAndTray.pointsDiffer(nextProps.pan, prevState.pan)) {
            derivedState = {...derivedState, pan: {...nextProps.pan}};
        }

        if (MapAndTray.locationsDiffer(nextProps.mapSensors, prevState.mapSensors) ||
            MapAndTray.mapDeviceLinksDiffer(nextProps.mapSensors, prevState.mapSensors) ||
            MapAndTray.unheardStatusDiffers(nextProps.mapSensors, prevState.mapSensors) ||
            MapAndTray.seenStatusDiffers(nextProps.mapSensors, prevState.mapSensors) ||
            MapAndTray.rssiValueDiffers(nextProps.mapSensors, prevState.mapSensors) ||
            MapAndTray.busyStatusDiffers(nextProps.mapSensors, prevState.mapSensors) ||
            MapAndTray.percentCompleteDiffers(nextProps.mapSensors, prevState.mapSensors) ||
            MapAndTray.uploadingDiffers(nextProps.mapSensors, prevState.mapSensors)) {
            derivedState = {...derivedState, mapSensors: nextProps.mapSensors};
        }
        if (MapAndTray.locationsDiffer(nextProps.sensorZones, prevState.sensorZones) ||
            MapAndTray.ssValueDiffer(nextProps.sensorZones, prevState.sensorZones)) {
            derivedState = {...derivedState, sensorZones: nextProps.sensorZones};
        } else if (MapAndTray.sensorZoneSetsDiffer(nextProps.sensorZones, prevState.sensorZones)) {
            derivedState = {...derivedState, sensorZones: nextProps.sensorZones};
        }
        // TODO: do we need to invoke MapAndTray.mapRepeaterLinksDiffer()?
        if (MapAndTray.locationsDiffer(nextProps.radios, prevState.radios) ||
            MapAndTray.channelOrChannelModeDiffers(nextProps.radios, prevState.radios) ||
            MapAndTray.unheardStatusDiffers(nextProps.radios, prevState.radios) ||
            MapAndTray.percentCompleteDiffers(nextProps.radios, prevState.radios) ||
            MapAndTray.uploadingDiffers(nextProps.radios, prevState.radios)) {
            derivedState = {...derivedState, radios: nextProps.radios};
        }
        if (MapAndTray.locationsDiffer(nextProps.mapRepeaters, prevState.mapRepeaters) ||
            MapAndTray.mapDeviceLinksDiffer(nextProps.mapRepeaters, prevState.mapRepeaters) ||
            // MapAndTray.downstreamChannelDiffers(nextProps.mapRepeaters, prevState.mapRepeaters) ||
            MapAndTray.unheardStatusDiffers(nextProps.mapRepeaters, prevState.mapRepeaters) ||
            MapAndTray.seenStatusDiffers(nextProps.mapRepeaters, prevState.mapRepeaters) ||
            MapAndTray.rssiValueDiffers(nextProps.mapRepeaters, prevState.mapRepeaters) ||
            MapAndTray.busyStatusDiffers(nextProps.mapRepeaters, prevState.mapRepeaters) ||
            MapAndTray.percentCompleteDiffers(nextProps.mapRepeaters, prevState.mapRepeaters) ||
            MapAndTray.uploadingDiffers(nextProps.mapRepeaters, prevState.mapRepeaters)) {
            derivedState = {...derivedState, mapRepeaters: nextProps.mapRepeaters};
        }
        if (MapAndTray.locationDiffers(nextProps.ap, prevState.ap) ||
            MapAndTray.mapImageIndexDiffers(nextProps.ap, prevState.ap)) {
            derivedState = {...derivedState, ap: nextProps.ap};
        }
        if (MapAndTray.pointsDiffer(nextProps.topStore.getTopState().mapSettings.cabinetIconPosition, prevState.cabinetIconPosition)) {
            derivedState = {...derivedState, cabinetIconPosition: nextProps.topStore.getTopState().mapSettings.cabinetIconPosition};
        }
        if (MapAndTray.mapNorthArrowDiffers(nextProps.topStore.getTopState().mapSettings, prevState.northArrowIconRotation)) {
            derivedState = {...derivedState,
                northArrowIconRotation: nextProps.topStore.getTopState().mapSettings.northArrowRotationDegrees,
            }
        }
        if (MapAndTray.mapTextFieldsDiffer(nextProps.topStore.getTopState().mapSettings.textFields, prevState.textFields)) {
            derivedState = {...derivedState,
                textFields: cloneDeep(nextProps.topStore.getTopState().mapSettings.textFields)
            }
        }

        // console.debug('getDerivedStateFromProps(): about to return new state', derivedState);
        return derivedState;
    }

    componentDidMount(): void {
        let tray = document.getElementById("trayDiv");
        if (tray !== null) {
            let width = this.mapCabinetWidth;
            tray.style.cssText = "overflow-x: scroll; width: " +width +"px;";
        }
        window.addEventListener("keyup", this.keyPressed);
        // TODO: should also do when changing background map (image size)
        //window.addEventListener('resize', this.onWindowResize);
        //this.onWindowResize();
    }

    componentWillUnmount() {
        window.removeEventListener("keyup", this.keyPressed);
        //window.removeEventListener('resize', this.onWindowResize);
    }

    onWindowResize() {
    }

    keyPressed = (event: KeyboardEvent) => {
        if (event.defaultPrevented) {
            return;
        }
        var key = event.key || event.keyCode;
        // key code 8 is delete button on keyboard
        if (key === 'Backspace' || key === 'Delete' || key === 8) {
            if (this.selectedLinkInfo !== null && this.selectedLinkInfo !== undefined) {
                if (this.selectedLinkInfo.index !== null && this.selectedLinkInfo.index !== undefined && this.selectedLinkInfo.linkType === 'ccLink') {
                    this.onDeleteCCLink(this.selectedLinkInfo.deviceId, this.selectedLinkInfo.index);
                } else if (this.selectedLinkInfo.linkType === 'rfLink') {
                    if(this.selectedLinkInfo.deviceType === 'SENSOR') {
                        this.onDeleteRFLinkFromSensor(this.selectedLinkInfo.deviceId);
                    } else if(this.selectedLinkInfo.deviceType === 'REPEATER') {
                        this.onDeleteRFLinkFromRepeater(this.selectedLinkInfo.deviceId)
                    } 
                }
                return;
            }
        }
    };


    private updateTrayDimensions(): number {
        let fullTrayWidth = (Object.keys(this.state.trayDevices).length * 44);
        if (fullTrayWidth <= this.mapCabinetWidth) {
            fullTrayWidth = this.mapCabinetWidth;
            let tray = document.getElementById("trayDiv");
            if (tray !== null) {
                let width = this.mapCabinetWidth;
                tray.style.cssText = "width: " +width +"px;";
            }
        }
        else {
            let tray = document.getElementById("trayDiv");
            if (tray !== null) {
                let width = this.mapCabinetWidth;
                tray.style.cssText = "overflow-x: scroll; width: " +width +"px;";
            }
        }

        return fullTrayWidth;
    }

    /**
     * @returns the Point of upper left corner of map image (which may be negative relative to the container)
     * TODO: currently called on every render. would be better to call only
     *       when user changes window size or map image choice.
     */
    private updateMapDimensions(): GUIPoint {
        const update_ccLinks_required = (this.mapCabinetWidth !== this.props.mapCabinetTrayWidth);

        this.mapCabinetWidth = this.props.mapCabinetTrayWidth;
        this.mapWidth = this.mapCabinetWidth;
        if (this.rightCabinetPresent) {
            this.mapWidth -= this.cabinetWidth;
            if (this.leftCabinetPresent) {
                this.mapWidth -= this.cabinetWidth;
            }
        }

        let trayHeight: number = this.props.trayHeight;
        const trayDiv = document.getElementById('trayDiv');
        if (trayDiv !== null && MapAndTray.hasHorizontalScrollbar(trayDiv)) {
            trayHeight += 16;   // TODO: this is likely browser-dependent
        }

        this.mapCabinetHeight = this.props.mapCabinetTrayHeight - trayHeight + 8;
        this.mapHeight = this.mapCabinetHeight;
        this.cabinetHeight = this.mapHeight;

        this.rightCabinetX = this.mapCabinetWidth - this.cabinetWidth;

        const mapImageWidthHeight: WidthHeight = this.getMapImageWidthHeight();
        this.mapImageWidth = mapImageWidthHeight.width;
        this.mapImageHeight = mapImageWidthHeight.height;

        const mapX:number = (this.mapWidth/this.props.scale - this.mapImageWidth)/2.0;
        const mapY:number = (this.mapHeight/this.props.scale - this.mapImageHeight)/2.0;
        this.mapImageLocationInSvg = {x: mapX, y: mapY};

        this.mapImageTopLeftCorner = { 
            x: this.mapWidth/2 - (this.mapImageWidth*this.props.scale)/2,
            y: this.mapHeight/2 - (this.mapImageHeight*this.props.scale)/2
        };

        this.legendPosition = {
            x: this.mapWidth - 350 + 60,
            y: this.mapHeight - 300 -20
        };

        this.mapLowerLeftQuadrant = {
            x: 40,
            y: this.mapHeight - 20
        };
        this.mapUpperLeftQuadrant = {
            x: 40,
            y: 20,
        };

        this.mapLowerRightQuadrant = {
            x: this.legendPosition.x - 150,
            y: this.mapHeight - 20
        };
        this.mapUpperRightQuadrant = {
            x: this.legendPosition.x - 150,
            y: 20,
        };

        this.northArrowPosition = {
            x: (this.mapImageWidth/2.0) - (this.mapWidth - 70)/2,
            y: (this.mapImageHeight/2.0) - (this.mapHeight - 70)/2
        };

        this.textFieldStartPosition = {
            x: this.mapWidth / 2,
            y: this.mapHeight / 2
        };

        if (update_ccLinks_required) {
            this.updateChannelPositionByChannelId();
        }
        return {x: mapX, y: mapY};
    }

    static hasHorizontalScrollbar(elt: HTMLElement | null): boolean {
        if (elt === null) {
            return false;
        }
        return elt.scrollWidth > elt.clientWidth;
    }


    render():ReactNode {
        const allTrayDevices: ReactNode[] = this.renderTrayDevices(this.state.trayDevices);
        const mapHelpGestureRects: ReactNode[] = this.renderScalableMapHelpBalloons();
        const detectedSensors: Set<string> = this.getDetectedSensors();
        const cards: ReactNode[] = this.renderCards(detectedSensors);
        const dragProxy: ReactNode[] = this.renderDragProxy();
        const trayDragProxy: ReactNode[] = this.renderTrayDragProxy();
        const allCCLinks: ReactNode[] = this.renderCCLinks(detectedSensors);

        let mapSvgXY = {x:0,y:0}
        let leftCabinetCards: ReactNode = []
        let rightCabinetCards: ReactNode = []
        if (this.leftCabinetPresent && cards.length >= 2) {
            mapSvgXY = {x: this.cabinetWidth, y: 0}
            leftCabinetCards = cards[0]
            rightCabinetCards = cards[1]
        }
        const mapImageWidthHeight: WidthHeight = this.getMapImageWidthHeight();
        this.mapImageWidth = mapImageWidthHeight.width;
        this.mapImageHeight = mapImageWidthHeight.height;

        // TODO: following should not be necessary on every render.
        //       So it is a candidate for optimization.
        const mapXY:GUIPoint = this.updateMapDimensions();

        const apCode: ReactNode | null = this.renderAP();
        const allRfLinks: ReactNode[] = this.renderRfLinks();
        const theLegend: ReactNode = this.renderLegend();
        const mapTrayHelpGestureRects: ReactNode[] = this.renderStaticMapHelpBalloons();
        const trayHelpGestureRects: ReactNode[] = this.renderTrayHelpBalloons();
        const northArrowIcon: ReactNode = this.renderNorthArrowIcon();
        const cabinetIcon: ReactNode = this.renderCabinetIcon();
        const textFields: ReactNode[] = this.renderTextFields();
        const sensorZones = this.state.sensorZones;
        let fullTrayWidth = this.updateTrayDimensions();

        const cabinetTransform = 'translate(' + (this.rightCabinetX - 1) + ', 0)';

        const mapElementsTransform = 'scale(' + (this.props.scale) + ') translate(' +
            this.state.pan.x + ' ' + this.state.pan.y + ')';
        const mapViewBox = "0 0 " + this.mapWidth + " " + this.mapHeight;

        let helpHiLights: Hilight[] = [];
        if (this.props.helpEngine.isHelpEnabled()) {
            helpHiLights = this.props.topStore.getTopState().helpHiLights;
        }

        let mapImageUrl: string|null = '';
        if (this.props.mapImagesManager === null) {
            console.warn('MapAndTray.render(): null mapImagesManager');
            mapImageUrl = '';
        } else {
            const ap: GUIAPConfigClient | null = this.props.topStore.getTopState().ap;
            if (ap !== null) {
                // TODO: are these really different cases?  do we need both?
                if (this.props.mapImagesManager.isCustomMapSelected() &&
                    this.props.mapImagesManager.customMapExists) {
                    mapImageUrl = this.props.mapImagesManager.mapData[ap.mapImageIndex]!.image;
                } else {
                    const mapDatum: MapDatum|null|undefined = this.props.mapImagesManager.getCurrentMapDatum();
                    if (mapDatum !== null &&
                        mapDatum !== undefined) {
                        mapImageUrl = `${process.env.REACT_APP_API_BASE_URL}/images/maps/${mapDatum.image}`;
                    } else {
                        mapImageUrl = '';
                    }
                }
            }
        }

        const allSensorZones = this.renderSensorZones(sensorZones, helpHiLights);
        const allRadios = this.renderRadios();
        const allRepeaters = this.renderRepeaters();

        const mapCabinetTray:ReactNode =
            <div id="mapCabinetTrayDiv">
                <svg
                    width={this.mapCabinetWidth}
                    height={this.mapCabinetHeight}
                    className="mapCabinet"
                    onMouseMove={this.onMouseMove}
                    onMouseUp={this.onMouseUp}
                    onMouseLeave={this.onMouseLeave}
                    onMouseEnter={this.onMouseEnter}
                    id="mapCabinetSvg"
                    data-devicetype={ObjectType.MAP}
                >
                    {/* nested svg so map can have its own zoom/pan.
                        But it seems transform does not work on nested svg,
                        so I need to use a g anyway.  so may not need the
                        inner svg */
                    }

                    {this.leftCabinetPresent &&
                    <g className="cabinetG" key={'left'}>
                        <rect
                            className="cabinetRect"
                            width={this.cabinetWidth}
                            height={this.cabinetHeight}
                        />
                        {leftCabinetCards}
                    </g>
                    }
                    <svg x={mapSvgXY.x} y={mapSvgXY.y}
                         className="mapSvg" id="mapSvg"
                         width={this.mapWidth}
                         height={this.mapHeight}
                         viewBox={mapViewBox}
                         transform='scale(1)'>
                        {/* TODO: would be nicer to move mapImageG outside mapElementsG.
                                  That way, size of bg image would not alter size of
                                  mapElementsG, and would relieve extra computation.
                        */}
                        <g className='mapElementsG' transform={mapElementsTransform}
                           onMouseDown={this.onMouseDown}
                           onMouseUp={this.onMouseUp}
                        >
                            <g className='mapImageG'
                               onMouseUp={this.onMouseUp}
                            >
                                <rect id='mapBgRect'
                                      x={mapXY.x} y={mapXY.y}
                                      width={this.mapImageWidth} height={this.mapImageHeight}/>
                                <image id='mapImage'
                                       x={mapXY.x} y={mapXY.y}
                                       width={this.mapImageWidth} height={this.mapImageHeight}
                                       xlinkHref={mapImageUrl}/>
                            </g>

                            {cabinetIcon}
                            {northArrowIcon}
 
                            <g className='allRfLinks'>
                                {allRfLinks}
                            </g>
                            <g className='allCCLinks'>
                                {allCCLinks}
                            </g>

                            <g className="allMapSensorZones">
                                {allSensorZones}
                            </g>
                            <g className='allRadios'>
                                {allRadios}
                            </g>
                            <g className='allRepeaters'>
                                {allRepeaters}
                            </g>
                            {apCode}
                            <g className="testing">
                                {/*this.renderCentersOfDevices()*/}
                            </g>
                            {mapHelpGestureRects}
                        </g>
                        {/* Note: textFields are rendered OUTSIDE mapElementsG because
                                  They don't simply scale the way mapElementsG do.
                                  Rather they scale using complex text/font algorithm.
                        */}
                        {textFields}
                        {/* zoom in / zoom out icons*/}
                        <image x={this.mapWidth - 70}
                               y={this.mapHeight - 120}
                               width='30'
                               height='30'
                               xlinkHref={MapZoomIn}
                               id='mapZoomIn'
                               onClick={this.onZoom}/>
                        <image x={this.mapWidth - 70}
                               y={this.mapHeight - 90}
                               width='30'
                               height='30'
                               xlinkHref={MapZoomOut}
                               id='mapZoomOut'
                               onClick={this.onZoom}/>
                        {theLegend}
                        {mapTrayHelpGestureRects}
                    </svg>

                    {this.leftCabinetPresent ?
                        <g className="cabinetG" transform={cabinetTransform} key={'right'}>
                            <rect
                                className="cabinetRect"
                                width={this.cabinetWidth}
                                height={this.cabinetHeight}
                            />
                            {rightCabinetCards}
                        </g>
                        :
                        [this.rightCabinetPresent &&
                        <g className="cabinetG" transform={cabinetTransform} key={'right'}>
                            <rect
                                className="cabinetRect"
                                width={this.cabinetWidth}
                                height={this.cabinetHeight}
                            />
                            {cards}
                        </g>
                        ]
                    }


                    <g className='dragProxies'>
                        {/* a drag proxy only shows when dragging, e.g. from tray to map */}
                        {dragProxy}
                    </g>
                </svg>

                <div id='trayDiv' onScroll={this.onTrayScroll}>
                    <svg id={'traySvg'}
                         width={fullTrayWidth}
                         height={this.trayHeight}
                         className="traySvg"
                         onMouseMove={this.onMouseMove}
                         onMouseUp={this.onMouseUp}
                    >
                        <g className="trayG"
                           data-devicetype={ObjectType.TRAY}
                           onMouseEnter={this.onMouseEnter}
                           onMouseLeave={this.onMouseLeave}
                        >
                            <rect
                                id="trayRect"
                                className="tray"
                                width={fullTrayWidth}
                                height={this.trayHeight}
                                x={0}
                                y={0}
                            />
                            {allTrayDevices}
                            {trayHelpGestureRects}
                        </g>
                        <g id='trayDragProxyG' className='trayDragProxyG'>
                            {/*
                              * a drag proxy only shows when dragging, e.g. from map to tray
                              * TODO: this code is wrong, currently -- does not show
                              */}
                            {trayDragProxy}
                        </g>
                    </svg>
                </div>

                {/* Note Modal stack is last component, so it is on top of all the others,
                  * and prevents clicks from going through */}
                {this.renderModalDialogStack()}
            </div>;

        return mapCabinetTray;
    }


    private renderRepeaters(): ReactNode[] {
        return Object.keys(this.state.mapRepeaters).map(repeaterId => (
            <MapRepeaterG
                key={repeaterId}
                id={repeaterId}
                mapImageLocation={this.mapImageLocationInSvg}
                datum={this.state.mapRepeaters[repeaterId]}
                topStore={this.props.topStore}
                selected={this.props.selectedDotid === repeaterId}
                onMouseDown={this.onMouseDown}
                onMouseEnter={this.onMouseEnter}
                onMouseLeave={this.onMouseLeave}
                onClick={this.onClick}
                starZoom={this.starZoom}
            />
        ));
    }

    private renderRadios(): ReactNode[] {
        return Object.keys(this.state.radios).map(radioId => (
            <RadioG
                key={radioId}
                id={radioId}
                mapImageLocation={this.mapImageLocationInSvg}
                datum={this.state.radios[radioId]}
                selected={this.props.selectedDotid === radioId}
                onMouseDown={this.onMouseDown}
                onMouseEnter={this.onMouseEnter}
                onMouseLeave={this.onMouseLeave}
                onClick={this.onClick}
                topStore={this.props.topStore}
            />
        ));
    }

    /** iterate through the sensorZones in the data,
     *  creating a svg g (group) for each one */
    private renderSensorZones(sensorZones: { [p: string]: GUISZClient }, helpHiLights: Hilight[]): ReactNode {
        const szs =
            <React.Fragment> {
                Object.keys(sensorZones).map((szId: string) => (
                    <MapSensorZoneG
                        key={'szG-' + szId}
                        szid={szId}
                        mapImageLocation={this.mapImageLocationInSvg}
                        sensorZoneDatum={sensorZones[szId]}
                        mapSensors={this.props.getMapSensorsForSz(szId)}
                        helpHiLights={helpHiLights}
                        szWidth={100}
                        szHeight={this.szHeight}
                        selected={this.props.selectedSzId === szId}
                        topStore={this.props.topStore}
                        onMouseDown={this.onMouseDown}
                        onMouseEnter={this.onMouseEnter}
                        onMouseLeave={this.onMouseLeave}
                        onClick={this.onClick}
                        starZoom={this.starZoom}
                    />
                ))
            } </React.Fragment>

        return szs;
    }

    /**
     * TODO: This method should be used for debugging only.
     *       It should be commented out for production.
     *       Why do these centers block mouseEvents to elements below?
     *       It is confusing because these objects do not listen to mouse events.
     *       I think because they have nothing below them besides the map itself.
     *       They are not inside the various objects.
     *       ** That is, mouse events bubble up the html containment ancestry of a listening element,
     *       ** but do not necessarily reach other objects that are geographically below the mouse!!
     */
    private renderCentersOfDevices() {
        return <React.Fragment>
            {
                // TODO: this code is for debugging only.
                //       Should be commented out eventually.
                // iterate through the sensors in the data,
                // creating a dot at center of each using info.position
                Object.keys(this.state.mapSensors).map((sensorId: string) => {

                    const usefulPoint = this.getDrawablelMousePosition({
                        x: this.state.mapSensors[sensorId].info.position.x,
                        y: this.state.mapSensors[sensorId].info.position.y
                    });

                    return <circle key={'center' + sensorId}
                                   cx={usefulPoint.x}
                                   cy={usefulPoint.y}
                                   r={3}
                                   className='testing'
                    />
                })
            }
            {
                // TODO: this code is for debugging only.
                //       Should be commented out eventually.
                // iterate through the repeaters in the data,
                // creating a dot at center of each using info.position
                Object.keys(this.state.mapRepeaters).map((dotid: string) => {
                    const usefulPoint = this.getDrawablelMousePosition({
                        x: this.state.mapRepeaters[dotid].info.position.x,
                        y: this.state.mapRepeaters[dotid].info.position.y
                    });
                    return <circle key={'center' + dotid}
                                   cx={usefulPoint.x}
                                   cy={usefulPoint.y}
                                   r={3}
                                   className='testing'
                    />
                })
            }
            {
                // TODO: this code is for debugging only.
                //       Should be commented out eventually.
                // iterate through the radios in the data,
                // creating a dot at center of each using info.position
                Object.keys(this.state.radios).map((dotid: string) => {
                    const usefulPoint = this.getDrawablelMousePosition({
                        x: this.state.radios[dotid].info.position.x,
                        y: this.state.radios[dotid].info.position.y
                    });
                    return <circle key={'center' + dotid}
                                   cx={usefulPoint.x}
                                   cy={usefulPoint.y}
                                   r={3}
                                   className='testing'
                    />
                })
            }
            {
                // TODO: this code is for debugging only.
                //       Should be commented out eventually.
                // for AP
                // creating a dot at center  using info.position
                [this.state.ap].map((ap: GUIAPConfig | null) => {
                    if (this.state.ap === null) {
                        return null;
                    }
                    const usefulPoint = this.getDrawablelMousePosition({
                        x: this.state.ap.info.position.x,
                        y: this.state.ap.info.position.y
                    });
                    return <circle key={'centerAP'}
                                   cx={usefulPoint.x}
                                   cy={usefulPoint.y}
                                   r={3}
                                   className='testing'
                    />
                })
            }
        </React.Fragment>;
    }

    /** assuming that dotids would never overlap between Sensors and Repeaters */
    private renderRfLinks(): ReactNode[] {
        if (! this.props.topStore.getTopState().mapSettings.showRFLinks) {
            return [];
        }
        const sensorDotids:string[] = Object.keys(this.state.mapSensors);
        const sensorRfLinks:ReactNode[] = sensorDotids.map((dotId: string) => {
            const mapSensor:GUISensorClient = this.state.mapSensors[dotId];
            const rfLink:GUILink|undefined = mapSensor.info.rfLink;
            if (dotId !== undefined && rfLink !== undefined) {
                let selected = false;
                if (this.selectedLinkInfo !== null && this.selectedLinkInfo !== undefined) {
                    if (this.selectedLinkInfo.deviceId === dotId && this.selectedLinkInfo.index === undefined) {
                        selected = true;
                    }
                }
                if (rfLink !== undefined) {
                    if (rfLink.location === Location.MAP_AUTO) {
                        // need to (re)calculate rfLink.lines
                        console.error('renderRFLinks(): unexpected MAP_AUTO rflink. Currently, rfLink=', rfLink, ", mapSensor=", mapSensor);
                        return null;
                    }
                }
                return (
                    <RFLink key={'rf' + dotId}
                            dotId={dotId}
                            onMouseDown={this.onMouseDown}
                            mapImageLocation={this.mapImageLocationInSvg}
                            selected={selected}
                            lines={rfLink.lines}
                            dstId={rfLink.dstId}
                    />);
            } else {
                return null;
            }
        });

        const repeaterDotids:string[] = Object.keys(this.state.mapRepeaters);
        const repeaterRfLinks:ReactNode[] = repeaterDotids.map((dotId: string) => {
            const mapRepeater:GUIRepeaterClient = this.state.mapRepeaters[dotId];
            const rfLink:GUIRFLink|undefined = mapRepeater.info.rfLink;
            if (dotId !== undefined && rfLink !== undefined) {
                let selected = false;
                if (this.selectedLinkInfo !== null && this.selectedLinkInfo !== undefined) {
                    if (this.selectedLinkInfo.deviceId === dotId &&
                        this.selectedLinkInfo.index === undefined) {
                        selected = true;
                    }
                }
                if (rfLink !== undefined) {
                    if (rfLink.location === Location.MAP_AUTO) {
                        // need to (re)calculate rfLink.lines
                        console.error('renderRFLinks(): unexpected MAP_AUTO rfLink. Currently, rfLink=', rfLink, ", mapRepeater=", mapRepeater);
                        return null;
                    }
                }
                return (
                    <RFLink key={'rf' + dotId}
                            dotId={dotId}
                            onMouseDown={this.onMouseDown}
                            mapImageLocation={this.mapImageLocationInSvg}
                            selected={selected}
                            lines={rfLink.lines}
                            dstId={rfLink.dstId}
                    />);
            } else {
                return null;
            }
        });
        const rfLinks:ReactNode[] = sensorRfLinks.concat(repeaterRfLinks);
        //console.debug('renderRFLinks(): rfLinks=', rfLinks);
        return rfLinks;
    }

    private renderCCLinks(detectedSensors: Set<string>): ReactNode[] {
        if (! this.props.topStore.getTopState().mapSettings.showCCLinks) {
            return [];
        }
        let criticalInfo = {};
        Object.values(this.props.ccCards).map(ccCard => {
            Object.values(ccCard.channelsById).map(channel => {
                if(Object.keys(channel.sensorFailSafe).length != 0) {
                    Object.keys(channel.sensorFailSafe).map(sensor => {
                        let channelSensor = channel.id + "-" + sensor;
                        criticalInfo = {...criticalInfo, [channelSensor]: channel.sensorFailSafe[sensor]};
                    })
                }             
            })
        });
        const ccLinks: ReactNode[] = Object.keys(this.state.mapSensors).map((dotId: string) => {
            const mapSensor: GUISensorClient = this.state.mapSensors[dotId];
            const mapSensorDetected = detectedSensors.has(dotId);
            const ccLinks: GUICCLink[] = cloneDeep(mapSensor.info.ccLinks);
            // in case a cclink has an invalid dstid we do not want to render it,
            // but we do need to know the official index count for selected cclinks/dragging
            let ccLink_top_state_index = -1;
            for (let ccLink_index = 0; ccLink_index < ccLinks.length; ++ ccLink_index) {
                ccLink_top_state_index = ccLink_top_state_index + 1;
                const ccLink:GUICCLink = ccLinks[ccLink_index];
                if (this.state.dragging.eltDotid !== null && this.state.dragging.eltDotid === dotId) {
                    if (this.state.dragging.linkEndPointDrag &&
                        this.state.dragging.eltDatum === ccLink_top_state_index) {
                        if (this.selectedLinkInfo !== null && this.selectedLinkInfo !== undefined) {
                            if (this.selectedLinkInfo.deviceId === dotId &&
                                this.selectedLinkInfo.index === ccLink_top_state_index) {
                                ccLink.selected = true;
                            }
                        }
                        continue;
                    }
                }
                if (ccLink.dstId === null || ccLink.dstId === undefined) {
                    ccLinks.splice(ccLink_index, 1);
                    ccLink_index = ccLink_index - 1;
                    continue;
                }

                if (ccLink.lines.length > 0 &&
                    this.ccChannelPositionByChannelId[ccLink.dstId] !== undefined) {
                    ccLink.lines[ccLink.lines.length-1].bPoint =
                        this.ccChannelPositionByChannelId[ccLink.dstId];
                    if (this.selectedLinkInfo !== null && this.selectedLinkInfo !== undefined) {
                        if (this.selectedLinkInfo.deviceId === dotId &&
                            this.selectedLinkInfo.index === ccLink_top_state_index) {
                            ccLink.selected = true;
                        }
                    }
                } else {
                    console.error('ccLink has no lines or not in ccChannelPositions');
                    ccLinks.splice(ccLink_index, 1);
                    ccLink_index = ccLink_index - 1;
                    continue;
                }
            }
            return (
                ccLinks.map((ccLink: GUICCLink) => (
                    <CCLink key={'ccLink' + dotId + '|' + ccLink.dstId}
                            dotId={dotId}
                            mapImageLocation={this.mapImageLocationInSvg}
                            onMouseDown={this.onMouseDown}
                            selected={ccLink.selected}
                            detect={mapSensorDetected}
                            lines={ccLink.lines}
                            dstId={ccLink.dstId}
                            channelType={this.getChannelType(ccLink.dstId)}
                            critical={criticalInfo[ccLink.dstId + '-' + dotId]}
                            dashedLine={this.props.ap.showDashedCardConnectionLines}
                    />))
            )
        });
        return ccLinks;
    }

    private renderNorthArrowIcon(): ReactNode {
        let selected = false;
        if (this.props.selected !== null) {
            if (this.props.selected.selectedDeviceType === ObjectType.MAP_NORTH_ARROW_ICON) {
                selected = true;
            }
        }
        const icon:ReactNode = (
            <NorthArrowIcon
                northArrowPosition={this.northArrowPosition}
                mapImageLocation={this.mapImageLocationInSvg}
                mapWidth={this.mapWidth}
                mapHeight={this.mapHeight}
                northArrowIconRotation={this.state.northArrowIconRotation}
                northArrowIconWidth={this.northArrowIconWidth}
                northArrowIconHeight={this.northArrowIconHeight}
                selected={selected}
                onClick={this.onClick}
                onMouseDown={this.onMouseDown}
            />
        );

        // only show North icon once we have its data from GUIAPConfig
        return this.props.topStore.getTopState().ap !== null ? icon : null;
    }

    private setTextRenderedCheckTimer(text: string, id: string) {
        if (!this.isTextRendered(text, id)) {
            setTimeout(()=> {
                if (this.isTextRendered(text, id)) {
                    this.setState({updateText: true});
                }
                else {
                    this.setTextRenderedCheckTimer(text,id);
                }
            }, 100);
        }
    }

    private isTextRendered(text: string, id: string): boolean {
        if (text === undefined || text === null) {
            return false;
        }
        let newLines = text.split('\n');
        for (let line_index = 0; line_index < newLines.length; ++line_index) {
            let lineId = id + line_index
            var el = document.getElementsByTagName('text');
            let textFieldText = el.namedItem(lineId);
            if (textFieldText === null) {
                return false;
            }
        }
        return true;
    }

    private renderScalableMapHelpBalloons(): ReactNode[] {
        let helpBalloons: ReactNode[] = []

        if (! this.props.helpEngine.isHelpEnabled()) {
            return helpBalloons;
        }

        for (let balloon of this.props.topStore.getTopState().helpBalloons) {
            switch (balloon.location.helpLocType) {
                case HelpLocType.MAP_OBJECT:
                    switch(balloon.location.locObjectType) {
                        case ObjectType.SENSOR_ZONE:
                            if (balloon.location.locObjectId !== undefined) {
                                let sensorZone: Mappable = this.state.sensorZones[balloon.location.locObjectId];
                                let mapLoc: GUIPoint = {x: 0, y: 0};
                                let id = "";
                                if (sensorZone !== null && sensorZone !== undefined) {
                                    id = sensorZone.id;
                                    this.helpGestureLoc = {
                                        x: sensorZone.info.position.x,
                                        y: sensorZone.info.position.y + this.szHeight/2
                                    };
                                    mapLoc.x = this.helpGestureLoc.x + this.mapImageLocationInSvg.x + 75;
                                    mapLoc.y = this.helpGestureLoc.y + this.mapImageLocationInSvg.y - this.szHeight/2;
                                }

                                helpBalloons.push(
                                    <HelpEngineBalloon
                                        key={balloon.location.helpLocType + id}
                                        id={balloon.location.helpLocType}
                                        balloon={balloon}
                                        position={mapLoc}
                                        mapImageScale={1}
                                        helpEngine={this.props.helpEngine}
                                        onHelpGuideClicked={this.props.onHelpGuideClicked}
                                    />
                                );
                                this.setTextRenderedCheckTimer(balloon.text, balloon.location.helpLocType)
                            }
                            break;
                        case ObjectType.MAP_SENSOR:
                            if (balloon.location.locObjectId !== undefined) {
                                let szId = this.props.sensorDotidToSzId[balloon.location.locObjectId];
                                if (szId !== null && szId !== undefined) {
                                    let sensorZone: Mappable = this.state.sensorZones[szId];
                                    let mapLoc: GUIPoint = {x: 0, y: 0};
                                    if (sensorZone !== null && sensorZone !== undefined) {
                                        this.helpGestureLoc = {
                                            x: sensorZone.info.position.x,
                                            y: sensorZone.info.position.y + this.szHeight/2
                                        };
                                        mapLoc.x = this.helpGestureLoc.x + this.mapImageLocationInSvg.x + 75;
                                        mapLoc.y = this.helpGestureLoc.y + this.mapImageLocationInSvg.y - this.szHeight/2;
                                    }

                                    helpBalloons.push(
                                        <HelpEngineBalloon
                                            key={balloon.location.helpLocType + balloon.location.locObjectId}
                                            id={balloon.location.helpLocType}
                                            balloon={balloon}
                                            position={mapLoc}
                                            mapImageScale={1}
                                            helpEngine={this.props.helpEngine}
                                            onHelpGuideClicked={this.props.onHelpGuideClicked}
                                        />
                                    );
                                    this.setTextRenderedCheckTimer(balloon.text, balloon.location.helpLocType)
                                }
                            }
                            break;
                        default:
                            // all other types, we ignore -- render elsewhere
                            break;
                    }
                    break;
                default:
                    break;
            }
        }
        return helpBalloons;
    }

    private renderStaticMapHelpBalloons(): ReactNode[] {
        let helpBalloons: ReactNode[] = []

        if (! this.props.helpEngine.isHelpEnabled()) {
            return helpBalloons;
        }

        for (let balloon of this.props.topStore.getTopState().helpBalloons) {
            let position: GUIPoint;
            switch (balloon.location.helpLocType) {
                case HelpLocType.MAP_LOWER_LEFT_QUADRANT:
                    position = this.mapLowerLeftQuadrant;
                    break;
                case HelpLocType.MAP_UPPER_LEFT_QUADRANT:
                    position = this.mapUpperLeftQuadrant;
                    break;
                case HelpLocType.MAP_LOWER_RIGHT_QUADRANT:
                    position = this.mapLowerRightQuadrant;
                    break;
                case HelpLocType.MAP_UPPER_RIGHT_QUADRANT:
                    position = this.mapUpperRightQuadrant;
                case HelpLocType.BUTTON_TOP_BAR:
                case HelpLocType.TRAY:
                case HelpLocType.TRAY_OBJECT:
                case HelpLocType.MAP_OBJECT:
                    // don't render here; gets rendered elsewhere.
                    continue;
                default:
                    console.error('unexpected helpLocType', balloon.location.helpLocType);
                    continue;
            }
            helpBalloons.push(
                <HelpEngineBalloon
                    key={balloon.location.helpLocType}
                    id={balloon.location.helpLocType}
                    balloon={balloon}
                    position={position}
                    mapImageScale={1}
                    helpEngine={this.props.helpEngine}
                    onHelpGuideClicked={this.props.onHelpGuideClicked}
                />
            );
            this.setTextRenderedCheckTimer(balloon.text, balloon.location.helpLocType)
        }
        return helpBalloons;
    }

    /**
     *  TextFields are rendered OUTSIDE mapElementsG because
     *  They don't simply scale the way mapElementsG does.
     *  Rather they scale using complex text/font algorithm.
     */
    private renderTextFields(): ReactNode[] {
        const textFields: ReactNode[] = [];
        for (let id of Object.keys(this.state.textFields)) {
            const textFieldValue: TextField = cloneDeep(this.state.textFields[id]);
            textFields.push(
                <TextFieldG
                    key={id}
                    id={id}
                    textField={textFieldValue}
                    mapImageScale={this.props.scale}
                    selectedDotid={this.props.selectedDotid}
                    textFieldStartPosition={this.textFieldStartPosition}
                    mapPan={this.state.pan}
                    onClick={this.onClick}
                    onMouseDown={this.onMouseDown}
                />
            );
            this.setTextRenderedCheckTimer(textFieldValue.editText !== undefined ? textFieldValue.editText : textFieldValue.text, id);
        }
        return textFields;
    }

    /**
     * Note: the location of the cabinet icon is controlled entirely by the transform applied
     *       to the svg g (group)
     */
    private renderCabinetIcon(): ReactNode {
        let cabinetIcon: ReactNode = null;
        const mapSettings = this.props.topStore.getTopState().mapSettings;
        if (mapSettings.showCabinetIcon) {
            const relativeIconLocation: GUIPoint = {...this.state.cabinetIconPosition};
            const transformPosition: GUIPoint = {
                x: relativeIconLocation.x + this.mapImageLocationInSvg.x,
                y: relativeIconLocation.y + this.mapImageLocationInSvg.y,
            }
            // console.debug('renderCabinetIcon(): this.mapImageLocationInSvg=', this.mapImageLocationInSvg, "relativeIconLocation=", relativeIconLocation);
            const transform = "translate(" + transformPosition.x + ", " + transformPosition.y + ")";

            cabinetIcon =
                <g className='gCabinetIcon draggable selectable'
                   data-dotid='image'
                   data-devicetype={ObjectType.CABINET_ICON}
                   transform={transform}
                   onMouseDown={this.onMouseDown}
                   >
                    <image width={40} height={40}
                           xlinkHref={CabinetIcon} id='cabinetIcon'
                           className='cabinetIconImage'
                    />
                    <rect width={40} height={40} fill="lightgray" fillOpacity={.2}></rect>
                    <text x={20} y={30}>Cabinet</text>
                </g>
        }
        return cabinetIcon;
    }

    private calculatePosition(positionX: number, positionY: number, channelNo: number, cardType?: Interface): GUIPoint {
        const channelIconHeight = 15;
        const position:Point = {
            x: positionX,
            y: Math.round((channelIconHeight*(channelNo - 1)) + positionY + (channelIconHeight/2))
        };
        const xformedPosition:Point = this.getTransformedMousePosition(position);
        return {
            x: xformedPosition.x - this.state.pan.x,
            y: xformedPosition.y - this.state.pan.y,
        }
    }

    /**
     * given a channelId like "CH_16", returns 16
     */
    public static getChannelNo(channelId: string): number {
        let channelIdSplit: string[] = channelId.split('_');
        if (channelIdSplit.length > 0) {
            let channelNo: number = +(channelIdSplit[channelIdSplit.length - 1]);
            return channelNo;
        } else {
            throw new Error('unexpected channelId: ' + channelId);
        }
    }

    /**
     * Update the hash channelPositionByChannelId.
     * TODO: we lack a quick test from cardId to tell if it is a CC card, as opposed to 'SDLC' or 'APGI'.
     *       I guess we could define function isCCCard(cardid: string) { return cardid !== 'SDLC' && cardid !== 'APGI'; }
     */
    private updateChannelPositionByChannelId() {
        const channelPositionHash: {[channelId: string]: GUIPoint} = {};
        for (const cardId of Object.keys(this.props.ccCards)) {
            const ccCard = cloneDeep(this.props.ccCards[cardId]) as GUICCCardClient;
            let sdlcData: GUISDLCClient;
            const channelIds: string[] = Object.keys(ccCard.channelsById);
            if (cardId === 'SDLC') {
                sdlcData = cloneDeep(this.props.ccCards[cardId]) as GUISDLCClient;
            } else if (cardId === 'APGI') {
                // in the following sort(), we use a custom sort by Shelf,Slot,Channel.
                //       This same sort for APGI channels is in 2 other places
                channelIds.sort(AptdApp.compareAPGIChannels);
            } else if (cardId === 'STS') {
                // in the following sort(), we use a custom sort by IP,Group,Channel.
                //       This same sort for STS channels is in 2 other places
                channelIds.sort(AptdApp.compareSTSChannels);
            }
            let channelNo: number = 1;
            for (const channelId of channelIds) {
                let positionY:number = ccCard.info.position.y;

                if (cardId === 'SDLC') {
                    // B3                                       B1
                    //                    Map
                    // B4                                       B2   
                    // If fewer banks are present, they fill in in numerical order.
                    
                    // channelId looks like, e.g., "B3-CH_11"
                    // bankNoString would then be ["B3","CH_11"]
                    const channelParts:string[] = channelId.split("-");
                    if (channelParts.length > 0 && channelParts[0].startsWith('B')) {
                        const bankNo:number = Number(channelParts[0].slice(1, channelParts[0].length));
                        const bank_index:number = sdlcData!.banks.indexOf(bankNo);
                        if (bank_index === 0 || bank_index === 1) {
                            // first 2 banks go on right side of map
                            positionY = ccCard.info.position.y + bank_index * 248;
                            channelPositionHash[channelId] =
                                this.calculatePosition(this.mapWidth - 1, positionY,
                                    MapAndTray.getChannelNo(channelId), ccCard.cardInterface);
                        } else if (bank_index === 2 || bank_index === 3) {
                            // optional 3rd and 4th banks go on left side of map
                            positionY = ccCard.info.position.y + (bank_index - 2) * 248;
                            channelPositionHash[channelId] =
                                this.calculatePosition(0, positionY,
                                    MapAndTray.getChannelNo(channelId), ccCard.cardInterface);
                        } else {
                            console.error('invalid bank_index', bank_index);
                        }
                    } else {
                        console.error('invalid SDLC cardChannelId: ', channelId);
                    }
                } else if (cardId === 'APGI') {
                    positionY += 3;  // fudge factor
                    channelPositionHash[channelId] = this.calculatePosition((this.mapWidth - 1), positionY, channelNo, ccCard.cardInterface);
                    channelNo++;
                } else if (cardId === 'STS') {
                    positionY += 20;  // in STS case, channels start below STS label
                    channelPositionHash[channelId] = this.calculatePosition((this.mapWidth - 1), positionY, channelNo, ccCard.cardInterface);
                    channelNo++;
                } else {
                    // Assert: this is the case of CC_CARD.  (actually EX card)
                    // TODO: There should be a better test to determine CC_CARD case
                    channelPositionHash[channelId] = this.calculatePosition((this.mapWidth - 1), positionY, MapAndTray.getChannelNo(channelId), ccCard.cardInterface);
                }
            }
        }
        this.ccChannelPositionByChannelId = channelPositionHash;
    }

    private getDetectedSensors(): Set<string> {
        let detectedSensors: Set<string> = new Set([]);
        if (this.props !== undefined && this.props.mapSensors !== undefined && this.props.mapSensors !== null) {
            for (let [dotid, mapSensor] of Object.entries(this.props.mapSensors)) {
                if (mapSensor.detect) {
                    detectedSensors.add(dotid);
                }
            }
        }
        return detectedSensors;
    }

    private getDetectedCards(detectedSensors: Set<string>): {[ccCard: string]: string[]} {
        let detectedCards: {[ccCard: string]: string[]} = {};
        if (this.props !== undefined && this.props.mapSensors !== undefined && this.props.mapSensors !== null) {
            for (let sensor_dotid of Array.from(detectedSensors)) {
                const mapSensor = this.props.mapSensors[sensor_dotid];
                if (mapSensor !== null && mapSensor !== undefined) {
                    for (let cc_link of mapSensor.info.ccLinks) {

                        let ccCard = "";
                        if (cc_link.dstId !== undefined) {
                            if (cc_link.dstId.length > 5) {
                                ccCard = cc_link.dstId.slice(0, cc_link.dstId.length-5);
                            }
                            let dstId_string = cc_link.dstId.split('-');
                            if (dstId_string.length > 1) {
                                if (dstId_string[0].startsWith('B',0)) {
                                    ccCard = dstId_string[0];
                                }
                            }
                        }
                        else {
                            continue;
                        }

                        let ccCard_detected_channels = detectedCards[ccCard];
                        if (ccCard_detected_channels === null || ccCard_detected_channels === undefined) {
                            ccCard_detected_channels = [cc_link.dstId];
                        }
                        else {
                            ccCard_detected_channels.push(cc_link.dstId);
                        }
                        detectedCards[ccCard] = ccCard_detected_channels;
                    }
                }
            }
        }
        return detectedCards;
    }

    private getDetectedChannelIds(detectedSensorIds: Set<string>): Set<string> {
        let detectedChannelIds: Set<string> = new Set<string>();
        if (this.props.mapSensors !== undefined &&
            this.props.mapSensors !== null) {
            for (let sensorDotid of Array.from(detectedSensorIds)) {
                const mapSensor = this.props.mapSensors[sensorDotid];
                if (mapSensor !== null && mapSensor !== undefined) {
                    for (let cc_link of mapSensor.info.ccLinks) {
                        detectedChannelIds.add(cc_link.dstId);
                    }
                }
            }
        }
        return detectedChannelIds;
    }


    private renderCards(detectedSensors: Set<string>): ReactNode[] {
        // HR: TODO: do we need to invoke updateChannelPositionByChannelId() here?
        //           I think not, because it is already invoked in render().
        this.updateChannelPositionByChannelId();
        let cards: ReactNode[] = new Array<ReactNode>();
        if (Object.keys(this.props.ccCards).length > 0) {
            const aCard = Object.values(this.props.ccCards)[0];
            // there will only be one type of CC card, at most
            switch (aCard.otype) {
                case 'GUICCCard':
                    cards = this.renderCCCards(detectedSensors);
                    break;

                case 'GUICCSDLC':
                    cards = this.renderSDLCCard(detectedSensors, aCard);
                    break;

                case "GUICCAPGI":
                    cards = this.renderAPGICard(detectedSensors, aCard);
                    break;

                case "GUICCSTS":
                    cards = this.renderSTSCard(detectedSensors, aCard);
                    break;

                default:
                    throw new Error('unexpected otype: ' + this.props.ccCards[0].otype);
            }
        }
        else {
            this.leftCabinetPresent = false;
        }

        this.rightCabinetPresent = false;
        if (cards.length > 0) {
            this.rightCabinetPresent = true;
        }
        return cards;
    }

    private renderSTSCard(detectedSensors: Set<string>, aCard: GUICCInterfaceBaseClient): ReactNode[] {

        const detectedChannelIds: Set<string> = this.getDetectedChannelIds(detectedSensors);
        const cards: ReactNode[] = [<STSG
            datum={cloneDeep(this.props.ccCards['STS']) as GUICCSTSClient}
            id={aCard.id}
            key={aCard.id}
            selected={this.props.selected !== null &&
            ObjectType.STS === this.props.selected.selectedDeviceType}
            detectedChannelIds={detectedChannelIds}
            onClick={this.onClick}
            onMouseDown={this.onMouseDown}
            onMouseEnter={this.onMouseEnter}
            onMouseLeave={this.onMouseLeave}
        />];

        return cards;
    }

    private renderAPGICard(detectedSensors: Set<string>, aCard: GUICCInterfaceBaseClient): ReactNode[] {

        const detectedChannelIds: Set<string> = this.getDetectedChannelIds(detectedSensors);
        const cards: ReactNode[] = [<APGIG
                            datum={cloneDeep(this.props.ccCards['APGI']) as GUICCAPGIClient}
                            id={aCard.id}
                            key={aCard.id}
                            selected={this.props.selected !== null &&
                            ObjectType.APGI === this.props.selected.selectedDeviceType}
                            detectedChannelIds={detectedChannelIds}
                            onClick={this.onClick}
                            onMouseDown={this.onMouseDown}
                            onMouseEnter={this.onMouseEnter}
                            onMouseLeave={this.onMouseLeave}
        />];

        return cards;
    }

    private renderSDLCCard(detectedSensors: Set<string>, aCard: GUICCInterfaceBaseClient): ReactNode[] {

        let cards: ReactNode[] = [];
        const detectedCards: { [ccCard: string]: string[] } = this.getDetectedCards(detectedSensors);
        const sdlcDatum = cloneDeep(this.props.ccCards['SDLC']) as GUISDLCClient;
        if (sdlcDatum !== null && sdlcDatum !== undefined) {
            if (sdlcDatum.banks.length > 2) {
                //Create left and right cabinet for SDLC Banks
                this.leftCabinetPresent = true;
                let leftBanks = cloneDeep(sdlcDatum) as GUISDLCClient;
                let rightBanks = cloneDeep(sdlcDatum) as GUISDLCClient;
                // fill banks on right side first, then left side if more remain
                leftBanks.banks = rightBanks.banks.splice(2, 2)
                cards = [
                    <SDLCG
                        datum={leftBanks}
                        id={aCard.id}
                        key={aCard.id}
                        leftSideBank={true}
                        onClick={this.onClick}
                        onMouseDown={this.onMouseDown}
                        onMouseEnter={this.onMouseEnter}
                        onMouseLeave={this.onMouseLeave}
                        selected={this.props.selected !== null &&
                        ObjectType.SDLC_BANK === this.props.selected.selectedDeviceType}
                        selectedBankNo={this.props.selectedDotid === null ? 0 : +this.props.selectedDotid}
                        detectedCardChannels={detectedCards}
                    />
                    ,
                    <SDLCG
                        datum={rightBanks}
                        id={aCard.id}
                        key={aCard.id}
                        leftSideBank={false}
                        onClick={this.onClick}
                        onMouseDown={this.onMouseDown}
                        onMouseEnter={this.onMouseEnter}
                        onMouseLeave={this.onMouseLeave}
                        selected={this.props.selected !== null &&
                        ObjectType.SDLC_BANK === this.props.selected.selectedDeviceType}
                        selectedBankNo={this.props.selectedDotid === null ? 0 : +this.props.selectedDotid}
                        detectedCardChannels={detectedCards}
                    />
                ]
            } else {
                this.leftCabinetPresent = false;
                cards = [
                    <SDLCG
                        datum={cloneDeep(this.props.ccCards['SDLC'])}
                        id={aCard.id}
                        key={aCard.id}
                        leftSideBank={false}
                        onClick={this.onClick}
                        onMouseDown={this.onMouseDown}
                        onMouseEnter={this.onMouseEnter}
                        onMouseLeave={this.onMouseLeave}
                        selected={this.props.selected !== null &&
                        ObjectType.SDLC_BANK === this.props.selected.selectedDeviceType}
                        selectedBankNo={this.props.selectedDotid === null ? 0 : +this.props.selectedDotid}
                        detectedCardChannels={detectedCards}
                    />
                ]
            }
        } else {
            this.leftCabinetPresent = false;
        }

        return cards;
    }

    private renderCCCards(detectedSensors: Set<string>): ReactNode[] {
        const detectedCards: { [ccCardId: string]: string[] } = this.getDetectedCards(detectedSensors);
        const cardIds: string[] = Object.keys(this.props.ccCards);
        const cards: ReactNode[] = cardIds.map((cardId: string) => (
            <CCCardG
                datum={cloneDeep(this.props.ccCards[cardId]) as GUICCCardClient}
                id={this.props.ccCards[cardId].id}
                key={'ccCard' + this.props.ccCards[cardId].id}
                onClick={this.onClick}
                onMouseDown={this.onMouseDown}
                onMouseEnter={this.onMouseEnter}
                onMouseLeave={this.onMouseLeave}
                selected={cardId === this.props.selectedDotid}
                detectedChannels={detectedCards[cardId]}
            />
        ));

        return cards;
    }


    /**
     * This method should return 1 or 0 nodes. (1 or 0 proxies).
     * It returns 1 node if the current drag uses a proxy icon
     */
    private renderDragProxy(): ReactNode[] {
        let dragProxies: ReactNode[] = [];
        if (this.state.dragging.eltDotid !== null &&
            this.state.dragging.proxyLoc !== undefined) {
            //console.debug('START MapAndTray.renderDragProxy(): dragging.proxyLoc=', this.state.dragging.proxyLoc);
            switch (this.state.dragging.proxyType) {
                case ObjectType.TRAY_SENSOR:
                    dragProxies.push(
                        <ProxySensorG
                            key={this.state.dragging.eltDotid}
                            dotid={this.state.dragging.eltDotid}
                            pointX={this.state.dragging.proxyLoc.x}
                            pointY={this.state.dragging.proxyLoc.y}
                            helpGesturePresent={this.state.dragging.eltDotid === this.highlightedSensor}
                        />);
                    break;
                case ObjectType.MAP_SENSOR:
                    // to represent a MapSensorG, use a ProxySensorMiniG, smaller
                    dragProxies.push(
                        <ProxySensorMiniG
                            key={this.state.dragging.eltDotid}
                            dotid={this.state.dragging.eltDotid}
                            pointX={this.state.dragging.proxyLoc.x}
                            pointY={this.state.dragging.proxyLoc.y}
                        />);
                    break;
                case ObjectType.MAP_REPEATER:
                    // to represent a MapRepeaterG, use a ProxyRepeaterMiniG, smaller
                    dragProxies.push(
                        <ProxyRepeaterMiniG
                            key={this.state.dragging.eltDotid}
                            dotid={this.state.dragging.eltDotid}
                            pointX={this.state.dragging.proxyLoc.x}
                            pointY={this.state.dragging.proxyLoc.y}
                        />);
                    break;
                case ObjectType.TRAY_REPEATER:
                    dragProxies.push(
                        <ProxyRepeaterG
                            key={this.state.dragging.eltDotid}
                            dotid={this.state.dragging.eltDotid}
                            pointX={this.state.dragging.proxyLoc.x}
                            pointY={this.state.dragging.proxyLoc.y}
                        />);
                    break;
                default:
                    //console.error('unexpected dragging.proxyType', this.state.dragging.proxyType);
                    break;
            }
        }
        return dragProxies;
    }

    /**
     * TODO: this code is wrong currently.  Needs fixing.
     *       Probably need more state in dragging, and more adjustment
     *       to locate the proxy in the tray.
     * This method should return 1 or 0 nodes. (1 or 0 proxies).
     * It returns 1 node if the current drag uses a proxy icon
     * while mouse is over the Tray.
     * e.g., when dragging Sensor or Repeater from Map to Tray
     */
    private renderTrayDragProxy(): ReactNode[] {
        let dragProxies: ReactNode[] = [];
        if (this.state.dragging.eltDotid !== null &&
            this.state.dragging.proxyLoc !== undefined) {
            // console.debug('START MapAndTray.renderTrayDragProxy(): dragging.proxyLoc=', this.state.dragging.proxyLoc);
            switch (this.state.dragging.proxyType) {
                case ObjectType.MAP_SENSOR:
                    // to represent a MapSensorG, use a ProxySensorMiniG, smaller
                    dragProxies.push(
                        <ProxySensorMiniG
                            key={this.state.dragging.eltDotid}
                            dotid={this.state.dragging.eltDotid}
                            pointX={this.state.dragging.proxyLoc.x}
                            pointY={this.state.dragging.proxyLoc.y - this.mapCabinetHeight}
                        />);
                    break;
                case ObjectType.MAP_REPEATER:
                    // to represent a MapRepeaterG, use a ProxyRepeaterMiniG, smaller
                    dragProxies.push(
                        <ProxyRepeaterMiniG
                            key={this.state.dragging.eltDotid}
                            dotid={this.state.dragging.eltDotid}
                            pointX={this.state.dragging.proxyLoc.x}
                            pointY={this.state.dragging.proxyLoc.y - this.mapCabinetHeight}
                        />);
                    break;
                case ObjectType.TRAY_REPEATER:
                case ObjectType.TRAY_SENSOR:
                case ObjectType.CABINET_ICON:
                    // we do nothing in this case.  Presumably already have a drag proxy.
                    break;
                default:
                    console.debug('unexpected dragging.proxyType', this.state.dragging.proxyType);
                    break;
            }
        }
        return dragProxies;
    }

    private getDefaultTrayHelpBalloonPos(): GUIPoint {
        let mapHelpGestureLocation = { x: 0, y: 20 };
        mapHelpGestureLocation.x = this.mapLowerLeftQuadrant.x;
        if (this.leftCabinetPresent) {
            mapHelpGestureLocation.x = mapHelpGestureLocation.x + this.cabinetWidth;
        }
        if (this.helpGestureLoc.y !== 0) {
            mapHelpGestureLocation.y = this.helpGestureLoc.y
        }
        return mapHelpGestureLocation;
    }

    private renderTrayHelpBalloons(): ReactNode[] {

        let helpBalloons: ReactNode[] = []

        if (!this.props.helpEngine.isHelpEnabled()) {
            return helpBalloons;
        }

        for (let balloon of this.props.topStore.getTopState().helpBalloons) {
            switch(balloon.location.helpLocType) {
                case HelpLocType.TRAY:
                    let mapHelpGestureLocation = this.getDefaultTrayHelpBalloonPos();
                    helpBalloons.push(
                        <HelpEngineBalloon
                            key={balloon.location.helpLocType}
                            id={balloon.location.helpLocType}
                            balloon={balloon}
                            position={mapHelpGestureLocation}
                            mapImageScale={1}
                            helpEngine={this.props.helpEngine}
                            onHelpGuideClicked={this.props.onHelpGuideClicked}
                        />
                    );
                    this.setTextRenderedCheckTimer(balloon.text, balloon.location.helpLocType)
                    break;
                default:
                    break;
            }
        }   

        return helpBalloons;
    }

    private keepTrayDevicesInView(trayDevices: {[dotid: string]: Mappable}) {
        let firstTrayDeviceInView = "";
        this.lastTrayDeviceInView = "";
        let scrollNeedsAdjusting = false;
        const trayDiv = document.getElementById('trayDiv');
        if (trayDiv !== null && MapAndTray.hasHorizontalScrollbar(trayDiv)) {

            let deviceIds: Array<string> = TopStore.sortTrayDevices(trayDevices);
            for (const deviceId of deviceIds) {
                //Find first and last element that is in scroll view
                let elmnt = document.getElementById(deviceId);
                if (elmnt !== null) {
                    let coords = elmnt.getBoundingClientRect();
                    let windowWidth = trayDiv.clientWidth;
                    let leftVisible = coords.left < windowWidth && coords.left > 0;
                    let rightVisible = coords.right < windowWidth && coords.right > 0;

                    if (!leftVisible && !rightVisible) {
                        if (firstTrayDeviceInView !== "" && this.lastTrayDeviceInView !== "") {
                            //we are now past the last visible tray device
                            break;
                        }
                    }
                    else if (leftVisible) {
                        if (firstTrayDeviceInView === "") {
                            firstTrayDeviceInView = deviceId
                        }
                        this.lastTrayDeviceInView = deviceId
                    }
                }
                else {
                    //Check if the position this device will be place into is outside current scroll viewBox
                    if (firstTrayDeviceInView === "") {
                        //Before first device in view - this is the only case we need to worry about
                        scrollNeedsAdjusting = true;
                    }

                }
            }
        }
        if (scrollNeedsAdjusting) {
            if (firstTrayDeviceInView !== "" && this.lastTrayDeviceInView !== "") {
                let lastDevice = this.lastTrayDeviceInView;
                setTimeout(() => {
                    let elmnt = document.getElementById(lastDevice);
                    if (elmnt !== null) {
                        elmnt.scrollIntoView(true);
                    }
                },10);
            }
        }
    }

    /**
     * iterate through the trayDevices in the data,
     * creating a svg g (group) for each one
     */
    private renderTrayDevices(trayDevices: {[dotid: string]: Mappable}): ReactNode[] {
        // Check if tray has scroll bar and which devices are in view
        if (this.state.trayWasScrolled) {
            this.keepTrayDevicesInView(trayDevices);
        }

        let shiftTrayDevicesRightByX = 0;
        if (this.props.helpEngine.isHelpEnabled()) {
            for (let highlightedDevice of this.props.topStore.getTopState().helpHiLights) {
                if (highlightedDevice.location.helpLocType === HelpLocType.TRAY_OBJECT &&
                    highlightedDevice.location.locObjectType === ObjectType.TRAY_SENSOR) {
                    //Find First Tray Sensor that is not a MicroRadar Sensor
                    shiftTrayDevicesRightByX = 100;
                    if (this.leftCabinetPresent) {
                        shiftTrayDevicesRightByX = 100 + this.cabinetWidth;
                    }
                    let sortedTrayDeviceIds = TopStore.sortTrayDevices(trayDevices);
                    for (let deviceIdIndex = 0; deviceIdIndex < sortedTrayDeviceIds.length; ++deviceIdIndex) {
                        let trayDevice = trayDevices[sortedTrayDeviceIds[deviceIdIndex]];
                        if (trayDevice.otype === 'GUISensor') {
                            const traySensor = trayDevice as GUISensorClient;
                            if (traySensor.hwType !== GUISensorType.RAD) {
                                this.highlightedSensor = trayDevice.id;
                                if (this.state.dragging.eltDotid === null || this.state.dragging.eltDotid !== trayDevice.id) {
                                    this.helpGestureLoc.x = trayDevice.info.position.x + 50;
                                    this.helpGestureLoc.y = trayDevice.info.position.y;
                                }
                                break;
                            }
                        }
                    }
                    break;
                }
                else {
                    this.highlightedSensor = ""
                    this.helpGestureLoc = {x: 0, y: 0}
                }
            }
        }
        else {
            this.highlightedSensor = ""
            this.helpGestureLoc = {x: 0, y: 0}
        }

        const allTrayDevices: ReactNode[] =
            Object.keys(trayDevices).map((trayDotid: string, trayIndex: number) => {
                const trayDevice = trayDevices[trayDotid];
                if (this.highlightedSensor === trayDevice.id) {
                    //Wait to render highlighted device so blue rings render above other tray devices
                    return null;
                }
                return (trayDevice.otype === 'GUISensor' ?
                        <TraySensorG
                            key={trayDevice.id}
                            dotid={trayDevice.id}
                            datum={trayDevice as GUISensorClient}
                            topStore={this.props.topStore}
                            mapHeight={this.mapHeight}
                            shiftSensorPosX={shiftTrayDevicesRightByX}
                            selected={trayDevice.id === this.props.selectedDotid}
                            onMouseDown={this.onMouseDown}
                            onClick={this.onClick}
                        />
                        :
                        <TrayRepeaterG
                            key={trayDevice.id}
                            dotid={trayDevice.id}
                            datum={trayDevice as GUIRepeaterClient}
                            topStore={this.props.topStore}
                            mapHeight={this.mapHeight}
                            shiftRepeaterPosX={shiftTrayDevicesRightByX}
                            selected={trayDevice.id === this.props.selectedDotid}
                            onMouseDown={this.onMouseDown}
                            onClick={this.onClick}
                        />
                )
            });
        
        // Render the highlighted sensor last
        // so the blue rings are rendered above the other tray devices
        if (this.highlightedSensor !== "" &&
            trayDevices[this.highlightedSensor] !== null &&
            trayDevices[this.highlightedSensor] !== undefined) {
            const trayDevice:Mappable = trayDevices[this.highlightedSensor];
            allTrayDevices.push(
                <TraySensorG
                    key={trayDevice.id}
                    dotid={trayDevice.id}
                    datum={trayDevice as GUISensorClient}
                    topStore={this.props.topStore}
                    mapHeight={this.mapHeight}
                    helpGesturePresent={true}
                    shiftSensorPosX={shiftTrayDevicesRightByX}
                    selected={trayDevice.id === this.props.selectedDotid}
                    onMouseDown={this.onMouseDown}
                    onClick={this.onClick}
                />
            );
        }
        return allTrayDevices;
    }

    private renderAP(): ReactNode {
        let apCode: ReactNode;
        if (this.state.ap !== null) {
            apCode =
                <APG datum={this.state.ap}
                     mapImageLocation={this.mapImageLocationInSvg}
                     selected={this.props.selectedDotid === this.state.ap.id}
                     topStore={this.props.topStore}
                     onMouseDown={this.onMouseDown}
                     onClick={this.onClick}
                />;
        } else {
            apCode = null;
        }
        return apCode;
    }

    private renderLegend(): ReactNode {
        let legend: ReactNode | null;
        // we test for ap because that indicates arrival of GUIAPConfig from server
        if (this.props.topStore.getTopState().mapSettings.showLegend &&
            this.props.topStore.getTopState().ap !== null) {
            const legendWidth:number = 210;
            const circleRadius:number = 8;
            const circleX:number = this.legendPosition.x + legendWidth - circleRadius;
            const circleY:number = this.legendPosition.y + circleRadius / 2;
            legend =
                <>
                    <image x={this.legendPosition.x}
                           y={this.legendPosition.y}
                           width={legendWidth}
                           height='320'
                           xlinkHref={Legend} id='legend'
                           className="mapLegendImg"/>
                    <g className='deleteLegendG'
                       onClick={this.hideLegend}>
                        <circle cx={circleX}
                                cy={circleY}
                                r={circleRadius}
                                className='deleteLegendCircle'/>
                        <text x={circleX} y={circleY}
                              className='deleteLegendText'>x</text>
                    </g>
                </>
        }
        return legend;
    }

    private hideLegend(e: React.MouseEvent<SVGGElement, MouseEvent>):void {
        this.props.undoManager.enactActionsToStore({
            description: 'hide legend',
            actions: [{
                objectType: ObjectType.MAP_SETTINGS,
                objectId: "",
                newData: {showLegend: false},
                origData: {showLegend: true},
                updateType: UpdateType.UPDATE,
            }],
        }, EnactType.USER_ACTION);
    }

    /**
     * compares 2 sensor zones.
     * @return true if the sensor zones have different sensors, or even
     *         different order of sensors or different spacing of sensors
     *         or different name or description (case insensitive) or usage
     */
    static sensorZonesDiffer(sz1: GUISZClient, sz2: GUISZClient): boolean {
        if (sz1.sensorIds.length !== sz2.sensorIds.length) {
            return true;
        }

        for (let sensorIndex: number = 0; sensorIndex < sz1.sensorIds.length; sensorIndex++) {
            if (sz1.sensorIds[sensorIndex] !== sz2.sensorIds[sensorIndex]) {
                return true;
            }
        }

        if (sz1.name !== sz2.name ||
            //sz1.desc !== sz2.desc ||
            sz1.otype !== sz2.otype ||
            sz1.spacingsMm.length !== sz2.spacingsMm.length) {
            return true;
        }

        for (let spacingIndex: number = 0; spacingIndex < sz1.spacingsMm.length; ++ spacingIndex) {
            if (sz1.spacingsMm[spacingIndex] !== sz2.spacingsMm[spacingIndex]) {
                return true;
            }
        }

        return false;
    }

    /**
     * compares 2 sets of sensor zones.
     * @return true if the sensor zones have different sensors, or even
     *         different order of sensors or different spacing of sensors
     *         or different names, descriptions.
     */
    static sensorZoneSetsDiffer(szs1: {[szid: string]: GUISZClient},
                                szs2: {[szid: string]: GUISZClient}): boolean {
        if (Object.keys(szs1).length !== Object.keys(szs2).length) {
            return true;
        }
        for (let szid of Object.keys(szs1)) {
            if (MapAndTray.sensorZonesDiffer(szs1[szid], szs2[szid])) {
                return true;
            }
        }
        return false;
    }

    static locationsDiffer<T extends Mappable> (mapItems1: {[sensorId: string]: T},
                                                mapItems2: {[sensorId: string]: T}): boolean {
        let differ:boolean;
        if (Object.keys(mapItems1).length !== Object.keys(mapItems2).length) {
            differ = true;
        } else {
            differ = false;
            for (let key of Object.keys(mapItems1)) {
                const mapItem2 = mapItems2[key];
                const mapItem1 = mapItems1[key];
                if (mapItem2 === undefined ||
                    MapAndTray.pointsDiffer(mapItem1.info.position, mapItem2.info.position) ||
                    mapItem1.info.rotationDegrees !== mapItem2.info.rotationDegrees) {
                    differ = true;
                    break;
                }
            }
        }
        return differ;
    }

    private static ssValueDiffer(szs1: {[szid: string]: GUISZClient},
        szs2: {[szid: string]: GUISZClient}): boolean {
            for (let szid of Object.keys(szs1)) {
                if(szs1[szid].stopbarSensitivity !== szs2[szid].stopbarSensitivity) {
                    return true;
                }
            }
            return false;
        }

    private static locationDiffers(ap: GUIAPConfig | null, ap2: GUIAPConfig | null): boolean {
        let differ:boolean = false;
        if (ap !== null && ap2 === null ||
            ap === null && ap2 !== null) {
            differ = true;
        } else if (ap !== null && ap2 !== null &&
                   MapAndTray.pointsDiffer(ap.info.position, ap2.info.position)) {
            differ = true;
        }
        return differ;
    }

    public static pointsDiffer(pt1: GUIPoint, pt2: GUIPoint): boolean {
        const differ: boolean = (pt1.x !== pt2.x || pt1.y !== pt2.y);
        return differ;
    }

    /**
     * a GUILink has an Array of lines.
     * @returns false if every line in link1, link2 has same endpoints
     */
    public static linksDiffer(link1: GUILink, link2: GUILink): boolean {
        if (link1.lines.length !== link2.lines.length) {
            return true;
        }
        if (link1.selected !== link2.selected) {
            return true;
        }
        if (link1.location !== link2.location) {
            return true;
        }
        for (let line_index = 0; line_index < link1.lines.length; ++line_index) {
            if (this.pointsDiffer(link1.lines[line_index].aPoint, link2.lines[line_index].aPoint) ||
                this.pointsDiffer(link1.lines[line_index].bPoint, link2.lines[line_index].bPoint)) {
                return true;
            }
        }
        return false;
    }

    private static ccCardUnheardStatusDiffers(newCCCards: { [cardId: string]: GUICCInterfaceBaseClient },
                                              prevCCCards: { [cardId: string]: GUICCInterfaceBaseClient }): boolean {
        if (Object.keys(newCCCards).length > 0 && Object.keys(prevCCCards).length > 0) {
            const aCard = Object.values(newCCCards)[0];
            const aCardPrev = Object.values(prevCCCards)[0];
            switch (aCard.otype) {
                case 'GUICCCard':
                    for (let newCCCard of Object.values(newCCCards)) {
                        let prevCCCard = prevCCCards[newCCCard.id];
                        if (prevCCCard !== null && prevCCCard !== undefined) {
                            if (newCCCard.unheard !== prevCCCard.unheard) {
                                return true;
                            }
                        }
                    }
                    break;
                case 'GUICCSDLC':
                case 'GUICCAPGI':
                case 'GUICCSTS':
                    if (aCard.unheard !== aCardPrev.unheard) {
                        return true;
                    }
                    break;
                default:
                    break;
            }
        }
        return false;
    }

    private static unheardStatusDiffers(newMapDevices: {[dotid: string]: Mappable},
                                        prevMapDevices: {[dotid: string]: Mappable}): boolean {

        for (let dotid of Object.keys(newMapDevices)) {
            let newMapDevice = newMapDevices[dotid];
            let prevMapDevice = prevMapDevices[dotid];
            if (newMapDevice !== null && prevMapDevice !== null) {
                if (newMapDevice.unheard !== prevMapDevice.unheard) {
                    return true;
                }
            }
        }
        return false;
    }

    private static seenStatusDiffers(newMapDevices: {[dotid: string]: GUIRepeaterClient|GUISensorClient},
                                     prevMapDevices: {[dotid: string]: GUIRepeaterClient|GUISensorClient}): boolean {

        for (let dotid of Object.keys(newMapDevices)) {
            let newMapDevice = newMapDevices[dotid];
            let prevMapDevice = prevMapDevices[dotid];
            if (newMapDevice !== null && prevMapDevice !== null) {
                if (newMapDevice.seen !== prevMapDevice.seen) {
                    return true;
                }
            }
        }
        return false;
    }

    private static channelOrChannelModeDiffers(newRadios: {[radioId: string]: GUIRadioClient},
                                               prevMapRadios: {[radioId: string]: GUIRadioClient}): boolean {
        for (let dotid of Object.keys(newRadios)) {
            let newRadio = newRadios[dotid];
            let prevRadio = prevMapRadios[dotid];
            if (newRadio !== null && prevRadio !== null) {
                if (newRadio.desiredChannel !== prevRadio.desiredChannel) {
                    return true;
                }
                if (newRadio.channelMode !== prevRadio.channelMode) {
                    return true;
                }
            }
        }
        return false;
    }

    private static downstreamChannelDiffers(newRepeaters: {[dotid: string]: GUIRepeaterClient},
                                            prevRepeaters: {[dotid: string]: GUIRepeaterClient}): boolean {
        for (let dotid of Object.keys(newRepeaters)) {
            let newRepeater: GUIRepeaterClient = newRepeaters[dotid];
            let prevRepeater: GUIRepeaterClient = prevRepeaters[dotid];
            if (newRepeater !== undefined && prevRepeater !== undefined) {
                if (newRepeater.desiredDownstreamChannel !== prevRepeater.desiredDownstreamChannel) {
                    return true;
                }
            }
        }
        return false;
    }

    private static rssiValueDiffers(newSensors: {[dotid: string]: Mappable},
                                    prevSensors: {[dotid: string]: Mappable}): boolean {
        for (let dotid of Object.keys(newSensors)) {
            let newSensor = newSensors[dotid];
            let prevSensor = prevSensors[dotid];
            if (newSensor !== null && prevSensor !== null) {
                if (newSensor.rssi !== prevSensor.rssi) {
                    return true;
                }
            }
        }
        return false;
    }

    private static mapImageIndexDiffers(newAp: GUIAPConfigClient | null, prevAp: GUIAPConfigClient | null): boolean {
        if (newAp !== null && prevAp !== null && newAp.mapImageIndex !== prevAp.mapImageIndex) {
            return true;
        } else {
            return false;
        }
    }

    private static busyStatusDiffers(newDevices: {[dotid: string]: GUISensorClient|GUIRepeaterClient},
                                     prevDevices: {[dotid: string]: GUISensorClient|GUIRepeaterClient}): boolean {
        for (const dotid of Object.keys(newDevices)) {
            const newDevice = newDevices[dotid];
            const prevDevice = prevDevices[dotid];
            if (newDevice !== null && newDevice !== undefined && prevDevice !== null && prevDevice !== undefined) {
                if (newDevice.busyStatus !== prevDevice.busyStatus) {
                    return true;
                }
            }
        }
        return false;
    }

    private static percentCompleteDiffers(newDevices: {[dotid: string]: GUISensorClient|GUIRepeaterClient|GUIRadioClient},
                                          prevDevices: {[dotid: string]: GUISensorClient|GUIRepeaterClient|GUIRadioClient}): boolean {
        for (const dotid of Object.keys(newDevices)) {
            const newDevice = newDevices[dotid];
            const prevDevice = prevDevices[dotid];
            if (newDevice !== null && newDevice !== undefined && prevDevice !== null && prevDevice !== undefined) {
                if (newDevice.percentComplete !== prevDevice.percentComplete) {
                    return true;
                }
            }
        }
        return false;
    }

    private static uploadingDiffers(newDevices: {[dotid: string]: GUISensorClient|GUIRepeaterClient|GUIRadioClient},
                                    prevDevices: {[dotid: string]: GUISensorClient|GUIRepeaterClient|GUIRadioClient}): boolean {
        for (const dotid of Object.keys(newDevices)) {
            const newDevice = newDevices[dotid];
            const prevDevice = prevDevices[dotid];
            if (newDevice !== null && newDevice !== undefined && prevDevice !== null && prevDevice !== undefined) {
                if (newDevice.uploading !== prevDevice.uploading) {
                    return true;
                }
            }
        }
        return false;
    }

    /** compares mapSensors or mapRepeaters for their RF and CC Links */
    private static mapDeviceLinksDiffer(newMapDevices: {[dotid: string]: Mappable},
                                        prevMapDevices: {[dotid: string]: Mappable}): boolean {

        for (let dotid of Object.keys(newMapDevices)) {
            const newMapDevice:Mappable = newMapDevices[dotid];
            const prevMapDevice:Mappable = prevMapDevices[dotid];
            if (newMapDevice !== undefined && prevMapDevice !== undefined) {
                //check RFLinks
                if (newMapDevice.info.rfLink !== undefined && prevMapDevice.info.rfLink !== undefined) {
                    const new_rfLink:GUILink = newMapDevice.info.rfLink;
                    const prev_rfLink:GUILink = prevMapDevice.info.rfLink;
                    if (this.linksDiffer(new_rfLink, prev_rfLink)) {
                        return true;
                    }
                }
                else if ((newMapDevice.info.rfLink !== undefined && prevMapDevice.info.rfLink === undefined) ||
                         (newMapDevice.info.rfLink === undefined && prevMapDevice.info.rfLink !== undefined)) {
                    return true;
                }

                //check ccLinks
                if (newMapDevice.info.ccLinks !== undefined && prevMapDevice.info.ccLinks !== undefined) {
                    if (newMapDevice.info.ccLinks.length !== prevMapDevice.info.ccLinks.length) {
                        return true;
                    }
                    for (let link_index = 0; link_index < newMapDevice.info.ccLinks.length; ++link_index) {
                        const new_ccLink:GUICCLink = newMapDevice.info.ccLinks[link_index];
                        const prev_ccLink:GUICCLink = prevMapDevice.info.ccLinks[link_index];
                        if (this.linksDiffer(new_ccLink, prev_ccLink)) {
                            return true;
                        }
                    }
                }
                else if ((newMapDevice.info.ccLinks !== undefined && prevMapDevice.info.ccLinks === undefined) ||
                         (newMapDevice.info.ccLinks === undefined && prevMapDevice.info.ccLinks !== undefined)) {
                    return true;
                }
            } else if ((newMapDevice !== undefined && prevMapDevice === undefined ) ||
                       (newMapDevice === undefined && prevMapDevice !== undefined)) {
                return true;
            }
        }
        return false;
    }

    private static mapNorthArrowDiffers(newMapSettings: MapSettings,
                                        prevNorthArrowRotationDegrees: number): boolean {
        if (newMapSettings.northArrowRotationDegrees !== prevNorthArrowRotationDegrees) {
            return true;
        }
        return false;
    }

    private static mapTextFieldsDiffer(newMapTextFields: {[id: string] :TextField},
                                       prevMapTextFields: {[id: string] :TextField}): boolean {
        if (Object.keys(newMapTextFields).length !== Object.keys(prevMapTextFields).length) {
            return true;
        }
        for (let dotid of Object.keys(newMapTextFields)) {
            let newTextField = newMapTextFields[dotid];
            let prevTextField = prevMapTextFields[dotid];
            if (newTextField !== null && newTextField !== undefined &&
                prevTextField !== null && prevTextField !== undefined) {

                if (newTextField.editText !== prevTextField.editText) {
                    return true;
                }
                if (newTextField.text !== prevTextField.text) {
                    return true;
                }
                if (newTextField.position !== null && prevTextField.position !== null) {
                    if (this.pointsDiffer(newTextField.position, prevTextField.position)) {
                        return true;
                    }
                }
                else if ((newTextField.position === null && prevTextField.position !== null) || 
                         (newTextField.position !== null && prevTextField.position === null)) {
                    return true;
                }
                if (newTextField.rotationDegrees !== prevTextField.rotationDegrees) {
                    return true;
                }
            }
            else {
                return true;
            }
        }
        return false;
    }

    /**
     * dragstart
     * This method is used to begin a drag, if user moused down on a
     * "draggable" object on map (which is inferred by "draggable" class
     * on the target).  If user just moused down on the map only, then
     * begin drag of the map itself (i.e. a "pan").
     *
     * Most draggable elements are assumed to be a g element in an svg.
     *
     * Q: How does this event handler knows the datum of the target?
     * A: Right now I get it from a data attribute "dotid" on the g element target.
     */
    private onMouseDown(event: React.MouseEvent<Element>):void {
        // preventDefault resolved the Firefox dragging issue we saw
        event.preventDefault();
        
        console.log("onMouseDown() started", event.currentTarget);
        event.stopPropagation();
        let currentTargetG: Element | null;

        AptdApp.blurFocusedField();
        // we want to force an onBlur() on the InfoPanelTextField, if shown.
        AptdApp.unfocusInfoPanelTextField();

        // assert: currentTarget is a svg g element
        if (event.currentTarget.nodeName === "g") {
            currentTargetG = event.currentTarget;
        } else if ((event.currentTarget.nodeName === "rect" ||
                    event.currentTarget.nodeName === "polyline") &&
                   (event.currentTarget.classList.contains("rfLinkPolylineBuffer") ||
                    event.currentTarget.classList.contains("ccLinkPolylineBuffer"))) {
            currentTargetG = event.currentTarget;
        } else if (event.currentTarget.nodeName.toLowerCase() === "div" &&
                   event.currentTarget.classList.contains("modalHeader")) {
            currentTargetG = event.currentTarget;
        } else {
            console.warn("unexpected event.currentTarget", event.currentTarget.nodeName);
            this.clearSelectedLink();
            return;
        }
        const clientPoint = {x: event.clientX, y: event.clientY};
        const modifiedPoint = {...this.getMousePosition(event)};
        let clearSelectedLink = true;

        if (currentTargetG.classList.contains("draggable")) {
            this.setState((prevState: MapAndTrayState) => {
                // assert: target is a draggable "g" element
                let dragging: Dragging = cloneDeep(prevState.dragging) as Dragging;
                let lastNotOverlappingLocation: GUIPoint|null =
                    cloneDeep(this.state.lastNotOverlappingLocation);
                let lastNotOverlappingRotation = this.state.lastNotOverlappingRotation;
                if (dragging === undefined) {
                    return null;
                }
                dragging.elt = currentTargetG as SVGElement|HTMLDivElement;
                dragging.eltDotid = (dragging.elt.dataset.dotid === undefined ?
                    null : dragging.elt.dataset.dotid);

                if (currentTargetG !== null &&
                    (currentTargetG.nodeName === "polyline" || currentTargetG.nodeName === "rect")) {

                    dragging.eltDotid = (dragging.elt.dataset.deviceid === undefined ?
                            null : dragging.elt.dataset.deviceid);
                }

                if (dragging.eltDotid === null) {
                    console.error('onMouseDown(): unexpected null dotid on g');
                    return null;
                }

                dragging.elt.focus();

                switch (dragging.elt.dataset.devicetype) {
                    case ObjectType.TRAY_SENSOR:
                        dragging.type = ObjectType.TRAY_SENSOR;
                        this.setTrayDeviceDragState(dragging);
                        break;

                    case ObjectType.TRAY_REPEATER:
                        dragging.type = ObjectType.TRAY_REPEATER;
                        this.setTrayDeviceDragState(dragging);
                        break;

                    case ObjectType.MAP_SENSOR:
                        this.setMapSensorDragState(dragging, clientPoint);
                        break;

                    case ObjectType.MAP_REPEATER:
                        this.setMapRepeaterDragState(dragging, clientPoint);
                        lastNotOverlappingLocation = dragging.eltDatum.info.position;
                        break;

                    case ObjectType.RF_LINK:
                        this.setRfLinkDragState(dragging, modifiedPoint);
                        if (dragging.elt.dataset.deviceid !== null && dragging.elt.dataset.deviceid !== undefined) {
                            clearSelectedLink = this.isSelectedLinkCleared(ObjectType.RF_LINK, dragging.elt.dataset.deviceid, 0);
                        }
                        break;

                    case ObjectType.CC_LINK:
                        this.setCcLinkDragState(dragging, modifiedPoint);
                        if (dragging.elt.dataset.deviceid !== null && dragging.elt.dataset.deviceid !== undefined) {
                            clearSelectedLink = this.isSelectedLinkCleared(ObjectType.CC_LINK, dragging.elt.dataset.deviceid, dragging.eltDatum);
                        }
                        break;

                    case 'szG':
                    case 'szRectG':
                    case ObjectType.SENSOR_ZONE:
                        this.setSZDragState(dragging);
                        lastNotOverlappingLocation = dragging.eltDatum.info.position;
                        break;

                    case 'szRotateG':
                        // rotate currently only applies to SensorZone
                        this.setSZRotationDragState(dragging);
                        lastNotOverlappingRotation = dragging.eltStartDeg;
                        break;

                    case ObjectType.RADIO:
                        this.setRadioDragState(dragging);
                        lastNotOverlappingLocation = dragging.eltDatum.info.position;
                        break;

                    case ObjectType.AP:
                        this.setApDragState(dragging);
                        lastNotOverlappingLocation = dragging.eltDatum.info.position;
                        break;
                    case ObjectType.MAP_NORTH_ARROW_ICON:
                        this.setNorthIconRotateDragState(dragging);
                        break;

                    case ObjectType.TEXT_FIELD:
                        this.setTextFieldDragState(dragging, TransformType.TRANSLATE, modifiedPoint);
                        break;

                    case ObjectType.CABINET_ICON:
                        this.setCabinetIconDragState(dragging, TransformType.TRANSLATE, clientPoint);
                        break;
                    case 'gTextFieldRotate':
                        this.setTextFieldDragState(dragging, TransformType.ROTATE, modifiedPoint);
                        break;
                    case ObjectType.MODAL:
                        this.setModalDragState(dragging, TransformType.TRANSLATE, modifiedPoint);
                        break;
                    default:
                        throw new Error('unexpected objectType: ' + dragging.elt.dataset.deviceType);
                }

                console.log("onMouseDown(): eltStartLoc=", dragging.eltStartLoc);
                if (dragging.targetType !== ObjectType.RF_LINK &&
                    dragging.targetType !== ObjectType.CC_LINK &&
                    dragging.type !== ObjectType.TEXT_FIELD) {
                    dragging.lastLoc = dragging.eltStartLoc === null ? null : {
                        x: clientPoint.x,
                        y: clientPoint.y
                    };
                }
                // dotid is text content of text node
                // is there a way we can get it from "data"?
                console.log("onMouseDown(): set dragging.elt=", dragging.elt,
                    "dragging.eltStartLoc", dragging.eltStartLoc,
                    "dragging.eltDotId=", dragging.eltDotid);

                if (dragging === undefined) {
                    return null;
                }
                if (clearSelectedLink) {
                    this.clearSelectedLink();
                }
                return {
                    dragging: dragging,
                    lastNotOverlappingLocation: lastNotOverlappingLocation,
                    lastNotOverlappingRotation: lastNotOverlappingRotation
                };
            });
        } else if (currentTargetG.classList.contains("mapElementsG")) {
            console.debug('onMouseDown(): on the map: starting pan of map');
            this.clearSelectedLink();
            // panning the Map View
            this.setState((prevState: MapAndTrayState) => {
                let newDragging: Dragging = {
                    elt: currentTargetG as SVGElement,
                    eltDatum: null,
                    eltDotid: null,
                    eltStartDeg: null,
                    target: null,
                    targetType: null,
                    transformType: null,
                    type: ObjectType.MAP,
                    eltStartLoc: {x: clientPoint.x, y: clientPoint.y},
                    lastLoc: {x: clientPoint.x, y: clientPoint.y}
                };
                return {dragging: newDragging};
            });
        }
    }

    private setTrayDeviceDragState(dragging: Dragging){
        if (dragging.eltDotid === null) {
            return;
        }
        dragging.transformType = TransformType.TRANSLATE;
        dragging.eltDatum = this.state.trayDevices[dragging.eltDotid];
        dragging.eltStartLoc = {
            x: dragging.eltDatum.info.position.x,
            y: dragging.eltDatum.info.position.y
        };
    }

    private setMapSensorDragState(dragging: Dragging, clientPoint: GUIPoint){
        if (dragging.eltDotid === null || dragging.elt === null) {
            return;
        }
        dragging.transformType = TransformType.TRANSLATE;
        dragging.type = ObjectType.MAP_SENSOR;
        dragging.eltDatum = this.state.mapSensors[dragging.eltDotid];
        dragging.proxyType = ObjectType.MAP_SENSOR;
        dragging.proxyLoc = clientPoint;
        dragging.proxyStartLoc = clientPoint;
        dragging.eltStartLoc = {...dragging.eltDatum.info.position};

        // can drop map sensor elsewhere on its sensor zone
        dragging.targetType = ObjectType.SENSOR_ZONE;
        dragging.target = dragging.elt.closest(".szRectG") as SVGElement;
        dragging.targetOK = true;
        dragging.target.classList.add('validDropTarget');
    }

    private setMapRepeaterDragState(dragging: Dragging, clientPoint: GUIPoint){
        if (dragging.eltDotid === null || dragging.elt === null) {
            return;
        }
        dragging.transformType = TransformType.TRANSLATE;
        dragging.type = ObjectType.MAP_REPEATER;
        dragging.eltDatum = this.state.mapRepeaters[dragging.eltDotid];
        dragging.proxyType = ObjectType.MAP_REPEATER;
        dragging.proxyLoc = clientPoint;
        dragging.proxyStartLoc = clientPoint;
        dragging.targetOK = true; // because we can drag on map to move
        dragging.targetType = ObjectType.MAP;
        dragging.eltStartLoc = {...dragging.eltDatum.info.position};
        dragging.linkSensorIds = this.getAllLinkSensorIds(dragging.eltDotid);
        dragging.linkRepeaterIds = this.getAllLinkRepeaterIds(dragging.eltDotid);
    }

    private isSelectedLinkCleared(linkType: ObjectType, deviceId: string, linkIndex: number): boolean {
        if (this.selectedLinkInfo !== null && this.selectedLinkInfo !== undefined) {
            if (linkType === ObjectType.RF_LINK) {
                if (this.selectedLinkInfo.deviceId === deviceId && this.selectedLinkInfo.index === undefined) {
                    return false;
                }
            }
            else if (linkType === ObjectType.CC_LINK) {
                console.warn("test1 ", this.selectedLinkInfo.deviceId, " ", this.selectedLinkInfo.index, " ", linkIndex)
                if (this.selectedLinkInfo.deviceId === deviceId && this.selectedLinkInfo.index === linkIndex) {
                    return false;
                }
            }
        }
        return true;
    }

    private setRfLinkDragState(dragging: Dragging, modifiedPoint: GUIPoint) {
        if (dragging.elt === null) {
            return;
        }
        let deviceId = dragging.elt.dataset.deviceid;
        let dstId = dragging.elt.dataset.dstid;
        let segmentId = (dragging.elt.dataset.segmentid === undefined ? null : dragging.elt.dataset.segmentid);
        if (deviceId !== undefined && dstId !== undefined && segmentId !== undefined) {
            console.log("RF_LINK deviceId ", deviceId, " dstId ", dstId);

            if (this.state.mapSensors[deviceId] !== null && this.state.mapSensors[deviceId] !== undefined) {
                dragging.eltDatum = this.state.mapSensors[deviceId].info.rfLink
                dragging.linkSegmentIndex = Number(segmentId);
                dragging.type = ObjectType.RF_LINK

                let point = {...this.getTransformedMousePosition(modifiedPoint)};
                dragging.eltStartLoc = {
                    x: Math.round(point.x - this.mapImageLocationInSvg.x),
                    y: Math.round(point.y - this.mapImageLocationInSvg.y)
                };
                dragging.lastLoc = dragging.eltStartLoc
            }
            else if (this.state.mapRepeaters[deviceId] !== null && this.state.mapRepeaters[deviceId] !== undefined) {
                dragging.eltDatum = this.state.mapRepeaters[deviceId].info.rfLink
                dragging.linkSegmentIndex = Number(segmentId);
                dragging.type = ObjectType.RF_LINK

                let point = {...this.getTransformedMousePosition(modifiedPoint)};
                dragging.eltStartLoc = {
                    x: Math.round(point.x - this.mapImageLocationInSvg.x),
                    y: Math.round(point.y - this.mapImageLocationInSvg.y)
                };
                dragging.lastLoc = dragging.eltStartLoc
            }
        }
        else {
            return null;
        }
    }

    private setCcLinkDragState(dragging: Dragging, modifiedPoint: GUIPoint) {
        if (dragging.elt === null) {
            return;
        }
        let ccDstId = dragging.elt.dataset.dstid;
        let ccSegmentId = (dragging.elt.dataset.segmentid === undefined ? null : dragging.elt.dataset.segmentid);
        if (dragging.elt.dataset.deviceid !== undefined && ccDstId !== undefined && ccSegmentId !== undefined) {

            for (let ccLinkIndex = 0; ccLinkIndex < this.state.mapSensors[dragging.elt.dataset.deviceid].info.ccLinks.length; ++ccLinkIndex) {
                let ccLink: GUICCLink = this.state.mapSensors[dragging.elt.dataset.deviceid].info.ccLinks[ccLinkIndex];
                if (ccLink !== null) {
                    if (ccLink.dstId === ccDstId) {
                        dragging.eltDatum = ccLinkIndex;
                    }
                }
            }
            dragging.linkSegmentIndex = Number(ccSegmentId);
            dragging.type = ObjectType.CC_LINK;

            let point = {...this.getTransformedMousePosition(modifiedPoint)};
            dragging.eltStartLoc = {
                x: point.x,
                y: point.y
            };
            dragging.lastLoc = dragging.eltStartLoc;
        }
        else {
            return null;
        }
    }

    private setSZDragState(dragging: Dragging) {
        if (dragging.eltDotid === null || dragging.elt === null) {
            return;
        }
        dragging.transformType = TransformType.TRANSLATE;
        dragging.type = ObjectType.SENSOR_ZONE;
        dragging.eltDatum = this.state.sensorZones[dragging.eltDotid];
        dragging.eltStartLoc = {...dragging.eltDatum.info.position};
    }

    private setSZRotationDragState(dragging: Dragging) {
        if (dragging.eltDotid === null || dragging.elt === null) {
            return;
        }
        dragging.transformType = TransformType.ROTATE;
        dragging.type = ObjectType.SENSOR_ZONE;
        dragging.eltDatum = this.state.sensorZones[dragging.eltDotid];
        dragging.eltStartLoc = {
            x: dragging.eltDatum.info.position.x,
            y: dragging.eltDatum.info.position.y
        };

        dragging.eltStartDeg = dragging.eltDatum.info.rotationDegrees;
        if (dragging.eltDatum.info.rotationDegrees === undefined || dragging.eltDatum.info.rotationDegrees === null) {
            dragging.eltStartDeg = 0;
        }
    }

    private setRadioDragState(dragging: Dragging) {
        if (dragging.eltDotid === null || dragging.elt === null) {
            return;
        }
        dragging.transformType = TransformType.TRANSLATE;
        dragging.type = ObjectType.RADIO;
        dragging.eltDatum = this.state.radios[dragging.eltDotid];
        dragging.eltStartLoc = {...dragging.eltDatum.info.position};
        dragging.linkSensorIds = this.getAllLinkSensorIds(dragging.eltDotid);
        dragging.linkRepeaterIds = this.getAllLinkRepeaterIds(dragging.eltDotid);
    }

    private setApDragState(dragging: Dragging) {
        if (dragging.eltDotid === null || dragging.elt === null) {
            return;
        }
        dragging.transformType = TransformType.TRANSLATE;
        dragging.type = ObjectType.AP;
        dragging.eltDatum = this.state.ap;
        dragging.eltStartLoc = {
            x: dragging.eltDatum.info.position.x,
            y: dragging.eltDatum.info.position.y
        };
    }

    private setNorthIconRotateDragState(dragging: Dragging) {
        if (dragging.eltDotid === null || dragging.elt === null) {
            return;
        }
        if (dragging.eltDotid === 'rotate') {
            dragging.transformType = TransformType.ROTATE;
            dragging.type = ObjectType.MAP_NORTH_ARROW_ICON;
            dragging.eltDatum = null;
            dragging.eltStartDeg = this.props.topStore.getTopState().mapSettings.northArrowRotationDegrees;
            if (dragging.eltStartDeg === undefined || dragging.eltStartDeg === null) {
                dragging.eltStartDeg = 0;
            }
        }
    }

    private setTextFieldDragState(dragging: Dragging, transformType: TransformType,modifiedPoint: GUIPoint) {
        if (dragging.eltDotid === null || dragging.elt === null) {
            return;
        }
        dragging.type = ObjectType.TEXT_FIELD;
        dragging.transformType = TransformType.TRANSLATE;
        if (transformType === TransformType.ROTATE) {
            dragging.transformType = TransformType.ROTATE;
            dragging.eltStartDeg = this.state.textFields[dragging.eltDotid].rotationDegrees
        }
        dragging.eltDatum = null;
        dragging.lastLoc = modifiedPoint;
        dragging.eltStartLoc = this.state.textFields[dragging.eltDotid].position;
    }

    private setModalDragState(dragging: Dragging, transformType: TransformType, modifiedPoint: GUIPoint) {
        if (dragging.eltDotid === null || dragging.elt === null) {
            return;
        }
        dragging.type = ObjectType.MODAL;
        dragging.transformType = TransformType.TRANSLATE;
        dragging.eltDatum = null;
        dragging.lastLoc = modifiedPoint;
        dragging.eltStartLoc = this.state.modalPosition;
    }

    private setCabinetIconDragState(dragging: Dragging, transformType: TransformType, modifiedPoint: GUIPoint) {
        if (dragging.eltDotid === null || dragging.elt === null) {
            return;
        }
        dragging.type = ObjectType.CABINET_ICON;
        dragging.transformType = TransformType.TRANSLATE;
        dragging.eltDatum = null;
        dragging.lastLoc = modifiedPoint;
        dragging.eltStartLoc = modifiedPoint; 
    }

    onMouseEnter(event: React.MouseEvent<Element>) {
        let dragging: Dragging = this.state.dragging;

        if (dragging.elt !== null) {
            event.persist();
            if (dragging.proxyType !== undefined) {
                event.stopPropagation();
            }
            if (dragging.type === ObjectType.MAP_NORTH_ARROW_ICON || 
                dragging.type === ObjectType.TEXT_FIELD ||
                dragging.type === ObjectType.RADIO ||
                dragging.type === ObjectType.CABINET_ICON) {
                // these dragging types don't have any drag targets, so leave this.state.dragging unchanged
                return;
            }

            // set event target as possible drag target
            const currentTarget = event.currentTarget as SVGElement;
            const currentTargetType = currentTarget.dataset.devicetype as TargetType;
            console.debug('START: onMouseEnter(): currentTarget=', currentTarget, "targetType=", currentTargetType);

            if (dragging.elt === currentTarget) {
                // This seems to happen on fast drag.
                // The mouse goes outside the item we are trying to drag
                console.warn("onMouseEnter(): dragging elt matches current target. doing nothing");
                return;
            }
            if (dragging.eltDotid === null) {
                return;
            }

            let targetOK: boolean = true;
            switch (dragging.type) {
                case ObjectType.MAP_SENSOR:
                    targetOK = this.onMouseEnterWhileDraggingMapSensor(dragging, currentTarget, currentTargetType);
                    break;

                case ObjectType.TRAY_SENSOR:
                    targetOK = this.onMouseEnterWhileDraggingTraySensor(dragging, currentTarget, currentTargetType);
                    break;

                case ObjectType.TRAY_REPEATER:
                    if (currentTargetType === ObjectType.MAP ||
                        currentTargetType === ObjectType.TRAY) {
                        targetOK = true;
                        console.debug('onMouseEnter(): targetOK is true');
                    } else {
                        targetOK = false;
                        console.debug('onMouseEnter(): (default) targetOK is false');
                    }
                    break;

                case ObjectType.MAP_REPEATER:
                    if (currentTargetType === ObjectType.MAP_REPEATER ||
                        currentTargetType === ObjectType.RADIO ||
                        currentTargetType === ObjectType.TRAY  ||
                        currentTargetType === ObjectType.MAP) {
                        targetOK = true;
                        console.debug('onMouseEnter(): targetOK is true');
                    } else if (currentTargetType === ObjectType.SENSOR_ZONE) {
                        return;
                    } else {
                        targetOK = false;
                        console.debug('onMouseEnter(): targetOK is false');
                    }
                    break;

                case ObjectType.CC_LINK:
                    this.onMouseEnterWhileDraggingCcLink(dragging, currentTarget, currentTargetType);
                    console.debug('onMouseEnter(): targetOK is ', targetOK);
                    break;

                default:
                    targetOK = false;
            }

            // TODO: more effort to determine if target is valid
            if (targetOK) {
                // TODO: instead of modifying classList directly, could
                //       modify state of currentTarget and then let it render.
                //       Is that better or worse?
                currentTarget.classList.add('validDropTarget');
            } else {
                currentTarget.classList.remove('validDropTarget');
            }

            let clientPoint: Point = {x:20, y:20};
            if (dragging.proxyType !== undefined) {
                clientPoint = {x: event.clientX, y: event.clientY};
            }

            this.setState((prevState: MapAndTrayState) => {
                let newDragging: Dragging = cloneDeep(prevState.dragging) as Dragging;
                newDragging = {...newDragging,
                    target: currentTarget,
                    targetType: currentTargetType,
                    targetOK: targetOK,
                    // TODO: proxyType is probably always same as dragging.type
                    proxyType: newDragging.type,
                    proxyLoc: clientPoint,
                };
                return {dragging: newDragging};
            });
        }
    }

    private onMouseEnterWhileDraggingCcLink(dragging:Dragging,
                                            currentTarget:SVGElement,
                                            currentTargetType:ObjectType|null): boolean {
        let targetOK:boolean;
        if (currentTargetType === ObjectType.CC_CHANNEL ||
            currentTargetType === ObjectType.SDLC_CHANNEL ||
            currentTargetType === ObjectType.APGI_CHANNEL) {
            const currentTargetChannelId:string|undefined = currentTarget.dataset.dotid;
            if (currentTargetChannelId === undefined) {
                console.error('unexpected undefined currentTargetChannelId');
                targetOK = false;
            } else {
                // we don't do the following because it would not allow us
                // to explain why to user
                /*
                const currentTargetChannel: GUICCChannel =
                    this.getChannelFromChannelId(currentTargetChannelId);
                targetOK = currentTargetChannel.sensors.length < MapAndTray.MAX_SENSORS_PER_CHANNEL;
                */
                targetOK = true;
            }
        } else if (currentTargetType === ObjectType.STS_CHANNEL) {
            targetOK = true;
        } else {
            targetOK = false;
        }
        return targetOK;
    }

    private onMouseEnterWhileDraggingTraySensor(dragging:Dragging,
                                                currentTarget:SVGElement,
                                                currentTargetType:ObjectType|null):boolean {
        let targetOK:boolean;
        switch (currentTargetType) {
            case ObjectType.SENSOR_ZONE:
                if (currentTarget !== null) {
                    const szId: string | undefined = currentTarget.dataset.dotid;
                    if (szId !== undefined) {
                        const targetSz: GUISZClient = this.props.sensorZones[szId];
                        targetOK = (targetSz.sensorIds.length < 3);
                    } else {
                        console.error('unexpected null szId');
                        targetOK = false;
                    }
                } else {
                    console.error('unexpected null dragging.target');
                    targetOK = false;
                }
                break;

            case ObjectType.MAP:
            case ObjectType.TRAY:
                targetOK = true;
                console.debug('onMouseEnter(): targetOK is true');
                break;

            default:
                targetOK = false;
                console.debug('onMouseEnter(): (default) targetOK is false');
                break;
        }
        return targetOK;
    }

    private onMouseEnterWhileDraggingMapSensor(dragging:Dragging,
                                               currentTarget:SVGElement,
                                               currentTargetType:ObjectType|null):boolean {
        let targetOK:boolean;
        if (dragging.eltDotid === null) {
            targetOK = false;
        } else {
            switch (currentTargetType) {
                case ObjectType.SENSOR_ZONE:
                    if (currentTarget !== null) {
                        const szId: string | undefined = currentTarget.dataset.dotid;
                        if (szId !== undefined) {
                            const targetSz: GUISZClient = this.props.sensorZones[szId];
                            // can drop on a sz with 2 sensors, or
                            // on a sz with 3 sensors if it is already in it
                            targetOK = (targetSz.sensorIds.length < 3 ||
                                (szId === this.props.sensorDotidToSzId[dragging.eltDotid] &&
                                    targetSz.sensorIds.length <= 3));
                        } else {
                            console.error('unexpected null szId');
                            targetOK = false;
                        }
                    } else {
                        console.error('unexpected null dragging.target');
                        targetOK = false;
                    }
                    break;

                case ObjectType.MAP_REPEATER:
                case ObjectType.RADIO:
                case ObjectType.STS_CHANNEL:
                case ObjectType.TRAY:
                    targetOK = true;
                    console.debug('onMouseEnter(): targetOK is true');
                    break;

                case ObjectType.CC_CHANNEL:
                case ObjectType.SDLC_CHANNEL:
                case ObjectType.APGI_CHANNEL:
                    const currentTargetChannelId: string | undefined = currentTarget.dataset.dotid;
                    if (currentTargetChannelId === undefined) {
                        console.error('unexpected undefined currentTargetChannelId');
                        targetOK = false;
                    } else {
                        // while the following is nice, we don't do it because
                        // it would not allow us to explain reason
                        /*
                        const currentTargetChannel: GUICCChannel =
                            this.getChannelFromChannelId(currentTargetChannelId);
                        targetOK = currentTargetChannel.sensors.length < MapAndTray.MAX_SENSORS_PER_CHANNEL;
                        */
                        targetOK = true;
                    }
                    break;

                default:
                    targetOK = false;
                    console.debug('onMouseEnter(): targetOK is false');
                    break;
            }
        }
        return targetOK;
    }

    private clearSelectedLink() {
        if (this.selectedLinkInfo !== null && this.selectedLinkInfo !== undefined) {
            const mapSensor:GUISensorClient = this.state.mapSensors[this.selectedLinkInfo.deviceId];
            if (mapSensor !== null && mapSensor !== undefined) {
                if (this.selectedLinkInfo.index !== null && this.selectedLinkInfo.index !== undefined) {
                    const ccLink:GUICCLink = mapSensor.info.ccLinks[this.selectedLinkInfo.index];
                    if (ccLink !== undefined) {
                        ccLink.selected = false;
                        const ccChannel:string = ccLink.dstId;
                        //const ccCardName:string = ccChannel.slice(0, ccChannel.length - 5);
                        const ccCardName:string =
                            MapAndTray.getCardIdFromChannelId(ccChannel, this.getChannelType(ccChannel));
                        if (this.state.ccCards[ccCardName] !== null) {
                            const topState:TopStoreState = this.props.topStore.getTopState();
                            const newSelection: Selected = {
                                selected: null,
                                selectedG: null,
                                selectedDeviceType: null,
                                selectedDotid: null,
                                selectedSzId: null,
                            };
                            this.props.topStore.dispatch({
                                updateType: UpdateType.UPDATE,
                                newData: newSelection,
                                objectType: ObjectType.SELECTED,
                                origData: topState.selected,
                                objectId: '',
                            });
                            this.props.topStore.dispatch({
                                updateType: UpdateType.UPDATE,
                                newData: null,
                                objectType: ObjectType.SELECTED_LINK_INFO,
                                origData: topState.selectedLinkInfo,
                                objectId: '',
                            });
                        } else {
                            console.error('unexpected null state for ', ccCardName);
                        }
                    } else {
                        console.error('clearSelectedLink(): unexpected undefined ccLink: ', this.selectedLinkInfo);
                    }
                } else {
                    if (mapSensor.info.rfLink !== null && mapSensor.info.rfLink !== undefined) {
                        // TODO: should use setState
                        mapSensor.info.rfLink.selected = false;
                    }
                }
                this.selectedLinkInfo = null;
                return;
            }

            let mapRepeater:GUIRepeaterClient = this.state.mapRepeaters[this.selectedLinkInfo.deviceId];
            if (mapRepeater !== null && mapRepeater !== undefined) {
                if (mapRepeater.info.rfLink !== null && mapRepeater.info.rfLink !== undefined) {
                    // TODO: should use setState
                    mapRepeater.info.rfLink.selected = false
                }
            }

            this.selectedLinkInfo = null;
        }
    }

    /** drop handler */
    onMouseUp(event: React.MouseEvent<Element>): void {
        let dragging: Dragging = cloneDeep(this.state.dragging);
        console.debug("START onMouseUp(): dragging=", dragging, event);
        if (dragging.elt === null) {
            console.info('onMouseUp(): unexpected null dragging.elt');
            return;
        }
        // TODO: when do we use event.clientX, and when getMousePosition(event)?
        const clientDropPt: Point = {x: event.clientX, y: event.clientY};
        const coord = this.getMousePosition(event);
        console.debug('onMouseUp(): clientPt=', clientDropPt, 'coord=', coord, 'this.mapImageLocationInSvg=', this.mapImageLocationInSvg, 'this.mapImageTopLeftCorner=', this.mapImageTopLeftCorner, 'this.getTransformedMousePosition(coord)=', this.getTransformedMousePosition(coord), 'this.getAdjustedMousePosition(coord)=', this.getAdjustedMousePosition(coord), '\nthis.mapImageWidth*this.props.scale=', this.mapImageWidth*this.props.scale, 'this.mapImageHeight*this.props.scale', this.mapImageHeight*this.props.scale, 'this.props.pan=', this.props.pan, 'this.isInMap(coord)=', this.isInMap(coord), );
        const draggingDotid = dragging.eltDotid;
        if (draggingDotid === null) {
            event.stopPropagation();
            if (dragging.type === ObjectType.MAP) {
                const mapSelection: Selected = {
                    selectedDeviceType: ObjectType.MAP,
                    selected: null,
                    selectedG: null,
                    selectedDotid: null,
                    selectedSzId: null,
                };
                this.props.topStore.enact({
                    description: 'select map',
                    actions: [{
                        updateType: UpdateType.UPDATE,
                        objectId: '',
                        objectType: ObjectType.SELECTED,
                        newData: mapSelection,
                        origData: this.props.topStore.getTopState().selected,
                    }]
                });
                console.info('onMouseUp(): on map.  selected map');
                this.updateInfoPanelForSelectedCCLink('noChannelId', 'noSensorId');
                const oldPan:Point = (this.props.ap !== null ? this.props.ap.pan : {x:0, y:0});
                if (MapAndTray.pointsDiffer(this.state.pan, oldPan)) {
                    this.persistMapPan(this.state.pan, oldPan);
                } else {
                    console.info('onMouseUp(): user clicked map but did not pan.');
                }
            } else {
                console.error('unexpected null dragging.eltDotid on drop that is not map');
            }
            this.setState((_prevState: MapAndTrayState) => {
                return {
                    dragging: MapAndTray.noDragState,
                    lastNotOverlappingLocation: null,
                    lastNotOverlappingRotation: null,
                }
            });
            return;
        }

        event.stopPropagation();

        // do drop action here...  test valid target
        switch (dragging.type) {
            case ObjectType.TRAY_SENSOR:
                // TODO: change test to use dragging.target instead
                if (dragging.targetOK && dragging.targetType === ObjectType.SENSOR_ZONE) {
                    this.onDropSensorFromTrayToSZ(clientDropPt);
                } else if (dragging.targetOK && dragging.targetType === ObjectType.MAP &&
                           this.isInMap(coord)) {
                    this.onDropSensorFromTrayToMap(dragging, coord);
                } else {
                    console.warn('onmouseup(): not in map or unexpected dragging.targetType', dragging.targetType);
                    this.onBadDropDeviceFromTrayToAnywhere(draggingDotid);
                }
                break;
            case ObjectType.TRAY_REPEATER:
                if (dragging.targetOK && dragging.targetType === ObjectType.MAP &&
                    this.isInMap(coord)) {
                    this.onDropRepeaterFromTrayToMap(dragging, coord);
                } else {
                    this.onBadDropRepeaterFromTrayToTray(draggingDotid as string);
                }
                break;

            case ObjectType.MAP_SENSOR:
                if (dragging.targetOK) {
                    this.onDropSensorOnValidTarget(dragging, coord, clientDropPt);
                } else {
                    console.warn('dropped sensor over invalid target');
                }
                // end drag
                // this.setState({dragging: MapAndTray.noDragState});
                break;

            case ObjectType.RF_LINK:
                if (this.isInMap(coord) && draggingDotid !== null) {
                    if (dragging.linkUpdates) {
                        dragging.linkUpdates = false;
                        this.onDropRfLinkOnMap(draggingDotid);
                    }
                    else {
                        if (dragging.elt.dataset.deviceid !== undefined) {
                            if (this.state.mapSensors[dragging.elt.dataset.deviceid] !== null && this.state.mapSensors[dragging.elt.dataset.deviceid] !== undefined) {
                                this.selectedLinkInfo = {
                                    deviceId: dragging.elt.dataset.deviceid,
                                    channelId: undefined,
                                    index: undefined,
                                    linkType: 'rfLink',
                                    deviceType: 'SENSOR'
                                }
                            }
                            else if (this.state.mapRepeaters[dragging.elt.dataset.deviceid] !== null && this.state.mapRepeaters[dragging.elt.dataset.deviceid] !== undefined) {
                                this.selectedLinkInfo = {
                                    deviceId: dragging.elt.dataset.deviceid,
                                    channelId: undefined,
                                    index: undefined,
                                    linkType: 'rfLink',
                                    deviceType: 'REPEATER'
                                }
                            }
                        }

                        this.props.topStore.dispatch({
                            updateType: UpdateType.UPDATE,
                            objectType: ObjectType.SELECTED_LINK_INFO,
                            newData: this.selectedLinkInfo,
                            objectId: '',
                        });
                    }
                }
                break;

            case ObjectType.CC_LINK:
                if (draggingDotid !== null) {
                    if (dragging.linkUpdates) {
                        dragging.linkUpdates = false;
                        if (dragging.targetOK && dragging.target !== null && dragging.target.dataset.dotid !== undefined) {
                            this.onDropCCLinkOnChannel(draggingDotid, dragging.eltDatum, dragging.target.dataset.dotid);
                        }
                        else if (dragging.linkEndPointDrag) {
                            dragging.linkEndPointDrag = false;
                            this.onDeleteCCLink(draggingDotid, dragging.eltDatum);
                        }
                        else {
                            this.onDropCCLinkSegementOnMap(draggingDotid);
                        }
                    }
                    else if (dragging.elt.dataset.deviceid !== undefined){
                        this.selectedLinkInfo = {deviceId: dragging.elt.dataset.deviceid, index: dragging.eltDatum, linkType: 'ccLink', deviceType: 'SENSOR'};
                        const mapSensor:GUISensorClient = this.state.mapSensors[dragging.elt.dataset.deviceid];
                        this.updateInfoPanelForSelectedCCLink(mapSensor.info.ccLinks[dragging.eltDatum].dstId, mapSensor.id);
                    }
                }
                break;

            case ObjectType.SENSOR_ZONE:
                if (this.isInMap(coord)) {
                    this.onDropSZFromMapToMap(dragging);
                } else {
                    this.onBadDropSZFromMapToOff(draggingDotid as string);
                }
                break;

            case ObjectType.RADIO:
                if (this.isInMap(coord)) {
                    this.onDropRadioFromMapToMap(dragging);

                    //TODO need a way to know if a repeator/radio has a link to it!! to update on move
                    // this.onDropRfLinkOnMap(dotid);
                } else {
                    this.onBadDropRadioFromMapToOff(draggingDotid as string);
                    return;
                }
                break;
            case ObjectType.MAP_REPEATER:
                if (dragging.targetOK) {
                    this.onDropRepeaterOnValidTarget(dragging, coord);
                } else {
                    console.warn('dropped repeater over invalid target');
                }
                break;
            case ObjectType.AP:
                if (this.isInMap(coord)) {
                    this.onDropAPFromMapToMap(dragging);
                } else {
                    this.onBadDropAPFromMapToOff(draggingDotid as string);
                }
                break;

                /*
            case ObjectType.MAP:
                // TODO: I believe this case is never used.  Map is handled above.
                const oldPan:Point = (this.props.ap !== null ? this.props.ap.pan : {x:0, y:0});
                this.persistMapPan(this.state.pan, oldPan);
                break;
                */
            case ObjectType.MAP_NORTH_ARROW_ICON:
                this.onDropNorthArrow();
                break;

            case ObjectType.TEXT_FIELD:
                this.onDropTextField(draggingDotid, dragging.elt as SVGElement);
                break;

            case ObjectType.CABINET_ICON:
                this.onDropCabinetIcon(draggingDotid, dragging.elt as SVGElement);
                break;

            case ObjectType.MODAL:
                // nothing special
                break;

            default:
                console.error('unknown dragElt type: ' + dragging.type);
        }

        // TODO: (as with onMouseEnter(), instead of modifying classList directly, could
        //       modify state of dragTarget and then let it render.
        //       Is that better or worse?
        if (dragging.target !== null) {
            dragging.target.classList.remove('validDropTarget');
        }
        // TODO: make sure the individual drop methods above don't also end dragging state
        this.setState({dragging: MapAndTray.noDragState});
        console.debug('onMouseUp(): end');
    }

    private onDropTextField(draggingDotid: string, draggingElt: SVGElement) {
        const topStoreTextFields: { [id: string]: TextField } = cloneDeep(this.props.topStore.getTopState().mapSettings.textFields);
        const topStoreTextField = topStoreTextFields[draggingDotid];
        const stateTextField = this.state.textFields[draggingDotid];
        if (stateTextField === null || topStoreTextField === null) {
            return;
        }

        const onlyOneIsNull =
            (topStoreTextField.position === null && stateTextField.position !== null) ||
            (topStoreTextField.position !== null && stateTextField.position === null);
        const positionsExistAndDiffer =
            topStoreTextField.position !== null && stateTextField.position !== null && (
            stateTextField.position.x !== topStoreTextField.position.x ||
            stateTextField.position.y !== topStoreTextField.position.y);
        const rotationsDiffer = stateTextField.rotationDegrees !== topStoreTextField.rotationDegrees;

        const positionsDiffer: boolean = (onlyOneIsNull || positionsExistAndDiffer || rotationsDiffer);

        if (positionsDiffer) {
            topStoreTextField.position = cloneDeep(stateTextField.position);
            topStoreTextField.rotationDegrees = stateTextField.rotationDegrees;
            let newValue: { [field: string]: { [id: string]: TextField } } = {"textFields": topStoreTextFields};
            let origData = cloneDeep(this.props.topStore.getTopState().mapSettings.textFields);
            let origValue: { [field: string]: { [id: string]: TextField } } = {"textFields": origData};
            const newSelection: Selected = {
                selectedDotid: draggingDotid,
                selectedSzId: null,
                selectedDeviceType: ObjectType.TEXT_FIELD,
                selected: draggingElt,
                selectedG: draggingElt,
            };

            const actions: Array<Action> = [{
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.MAP_SETTINGS,
                objectId: '',
                newData: newValue,
                origData: origValue
            }, {
                updateType: UpdateType.UPDATE,
                newData: newSelection,
                objectType: ObjectType.SELECTED,
                origData: this.props.selected,
                objectId: '',
            }];
            this.props.undoManager.enactActionsToStore({
                actions: actions,
                description: 'move Text Field'
            }, EnactType.USER_ACTION);
        }
    }

    private onDropCabinetIcon(draggingDotid: string, draggingElt: SVGElement) {
        const showCabinetIcon = this.props.topStore.getTopState().mapSettings.showCabinetIcon;
        const topStoreCabinetLocation: GUIPoint = this.props.topStore.getTopState().mapSettings.cabinetIconPosition;
        const stateCabinetIconLocation: GUIPoint = this.state.cabinetIconPosition;
        if (stateCabinetIconLocation === null || topStoreCabinetLocation === null) {
            return;
        }

        const onlyOneIsNull =
            (topStoreCabinetLocation === null && stateCabinetIconLocation !== null) ||
            (topStoreCabinetLocation !== null && stateCabinetIconLocation === null);
        const positionsExistAndDiffer =
            topStoreCabinetLocation !== null && stateCabinetIconLocation !== null && (
            stateCabinetIconLocation.x !== topStoreCabinetLocation.x ||
            stateCabinetIconLocation.y !== topStoreCabinetLocation.y);

        const positionsDiffer: boolean = (onlyOneIsNull || positionsExistAndDiffer);

        if (positionsDiffer) {
            let newValue: { [field: string]: GUIPoint } =
                {cabinetIconPosition: cloneDeep(stateCabinetIconLocation)};
            let origValue: { [field: string]: GUIPoint } =
                {cabinetIconPosition: cloneDeep(topStoreCabinetLocation)};

            const actions: Array<Action> = [{
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.MAP_SETTINGS,
                objectId: '',
                newData: newValue,
                origData: origValue
            }];
            this.props.undoManager.enactActionsToStore({
                actions: actions,
                description: 'move Cabinet Icon'
            }, EnactType.USER_ACTION);
        }
    }

    private onDropNorthArrow() {
        if (this.state.northArrowIconRotation !== this.props.topStore.getTopState().mapSettings.northArrowRotationDegrees) {

            let newValue: { [field: string]: number } = {'northArrowRotationDegrees': this.state.northArrowIconRotation};
            let origValue: { [field: string]: number } = {'northArrowRotationDegrees': this.props.topStore.getTopState().mapSettings.northArrowRotationDegrees};
            const xacts: Array<Action> = [{
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.MAP_SETTINGS,
                objectId: '',
                newData: newValue,
                origData: origValue
            }];
            this.props.undoManager.enactActionsToStore({
                actions: xacts,
                description: 'Rotated North Arrow change'
            }, EnactType.USER_ACTION);
        }
    }

    /**
     * When user clicks an object on Map, Tray, or Cabinet, SELECT the object,
     * (and thereby cause its InfoPanel to show).
     * TODO: many of these cases are identical and could be merged.
     * TODO: at the moment, just selecting circle for Sensor.
     * TODO: it seems to be called whenever there is a mouseUp, even if I say event.preventDefault()  -- maybe try event.stopPropagation()
     */
    onClick(event: React.MouseEvent<HTMLOrSVGElement>):void {
        const topState:TopStoreState = this.props.topStore.getTopState();
        console.log('onClick(): ', event.currentTarget, event);
        /** svg group element that is the presumed clicked element */
        const currentTargetG: Element = (event.currentTarget as any) as Element;
        const cTargetG: HTMLOrSVGElement = event.currentTarget;

        if (currentTargetG.nodeName === "g" &&
            (currentTargetG.classList.contains('draggable') ||
             currentTargetG.classList.contains('selectable'))) {
            // TODO: would be cleaner to look upward for nearest ancestor of name 'g'.
            // currently doing nothing here...
            ;
        } else {
            console.warn("not a draggable nor selectable g. event.currentTarget=", currentTargetG.nodeName);
            const newSelected: Selected = {
                selected: null,
                selectedG: null,
                selectedDeviceType: null,
                selectedDotid: null,
                selectedSzId: null
            };
            this.props.undoManager.enactActionsToStore({
                actions: [{
                    updateType: UpdateType.UPDATE,
                    newData: newSelected,
                    objectType: ObjectType.SELECTED,
                    origData: topState.selected,
                    objectId: '',
                }],
                description: 'select Map',
            }, EnactType.USER_ACTION_NOT_UNDOABLE);  // hr: changed to avoid selects on undo stack
            return;
        }

        const targetDeviceType: string | null | undefined =
            cTargetG === null ? null : cTargetG.dataset.devicetype;
        const targetDotid: string | null | undefined =
            cTargetG === null ? null : cTargetG.dataset.dotid;
        let selectedDeviceType: ObjectType | null;
        let newSelected: Selected | null;
        let description: string = 'select an object';

        switch (targetDeviceType) {
            case ObjectType.TRAY_SENSOR:
                selectedDeviceType = ObjectType.TRAY_SENSOR;
                newSelected = {
                    selected: currentTargetG,
                    selectedG: currentTargetG,
                    selectedDeviceType: selectedDeviceType,
                    selectedDotid: (targetDotid === undefined) ? null : targetDotid,
                    selectedSzId: this.getSzIdForSensorDotId(targetDotid)
                };
                description = 'select tray Sensor';
                break;

            case 'szG':
            case 'szRectG':
            case 'szRotateG':
            case 'sz-outter':
            case ObjectType.SENSOR_ZONE:
		                // if user clicks in SensorZone outside any Sensor.
                // selectedDotId is the 1st (lead) Sensor
                selectedDeviceType = ObjectType.SENSOR_ZONE;
                if (targetDotid !== undefined) {
                    const selectedDotid = (targetDotid === undefined || targetDotid === null) ?
                        null : (topState.sensorZones[targetDotid]).sensorIds[0];
                    newSelected = {
                        selected: currentTargetG,
                        selectedG: currentTargetG,
                        selectedDeviceType: selectedDeviceType,
                        // TODO: will need to revisit for multi sensor szs
                        selectedDotid: selectedDotid,
                        selectedSzId: targetDotid,
                    };
                    description = 'select Sensor Zone';
                } else {
                    console.error('unexpected undefined targetDotId');
                    newSelected = null;
                }
                break;

            case ObjectType.RADIO:
                selectedDeviceType = ObjectType.RADIO;
                newSelected = {
                    selected: currentTargetG,
                    selectedG: currentTargetG,
                    selectedDeviceType: selectedDeviceType,
                    selectedDotid: (targetDotid === undefined || targetDotid === null) ? null : (topState.radios[targetDotid]).id,
                    selectedSzId: null,
                };
                description = 'select a Radio';
                break;

            case ObjectType.TRAY_REPEATER:
                selectedDeviceType = ObjectType.TRAY_REPEATER;
                newSelected = {
                    selected: currentTargetG,
                    selectedG: currentTargetG,
                    selectedDeviceType: selectedDeviceType,
                    selectedDotid: (targetDotid === undefined || targetDotid === null) ? null : targetDotid,
                    selectedSzId: null,
                };
                description = 'select Tray Repeater';
                break;

            case ObjectType.CCCARD:
                selectedDeviceType = ObjectType.CCCARD;
                console.log("CCCARD currentTargetG ", currentTargetG, " targetDotid ", targetDotid)
                newSelected = {
                    selected: currentTargetG,
                    selectedG: currentTargetG,
                    selectedDeviceType: selectedDeviceType,
                    selectedDotid: (targetDotid === undefined || targetDotid === null) ? null : targetDotid,
                    selectedSzId: null,
                };
                description = 'select CC Card';
                break;

            case ObjectType.SDLC_BANK:
                selectedDeviceType = ObjectType.SDLC_BANK;
                newSelected = {
                    selected: currentTargetG,
                    selectedG: currentTargetG,
                    selectedDeviceType: selectedDeviceType,
                    selectedDotid: (targetDotid === undefined || targetDotid === null) ? null : targetDotid,
                    selectedSzId: null,
                };
                description = 'select SDLC Bank';
                break;

            case ObjectType.APGI:
                selectedDeviceType = ObjectType.APGI;
                newSelected = {
                    selected: currentTargetG,
                    selectedG: currentTargetG,
                    selectedDeviceType: selectedDeviceType,
                    selectedDotid: 'APGI',
                    selectedSzId: null,
                };
                description = 'select APGI';
                break;

            case ObjectType.STS:
                selectedDeviceType = ObjectType.STS;
                newSelected = {
                    selected: currentTargetG,
                    selectedG: currentTargetG,
                    selectedDeviceType: selectedDeviceType,
                    selectedDotid: 'STS',
                    selectedSzId: null,
                };
                description = 'select STS';
                break;

            case ObjectType.AP:
                selectedDeviceType = ObjectType.AP;
                let selectedApId: string | null;
                if (topState.ap !== null) {
                    selectedApId = (targetDotid === undefined || targetDotid === null) ? null : topState.ap.id;
                } else {
                    selectedApId = null;
                }
                newSelected = {
                    selected: currentTargetG,
                    selectedG: currentTargetG,
                    selectedDeviceType: selectedDeviceType,
                    selectedDotid: selectedApId,
                    selectedSzId: null,
                };
                description = 'select Gateway';
                break;

            case ObjectType.MAP_SENSOR:
                selectedDeviceType = ObjectType.SENSOR_ZONE;
                newSelected = {
                    selected: currentTargetG,
                    selectedG: currentTargetG,
                    selectedDeviceType: selectedDeviceType,
                    selectedDotid: (targetDotid === undefined) ? null : targetDotid,
                    selectedSzId: this.getSzIdForSensorDotId(targetDotid),
                };
                description = 'select SensorZone for Map Sensor';
                // want to avoid the click event also selecting the SensorZone
                event.stopPropagation();
                break;

            case ObjectType.MAP_REPEATER:
                selectedDeviceType = ObjectType.MAP_REPEATER;
                newSelected = {
                    selected: currentTargetG,
                    selectedG: currentTargetG,
                    selectedDeviceType: selectedDeviceType,
                    selectedDotid: (targetDotid === undefined) ? null : targetDotid,
                    selectedSzId: null,
                };
                description = 'select Map Repeater';
                break;

            case ObjectType.MAP_NORTH_ARROW_ICON:
                selectedDeviceType = ObjectType.MAP_NORTH_ARROW_ICON;
                newSelected = {
                    selected: currentTargetG,
                    selectedG: currentTargetG,
                    selectedDeviceType: selectedDeviceType,
                    selectedDotid: null,
                    selectedSzId: null
                };
                description = 'select North arrow';
                break;

            case ObjectType.TEXT_FIELD:
                selectedDeviceType = ObjectType.TEXT_FIELD;
                newSelected = {
                    selected: currentTargetG,
                    selectedG: currentTargetG,
                    selectedDeviceType: selectedDeviceType,
                    selectedDotid: (targetDotid === undefined) ? null : targetDotid,
                    selectedSzId: null
                };
                description = 'select Text Field';
                break;

            case 'deleteTextFieldG':
                //newSelected = MapAndTray.defaultSelection;
                if (targetDotid !== null && targetDotid !== undefined) {
                    const clonedTextFields: {[id:string] :TextField} =
                        cloneDeep(this.props.topStore.getTopState().mapSettings.textFields);
                    if (clonedTextFields[targetDotid] !== null) {
                        delete clonedTextFields[targetDotid];
                    }
                    const newValue:{[field:string]: {[id: string]: TextField}} =
                        {"textFields": clonedTextFields};
                    const origValue:{[field:string]: {[id: string]: TextField}} =
                        {"textFields": cloneDeep(this.props.topStore.getTopState().mapSettings.textFields)};
                    const xacts: Array<Action> = [{
                            updateType: UpdateType.UPDATE,
                            objectId: '',
                            objectType: ObjectType.SELECTED,
                            newData: MapAndTray.defaultSelection,
                            origData: this.props.topStore.getTopState().selected,
                        },
                        {
                            updateType: UpdateType.UPDATE,
                            objectType: ObjectType.MAP_SETTINGS,
                            objectId: '',
                            newData: newValue,
                            origData: origValue
                    }];
                    this.props.undoManager.enactActionsToStore({
                        actions: xacts,
                        description: 'Remove Text Field'
                    }, EnactType.USER_ACTION);
                }
                return;

            case null:
            case undefined:
                newSelected = MapAndTray.defaultSelection;
                description = 'select the Map';
                break;

            default:
                throw new Error('unexpected targetDeviceType: '+ targetDeviceType);
        }

        console.debug('onClick(): newSelected=', newSelected);
        // only update Selected in TopStore if it differs from existing
        if (! MapAndTray.equalSelection(newSelected, this.props.selected)) {
            this.props.undoManager.enactActionsToStore({
                actions: [{
                    updateType: UpdateType.UPDATE,
                    newData: newSelected,
                    objectType: ObjectType.SELECTED,
                    origData: cloneDeep(topState.selected),
                    objectId: '',
                }],
                description: description,
            }, EnactType.USER_ACTION_NOT_UNDOABLE);   // hr changed to avoid selects on undo stack
        }
    }

    public static equalSelection(sel1: Selected|null, sel2: Selected|null): boolean {
        if (sel1 === null) {
            return sel2 === null;
        }
        if (sel2 === null) {
            return false;
        }
        return sel1.selectedDeviceType === sel2.selectedDeviceType &&
            sel1.selectedDotid === sel2.selectedDotid &&
            sel1.selectedSzId === sel2.selectedSzId;
    }


    /** bad drop of map item */
    private onBadDropSZFromMapToOff(szid: string):void  {
        // instead, reset map device to starting location
        // to force a re-render upon moving, we need to setState()
        console.debug('onMouseUp(): bad drop from map to elsewhere');
        //console.log("SetState Called by onBadDropSZFromMapToOff");
        // @ts-ignore
        this.setState((prevState: MapAndTrayState) => {
            console.debug('setState-callback: updating prevState. eltDatum=', prevState.dragging.eltDatum);
            if (prevState.dragging.eltDatum === null) {
                console.error('setState-callback: unexpected null eltDatum');
                return prevState;
            }

            let sensorZones = cloneDeep(prevState.sensorZones);
            if (szid !== null && prevState.dragging.eltStartLoc !== null) {
                sensorZones[szid].info.position.x = prevState.dragging.eltStartLoc.x;
                sensorZones[szid].info.position.y = prevState.dragging.eltStartLoc.y;
            }

            let dragging = MapAndTray.noDragState;

            return {
                sensorZones: sensorZones,
                dragging: dragging,
            };
        });
    }

    /**
     * Takes sensorPosition, and returns it updated by the szRotation and szPosition.
     */
    private static updateCoordsWithRotation(szRotation: number, szPosition: GUIPoint, sensorPosition: GUIPoint): GUIPoint {
        const sensorCenter:GUIPoint = cloneDeep(szPosition);
        const angleRadians:number = (szRotation) * (Math.PI/180); // Convert to radians
        sensorCenter.x = Math.round(Math.cos(angleRadians) * (sensorPosition.x - szPosition.x) -
                                    Math.sin(angleRadians) * (sensorPosition.y - szPosition.y) + szPosition.x);
        sensorCenter.y = Math.round(Math.sin(angleRadians) * (sensorPosition.x - szPosition.x) +
                                    Math.cos(angleRadians) * (sensorPosition.y - szPosition.y) + szPosition.y);
        return sensorCenter;
    }

    /**
     * valid drop from map to map.
     */
    private onDropSZFromMapToMap(dragging: Dragging): void {
        // and select the dropped sensor.
        console.debug('onDropSZFromMapToMap(): valid drop from map to map');
        // just move the group, by changing the data,
        // which has already been done, so just propagate to top level?
        if (this.state.dragging.eltDatum === null) {
            console.error('unexpected null eltDatum');
            return;
        }

        const newSensorZones = cloneDeep(this.state.sensorZones);
        const eltDotid = this.state.dragging.eltDotid;
        let newMapSensors = cloneDeep(this.props.mapSensors);

        if (eltDotid === null) {
            throw new Error('unexpected null eltDotid');
        }
        const newSensorZone: GUISZClient = newSensorZones[eltDotid];
        newSensorZone.selected = true;

        let newDragging: Dragging = cloneDeep(this.state.dragging);
        const startDatum = newDragging.eltDatum;
        if (newDragging.eltStartLoc !== null) {
            startDatum.info.position.x = newDragging.eltStartLoc.x;
            startDatum.info.position.y = newDragging.eltStartLoc.y;
        }

        let newSzSensorIds: string[] = newSensorZone.sensorIds;

        let overlappingDevices = this.getOverlappingMapDevices(newSensorZone)
        if (dragging.transformType === TransformType.TRANSLATE) {
            if (Object.keys(overlappingDevices).length > 0) {
                //Check if there is a lastNotOverlappingLocation
                if (this.state.lastNotOverlappingLocation !== null) {
                    newSensorZone.info.position = {...this.state.lastNotOverlappingLocation};
                }
            }
            this.onTranslateSZ(eltDotid, dragging.elt as SVGElement|null, startDatum,
                               newSensorZone, newSzSensorIds, newMapSensors);

        } else if (dragging.transformType === TransformType.ROTATE) {
            // Note: Although we test here, this test is in effect nullified in onMoveSensorZone().
            //       So, if you want to restore non-overlap after rotate, must fix there first.
            if (Object.keys(overlappingDevices).length > 0) {
                //Check if there is a lastNotOverlappingRotation
                if (this.state.lastNotOverlappingRotation !== null) {
                    newSensorZone.info.rotationDegrees = this.state.lastNotOverlappingRotation;
                }
            }
            this.onRotateSZ(startDatum, dragging, eltDotid,
                            newSensorZone, newSzSensorIds, newMapSensors);
        }
    }

    private onRotateSZ(startDatum: GUISZClient, dragging: Dragging, eltDotid: string,
                       newSensorZone: GUISZClient, mapSensorIDs: string[],
                       newMapSensors: {[dotid: string]: GUISensorClient}) {

        if (dragging.eltStartDeg === null) {
            throw new Error('unexpected null dragging.eltStartDeg');
        }
        startDatum.info.rotationDegrees = dragging.eltStartDeg;

        const xacts: Array<Action> = [{
            updateType: UpdateType.UPDATE,
            objectType: ObjectType.SENSOR_ZONE,
            objectId: eltDotid,
            origData: startDatum,
            newData: {...newSensorZone}
        }];

        if (mapSensorIDs.length > 1) {
            for (let sensorIndex = 0; sensorIndex < mapSensorIDs.length; ++sensorIndex) {
                const newMapSensor = this.updateSensorCenterPoint(mapSensorIDs, sensorIndex, newMapSensors, newSensorZone);
                MapAndTray.updateLinksOnDevice(newMapSensor, this.props.topStore);

                xacts.push({
                    updateType: UpdateType.UPDATE,
                    objectType: ObjectType.MAP_SENSOR,
                    objectId: mapSensorIDs[sensorIndex],
                    origData: this.props.mapSensors[mapSensorIDs[sensorIndex]],
                    newData: newMapSensor,
                });
            }
        }

        if (startDatum.info.rotationDegrees !== newSensorZone.info.rotationDegrees) {
            this.props.undoManager.enactActionsToStore({
                actions: xacts,
                description: "rotate Sensor Zone"
            }, EnactType.USER_ACTION);
        }
        return mapSensorIDs;
    }

    private onTranslateSZ(eltDotid: string, elt: SVGElement|null, startDatum: GUISZClient,
                          newSensorZone: GUISZClient, newSzSensorIds: string[],
                          newMapSensors: {[dotid: string]: GUISensorClient}) {

        const newSelection: Selected = {
            selectedDotid: newSzSensorIds[0],
            selectedSzId: eltDotid,
            selectedDeviceType: ObjectType.SENSOR_ZONE,
            selected: elt,
            selectedG: elt,
        };

        const actions: Array<Action> = [{
            updateType: UpdateType.UPDATE,
            objectType: ObjectType.SENSOR_ZONE,
            objectId: eltDotid,
            origData: startDatum,
            newData: newSensorZone,
        }, {
            updateType: UpdateType.UPDATE,
            objectType: ObjectType.SELECTED,
            objectId: '',
            newData: newSelection,
            origData: this.props.selected,
        }];

        for (let sensorIndex = 0; sensorIndex < newSzSensorIds.length; ++sensorIndex) {
            const newMapSensor = this.updateSensorCenterPoint(newSzSensorIds, sensorIndex, newMapSensors, newSensorZone);
            MapAndTray.updateLinksOnDevice(newMapSensor, this.props.topStore);

            actions.push({
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.MAP_SENSOR,
                objectId: newSzSensorIds[sensorIndex],
                origData: TopStore.getInfoOf(this.props.mapSensors[newSzSensorIds[sensorIndex]]),
                newData: TopStore.getInfoOf(newMapSensor),
            });
        }

        // persist move if there was a move
        if (startDatum.info.position.x !== newSensorZone.info.position.x ||
            startDatum.info.position.y !== newSensorZone.info.position.y) {
            this.props.undoManager.enactActionsToStore({
                actions: actions,
                description: "move Sensor Zone"
            }, EnactType.USER_ACTION);
        }
        return newSzSensorIds;
    }

    /**
     * @returns an array of Actions that will update the center points for
     *          each Sensor that will be in the updated newSz
     * @param newSz already cloned updated Sensor Zone
     * @param newMapSensors already cloned map
     */
    public static updateSensorCenterPointsAndLinks(newSz: GUISZClient,
                                            newMapSensors: { [p: string]: GUISensorClient },
                                            origMapAndTraySensors: { [p: string]: GUISensorClient|GUIRepeaterClient },
                                            topStore: TopStore): Action[] {
        let actions: Action[] = [];
        const sensorIdsInSz: string[] = newSz.sensorIds;
        for (let sensorIndex: number = 0; sensorIndex < sensorIdsInSz.length; sensorIndex++) {
            const sensorId: string = sensorIdsInSz[sensorIndex];
            const mapSensor: GUISensorClient = newMapSensors[sensorId];
            mapSensor.info.position.x = newSz.info.position.x + MapAndTray.SENSOR_POSITIONS_WITHIN_SZ[sensorIdsInSz.length][sensorIndex];
            mapSensor.info.position.y = newSz.info.position.y;
            if (newSz.info.rotationDegrees !== 0) {
                let rotatedPosition = this.updateCoordsWithRotation(newSz.info.rotationDegrees, newSz.info.position, mapSensor.info.position);
                mapSensor.info.position = rotatedPosition;
            }

            MapAndTray.updateLinksOnDevice(mapSensor, topStore);

            const origData: Partial<GUISensorClient>|null =
                (origMapAndTraySensors[sensorId] !== undefined ?
                    {info: origMapAndTraySensors[sensorId].info} : null);

            actions.push({
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.MAP_SENSOR,
                objectId: sensorId,
                newData: {info: mapSensor.info},
                origData: origData,
            });
        }
        return actions;
    }

    private updateSensorCenterPoint(mapSensorIDs: string[], sensorIndex: number,
                                    newMapSensors: {[dotid: string]: GUISensorClient},
                                    newSensorZone: GUISZClient): GUISensorClient {

        let sensorId = mapSensorIDs[sensorIndex];
        const mapSensor = newMapSensors[sensorId];
        mapSensor.info.position.x = newSensorZone.info.position.x + MapAndTray.SENSOR_POSITIONS_WITHIN_SZ[mapSensorIDs.length][sensorIndex];
        mapSensor.info.position.y = newSensorZone.info.position.y;
        if (newSensorZone.info.rotationDegrees !== 0) {
            const rotatedPosition: GUIPoint =
                MapAndTray.updateCoordsWithRotation(newSensorZone.info.rotationDegrees,
                    newSensorZone.info.position, mapSensor.info.position);
            mapSensor.info.position = rotatedPosition;
        }
        return mapSensor;
    }

    /**
     * Updates param newMapDevice in place,
     * updating its rf link and its cc links, if any.
     * Currently, only updates the aPoint of links to match the newMapDevice's position.
     * @param newMapDevice a map Sensor or map Repeater
     */
    private static updateLinksOnDevice(newMapDevice: Mappable, topStore: TopStore) {
        if (newMapDevice.info.rfLink !== null && newMapDevice.info.rfLink !== undefined) {
            newMapDevice.info.rfLink.lines[0].aPoint = {...newMapDevice.info.position};

            const dstId:string = newMapDevice.info.rfLink.dstId;
            const parentDevice:GUIRepeaterClient|GUIRadioClient =
                dstId === 'SPP0' || dstId === 'SPP1' ?
                    topStore.getTopState().radios[dstId] :
                    topStore.getTopState().mapRepeaters[dstId];
            if (parentDevice !== undefined) {
                newMapDevice.info.rfLink.lines[newMapDevice.info.rfLink.lines.length - 1].bPoint = parentDevice.info.position;
            }
        }
        if (newMapDevice.info.ccLinks.length > 0) {
            for (let ccLink of newMapDevice.info.ccLinks) {
                ccLink.lines[0].aPoint = {...newMapDevice.info.position};
            }
        }
    }

    /**
     * for all Sensors and Repeaters for which radioOrRepeater is the
     * upstream RF destination, modify their RF Links to show the new
     * position of radioOrRepeater
     * @param radioOrRepeater
     * @return an array of Actions to perform those updates
     */
    private updateIncumbentRFLinksToRepeater(radioOrRepeater: Mappable): Action[] {
        const actions: Action[] = [];

        for (let mapSensor of Object.values(this.props.mapSensors)) {
            if (mapSensor.info.rfLink !== undefined &&
                mapSensor.info.rfLink.dstId === radioOrRepeater.id) {
                const newMapSensor = cloneDeep(mapSensor);
                newMapSensor.info.rfLink.lines[newMapSensor.info.rfLink.lines.length-1].bPoint = radioOrRepeater.info.position;

                const action = {
                    updateType: UpdateType.UPDATE,
                    objectType: ObjectType.MAP_SENSOR,
                    objectId: newMapSensor.id,
                    newData: {info: newMapSensor.info},
                    origData: mapSensor,
                };
                actions.push(action);
            }
        }

        for (let downstreamMapRepeater of Object.values(this.props.mapRepeaters)) {
            if (downstreamMapRepeater.info.rfLink !== undefined &&
                downstreamMapRepeater.info.rfLink.dstId === radioOrRepeater.id) {
                const newDownstreamMapRepeater = cloneDeep(downstreamMapRepeater);
                newDownstreamMapRepeater.info.rfLink.lines[newDownstreamMapRepeater.info.rfLink.lines.length-1].bPoint = radioOrRepeater.info.position;

                const action = {
                    updateType: UpdateType.UPDATE,
                    objectType: ObjectType.MAP_REPEATER,
                    objectId: newDownstreamMapRepeater.id,
                    newData: newDownstreamMapRepeater,
                    origData: downstreamMapRepeater,
                };
                actions.push(action);
            }
        }

        return actions;
    }

    /** bad drop of tray item */
    private onBadDropDeviceFromTrayToAnywhere(dotid: string):void {
        // instead, reset tray device to starting location
        console.debug('onMouseUp(): bad drop of tray item');
        this.unselectAllDevices();
        console.log("about to call setState in onBadDropDeviceFromTrayToAnywhere");
        this.setState((prevState: MapAndTrayState) => {
            console.debug('setState-callback: updating prevState. eltDatum=', prevState.dragging.eltDatum);
            if (prevState.dragging.eltDatum === null) {
                console.error('setState-callback: unexpected null eltDatum');
                return prevState;
            }
            let trayDevices = cloneDeep(prevState.trayDevices);

            if (prevState.dragging.eltStartLoc === null) {
                throw new Error('unexpected null eltStartLoc');
            } else {
                trayDevices[dotid].info.position.x = prevState.dragging.eltStartLoc.x;
                trayDevices[dotid].info.position.y = prevState.dragging.eltStartLoc.y;
                (trayDevices[dotid] as GUISensorClient).selected = true;
            }
            const newState: Pick<MapAndTrayState, "trayDevices"|"dragging"> = {
                trayDevices: trayDevices,
                dragging: MapAndTray.noDragState,
            };

            return newState;
        });
    }

    /** bad drop of tray item */
    private onBadDropRepeaterFromTrayToTray(dotid: string):void {
        // instead, reset tray device to starting location
        console.debug('onBadDropRepeaterFromTrayToTray(): bad drop of tray item');
        this.unselectAllDevices();
        console.log("about to call setState from onBadDropRepeaterFromTrayToTray")
        this.setState((prevState: MapAndTrayState) => {
            console.debug('setState-callback: updating prevState. eltDatum=', prevState.dragging.eltDatum);
            if (prevState.dragging.eltDatum === null) {
                console.error('setState-callback: unexpected null eltDatum');
                return prevState;
            }
            let trayDevices = cloneDeep(prevState.trayDevices);
            if (prevState.dragging.eltStartLoc === null) {
                throw new Error('unexpected null eltStartLoc');
            } else {
                trayDevices[dotid].info.position.x = prevState.dragging.eltStartLoc.x;
                trayDevices[dotid].info.position.y = prevState.dragging.eltStartLoc.y;
                (trayDevices[dotid] as GUIRepeaterClient).selected = true;
            }
            let dragging = MapAndTray.noDragState;
            const newState: Pick<MapAndTrayState, "trayDevices"|"dragging"> = {
                trayDevices: trayDevices,
                dragging: dragging,
            };

            return newState;
        });
    }

    private onDropRfLinkOnMap(dotid: string): void {
        let actions: Array<Action> = []
        if (this.state.mapSensors[dotid] !== null && this.state.mapSensors[dotid] !== undefined) {
            actions = [{
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.MAP_SENSOR,
                objectId: dotid,
                origData: TopStore.getInfoOf(this.props.mapSensors[dotid]),
                newData: TopStore.getInfoOf(this.state.mapSensors[dotid])
            }];
        }
        else if (this.state.mapRepeaters[dotid] !== null && this.state.mapRepeaters[dotid] !== undefined) {
            actions = [{
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.MAP_REPEATER,
                objectId: dotid,
                origData: TopStore.getInfoOf(this.props.mapRepeaters[dotid]),
                newData: TopStore.getInfoOf(this.state.mapRepeaters[dotid])
            }];
        }

        this.props.undoManager.enactActionsToStore({
            actions: actions,
            description: "move rf link"
        }, EnactType.USER_ACTION);
    }

    /** Check here for ccCard with unheard status.
    *   If previous link was to that ccCard check if ccCard has other links to it.
    *   If not, now remove that ccCard from the Map (With delay).
    */
    private unheardccCardWillBeRemoved(cardId: string) {
        let linkedCCCard =  this.state.ccCards[cardId];
        if (linkedCCCard !== null && linkedCCCard !== undefined && linkedCCCard.unheard === true) {
            //Device was previously linked to an unheard ccCard
            setTimeout(() => {
                this.props.topStore.dispatch({
                    updateType: UpdateType.DELETE,
                    objectType: ObjectType.CCCARD,
                    objectId: linkedCCCard.id,
                    origData: cloneDeep(this.state.ccCards),
                    newData: cloneDeep(this.state.ccCards),
                })
            },1000);
        }
    }


    private onDeleteCCLink(dotid: string, index: number): void {
        const newMapSensor: GUISensorClient = cloneDeep(this.props.mapSensors[dotid]);
        if (newMapSensor === null || newMapSensor === undefined) {
            console.error('unexpected null or undefined mapSensor');
            return;
        }

        const removedCCLink: GUICCLink = newMapSensor.info.ccLinks.splice(index,1)[0];
        const channelId: string = removedCCLink.dstId;
        let channelType: ObjectType = this.getChannelType(channelId);
        const cardId = MapAndTray.getCardIdFromChannelId(channelId, channelType);
        const ccChannel: GUICCChannel = this.props.ccCards[cardId].channelsById[channelId];
        const newCcChannel: GUICCChannel = cloneDeep(ccChannel);
        // remove this sensor from channel's list of sensorIds
        const newChannelSensors: string[] =
            newCcChannel.sensors.filter((sensorId: string) => (sensorId !== dotid));

        if (this.selectedLinkInfo !== null && this.selectedLinkInfo !== undefined) {
            if (this.selectedLinkInfo.deviceId === dotid && this.selectedLinkInfo.index !== undefined && this.selectedLinkInfo.index === index) {
                this.selectedLinkInfo = null;
            }
        }

        this.unheardccCardWillBeRemoved(cardId);
        const xacts: Array<Action> = [{
            updateType: UpdateType.UPDATE,
            objectType: ObjectType.MAP_SENSOR,
            objectId: dotid,
            origData: TopStore.getInfoOf(this.props.mapSensors[dotid]),
            newData: TopStore.getInfoOf(newMapSensor)
        }, {
            updateType: UpdateType.UPDATE,
            objectType: ObjectType.CC_CHANNEL,
            objectId: channelId,
            origData: {sensors: ccChannel.sensors},
            newData: {sensors: newChannelSensors},
        }];
        this.props.undoManager.enactActionsToStore({
            actions: xacts,
            description: "delete cc link"
        }, EnactType.USER_ACTION);

    }

    private onDeleteRFLinkFromSensor(dotid: string): void {
        const newMapSensor: GUISensorClient = cloneDeep(this.props.mapSensors[dotid]);
        if (newMapSensor === null || newMapSensor === undefined) {
            console.error('unexpected null or undefined mapSensor');
            return;
        };
        newMapSensor.info.rfLink = undefined;
        const xacts: Array<Action> = [{
            updateType: UpdateType.UPDATE,
            objectType: ObjectType.MAP_SENSOR,
            objectId: dotid,
            origData: TopStore.getInfoOf(this.props.mapSensors[dotid]),
            newData: TopStore.getInfoOf(newMapSensor)
        }];
        this.props.undoManager.enactActionsToStore({
            actions: xacts,
            description: "delete rf link from sensor"
        }, EnactType.USER_ACTION);
    }

    private onDeleteRFLinkFromRepeater(dotid: string): void {
        const newMapRepeater: GUIRepeaterClient = cloneDeep(this.props.mapRepeaters[dotid]);
        if (newMapRepeater === null || newMapRepeater === undefined) {
            console.error('unexpected null or undefined mapRepeater');
            return;
        };
        newMapRepeater.info.rfLink = undefined;
        const xacts: Array<Action> = [{
            updateType: UpdateType.UPDATE,
            objectType: ObjectType.MAP_REPEATER,
            objectId: dotid,
            origData: TopStore.getInfoOf(this.props.mapRepeaters[dotid]),
            newData: TopStore.getInfoOf(newMapRepeater)
        }];
        this.props.undoManager.enactActionsToStore({
            actions: xacts,
            description: "delete rf link from repeater"
        }, EnactType.USER_ACTION);
    }

    /** TODO: this is inefficient for common CC_CHANNEL case. is there a betterr way? */
    private getChannelType(channelId: string) {
        let channelType: ObjectType = ObjectType.CC_CHANNEL;
        if (channelId.startsWith('B')) {
            channelType = ObjectType.SDLC_CHANNEL;
        } else if (Object.keys(this.props.ccCards)[0] === 'APGI') {
            channelType = ObjectType.APGI_CHANNEL;
        } else if (Object.keys(this.props.ccCards)[0] === 'STS') {
            channelType = ObjectType.STS_CHANNEL;
        }
        return channelType;
    }

    private onDropCCLinkSegementOnMap(dotid: string) {
        const xacts: Array<Action> = [{
            updateType: UpdateType.UPDATE,
            objectType: ObjectType.MAP_SENSOR,
            objectId: dotid,
            origData: TopStore.getInfoOf(this.props.mapSensors[dotid]),
            newData: TopStore.getInfoOf(this.state.mapSensors[dotid])
        }];
        this.props.undoManager.enactActionsToStore({
            actions: xacts,
            description: "move cc link"
        }, EnactType.USER_ACTION);
    }

    private updateInfoPanelForSelectedCCLink(ccChanelId: string, sensorIdOfLink: string): void {
        //get Card from cclink dstId
        if (Object.keys(this.state.ccCards).length > 0) {
            const aCard = Object.values(this.props.ccCards)[0];

            const topState:TopStoreState = this.props.topStore.getTopState();
            let selectedDeviceType = ObjectType.CCCARD;
            let dotid = "";
            switch (aCard.otype) {
                case 'GUICCCard':
                    let ccChannelName = ccChanelId.split('-');
                    if (ccChannelName.length > 1) {
                        dotid = ccChannelName[0] + '-' + ccChannelName[1];
                    }
                    break;
                case 'GUICCSDLC':
                    selectedDeviceType = ObjectType.SDLC_BANK;
                    let sdlcBank = ccChanelId.split('-');
                    if (sdlcBank.length > 0) {
                        dotid = sdlcBank[0];
                        if (dotid.startsWith('B')) {
                            dotid = dotid.slice(1, dotid.length)
                        }
                    }
                    break;
                case 'GUICCAPGI':
                    selectedDeviceType = ObjectType.APGI;
                    dotid = 'APGI';
                    break;
                case 'GUICCSTS':
                    selectedDeviceType = ObjectType.STS;
                    dotid = 'STS';
                    break;
                default:
                    break;
            }

            const newSelected: Selected = {
                selected: null,
                selectedG: null,
                selectedDeviceType: selectedDeviceType,
                selectedDotid: dotid,
                selectedSzId: null,
            };
            const newSelectedLinkInfo: SelectedLinkInfo = {
                linkType: "ccLink",
                deviceId: sensorIdOfLink,
                deviceType: 'SENSOR',
                channelId: ccChanelId,
            };

            this.props.topStore.dispatch({
                updateType: UpdateType.UPDATE,
                newData: newSelected,
                objectType: ObjectType.SELECTED,
                origData: topState.selected,
                objectId: '',
            });
            this.props.topStore.dispatch({
                updateType: UpdateType.UPDATE,
                newData: newSelectedLinkInfo,
                objectType: ObjectType.SELECTED_LINK_INFO,
                origData: topState.selectedLinkInfo,
                objectId: '',
            });

        }
    }

    /**
     * @param targetChannelId is the channel id of drop target
     */
    private onDropCCLinkOnChannel(dotid: string, index: number, targetChannelId: string): void {
        if (this.state.mapSensors[dotid] === null || this.state.mapSensors[dotid] === undefined) {
            return;
        }

        let newMapSensor: GUISensorClient = cloneDeep(this.state.mapSensors[dotid]);
        const oldChannelId: string = newMapSensor.info.ccLinks[index].dstId;
        let channelType: ObjectType = this.getChannelType(oldChannelId);
        const oldCardId: string = MapAndTray.getCardIdFromChannelId(oldChannelId, channelType);
        const oldChannel: GUICCChannel = this.props.topStore.getTopState().ccCards[oldCardId].channelsById[oldChannelId];
        newMapSensor.info.ccLinks[index].dstId = targetChannelId;
        let ccLink_length = newMapSensor.info.ccLinks[index].lines.length;
        newMapSensor.info.ccLinks[index].lines[ccLink_length-1].bPoint = this.ccChannelPositionByChannelId[targetChannelId];
        const newCardId: string = MapAndTray.getCardIdFromChannelId(targetChannelId, channelType);
        const newChannel: GUICCChannel = this.props.topStore.getTopState().ccCards[newCardId].channelsById[targetChannelId];

        if (oldCardId !== newCardId) {
            this.unheardccCardWillBeRemoved(oldCardId);
        }

        if(newChannel.sensors.includes(dotid)) {
            this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR,
                "Sensor " + dotid + " is already connected to channel " + targetChannelId +
                ".");
            // then do nothing!  no connection made
            return;
        };

        // make sure we are not adding a 16th sensor to channel.
        if (this.getChannelType(targetChannelId) !== ObjectType.STS_CHANNEL &&
            newChannel.sensors.length >= MapAndTray.MAX_SENSORS_PER_CHANNEL) {
            // warn user
            this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR,
                "You may not associate Sensor " + dotid + " with channel " + targetChannelId +
                ". The channel already has the maximum number of sensors associated (" +
                MapAndTray.MAX_SENSORS_PER_CHANNEL + "). ");
            // then do nothing!  no connection made
            return;
        }

        const xacts: Array<Action> = [{
            updateType: UpdateType.UPDATE,
            objectType: ObjectType.MAP_SENSOR,
            objectId: dotid,
            //origData: this.props.mapSensors[dotid],
            origData: TopStore.getInfoOf(this.props.mapSensors[dotid]),
            newData: TopStore.getInfoOf(newMapSensor)
        }, {
            updateType: UpdateType.UPDATE,
            objectType: ObjectType.CC_CHANNEL,
            objectId: oldChannelId,
            origData: {sensors: oldChannel.sensors},
            // remove dotid from oldChannel sensors
            newData: {sensors: oldChannel.sensors.filter((sensorId: string)=>(sensorId !== dotid))},
        }, {
            updateType: UpdateType.UPDATE,
            objectType: ObjectType.CC_CHANNEL,
            objectId: targetChannelId,
            origData: {sensors: newChannel.sensors,
                       sensorFailSafe: newChannel.sensorFailSafe
            },
            // add dotid to newChannel sensors (we first remove dotid in case user has dropped on same channel)
            newData: {sensors: newChannel.sensors.filter((sensorId: string)=>(sensorId !== dotid)).concat(dotid),
                      sensorFailSafe: {...newChannel.sensorFailSafe, [dotid]: true}
            },
        }];
        this.props.undoManager.enactActionsToStore({
            actions: xacts,
            description: "edit cc link endpoint"
        }, EnactType.USER_ACTION);

        if (this.selectedLinkInfo !== null && this.selectedLinkInfo !== undefined) {
            if (this.selectedLinkInfo.deviceId === dotid && this.selectedLinkInfo.index !== undefined && this.selectedLinkInfo.index === index) {
                this.updateInfoPanelForSelectedCCLink(targetChannelId, dotid);
            }
        }
    }

    /** upon drop (mouseUp) over valid target while dragging a map sensor */
    private onDropSensorOnValidTarget(dragging: Dragging, coord: Point, clientDropPt: Point): void {
        switch (dragging.targetType) {
            case ObjectType.SENSOR_ZONE:
                this.onDropSensorFromMapToSZ(dragging, coord, clientDropPt);
                break;

            case ObjectType.RADIO:
            case ObjectType.MAP_REPEATER:
                // create rf link from map sensor to radio or repeater
                this.onDropDeviceOnValidUpstreamDest(dragging);
                break;

            case ObjectType.CC_CHANNEL:
            case ObjectType.SDLC_CHANNEL:
            case ObjectType.APGI_CHANNEL:
            case ObjectType.STS_CHANNEL:
                // create cc link from map sensor to channel.
                this.onDropSensorOnChannel(dragging, coord);
                break;

            case ObjectType.TRAY:
                this.onDropSensorFromMapToTray(dragging);
                break;

            default:
                console.error('unexpected dragging.targetType: ', dragging.targetType);
                break;
        }
    }

    /**
     * User has dragged Sensor to Tray: remove from SZ on map, and
     * put it back in Tray.
     *
     * If dragging last sensor in SZ to tray,
     * The topStore will delete SZ also.
     *
     * If Sensor is unheard (meaning it received a DELETE status),
     * then delete it from map and DON'T put it in tray.
     */
    private onDropSensorFromMapToTray(dragging: Dragging) {
        const sensorId = this.state.dragging.eltDotid;
        if (sensorId === null) {
            console.error('null sensorId');
            return;
        }
        const origMapSensor: GUISensorClient = this.props.mapSensors[sensorId];
        const newMapSensor: GUISensorClient = cloneDeep(origMapSensor);
        const parentSzId = this.props.sensorDotidToSzId[sensorId];
        const newSz: GUISZClient = cloneDeep(this.props.sensorZones[parentSzId]);
        // delete sensor from newSz.sensorIds
        const sensorIndex: number = newSz.sensorIds.indexOf(sensorId);
        if (sensorIndex !== -1) {
            newSz.sensorIds.splice(sensorIndex, 1);
        } else {
            console.error('unexpected: sensor not found: ', sensorId);
        }
        const clonedMapSensors = cloneDeep(this.props.mapSensors);
        let deletingSensorZone: boolean = false;

        if (newSz.sensorIds.length === 0) {
            newMapSensor.selected = true;
        }

        const sensorsActions: Action[] =
            MapAndTray.updateSensorCenterPointsAndLinks(newSz, clonedMapSensors, {...this.state.mapSensors, ...this.state.trayDevices}, this.props.topStore);

        let enactType: EnactType = EnactType.USER_ACTION;

        // Remove all RF links and CC links from this mapSensor before putting it in tray
        // And also, remove this mapSensor from any ccChannels it is listed in.
        if (newMapSensor.info.rfLink !== undefined) {
            newMapSensor.info.rfLink = undefined;
        }
        if (newMapSensor.info.ccLinks.length > 0) {
            for (const ccLink of newMapSensor.info.ccLinks) {
                const channelId: string = ccLink.dstId;
                // remove mapSensor id from channel's list of connected sensors
                const cardId = MapAndTray.getCardIdFromChannelId(channelId, this.getChannelType(channelId));
                const channel: GUICCChannel = this.props.ccCards[cardId].channelsById[channelId];
                const newSensorIds: string[] =
                    channel.sensors.filter((sensorId: string) =>
                        (sensorId !== newMapSensor.id));
                sensorsActions.push({
                    updateType: UpdateType.UPDATE,
                    objectType: ObjectType.CC_CHANNEL,
                    objectId: channelId,
                    newData: {sensors: newSensorIds},
                    origData: {sensors: channel.sensors}
                });
            }
            newMapSensor.info.ccLinks = [];
        }

        newMapSensor.info.location = Location.TRAY;
        let newSelected: Selected | null;
        const newMapSensorIsSeen: boolean = (newMapSensor.unheard === false ||
                                             newMapSensor.unheard === undefined);
        if (newMapSensorIsSeen) {
            newSelected = {
                selectedDeviceType: ObjectType.TRAY_SENSOR,
                selectedDotid: sensorId,
                selected: null,
                selectedG: null,
                selectedSzId: null,
            };
        } else {
            newSelected = (this.props.selected !== null &&
                           this.props.selected.selectedDotid === parentSzId ?
                           null: this.props.selected);
        }
        const origSelected: Selected | null = this.props.selected;

        const actions: Action[] = [{
            // delete sensor from hash map
            updateType: UpdateType.DELETE,
            objectType: ObjectType.DOTID_TO_SZID,
            objectId: sensorId,
            newData: null,
            origData: this.props.sensorDotidToSzId,
        }];

        if (newSz.sensorIds.length === 2) {
            // change usage from speed3 to speed2
            newSz.otype = "GUISpeed2SensorZone";
        } else if (newSz.sensorIds.length === 1) {
	            // this is just a guess: change usage to stopbar
            newSz.otype = "GUIStopbarSensorZone";
            newSz.stopbarSensitivity = AptdApp.DEFAULT_SENSITIVITY;
        }

        if (newSz.sensorIds.length > 0) {
            // delete sensor from sensor zone
            actions.push({
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.SENSOR_ZONE,
                objectId: parentSzId,
                newData: newSz,
                origData: this.props.sensorZones[parentSzId]
            });
        } else {
            // delete sensor zone entirely
            deletingSensorZone = true;
            actions.push({
                updateType: UpdateType.DELETE,
                objectType: ObjectType.SENSOR_ZONE,
                objectId: parentSzId,
                newData: null,
                origData: this.props.sensorZones[parentSzId],
            });
        }

        if (newMapSensorIsSeen) {
            // add sensor to tray
            actions.push({
                updateType: UpdateType.ADD,
                objectType: ObjectType.TRAY_SENSOR,
                objectId: sensorId,
                newData: newMapSensor,
                newDataDynamicFrom: ObjectType.MAP_SENSOR,
                origData: null,
            });
        } else {
            // for unheard Sensor, we do not add to Tray, so it is now deleted.
        }

        // remove sensor from map sensors
        actions.push({
            updateType: UpdateType.DELETE,
            objectType: ObjectType.MAP_SENSOR,
            objectId: sensorId,
            newData: null,
            origData: origMapSensor,
            origDataDynamicFrom: newMapSensorIsSeen ? ObjectType.TRAY_SENSOR : undefined,
        });

        actions.push(
            ...sensorsActions
        );
        actions.push({
            // change selection to refer to the new Tray Sensor
            updateType: UpdateType.UPDATE,
            objectType: ObjectType.SELECTED,
            objectId: sensorId,
            newData: newSelected,
            origData: origSelected,
        });
        this.props.undoManager.enactActionsToStore({
            actions: actions,
            description: "remove Sensor from Map",
        }, enactType);
    }

    /**
     * Upon drop (mouseUp) over valid target while dragging a map repeater (proxy).
     * Valid target is Tray, or new spot on Map, or a new parent device, i.e., a Radio or map Repeater.
     * Note: this code is very similar to onDropSensorOnValidTarget.
     * TODO: consolidate the 2 methods.
     */
    private onDropRepeaterOnValidTarget(dragging: Dragging, coord: Point): void {
        switch (dragging.targetType) {
            case ObjectType.RADIO:
            case ObjectType.MAP_REPEATER:
                // create rf link from map repeater to upstream target.
                this.onDropDeviceOnValidUpstreamDest(dragging);
                break;

            case ObjectType.TRAY:
                // User has dragged Repeater to Tray: remove from map, and
                // put it back in tray. Also, remove all Sensors/Repeaters for which
                // this repeater is the RF dstId (the upstream repeater).
                this.onDropRepeaterFromMapToTray();
                break;

            case ObjectType.MAP:
                this.onDropRepeaterFromMapToMap(dragging);
                break;

            default:
                console.error('unexpected dragging.targetType: ', dragging.targetType);
                break;
        }
    }

    /**
     * When user drags map repeater to Tray, delete it from map Repeaters,
     * and add it to Tray Repeaters.
     * If map Repeater is unheard, then do not add it to tray--it is just deleted entirely.
     */
    private onDropRepeaterFromMapToTray(): void {
        const eltDotid: string | null = this.state.dragging.eltDotid;
        if (eltDotid === null) {
            return;
        }
        const origMapRepeater: GUIRepeaterClient = this.props.mapRepeaters[eltDotid];
        let newRepeater: GUIRepeaterClient = cloneDeep(origMapRepeater);
        newRepeater.info.location = Location.TRAY;
        // Remove upstream RF link from this mapRepeater before putting it in tray
        if (newRepeater.info.rfLink !== undefined) {
            newRepeater.info.rfLink = undefined;
        }
        newRepeater.desiredUpstreamChannel = newRepeater.knownUpstreamChannel.toString();
        let enactType: EnactType = EnactType.USER_ACTION;

        let newSelected: Selected | null;
        const newRepeaterIsSeen = newRepeater.unheard === false || newRepeater.unheard === undefined;
        if (newRepeaterIsSeen) {
            newSelected = {
                selectedDeviceType: ObjectType.TRAY_REPEATER,
                selectedDotid: eltDotid,
                selected: null,
                selectedG: null,
                selectedSzId: null,
            };
        } else {
            newSelected = (this.props.selected !== null &&
                            this.props.selected.selectedDotid === newRepeater.id ?
                            null: this.props.selected);
        }
        const origSelected: Selected = {
            selectedDeviceType: ObjectType.MAP_REPEATER,
            selectedDotid: this.props.selected === null ? null : this.props.selected.selectedDotid,
            selected: null,
            selectedG: null,
            selectedSzId: null,
        };

        const actions: Action[] = this.removeLinksToRepeaterFromDownstreamDevices(newRepeater);

        if (newRepeaterIsSeen) {
            actions.push({
                updateType: UpdateType.ADD,
                objectType: ObjectType.TRAY_REPEATER,
                objectId: eltDotid,
                newData: newRepeater,
                newDataDynamicFrom: ObjectType.MAP_REPEATER,
            });
        } else {
            // unheard Repeater. Do not add to Tray.
        }

        actions.push({
            updateType: UpdateType.DELETE,
            objectType: ObjectType.MAP_REPEATER,
            objectId: eltDotid,
            newData: null,
            origData: origMapRepeater,
            origDataDynamicFrom: newRepeaterIsSeen ? ObjectType.TRAY_REPEATER : undefined,
        }, {
            // change selection to refer to the new Tray Repeater
            updateType: UpdateType.UPDATE,
            objectType: ObjectType.SELECTED,
            objectId: eltDotid,
            newData: newSelected,
            origData: origSelected,
        });

        this.props.undoManager.enactActionsToStore({
            actions: actions,
            description: "remove Repeater from Map",
        }, enactType);
    }

    private removeLinksToRepeaterFromDownstreamDevices(newRepeater: GUIRepeaterClient): Action[] {
        const actions: Action[] = [];

        // remove rflinks from (downstream) map sensors to this repeater
        for (let sensorid of Object.keys(this.props.mapSensors)) {
            const mapSensor: GUISensorClient = this.props.mapSensors[sensorid];
            if (mapSensor.info.rfLink !== undefined &&
                mapSensor.info.rfLink.dstId === newRepeater.id) {
                // a downstream sensor.  remove the link
                let newMapSensor: GUISensorClient = cloneDeep(mapSensor);
                newMapSensor.info.rfLink = undefined;
                actions.push({
                    updateType: UpdateType.UPDATE,
                    objectType: ObjectType.MAP_SENSOR,
                    objectId: newMapSensor.id,
                    newData: TopStore.getInfoOf(newMapSensor),
                    origData: TopStore.getInfoOf(mapSensor),
                });
            }
        }

        // remove rflinks from (downstream) map repeaters to this repeater
        for (let repeaterid of Object.keys(this.props.mapRepeaters)) {
            const downstreamMapRepeater: GUIRepeaterClient = this.props.mapRepeaters[repeaterid];
            if (downstreamMapRepeater.info.rfLink !== undefined &&
                downstreamMapRepeater.info.rfLink.dstId === newRepeater.id) {
                // a downstream repeater.  remove the link
                let newDownstreamMapRepeater: GUIRepeaterClient = cloneDeep(downstreamMapRepeater);
                newDownstreamMapRepeater.info.rfLink = undefined;
                actions.push({
                    updateType: UpdateType.UPDATE,
                    objectType: ObjectType.MAP_REPEATER,
                    objectId: newDownstreamMapRepeater.id,
                    newData: TopStore.getInfoOf(newDownstreamMapRepeater),
                    origData: TopStore.getInfoOf(downstreamMapRepeater),
                });
            }
        }

        return actions;
    }

    /**
     * Check here for upstream Radio with unheard status.
     * If previous link was to that radio check if radio has other links to it
     * If not now remove that Radio from the Map (With delay)
     */
    private markUpstreamRadioForRemoval(mapDevice: Mappable) {
        // First check if dragged device had a previous RF connection
        if (mapDevice.info.rfLink !== null && mapDevice.info.rfLink !== undefined) {
            let linkedRadio =  this.state.radios[mapDevice.info.rfLink.dstId];
            if (linkedRadio !== null && linkedRadio !== undefined && linkedRadio.unheard === true) {
                // Device was linked to an unheard Radio
                setTimeout(() => {
                    // mark radio as unheard or actually delete it.
                    this.props.topStore.dispatch({
                        updateType: UpdateType.DELETE,
                        objectType: ObjectType.RADIO,
                        objectId: linkedRadio.id,
                        origData: cloneDeep(this.state.radios),
                        newData: cloneDeep(this.state.radios),
                    });
                },1000);
            }
        }
    }
    /**
     * Check here for upstream Repeater with unheard status.
     * If previous link was to that Repeater check if Repeater has other links to it
     * If not now remove that Repeater from the Map (With delay)
     */
    private markUpstreamRepeaterForRemoval(mapDevice: Mappable) {
        // First check if dragged device had a previous RF connection
        if (mapDevice.info.rfLink !== null && mapDevice.info.rfLink !== undefined) {
            let linkedRepeater =  this.state.mapRepeaters[mapDevice.info.rfLink.dstId];
            if (linkedRepeater !== null && linkedRepeater !== undefined && linkedRepeater.unheard === true) {
                // Device was linked to an unheard Repeater
                setTimeout(() => {
                    // mark Repeater as unheard or actually delete it.
                    this.props.topStore.dispatch({
                        updateType: UpdateType.DELETE,
                        objectType: ObjectType.MAP_REPEATER,
                        objectId: linkedRepeater.id,
                        origData: cloneDeep(this.state.mapRepeaters),
                        newData: cloneDeep(this.state.mapRepeaters),
                    });
                },1000);
            }
        }
    }

    /**
     * When user drops a Sensor or Repeater on a valid upstream Radio or Repeater.
     * Change the dragged device's RF Link.
     * If the dragged device is a Repeater, also change its upstream channel
     * to match that of the new upstream Radio or Repeater.
     */
    private onDropDeviceOnValidUpstreamDest(dragging: Dragging) {
        if (dragging.target !== null && dragging.eltDotid !== null) {
            let radioOrRepeaterId:string|undefined = dragging.target.dataset.dotid;
            if (radioOrRepeaterId !== null && radioOrRepeaterId !== undefined) {
                let parentDownstreamChannel: string;
                const radioParent:GUIRadioClient = this.props.radios[radioOrRepeaterId];
                const repeaterParent:GUIRepeaterClient = this.props.mapRepeaters[radioOrRepeaterId];
                switch (dragging.targetType) {
                    case ObjectType.RADIO:
                        if (radioParent === undefined) {
                            console.error('radioParent undefined for ' + radioOrRepeaterId);
                        }
                        parentDownstreamChannel =
                            (radioParent.channelMode === ChannelMode.AUTO ?
                                radioParent.knownChannel : radioParent.desiredChannel);
                        break;
                    case ObjectType.MAP_REPEATER:
                        if (repeaterParent === undefined) {
                            console.error('repeaterParent undefined for ' + radioOrRepeaterId);
                        }
                        parentDownstreamChannel =
                            (repeaterParent.channelMode === ChannelMode.AUTO ?
                                repeaterParent.knownDownstreamChannel : repeaterParent.desiredDownstreamChannel);
                        break;
                    default:
                        throw new Error('unexpected dragging.targetType' + dragging.targetType);
                }
                let mapDevice: GUISensorClient|GUIRepeaterClient;
                let desiredUpstreamChannel: GUIChannel = -1;
                switch (dragging.type) {
                    case ObjectType.MAP_REPEATER:
                        mapDevice = cloneDeep(this.props.mapRepeaters[dragging.eltDotid]);
                        desiredUpstreamChannel = +parentDownstreamChannel as GUIChannel;
                        break;
                    case ObjectType.MAP_SENSOR:
                        mapDevice = cloneDeep(this.props.mapSensors[dragging.eltDotid]);
                        desiredUpstreamChannel = +parentDownstreamChannel as GUIChannel;
                        break;
                    default:
                        throw new Error('unexpected dragging.type: ' + dragging.type);
                }

                let aPoint = {...dragging.eltDatum.info.position};
                let bPoint: GUIPoint = {x: 0, y: 0};
                if (dragging.targetType === ObjectType.RADIO) {
                    bPoint = {...radioParent.info.position};
                    this.markUpstreamRadioForRemoval(mapDevice);
                } else if (dragging.targetType === ObjectType.MAP_REPEATER) {
                    bPoint = {...repeaterParent.info.position};
                    // according to Sophia, we never delete an unheard repeater
                    //this.markUpstreamRepeaterForRemoval(mapDevice);
                } else {
                    throw new Error('unexpected dragging.targetType');
                }

                let rfLink: GUIRFLink = {
                    type: LinkType.RF,
                    dstId: radioOrRepeaterId,
                    lines: [{
                        // for aPoint could use dragging.startLoc
                        // TODO: for aPoint use mapSensor position
                        //aPoint: mapSensor.info.position,
                        aPoint: aPoint,
                        bPoint: bPoint
                    }],
                    location: Location.MAP,
                };
                // TODO: I think the cloneDeep below is not needed
                let deviceInfo: MapRenderInfo = cloneDeep(mapDevice.info);
                deviceInfo.rfLink = rfLink;
                let newData:Partial<GUIRepeaterClient>|Partial<GUISensorClient> = {};
                if (dragging.type === ObjectType.MAP_REPEATER) {
                    newData = {
                        info: deviceInfo,
                        desiredUpstreamChannel: desiredUpstreamChannel.toString(),
                    }
                } else {
                    // dragging map sensor case
                    newData = {
                        info: deviceInfo,
                        // TODO: should we update upstreamChannel: desiredUpstreamChannel?
                        channel: desiredUpstreamChannel,
                    }
                }

                const actions: Action[] = [{
                    updateType: UpdateType.UPDATE,
                    objectType: dragging.type,
                    objectId: dragging.eltDotid,
                    origData: TopStore.getInfoOf(mapDevice),
                    newData: newData,
                }];
                this.props.undoManager.enactActionsToStore({
                    actions: actions,
                    description: "create RF Link to Radio or Repeater",
                }, EnactType.USER_ACTION);
            } else {
                console.error('unexpected null radioOrRepeaterId');
            }
        }
    }

    /**
     * Valid drop from tray to existing SZ on map.
     * If # sensors in SZ is < 3, add this sensor to the SZ.
     * TODO: use the coord of drop to determine in which order this sensor fits among the existing sensors.
     * For first approximation, just add Sensor at the end of existing.
     */
    private onDropSensorFromTrayToSZ(clientDropPt: Point): void {
        console.debug('onDropSensorFromTrayToSZ(): START. clientDropPt=', clientDropPt);
        const storableDropPosition:Point = this.getAdjustedStorableMousePosition(clientDropPt);
        this.onDropSensorOnSZ(storableDropPosition, DropContext.FROM_TRAY);
    }

    /**
     * dropping sensor from Tray or same SZ or a different SZ to a SZ.
     * The TopStore needs to: If dropping from a SZ that had just 1 sensor, delete that SZ.
     */
    private onDropSensorOnSZ(storableDropPoint: Point, context: DropContext): void {
        const targetSzElt: SVGElement | null = this.state.dragging.target;
        if (targetSzElt === null) {
            throw new Error('unexpected null targetSzElt');
        }
        const targetSzId: string | undefined = targetSzElt.dataset.dotid;
        if (targetSzId === undefined) {
            throw new Error('unexpected undefined targetSzId');
        }
        const targetSz: GUISZClient = this.props.sensorZones[targetSzId];
        if ((context === DropContext.FROM_ANOTHER_SZ || context === DropContext.FROM_TRAY) &&
            targetSz.sensorIds.length >= 3) {
            // this should have been prevented by invalid target
            console.error('cannot drop on a sz that already has 3 sensors');
        } else {
            // determine revised order of sensors from drop point among existing sensors
            const newTargetSz: GUISZClient = cloneDeep(targetSz);
            if (this.state.dragging.eltDotid === null) {
                throw new Error('unexpedted null dragging.eltDotid');
            }

            this.addSensorToSzInOrder(newTargetSz, this.state.dragging.eltDotid, storableDropPoint, context);

            if (context === DropContext.FROM_SAME_SZ) {
                if (MapAndTray.orderOfSensorsIsSame(targetSz, newTargetSz)) {
                    console.debug('Drop of Sensor does not change ordering.  No change needed.');
                    return;
                } else {
                    console.debug('Drop of Sensor changes ordering. Change will occur');
                }
            }

            // following will change the "use" in Info Panel.
            switch (newTargetSz.sensorIds.length) {
                case 2:
                    newTargetSz.otype = 'GUISpeed2SensorZone';
                    break;
                case 3:
                    newTargetSz.otype = 'GUISpeed3SensorZone';
                    break;
                default:
                    console.error('unexpected sensorIds.length: ', newTargetSz.sensorIds.length);
                    break;
            }

            // create new mapSensor
            let newMapSensor: GUISensorClient = cloneDeep(this.state.dragging.eltDatum);
            newMapSensor.info.location = Location.MAP;

            const newMapSensors: { [p: string]: GUISensorClient } = cloneDeep(this.state.mapSensors);
            newMapSensors[newMapSensor.id] = newMapSensor;

            const sensorsActions: Action[] =
                MapAndTray.updateSensorCenterPointsAndLinks(newTargetSz, newMapSensors, {...this.state.mapSensors, ...this.state.trayDevices}, this.props.topStore);

            const actions: Action[] = [];

            if (context === DropContext.FROM_TRAY) {
                actions.push(...[{
                    // create new map sensor
                    updateType: UpdateType.ADD,
                    objectType: ObjectType.MAP_SENSOR,
                    objectId: newMapSensor.id,
                    origData: null,
                    newData: newMapSensor,
                    newDataDynamicFrom: ObjectType.TRAY_SENSOR,
                }, {
                    // delete sensor from tray
                    updateType: UpdateType.DELETE,
                    objectType: ObjectType.TRAY_SENSOR,
                    objectId: this.state.dragging.eltDotid,
                    newData: null,
                    origData: this.state.dragging.eltDatum,
                    origDataDynamicFrom: ObjectType.MAP_SENSOR,
                }, ]);
            } else if (context === DropContext.FROM_ANOTHER_SZ) {
                // remove sensor from its parent SZ
                const sensorId: string = this.state.dragging.eltDotid;
                const origSzId: string = this.props.sensorDotidToSzId[sensorId];
                const origSz: GUISZClient = this.props.sensorZones[origSzId];
                if (origSz.sensorIds.length === 1) {
                    // removing the only sensor for sz, so remove sz
                    actions.push({
                        updateType: UpdateType.DELETE,
                        objectType: ObjectType.SENSOR_ZONE,
                        objectId: origSzId,
                        newData: null,
                        origData: origSz,
                    });
                } else if (origSz.sensorIds.length === 2 ||
                           origSz.sensorIds.length === 3) {
                    // remove sensor from its orig sz
                    const origSzUpdated: GUISZClient = cloneDeep(origSz);
                    if (origSz.sensorIds.length === 3) {
                        origSzUpdated.otype = "GUISpeed2SensorZone";
                    } else if (origSz.sensorIds.length === 2) {
	                        // this is just a guess: change usage to stopbar
                        origSzUpdated.otype = "GUIStopbarSensorZone";
                        origSzUpdated.stopbarSensitivity = AptdApp.DEFAULT_SENSITIVITY;
                    }
                    let sensorIndex = origSzUpdated.sensorIds.indexOf(sensorId);
                    if (sensorIndex !== -1) {
                        origSzUpdated.sensorIds.splice(sensorIndex, 1);
                    } else {
                        throw new Error('unexpected negative sensorIndex');
                    }
                    actions.push({
                        updateType: UpdateType.UPDATE,
                        objectType: ObjectType.SENSOR_ZONE,
                        objectId: origSzId,
                        newData: origSzUpdated,
                        origData: origSz,
                    });
                }
            } else {
                // TODO: don't we need to handle FROM_SAME_SZ ?
                //if (context === DropContext.FROM_SAME_SZ)
            }

            actions.push(...[{
                // update map sz to add sensor
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.SENSOR_ZONE,
                objectId: targetSzId,
                newData: newTargetSz,
                origData: targetSz,
            }, {
                // update mapping from sensor dotid to szid
                objectId: targetSzId,
                objectType: ObjectType.DOTID_TO_SZID,
                newData: {[newMapSensor.id]: targetSzId},
                origData: {...this.props.topStore.getTopState().sensorDotidToSzId},
                updateType: UpdateType.ADD
            },
            ...sensorsActions,
            {
                // change the selection
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.SELECTED,
                objectId: '',
                origData: this.props.selected,
                newData: {
                    selected: this.state.dragging.elt,
                    selectedG: this.state.dragging.elt,
                    selectedDeviceType: ObjectType.SENSOR_ZONE,
                    selectedDotid: newMapSensor.id, //newTargetSz.sensorIds[0], //targetSzId,
                    selectedSzId: targetSzId
                },
            }]);

            this.props.undoManager.enactActionsToStore({
                actions: actions,
                description: "add or rearrange Sensor on Sensor Zone",
            }, EnactType.USER_ACTION);
        }
    }

    private onDropSensorFromMapToSZ(dragging: Dragging, coord: Point, clientDropPt: Point): void {
        // are we dropping on Sensor's own parent SZ or a different SZ?
        if (dragging.targetOK && dragging.eltDotid !== null &&
            dragging.target !== null) {
            const sensorId: string = dragging.eltDotid;
            const target: SVGElement = dragging.target;
            if (target.dataset.dotid !== undefined) {
                const targetSzId: string = target.dataset.dotid;
                if (targetSzId === this.props.sensorDotidToSzId[sensorId]) {
                    console.debug('dropped sensor on its own sz');
                    // have dropped on its own parent sz
                    if (this.haventMoved()) {
                        // do nothing, besides end drop
                        this.setState({dragging: MapAndTray.noDragState});
                        dragging.target.classList.remove('validDropTarget');

                        console.debug('dropped sensor without moving it. nothing.');
                        return;
                    } else if (this.szHas1Sensor(targetSzId)) {
                        // moving around single sensor has no effect
                        this.setState({dragging: MapAndTray.noDragState});
                        dragging.target.classList.remove('validDropTarget');
                        console.debug('dropped sensor on 1-sensor sz. nothing.');
                        return;
                    } else {
                        // have moved sensor within sz, and there is another sensor
                        // consider whether need to reorder sensors
                        console.debug('dropped sensor on multi-sensor sz. change order?');
                        const storableDropPosition = this.getAdjustedStorableMousePosition(clientDropPt);
                        console.debug('dropped position: clientDropPt=', clientDropPt, 'storableDropPosition=', storableDropPosition, );
                        // add sensor to targetSZ
                        // determine revised order of sensors from drop point among existing sensors
                        this.onDropSensorOnSZ(storableDropPosition, DropContext.FROM_SAME_SZ);
                    }
                } else {
                    // have dropped on different sz
                    // add sensor to target sz.  remove from source sz.
                    // And if source sz is now empty, remove it.
                    console.debug('dropped sensor on a different sz');
                    const storableDropPosition = this.getAdjustedStorableMousePosition(clientDropPt);
                    console.debug('dropped position: clientDropPt=', clientDropPt, 'storableDropPosition=', storableDropPosition, );
                    this.onDropSensorOnSZ(storableDropPosition, DropContext.FROM_ANOTHER_SZ);
                    // end drag
                    this.setState({dragging: MapAndTray.noDragState});
                    dragging.target.classList.remove('validDropTarget');
                }
            } else {
                throw new Error('unexpected undefined dotid');
            }
        } else {
            throw new Error('unexpected not targetOK or null eltDotid or null target');
        }
    }

    /** valid drop from tray to map: create a SZ on map */
    private onDropSensorFromTrayToMap(dragging: Dragging, coord: Point):void {
        console.debug('onMouseUp(): valid drop from tray to map');
        this.unselectAllDevices();
        console.debug("about to call setState in onDropSensorFromTrayToMap");
        // Q:    I don't see the point of calling setState here.
        //       We are not modifying prevState.  So probably do not need to call it.
        //       Similarly for onMoveRepeaterFromTrayToMap
        // A:    It is so we can end the drag.
        this.setState((prevState: MapAndTrayState) => {
            console.debug('setState-callback: updating state. eltDatum=', dragging.eltDatum);
            if (dragging.eltDatum === null) {
                console.error('setState-callback: unexpected null eltDatum');
                //return prevState;
                return null;
            }

            const modifiedMapPosition:Point = this.getAdjustedMousePosition(coord);

            let newMapSensor: GUISensorClient = cloneDeep(dragging.eltDatum);
            newMapSensor.selected = true;
            newMapSensor.info.location = Location.MAP;
            newMapSensor.info.position = {
                x: Math.round(modifiedMapPosition.x - this.mapImageLocationInSvg.x),
                y: Math.round(modifiedMapPosition.y - this.mapImageLocationInSvg.y)
            };

            let overlappingDevices = this.getOverlappingMapDevices(newMapSensor)
            if (Object.keys(overlappingDevices).length > 0) {
                //Check if there is a lastNotOverlappingLocation
                if (this.state.lastNotOverlappingLocation !== null) {
                    newMapSensor.info.position = {...this.state.lastNotOverlappingLocation};
                }
            }

            newMapSensor.info.rfLink = undefined;

            const newSzKey: string = 'clientSz' + (this.getMaxSzId() + 1);
            const newMapSz: GUISZClient = {
                id: newSzKey,
                sensorIds: [newMapSensor.id],
                spacingsMm: [],
                lengthCorrectionsMm: [],
                name: "Sensor Zone " + (this.getMaxSzNameNumber() + 1),
                info: {
                    location: Location.MAP,
                    // TODO: position must be derived from Sensor position
                    position: newMapSensor.info.position,
                    rotationDegrees: 0,
                    ccLinks: [],
                },
                otype: 'GUIStopbarSensorZone',
                stopbarSensitivity: AptdApp.DEFAULT_SENSITIVITY,
                selected: true,
                unheard: false
            };

            // TODO: do we need to send all these steps, or
            //       could they be inferred in TopStore from some meta-transaction sent?
            //       or maybe put in an Action manager?
            const eltDotid = dragging.eltDotid;
            if (eltDotid !== null) {
                const actions: Array<Action> = [{
                    updateType: UpdateType.ADD,
                    objectType: ObjectType.MAP_SENSOR,
                    objectId: newMapSensor.id,
                    origData: null,
                    newData: newMapSensor,
                    newDataDynamicFrom: ObjectType.TRAY_SENSOR,
                }, {
                    updateType: UpdateType.DELETE,
                    objectType: ObjectType.TRAY_SENSOR,
                    objectId: eltDotid,
                    origData: dragging.eltDatum,
                    origDataDynamicFrom: ObjectType.MAP_SENSOR,
                    newData: null
                }, {
                    updateType: UpdateType.ADD,
                    objectType: ObjectType.SENSOR_ZONE,
                    objectId: newSzKey,
                    origData: null,
                    newData: newMapSz
                }, {
                    updateType: UpdateType.ADD,
                    objectType: ObjectType.DOTID_TO_SZID,
                    objectId: newMapSensor.id,
                    origData: this.props.sensorDotidToSzId,
                    newData: {[newMapSensor.id]: newMapSz.id},
                }, /*{
                    updateType: UpdateType.UPDATE,
                    objectType: ObjectType.NEXT_SENSOR_ZONE_NO,
                    objectId: '',
                    origData: this.props.nextSensorZoneNo,
                    newData: this.props.nextSensorZoneNo + 1
                },*/ {
                    updateType: UpdateType.UPDATE,
                    objectType: ObjectType.SELECTED,
                    objectId: '',
                    origData: this.props.selected,
                    newData: {
                        selected: dragging.elt,
                        selectedG: dragging.elt,
                        selectedDeviceType: ObjectType.SENSOR_ZONE, // 'sensorZone',
                        selectedDotid: newMapSensor.id,
                        selectedSzId: newSzKey
                    }
                }];
                this.props.undoManager.enactActionsToStore({
                    actions: actions,
                    description: 'move Sensor to Map',
                }, EnactType.USER_ACTION);
            } else {
                console.error('unexpected null dotid');
            }

            let newDragging = MapAndTray.noDragState;

            return {dragging: newDragging};
        });
    }

    /**
     * look at all sensorZones in topStore.
     * Take the max of their id.
     * If id is of form 'szNN', use just the NN part.
     */
    private getMaxSzId(): number {
        let max: number = 0;
        const szids: string[] = Object.keys(this.props.topStore.getTopState().sensorZones);
        szids.forEach((szid: string) => {
            if (! isNaN(+szid)) {
                // szid is a number
                max = Math.max(max, +szid);
            } else {
                // szid is not a number
                // assume szid is of the form "clientSzNNN"
                const matches:RegExpMatchArray|null = szid.match(/^clientSz(\d+)$/);
                if (matches === null) {
                    console.error('error in getMaxSzId() match for ', szid);
                    return;
                }
                max = Math.max(max, +matches[1]);
            }
        });
        console.debug('getMaxSzId(): about to return', max);
        return max;
    }

    /**
     * look at all sensorZones in topStore.
     * Take the max of numbers of those names that are of the form "Sensor Zone NNN".
     */
    private getMaxSzNameNumber(): number {
        let max: number = 0;
        const sensorZones: GUISZClient[] = Object.values(this.props.topStore.getTopState().sensorZones);
        sensorZones.forEach((sensorZone: GUISZClient) => {
            // assume sensorZone.name is of the form "Sensor Zone NNN"
            const matches:RegExpMatchArray|null = sensorZone.name.match(/^Sensor Zone (\d+)$/);
            if (matches === null) {
                // name is not of the auto-generated format
                console.debug('getMaxSzNameNumber(): not of auto-generated format: ', sensorZone.name);
                return;
            }
            max = Math.max(max, +matches[1]);
        });
        console.debug('getMaxSzNameNumber(): about to return', max);
        return max;
    }

    // TODO: this method is unused
    /*
    private onMoveRepeater(dragging: Dragging, coord: Point):void {
        if (this.state.dragging.eltDatum === null) {
            console.error('unexpected null eltDatum');
            return;
        }

        const eltDotid:string|null = this.state.dragging.eltDotid;
        if (eltDotid === null) {
            throw new Error('unexpected null eltDotid');
        }

        let newMapRepeater: GUIRepeaterClient = cloneDeep(this.state.mapRepeaters[eltDotid]);
        newMapRepeater.selected = true;

        let newDragging: Dragging = cloneDeep(this.state.dragging);
        const startDatum: GUIRepeaterClient = newDragging.eltDatum as GUIRepeaterClient;
        if (newDragging.eltStartLoc !== null) {
            startDatum.info.position.x = newDragging.eltStartLoc.x;
            startDatum.info.position.y = newDragging.eltStartLoc.y;
        }

        let xacts: Array<Action> = [{
            updateType: UpdateType.UPDATE,
            objectType: ObjectType.MAP_REPEATER,
            objectId: eltDotid,
            origData: TopStore.getInfoOf(startDatum),
            newData: TopStore.getInfoOf(newMapRepeater),
        }];

        // persist move if there was a move
        if (startDatum.info.position.x !== newMapRepeater.info.position.x ||
            startDatum.info.position.y !== newMapRepeater.info.position.y) {

            this.props.undoManager.enactActionsToStore({
                actions: xacts,
                description: "move repeater"
            }, EnactType.USER_ACTION);
        }
    }
    */

    /** valid drop from tray to map: create a map repeater  */
    private onDropRepeaterFromTrayToMap(dragging: Dragging, coord: Point):void {
        console.debug('onDropRepeaterFromTrayToMap(): valid drop from tray to map');
        this.unselectAllDevices();
        console.log("about to call setState in onDropRepeaterFromTrayToMap");
        // TODO: I don't see the point of calling setState here.
        //       We are not modifying prevState.  So probably do not need to call it.
        // @ts-ignore
        this.setState((prevState: MapAndTrayState) => {
            console.debug('setState-callback: updating state. eltDatum=', dragging.eltDatum);
            if (dragging.eltDatum === null) {
                console.error('setState-callback: unexpected null eltDatum');
                return prevState;
            }
            let newMapRepeater: GUIRepeaterClient = cloneDeep(dragging.eltDatum);
            newMapRepeater.selected = true;
            newMapRepeater.info.location = Location.MAP;
            const adjustedMousePosition = this.getAdjustedMousePosition(coord);
            newMapRepeater.info.position.x = Math.round(adjustedMousePosition.x - this.mapImageLocationInSvg.x);
            newMapRepeater.info.position.y = Math.round(adjustedMousePosition.y - this.mapImageLocationInSvg.y);

            let overlappingDevices = this.getOverlappingMapDevices(newMapRepeater);
            if (Object.keys(overlappingDevices).length > 0) {
                //Check if there is a lastNotOverlappingLocation
                if (this.state.lastNotOverlappingLocation !== null) {
                    newMapRepeater.info.position = {...this.state.lastNotOverlappingLocation};
                }
            }

            // TODO: do we need to send all these steps, or
            //       could they be inferred in Aptd from some meta-transaction sent?
            //       or maybe put in a Action manager?
            const eltDotid = dragging.eltDotid;
            if (eltDotid !== null) {
                const xacts: Array<Action> = [{
                    updateType: UpdateType.ADD,
                    objectType: ObjectType.MAP_REPEATER,
                    objectId: newMapRepeater.id,
                    origData: null,
                    newData: newMapRepeater,
                    newDataDynamicFrom: ObjectType.TRAY_REPEATER,
                }, {
                    updateType: UpdateType.DELETE,
                    objectType: ObjectType.TRAY_REPEATER,
                    objectId: eltDotid,
                    origData: dragging.eltDatum,
                    origDataDynamicFrom: ObjectType.MAP_REPEATER,
                    newData: null
                }, {
                    updateType: UpdateType.UPDATE,
                    objectType: ObjectType.SELECTED,
                    objectId: '',
                    origData: this.props.selected,
                    newData: {
                        selected: newMapRepeater,
                        selectedG: newMapRepeater,
                        selectedDeviceType: ObjectType.MAP_REPEATER,
                        selectedDotid: newMapRepeater.id,
                        selectedSzId: null
                    }
                }];
                this.props.undoManager.enactActionsToStore({
                    actions: xacts,
                    description: "move Repeater to Map"
                }, EnactType.USER_ACTION);
            } else {
                console.error('unexpected null dotid');
            }

            // warning: the following is not related to setting the state,
            // but needs to be delayed to here because these are used above.
            let newDragging = MapAndTray.noDragState;
            return {dragging: newDragging};
        });
    }

    /**
     * mouse has left some important object.
     * If left a valid drag target, turn off validity on the target.
     * TODO: currently using the same method for many types of element.  Might be clearer to
     *       avoid the switch here and have different implementations for each type of target.
     *       i.e., could have oMouseLeaveMap(), onMouseLeaveRadio(), onMouseLeaveSZ(), etc.
     */
    onMouseLeave(event: React.MouseEvent<Element>) {
        // TODO: following is for debugging only, and can be removed
        // event.persist();

        const dragging = this.state.dragging;
        if (dragging.elt === null) {
            // not dragging!
            return;
        }

        const currentTarget = event.currentTarget as SVGElement;
        const clientPt = {x: event.clientX, y: event.clientY};
        const modifiedPoint = this.getModifiedPoint(clientPt);
        console.debug("onMouseLeave() START: dragging.elt=", dragging.elt, 'currentTarget=', currentTarget, 'event=', {...event}, 'dragging=', dragging, 'clientPt=', clientPt, 'modifiedPoint=', modifiedPoint);
        console.debug("about to call setState from onMouseLeave");

        if (dragging.elt === currentTarget) {
            // The mouse leaves the item we are trying to drag, e.g. at the boundary of map.
            // Or, because user dragged so fast it got outside the target.
            // Because we have not stopped propagation, we hope mouseLeave event will
            // bubble up to Map, so Map can handle leaving the Map.
            console.warn("onMouseLeave(): dragging elt matches current target. doing nothing");
            return;
        }
        // a legitimate "leaving", so stop propagation now
        event.stopPropagation();

        if (dragging.type === ObjectType.SENSOR_ZONE && dragging.transformType === TransformType.ROTATE) {
            if (currentTarget.id !== "mapCabinetSvg") {
                // Mouse "left" some other object on the map, that does not affect rotation,
                // so we want to keep rotating szone, so we just ignore and do nothing
                return;
            }
        }
        else if (dragging.type === ObjectType.MAP_NORTH_ARROW_ICON ||
                 dragging.type === ObjectType.MODAL) {
            // these objects don't interact with other objects, so don't care about leaving. do nothing.
            return;
        }

        this.unselectAllDevices();

        // @ts-ignore  TODO: don't ignore typescript errors
        this.setState((prevState: MapAndTrayState) => {
            let newDragging: Dragging = cloneDeep(prevState.dragging) as Dragging;

            if (newDragging.elt === null) {
                console.error('onMouseLeave.setState.handler: unexpected null elt');
                return {dragging: MapAndTray.noDragState};
            }
            if (newDragging.eltDotid === null) {
                console.error('onMouseLeave.setState.handler: unexpected null eltDotid');
                return {dragging: MapAndTray.noDragState};
            }
            if (newDragging.eltStartLoc === null) {
                console.error('onMouseLeave.setState.handler: unexpected null eltStartLoc');
                return {dragging: MapAndTray.noDragState};
            }

            const newDragState: {['dragging']: Dragging} = {'dragging': newDragging};
            if (newDragging.targetOK) {
                // leaving valid target. Reset target info in newDragging
                newDragging.targetOK = false;
                newDragging.targetType = null;
                newDragging.target = null;

                // TODO: (as with onMouseEnter(), instead of modifying classList directly, could
                //       modify state of currentTarget and then let it render.
                //       Is that better or worse?
                currentTarget.classList.remove('validDropTarget');
            }

            const targetType: ObjectType = currentTarget.dataset.devicetype as ObjectType;
            let leaveState;
            switch (newDragging.type) {
                case ObjectType.MAP_SENSOR:
                    if (targetType === ObjectType.MAP) {
                        if (this.isBelowMap(modifiedPoint)) {
                            // mouse is maybe over tray.  just remove valid state for drag.  It will be
                            // set again by mouseEnter on tray.
                            leaveState = newDragState;
                        } else {
                            // if mouse is not over the tray, abort the drag, causing bounce-back
                            leaveState = {dragging: MapAndTray.noDragState};
                        }
                    } else {
                        // leaving some valid target other than Map
                        leaveState = newDragState;
                    }
                    console.debug('onMouseLeave.setState(): about to return leaveState=', leaveState);
                    return leaveState;
                    // no break needed here...

                case ObjectType.MAP_REPEATER:
                    if (targetType === ObjectType.MAP) {
                        if (this.isBelowMap(modifiedPoint)) {
                            // mouse is maybe over tray.  just remove valid state for drag.  It will be
                            // set again by mouseEnter on tray.
                            leaveState = newDragState;
                        } else {
                            // if mouse is not over the tray, abort the drag, causing bounce-back
                            leaveState = {dragging: MapAndTray.noDragState};
                        }
                        console.debug('onMouseLeave.setState(): about to return leaveState=', leaveState);
                        return leaveState;
                    } else if (targetType === ObjectType.RADIO) {
                        if (newDragging.proxyLoc !== undefined && this.isInMap(newDragging.proxyLoc)) {
                            // leaving a Radio -- must be about to enter the Map, but we don't get an enter event
                            newDragging.targetOK = true;
                            newDragging.targetType = ObjectType.MAP;
                        }
                        let leaveState = {
                            dragging: newDragging
                        };
                        return leaveState;
                    } else {
                        return null;
                    }
                    // no break needed here...

                case ObjectType.SENSOR_ZONE:
                    if (targetType === ObjectType.MAP) {
                        // SZ leaving Map: revert map sz to orig location
                        let sensorZone = cloneDeep(prevState.sensorZones[newDragging.eltDotid]);
                        sensorZone.info.position.x = newDragging.eltStartLoc.x;
                        sensorZone.info.position.y = newDragging.eltStartLoc.y;
                        sensorZone.selected = true;
                        let newSensorZones = cloneDeep(prevState.sensorZones);
                        newSensorZones[newDragging.eltDotid] = sensorZone;
                        // end newDragging
                        const leaveState = {
                            dragging: MapAndTray.noDragState,
                            sensorZones: newSensorZones,
                        };
                        return leaveState;
                    }
                    else {
                        // SZ leaving something else: ignore
                        return null;
                    }
                    // no break needed here...

                case ObjectType.TRAY_SENSOR:
                    // TODO: currently this code code be condense with the next case (TRAY_REPEATER)
                    if (dragging.targetType === ObjectType.SENSOR_ZONE ||
                        dragging.targetType === ObjectType.RADIO ||
                        dragging.targetType === ObjectType.MAP_REPEATER) {
                        // leaving a map SZ or other map object. presumably entering map.
                        // Unfortunately, don't get an enter for map when leaving the SZ.
                        // And we don't keep a stack of target states.
                        // So we guess here that we are entering map.
                        newDragging.targetOK = true;
                        newDragging.targetType = ObjectType.MAP;
                        return newDragState;
                    } else if (dragging.targetType === ObjectType.MAP) {
                        // if leaving the map
                        leaveState = this.onMouseLeaveMapDraggingTrayDevice(modifiedPoint, newDragState, prevState);
                        console.debug('onMouseLeave.setState(): about to return leaveState=', leaveState);
                        return leaveState;
                    } else if (dragging.targetType === ObjectType.TRAY) {
                        // leaving the Tray
                        leaveState = newDragState;
                        return leaveState;
                    } else {
                        // ignore leaving any other item on map
                        // we just continue on, ignoring items we cross over.
                        return null;
                    }
                    // no break needed here...

                case ObjectType.TRAY_REPEATER:
                    if (dragging.targetType === ObjectType.SENSOR_ZONE ||
                        dragging.targetType === ObjectType.RADIO ||
                        dragging.targetType === ObjectType.MAP_REPEATER) {
                        // leaving a map SZ or other map element. presumably entering map.
                        // Unfortunately, don't get an enter for map when leaving the SZ.
                        // And we don't keep a stack of target states.
                        // So we guess here that we are entering map.
                        newDragging.targetOK = true;
                        newDragging.targetType = ObjectType.MAP;
                        return newDragState;
                    } else if (dragging.targetType === ObjectType.MAP) {
                        // if leaving the map
                        leaveState = this.onMouseLeaveMapDraggingTrayDevice(modifiedPoint, newDragState, prevState);
                        console.debug('onMouseLeave.setState(): about to return leaveState=', leaveState);
                        return leaveState;
                    } else if (dragging.targetType === ObjectType.TRAY) {
                        // if leaving the tray
                        console.debug('onMouseLeave(): leaving the tray');
                        leaveState = newDragState;
                        return leaveState;
                    } else {
                        // ignore leaving any other item on map
                        // we just continue on, ignoring items we cross over.
                        return null;
                    }
                    // no break needed here...

                case ObjectType.CC_LINK:
                    return {dragging: newDragging}
                    // no break needed here...

                case ObjectType.RF_LINK:
                    return null;
                    // no break needed here...

                case ObjectType.AP:
                case ObjectType.RADIO:
                case ObjectType.SENSOR_ZONE:
                case ObjectType.TEXT_FIELD:
                case ObjectType.CABINET_ICON:
                    if (targetType === ObjectType.MAP) {
                        // Dragged item leaving Map: force-revert dragged item to orig location.
                        // This is to avoid situation where dragged item lurks at edge of map,
                        // and then clings to returning mouse.
                        const cabinetIconLocation = {...newDragging.eltStartLoc};
                        // end the drag!
                        const leaveState = {
                            dragging: MapAndTray.noDragState,
                            cabinetIconLocation: cabinetIconLocation,
                        };
                        return leaveState;
                    } else {
                        return {dragging: newDragging};
                    }
                    // no break needed here...

                default:
                    console.error('unexpected newDragging type in onMouseLeave', newDragging.type);
                    return {dragging: MapAndTray.noDragState};
            }
        });
    }


    private onMouseLeaveMapDraggingTrayDevice(modifiedPoint: Point,
                                              newDragState: { dragging: Dragging },
                                              prevState: MapAndTrayState): Object {
        console.debug('onMouseLeaveMapDraggingTrayDevice(): leaving the map');
        let leaveState: {};
        if (this.isBelowMap(modifiedPoint)) {
            // mouse is maybe over tray.  just remove valid state for drag.  It will be
            // set again by mouseEnter on tray.
            leaveState = newDragState;
        } else {
            // if mouse is not over the tray, abort the drag, causing bounce-back
            const trayDevices = cloneDeep(prevState.trayDevices);
            if (prevState.dragging.eltStartLoc === null) {
                console.error('unexpected null eltStartLoc');
            } else if (prevState.dragging.eltDotid === null) {
                console.error('unexpected null eltDotid');
            } else {
                // normally this is done in the drop (mouseUp), but hard to track that outside map
                const dotid: string = prevState.dragging.eltDotid;
                trayDevices[dotid].info.position.x = prevState.dragging.eltStartLoc.x;
                trayDevices[dotid].info.position.y = prevState.dragging.eltStartLoc.y;
                (trayDevices[dotid] as GUISensorClient).selected = true;
            }
            leaveState = {
                trayDevices: trayDevices,
                dragging: MapAndTray.noDragState,
            };
        }
        return leaveState;
    }

    /**
     * drag handler.  currently only implemented on map svg and on tray svg.
     * TODO: might want separate drag handlers for map, tray.
     */
    onMouseMove(event: React.MouseEvent<Element>) {
        let clientPoint: Point = {x: event.clientX, y: event.clientY};
        const dragging:Dragging = this.state.dragging;
        if (dragging.elt !== null) {
            event.stopPropagation();
            if (dragging.type === ObjectType.TEXT_FIELD) {
                clientPoint = this.getMousePosition(event);
            }
            else if (dragging.transformType === TransformType.ROTATE ||
                dragging.type === ObjectType.RF_LINK ||
                dragging.type === ObjectType.CC_LINK) {

                const mousePos:Point = this.getMousePosition(event);
                clientPoint = this.getAdjustedMousePosition(mousePos);
            }

            switch (dragging.type) {
                case ObjectType.TRAY_SENSOR:
                case ObjectType.TRAY_REPEATER:
                    const modifiedCoord = this.getMousePosition(event);
                    this.onMoveTrayDevice(clientPoint, modifiedCoord);
                    break;
                case ObjectType.MAP_SENSOR:
                    this.onMoveMapSensor(clientPoint);
                    break;
                case ObjectType.RF_LINK:
                    this.onMoveRfLink(clientPoint);
                    break;
                case ObjectType.CC_LINK:
                    this.onMoveCcLink(clientPoint);
                    break;
                case ObjectType.SENSOR_ZONE:
                    this.onMoveSensorZone(clientPoint);
                    break;
                case ObjectType.RADIO:
                    this.onMoveRadio(clientPoint);
                    break;
                case ObjectType.MAP_REPEATER:
                    this.onMoveMapRepeater(clientPoint);
                    break;
                case ObjectType.AP:
                    this.onMoveAp(clientPoint);
                    break;
                case ObjectType.MAP_NORTH_ARROW_ICON:
                    this.onMoveNorthArrowIcon(clientPoint);
                    break;
                case ObjectType.TEXT_FIELD:
                    this.onMoveTextField(clientPoint);
                    break;
                case ObjectType.CABINET_ICON:
                    this.onMoveCabinetIcon(clientPoint);
                    break;
                case ObjectType.MODAL:
                    this.onMoveModal(clientPoint);
                    break;
                case ObjectType.MAP:
                    this.onMoveMap(clientPoint);
                    break;
                default:
                    throw new Error('onMouseMove(): unexpected drag type: ' + dragging.type);
            }
        }
    }

    /** called by onMouseMove() when user is panning the map */
    private onMoveMap(clientPoint: Point) {
        console.debug('START onMoveMap() for MAP drag');
        const dragging:Dragging = this.state.dragging;
        if (dragging === null) {
            console.error('unexpected null dragging for Map');
        } else {
            this.setState((prevState: MapAndTrayState) => {
                if (dragging.lastLoc === null) {
                    console.warn('unexpected null dragging.lastLoc');
                    dragging.lastLoc = {...clientPoint};
                }
                const mouseDiff: Point = {
                    x: clientPoint.x - dragging.lastLoc.x,
                    y: clientPoint.y - dragging.lastLoc.y,
                };
                const newPan: Point = cloneDeep(prevState.pan);
                newPan.x += mouseDiff.x;
                newPan.y += mouseDiff.y;

                // we need to keep the 'last' mouse point in lastLoc,
                // so we can determine the next increment for the map
                dragging.lastLoc = {...clientPoint};

                return {
                    pan: newPan,
                    dragging: dragging,
                };
            });
        }
    }

    private onMoveTrayDevice(clientPoint: Point, coord: Point): void {
        this.setState((prevState: Readonly<MapAndTrayState>) => {
            const dragging: Dragging = cloneDeep(prevState.dragging) as Dragging;
            const dotid = dragging.eltDotid;
            let lastNotOverlappingLocation: GUIPoint|null =
                this.state.lastNotOverlappingLocation === null ?
                    null : {...this.state.lastNotOverlappingLocation};
            let trayDevices = cloneDeep(prevState.trayDevices);
            if (dotid !== null) {
                const trayDevice: GUISensorClient|GUIRepeaterClient = trayDevices[dotid];

                if (trayDevice.otype === 'GUISensor') {
                    const traySensor = trayDevice as GUISensorClient;
                    if (traySensor.hwType === GUISensorType.RAD) {
                        // for uRadar Sensor, drag/configure not yet supported
                        console.info('onMoveTrayDevice(): attempt to move a uRad Sensor');
                        this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'Sensor ' + traySensor.id + ' is microRadar. SensConfig does not yet support configuration of microRadar Sensors. To configure Sensor ' + traySensor.id + ', please use TrafficDot2 instead', ['OK']);
                        return {
                            dragging: MapAndTray.noDragState,
                            trayDevices: trayDevices,
                            lastNotOverlappingLocation: null,
                        };
                    }
                }
                if (dragging.lastLoc === null) {
                    dragging.lastLoc = {x:0, y:0};
                }
                const mouseDiffX = clientPoint.x - dragging.lastLoc.x;
                const mouseDiffY = clientPoint.y - dragging.lastLoc.y;
                if (trayDevice !== undefined) {
                    trayDevice.info.position.x += mouseDiffX;
                    trayDevice.info.position.y += mouseDiffY;
                }
                dragging.lastLoc = clientPoint;
                if (dragging.proxyType === ObjectType.TRAY_SENSOR ||
                    dragging.proxyType === ObjectType.TRAY_REPEATER) {
                    dragging.proxyLoc = clientPoint;
                }

                if (this.isInMap(coord)) {
                    const trayDeviceMapInfo = cloneDeep(trayDevice);
                    const mapLoc = this.getAdjustedMousePosition(coord);
                    trayDeviceMapInfo.info.position = {
                        x: Math.round(mapLoc.x - this.mapImageLocationInSvg.x),
                        y: Math.round(mapLoc.y - this.mapImageLocationInSvg.y)
                    };

                    const overlappingDevices = this.getOverlappingMapDevices(trayDeviceMapInfo);
                    if (Object.keys(overlappingDevices).length === 0) {
                        lastNotOverlappingLocation = trayDeviceMapInfo.info.position;
                    }
                }
                return {
                    trayDevices: trayDevices,
                    dragging: dragging,
                    lastNotOverlappingLocation: lastNotOverlappingLocation
                };
            }
            return null;
        });
    }

    private onMoveMapSensor(clientPoint: Point): void {
        this.setState((prevState: MapAndTrayState) => {
            let dragging: Dragging = cloneDeep(prevState.dragging) as Dragging;
            if (dragging.proxyType === ObjectType.MAP_SENSOR) {
                if (dragging.proxyLoc === undefined || dragging.eltDotid === undefined) {
                    throw new Error('unexpected undefined proxyLoc');
                }
                dragging.proxyLoc = clientPoint;
                dragging.lastLoc = clientPoint;
            }
            return {dragging: dragging};
        });
    }

    private onMoveRfLink(clientPoint: Point): void {
        this.setState((prevState: MapAndTrayState) => {
            let dragging: Dragging = cloneDeep(prevState.dragging) as Dragging;
            let dotid = dragging.eltDotid;
            let mapSensors = cloneDeep(prevState.mapSensors);
            let mapRepeaters = cloneDeep(prevState.mapRepeaters);
            let linkSegmentIndex = dragging.linkSegmentIndex as number;

            let type = ObjectType.MAP_SENSOR
            if (dotid !== null && (linkSegmentIndex !== null && linkSegmentIndex !== undefined)) {
                if (dragging.lastLoc === null) {
                    dragging.lastLoc = {x:0, y:0};
                }
                let mouseDiffX = clientPoint.x - dragging.lastLoc.x;
                let mouseDiffY = clientPoint.y - dragging.lastLoc.y;

                let rfLink: GUIRFLink | null = null;
                if (mapSensors[dotid] !== null && mapSensors[dotid] !== undefined) {
                    rfLink = mapSensors[dotid].info.rfLink;
                }
                else if (mapRepeaters[dotid] !== null && mapRepeaters[dotid] !== undefined) {
                    type = ObjectType.MAP_REPEATER
                    rfLink = mapRepeaters[dotid].info.rfLink;
                }

                if (!dragging.linkUpdates && dragging.eltStartLoc !== null && rfLink !== null) {
                    dragging.linkUpdates = true;

                    if (rfLink.lines.length > 1) {
                        //Check if this is in range of pervious drag point and use same point in that case
                        let point = {
                            x: clientPoint.x - this.mapImageLocationInSvg.x,
                            y: clientPoint.y - this.mapImageLocationInSvg.y
                        }
                        let prevSegementIndex = this.checkDragPoint(linkSegmentIndex, rfLink.lines, point);
                        if (prevSegementIndex !== -1) {
                            //this is an existing point
                            dragging.linkSegmentIndex = prevSegementIndex
                            dragging.lastLoc = clientPoint;

                            if (type === ObjectType.MAP_REPEATER) {
                                return {
                                    mapRepeaters: mapRepeaters,
                                    mapSensors: mapSensors,  // not needed, but typescript wants
                                    dragging: dragging,
                                };
                            }
                            return {
                                mapSensors: mapSensors,
                                mapRepeaters: mapRepeaters,  // not needed, but typescript wants
                                dragging: dragging,
                            };
                        }
                    }

                    let appendNewLine: Line[] = []
                    for (let lineIndex = 0; lineIndex < linkSegmentIndex; ++lineIndex) {
                        appendNewLine.push(rfLink.lines[lineIndex]);
                    }

                    let bPoint: GUIPoint = {
                        x: Math.round(clientPoint.x - this.mapImageLocationInSvg.x),
                        y: Math.round(clientPoint.y - this.mapImageLocationInSvg.y)
                    };

                    appendNewLine.push({
                        aPoint:rfLink.lines[linkSegmentIndex].aPoint,
                        bPoint:bPoint
                    });
                    appendNewLine.push({
                        aPoint:bPoint,
                        bPoint:rfLink.lines[linkSegmentIndex].bPoint
                    });

                    for (let lineIndex = linkSegmentIndex + 1; lineIndex < rfLink.lines.length; ++lineIndex) {
                        appendNewLine.push(rfLink.lines[lineIndex]);
                    }
                    rfLink.lines = appendNewLine;
                }
                else if (rfLink !== null){
                    rfLink.lines[linkSegmentIndex].bPoint.x = rfLink.lines[linkSegmentIndex].bPoint.x + mouseDiffX;
                    rfLink.lines[linkSegmentIndex].bPoint.y = rfLink.lines[linkSegmentIndex].bPoint.y + mouseDiffY;
                    if (rfLink.lines.length > linkSegmentIndex+1) {
                        rfLink.lines[linkSegmentIndex+1].aPoint.x = rfLink.lines[linkSegmentIndex].bPoint.x;
                        rfLink.lines[linkSegmentIndex+1].aPoint.y = rfLink.lines[linkSegmentIndex].bPoint.y;
                    }
                }

                if (type === ObjectType.MAP_SENSOR) {
                    mapSensors[dotid].info.rfLink = rfLink;
                }
                else if (type === ObjectType.MAP_REPEATER) {
                    mapRepeaters[dotid].info.rfLink = rfLink;
                }
                dragging.lastLoc = clientPoint;

            }
            if (type === ObjectType.MAP_REPEATER) {
                return {
                    mapRepeaters: mapRepeaters,
                    mapSensors: mapSensors,  // not needed, but typescript wants
                    dragging: dragging,
                };
            }
            return {
                mapSensors: mapSensors,
                mapRepeaters: mapRepeaters,  // not needed, but typescript wants
                dragging: dragging,
            };

        });
    }

    private onMoveCcLink(clientPoint: Point): void {
        this.setState((prevState: MapAndTrayState) => {
            let dragging: Dragging = cloneDeep(prevState.dragging) as Dragging;
            let dotid = dragging.eltDotid;
            let mapSensors = cloneDeep(prevState.mapSensors);
            let linkSegmentIndex = dragging.linkSegmentIndex as number;

            // hr: because server wants all x/y coords as ints, we round here.
            const intClientPoint: Point = {
                x: Math.round(clientPoint.x),
                y: Math.round(clientPoint.y)
            };

            if (dotid !== null && (linkSegmentIndex !== null && linkSegmentIndex !== undefined)) {
                if (dragging.lastLoc === null) {
                    dragging.lastLoc = {x:0, y:0};
                }
                let mouseDiffX = intClientPoint.x - dragging.lastLoc.x;
                let mouseDiffY = intClientPoint.y - dragging.lastLoc.y;
                let ccLink: GUICCLink = mapSensors[dotid].info.ccLinks[dragging.eltDatum];

                if (dragging.linkEndPointDrag && dragging.linkEndPointDrag !== null) {
                    ccLink.lines[linkSegmentIndex].bPoint.x = intClientPoint.x;
                    ccLink.lines[linkSegmentIndex].bPoint.y = intClientPoint.y;
                }
                else {

                    if (!dragging.linkUpdates && dragging.eltStartLoc !== null) {
                        dragging.linkUpdates = true;

                        //Check if user is dragging end of ccLink
                        if (this.checkEndPointSelected(ccLink.dstId, clientPoint)) {
                            dragging.linkEndPointDrag = true;
                            return {
                                mapSensors: mapSensors,
                                dragging: dragging,
                            };
                        }

                        if (ccLink.lines.length > 1) {
                            //Check if this is in range of pervious drag point and use same point in that case

                            //CCLink points are in respect to the outer SVG since they connected to the cabinet
                            //So here we need to use the mouse coordinate value in respect to the full SVG to compare
                            let clientPointInRelationToSvg = {
                                x: Math.round(clientPoint.x - this.mapImageLocationInSvg.x),
                                y: Math.round(clientPoint.y - this.mapImageLocationInSvg.y)
                            }
                            let prevSegementIndex = this.checkDragPoint(linkSegmentIndex, ccLink.lines, clientPointInRelationToSvg);
                            if (prevSegementIndex !== -1) {
                                //this is an existing point
                                dragging.linkSegmentIndex = prevSegementIndex
                                dragging.lastLoc = intClientPoint;

                                return {
                                    mapSensors: mapSensors,
                                    dragging: dragging,
                                };
                            }
                        }

                        let appendNewLine: Line[] = []
                        for (let lineIndex = 0; lineIndex < linkSegmentIndex; ++lineIndex) {
                            appendNewLine.push(ccLink.lines[lineIndex]);
                        }

                        let bPoint: GUIPoint = {
                            x: Math.round(clientPoint.x - this.mapImageLocationInSvg.x),
                            y: Math.round(clientPoint.y - this.mapImageLocationInSvg.y)
                        };

                        appendNewLine.push({
                            aPoint:ccLink.lines[linkSegmentIndex].aPoint,
                            bPoint:bPoint
                        });
                        appendNewLine.push({
                            aPoint: bPoint,
                            bPoint: ccLink.lines[linkSegmentIndex].bPoint
                        });

                        for (let lineIndex = linkSegmentIndex + 1; lineIndex < ccLink.lines.length; ++lineIndex) {
                            appendNewLine.push(ccLink.lines[lineIndex]);
                        }

                        ccLink.lines = appendNewLine;
                    }
                    else {
                        ccLink.lines[linkSegmentIndex].bPoint.x = ccLink.lines[linkSegmentIndex].bPoint.x + mouseDiffX;
                        ccLink.lines[linkSegmentIndex].bPoint.y = ccLink.lines[linkSegmentIndex].bPoint.y + mouseDiffY;
                        if (ccLink.lines.length > linkSegmentIndex+1) {
                            ccLink.lines[linkSegmentIndex+1].aPoint.x = ccLink.lines[linkSegmentIndex].bPoint.x;
                            ccLink.lines[linkSegmentIndex+1].aPoint.y = ccLink.lines[linkSegmentIndex].bPoint.y;
                        }
                    }
                }

                mapSensors[dotid].info.ccLinks[dragging.eltDatum] = ccLink;
                dragging.lastLoc = intClientPoint;

            }
            return {
                mapSensors: mapSensors,
                dragging: dragging,
            };
        });
    }

    private onMoveSensorZone(clientPoint: Point): void {
        // @ts-ignore TODO: fix this typescript error
        this.setState((prevState: MapAndTrayState) => {
            const dragging: Dragging = cloneDeep(prevState.dragging) as Dragging;
            const dotid = dragging.eltDotid;
            let lastNotOverlappingLocation = {...this.state.lastNotOverlappingLocation};
            let lastNotOverlappingRotation = this.state.lastNotOverlappingRotation;
            const mapSensors = cloneDeep(prevState.mapSensors);
            const sensorZones = cloneDeep(prevState.sensorZones);

            if (dotid !== null) {
                if (dragging.transformType === TransformType.TRANSLATE) {
                    // reminder: sensorZone.info.position is measured as the offset of
                    // the center of the sensorZone rectangle from the upper left of the
                    // mapImage
                    if (dragging.lastLoc === null) {
                        dragging.lastLoc = {x:0, y:0};
                    }
                    const mouseDiffX = clientPoint.x - dragging.lastLoc.x;
                    const mouseDiffY = clientPoint.y - dragging.lastLoc.y;
                    sensorZones[dotid].info.position.x = sensorZones[dotid].info.position.x +
                        Math.round(mouseDiffX / this.props.scale);
                    sensorZones[dotid].info.position.y = sensorZones[dotid].info.position.y +
                        Math.round(mouseDiffY / this.props.scale);
                    dragging.lastLoc = clientPoint;

                    const overlappingDevices = this.getOverlappingMapDevices(sensorZones[dotid])
                    if (Object.keys(overlappingDevices).length === 0) {
                        lastNotOverlappingLocation = sensorZones[dotid].info.position;
                    }

                    this.updateSensorCentersAndLinks(sensorZones, dotid, mapSensors);
                }
                else if (dragging.transformType === TransformType.ROTATE) {
                    // reminder:
                    // sensorZone.info.rotationDegrees is degrees measured clockwise from the horizontal.
                    // values integer [0-359] e.g., pointing East is 0, pointing South is 90, pointing North is 270
                    const diffX = sensorZones[dotid].info.position.x -
                        (clientPoint.x - this.mapImageLocationInSvg.x);
                    const diffY = sensorZones[dotid].info.position.y -
                        (clientPoint.y - this.mapImageLocationInSvg.y);
                    // hr: TODO: what if diffX is 0.  would get div by 0 here:
                    const tan = diffY / diffX;
                    const angleDegrees = Math.atan(tan) * (180 / Math.PI);

                    // round to nearest multiple of 5 degrees
                    let roundedAngleDegrees: number = MapAndTray.nearest(angleDegrees, 5);
                    if (diffY >= 0 && diffX >= 0) {
                        roundedAngleDegrees += 180;
                    } else if (diffY < 0 && diffX >= 0) {
                        roundedAngleDegrees -= 180;
                    }

                    /* hr For bug 14365: disable overlapping test for rotation
                    const overlappingDevices = this.getOverlappingMapDevices(sensorZones[dotid])
                    if (Object.keys(overlappingDevices).length === 0) {
                    */
                        lastNotOverlappingRotation = sensorZones[dotid].info.rotationDegrees;
                    /*
                    }
                    */

                    // value will be integer in range [0, 359]
                    sensorZones[dotid].info.rotationDegrees =
                        MapAndTray.betterModulus(roundedAngleDegrees, 360);
                    if (sensorZones[dotid].sensorIds.length > 1) {
                        this.updateSensorCentersAndLinks(sensorZones, dotid, mapSensors);
                    }
                }
            }
            return {
                sensorZones: sensorZones,
                mapSensors: mapSensors,
                dragging: dragging,
                lastNotOverlappingLocation: lastNotOverlappingLocation,
                lastNotOverlappingRotation: lastNotOverlappingRotation
            };
        });
    }

    // TODO: get rid of ts-ignore
    private onMoveRadio(clientPoint: Point): void {
        // @ts-ignore
        this.setState((prevState: MapAndTrayState) => {
            const dragging: Dragging = cloneDeep(prevState.dragging) as Dragging;
            const radioId:string|null = dragging.eltDotid;
            if (radioId === null) {
                console.error('onMoveRadio(): radioId is null');
                return null;
            }
            let lastNotOverlappingLocation =
                (prevState.lastNotOverlappingLocation === null ? null : {...prevState.lastNotOverlappingLocation});

            const newRadios:{[id: string]: GUIRadioClient} = cloneDeep(prevState.radios);
            let mapSensorsAndRepeaters: Partial<MapAndTrayState> = {};
            if (dragging.transformType === TransformType.TRANSLATE) {
                if (dragging.lastLoc === null) {
                    dragging.lastLoc = {x:0, y:0};
                }
                let mouseDiffX = clientPoint.x - dragging.lastLoc.x;
                let mouseDiffY = clientPoint.y - dragging.lastLoc.y;
                const newRadio: GUIRadioClient = newRadios[radioId];
                const radioPosition = newRadio.info.position;
                radioPosition.x += Math.round(mouseDiffX / this.props.scale);
                radioPosition.y += Math.round(mouseDiffY / this.props.scale);

                let overlappingDevices:{[id: string]: Mappable} = this.getOverlappingMapDevices(newRadio);
                if (Object.keys(overlappingDevices).length === 0) {
                    lastNotOverlappingLocation = newRadio.info.position;
                }
                mapSensorsAndRepeaters = this.updateLinksEndPointForState(radioId, radioPosition,
                    dragging.linkSensorIds, dragging.linkRepeaterIds, prevState);

                dragging.lastLoc = clientPoint;
                //console.log("onMoveRadio(): setting values: " + radioPosition.x, + " " + radioPosition.y);
            } else {
                console.error('onMoveRadio(): unexpected transform type: ' + dragging.transformType);
                return null;
            }

            let newState = {
                radios: newRadios,
                dragging: dragging,
                lastNotOverlappingLocation: lastNotOverlappingLocation,
                ...mapSensorsAndRepeaters
            };
            //console.debug('onMoveRadio().setState(): about to return ', newState);
            return newState;
        });
    }

    private onMoveMapRepeater(clientPoint: Point): void {
        // @ts-ignore TODO: fix this typescript error
        this.setState((prevState: MapAndTrayState) => {
            let dragging: Dragging = cloneDeep(prevState.dragging) as Dragging;
            let lastNotOverlappingLocation = {...this.state.lastNotOverlappingLocation};
            if (dragging.proxyType === ObjectType.MAP_REPEATER) {
                if (dragging.proxyLoc === undefined ||
                    dragging.eltDotid === null || dragging.eltDotid === undefined) {
                    console.error('onMoveMapRepeater(): unexpected undefined proxyLoc');
                    return;
                }
                dragging.proxyLoc = clientPoint;
                dragging.lastLoc = clientPoint;

                const newMapDevice: GUIRepeaterClient = cloneDeep(this.state.mapRepeaters[dragging.eltDotid]);
                newMapDevice.info.position = this.getAdjustedStorableMousePosition(dragging.proxyLoc);
                const overlappingDevices = this.getOverlappingMapDevices(newMapDevice);
                if (Object.keys(overlappingDevices).length === 0) {
                    lastNotOverlappingLocation = newMapDevice.info.position;
                }
            }
            return {
                dragging: dragging,
                lastNotOverlappingLocation: lastNotOverlappingLocation
            };
        });
    }

    private onMoveAp(clientPoint: Point): void {
        this.setState((prevState: MapAndTrayState) => {
            let dragging: Dragging = cloneDeep(prevState.dragging) as Dragging;
            let lastNotOverlappingLocation =
                (this.state.lastNotOverlappingLocation === null ? null : {...this.state.lastNotOverlappingLocation});

            let ap:GUIAPConfigClient = cloneDeep(prevState.ap);
            if (dragging.transformType === TransformType.TRANSLATE) {
                if (dragging.lastLoc === null) {
                    dragging.lastLoc = {x:0, y:0};
                }
                const mouseDiffX = clientPoint.x - dragging.lastLoc.x;
                const mouseDiffY = clientPoint.y - dragging.lastLoc.y;
                const apPosition = ap.info.position;
                apPosition.x += Math.round(mouseDiffX / this.props.scale);
                apPosition.y += Math.round(mouseDiffY / this.props.scale);

                dragging.lastLoc = clientPoint;

                let overlappingDevices = this.getOverlappingMapDevices(ap);
                if (Object.keys(overlappingDevices).length === 0) {
                    lastNotOverlappingLocation = ap.info.position;
                }
                console.log("onMouseMove","setting values: " + apPosition.x, + " " + apPosition.y);
            } else {
                console.error('unexpected transform type: ' + dragging.transformType);
                return null;
            }
            return {
                ap: ap,
                dragging: dragging,
                lastNotOverlappingLocation: lastNotOverlappingLocation
            };
        });
    }

    private onMoveNorthArrowIcon(clientPoint: Point): void {
        this.setState((prevState: MapAndTrayState) => {
            const dragging: Dragging = cloneDeep(prevState.dragging) as Dragging;

            const rotation: number = prevState.northArrowIconRotation;
            let newRotation: number = rotation;
            const position: GUIPoint = {...this.northArrowPosition};
            if (dragging.transformType === TransformType.ROTATE) {

                let xPos = position.x + this.northArrowIconWidth/2;
                let yPos = position.y + this.northArrowIconHeight/2;
                var diffX = xPos - (clientPoint.x - this.mapImageLocationInSvg.x);
                var diffY = yPos - (clientPoint.y - this.mapImageLocationInSvg.y);
                var tan = diffY / diffX;
                var angleDegrees = 90 + Math.atan(tan) * (180 / Math.PI);
                // round to nearest multiple of 5 degrees
                let roundedAngleDegrees: number = MapAndTray.nearest(angleDegrees, 5);
                if (diffY >= 0 && diffX >= 0) {
                    roundedAngleDegrees += 180;
                } else if (diffY < 0 && diffX >= 0) {
                    roundedAngleDegrees -= 180;
                }
                newRotation = MapAndTray.betterModulus(roundedAngleDegrees, 360);
            }

            return {
                northArrowIconRotation: newRotation,
            }
        });
    }

    private onMoveTextField(clientPoint: Point): void {
        this.setState((prevState: MapAndTrayState) => {
            const dragging: Dragging = cloneDeep(prevState.dragging) as Dragging;
            const dotid = dragging.eltDotid;
            if (dotid === null) {
                return null;
            }
            const textFields = {...prevState.textFields};
            const textField = textFields[dotid];

            if (textField !== null && dragging.lastLoc !== null) {
                if (dragging.transformType === TransformType.TRANSLATE) {

                    let mouseDiffX = clientPoint.x - dragging.lastLoc.x;
                    let mouseDiffY = clientPoint.y - dragging.lastLoc.y;
                    if (textField.position === null) {
                        //New textBoxes go to the center
                        textField.position = {
                            x: mouseDiffX,
                            y: mouseDiffY
                        };
                    } else {
                        textField.position = {
                            x: Math.round(textField.position.x + (mouseDiffX/this.props.scale)),
                            y: Math.round(textField.position.y + (mouseDiffY/this.props.scale))
                        };
                    }
                    dragging.lastLoc = clientPoint;

                } else if (dragging.transformType === TransformType.ROTATE) {

                    if (textField.position === null) {
                        //New textBoxes go to the center
                        textField.position = {x: 0, y: 0};
                    }
                    let xPos = this.textFieldStartPosition.x +
                        (this.props.pan.x + textField.position.x)*this.props.scale;
                    let yPos = this.textFieldStartPosition.y +
                        (this.props.pan.y + textField.position.y)*this.props.scale;

                    const diffY = yPos - clientPoint.y;
                    const diffX = xPos - clientPoint.x;
                    const tan = diffY / diffX;
                    let angleDegrees = Math.atan(tan) * (180 / Math.PI);
                    if (diffY <= 0 && diffX <= 0) {
                        angleDegrees += 180;
                    } else if (diffX < 0 && diffY >= 0) {
                        angleDegrees -= 180;
                    }

                    // round to nearest multiple of 5 degrees
                    const roundedAngleDegrees: number = MapAndTray.nearest(angleDegrees, 5);
                    textField.rotationDegrees = MapAndTray.betterModulus(roundedAngleDegrees, 360);

                }
                textFields[dotid] = textField;
            }

            return {
                textFields: textFields,
                dragging: dragging,
            }
        });
    }

    private onMoveCabinetIcon(clientPoint: Point): void {
        this.setState((prevState: MapAndTrayState) => {
            let dragging: Dragging = cloneDeep(prevState.dragging) as Dragging;
            const prevCabinetIconLocation = {...prevState.cabinetIconPosition};

            let cabinetIconLocation: GUIPoint = {x: 0, y: 0};
            if (prevCabinetIconLocation !== null && dragging.lastLoc !== null) {
                if (dragging.transformType === TransformType.TRANSLATE) {
                    const mouseDiffX = clientPoint.x - dragging.lastLoc.x;
                    const mouseDiffY = clientPoint.y - dragging.lastLoc.y;
                    cabinetIconLocation = {
                        x: Math.round(prevCabinetIconLocation.x + (mouseDiffX / this.props.scale)),
                        y: Math.round(prevCabinetIconLocation.y + (mouseDiffY / this.props.scale))
                    };
                    dragging.lastLoc = clientPoint;
                } else {
                    console.error('invalid transformType');
                    return null;
                }
            } else {
                console.error('prev loc or dragging loc is null');
                return null;
            }

            return {
                cabinetIconPosition: cabinetIconLocation,
                dragging: dragging,
            }
        });

    }

    private onMoveModal(clientPoint: Point): void {
        this.setState((prevState: MapAndTrayState) => {
            let dragging: Dragging = cloneDeep(prevState.dragging) as Dragging;
            const prevModalLocation = {...prevState.modalPosition};

            let modalLocation: GUIPoint = {x: 0, y: 0};
            if (prevModalLocation !== null && dragging.lastLoc !== null) {
                if (dragging.transformType === TransformType.TRANSLATE) {
                    const dx:number = clientPoint.x - dragging.lastLoc.x;
                    const dy:number = clientPoint.y - dragging.lastLoc.y;
                    this.updateModalPosition(dragging, dx, dy);
                    modalLocation = {
                        x: Math.round(prevModalLocation.x + (dx / this.props.scale)),
                        y: Math.round(prevModalLocation.y + (dy / this.props.scale))
                    };
                    dragging.lastLoc = {...clientPoint};
                } else {
                    console.error('invalid transformType');
                    return null;
                }
            } else {
                console.error('prev loc or dragging loc is null');
                return null;
            }

            return {
                modalPosition: modalLocation,
                dragging: dragging,
            }
        });
    }

    private updateModalPosition(dragging: Dragging, dx:number, dy:number): void {
        // find the .modal parent of the target
        const parentDiv: HTMLElement | null = (dragging.elt as HTMLDivElement).parentElement;
        if (parentDiv === null) {
            console.error('updateModalPosition(): unexpected null parentDiv');
            return;
        }
        // assert class of parentDiv is modal
        if (! parentDiv.classList.contains('modal')) {
            console.error('updateModalPosition(): parent is not .modal.  parent=', parentDiv);
            return;
        }
        const parentDivX: number = parseInt(window.getComputedStyle(parentDiv).marginLeft);
        const parentDivY: number = parseInt(window.getComputedStyle(parentDiv).marginTop);
        parentDiv.style.marginLeft = (parentDivX + dx) + "px";
        parentDiv.style.marginTop = (parentDivY + dy) + "px";
    }

    /** for a sensor zone's sensors, update their centers and upstream links, in place */
    public updateSensorCentersAndLinks(sensorZones: {[szId: string]: GUISZClient},
                                       szid: string,
                                       mapSensors: {[dotid: string]: GUISensorClient}) {

        for (let sensorIndex = 0; sensorIndex < sensorZones[szid].sensorIds.length; ++sensorIndex) {
            const newMapSensor = this.updateSensorCenterPoint(sensorZones[szid].sensorIds, sensorIndex, mapSensors, sensorZones[szid]);
            MapAndTray.updateLinksOnDevice(newMapSensor, this.props.topStore);
            mapSensors[sensorZones[szid].sensorIds[sensorIndex]] = newMapSensor;
        }
    }

    onToggleLegend(event: React.MouseEvent<Element>) {
        console.log('onToggleLegend');
        const actionGroup: ActionGroup = {
            actions: [{
                objectType: ObjectType.MAP_SETTINGS,
                objectId: 'showLegend',
                newData: {showLegend: ! this.props.topStore.getTopState().mapSettings.showLegend},
                updateType: UpdateType.UPDATE,
            }],
            description: 'enable legend',
        };
        this.props.undoManager.enactActionsToStore(actionGroup, EnactType.USER_ACTION_NOT_UNDOABLE);
    }

    /**
     * TODO: looks like the setState calls are operating directly on prevState.  They should
     *       instead operate on a clone of mapImage.  Also, updateChannelPositionByChannelId should run
     *       *after* setState (by using it as the 2nd param to setState).
     *       I don't understand why zoom out is so much more complex that zoom in.
     */
    private onZoom(event: React.MouseEvent<Element>) {
        const oldScale: number = this.props.scale;
        switch(event.currentTarget.id) {
            case 'mapZoomIn':
                if (oldScale < 2.0) {
                    const newScale = oldScale + 0.1;
                    this.persistZoomLevel(newScale, oldScale);
                    this.starZoom = this.props.scale < 0.6 ? this.starZoom - 15 : 24;
                }
                /*
                this.setState((prevState: MapAndTrayState) => {
                    const oldScale: number = prevState.mapImage.scale;
                    if (oldScale < 2.0) {
                        const newScale = oldScale + 0.1;
                        const oldMapHeight = this.mapHeight * oldScale;
                        const oldMapWidth = this.mapWidth * oldScale;

                        const widthDiff = (this.mapWidth * newScale) - oldMapWidth;
                        const heightDiff = (this.mapHeight * newScale) - oldMapHeight;

                        const newMapImage: MapImageState = {
                            scale: newScale,
                            position: {
                                x: prevState.mapImage.position.x + (widthDiff/2),
                                y: prevState.mapImage.position.y + (heightDiff/2)
                            },
                            prev_position: {
                                x: prevState.mapImage.position.x,
                                y: prevState.mapImage.position.y,
                            }
                        }
                        this.persistZoomLevel(newScale, oldScale);
                        return {mapImage: newMapImage};
                    } else {
                        console.warn('onZoom(): cannot zoom in when scale is ', prevState.mapImage.scale);
                        return null;
                    }

                }, this.updateChannelPositionByChannelId);
                */
                break;
            case 'mapZoomOut':
                if (oldScale >= 0.2) {
                    const newScale = oldScale - 0.1;
                    this.persistZoomLevel(newScale, oldScale);
                    this.starZoom = this.props.scale > 0.7 ? 24 : this.starZoom + 15;
                }

                /*
                this.setState((prevState: MapAndTrayState) => {
                    const oldScale: number = prevState.mapImage.scale;
                    const newScale: number = oldScale - 0.1;
                    const oldMapHeight = this.mapHeight * oldScale;
                    const oldMapWidth = this.mapWidth * oldScale;

                    const widthDiff = oldMapWidth - (this.mapWidth * newScale);
                    const heightDiff = oldMapHeight - (this.mapHeight * newScale);

                    let newPositionX = prevState.mapImage.position.x - (widthDiff/2);
                    let newPositionY = prevState.mapImage.position.y - (heightDiff/2);

                    if (oldScale <= 0.2) {
                        // last positive scale, before becoming negative, is 0.1. Stop doing zoom
                        return null;
                    }
                    else if (oldScale > 1.0) {
                        if (newPositionX < 0) {
                            newPositionX = 0;
                        }
                        else if (((this.mapWidth * newScale) - newPositionX) < this.mapWidth) {
                            newPositionX = (this.mapWidth * newScale) - this.mapWidth;
                        }

                        if (newPositionY < 0) {
                            newPositionY = 0;
                        }
                        else if (((this.mapHeight * newScale) - newPositionY) < this.mapHeight) {
                            newPositionY = (this.mapHeight * newScale) - this.mapHeight;
                        }
                    }
                    else if (oldScale <= 1.0) {
                        if (((this.mapWidth * newScale) - newPositionX) < this.mapWidth) {
                            newPositionX = ((this.mapWidth * newScale) - this.mapWidth)/2;
                        }

                        if (((this.mapHeight * newScale) - newPositionY) < this.mapHeight) {
                            newPositionY = ((this.mapHeight * newScale) - this.mapHeight)/2;
                        }
                    }

                    const newMapImage: MapImageState = {
                        scale: newScale,
                        position: {x: newPositionX, y: newPositionY},
                        prev_position: {x: prevState.mapImage.position.x,
                                        y: prevState.mapImage.position.y},
                    }
                    this.persistZoomLevel(newScale, oldScale);
                    return {mapImage: newMapImage};
                }, this.updateChannelPositionByChannelId);
                */
                break;
            default:
                console.error('unexpected event.currentTarget.id', event.currentTarget.id);
                break;
        }
    }

    /** persist new zoom level in TopStore (undoable) */
    private persistZoomLevel(newScale: number, oldScale: number): void {
        this.props.undoManager.enactActionsToStore({
            actions: [{
                objectType: ObjectType.AP,
                objectId: 'AP',
                newData: {zoomLevel: newScale},
                origData: {zoomLevel: oldScale},
                updateType: UpdateType.UPDATE,
            }],
            description: 'change zoom level',
        }, EnactType.USER_ACTION);
    }

    /** persist new pan offset for map in TopStore (undoable) */
    private persistMapPan(newPan: Point, oldPan: Point): void {
        this.props.undoManager.enactActionsToStore({
            actions: [{
                objectType: ObjectType.AP,
                objectId: 'AP',
                newData: {pan: newPan},
                origData: {pan: oldPan},
                updateType: UpdateType.UPDATE,
            }],
            description: 'change map pan',
        }, EnactType.USER_ACTION);
    }

    private unselectAllDevices() {
        console.log("SetState Called by unselectAllDevices");
        this.setState((prevState: MapAndTrayState) => {
            const clonedMapSensors = cloneDeep(prevState.mapSensors);
            Object.keys(clonedMapSensors).forEach((dotid) => {
                clonedMapSensors[dotid].selected = false;
            });
            const clonedMapRepeaters = cloneDeep(prevState.mapRepeaters);
            Object.keys(clonedMapRepeaters).forEach((dotid) => {
                clonedMapRepeaters[dotid].selected = false;
            });
            const clonedTrayDevices = cloneDeep(prevState.trayDevices);
            Object.keys(prevState.trayDevices).forEach((dotid) => {
                clonedTrayDevices[dotid].selected = false;
            });
            return {
                mapSensors: clonedMapSensors,
                mapRepeaters: clonedMapRepeaters,
                trayDevices: clonedTrayDevices,
            };
        });
    }

    private static rotateDevicePoints(rotationAngle: number, devicePoints: GUIPoint[], deviceCenter: GUIPoint): GUIPoint[] {
        if (rotationAngle > 225.0 && rotationAngle <= 315.0) {
            let tmpTopLeft = devicePoints[0];
            devicePoints[0] = devicePoints[1];
            devicePoints[1] = devicePoints[2];
            devicePoints[2] = devicePoints[3];
            devicePoints[3] = tmpTopLeft;
        }
        else if (rotationAngle > 135.0 && rotationAngle <= 225.0) {
            let tmpTopLeft = devicePoints[0];
            let tmpTopRight = devicePoints[1];
            devicePoints[0] = devicePoints[2];
            devicePoints[1] = devicePoints[3];
            devicePoints[2] = tmpTopLeft;
            devicePoints[3] = tmpTopRight;
        }
        else if (rotationAngle > 45.0 && rotationAngle <= 135.0) {
            let tmpTopLeft = devicePoints[0];
            devicePoints[0] = devicePoints[3];
            devicePoints[3] = devicePoints[2];
            devicePoints[2] = devicePoints[1];
            devicePoints[1] = tmpTopLeft;
        }

        const angleRadians = rotationAngle * (Math.PI/180); // Convert to radians
        for (let index = 0; index < devicePoints.length; ++index) {
            devicePoints[index] = {
                x: Math.cos(angleRadians) * (devicePoints[index].x - deviceCenter.x) -
                   Math.sin(angleRadians) * (devicePoints[index].y - deviceCenter.y) + deviceCenter.x,
                y: Math.sin(angleRadians) * (devicePoints[index].x - deviceCenter.x) +
                   Math.cos(angleRadians) * (devicePoints[index].y - deviceCenter.y) + deviceCenter.y
            }
        }
        return devicePoints;
    }

    /**
     * @returns array of 4 GUIPoints, namely: upper-left, upper-right, lower-right, lower-left
     */
    private static getDevicePoints(center: GUIPoint, width: number , height: number): GUIPoint[] {
        let devicePts: GUIPoint[] = []
        devicePts.push({
            x: center.x - width/2,
            y: center.y - height/2
        });
        devicePts.push({
            x: center.x + width/2,
            y: center.y - height/2
        })
        devicePts.push({
            x: center.x + width/2,
            y: center.y + height/2
        })
        devicePts.push({
            x: center.x - width/2,
            y: center.y + height/2
        })
        return devicePts;
    }

    private static isPointInside(point: GUIPoint, devicePts: GUIPoint[]): boolean {
        let inside = false;
        for (var i = 0, j = devicePts.length - 1; i < devicePts.length; j = i++) {
            var xi = devicePts[i].x;
            var yi = devicePts[i].y;
            var xj = devicePts[j].x;
            var yj = devicePts[j].y;

            var intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }

        return inside;
    };

    /**
     * @returns true if devicePts describes a device that overlaps an existing map device
     *          described by mapDevicePts
     * @param devicePts 4 point array representing bounds of a device
     * @param mapDevicePts 4 point array representing bounds of an existing map device
     */
    private static isOverlappingDevice(devicePts: GUIPoint[], mapDevicePts: GUIPoint[]): boolean {
        let devicePt1 = devicePts[0];
        let devicePt2 = devicePts[2];
        let mapDevicePt1 = mapDevicePts[0];
        let mapDevicePt2 = mapDevicePts[2];
        if (devicePt1.x > mapDevicePt2.x || devicePt2.x < mapDevicePt1.x) {
            return false;
        }
        if (devicePt1.y >  mapDevicePt2.y || devicePt2.y < mapDevicePt1.y) {
            return false;
        }
        return true;
    }

    /**
     * @returns  A hash from deviceId to Device.
     *           Q: But what does that returned hash contain?
     *           A: It contains all devices that overlap with the parameter device
     */
    private getOverlappingMapDevices(device: Mappable): {[id: string]: Mappable} {
        const overlappingDevices: {[id: string]: Mappable} = {};
        let height = 0;
        let width = 0;
        /** an array of 4 points representing the bounds of the device parameter */
        let devicePts: GUIPoint[] = [];
        let deviceCenter: GUIPoint;
        switch (device.otype) {
            case 'GUIRepeater':
            case 'GUIRadio':
            case 'GUIAPConfig':
                height = width = 56;
                deviceCenter = device.info.position;
                break;
            case 'GUISpeed3SensorZone':
                height = this.szHeight;
                width = 110 + 18;
                deviceCenter = {
                    x: device.info.position.x + 9,
                    y: device.info.position.y
                }
                break;
            case "GUISpeed2SensorZone":
                height = this.szHeight;
                width = 84 + 18;
                deviceCenter = {
                    x: device.info.position.x + 9,
                    y: device.info.position.y
                }
                break;
            case "GUIStopbarSensorZone":
            case "GUICountSensorZone":
            case "GUISensor":
                height = this.szHeight;
                width = 70 + 18;
                deviceCenter = {
                    x: device.info.position.x + 9,
                    y: device.info.position.y
                }
                break;
            default:
                return overlappingDevices;
        }

        devicePts = MapAndTray.getDevicePoints(deviceCenter, width, height);
        if (device.info.rotationDegrees !== 0) {
            devicePts = MapAndTray.rotateDevicePoints(device.info.rotationDegrees, devicePts, deviceCenter);
        }

        for (let mapRepeater of Object.values(this.state.mapRepeaters)) {
            if (mapRepeater.id !== device.id) {
                height = width = 56;
                let mapRepeaterPts = MapAndTray.getDevicePoints(mapRepeater.info.position, width, height);
                if (MapAndTray.isOverlappingDevice(devicePts, mapRepeaterPts)) {
                    overlappingDevices[mapRepeater.id] = mapRepeater;
                }
                else if (device.info.rotationDegrees > 0) {
                    let overlapping = false;
                    for (let point of mapRepeaterPts) {
                        if (MapAndTray.isPointInside(point, devicePts)) {
                            overlappingDevices[mapRepeater.id] = mapRepeater;
                            overlapping = true;
                            break;
                        }
                    }
                    if (!overlapping) {
                        for (const point of devicePts) {
                            if (MapAndTray.isPointInside(point, mapRepeaterPts)) {
                                overlappingDevices[mapRepeater.id] = mapRepeater;
                                break;
                            }
                        }
                    }
                }
            }
        }

        for (let radio of Object.values(this.state.radios)) {
            if (radio.id !== device.id) {
                height = width = 56;
                let mapRadioPts = MapAndTray.getDevicePoints(radio.info.position, width, height);

                if (MapAndTray.isOverlappingDevice(devicePts, mapRadioPts)) {
                    overlappingDevices[radio.id] = radio;
                }
                else if (device.info.rotationDegrees > 0) {
                    let overlapping = false;
                    for (let point of mapRadioPts) {
                        if (MapAndTray.isPointInside(point, devicePts)) {
                            overlappingDevices[radio.id] = radio;
                            overlapping = true;
                            break;
                        }
                    }
                    if (! overlapping) {
                        for (let point of devicePts) {
                            if (MapAndTray.isPointInside(point, mapRadioPts)) {
                                overlappingDevices[radio.id] = radio;
                                break;
                            }
                        }
                    }
                }
            }
        }

        for (const mapSZ of Object.values(this.state.sensorZones)) {
            if (mapSZ.id !== device.id) {
                height = this.szHeight;
                switch (mapSZ.sensorIds.length) {
                    case 1:
                        width = 70 + 18;
                        break;
                    case 2:
                        width = 84 + 18;
                        break;
                    case 3:
                        width = 110 +18;
                        break;
                    default:
                        width = 100 + 18;
                        break;
                }

                let mapSZCenter = {
                    x: mapSZ.info.position.x + 9,
                    y: mapSZ.info.position.y
                }

                let mapSZPts = MapAndTray.getDevicePoints(mapSZCenter, width, height);
                if (mapSZ.info.rotationDegrees !== 0) {
                    mapSZPts = MapAndTray.rotateDevicePoints(mapSZ.info.rotationDegrees, mapSZPts, mapSZCenter)
                }

                if (MapAndTray.isOverlappingDevice(devicePts, mapSZPts)) {
                    overlappingDevices[mapSZ.id] = mapSZ;
                }
                else if (device.info.rotationDegrees > 0 || mapSZ.info.rotationDegrees > 0) {
                    let overlapping = false;
                    for (let point of mapSZPts) {
                        if (MapAndTray.isPointInside(point, devicePts)) {
                            overlappingDevices[mapSZ.id] = mapSZ;
                            overlapping = true;
                            break;
                        }
                    }
                    if (!overlapping) {
                        for (let point of devicePts) {
                            if (MapAndTray.isPointInside(point, mapSZPts)) {
                                overlappingDevices[mapSZ.id] = mapSZ;
                                break;
                            }
                        }
                    }
                }
            }
        }

        if (this.state.ap !== null && this.state.ap !== undefined) {
            if (this.state.ap.id !== device.id) {
                height = width = 56;
                let apPts = MapAndTray.getDevicePoints(this.state.ap.info.position, width, height);
                if (MapAndTray.isOverlappingDevice(devicePts, apPts)) {
                    // recursive call
                    overlappingDevices[this.state.ap.id] = this.state.ap;
                }
                else if (device.info.rotationDegrees > 0) {
                    let overlapping = false;
                    for (let point of apPts) {
                        if (MapAndTray.isPointInside(point, devicePts)) {
                            overlappingDevices[this.state.ap.id] = this.state.ap;
                            overlapping = true;
                            break;
                        }
                    }
                    if (! overlapping) {
                        for (let point of devicePts) {
                            if (MapAndTray.isPointInside(point, apPts)) {
                                overlappingDevices[this.state.ap.id] = this.state.ap;
                                break;
                            }
                        }
                    }
                }
            }
        }
        return overlappingDevices;
    }

    /**
     * @param pt Question: Which coordinate system is expected for this argument?
     *           Answer: It seems to be used with the "modified pt".  this.getModifiedPoint(),
     *                   though unclear what that does.
     */
    private isInMap(pt: Point):boolean {
        const mapImagePannedLoc:Point = {
            x: this.mapImageTopLeftCorner.x + this.props.pan.x*this.props.scale,
            y: this.mapImageTopLeftCorner.y + this.props.pan.y*this.props.scale,
        };
        let inMap:boolean = true;
        if (pt.x < mapImagePannedLoc.x ||
            pt.x > (mapImagePannedLoc.x + this.mapImageWidth*this.props.scale) ||
            pt.y < mapImagePannedLoc.y ||
            pt.y > (mapImagePannedLoc.y + this.mapImageHeight*this.props.scale)) {
            inMap = false;
        }
        return inMap;
    }

    /**
     * TODO: fix this to emulate isInMap() changes above.
     *       Interesting that it does not seem to harm anything, even though it is not working right.
     * note: code is based on isInMap() code.
     * @param pt Question: Which coordinate system is expected for this argument?
     *           Answer: It seems to be used with the "modified pt".  this.getModifiedPoint(),
     *                   though unclear what that does.
     */
    private isBelowMap(pt: Point):boolean {
        /* update mapImageLocation position to include possible scaling */
        let mapImageTopLeftCorner = cloneDeep(this.mapImageTopLeftCorner);
        let mapImageHeight = (this.mapImageHeight * this.props.scale);

        if (mapImageTopLeftCorner.x < 0) {
            mapImageTopLeftCorner.x = 0
        }
        if (mapImageTopLeftCorner.y < 0) {
            mapImageTopLeftCorner.y = 0
        }
        if (mapImageHeight > this.mapHeight){
            mapImageHeight = this.mapHeight;
        }

        let belowMap: boolean = false;
        // -2 below is fudge factor that makes it work.  unfortunately
        if (pt.y > (mapImageTopLeftCorner.y + mapImageHeight - 2)) {
            belowMap = true;
        }
        console.debug('isBelowMap(): modifiedPoint=', pt, 'mapImageTopLeftCorner=', mapImageTopLeftCorner, 'mapImageHeight=', mapImageHeight, 'belowMap=', belowMap);
        return belowMap;
    }

    /** TODO: not currently used. could be removed
    private isInElement(pt: Point, element: SVGGElement|null): boolean {
        if (element === null) {
            throw new Error('unexpected null element');
        }
        // TODO: hr: one or the other!!
        const bcr = element.getBoundingClientRect();
        const bbox = element.getBBox();
        let inside = true;
        if (pt.x < bcr.left || pt.x > bcr.right) {
            inside = false;
        }
        if (pt.y < bcr.top || pt.y > bcr.bottom) {
            inside = false;
        }
        console.debug('isInElement(): pt=', {...pt}, 'element=', element, 'bbox=', bbox, 'bcr=', bcr, 'inside=', inside);
        return inside;
    }
    */

    /**
     * TODO: we should have a clear model for the various coordinate systems.
     *       (hr): I am not sure what getModifiedPoint() does, but it may be that its effects are
     *       negligible.  In that case, it should be removed. It may just be chewing up computation
     *       time.
     * @returns "modified" client point, whatever that is...
     */
    private getMousePosition(event: React.MouseEvent<Element>):Point {
        return this.getModifiedPoint({x: event.clientX, y: event.clientY});
    }

    /**
     * TODO: what does this method do exactly?  It seems to modify only the y value.
     */
    private getModifiedPoint(point: Point): Point {
        const svg:HTMLElement|null = document.getElementById("mapCabinetSvg");
        if (svg === null) {
            throw new Error('unexpected null elt for #mapCabinetSvg');
        }
        // @ts-ignore
        const CTM = ((svg as unknown) as SVGElement).getScreenCTM();
        const modifiedPosition = {
            x: Math.round((point.x - CTM.e) / CTM.a),
            y: Math.round((point.y - CTM.f) / CTM.d)
        };
        /*console.log("getModifiedPoint(): point=", point, "modifiedPosition: ", modifiedPosition);*/

        if (this.leftCabinetPresent) {
            modifiedPosition.x = modifiedPosition.x - this.cabinetWidth;
        }
        return modifiedPosition;
    }

    /**
     * Transforms a point, typically stored as part of data object's 'info' member,
     * into a coordinate actually useful for drawing on the current map.
     * (i.e., inside the svg.mapSvg).
     * The transform is very simple: just add in the current mapImage location,
     * which changes with pan/zoom of map.
     */
    private getDrawablelMousePosition(point: Point): Point {
        const usefulPosition = {
            x: point.x + this.mapImageLocationInSvg.x,
            y: point.y + this.mapImageLocationInSvg.y,
        };
        return usefulPosition;
    }

    /**
     * @param mousePoint is typically a clientX, clientY mouse Point from a mouse event
     * @return coordinates suitable for storing in a data object's 'info' member.
     */
    private getStorableMousePosition(mousePoint: Point): Point {
        const modifiedPosition = this.getModifiedPoint(mousePoint);
        const transformedPosition = this.getTransformedMousePosition(modifiedPosition);
        const storablePosition = {
            x: Math.round(transformedPosition.x - this.mapImageLocationInSvg.x),
            y: Math.round(transformedPosition.y - this.mapImageLocationInSvg.y)
        };
        return storablePosition;
    }

    private getAdjustedStorableMousePosition(mousePoint:Point): Point {
        const storablePosition:Point = this.getStorableMousePosition(mousePoint);
        const adjustedPosition:Point = {
            x: storablePosition.x - this.props.pan.x,
            y: storablePosition.y - this.props.pan.y,
        }
        return adjustedPosition;
    }

    /**
     * Just move the group, by changing the data, which has already been done,
     * so just propagate to topLevel as an Action (unless no move has occurred),
     * and also select the dropped radio.
     */
    onDropRadioFromMapToMap(dragging: Dragging): void {
        console.debug('onDropRadioFromMapToMap(): valid drop from map to map');
        console.debug('setState-callback: updating state. eltDatum=', dragging.eltDatum);
        if (dragging.eltDatum === null) {
            return;
        }

        let startDatum: GUIRadioClient = dragging.eltDatum;
        if (dragging.eltStartLoc !== null) {
            startDatum.info.position.x = dragging.eltStartLoc.x;
            startDatum.info.position.y = dragging.eltStartLoc.y;
        }

        if (dragging.eltDotid !== null) {
            const updatedRadio:GUIRadioClient = cloneDeep(this.state.radios[dragging.eltDotid]);

            let overlappingDevices = this.getOverlappingMapDevices(updatedRadio)
            if (Object.keys(overlappingDevices).length > 0) {
                //Check if there is a lastNotOverlappingLocation
                if (this.state.lastNotOverlappingLocation !== null) {
                    updatedRadio.info.position = {...this.state.lastNotOverlappingLocation};
                }
            }

            const newSelection: Selected = {
                selectedDotid: dragging.eltDotid,
                selectedSzId: null,
                selectedDeviceType: ObjectType.RADIO,
                selected: dragging.elt,
                selectedG: dragging.elt,
            };

            if (dragging.transformType === TransformType.TRANSLATE) {
                let actions: Array<Action> = [{
                    updateType: UpdateType.UPDATE,
                    objectType: ObjectType.RADIO,
                    objectId: dragging.eltDotid,
                    origData: TopStore.getInfoOf(startDatum),
                    newData: TopStore.getInfoOf(updatedRadio)
                }, {
                    updateType: UpdateType.UPDATE,
                    objectType: ObjectType.SELECTED,
                    objectId: '',
                    newData: newSelection,
                    origData: this.props.selected,
                }];
                // persist move if there was a move
                if (startDatum.info.position.x !== updatedRadio.info.position.x ||
                    startDatum.info.position.y !== updatedRadio.info.position.y) {

                    actions = actions.concat(this.updateIncumbentRFLinksToRepeater(updatedRadio));

                    this.props.undoManager.enactActionsToStore({
                        actions: actions,
                        description: "move Radio"
                    }, EnactType.USER_ACTION);
                } else {
                    console.debug('onDropRadioFromMapToMap(): no move. doing nothing');
                }
            } else {
                throw new Error('unexpected transformType: ' + dragging.transformType);
            }
        } else {
            throw new Error('unexpected null dragging.eltDotid');
        }
    }

    /** TODO: I think overall setState unneeded
     onDropRepeaterFromMapToMap(dragging: Dragging) {
        // and select the dropped repeater.
        console.debug('onDropRepeaterFromMapToMap(): valid drop from map to map');
        // just move the group, by changing the data,
        // which has already been done, so just propagate to topLevel as a Action

        if (dragging.eltDatum == null) {
            console.error('setState-callback: unexpected null eltDatum');
        }

        const newRepeaters = cloneDeep(this.state.mapRepeaters);
        if (dragging.eltDotid !== null) {
            newRepeaters[dragging.eltDotid].selected = true;
        }

        let startDatum: GUIRepeaterClient = dragging.eltDatum;
        if (dragging.eltStartLoc !== null) {
            startDatum.info.position.x = dragging.eltStartLoc.x;
            startDatum.info.position.y = dragging.eltStartLoc.y;
        }

        if (dragging.eltDotid !== null) {
            const updatedRepeater: GUIRepeaterClient = cloneDeep(this.state.mapRepeaters[dragging.eltDotid]);
            if (dragging.transformType === TransformType.TRANSLATE) {
                const actions: Array<Action> = [{
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.MAP_REPEATER,
                objectId: dragging.eltDotid,
                origData: startDatum,
                    newData: {...updatedRepeater}
                }];
            // persist move if there was a move
            if (startDatum.info.position.x !== updatedRepeater.info.position.x ||
                startDatum.info.position.y !== updatedRepeater.info.position.y) {

                    this.updateAnyLinksForProps(this.state.mapRepeaters[dragging.eltDotid].info.position, actions);
                this.props.undoManager.enactActionsToStore({
                    actions: actions,
                    description: "move Repeater"
                    }, EnactType.USER_ACTION);
                }
            } else {
                throw new Error('unexpected transformType: ' + dragging.transformType);
            }
        }
    }
     */

    /**
     * @return all map sensor dotids for map sensors whose rf link's dstid equals param dotid.
     *         i.e.,
     * @param dotid (the upstream dotid)
     */
    private getAllLinkSensorIds(dotid: String): string[] {
        let sensorIds: string[] = []
        for (let mapSensor of Object.values(this.state.mapSensors)) {
            if (mapSensor.info.rfLink !== null &&
                mapSensor.info.rfLink !== undefined &&
                mapSensor.info.rfLink.dstId === dotid) {

                sensorIds.push(mapSensor.id)
            }
        }
        return sensorIds;
    }

    /**
     * @return all map repeater dotids for map repeaters whose rf link's dstid equals param dotid.
     *         i.e.,
     * @param dotid (the upstream dotdi)
     */
    private getAllLinkRepeaterIds(dotid: String): string[] {
        let repeaterIds: string[] = []
        for (let mapRepeater of Object.values(this.state.mapRepeaters)) {
            if (mapRepeater.info.rfLink !== null &&
                mapRepeater.info.rfLink !== undefined &&
                mapRepeater.info.rfLink.dstId === dotid) {

                repeaterIds.push(mapRepeater.id)
            }
        }
        return repeaterIds;
    }

    private checkEndPointSelected(dstId: string, selectedPoint: GUIPoint): boolean {
        let endPoint = this.ccChannelPositionByChannelId[dstId];
        if (endPoint !== null && endPoint !== undefined) {
            let selectedPointDistance = Math.sqrt(((endPoint.x - selectedPoint.x)*(endPoint.x - selectedPoint.x)) +
                ((endPoint.y - selectedPoint.y)*(endPoint.y - selectedPoint.y)));
            if (selectedPointDistance < 50) {
                return true
            }

        }
        return false;
    }

    /*Finds the correct line segement Id if point is an existing bPoint*/
    private checkDragPoint(linkSegmentIndex: number, lines: Line[], point: GUIPoint): number{
        let bPointLineSegementIndex = -1

        let currentLine = lines[linkSegmentIndex];
        let aPointDistance = Math.sqrt(((currentLine.aPoint.x - point.x)*(currentLine.aPoint.x - point.x)) +
            ((currentLine.aPoint.y - point.y)*(currentLine.aPoint.y - point.y)));
        let bPointDistance = Math.sqrt(((currentLine.bPoint.x - point.x)*(currentLine.bPoint.x - point.x)) +
            ((currentLine.bPoint.y - point.y)*(currentLine.bPoint.y - point.y)));

        if (aPointDistance < bPointDistance) {
            if (aPointDistance < 10 && linkSegmentIndex !== 0) {
                bPointLineSegementIndex = linkSegmentIndex - 1
            }
        }
        else {
            if (bPointDistance < 10) {
                bPointLineSegementIndex = linkSegmentIndex
            }
        }

        return bPointLineSegementIndex;
    }

    /**
     * For every map sensor and map repeater whose rf link dstId matches dstId,
     * update the lines of its rf link so the endpoint is the new bPoint.
     * Typically used when moving a Radio or Repeater
     */
    private updateLinksEndPointForState(dstId: string, bPoint: GUIPoint,
                                        sensorIds: string[] | null | undefined,
                                        repeaterIds: string[] | null | undefined,
                                        prevState: MapAndTrayState): Partial<MapAndTrayState> {
        let mapSensors = cloneDeep(prevState.mapSensors);
        if (sensorIds !== null && sensorIds !== undefined) {
            for (let dotid of sensorIds) {
                if (mapSensors[dotid].info.rfLink !== null &&
                    mapSensors[dotid].info.rfLink !== undefined &&
                    mapSensors[dotid].info.rfLink.dstId === dstId &&
                    mapSensors[dotid].info.rfLink.lines.length > 0) {
                    mapSensors[dotid].info.rfLink.lines[mapSensors[dotid].info.rfLink.lines.length-1].bPoint = bPoint;
                }
            }
        }
        let mapRepeaters = cloneDeep(prevState.mapRepeaters);
        if (repeaterIds !== null && repeaterIds !== undefined) {
            for (let dotid of repeaterIds) {
                if (mapRepeaters[dotid].info.rfLink !== null &&
                    mapRepeaters[dotid].info.rfLink !== undefined &&
                    mapRepeaters[dotid].info.rfLink.dstId === dstId &&
                    mapRepeaters[dotid].info.rfLink.lines.length > 0) {
                    mapRepeaters[dotid].info.rfLink.lines[mapRepeaters[dotid].info.rfLink.lines.length - 1].bPoint = bPoint;
                }
            }
        }
        return {
            mapSensors: mapSensors,
            mapRepeaters: mapRepeaters,
        };
    }


    /**
     * Just move the group, by changing the data,
     * which has already been done, so just propagate to topLevel as an Action
     * and select the dropped radio.
     */
    onDropAPFromMapToMap(dragging: Dragging) {
        console.debug('onDropAPFromMapToMap(): valid drop from map to map');

        this.setState((prevState: MapAndTrayState) => {
            console.debug('setState-callback: updating state. eltDatum=', dragging.eltDatum);
            if (dragging.eltDatum === null) {
                console.error('setState-callback: unexpected null eltDatum');
                return null;
            }
            if (prevState.ap === null) {
                console.error('setState-callback: unexpected null ap');
                return null;
            }

            // the info.position is deeper in the data structure now so a deep clone is required
            let startDatum: GUIAPConfig = dragging.eltDatum;
            if (dragging.eltStartLoc !== null) {
                startDatum.info.position.x = dragging.eltStartLoc.x;
                startDatum.info.position.y = dragging.eltStartLoc.y;
            }

            let updatedAPInfo: MapRenderInfo = cloneDeep(prevState.ap.info);
            let newMapDevice: GUIAPConfig = cloneDeep(prevState.ap);
            let overlappingDevices = this.getOverlappingMapDevices(newMapDevice);
            if (Object.keys(overlappingDevices).length > 0) {
                //Check if there is a lastNotOverlappingLocation
                if (this.state.lastNotOverlappingLocation !== null) {
                    updatedAPInfo.position = {...this.state.lastNotOverlappingLocation};
                }
            }

            const newSelection: Selected = {
                selectedDotid: 'AP',
                selectedSzId: null,
                selectedDeviceType: ObjectType.AP,
                selected: dragging.elt,
                selectedG: dragging.elt,
            };

            if (dragging.transformType === TransformType.TRANSLATE) {
                const xacts: Array<Action> = [{
                    updateType: UpdateType.UPDATE,
                    objectType: ObjectType.AP,
                    objectId: 'AP',
                    newData: {info: updatedAPInfo},
                    origData: {info: startDatum.info},
                }, {
                    updateType: UpdateType.UPDATE,
                    objectType: ObjectType.SELECTED,
                    objectId: '',
                    newData: newSelection,
                    origData: this.props.selected,
                }];
                // persist move if there was a move
                if (MapAndTray.pointsDiffer(startDatum.info.position, updatedAPInfo.position)) {
                    this.props.undoManager.enactActionsToStore({
                        actions: xacts,
                        description: "move AP"
                    }, EnactType.USER_ACTION);
                }
            } else {
                throw new Error('unexpected transformType: ' + dragging.transformType);
            }

            return {
                dragging: MapAndTray.noDragState,
            };
        });

    }

    onBadDropRadioFromMapToOff(dotid: string) {
        // instead, reset map device to starting location
        // to force a re-render upon moving, we need to setState()
        console.debug('onBadDropRadioFromMapToOff(): bad drop from map to elsewhere');
        // @ts-ignore
        this.setState((prevState: MapAndTrayState) => {
            let dragging = cloneDeep(prevState.dragging);
            console.debug('setState-callback: updating prevState. eltDatum=', dragging.eltDatum);
            if (dragging.eltDatum === null) {
                console.error('setState-callback: unexpected null eltDatum');
                return prevState;
            }

            let radios = cloneDeep(prevState.radios);
            let mapSensorsAndRepeaters = {};
            if (dotid !== null && dragging.eltStartLoc !== null) {
                radios[dotid].info.position.x = dragging.eltStartLoc.x;
                radios[dotid].info.position.y = dragging.eltStartLoc.y;

                if (dragging.linkSensorIds !== null && dragging.linkSensorIds !== undefined) {
                    mapSensorsAndRepeaters = this.updateLinksEndPointForState(dotid,
                        radios[dotid].info.position,
                        dragging.linkSensorIds, dragging.linkRepeaterIds, prevState);
                }
            }

            return {
                radios: radios,
                dragging: MapAndTray.noDragState,
                ...mapSensorsAndRepeaters,
            };
        });
    }

    /* unused
    onBadDropRepeaterFromMapToOff(dotid: string) {
        // instead, reset map device to starting location
        // to force a re-render upon moving, we need to setState()
        console.debug('onBadMoveRepeaterFromMapToOff(): bad drop from map to elsewhere');
        this.setState((prevState: MapAndTrayState) => {
            console.debug('setState-callback: updating prevState. eltDatum=', prevState.dragging.eltDatum);
            if (prevState.dragging.eltDatum == null) {
                console.error('setState-callback: unexpected null eltDatum');
                return prevState;
            }

            let repeaters = cloneDeep(prevState.mapRepeaters);
            let mapSensors = cloneDeep(prevState.mapSensors);
            if (dotid !== null && prevState.dragging.eltStartLoc !== null) {
                repeaters[dotid].info.position.x = prevState.dragging.eltStartLoc.x;
                repeaters[dotid].info.position.y = prevState.dragging.eltStartLoc.y;

                if (prevState.dragging.linkSensorIds !== null && prevState.dragging.linkSensorIds !== undefined) {
                    mapSensors = this.updateLinksEndPointForState(dotid, repeaters[dotid].info.position, prevState.dragging.linkSensorIds)
                }
            }

            return {
                mapRepeaters: repeaters,
                mapSensors: mapSensors,
                dragging: MapAndTray.noDragState,
            };
        });
    }
    */

    /**
     * instead, reset map device to starting location
     * to force a re-render upon moving, we need to setState()
     */
    onBadDropAPFromMapToOff(dotid: string) {
        console.debug('onBadMoveAPFromMapToOff(): bad drop from map to elsewhere');
        // @ts-ignore
        this.setState((prevState: MapAndTrayState) => {
            let dragging = cloneDeep(prevState.dragging);
            console.debug('setState-callback: updating prevState. eltDatum=', dragging.eltDatum);
            if (dragging.eltDatum === null) {
                console.error('setState-callback: unexpected null eltDatum');
                return prevState;
            }

            let ap = cloneDeep(prevState.ap);
            if (dragging.eltStartLoc !== null) {
                ap.info.position.x = dragging.eltStartLoc.x;
                ap.info.position.y = dragging.eltStartLoc.y;
            }

            return {
                ap: ap,
                dragging: MapAndTray.noDragState,
            };
        });
    }

    /** includes getTransformedMousePosition() and map pan adjustment */
    private getAdjustedMousePosition(coord:Point): Point {
        const transformedMousePosition:Point = this.getTransformedMousePosition(coord);
        const adjustedMousePosition:Point = {
            x: transformedMousePosition.x - this.props.pan.x,
            y: transformedMousePosition.y - this.props.pan.y,
        }
        return adjustedMousePosition;
    }

    /** This function is needed to convert the given mouse coordinates on the page to the scaled map images
     * First find the center of the current map image within the viewbox
     * Remove the scaling of the center coordinates
     * Determine the offset of the center x,y due to zoom level of the map view
     * Calculate distance between current mouse position and center of scaled map
     * Add distance to current mouse coord
     */
    private getTransformedMousePosition(coord: Point):Point {
         const transformedPosition: Point = {
            x: Math.round(coord.x/this.props.scale),
            y: Math.round(coord.y/this.props.scale),
        }
        return transformedPosition;
    }


    private getSzIdForSensorDotId(sensorDotId: string | null | undefined): string | null {
        const topState:TopStoreState = this.props.topStore.getTopState();
        let szId: string | null;
        if (sensorDotId === null || sensorDotId === undefined) {
            szId = null;
        } else {
            szId = topState.sensorDotidToSzId[sensorDotId];
        }
        return szId;
    }

    private static trayDeviceFieldsDiffer(newTrayDevices: {[dotid: string]: GUISensorClient|GUIRepeaterClient},
                                          prevTrayDevices: {[dotid: string]: GUISensorClient|GUIRepeaterClient}): boolean {
        let dotids: string[] = Object.keys(newTrayDevices);
        for (let dotid of dotids) {
            const newTrayDevice = newTrayDevices[dotid];
            const prevTrayDevice = prevTrayDevices[dotid];
            if (newTrayDevice === undefined || prevTrayDevice === undefined) {
                return true;
            }
            if (newTrayDevice.seen !== prevTrayDevice.seen) {
                return true;
            }
            if (newTrayDevice.unheard !== prevTrayDevice.unheard) {
                return true;
            }
            if (newTrayDevice.otype === 'GUISensor' &&
                prevTrayDevice.otype === 'GUISensor') {

                const newTraySensor = newTrayDevice as GUISensorClient;
                const prevTraySensor = prevTrayDevice as GUISensorClient;
                if (newTraySensor.ccExtension !== prevTraySensor.ccExtension) {
                    return true;
                }
                if (newTraySensor.ccDelay !== prevTraySensor.ccDelay) {
                    return true;
                }
            } else if (newTrayDevice.otype === 'GUIRepeater' &&
                       prevTrayDevice.otype === 'GUIRepeater') {
                const newTrayRepeater = newTrayDevice as GUIRepeaterClient;
                const prevTrayRepeater = prevTrayDevice as GUIRepeaterClient;
                if (newTrayRepeater.desiredDownstreamChannel !== prevTrayRepeater.desiredDownstreamChannel) {
                    return true;
                }
            } else {
                console.error('unexpected newTraryDevices[dotid].otype');
            }
        }
        return false;
    }

    private static traySensorsDetectDiffers(trayDevices1: { [p: string]: Mappable }, trayDevices2: { [p: string]: Mappable }): boolean {
        let retval: boolean = false;
        // Assert # and keys of trayDevices1 and trayDevices2 are same
        let dotids: string[] = Object.keys(trayDevices1);
        for (let dotid of dotids) {
            if (trayDevices1[dotid].otype === 'GUISensor' &&
                trayDevices2[dotid].otype === 'GUISensor' &&
                (trayDevices1[dotid] as GUISensorClient).detect !== (trayDevices2[dotid] as GUISensorClient).detect) {
                retval = true;
                break;
            }
        }
        return retval;
    }

    /**
     * See the preferred answer on stackoverflow:
     * @see https://stackoverflow.com/questions/3120357/get-closest-point-to-a-line
     * @param a point on line segment
     * @param b point on line segment
     * @param p a given point
     * @return the point on line segment ab that is closest to p
     */
    public static getClosestPoint(a: Point, b: Point, p: Point): Point {
        const a_to_p: number[] = [p.x - a.x, p.y - a.y];
        const a_to_b: number[] = [b.x - a.x, b.y - a.y];
        // following is squared magnitude
        const abMagnitude: number = a_to_b[0] * a_to_b[0] +
            a_to_b[1] * a_to_b[1];
        // dot product of a_to_p and a_to_b
        const atp_dot_atb: number = a_to_p[0] * a_to_b[0] +
            a_to_p[1] * a_to_b[1];
        // normalize 'distance' from a to closest point
        const t: number = atp_dot_atb / abMagnitude;
        // add the 'distance' to a, moving toward b
        const result: Point = {
            x: a.x + a_to_b[0] * t,
            y: a.y + a_to_b[1] * t
        };
        console.debug('getClosestPoint(): result =', result);
        return result;
    }

    /**
     * Add the sensorId to newTargetSz.sensorIds in the 'right place' in array.
     * Right place is determined by comparing storableMousePt of mouse drop with
     * coordinates of existing sensors in the newTargetSz.
     *
     * Q: What is default separation between sensors in a sz?
     * A: null (user must provide).
     *
     * @param storableMousePt is the event clientX,Y of mouseUp (drop) event
     */
    private addSensorToSzInOrder(newTargetSz: GUISZClient, sensorId: string, storableMousePt: Point, context: DropContext): void {

        if (context === DropContext.FROM_SAME_SZ) {
            // remove sensorId from newTargetSz.sensorIds,
            // so we reduce to case of adding it again

            // assert: sensorId is already in newTargetSz
            let sensorIndex: number = newTargetSz.sensorIds.indexOf(sensorId);
            if (sensorIndex === -1) {
                throw new Error('unexpected state');
            }
            newTargetSz.sensorIds.splice(sensorIndex, 1);
            if (newTargetSz.spacingsMm.length > 0) {
                newTargetSz.spacingsMm.splice(sensorIndex - 1, 1);
                newTargetSz.lengthCorrectionsMm.splice(sensorIndex - 1, 1);
            }
        }

        const sensor0: GUISensorClient = this.state.mapSensors[newTargetSz.sensorIds[0]];
        switch (newTargetSz.sensorIds.length) {
            case 1: {
                // use x or y coord as a 'close-enough' indicator
                // of ordering of sensors
                const greater: boolean = this.greater(storableMousePt, sensor0.info.position, newTargetSz.info.rotationDegrees);
                console.debug('new sensor "greater" than original?', greater);
                if (greater) {
                    newTargetSz.sensorIds.push(sensorId);
                    newTargetSz.spacingsMm.push('');
                    newTargetSz.lengthCorrectionsMm.push('0');

                } else {
                    newTargetSz.sensorIds.unshift(sensorId);
                    newTargetSz.spacingsMm.unshift('');
                    newTargetSz.lengthCorrectionsMm.unshift('0');
                }
            }
                break;

            case 2: {
                const sensor1: GUISensorClient = this.state.mapSensors[newTargetSz.sensorIds[1]];
                // p is the closest point between existing sensors to storableMousePt
                const p: Point = MapAndTray.getClosestPoint(sensor0.info.position, sensor1.info.position, storableMousePt);
                if (this.greater(p, sensor1.info.position, newTargetSz.info.rotationDegrees)) {
                    newTargetSz.sensorIds.push(sensorId);
                    newTargetSz.spacingsMm.push('');
                    newTargetSz.lengthCorrectionsMm.push('0');
                } else if (! this.greater(p, sensor0.info.position, newTargetSz.info.rotationDegrees)) {
                    newTargetSz.sensorIds.unshift(sensorId);
                    newTargetSz.spacingsMm.unshift('');
                    newTargetSz.lengthCorrectionsMm.unshift('0');
                } else {
                    // insert between sensor0 and sensor1
                    newTargetSz.sensorIds.splice(1, 0, sensorId);
                    /* hr: don't want this because it happens in other cases than you think
                    // divide existing spacing between sensor0 and sensor1 in half
                    const halfSpacing:string =
                        (newTargetSz.spacingsMm[0] === '' ?
                            '' :
                            (+(newTargetSz.spacingsMm[0]) / 2).toFixed(0));

                     */
                    const spacingMm: string = newTargetSz.spacingsMm[0];
                    const lengthCorrection:string = newTargetSz.lengthCorrectionsMm[0];
                    //newTargetSz.spacingsMm.push(halfSpacing);
                    // replace existing spacing
                    //newTargetSz.spacingsMm.splice(0, 1, halfSpacing);
                    newTargetSz.spacingsMm = [spacingMm, spacingMm];
                    newTargetSz.lengthCorrectionsMm = [lengthCorrection, lengthCorrection];
                }
            }
                break;

            default:
                throw new Error('unepected number sensorIds: ' + newTargetSz.sensorIds.length);
        }
        console.debug('addSensorToSzInOrder(): newTarget.sensorIds=', newTargetSz.sensorIds);
    }

    /**
     * This method uses x or y coord comparison as a 'close enough'
     * approximation to compare location of 2 points within a
     * rectangular sensor zone.
     * The choice of x or y comparison depends on the rotationDegrees.
     * @return true if coord > position, -1 otherwise, where > has
     *         complex definition.
     * @param coord
     * @param position
     * @param rotationDegrees measured clockwise from horizontal
     */
    private greater(coord: Point, position: Point, rotationDegrees: number): boolean {
        // we can now assert that rotationDegrees is ALWAYSA in desired range
        if (rotationDegrees < 0 || rotationDegrees > 359) {
            throw new Error('unexpected value for rotationDegrees: ' + rotationDegrees);
        }
        const theta:number = rotationDegrees;
        //console.debug('greater(): coord=', coord, 'position=', position, 'rotationDegrees=', rotationDegrees, 'theta=', theta);
        let result: boolean;
        if ((0 <= theta && theta < 45) ||
            (315 <= theta && theta < 360)) {
            // x-comparison, straight
            result = coord.x > position.x;
        } else if (45 <= theta && theta < 135) {
            // y comparison, reversed
            result = coord.y > position.y;
        } else if (135 <= theta && theta < 225) {
            // x comparison, reversed
            result = coord.x < position.x;
        } else if (225 <= theta && theta < 315) {
            // y-comparison, straight
            result = coord.y < position.y;
        } else {
            throw new Error('unexpected theta: ' + theta);
        }
        //console.debug('greater(): returning: ', result);
        return result;
    }

    /** @returns x%modulus, but avoids negative results */
    public static betterModulus(x: number, modulus: number):number {
        return ((x % modulus) + modulus) % modulus;
    }

    private haventMoved(): boolean {
        const dragging = this.state.dragging;
        return (dragging.proxyStartLoc !== undefined &&
                dragging.proxyLoc !== undefined &&
                dragging.proxyLoc.x === dragging.proxyStartLoc.x &&
                dragging.proxyLoc.y === dragging.proxyStartLoc.y);
    }

    private szHas1Sensor(szId: string) {
        const sz: GUISZClient = this.state.sensorZones[szId];
        return sz.sensorIds.length === 1;
    }

    /**
     * @return e.g. for CC Card channelId "S3-S15-CH_1" returns "S3-S15"
     *         e.g. for APGI channelId "S3-S15-CH_1" return "APGI"
     *         e.g. for channelId "B1-CH_10" returns "SDLC"
     *         e.g. for channelId "ID3-G255-C32" returns "STS"
     *         hmm.  seems there is also channelId "IP1G0C1", for which return "STS"
     */
    public static getCardIdFromChannelId(channelId: string, channelType: ObjectType): string {
        const hyphenIndex = channelId.indexOf("-CH");
        if (hyphenIndex !== -1) {
            const cardId = channelId.substring(0, hyphenIndex);
            if (cardId.startsWith('B')) {
                // it is actually a Bank id, so always return SDLC.
                return 'SDLC';
            }
            if (channelType === ObjectType.APGI_CHANNEL) {
                return 'APGI';
            }
            // assert: channelType === ObjectType.CC_CHANNEL
            if (channelType !== ObjectType.CC_CHANNEL) {
                console.error('unexpected channelType: ', channelType);
            }
            return cardId;
        } else if (channelType === ObjectType.STS_CHANNEL) {
            return 'STS';
        } else {
            throw new Error('cannot get cardId from channelId: ' + channelId);
        }
    }

    private onDropRepeaterFromMapToMap(dragging: Dragging) {
        // move map repeater to be centered at drop location
        if (dragging.eltDotid === null) {
            return;
        }
        const origMapRepeater: GUIRepeaterClient = this.props.mapRepeaters[dragging.eltDotid];
        let newMapRepeater: GUIRepeaterClient = cloneDeep(origMapRepeater);
        // state should have updated location
        let newMapInfo: MapRenderInfo = newMapRepeater.info;

        if (dragging.proxyLoc === undefined) {
            console.error('unexpected undefined proxyLoc');
            return;
        }
        if (dragging.proxyStartLoc === undefined) {
            console.error('unexpected undefined proxyStartLoc');
            return;
        }
        if (dragging.proxyLoc.x === dragging.proxyStartLoc.x &&
            dragging.proxyLoc.y === dragging.proxyStartLoc.y) {
            console.debug('onDropRepeaterFromMapToMap(): no movement. doing nothing');
            return;
        }

        newMapInfo.position = this.getAdjustedStorableMousePosition(dragging.proxyLoc);

        let newMapDevice: GUIRepeaterClient = cloneDeep(this.state.mapRepeaters[dragging.eltDotid]);
        newMapDevice.info.position = newMapInfo.position;
        let overlappingDevices = this.getOverlappingMapDevices(newMapDevice);
        if (Object.keys(overlappingDevices).length > 0) {
            //Check if there is a lastNotOverlappingLocation
            if (this.state.lastNotOverlappingLocation !== null) {
                newMapInfo.position = {...this.state.lastNotOverlappingLocation};
            }
        }
        MapAndTray.updateLinksOnDevice(newMapRepeater, this.props.topStore);

        let actions: Action[] = [{
            updateType: UpdateType.UPDATE,
            objectType: ObjectType.MAP_REPEATER,
            objectId: dragging.eltDotid,
            newData: {info: newMapInfo,},
            origData: {
                info: {...origMapRepeater.info},
            },
        }];
        actions = actions.concat(this.updateIncumbentRFLinksToRepeater(newMapRepeater));

        const newSelection: Selected = {
            selectedDotid: dragging.eltDotid,
            selectedSzId: null,
            selectedDeviceType: ObjectType.MAP_REPEATER,
            selected: dragging.elt,
            selectedG: dragging.elt,
        };
        actions.push({
            updateType: UpdateType.UPDATE,
            objectType: ObjectType.SELECTED,
            objectId: '',
            newData: newSelection,
            origData: this.props.selected,
        });

        this.props.undoManager.enactActionsToStore({
            actions: actions,
            description: "move Repeater on Map",
        }, EnactType.USER_ACTION);
    }

    /**
     * @return the nearest (integer) multiple of v to n
     * @param v is assume to be an integer
     */
    private static nearest(n: number, v: number): number {
        const k: number = n/v;
        const k2: number = Math.round(k) * v;
        return k2;
    }


    private onTrayScroll(): void {
        console.info('onTrayScroll(): start');
        this.setState({
            trayWasScrolled: true,
        });
    }

    private getChannelFromChannelId(channelId:string):GUICCChannel {
        const cardId: string = MapAndTray.getCardIdFromChannelId(channelId, this.getChannelType(channelId));
        const ccChannel: GUICCChannel = this.props.ccCards[cardId].channelsById[channelId];
        return ccChannel;
    }

    /**
     * create cc link from map sensor to channel.
     */
    private onDropSensorOnChannel(dragging: Dragging, coord: Point) {
        if (dragging.target !== null && dragging.eltDotid !== null && dragging.targetType !== null) {
            const channelId:string|undefined = dragging.target.dataset.dotid;
            // Q: need to check channel not disabled?
            // A: no--User is allowed to drop on disabled channel!
            if (channelId !== null && channelId !== undefined) {
                let channelPosition: GUIPoint = this.ccChannelPositionByChannelId[channelId];
                if (channelPosition === null) {
                    channelPosition = coord;
                }
                //const cardId: string = MapAndTray.getCardIdFromChannelId(channelId, this.getChannelType(channelId));
                //const ccChannel: GUICCChannel = this.props.ccCards[cardId].channelsById[channelId];
                const ccChannel:GUICCChannel = this.getChannelFromChannelId(channelId);
                const newCcChannel: GUICCChannel = cloneDeep(ccChannel);
                let mapSensor: GUISensorClient = this.props.mapSensors[dragging.eltDotid];
                let sensorInfo = cloneDeep(mapSensor.info) as MapRenderInfo;
                //Prevent multiple ccLinks from sensor to same channel
                for (let ccLink of sensorInfo.ccLinks) {
                    if (ccLink.dstId === channelId) {
                        sensorInfo.ccLinks.splice(sensorInfo.ccLinks.indexOf(ccLink), 1);
                        console.info('User attempted to drop sensor on channel with existing link from that sensor.  Ignored.');
                    }
                }
                // make sure we are not adding a 16th sensor to channel.
                if (this.getChannelType(channelId) !== ObjectType.STS_CHANNEL &&
                    ccChannel.sensors.length >= MapAndTray.MAX_SENSORS_PER_CHANNEL) {
                    // warn user
                    this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR,
                        "You may not associate Sensor " + dragging.eltDotid + " with channel " + channelId +
                        ". The channel already has the maximum number of sensors associated (" +
                        MapAndTray.MAX_SENSORS_PER_CHANNEL + "). ");
                    // then do nothing!  no connection made
                    return;
                }

                let ccLink: GUICCLink = {
                    type: LinkType.CC,
                    dstId: channelId,
                    location: Location.MAP,
                    lines: [{
                        // for aPoint use mapSensor position
                        aPoint: {...mapSensor.info.position},
                        bPoint: channelPosition,
                    }],
                };
                
                sensorInfo.ccLinks.push(ccLink);
                if(newCcChannel.sensors.includes(dragging.eltDotid)) {
                    this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR,
                        "Sensor " + dragging.eltDotid + " is already connected to channel " + channelId +
                        ".");
                    // then do nothing!  no connection made
                    return;
                } else {
                    newCcChannel.sensors.push(dragging.eltDotid);
                };
                newCcChannel.sensorFailSafe[dragging.eltDotid] = true;
                const actions:Action[] = [{
                    updateType: UpdateType.UPDATE,
                    objectType: ObjectType.MAP_SENSOR,
                    objectId: dragging.eltDotid,
                    origData: TopStore.getInfoOf(mapSensor),
                    newData: {info: sensorInfo},
                }, {
                    updateType: UpdateType.UPDATE,
                    objectType: ObjectType.CC_CHANNEL,
                    objectId: channelId,
                    origData: cloneDeep(ccChannel),
                    newData: {sensors: newCcChannel.sensors,
                              sensorFailSafe: newCcChannel.sensorFailSafe
                    },
                }];
                this.props.undoManager.enactActionsToStore({
                    actions: actions,
                    description: "create CC Link to Channel",
                }, EnactType.USER_ACTION);
            } else {
                console.error('unexpected undefined channelId');
            }
        } else {
            console.error('unexpected null dragging targetType or target or eltDotid');
        }
    }

    private static orderOfSensorsIsSame(sz1: GUISZClient, sz2: GUISZClient): boolean {
        console.debug('orderOfSensorsIsSame(): sensorIds: ', sz1.sensorIds, sz2.sensorIds);
        if (sz1.sensorIds.length === sz2.sensorIds.length) {
            for (let index = 0; index < sz1.sensorIds.length; index++) {
                if (sz1.sensorIds[index] !== sz2.sensorIds[index]) {
                    return false;
                }
            }
            return true;
        } else {
            return false;
        }
    }

    private getMapImageWidthHeight(): WidthHeight {
        let widthHeight: WidthHeight;
        if (this.props.mapImagesManager === null) {
            widthHeight = {width: 1680, height: 1680};
        } else if (this.props.mapImagesManager.isCustomMapSelected() &&
                   this.props.mapImagesManager.customMapExists) {
            widthHeight = {width: 1680, height: 1680}
        } else {
            const mapDatum: MapDatum|null|undefined = this.props.mapImagesManager.getCurrentMapDatum();
            if (mapDatum !== null && mapDatum !== undefined) {
                widthHeight = {
                    width: mapDatum.width,
                    height: mapDatum.height,
                };
            } else {
                widthHeight = {width: 1680, height: 1680};
            }
        }
        return widthHeight;
    }

    /**
     * TODO: does this re-render as soon as there is a change?
     *       If not, use getDerivedStateFromProps()
     */
    private renderModalDialogStack(): ReactNode {
        return <React.Fragment>
            {
                this.props.topStore.getTopState().modalStack.map((modalDialog: ModalInfo, index) =>
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
                        onMouseDown={this.onMouseDown}
                        onMouseMove={this.onMouseMove}
                        onMouseUp={this.onMouseUp}
                        topStore={this.props.topStore}
                    />
                )
            }
        </React.Fragment>
    }

}
