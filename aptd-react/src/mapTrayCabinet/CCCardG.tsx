import React, {ReactNode} from "react";
import './CCCardG.css';
import {
    CCChanEnableOption,
    ChannelNumber,
    getChannelNumber,
    GUICCChannel
} from "../AptdServerTypes";
import {GUICCCardClient, ObjectType} from "../AptdClientTypes";
import SDLCG from "./SDLCG";
import CCChannelIconG from "./CCChannelIconG";


interface CCCardGProps {
    key: string,
    id: string,
    datum: GUICCCardClient,
    selected: boolean,
    detectedChannels: string[] | null,
    onMouseDown: (event: React.MouseEvent<SVGGElement>)=>void,
    onMouseEnter: (event: React.MouseEvent<SVGGElement>)=>void,
    onMouseLeave: (event: React.MouseEvent<SVGGElement>)=>void,
    onClick: (event: React.MouseEvent<SVGGElement>)=>void
}
interface CCCardGState {
}

const WarningIcon:any = require('../assets/icons/icons8-warning-96.png');

/**
 * This Component represents a svg g element and its children that
 * constitute an icon representing a CC Card in the Cabinet.
 * The card icon is shown as a rect containing 4 channel rects.
 * Clicking on any part of it causes that CC Card to be selected, and
 * to have its data (and its 4 channels' data) show up in Info Panel.
 */
export class CCCardG extends React.Component<CCCardGProps, CCCardGState> {
    channelIconHeight: number = 15;

    /*
    constructor(props: CCCardGProps) {
        super(props);
    }
    */

    render() {

        let detected_indices: Set<ChannelNumber> = new Set();
        if (this.props.detectedChannels !== null && this.props.detectedChannels !== undefined &&
            this.props.detectedChannels.length > 0) {
            for (const detectedChannel of this.props.detectedChannels) {
                const channelNumber = getChannelNumber(Number(detectedChannel[detectedChannel.length-1]));
                if (channelNumber !== null) {
                    detected_indices.add(channelNumber);
                }
            }
        }
        const datum = this.props.datum as GUICCCardClient;
        const dotid = datum.id;
        let gClassNames = "ccCardGOuter ccCardG selectable dotid-" + dotid;
        let rectClassNames = 'ccCard';
        let cardRect = 'cardRect';
        const ccCardWidth = 50;
        const ccCardHeight = 4 * this.channelIconHeight;

        // let transformData = "translate(" + (datum.info.position.x) + ", " + (datum.info.position.y) + ")";
        let transformData = "translate(0, " + (datum.info.position.y) + ")";

        if (this.props.selected) {
            rectClassNames += ' selected';
            gClassNames += ' selected';
            cardRect += ' selected';
        }
        const transform = transformData;
        const shelfSlot = CCCardG.noS(datum.shelf) + '-' + CCCardG.noS(datum.slot);

        const unheardMark: ReactNode = this.renderUnheardWarningMark(34, 1);
        return (
            <g className={gClassNames}
               transform={transform}
               onMouseDown={this.props.onMouseDown}
               onClick={this.props.onClick}
               data-dotid={datum.id}
               data-devicetype={ObjectType.CCCARD}
            >
                {/* rect.ccCard acts as background for the channel icon */}
                <rect className={rectClassNames}
                      height={ccCardHeight+3} width={ccCardWidth} />
                {/* rect.cardRect is just a grey bar for visual clarity */}
                <rect className={cardRect} width={35} height={ccCardHeight - 1} x={0} y={2}/>
                <text className='cardText' x={46} y={13} transform='rotate(90, 40, 15)'>
                    {shelfSlot}
                </text>

                {/* show (2 or) 4 channels as vertically stacked lozenges */}
                {this.makeChannelIcons(detected_indices)}

                {unheardMark}
            </g>
        );
    }

    private makeChannelIcons(detectedChannelIndices: Set<ChannelNumber>):ReactNode[] {
        let channelIcons:ReactNode[] = [];
        const channelIconHeight:number = this.channelIconHeight;
        const channelIds:string[] = Object.keys(this.props.datum.channelsById);
        const channelNumbers:ChannelNumber[] = channelIds
            .map((channelId:string) =>
                (this.props.datum.channelsById[channelId].channelNumber as ChannelNumber))
            .sort();

        // assert: usually channelNumbers === ['CH_1', 'CH_2', 'CH_3', 'CH_4'].
        //         or sometimes channelNumbers === ['CH_1', 'CH_2'].
        if (channelNumbers.length !== 4 && channelNumbers.length !== 2) {
            console.error('makeChannelIcons(): invalid channelNumbers.length=',
                channelNumbers.length, channelNumbers);
        }

        for (let channelNo of channelNumbers) {
            const channelKey = CCCardG.makeChannelKey(this.props.datum.shelf,
                                                      this.props.datum.slot,
                                                      channelNo);
            const channel:GUICCChannel = this.props.datum.channelsById[channelKey];
            if (channel === undefined || channel === null) {
                console.error('makeChannelIcons(): there is no channel for channelKey=', channelKey);
            }
            const disabled:boolean = ((channel === undefined || channel === null) ?
                                       true :
                                       (channel.enabled === CCChanEnableOption.DISABLED));
            channelIcons.push(<CCChannelIconG key={channelKey}
                                              id={channelKey}
                                              channelNo={channelNo}
                                              channelKey={channelKey}
                                              disabled={disabled}
                                              detect={detectedChannelIndices.has(channelNo)}
                                              height={channelIconHeight}
                                              x={2}
                                              // TODO: in following, move toInt up
                                              y={channelIconHeight*(SDLCG.toInt(channelNo) - 1)}
                                              onMouseEnter={this.props.onMouseEnter}
                                              onMouseLeave={this.props.onMouseLeave}
                              />);
        }
        return channelIcons;
    }

    static makeChannelKey(shelf: string, slot: string, channelNo: ChannelNumber): string {
        return shelf + '-' + slot + '-' + channelNo;
    }

    static noS(str: string): string {
        if (str.startsWith('S')) {
            return str.substring(1);
        } else {
            return str;
        }
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

export default CCCardG;
