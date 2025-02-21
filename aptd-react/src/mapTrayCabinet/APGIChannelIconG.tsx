import React, {ReactNode} from "react";
import './APGIChannelIconG.css';
import {
    ObjectType,
} from "../AptdClientTypes";


interface ChannelIconGProps {
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


export class APGIChannelIconG extends React.Component<ChannelIconGProps, ChannelIconGState> {

    render() {
        const channelIcon = this.makeChannelIcon();
        return channelIcon;
    }

    private makeChannelIcon():ReactNode {
        const channelKey:string = APGIChannelIconG.makeChannelKey(this.props.id);
        const channelIconWidth = 38;
        const channelIconHeight = this.props.height;
        let gClassNames = "apgiChannelG dotid-" + channelKey;
        let rectClassNames = 'apgiChannelRect';
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
                   data-devicetype={ObjectType.APGI_CHANNEL}
                   onMouseEnter={this.props.onMouseEnter}
                   onMouseLeave={this.props.onMouseLeave}
                >
                    {/* rect lozenge represents a channel */}
                    <rect className={rectClassNames}
                          height={channelIconHeight} width={channelIconWidth}/>
                    <text x="3" y="7">
                        {APGIChannelIconG.toSimpleChannelId(this.props.id)}
                    </text>
                </g>;
        return channelIcon;
    }

    public static makeChannelKey(channelId: string):string {
        let channelKey:string = APGIChannelIconG.toSimpleChannelId(channelId);
        return channelKey;
    }

    /**
     * convert, e.g., "S0-S1-CH_15" to "0-1-15"
     */
    static toSimpleChannelId(channelId: string): string {
        return channelId.replace(/S/g, '').replace(/CH_/, '');
    }

}

export default APGIChannelIconG;
