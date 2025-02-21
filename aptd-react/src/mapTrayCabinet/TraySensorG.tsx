import React, { ReactNode } from "react";
import {GUISensorClient, ObjectType} from "../AptdClientTypes";
import './TraySensorG.css';
import TopStore from "../TopStore";
import RssiWifiIcon from "../widgets/RssiWifiIcon";
import {MapDeviceUtils} from "./MapDeviceUtils";


interface TraySensorGProps {
    datum: GUISensorClient,
    topStore: TopStore,
    mapHeight: number,
    dotid: string,
    selected: boolean,
    helpGesturePresent?: boolean,
    shiftSensorPosX: number,
    onMouseDown: (event:React.MouseEvent)=>void
    onClick: (event:React.MouseEvent<HTMLOrSVGElement>)=>void
}

const WarningIcon:any = require('../assets/icons/icons8-warning-96.png');

/**
 * TraySensorG represents an svg g element containing representation of a
 * Sensor in the Tray, and its children.
 */
export class TraySensorG extends React.Component<TraySensorGProps, any> {

    render() {
        const { datum } = this.props;
        const transform =
            "translate(" +
            (datum.info.position.x + 5 + this.props.shiftSensorPosX) +
            ", " +
            (datum.info.position.y +  7 - 18) +
            ")";

        let groupClassNames="traySensorG draggable dotid-" + this.props.dotid;
        let circleClassNames = 'sensor';
        if (this.props.selected) {
            circleClassNames += ' selected';
            groupClassNames += ' selected';
        }
        if (this.props.datum.detect) {
            circleClassNames += ' detecting';
            groupClassNames += ' detecting';
        }
        if (this.props.datum.color === 'gray') {
            circleClassNames += ' gray';
        }

        const sensorWidth = 40;
        const sensorHeight = 40;
        const unheardMark: ReactNode = this.renderUnheardWarningMark(sensorWidth-29, sensorHeight-12);

        return (
            <g
                id={datum.id}
                className={groupClassNames}
                transform={transform}
                data-dotid={datum.id}
                data-devicetype={ObjectType.TRAY_SENSOR}
                onMouseDown={this.props.onMouseDown}
                onClick={this.props.onClick}
            >
                {this.renderHelpGestureCircle(20)}

                <circle cx="0" cy="20" r="20"
                        className={circleClassNames}
                />
                <text x="0" y="20" className='trayDotidText'>
                    {datum.id}
                </text>

                {unheardMark}

                <g className='rssiImg'>
                    <RssiWifiIcon deviceRssi={this.props.datum.rssi}
                                  inSvg={true}
                                  unseen={this.props.datum.unheard || ! this.props.datum.seen}
                                  x={-26} y={0} width={12} height={12}
                                  topStore={this.props.topStore}/>
                </g>
                {MapDeviceUtils.renderConfigChangeAnimationForTray(0, sensorHeight/2,
                                                                   this.props.datum)}

            </g>
        );
    }

    /**
     * Unheard warning mark is currently a yellow triangle with !.
     * When GUISensorClient is unheard or not seen or has BAD battery level, present warning next to Sensor icon
     */
    private renderUnheardWarningMark(xOffset: number, yOffset: number): ReactNode {
        let unheardMark: ReactNode = null;
        if (this.props.datum.unheard || ! this.props.datum.seen ||
            (this.props.topStore.getTopState().ap !== null &&
             this.props.datum.voltage !== -1 &&
             this.props.datum.voltage < this.props.topStore.getTopState().ap!.sensorLowBatteryThreshold)
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


    private renderHelpGestureCircle(radius: number): ReactNode {
        let pulseAnimation: ReactNode = null;

        if (this.props.helpGesturePresent !== null &&
            this.props.helpGesturePresent !== undefined &&
            this.props.helpGesturePresent === true) {
            pulseAnimation =
                <g>
                    <circle className={'helpgesturecircle'} cx={0} cy={radius}/>
                    <circle className={'innerhelpgesturecircle'} cx={0} cy={radius}/>
                </g>
        }

        return pulseAnimation;
    }

}

export default TraySensorG;
