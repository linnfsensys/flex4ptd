import React, { ReactNode } from "react";
import {GUIRepeaterClient, ObjectType} from "../AptdClientTypes";
import './TrayRepeaterG.css';
import TopStore from "../TopStore";
import RssiWifiIcon from "../widgets/RssiWifiIcon";
import {MapDeviceUtils} from "./MapDeviceUtils";


interface TrayRepeaterGProps {
    datum: GUIRepeaterClient,
    topStore: TopStore,
    mapHeight: number,
    shiftRepeaterPosX: number,
    dotid: string,
    selected: boolean,
    onMouseDown: (event:React.MouseEvent)=>void
    onClick: (event:React.MouseEvent<HTMLOrSVGElement>)=>void
}

const WarningIcon:any = require('../assets/icons/icons8-warning-96.png');

/**
 * TrayRepeaterG represents an svg g element containing representation of a
 * Repeater in the Tray, and its children.
 */
export class TrayRepeaterG extends React.Component<TrayRepeaterGProps, any> {

    render() {
        const { datum } = this.props;
        const transform =
            "translate(" +
            (datum.info.position.x + 5 + this.props.shiftRepeaterPosX) +
            ", " +
            (datum.info.position.y + 7 - 18) +
            ")";
        let groupClassNames="trayRepeaterG draggable dotid-" + this.props.dotid;
        let rectClassNames = 'repeater';
        if (this.props.selected) {
            rectClassNames += ' selected';
            groupClassNames += ' selected';
        }
        const repeaterWidth = 40;
        const repeaterHeight = 40;
        const unheardMark: ReactNode = this.renderUnheardWarningMark(1, -2);

        return (
            <g
                id={datum.id}
                className={groupClassNames}
                transform={transform}
                data-dotid={datum.id}
                data-devicetype={ObjectType.TRAY_REPEATER}
                onMouseDown={this.props.onMouseDown}
                onClick={this.props.onClick}
            >
                <rect className={rectClassNames}
                      height={repeaterHeight}
                      width={repeaterWidth}
                      x={'-20'}
                />
                <polygon points={'-20 39, 0 0, 20 39'}
                         className={'triangle'}/>

                {unheardMark}

                <g className='rssiImg'>
                    <RssiWifiIcon deviceRssi={this.props.datum.rssi}
                                  unseen={this.props.datum.unheard || ! this.props.datum.seen}
                                  inSvg={true}
                                  x={-16} y={0} width={12} height={12}
                                  topStore={this.props.topStore}/>
                </g>
                {MapDeviceUtils.renderConfigChangeAnimationForTray(0, repeaterHeight/2,
                    this.props.datum)}
                <text className="devType" x="0" y="18">
                    Repeater
                </text>
                <text x="0" y="33">
                    {datum.id}
                </text>
            </g>
        );
    }

    /**
     * Unheard warning mark is currently a yellow triangle with !.
     * when GUIRepeaterClient is unheard or not seen or BAD battery level, present warning next to Repeater icon
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

export default TrayRepeaterG;
