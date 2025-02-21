import React, {ReactNode} from "react";
import './MapRepeaterG.css';
import {
    ErrorKey,
    GlobalErrorKey,
    GUIRadioClient,
    GUIRepeaterClient, GUISensorClient,
    ObjectType
} from "../AptdClientTypes";
import {ConfigChangeStatus, GUIPoint} from "../AptdServerTypes";
import TopStore from "../TopStore";
import RssiWifiIcon from "../widgets/RssiWifiIcon";
import {MapDeviceUtils} from "./MapDeviceUtils";

const RepeaterIcon:any = require('../assets/icons/SensysSkinMapRepeater.png');

interface MapRepeaterGProps {
    key: string,
    id: string,
    mapImageLocation: GUIPoint,
    datum: GUIRepeaterClient,
    topStore: TopStore,
    starZoom: number,
    selected: boolean,
    onMouseDown: (event: React.MouseEvent<SVGGElement>)=>void,
    onMouseEnter: (event: React.MouseEvent<SVGGElement>)=>void,
    onMouseLeave: (event: React.MouseEvent<SVGGElement>)=>void,
    onClick: (event: React.MouseEvent<SVGGElement>)=>void
}
interface MapRepeaterGState {

}

const WarningIcon:any = require('../assets/icons/icons8-warning-96.png');

export class MapRepeaterG extends React.Component<MapRepeaterGProps, MapRepeaterGState> {

    constructor(props: MapRepeaterGProps) {
        super(props);
        this.hasValidationErrors = this.hasValidationErrors.bind(this);
        this.renderDeficiencyMark = this.renderDeficiencyMark.bind(this);
        this.renderUnheardWarningMark = this.renderUnheardWarningMark.bind(this);
    }

    render() {
        const datum = this.props.datum;
        const dotid = datum.id;
        let gClassNames = "repeaterGOuter repeaterG draggable dotid-" + dotid;
        let rectClassNames = 'repeater';
        const repeaterWidth = 56;
        const repeaterHeight = 56;

        const percentComplete:number = ((this.props.datum.percentComplete !== undefined) ?
            this.props.datum.percentComplete : 0);

        // We set up the transform so that the datum.info.position is at the center
        // of the MapRepeaterG rect
        let transformData = "translate(" +
            (datum.info.position.x - repeaterWidth/2 + this.props.mapImageLocation.x) +
            ", " +
            (datum.info.position.y - repeaterHeight/2 + this.props.mapImageLocation.y) +
            ")";

        if (this.props.selected) {
            rectClassNames += ' selected';
            gClassNames += ' selected';
        }
        const transform = transformData;
        const deficiencyMark: ReactNode = this.renderDeficiencyMark(repeaterWidth-6);
        const unheardMark: ReactNode = this.renderUnheardWarningMark(repeaterWidth-14, repeaterHeight-19);

        return (
            <g className={gClassNames}
               transform={transform}
               onMouseDown={this.props.onMouseDown}
               onMouseEnter={this.props.onMouseEnter}
               onMouseLeave={this.props.onMouseLeave}
               onClick={this.props.onClick}
               data-dotid={datum.id}
               data-devicetype={ObjectType.MAP_REPEATER}
            >
                <rect className={rectClassNames}
                      height={repeaterHeight} width={repeaterWidth} />
                <image //x={'5'} y={'5'}
                    width={repeaterWidth} height={repeaterHeight}
                    xlinkHref={RepeaterIcon} className={'repeater'}/>
                {unheardMark}
                {deficiencyMark}
                <g className='image'>
                    <RssiWifiIcon deviceRssi={this.props.datum.rssi}
                                  unseen={this.props.datum.unheard || ! this.props.datum.seen}
                                  inSvg={true}
                                  width={10} height={10}
                                  topStore={this.props.topStore}/>
                </g>
                {MapDeviceUtils.renderConfigChangeAnimationForMap(repeaterWidth/2, repeaterHeight,
                    this.props.datum)}
                {MapDeviceUtils.renderFirmwareProgress(datum, repeaterWidth/2, repeaterHeight/4.5, percentComplete)}
                <text x="30" y="15" >
                    Repeater {datum.id}
                </text>
            </g>
        );
    }

    /**
     * Deficiency mark is currently a red asterisk.
     * It is currently implemented only for missing RF Link,
     * and any errors in the Info Panel.
     * @param xOffset of the center of square behind the icon on the Map
     */
    private renderDeficiencyMark(xOffset: number): ReactNode {
        let deficiencyMark: ReactNode = null;
        if (this.hasValidationErrors()) {
            deficiencyMark =
                <text x={xOffset}
                      y={30}
                      className='deficient'
                      style={{fontSize: `${this.props.starZoom}px`}}
                >*</text>
        }
        return deficiencyMark;
    }


    /** TODO: method is duplicated in MapSensorG */
    private hasValidationErrors(): boolean {
        for (const validationKey of Object.keys(this.props.topStore.getTopState().validationErrors)) {
            const errorKey: ErrorKey = TopStore.parseValidationErrorsKey(validationKey);
            if (errorKey.objectType === ObjectType.MAP_REPEATER && errorKey.objectId === this.props.id) {
                return true;
            }
        }
        for (const validationKey of Object.keys(this.props.topStore.getTopState().validationGlobalErrors)) {
            const errorKey: GlobalErrorKey = TopStore.parseValidationGlobalErrorsKey(validationKey);
            if (errorKey.objectType === ObjectType.MAP_REPEATER && errorKey.objectId === this.props.id) {
                return true;
            }
        }
        return false;
    }


    /**
     * Unheard warning mark is currently a yellow triangle with !.
     * When GUIRepeaterClient is unheard or not seen or BAD battery level,
     * present warning next to Repeater icon
     */
    private renderUnheardWarningMark(xOffset: number, yOffset: number): ReactNode {
        let unheardMark: ReactNode = null;
        if (this.props.datum.unheard || ! this.props.datum.seen ||
            (this.props.topStore.getTopState().ap !== null &&
             this.props.datum.voltage !== -1 &&
             this.props.datum.voltage < this.props.topStore.getTopState().ap!.repeaterLowBatteryThreshold)
        ) {
            unheardMark =
                <image id='unheard'
                       x={xOffset}
                       y={yOffset}
                       width='15'
                       height='15'
                       xlinkHref={WarningIcon}
                />
        }
        return unheardMark;
    }

}

export default MapRepeaterG;
