import TopStore from "./TopStore";
import {ObjectType, UpdateType} from "./AptdClientTypes";

export enum ImageType {
    /** Full size */ F = 'F',
    /** Compact   */ C = 'C',
    /** Icon      */ I = 'I',
}

export interface MapDatum {
    /** the filename. usually relative to /etc/apeg/aptd/webdocs/images/maps */
    image: string,
    /** a not-yet-localized version of user-facing file label. stored in GUIAPConfig and on server as ap.mapImage */
    label: string,
    width: number,
    height: number,
    ordinal: number,
    imageType: ImageType,
}

/**
 * Currently, the custom Map is index 17.
 * User is allowed to insert arbitrary new maps (properly named) in /etc/apeg/aptd/webdocs/images/maps .
 * The server puts the names of all map files in that directory in GUIAPConfig.mapFiles.
 */
export default class MapImagesManager {

    public readonly totalNumberOfPreloadedMaps: number = 0;
    public readonly customMapIndex: number = -1;
    public readonly customMapLabel: string = "Click twice to change custom map";
    public static readonly customMapPath: string = "/downloadMapBackground.html";
    public readonly defaultInitialMapIndex: number = 0;

    public readonly mapData: (MapDatum | null)[];
    public customMapExists: boolean;
    /** following must match the 0th MapDatum label */
    public readonly defaultLabel: string = '2x2-lanes';
    private topStore: TopStore;

    constructor(mapFileNames: string[], currentMapLabel: string, topStore: TopStore) {
        console.info('MapImagesManager constructor. mapFileNames=', mapFileNames);
        this.customMapExists = false;
        this.topStore = topStore;
        let nonCustomFileNames: string[] =
            mapFileNames.filter((mapFileName: string) => (mapFileName !== 'userMapBackgroundImage.png'));
        if (mapFileNames.length !== nonCustomFileNames.length) {
            this.customMapExists = true;
        }
        this.mapData = nonCustomFileNames.sort().map(this.parseMapDataFromFileNames);
        // squeeze out null values
        this.mapData = this.mapData.filter((mapDatum: MapDatum|null) => (mapDatum !== null));
        this.customMapIndex = this.findCustomMapIndex();
        if (this.customMapExists) {
            this.mapData[this.customMapIndex]!.image = MapImagesManager.customMapPath + '?r=' + Date.now();
        }
        this.totalNumberOfPreloadedMaps = this.mapData.length;

        // Note: mapImageIndex state is officially kept only in TopStore.ap,
        //       so changes are undoable.
        const mapImageIndex: number = this.getMapIndexByLabel(currentMapLabel);
        console.debug('MapImagesManager constructor: mapImageIndex=', mapImageIndex);


        topStore.enact({
            description: 'update AP with mapImageIndex',
            actions: [{
                objectId: 'AP',
                updateType: UpdateType.UPDATE,
                objectType: ObjectType.AP,
                newData: {mapImageIndex: mapImageIndex},
                origData: null,
            }],
        });

        console.debug('MapImagesManager.constructor(): at end.', this);
    }

    /**
     *  Note: the source of truth for this method is in TopStore.state.ap.mapImageIndex.
     *  If that value is not available, the default value is 0
     */
    public getCurrentMapIndex(): number {
        let mapIndex: number = 0;
        if (this.topStore.getTopState().ap !== null) {
            mapIndex = this.topStore.getTopState().ap!.mapImageIndex;
        }
        return mapIndex;
    }

    public getCurrentMapDatum(): MapDatum | null | undefined {
        const mapDatum: MapDatum | null = this.mapData[this.getCurrentMapIndex()];
        return mapDatum;
    }

    /**
     * Returns the URL of the current map image
     */
    public getCurrentMapUrl(): string {
        if (this.isCustomMapSelected() && this.customMapExists) {
            return this.mapData[this.customMapIndex]!.image;
        } else {
            const mapDatum: MapDatum | null | undefined = this.getCurrentMapDatum();
            if (mapDatum !== null && mapDatum !== undefined) {
                return `${process.env.REACT_APP_API_BASE_URL}/images/maps/${mapDatum.image}`;
            } else {
                return '';
            }
        }
    }

    public isCustomMapSelected(): boolean {
        const customSelected: boolean =
            this.topStore.getTopState().ap !== null &&
            this.customMapIndex === this.topStore.getTopState().ap!.mapImageIndex;
        return customSelected;
    }

    /**
     * @param fileName has a typical value like: 020-1680x1737.41-F-2x3_lanes.svg
     *        i.e., ordinal-widthxheight-imageType-label.svg
     *        or 'userMapBackgroundImage.png' for user-uploaded custom file image
     */
    private parseMapDataFromFileNames(fileName: string): MapDatum|null {
        const fileNameRegexp: RegExp = /^(\d\d\d)-([\d.]+)x([\d.]+)-(\w)-([\w-]+).(\w+)/;
        const matches: RegExpExecArray|null = fileNameRegexp.exec(fileName);
        if (matches !== null) {
            const ordinal: number = +matches[1];
            const width: number = +matches[2];
            const height: number = +matches[3];
            const imageType: ImageType = matches[4] as ImageType;
            const label: string = matches[5];
            const mapDatum: MapDatum = {
                image: fileName,
                ordinal: ordinal,
                width: width,
                height: height,
                imageType: imageType,
                label: label,
            };
            // console.debug('mapDatum=', mapDatum);
            return mapDatum;
        } else {
            console.error('cannot parse fileName: ', fileName);
            return null;
        }
    }

    private findCustomMapIndex(): number {
        for (let index=0; index < this.mapData.length; index++) {
            const mapDatum = this.mapData[index];
            if (mapDatum !== null && mapDatum.label.includes('Custom')) {
                return index;
            }
        }
        return -1;
    }


    /**
     * @param displayName is label.  label is localized and then shown in UI chooser such as "2x3 Lanes"
     */
    private getMapIndexByLabel(displayName: string): number {
        let index = 0;
        for (let mapDatum of this.mapData) {
            if (mapDatum !== null && mapDatum.label === displayName) {
                return index;
            }
            index++;
        }
        if (displayName === this.customMapLabel || displayName === 'Custom-map') {
            return this.customMapIndex;
        }
        return this.defaultInitialMapIndex;
    }

}