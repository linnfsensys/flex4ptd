import React from "react";
import cloneDeep from 'lodash/cloneDeep';
import './MapChooserField.css';
import {
    Action,
    ActionGroup,
    ClientObjectUpdateType,
    EnactType, GUISensorClient,
    HttpMethod,
    ModalType,
    ObjectType,
    UpdateType
} from "../AptdClientTypes";
import UndoManager from "../UndoManager";
import HttpManager from "../HttpManager";
import TopStore from "../TopStore";
import MapImagesManager, {ImageType, MapDatum} from "../MapImagesManager";
import {GUIAPConfig, GUIPoint, MapRenderInfo} from "../AptdServerTypes";


interface MapChooserFieldProps {
    rowSize: number,
    forceScroll: boolean,
    undoManager: UndoManager,
    httpManager: HttpManager,
    topStore: TopStore,
    mapImagesManager: MapImagesManager | null,
}
interface MapChooserFieldState {
    scrolled: boolean,
}

export class MapChooserField
    extends React.Component<MapChooserFieldProps, MapChooserFieldState> {

    private readonly fileInputRef: React.RefObject<HTMLInputElement>;
    private readonly selectedMapElementRef: React.RefObject<HTMLTableDataCellElement>;
    /** should be same as MapImagesManager.customMapPath */
    private readonly CUSTOM_IMG_URL: string = '/downloadMapBackground.html'; 
    private readonly ROW_SIZE: number;

    constructor(props: MapChooserFieldProps) {
        super(props);

        this.fileInputRef = React.createRef();
        this.selectedMapElementRef = React.createRef();
        this.ROW_SIZE = props.rowSize;

        this.state = {
            scrolled: false,
        };

        this.onMapLabelClick = this.onMapLabelClick.bind(this);
        this.onMapImageClick = this.onMapImageClick.bind(this);
        this.onFilePickedChange = this.onFilePickedChange.bind(this);
        this.onIconClick = this.onIconClick.bind(this);
        this.onScroll = this.onScroll.bind(this);
        this.showFileDialog = this.showFileDialog.bind(this);
        this.onMapBackgroundLoaded = this.onMapBackgroundLoaded.bind(this);
        this.loadCustomMapBackground = this.loadCustomMapBackground.bind(this);
        this.mapStateModified = this.mapStateModified.bind(this);
        this.scrollToSelected = this.scrollToSelected.bind(this);
    }


    componentDidMount() {
        this.scrollToSelected();
    }
    componentDidUpdate() {
        this.scrollToSelected();
    }
    private scrollToSelected() {
        if (this.selectedMapElementRef.current !== undefined &&
            this.selectedMapElementRef.current !== null) {

            if (this.state.scrolled === false) {
                console.debug('MapChooserField.scrollToSelected(): scrolled is false');
                console.debug('MapChooserField.scrollToSelected(): about to scrollIntoView');
                console.debug('MapChooserField.scrollToSelected(): this.selectedMapElementRef.current=', this.selectedMapElementRef.current);
                this.selectedMapElementRef.current.scrollIntoView({behavior: 'auto', block: 'end'});
                this.setState({scrolled: true});
            } else if (this.props.forceScroll === true) {
                console.debug('MapChooserField.scrollToSelected(): forceScroll is true');
                console.debug('MapChooserField.scrollToSelected(): about to scrollIntoView');
                console.debug('MapChooserField.scrollToSelected(): this.selectedMapElementRef.current=', this.selectedMapElementRef.current);
                this.selectedMapElementRef.current.scrollIntoView({behavior: 'auto', block: 'end'});
                // Q: when does this.props.forceScroll get set to false?
                // A: in TimeZoneUnitsMapDisplay.getDerivedStateFromProps()
            }
        }
    }

    onMapImageClick(event: React.MouseEvent<HTMLOrSVGElement>):void {
        const currentTarget: Element = (event.currentTarget as any) as Element;
        if (currentTarget.id !== null && currentTarget.id !== undefined) {
            this.onIconClick(Number(currentTarget.id));
        }
    }

    onMapLabelClick(event: React.MouseEvent<HTMLOrSVGElement>):void {
        const currentTarget: HTMLDivElement = (event.currentTarget as any) as HTMLDivElement;
        this.onIconClick(+currentTarget.parentElement!.id);
    }

    private onIconClick(mapImageIndex: number):void {
        if (this.props.mapImagesManager === null) {
            console.error('null mapImagesManager');
            return;
        }
        if (mapImageIndex === this.props.mapImagesManager.getCurrentMapIndex() &&
            mapImageIndex !== this.props.mapImagesManager.customMapIndex) {
            // already selected.  do nothing
            console.debug('map image #', mapImageIndex, ' is already selected. doing nothing');
            return;
        }
        if (mapImageIndex !== null && mapImageIndex !== undefined) {
            if (mapImageIndex === this.props.mapImagesManager.customMapIndex) {
                // user has clicked on the "new map" index.
                // This index may correspond to either the actual "new map"
                // or a custom map; so see what map is actually at the index
                if (this.props.mapImagesManager.customMapExists) {
                    // user has clicked on an actual custom image.
                    // If it's already selected, then offer upload.
                    // If user is just now selecting this, then just update the selection
                    if (this.props.mapImagesManager.getCurrentMapIndex() === mapImageIndex) {
                        this.showFileDialog();
                        return;
                    } else {
                        // otherwise, user is selecting the custom map, so display it
                        this.selectMapImage(mapImageIndex, this.props.undoManager);
                    }
                } else {
                    // In this case, clicked-on image must be "new map", so offer upload
                    this.showFileDialog();
                    return;
                }
            } else {
                this.selectMapImage(mapImageIndex, this.props.undoManager);
            }
        }
    }

    onScroll() {
        this.setState({scrolled: true});
    }

    /*
    private setNewMapSelection(mapImageIndex:number, prevMapImageIndex: number) {
        if (mapImageIndex === -1) {
            mapImageIndex = 0;
        }
        if (prevMapImageIndex === -1) {
            prevMapImageIndex = 0;
        }

            const newValue = {
                mapImageIndex: mapImageIndex,
            };
            const origValue = {
                mapImageIndex: prevMapImageIndex,
            };

            // need to set the top state in the callback param, so
            // it is done AFTER the asynchronous setState completes!
            const actions: Array<Action> = [{
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.AP,
                objectId: 'AP',
                newData: newValue,
                origData: origValue
            }];
            let enactType: EnactType = EnactType.USER_ACTION;
            this.props.undoManager.enactActionsToStore({
                actions: actions,
                description: "map image change"
            }, enactType);
    }
    */

    /**
     * on change of the file input element, i.e. user chose a file.
     * We are only expecting a single file upload.
     */
    onFilePickedChange(ev: React.ChangeEvent<HTMLInputElement>):void {
        if (ev !== null && ev.target !== null && ev.target.files !==null) {
            console.log('onFilePickedChane(): files=', ev.target.files);
            const MAX_UPLOAD_MAP_FILE_SIZE_BYTES: number =
                ((this.props.topStore.getTopState().ap !== null) ?
                    this.props.topStore.getTopState().ap!.maxMapBackgroundImageSize * 1024 :
                    512 * 1024);

            // Verify that the suffix of the user-chosen file is on the accepted suffix list.
            // Note: we do this because we cannot assume browser/OS will enforce it.
            const firstFile: File = ev.target.files[0];
            const match:RegExpMatchArray|null = firstFile.name.match(/(\.[0-9a-zA-Z]+)$/);
            if (match === null) {
                console.error('unexpected null suffix match for file');
                return;
            }
            const suffix:string = match[1].toLowerCase();
            const IMAGE_SUFFIXES = ['.jpeg', '.jpg', '.png'];
            if (IMAGE_SUFFIXES.includes(suffix)) {
                console.debug('suffix ', suffix, ' is among acceptSuffixes');
            } else {
                console.error('suffix ', suffix, ' is not among acceptSuffixes');
                this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR,
                    'File upload must be among the following types: ' + IMAGE_SUFFIXES);
                return;
            }

            if (ev.target.files[0].size > MAX_UPLOAD_MAP_FILE_SIZE_BYTES) {
                this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR,
                    'Max file size for custom map upload is ' +
                    MAX_UPLOAD_MAP_FILE_SIZE_BYTES/1024 + 'KB');
            } else {
                console.debug("file chosen for upload is " + ev.target.files[0].name);
                this.doFileUpload(ev.target.files[0]);
            }
        }
    }

    /**
     * TODO: would be better to use ObjectType.UPLOAD_IN_PROGRESS and remove ObjectType.CLIENT.
     */
    doFileUpload(file: File) {
        const actionGroup: ActionGroup = {
            actions: [{
                objectId: ClientObjectUpdateType.LOADING,
                objectType: ObjectType.CLIENT,
                newData: true,
                updateType: UpdateType.UPDATE
            }],
            description: "update show loading cursor"
        };
        this.props.topStore.enact(actionGroup);
        
        this.props.httpManager.fileUpload(file, "imageFile", HttpMethod.POST, "uploadMapBackground.html", this.onMapBackgroundLoaded);
    }

    showFileDialog() {
        if (this.fileInputRef.current !== null) {
            this.fileInputRef.current.click();
        } else {
            console.error('this.fileInputRef.current is null. Cannot show file dialog');
        }
    }

    /**
     * called as callback for fileUpload. After file is uploaded, need to get it from server
     */
    onMapBackgroundLoaded(xhr: XMLHttpRequest): string|undefined {
        const response: number = xhr.status;
        const actionGroup: ActionGroup = {
            actions: [{
                objectId: ClientObjectUpdateType.LOADING,
                objectType: ObjectType.CLIENT,
                newData: false,
                updateType: UpdateType.UPDATE
            }],
            description: "update show loading cursor"
        };
        this.props.topStore.enact(actionGroup);

        if (response === 200) {
            this.loadCustomMapBackground(true);
            this.props.topStore.dismissAllModals();
            return undefined;
        } else {
            console.error('onMapBackgroundLoaded: response invalid: ', response);
            this.props.topStore.dismissAllModals();
            this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'An error occurred on upload');
            return 'ERROR';
        }
    }

    private mapStateModified() {
        this.selectMapImage(this.props.mapImagesManager!.customMapIndex, this.props.undoManager);
    }

    private loadCustomMapBackground(useCallback:boolean) {
        const mapImagesManager: MapImagesManager|null = this.props.mapImagesManager;
        if (mapImagesManager !== null) {
            // this will force a non-cached image
            mapImagesManager.mapData[mapImagesManager.customMapIndex]!.image = this.CUSTOM_IMG_URL + '?r=' + Date.now();
            mapImagesManager.customMapExists = true;
        }

        if (useCallback) {
            this.mapStateModified();
        }
    }

    /**
     * This is a place to localize label.
     * For now, just change - _ to blanks.
     */
    private localizeLabel(label: string): string {
        if (label === 'Custom-map') {
            if (! this.props.mapImagesManager!.customMapExists) {
                return '+ \n Upload Custom Map';
            } else {
                return 'Click twice to change Custom Map';
            }
        }
        return label.replace(/[-_]/g, ' ');
    }

    private defaultPositionForMapImage(deviceType: ObjectType, deviceCurrentPos: GUIPoint,
                                       deviceIndex: number, newMapImageDatum: MapDatum): GUIPoint {
        let defaultPosition: GUIPoint = {x: 0, y: 0};
        const mapImagesManager: MapImagesManager|null = this.props.mapImagesManager;
        if (mapImagesManager === null) {
            return defaultPosition;
        }
        let currentMapDatum = mapImagesManager.getCurrentMapDatum();
        if (currentMapDatum === null || currentMapDatum === undefined) {
            return defaultPosition;
        }
        switch (newMapImageDatum.imageType) {
            case ImageType.F:
                let defaultApPosFullSizeMap = {x: 655, y: 677};
                if (currentMapDatum.imageType === ImageType.F) {
                    //From one full size image to another, shift AP & Radios based on ratio of prev map image dimensions and new map image dimensions 
                    //This resolves the issue for map image 11X12 where radios and the AP we off the screen
                    defaultApPosFullSizeMap = {
                        x: Math.round(newMapImageDatum.width/(currentMapDatum.width/deviceCurrentPos.x)),
                        y: Math.round(newMapImageDatum.height/(currentMapDatum.height/deviceCurrentPos.y))
                    };
                }
                else {
                    //From a Compact or Custom map image, calculate where AP and Radios should be based on dimensions of selected image and default Full Size image at index 0
                    let defaultMapImage = mapImagesManager.mapData[0]
                    if (defaultMapImage !== null) {
                        if (deviceType === ObjectType.AP) {
                            defaultApPosFullSizeMap = {
                                x: Math.round(newMapImageDatum.width/(defaultMapImage.width/655)),
                                y: Math.round(newMapImageDatum.height/(defaultMapImage.height/677))
                            }
                        }
                        else if (deviceType === ObjectType.RADIO) {
                            defaultApPosFullSizeMap = {
                                x: Math.round(newMapImageDatum.width/(defaultMapImage.width/(580 + 94 * deviceIndex))),
                                y: Math.round(newMapImageDatum.height/(defaultMapImage.height/(650 - 51 * deviceIndex)))
                            }
                        }
                    }
                }
                if (deviceType === ObjectType.AP) {
                    defaultPosition = defaultApPosFullSizeMap;
                }
                else if (deviceType === ObjectType.RADIO) {
                    defaultPosition = {
                        x: defaultApPosFullSizeMap.x + (94 * deviceIndex),
                        y: defaultApPosFullSizeMap.y - (51 * deviceIndex)
                    };
                }
                break;

            case ImageType.C:
                if (deviceType === ObjectType.AP) {
                    defaultPosition = {x: 120, y: 270};
                }
                else if (deviceType === ObjectType.RADIO) {
                    defaultPosition = {
                        x: 120, y: 350 + 65 * deviceIndex
                    };
                }
                break;

            case ImageType.I:
                //Custom map image has same dimensions as default full size map image
                if (deviceType === ObjectType.AP) {
                    defaultPosition = {x: 655, y: 677};
                }
                else if (deviceType === ObjectType.RADIO) {
                    defaultPosition = {
                        x: 580 + 94 * deviceIndex, y: 650 - 51 * deviceIndex
                    };
                }
                break;
        }
        return defaultPosition;
    }

    /** @returns a new position for a map object, given original position and a new MapImage */
    private getNewMapObjectPosition(currentPos: GUIPoint, newMapImageDatum: MapDatum): GUIPoint {
        const mapImagesManager: MapImagesManager|null = this.props.mapImagesManager;
        if (mapImagesManager === null) {
            return currentPos;
        }
        let currentMapDatum = mapImagesManager.getCurrentMapDatum();
        if (currentMapDatum === null || currentMapDatum === undefined) {
            return currentPos;
        }

        // In MapAndTray we use mapImageLocationInRelationToSvg to place devices on map image
        // We need to account for the difference in dimensions so devices do not move when image is changed
        let widthDiff = newMapImageDatum.width/2 - currentMapDatum.width/2;
        let heightDiff = newMapImageDatum.height/2 - currentMapDatum.height/2;
        if (newMapImageDatum.imageType === ImageType.I) {
            widthDiff = 1680/2 - currentMapDatum.width/2;
            heightDiff = 1680/2 - currentMapDatum.height/2;
        } else if (currentMapDatum.imageType === ImageType.I) {
            widthDiff = newMapImageDatum.width/2 - 1680/2;
            heightDiff = newMapImageDatum.height/2 - 1680/2;
        }
        const adjustedPoint:GUIPoint = {
            x: Math.round(currentPos.x + widthDiff),
            y: Math.round(currentPos.y + heightDiff)
        };
        return adjustedPoint;
    }

    /**
     * Revise device positions and links upon change of map background selection.
     * @returns an Array of Actions that will modify all devices on Map so
     *          their info.position will be consistent with selected map background
     */
    private makeActionsForDeviceUpdates(mapImageIndex: number): Array<Action> {
        let actions: Array<Action> = [];
        const prevMapImageIndex: number = this.props.mapImagesManager!.getCurrentMapIndex();
        const prevMapImageDatum: MapDatum|null|undefined =
            this.props.mapImagesManager!.getCurrentMapDatum();
        const selectedMapImageDatum: MapDatum|null|undefined =
            this.props.mapImagesManager!.mapData[mapImageIndex]
        const ap: GUIAPConfig = cloneDeep(this.props.topStore.getTopState().ap);
        const currentCabinetIconPosition =
            this.props.topStore.getTopState().mapSettings.cabinetIconPosition;

        if (ap !== null && ! ap.initialized &&
            prevMapImageDatum !== null && selectedMapImageDatum !== null) {
            // set initial (default) position for AP and Radios
            // TODO: I don't see this actually being called
            actions = this.makeActionsForDeviceInitialization(ap, selectedMapImageDatum, actions,
                mapImageIndex, prevMapImageIndex);

        } else if (prevMapImageDatum !== null && prevMapImageDatum !== undefined &&
                 selectedMapImageDatum !== null && selectedMapImageDatum !== undefined &&
                 (prevMapImageDatum.height !== selectedMapImageDatum.height ||
                 prevMapImageDatum.width !== selectedMapImageDatum.width)) {
            // update position and links of devices when map background dimensions change.
            // It appears this is the main case that actually happens.
            actions = this.makeActionsForDeviceMods(selectedMapImageDatum, currentCabinetIconPosition,
                actions, mapImageIndex, prevMapImageIndex);

        } else {
            // case: no apparent change of size of background map, so no need for device updates.
            actions.push({
                objectId: 'AP',
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.AP,
                newData: {
                    mapImageIndex: mapImageIndex,
                    mapImage: this.props.mapImagesManager!.mapData[mapImageIndex]!.label,
                },
                origData: {
                    mapImageIndex: prevMapImageIndex,
                    mapImage: this.props.mapImagesManager!.mapData[prevMapImageIndex]!.label,
                },
            });
        }

        return actions;
    }

    /**
     * TODO: unclear to me if this code is ever used.  If not, throw it out.
     */
    private makeActionsForDeviceInitialization(ap: GUIAPConfig, selectedMapImageDatum: MapDatum,
                                               actions: Array<Action>, mapImageIndex: number,
                                               prevMapImageIndex: number): Array<Action> {
        const newApPosition: GUIPoint = this.defaultPositionForMapImage(ObjectType.AP,
            ap.info.position, 0, selectedMapImageDatum);
        const origAPInfo: MapRenderInfo = cloneDeep(ap.info);
        const newAPInfo: MapRenderInfo = cloneDeep(ap.info);
        newAPInfo.position = newApPosition;

        actions.push({
            objectId: 'AP',
            updateType: UpdateType.UPDATE,
            objectType: ObjectType.AP,
            newData: {
                mapImageIndex: mapImageIndex,
                mapImage: this.props.mapImagesManager!.mapData[mapImageIndex]!.label,
                info: newAPInfo,
            },
            origData: {
                mapImageIndex: prevMapImageIndex,
                mapImage: this.props.mapImagesManager!.mapData[prevMapImageIndex]!.label,
                info: origAPInfo,
            },
        });

        if (Object.keys(this.props.topStore.getTopState().radios).length > 0) {
            let radio_index = 0;
            for (let radio of Object.values(this.props.topStore.getTopState().radios)) {
                const radioPosition: GUIPoint =
                    this.defaultPositionForMapImage(ObjectType.RADIO, radio.info.position,
                        radio_index, selectedMapImageDatum);
                const origRadioInfo: MapRenderInfo = cloneDeep(radio.info);
                const newRadioInfo: MapRenderInfo = cloneDeep(radio.info);
                newRadioInfo.position = radioPosition;
                ++radio_index;

                actions.push({
                    updateType: UpdateType.UPDATE,
                    objectType: ObjectType.RADIO,
                    objectId: radio.id,
                    origData: {info: origRadioInfo},
                    newData: {info: newRadioInfo},
                });
            }
        }
        return actions;
    }

    /**
     * @returns an Array of Actions to update Map objects' (and links') positions
     *          when a Map Image is changed
     */
    private makeActionsForDeviceMods(selectedMapImageDatum: MapDatum,
                                     currentCabinetIconPosition: GUIPoint, actions: Array<Action>,
                                     mapImageIndex: number, prevMapImageIndex: number): Array<Action> {
        const ap: GUIAPConfig = cloneDeep(this.props.topStore.getTopState().ap);
        const adjustedApPosition: GUIPoint =
            this.getNewMapObjectPosition(ap.info.position, selectedMapImageDatum);
        const adjustedCabinetIconPosition: GUIPoint =
            this.getNewMapObjectPosition(currentCabinetIconPosition, selectedMapImageDatum);
        const origAPInfo: MapRenderInfo = cloneDeep(ap.info);
        const newAPInfo: MapRenderInfo = cloneDeep(ap.info);
        newAPInfo.position = adjustedApPosition;

        actions.push({
            objectId: 'AP',
            updateType: UpdateType.UPDATE,
            objectType: ObjectType.AP,
            newData: {
                mapImageIndex: mapImageIndex,
                mapImage: this.props.mapImagesManager!.mapData[mapImageIndex]!.label,
                info: newAPInfo,
                cabinetIconLocation: adjustedCabinetIconPosition,
            },
            origData: {
                mapImageIndex: prevMapImageIndex,
                mapImage: this.props.mapImagesManager!.mapData[prevMapImageIndex]!.label,
                info: origAPInfo,
                cabinetIconLocation: {...currentCabinetIconPosition},
            },
        }, {
            objectType: ObjectType.MAP_SETTINGS,
            objectId: '',
            updateType: UpdateType.UPDATE,
            newData: {
                cabinetIconPosition: adjustedCabinetIconPosition,
            },
            origData: {
                cabinetIconPosition: {...currentCabinetIconPosition},
            }
        });

        for (const radio of Object.values(this.props.topStore.getTopState().radios)) {
            const adjustedRadioPosition = this.getNewMapObjectPosition(radio.info.position, selectedMapImageDatum);
            const origRadioInfo = cloneDeep(radio.info);
            const newRadioInfo = cloneDeep(radio.info);
            newRadioInfo.position = adjustedRadioPosition;

            actions.push({
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.RADIO,
                objectId: radio.id,
                origData: {info: origRadioInfo},
                newData: {info: newRadioInfo},
            });
        }

        // now, update all rfLinks from Repeaters to Radio or Repeater as destination.
        // TODO: there is already code to do this in WebSocketManager or AptdApp.
        this.addActionsToUpdateRepeaterLinks(selectedMapImageDatum, actions);

        // update all rfLinks from sensors in SZs to radio or repeater destination and to cc channels
        this.addActionsToUpdateSensorLinks(selectedMapImageDatum, actions);

        return actions;
    }

    /**
     *  update all rfLinks from sensors in SZs to radio or repeater destination and to cc channels.
     *  TODO: there is already code to do this in WebSocketManager or AptdApp.
     */
    private addActionsToUpdateSensorLinks(selectedMapImageDatum: MapDatum, actions: Array<Action>) {
        for (let sensorZone of Object.values(this.props.topStore.getTopState().sensorZones)) {
            let adjustedSzPosition = this.getNewMapObjectPosition(sensorZone.info.position, selectedMapImageDatum);
            let origSzInfo = cloneDeep(sensorZone.info);
            let newSzInfo = cloneDeep(sensorZone.info);
            newSzInfo.position = adjustedSzPosition;

            for (const mapSensorId of sensorZone.sensorIds) {
                const mapSensor: GUISensorClient =
                    this.props.topStore.getTopState().mapSensors[mapSensorId];
                const adjustedMapSensorPosition: GUIPoint =
                    this.getNewMapObjectPosition(mapSensor.info.position, selectedMapImageDatum);
                const origMapSensorInfo: MapRenderInfo = cloneDeep(mapSensor.info);
                const newMapSensorInfo: MapRenderInfo = cloneDeep(mapSensor.info);
                newMapSensorInfo.position = adjustedMapSensorPosition;

                if (newMapSensorInfo.rfLink !== null && newMapSensorInfo.rfLink !== undefined &&
                    newMapSensorInfo.rfLink.lines.length > 0) {

                    for (const line of newMapSensorInfo.rfLink.lines) {
                        line.aPoint = this.getNewMapObjectPosition(line.aPoint, selectedMapImageDatum);
                        line.bPoint = this.getNewMapObjectPosition(line.bPoint, selectedMapImageDatum);
                    }
                }

                for (const ccLink of newMapSensorInfo.ccLinks) {
                    for (const line of ccLink.lines) {
                        line.aPoint = this.getNewMapObjectPosition(line.aPoint, selectedMapImageDatum);
                        line.bPoint = this.getNewMapObjectPosition(line.bPoint, selectedMapImageDatum);
                    }
                }

                actions.push({
                    updateType: UpdateType.UPDATE,
                    objectType: ObjectType.MAP_SENSOR,
                    objectId: mapSensor.id,
                    origData: {info: origMapSensorInfo},
                    newData: {info: newMapSensorInfo},
                });
            }

            actions.push({
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.SENSOR_ZONE,
                objectId: sensorZone.id,
                origData: {info: origSzInfo},
                newData: {info: newSzInfo},
            });
        }
    }

    /**
     *  Update all rfLinks from Repeaters to Radio or Repeater as destination.
     *  TODO: there is already code to do this in WebSocketManager or AptdApp.
     */
    private addActionsToUpdateRepeaterLinks(selectedMapImageDatum: MapDatum, actions: Array<Action>) {
        for (const mapRepeater of Object.values(this.props.topStore.getTopState().mapRepeaters)) {
            const adjustedRepeaterPosition =
                this.getNewMapObjectPosition(mapRepeater.info.position, selectedMapImageDatum);
            const origRepeaterInfo = cloneDeep(mapRepeater.info);
            const newRepeaterInfo = cloneDeep(mapRepeater.info);
            newRepeaterInfo.position = adjustedRepeaterPosition;

            if (newRepeaterInfo.rfLink !== null && newRepeaterInfo.rfLink !== undefined &&
                newRepeaterInfo.rfLink.lines.length > 0) {

                for (const line of newRepeaterInfo.rfLink.lines) {
                    line.aPoint = this.getNewMapObjectPosition(line.aPoint, selectedMapImageDatum);
                    line.bPoint = this.getNewMapObjectPosition(line.bPoint, selectedMapImageDatum);
                }
            }

            actions.push({
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.MAP_REPEATER,
                objectId: mapRepeater.id,
                origData: {info: origRepeaterInfo},
                newData: {info: newRepeaterInfo},
            });
        }
    }

    private selectMapImage(selectedImageIndex: number, undoManager: UndoManager): void {
        const mapImageIndex: number = selectedImageIndex;
        const actions: Array<Action> = this.makeActionsForDeviceUpdates(mapImageIndex);
            
        undoManager.enactActionsToStore({
            description: 'change map background',
            actions: actions,
        }, EnactType.USER_ACTION);
    }

    render() {
        const rows = [];
        let mapData: (MapDatum|null)[];
        if (this.props.mapImagesManager !== null) {
            mapData = this.props.mapImagesManager.mapData;
        } else {
            mapData = [];
        }
        //console.debug('MapChooserField.render(): mapData=', mapData);

        if (mapData !== null && mapData !== undefined) {
            let rowIndex: number;
            let colIndex: number;
            let cellsInRow = [];
            for (let imageIndex = 0; imageIndex < mapData.length; imageIndex++) {
                const mapDatum = mapData[imageIndex];
                rowIndex = imageIndex / this.ROW_SIZE;
                colIndex = imageIndex % this.ROW_SIZE;

                if (mapDatum === null) {
                    console.error('null mapDatum', mapDatum);
                }

                let imageClassName: string;
                switch (mapDatum!.imageType) {
                    case ImageType.F:
                        imageClassName = 'mapImage full';
                        break;
                    case ImageType.I:
                        imageClassName = 'mapImage icon';
                        break;
                    case ImageType.C:
                        imageClassName = 'mapImage compact';
                        break;
                    default:
                        console.error('invalid imageType', mapDatum!.imageType);
                        imageClassName = 'mapImage';
                }
                let overlayPresent = false;
                let cropImageClassName: string = 'crop';
                const rowColKey: string = "R" + rowIndex + "C" + colIndex;
                let tdRef: React.RefObject<HTMLTableDataCellElement>|null = null;
                if (this.props.mapImagesManager !== null) {
                    if (this.props.mapImagesManager.getCurrentMapIndex() === imageIndex) {
                        imageClassName += " selected";
                        cropImageClassName += " selected";
                        tdRef = this.selectedMapElementRef;
                    }
                    if (this.props.mapImagesManager.customMapIndex === imageIndex) {
                        overlayPresent = true;
                    }
                }
            
                let imageSrc: string;
                if (this.props.mapImagesManager !== null &&
                    imageIndex !== this.props.mapImagesManager!.customMapIndex) {
                    imageSrc = `http://192.168.3.226/images/maps/${mapDatum!.image}`;
                } else if (this.props.mapImagesManager !== null &&
                           ! this.props.mapImagesManager.customMapExists) {
                    // imageIndex is that of custom map, but none is defined yet
                    imageSrc = "";    //no image, just show label
                } else {
                    // imageIndex is that of custom map, but one is defined
                    // Q: should this be assigned to mapDatum?
                    // A: no because elsewhere is determined if a refresh is needed via a '?r=date'
                    // mapDatum!.image = this.CUSTOM_IMG_URL;
                    imageSrc = mapDatum!.image;
                }

                cellsInRow.push(
                    <td className="container" id={imageIndex.toString()}
                        key={rowColKey}
                        ref={tdRef}>
                        <div className={cropImageClassName} id={imageIndex.toString()} key={rowColKey}>
                            {imageSrc !== "" && 
                            <img className={imageClassName}
                                 key={imageIndex.toString()} id={imageIndex.toString()}
                                 src={imageSrc} onClick={this.onMapImageClick}
                                 alt={'map'}>
                            </img>
                            }
                            {overlayPresent && <div className="overlay"></div>}
                            <div className="centered mapLabel"
                                 onClick={this.onMapLabelClick}
                                 key={rowColKey}>
                                 <div className="mapLabelText">
                                     {mapDatum === null ? '': this.localizeLabel(mapDatum.label)}
                                 </div>
                            </div>
                        </div>
                    </td>
                );

                if (colIndex === this.ROW_SIZE - 1 || imageIndex === mapData.length - 1) {
                    rows.push(<tr key={rowIndex} id={"row" + rowIndex}>{cellsInRow}</tr>);
                    cellsInRow = [];
                }
            }
        }

        return (
            <div>
                <div id="mapFileInputDiv" className="invisible">
                    <input id="fileInput" type="file"
                           ref={this.fileInputRef}
                           accept={".jpg,.jpeg,.png"}
                           onChange={this.onFilePickedChange}
                    />
                </div>
                <table className="mapBgSelectionTable" onScroll={this.onScroll}>
                    <tbody className="test">
                        {rows}
                    </tbody>
                </table>
            </div>
        );

    }
}

export default MapChooserField;
