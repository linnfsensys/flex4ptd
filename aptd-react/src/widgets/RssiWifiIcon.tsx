import React, {ReactNode} from "react";
import TopStore from "../TopStore";

const WarningIcon:any = require('../assets/icons/icons8-warning-96.png');

const RssiEmpty:any = require('../assets/icons/empty_rssi_icon.png');
const RssiHigh:any = require('../assets/icons/rssi_high.png');
const RssiMid:any = require('../assets/icons/rssi_mid.png');
const RssiLow:any = require('../assets/icons/rssi_low.png');
const RssiAlert:any = require('../assets/icons/rssi_alert.png');

interface RssiWifiIconProps {
    deviceRssi: number|undefined,
    unseen: boolean,
    x?: number,
    y?: number,
    inSvg: boolean,
    width: number,
    height: number,
    topStore: TopStore,
}
export class RssiWifiIcon extends React.Component<RssiWifiIconProps, any> {
    constructor(props: RssiWifiIconProps) {
        super(props);
    }

    render() {
        let rssiImage;
        const ap = this.props.topStore.getTopState().ap;
        if (this.props.unseen) {
            rssiImage = RssiEmpty;
        } else if (ap !== null &&
                   this.props.deviceRssi !== null &&
                   this.props.deviceRssi !== undefined) {
            let rssiHigh = ap.rssiHigh;
            let rssiMed = ap.rssiMed;
            let rssiLow = ap.rssiLow;
            if (rssiHigh === 0) {
                rssiHigh = -66;
            }
            if (rssiMed === 0) {
                rssiMed = -80;
            }
            if (rssiLow === 0) {
                rssiLow = -86;
            }

            if (this.props.deviceRssi >= rssiHigh) {
                rssiImage = RssiHigh;
            } else if (this.props.deviceRssi >= rssiMed) {
                rssiImage = RssiMid;
            } else if (this.props.deviceRssi >= rssiLow) {
                rssiImage = RssiLow;
            } else {
                rssiImage = RssiAlert;
            }
        } else {
            rssiImage = RssiEmpty;
        }

        return (this.props.inSvg ?
                <image className='rssi wifiIcon'
                       width={this.props.width}
                       height={this.props.height}
                       x={this.props.x}
                       y={this.props.y}
                       xlinkHref={rssiImage}
                />
                :
                <img className='rssi wifiIcon'
                     width={this.props.width}
                     height={this.props.height}
                     src={rssiImage}
                     alt='RF icon'
                />
        );
    }
}

export default RssiWifiIcon;