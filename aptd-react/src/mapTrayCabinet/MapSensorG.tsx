import React, {ReactNode} from "react";
import './MapSensorG.css';
import {ErrorKey, GlobalErrorKey, GUISensorClient, ObjectType} from "../AptdClientTypes";
import TopStore from "../TopStore";
import {ConfigChangeStatus} from "../AptdServerTypes";
import RssiWifiIcon from "../widgets/RssiWifiIcon";
import {MapDeviceUtils} from "./MapDeviceUtils";

interface MapSensorGProps {
    key: string,
    datum: GUISensorClient,
    dotid: string,
    rotationDegrees: number,
    selected: boolean,
    helpGesturePresent?: boolean,
    diameter: number,
    x: number,
    topStore: TopStore,
    starZoom: number,
    onMouseDown: (event: React.MouseEvent<SVGGElement>)=>void,
    onClick: (event: React.MouseEvent<SVGGElement>)=>void
}
interface MapSensorGState {
}

const WarningIcon:any = require('../assets/icons/icons8-warning-96.png');

/**
 * Represents a Sensor g element (and its subtree) on the Map.
 * A Sensor g element is *always* inside a MapSensorZoneG.
 * The locations of Sensors in a Sensor Zone are determined by the
 * numberr of Sensors in the SZ, not by the stored locations of the Sensors.
 */
class MapSensorG extends React.Component<MapSensorGProps, MapSensorGState> {
    private sensorCircle: React.RefObject<any>;

    constructor(props: MapSensorGProps) {
        super(props);
        this.sensorCircle = React.createRef();
    }

