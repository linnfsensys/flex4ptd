import React, {ReactNode} from "react";
import './MapSensorZoneG.css';
import MapSensorG from './MapSensorG';
import {
    ErrorKey,
    GlobalErrorKey,
    GUISensorClient,
    GUISZClient,
    ObjectType,
    TransformType
} from "../AptdClientTypes";
import {GUIPoint} from "../AptdServerTypes";
import TopStore from "../TopStore";
import { Hilight, HelpLocType } from "../help/HelpEngine";

interface MapSensorZoneGProps {
    key: string,
    szid: string,
    mapImageLocation: GUIPoint,
    sensorZoneDatum: GUISZClient,
    mapSensors: {[sensorId: string]: GUISensorClient} | undefined,
    selected: boolean,
    szWidth: number,
    szHeight: number,
    topStore: TopStore,
    helpHiLights: Hilight[],
    starZoom: number,
    onMouseDown: (event: React.MouseEvent<SVGGElement>)=>void,
    onMouseEnter: (event: React.MouseEvent<SVGGElement>)=>void,
    onMouseLeave: (event: React.MouseEvent<SVGGElement>)=>void,
    onClick: (event: React.MouseEvent<SVGGElement>)=>void
}

interface MapSensorZoneGState {

}

class MapSensorZoneG extends React.Component<MapSensorZoneGProps, MapSensorZoneGState> {

    render() {
        const datum = this.props.sensorZoneDatum;
        const szid = this.props.szid;
        let gOutterClass = 'szG draggable'
        let gSzRect = 'szRectG draggable'
        let sensorZoneRect = 'szRect'
        let gSzRotate = 'szRotateG draggable'
        let rotateIcon = 'rotateIcon'
        let rotateIconConnecton = 'rotateIconConnecton'
        const clearFillStyle = { fill: "#FFFFFF" };

        let rotationDegrees = 0;
        if (datum.info.rotationDegrees !== undefined && datum.info.rotationDegrees !== null) {
          rotationDegrees = datum.info.rotationDegrees
        }

        let szWidth = this.props.szWidth;
        const szHeight = this.props.szHeight;

        let sensorXs:number[] = [35];
        if (this.props.mapSensors !== undefined) {
            switch (Object.keys(this.props.mapSensors).length) {
                case 1:
                    sensorXs = [35];
                    szWidth = 70;
                    break;
                case 2:
                    sensorXs = [25, 55];
                    szWidth = 84;
                    break;
                case 3:
                    sensorXs = [20, 50, 80];
                    szWidth = 110;
                    break;
                default:
                    console.error('unexpected number of sensors: ' + this.props.mapSensors);
                    szWidth = 70;
                    break;
            }
        }

        // We set up the transform so that the datum.info.position is at the center
        // of the MapSensorZoneG rect
        let transformData = "translate(" +
            ((datum.info.position.x + this.props.mapImageLocation.x) - szWidth/2) + ", " +
            ((datum.info.position.y + this.props.mapImageLocation.y) - szHeight/2) + ")";
        if (rotationDegrees !== 0) {
            transformData += " translate( " + szWidth/2 + ", " + szHeight/2 + ") " +
                "rotate(" + (rotationDegrees) + ") " +
                "translate( " + -szWidth/2 + ", " + -szHeight/2 + ")";
        }

        const transform = transformData;

        let highlightedSensor = "";
        for (let hiLight of this.props.helpHiLights) {
            if (hiLight.location.locObjectType === ObjectType.MAP_SENSOR &&
                hiLight.location.locObjectId !== undefined) {
                highlightedSensor = hiLight.location.locObjectId
            }
        }
        let helpHiLights = this.helpHiLights(szWidth)

        if (this.props.selected || helpHiLights !== null) {
            gOutterClass += ' selected';
            gSzRect += ' selected';
            sensorZoneRect += ' selected';
            gSzRotate += ' selected';
            rotateIcon += ' selected';
            rotateIconConnecton += ' selected';
            //console.log("RENDER transformData ", transformData);
        }

        return (

            <g className={gOutterClass}
                transform={transform}
                onClick={this.props.onClick}
                data-dotid={szid}
                data-devicetype={'szG'}
            >
                {helpHiLights}
                <g className={gSzRect}
                    onMouseDown={this.props.onMouseDown}
                    onMouseEnter={this.props.onMouseEnter}
                    onMouseLeave={this.props.onMouseLeave}
                    data-dotid={szid}
                    data-devicetype={ObjectType.SENSOR_ZONE}
                >
                    <rect className={sensorZoneRect} height={this.props.szHeight} width={szWidth}/>
                    {/* directional arrow */}
                    <text x={szWidth-8} y={15} className='arrow'>&rarr;</text>
                    {this.renderValidationErrorMark(szWidth)}
                    <g className="sensorsInSZ">
                    {
                        (this.props.mapSensors !== undefined ?
                            // iterate through the mapSensors in the data,
                            // creating a svg g (group) for each one
                            this.props.sensorZoneDatum.sensorIds.map((dotid: string, sensorIndex:number) => (
                                this.props.mapSensors !== undefined && this.props.mapSensors[dotid] !== undefined ?
                                    <MapSensorG
                                        key={dotid}
                                        datum={this.props.mapSensors[dotid]}
                                        dotid={this.props.mapSensors[dotid].id}
                                        diameter={this.props.szHeight}
                                        rotationDegrees={rotationDegrees}
                                        selected={this.props.selected}
                                        helpGesturePresent={dotid === highlightedSensor}
                                        x={sensorXs[sensorIndex]}
                                        topStore={this.props.topStore}
                                        onMouseDown={this.props.onMouseDown}
                                        onClick={this.props.onClick}
                                        starZoom={this.props.starZoom}
                                    /> : null
                            )) : null
                        )
                    }
                    </g>
                </g>

                {/* the rotate handle: a line (implemented as rect) and a circle */}
                <g className={gSzRotate}
                    onMouseDown={this.props.onMouseDown}
                    data-dotid={szid}
                    data-devicetype={'szRotateG'}
                >
                    <rect className={rotateIconConnecton} x={szWidth} y={this.props.szHeight/2} height="1" width="15"/>
                    <circle cx={szWidth + 15} cy={this.props.szHeight/2} r="5" className={rotateIcon}
                        style={clearFillStyle}
                    />
                </g>
            </g>
        );
    }

