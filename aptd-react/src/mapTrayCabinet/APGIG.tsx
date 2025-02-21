import React, {ReactNode} from "react";
import './APGIG.css';
import {GUICCAPGIClient, ObjectType} from "../AptdClientTypes";
import {CCChanEnableOption,} from "../AptdServerTypes";
import APGIChannelIconG from "./APGIChannelIconG";
import AptdApp from "../AptdApp";

interface APGIGProps {
    key: string,
    id: string,
    datum: GUICCAPGIClient,
    selected: boolean,
    /**
     * set of channel ids e.g. ['S0-S1-CH_1', 'S0-S1-CH_2']
     */
    detectedChannelIds: Set<string>,
    onMouseDown: (event: React.MouseEvent<SVGGElement>)=>void,
    onMouseEnter: (event: React.MouseEvent<SVGGElement>)=>void,
    onMouseLeave: (event: React.MouseEvent<SVGGElement>)=>void,
    onClick: (event: React.MouseEvent<SVGGElement>)=>void
}
interface APGIGState {

}

const WarningIcon:any = require('../assets/icons/icons8-warning-96.png');

/**
 * This Component represents a svg g element and its children that
 * constitute an icon representing an APGI Device in the Cabinet.
 * That device contains an arbitrary number of APGI channel icons.
 */
export class APGIG extends React.Component<APGIGProps, APGIGState> {
    channelIconHeight: number = 15;

    render() {
        const datum: GUICCAPGIClient = this.props.datum as GUICCAPGIClient;
        let gClassNames = "apgiGOuter apgiG selectable dotid-APGI";
        let rectClassNames = 'ccCard';
        const ccCardWidth: number = 56;
        const numChannels: number = Object.keys(datum.channelsById).length;
        const ccCardHeight: number = Math.max(numChannels, 4) * this.channelIconHeight;

        if (this.props.selected) {
            rectClassNames += ' selected';
            gClassNames += ' selected';
        }
        const unheardMark: ReactNode = this.renderUnheardWarningMark(44, ccCardHeight - 20);

        return (
            <g className={gClassNames}
               transform={"translate(2, " + (datum.info.position.y + 2) + ")"}
               onMouseDown={this.props.onMouseDown}
               onClick={this.props.onClick}
               data-dotid={'APGI'}
               data-devicetype={ObjectType.APGI}
            >
                {/* rect.ccCard acts as background for the channel icons */}
                <rect className={rectClassNames}
                      height={ccCardHeight+4} width={ccCardWidth} />
                {/* rect.cardRect is just a grey bar for visual clarity */}
                <rect className='cardRect' width={40} height={ccCardHeight + .5} x={0} y={1.5}/>
                <text className='cardText' x={50.5} y={22} transform='rotate(90, 50.5, 19.5)'>
                    {'APGI'}
                </text>

                {unheardMark}

                {/* show all APGI channels as vertically stacked lozenges */}
                {this.makeChannelIcons()}
            </g>
        );
    }


    private makeChannelIcons():ReactNode[] {
        let channelIconX = 0;
        let channelIcons:ReactNode[] = [];
        let channelNo: number = 0;
        const channelIconHeight:number = this.channelIconHeight;
        // in following line, we use a custom sort that is same as in InfoPanelAPGI.render()
        for (let channelId of Object.keys(this.props.datum.channelsById).sort(AptdApp.compareAPGIChannels)) {
            const detected: boolean =
                Array.from(this.props.detectedChannelIds).includes(channelId);

            channelIcons.push(<APGIChannelIconG key={channelId}
                                                id={channelId}
                                                detect={detected}
                                                disabled={this.props.datum.channelsById[channelId].enabled === CCChanEnableOption.DISABLED}
                                                height={channelIconHeight}
                                                x={channelIconX}
                                                y={2 + channelIconHeight*(channelNo)}
                                                onMouseEnter={this.props.onMouseEnter}
                                                onMouseLeave={this.props.onMouseLeave}
                              />);
            channelNo++;
        }
        return channelIcons;
    }

    renderUnheardWarningMark(xOffset: number, yOffset: number): ReactNode {
        let unheardMark: ReactNode = null;
        if (this.props.datum.unheard) {
            unheardMark =
                <image id='unheard'
                       x={xOffset}
                       y={yOffset}
                       width='17'
                       height='17'
                       xlinkHref={WarningIcon}
                />
        }
        return unheardMark;
    }

}

export default APGIG;
