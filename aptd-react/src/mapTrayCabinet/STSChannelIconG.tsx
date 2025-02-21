import React, {ReactNode} from "react";
import './STSChannelIconG.css';
import {
    ObjectType,
} from "../AptdClientTypes";
import InfoPanelStsChannels from "../infoPanels/InfoPanelStsChannels";
import AptdApp from "../AptdApp";


interface ChannelIconGProps {
    /** typical format for STS internal channel id: 'IP1G0C1' */
    id: string,
    disabled: boolean,
    detect: boolean,
    height: number,
    x: number,
    y: number,
    onMouseEnter: (event: React.MouseEvent<SVGGElement>)=>void,
    onMouseLeave: (event: React.MouseEvent<SVGGElement>)=>void,
}
interface ChannelIconGState {

}


export class STSChannelIconG extends React.Component<ChannelIconGProps, ChannelIconGState> {

    render() {
        const channelIcon = this.makeChannelIcon();
        return channelIcon;
    }

    private makeChannelIcon():ReactNode {
        const channelKey:string = STSChannelIconG.makeChannelKey(this.props.id);
        //const channelIconWidth = 58;
        const channelIconHeight = this.props.height;
        let gClassNames = "stsChannelG dotid-" + channelKey;
        let rectClassNames = 'stsChannelRect';
        if (this.props.disabled) {
            rectClassNames += ' disabled';
        }
        if (this.props.detect) {
            rectClassNames += ' detected';
        }
        const transform = "translate(" + this.props.x + ", " + this.props.y + ")";

        const channelIcon: ReactNode =
                <g className={gClassNames}
                   transform={transform}
                   data-dotid={this.props.id}
                   data-devicetype={ObjectType.STS_CHANNEL}
                   onMouseEnter={this.props.onMouseEnter}
                   onMouseLeave={this.props.onMouseLeave}
                >
                    {/* rect lozenge represents a channel */}
                    <rect className={rectClassNames}
                          height={channelIconHeight} />
                    <text x="4" y="7">
                        {STSChannelIconG.toUserChannelIdShorter(this.props.id)}
                    </text>
                </g>;
        return channelIcon;
    }

    public static toUserChannelId(id: string) {
        return InfoPanelStsChannels.toUserChannelId(AptdApp.toSTSChannelId(id));
    }
    public static toUserChannelIdShorter(id: string) {
        return InfoPanelStsChannels.toUserChannelIdShorter(AptdApp.toSTSChannelId(id));
    }

    public static makeChannelKey(channelId: string):string {
        let channelKey:string = /*STSChannelIconG.toSimpleChannelId(*/channelId/*)*/;
        return channelKey;
    }

    /**
     * convert, e.g., "IP1-G135-CH_15" to "1-135-15"
     */
    static toSimpleChannelId(channelId: string): string {
        return channelId.replace(/IP/, '').replace(/G/, '').replace(/CH_/, '');
    }

}

export default STSChannelIconG;
