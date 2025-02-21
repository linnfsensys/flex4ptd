import React, {ReactNode} from "react";
import './SDLCChannelIconG.css';
import {
    ObjectType,
} from "../AptdClientTypes";
import {ChannelNumber} from "../AptdServerTypes";
import SDLCG from "./SDLCG";


interface ChannelIconGProps {
    id: string,
    channelNo: ChannelNumber,
    bankNo: number,
    bankSelected: boolean,
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


export class SDLCChannelIconG extends React.Component<ChannelIconGProps, ChannelIconGState> {
    /*
    constructor(props: ChannelIconGProps) {
        super(props);
    }
    */

    render() {
        const channelIcon = this.makeChannelIcon();
        return channelIcon;
    }

    private makeChannelIcon():ReactNode {
        const channelKey:string = SDLCChannelIconG.makeChannelKey(this.props.bankNo, this.props.channelNo);
        const channelIconWidth = 28;
        const channelIconHeight = this.props.height;
        let gClassNames = "sdlcChannelG dotid-" + channelKey;
        let rectClassNames = 'sdlcChannelRect';
        if (this.props.disabled) {
            rectClassNames += ' disabled';
        }
        if (this.props.detect) {
            rectClassNames += ' detected';
        }
        const transform = "translate(" +    (this.props.x) +
                                     ", " + (this.props.y) + ")";

        const channelIcon: ReactNode =
                <g className={gClassNames}
                   transform={transform}
                   data-dotid={channelKey}
                   data-devicetype={ObjectType.SDLC_CHANNEL}
                   onMouseEnter={this.props.onMouseEnter}
                   onMouseLeave={this.props.onMouseLeave}
                >
                    {/* rect lozenge represents a channel */}
                    <rect className={rectClassNames}
                          y={1}
                          height={channelIconHeight - 2} width={channelIconWidth}/>
                    <text x="13" y="8">
                        {'Ch ' + SDLCG.toInt(this.props.channelNo)}
                    </text>
                </g>;
        return channelIcon;
    }

    public static makeChannelKey(bankNo: number, channelNo: ChannelNumber):string {
        let channelKey:string = 'B' + bankNo + '-' + channelNo;
        return channelKey;
    }
}

export default SDLCChannelIconG;
