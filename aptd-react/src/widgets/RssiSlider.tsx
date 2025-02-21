import React, {ReactNode} from 'react';
import '../infoPanels/InfoPanel.css';
import {GUIAPConfig, Mappable} from '../AptdServerTypes';
import TopStore from '../TopStore';
import './RssiSlider.css';
import RssiWifiIcon from "./RssiWifiIcon";

interface RssiSliderProps {
    id: string,
    deviceModel: Mappable,
    unseen: boolean,
    topStore: TopStore,
}

interface RssiSliderState {
}

const RssiNeedle:any = require('../assets/icons/rssi_slider_control.png');

/**
 * Render the rssi as a Wifi icon (as on Map),
 * followed by a read-only slider, that depicts ranges by color.
 */
class RssiSlider extends React.Component<RssiSliderProps, RssiSliderState> {

    /*
    constructor(props: InfoPanelRssiIconProps) {
        super(props);
    }
    */

    render() {
        const ap: GUIAPConfig|null = this.props.topStore.getTopState().ap;
        if (ap === null) {
            return null;
        }
        const rssiMin: number = -100;
        const rssiMax: number = -30;

        let rssiHigh:number = ap.rssiHigh;
        let rssiMed:number = ap.rssiMed;
        let rssiLow:number = ap.rssiLow;
        // note: ap.rssiAlert is not used.  any value below ap.rssiLow is consider in alert range
        if (rssiHigh === 0) {
            rssiHigh = -66;
        }
        if (rssiMed === 0) {
            rssiMed = -80;
        }
        if (rssiLow === 0) {
            rssiLow = -86;
        }

        const totalRange: number = rssiMax - rssiMin;
        const viewerWidthPx: number = 290;
        /** k is constant to convert dB value to pixels in range */
        const k: number = viewerWidthPx / totalRange;

        const alertRange: number = rssiLow - rssiMin;
        const alertRangeStyle = {width: (alertRange*k)};

        const lowRange: number = rssiMed - rssiLow;
        const lowRangeStyle = {width: (lowRange*k)};

        const medRange: number = rssiHigh - rssiMed;
        const medRangeStyle = {width: (medRange*k)};

        const highRange: number = rssiMax - rssiHigh;
        const highRangeStyle = {width: (highRange*k)};

        let deviceRssiAvailable = false;
        let deviceStrengthStyle: Object = {left: 0};
        let rssiText = '';
        let deviceRssi: number|undefined = this.props.deviceModel.rssi;
        if (deviceRssi !== null && deviceRssi !== undefined && ! this.props.unseen) {
            deviceRssiAvailable = true;
            rssiText = ' ' + deviceRssi + ' dBm';

            if (deviceRssi >= rssiHigh) {
                if (deviceRssi > rssiMax) {
                    deviceRssi = rssiMax;
                }
                const distanceFromHighRange = deviceRssi - rssiHigh;
                const positionX: number = (alertRange + lowRange + medRange + distanceFromHighRange)*k + 8 - 3;
                deviceStrengthStyle = {left: positionX};
            }
            else if (deviceRssi >= rssiMed) {
                const distanceFromMedRange = deviceRssi - rssiMed;
                const positionX: number = (alertRange + lowRange + distanceFromMedRange)*k + 6 - 3;
                deviceStrengthStyle = {left: positionX};
            }
            else if (deviceRssi >= rssiLow) {
                const distanceFromLowRange: number = deviceRssi - rssiLow;
                const positionX: number = (alertRange + distanceFromLowRange)*k + 4 - 3;
                deviceStrengthStyle = {left: positionX};
            }
            else if (deviceRssi < rssiLow) {
                if (deviceRssi < rssiMin) {
                    deviceRssi = rssiMin;
                }
                const distanceFromStart: number = deviceRssi - rssiMin;
                const positionX: number = distanceFromStart*k + 2 - 3;
                deviceStrengthStyle = {left: positionX};
            }
            else {
                // this should never happen
                console.error('this should never happen. deviceRssi=', deviceRssi);
                return null;
            }
        } else {
            rssiText = 'Unknown';
            deviceStrengthStyle = {left: 2, top: 5};
        }

        return (
            <div className='rssiViewerDiv'>
                <RssiWifiIcon deviceRssi={deviceRssi}
                              unseen={this.props.unseen}
                              inSvg={false}
                              width={17} height={17}
                              topStore={this.props.topStore}/>
                <div className='slider'>
                    <div className='minMaxNumbers'>
                        <span>{(rssiMin).toString()}</span>
                        <span>{(rssiMax).toString()}</span>
                    </div>
                    <span id='infoPanelRssiStrength' className='rainbowSlider'>
                        <div className="section"/>
                        <div key={'alertRange'} style={alertRangeStyle} className='alertRange' id='alertRange'/>
                        <div className="section"/>
                        <div key={'lowRange'} style={lowRangeStyle} className='lowRange' id='lowRange'/>
                        <div className="section"/>
                        <div key={'medRange'} style={medRangeStyle} className='medRange' id='medRange'/>
                        <div className="section"/>
                        <div key={'highRange'} style={highRangeStyle} className='highRange' id='highRange'/>
                        <div className="section"/>

                        <div className='deviceStrength'  style={deviceStrengthStyle}>
                            {deviceRssiAvailable ?
                                <img src={RssiNeedle} width={8} alt={'position'}></img>
                                :
                                null
                            }
                            {rssiText}
                        </div>
                    </span>
                </div>
            </div>
        )
    }
}

export default RssiSlider;
