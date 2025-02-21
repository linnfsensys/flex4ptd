import {GUIRadioClient, GUIRepeaterClient, GUISensorClient} from "../AptdClientTypes";
import React, {ReactNode} from "react";
import {ConfigChangeStatus} from "../AptdServerTypes";

export class MapDeviceUtils {
    /**
     * render an arc to show % complete of Firmware Upgrade, and
     * also a moving "electron" to show FirmwareUpgrade in progress.
     */
    public static renderFirmwareProgress(datum: GUIRepeaterClient | GUIRadioClient | GUISensorClient,
                                         x: number, radius: number, percent: number): ReactNode {
        let percentCompleteG: ReactNode = null;
        // pathSpec specifies arc that shows % complete
        const pathSpec = "M" + x + " " + (datum.otype === 'GUISensor' ? 0 : radius) +
            " a " + radius + " " + radius + " 0 0 1 0 " + (radius * 2) +
            " a " + radius + " " + radius + " 0 0 1 0 " + -(radius * 2);

        // in sensor case the radius is not multiplied by 2.
        const transformFrom = "0 " + x + " " + ((datum.otype === 'GUISensor' ? radius : radius * 2));
        const transformTo = "360 " + x + " " + ((datum.otype === 'GUISensor' ? radius : radius * 2));

        const percentSpec = (percent * .8) + ", 100";

        if (datum.uploading) {
            percentCompleteG =
                <g className="percentCompleteG firmwareG">
                    <path
                        d={pathSpec}
                        className="firmware percent"
                        fill="none"
                        //stroke="#12e015"  // stroke is now in css
                        strokeWidth="2.5"
                        strokeDasharray={percentSpec}
                    />
                    {/* in circle, a valid alternative for GUISensor is cy=radius/2 */}
                    <circle className="firmware electron"
                            cx={x} cy={datum.otype === 'GUISensor' ? 0 : radius} r="2.5">
                        <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from={transformFrom}
                            to={transformTo}
                            dur="0.9s"
                            repeatCount="indefinite"/>
                    </circle>
                </g>
        }
        return percentCompleteG;
    }

    /**
     * Show animation of moving "electrons" to indicate progress in rf change / config change.
     * Note: this is not normally shown for Tray devices, but is for Replace Repeater.
     * TODO: this method could be used to replace method of same name in MapSensorG
     */
    public static renderConfigChangeAnimationForMap(x: number, y: number,
                                                    datum: GUIRepeaterClient|GUISensorClient): ReactNode {
        let configChangeAnimation: ReactNode = null;
        const transformFrom = "0 " + x + " " + (y/2);
        const transformTo = "360 " + x + " " + (y/2);

        if (datum.busyStatus === ConfigChangeStatus.QUEUED) {
            // queued is blue
            configChangeAnimation =
                <g>
                    <circle className='rfChange queued electron' cx={x} cy={y/3} r="3">
                        <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from={transformFrom}
                            to={transformTo}
                            dur="0.9s"
                            repeatCount="indefinite"/>
                    </circle>
                    <circle className='rfChange queued electron' cx={x} cy={y/3} r="3">
                        <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from={transformFrom}
                            to={transformTo}
                            dur="0.6s"
                            repeatCount="indefinite"/>
                    </circle>
                </g>
        } else if (datum.busyStatus === ConfigChangeStatus.STARTED) {
            // actually doing something is cyan
            configChangeAnimation =
                <g>
                    <circle className='rfChange started electron' cx={x} cy={y/3} r="3">
                        <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from={transformFrom}
                            to={transformTo}
                            dur="0.9s"
                            repeatCount="indefinite"/>
                    </circle>
                    <circle className='rfChange started electron' cx={x} cy={y/3} r="3">
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

    /**
     * Show animation of moving "electrons" to indicate progress in rf change / config change.
     * Note: this is not normally shown for Tray devices, but is for Replace Repeater.
     */
    public static renderConfigChangeAnimationForTray(x: number, y: number,
                                                     datum: GUIRepeaterClient|GUISensorClient): ReactNode {
        let configChangeAnimation: ReactNode = null;
        const transformFrom = "0 " + x + " " + y;
        const transformTo = "360 " + x + " " + y;

        if (datum.busyStatus === ConfigChangeStatus.QUEUED) {
            // queued is blue
            configChangeAnimation =
                <g>
                    <circle className='rfChange queued electron' cx={0} cy={0} r="3">
                        <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from={transformFrom}
                            to={transformTo}
                            dur="0.9s"
                            repeatCount="indefinite"/>
                    </circle>
                    <circle className='rfChange queued electron' cx={0} cy={0} r="3">
                        <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from={transformFrom}
                            to={transformTo}
                            dur="0.6s"
                            repeatCount="indefinite"/>
                    </circle>
                </g>
        } else if (datum.busyStatus === ConfigChangeStatus.STARTED) {
            // actually doing something is cyan
            configChangeAnimation =
                <g>
                    <circle className='rfChange started electron' cx={0} cy={0} r="3">
                        <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from={transformFrom}
                            to={transformTo}
                            dur="0.9s"
                            repeatCount="indefinite"/>
                    </circle>
                    <circle className='rfChange started electron' cx={0} cy={0} r="3">
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


}