    /**
     * ValidationError mark is currently a red star.
     * May want to use a separate mark such as yellow triangle
     * to differentiate from RF link error.
     * @param radius of the circle on the Map
     */
    renderValidationErrorMark(szWidth: number): ReactNode {
        let validationMark: ReactNode = null;
        if (this.hasValidationErrors()) {
            validationMark =
                <text x={szWidth  - 8}
                      y={10}
                      className='validationError'
                >*</text>
        }
        return validationMark;
    }

    /** TODO: this could be in a base class */
    private hasValidationErrors(): boolean {
        for (let validationKey of Object.keys(this.props.topStore.getTopState().validationErrors)) {
            let errorKey: ErrorKey = TopStore.parseValidationErrorsKey(validationKey);
            if (errorKey.objectType === ObjectType.SENSOR_ZONE && errorKey.objectId === this.props.szid) {
                return true;
            }
        }
        for (let validationKey of Object.keys(this.props.topStore.getTopState().validationGlobalErrors)) {
            let errorKey: GlobalErrorKey = TopStore.parseValidationGlobalErrorsKey(validationKey);
            if (errorKey.objectType === ObjectType.SENSOR_ZONE && errorKey.objectId === this.props.szid) {
                return true;
            }
        }
        return false;
    }

    helpHiLights(szWidth: number): ReactNode {
        let pulseAnimation: ReactNode = null;

        for (let hiLight of this.props.helpHiLights) {
            if (hiLight.location.helpLocType === HelpLocType.MAP_OBJECT) {
                switch(hiLight.location.locObjectType) {
                    case ObjectType.SENSOR_ZONE:
                        if (hiLight.location.locObjectId !== undefined && hiLight.location.locObjectId === this.props.sensorZoneDatum.id) {
                            switch (hiLight.transformType) {
                                case TransformType.TRANSLATE:
                                    pulseAnimation =
                                    <g>
                                        <rect className={'rotationHelpGesture'}/>
                                        <rect className={'rotationHelpGestureInner'}/>
                                    </g>
                                    break;
                                case TransformType.ROTATE:
                                    pulseAnimation =
                                    <g>
                                        <circle className={'rotationHelpGesture'} cx={szWidth + 15} cy={this.props.szHeight/2}/>
                                        <circle className={'rotationHelpGestureInner'} cx={szWidth + 15} cy={this.props.szHeight/2}/>
                                    </g>
                                    break;
                                default:
                                    break;
                            }
                        }
                        break;
                    default:
                        break;
                }
            }
        }
        return pulseAnimation;
    }

    /*
    componentDidUpdate() {
        if (this.props.sensorZoneDatum.selected) {
            console.log('MapSensorZoneG.componentDidUpdate()');
        }
    }
    componentDidMount() {

        if (this.props.sensorZoneDatum.selected) {
            console.log('MapSensorZoneG.componentDidMount()');
        }
    }
    */
}

export default MapSensorZoneG;
