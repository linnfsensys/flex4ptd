import React, {ReactNode} from "react";
import './CCChannelIconG.css';
import {
    ObjectType,
} from "../AptdClientTypes";
import {ChannelNumber} from "../AptdServerTypes";
import SDLCG from "./SDLCG";


interface ChannelIconGProps {
    id: string,
    channelKey: string,
    channelNo: ChannelNumber,
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


export class CCChannelIconG extends React.Component<ChannelIconGProps, ChannelIconGState> {
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
        const channelKey:string = this.props.channelKey;
        const channelIconWidth = 28;
        const channelIconHeight = this.props.height;
        let rectClassNames = 'ccChannelRect';
        if (this.props.disabled) {
            rectClassNames += ' disabled';
        }
        if (this.props.detect) {
            rectClassNames += ' detected';
        }
        const transform = "translate(" + this.props.x + ", " + (this.props.y + 1) + ")";

        const channelIcon: ReactNode =
                <g className={"ccChannelG dotid-" + channelKey}
                   transform={transform}
                   data-dotid={channelKey}
                   data-devicetype={ObjectType.CC_CHANNEL}
                   onMouseEnter={this.props.onMouseEnter}
                   onMouseLeave={this.props.onMouseLeave}
                >
                    {/* rect lozenge represents a channel */}
                    <rect className={rectClassNames}
                          height={channelIconHeight}
                          width={channelIconWidth}
                          rx={3}
                    />
                    {/* TODO: move toInt to someplace higher or outside */}
                    <text className="channelText" x="12" y="7">
                        {'Ch ' + SDLCG.toInt(this.props.channelNo)}
                    </text>
                </g>;
        return channelIcon;
    }
}

export default CCChannelIconG;
