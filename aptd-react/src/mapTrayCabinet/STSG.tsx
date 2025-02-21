import React, {ReactNode} from "react";
import './STSG.css';
import {GUICCSTSClient, ObjectType} from "../AptdClientTypes";
import {
    CCChanEnableOption,
} from "../AptdServerTypes";
import STSChannelIconG from "./STSChannelIconG";
import AptdApp from "../AptdApp";

interface STSGProps {
    key: string,
    id: string,
    datum: GUICCSTSClient,
    selected: boolean,
    /**
     * Set of channel ids e.g. ['S0-S1-CH_1', 'S0-S1-CH_2']
     */
    detectedChannelIds: Set<string>,
    onMouseDown: (event: React.MouseEvent<SVGGElement>)=>void,
    onMouseEnter: (event: React.MouseEvent<SVGGElement>)=>void,
    onMouseLeave: (event: React.MouseEvent<SVGGElement>)=>void,
    onClick: (event: React.MouseEvent<SVGGElement>)=>void
}
interface STSGState {

}

const WarningIcon:any = require('../assets/icons/icons8-warning-96.png');

/**
 * This Component represents a svg g element and its children that
 * constitute an icon representing an STS Device in the Cabinet.
 * Unlike the other CC devices, its title "STS" is horizontal at top,
 * to allow more room for the longer channel names.
 */
export class STSG extends React.Component<STSGProps, STSGState> {
    channelIconHeight: number = 15;

    render() {
        const datum: GUICCSTSClient = this.props.datum as GUICCSTSClient;
        let gClassNames = "stsGOuter stsG selectable dotid-STS";
        let rectClassNames = 'ccCard';
        const ccCardWidth: number = 58;
        const numChannels: number = Object.keys(datum.channelsById).length;
        const ccCardHeight: number = Math.max(numChannels, 4) * this.channelIconHeight + 22;

        let transformData = "translate(2, " + (datum.info.position.y + 2) + ")";

        if (this.props.selected) {
            rectClassNames += ' selected';
            gClassNames += ' selected';
        }
        const transform = transformData;
        const unheardMark: ReactNode = this.renderUnheardWarningMark(ccCardWidth - 20, 0);
        return (
            <g className={gClassNames}
               transform={transform}
               onMouseDown={this.props.onMouseDown}
               onClick={this.props.onClick}
               data-dotid={'STS'}
               data-devicetype={ObjectType.STS}
            >
                {/* rect.cardRect is just a grey bar for visual clarity */}
                <rect className='cardRect' width={45} height={ccCardHeight-5} x={5} y={5}/>
                {/* rect.ccCard acts as background for the channel icons */}
                <rect className={rectClassNames}
                      height={ccCardHeight} width={ccCardWidth} />
                <text className='cardText' x="5" y="10">
                    {'STS'}
                </text>
                {unheardMark}

                {/* show all STS channels as vertically stacked lozenges */}
                {this.makeChannelIcons()}
            </g>
        );
    }


    private makeChannelIcons():ReactNode[] {
        let channelIconX = 1;
        let channelIcons:ReactNode[] = [];
        let channelNo: number = 0;
        const channelIconHeight:number = this.channelIconHeight;
        // in following line, we use a custom sort that is same as in InfoPanelSTS.render()
        for (let channelId of Object.keys(this.props.datum.channelsById).sort(AptdApp.compareSTSChannels)) {
            const detected: boolean = this.props.detectedChannelIds !== null &&
                Array.from(this.props.detectedChannelIds).includes(channelId);

            channelIcons.push(<STSChannelIconG key={channelId}
                                               id={channelId}
                                               detect={detected}
                                               disabled={this.props.datum.channelsById[channelId].enabled === CCChanEnableOption.DISABLED}
                                               height={channelIconHeight}
                                               x={channelIconX}
                                               y={channelIconHeight*(channelNo) + 20}
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

export default STSG;