    render() {
        let gClassNames = "mapSensorG draggable ";
        let circleClassNames = 'sensor';

        let textRotation = 360 - this.props.rotationDegrees;
        const radius = this.props.diameter/2;
        const textRotate = "translate(" + this.props.x + ", " + radius + ") rotate(" + (textRotation) + ")";

        let percentComplete = 0;
        if (this.props.datum.percentComplete !== undefined) {
            percentComplete = this.props.datum.percentComplete;
        }

        const translate = "translate(" + this.props.x + ", " + radius + ")";
        const rotate = " rotate(" + (textRotation) + ")";
        const warningMarkTransform = translate + rotate + "translate(" + (radius-6) + ",0)"
        const errorMarkTransform = translate + rotate + " translate(" + radius + ", -" + (radius - 10) + ")";
        const rssiMarkTransform = translate + rotate + " translate(-" + (radius+5) + ", -" + (radius+2) + ")";

        if (this.props.selected) {
            circleClassNames += ' selected';
            gClassNames += ' selected';
        }
        if (this.props.datum.detect) {
            gClassNames += ' detecting';
            circleClassNames += ' detecting';
        }

        return (
            <g className={gClassNames}
               onMouseDown={this.props.onMouseDown}
               onClick={this.props.onClick}
               data-dotid={this.props.dotid}
               data-devicetype={ObjectType.MAP_SENSOR}
            >
                {this.renderHelpGestureCircle(radius)}

                <circle cx={this.props.x} cy={radius}
                        r={radius}
                        className={circleClassNames}
                        ref={this.sensorCircle}
                />

                <g className='image'
                   transform={errorMarkTransform}
                >
                    {this.renderValidationErrorMark(radius)}
                </g>

                {this.renderConfigChangeAnimationForMap(this.props.x, radius)}
                {MapDeviceUtils.renderFirmwareProgress(this.props.datum, this.props.x, radius, percentComplete)}
                <g className='image'
                   transform={warningMarkTransform}
                >
                    {this.renderUnheardWarningMark()}
                </g>

                <g className='image'
                   transform={rssiMarkTransform}
                >
                    <RssiWifiIcon deviceRssi={this.props.datum.rssi}
                                  unseen={this.props.datum.unheard || ! this.props.datum.seen}
                                  inSvg={true}
                                  width={10} height={10}
                                  topStore={this.props.topStore}/>
                </g>


                <g className='text'
                   transform={textRotate}
                >
                    <text className='dotidText'>
                        {this.props.dotid}
                    </text>
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
    renderValidationErrorMark(radius: number): ReactNode {
        let validationMark: ReactNode = null;
        if (this.hasValidationErrors()) {
            validationMark =
                <text
                    className='validationError'
                    style={{fontSize: `${this.props.starZoom}px`}}
                >*</text>
        }
        return validationMark;
    }

    private hasValidationErrors(): boolean {
        for (let validationKey of Object.keys(this.props.topStore.getTopState().validationErrors)) {
            let errorKey: ErrorKey = TopStore.parseValidationErrorsKey(validationKey);
            if (errorKey.objectType === ObjectType.MAP_SENSOR && errorKey.objectId === this.props.dotid) {
                return true;
            }
        }
        for (let validationKey of Object.keys(this.props.topStore.getTopState().validationGlobalErrors)) {
            let errorKey: GlobalErrorKey = TopStore.parseValidationGlobalErrorsKey(validationKey);
            if (errorKey.objectType === ObjectType.MAP_SENSOR && errorKey.objectId === this.props.dotid) {
                return true;
            }
        }
        return false;
    }

    /**
     * Unheard warning mark is currently a yellow triangle with !.
     * When GUISensorClient is unheard or not seen or bad battery level,
     * present warning next to Sensor icon
     */
    renderUnheardWarningMark(): ReactNode {
        let unheardMark: ReactNode = null;
        if (this.props.datum.unheard ||
            ! this.props.datum.seen ||
            (this.props.topStore.getTopState().ap !== null &&
             this.props.datum.voltage !== -1 &&
             this.props.datum.voltage < this.props.topStore.getTopState().ap!.sensorLowBatteryThreshold)
        ) {
            unheardMark =
                <image id='unheard'
                       width='12'
                       height='12'
                       xlinkHref={WarningIcon}
                />
        }
        return unheardMark;
    }


    /** show animation of moving "electrons" to indicate progress in rf change / config change */
    private renderConfigChangeAnimationForMap(x: number, y: number): ReactNode {
        let configChangeAnimation: ReactNode = null;
        let transformFrom = "0 " + x + " " + y;
        let transformTo = "360 " + x + " " + y;

        if (this.props.datum.busyStatus === ConfigChangeStatus.QUEUED) {
            configChangeAnimation =
                <g>
                    <circle className="rfChange queued electron" cx={x} cy={y * 2} r="3">
                        <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from={transformFrom}
                            to={transformTo}
                            dur="0.9s"
                            repeatCount="indefinite"/>
                    </circle>
                    <circle className="rfChange queued electron" cx={x} cy={y * 2} r="3">
                        <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from={transformFrom}
                            to={transformTo}
                            dur="0.6s"
                            repeatCount="indefinite"/>
                    </circle>
                </g>
        }
        else if (this.props.datum.busyStatus === ConfigChangeStatus.STARTED) {
            configChangeAnimation =
                <g>
                    <circle className="rfChange started electron" cx={x} cy={y * 2} r="3">
                        <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from={transformFrom}
                            to={transformTo}
                            dur="0.9s"
                            repeatCount="indefinite"/>
                    </circle>
                    <circle className="rfChange started electron" cx={x} cy={y * 2} r="3">
                        <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from={transformFrom}
                            to={transformTo}
                            dur="0.6s"
                            repeatCount="indefinite"/>
                    </circle>
                </g>
        }

        return configChangeAnimation;
    }


    private renderHelpGestureCircle(radius: number): ReactNode {
        let pulseAnimation: ReactNode = null;

        if (this.props.helpGesturePresent !== null && this.props.helpGesturePresent === true) {
            pulseAnimation =
                <g>
                    <circle className={'mapSensorHelpGesture'} cx={this.props.x} cy={radius}/>
                    <circle className={'mapSensorHelpGestureInner'} cx={this.props.x} cy={radius}/>
                </g>
        }
        return pulseAnimation;
    }
}

export default MapSensorG;
