import React, {ReactNode} from "react";
import './SDLCG.css';
import {GUICCInterfaceBaseClient, GUISDLCClient, ObjectType} from "../AptdClientTypes";
import {CCChanEnableOption, ChannelNumber, getChannelIndex, getChannelNumber} from "../AptdServerTypes";
import SDLCChannelIconG from "./SDLCChannelIconG";

interface SDLCGProps {
    key: string,
    id: string,
    datum: GUICCInterfaceBaseClient,
    selected: boolean,
    leftSideBank: boolean,
    detectedCardChannels: {[ccCard: string]: string[]} | null,
    selectedBankNo: number,
    onMouseDown: (event: React.MouseEvent<SVGGElement>)=>void,
    onMouseEnter: (event: React.MouseEvent<SVGGElement>)=>void,
    onMouseLeave: (event: React.MouseEvent<SVGGElement>)=>void,
    onClick: (event: React.MouseEvent<SVGGElement>)=>void
}
interface SDLCGState {

}

const WarningIcon:any = require('../assets/icons/icons8-warning-96.png');

/**
 * This Component represents a svg g element and its children that
 * constitute an icon representing 1 or 2 banks of an SDLC Device (FlexConnect) in the Cabinet.
 * The device is shown as 1 or 2 Banks, each of which has 16 channel rects.
 * Clicking on any part of a Bank causes that SDLC Bank to be selected, and
 * to have its data (and its 16 channels' data) show up in Info Panel.
 */
export class SDLCG extends React.Component<SDLCGProps, SDLCGState> {
    channelIconHeight: number = 15;

    render() {
        const datum = this.props.datum as GUISDLCClient;
        const bankIcons =
            datum.banks.map((bankNo: number, index: number) => this.renderBankIcon(bankNo, index));
        return bankIcons;
    }

    private renderBankIcon(bankNo: number, index: number):ReactNode {
        const datum = this.props.datum as GUISDLCClient;
        const dotid = bankNo;
        const bankWidth = 52;
        const bankHeight = 16 * this.channelIconHeight;
        let bankGOuterClassNames = "bankGOuter bankG selectable dotid-" + dotid;
        let bgBankRectClassNames = 'bgBankRect';
        let bankSelected:boolean = false;
        if (this.props.selected && this.props.selectedBankNo === bankNo) {
            bankGOuterClassNames += ' selected';
            bgBankRectClassNames += ' selected';
            bankSelected = true;
        }

        let detectedChannelIndices: Set<ChannelNumber> = new Set();
        if (this.props.detectedCardChannels !== null && this.props.detectedCardChannels !== undefined) {
            let bankId = 'B' + bankNo;
            let detectedChannels = this.props.detectedCardChannels[bankId];
            if (detectedChannels !== null && detectedChannels !== undefined) {
                for (const detectedChannel of detectedChannels) {
                    const channelNumber =
                        getChannelNumber(getChannelIndex(detectedChannel.substr(detectedChannel.length-4)));
                    if (channelNumber !== null) {
                        detectedChannelIndices.add(channelNumber);
                    }
                }
            }
        }

        let unheardMarkX, bankDividerX, bankTextX, bankTextY, bankTextRotate, bankGOuterTransform;
        if (this.props.leftSideBank) {
            unheardMarkX = 0;
            bankDividerX = 17;
            bankTextX = 16;
            bankTextY = 17;
            bankTextRotate = 'rotate(90,9,15)';
            const leftBankX = (bankSelected ? 5 : 6) + datum.info.position.x;
            bankGOuterTransform = "translate(" +
                leftBankX + ", " +
                (2 + datum.info.position.y + (index)*(bankHeight+8)) +
                ")";
        } else {
            unheardMarkX = 35;
            bankDividerX = 28;
            bankTextX = 47;
            bankTextY = 12;
            bankTextRotate = 'rotate(90, 40, 15)';
            const rightBankX = (bankSelected ? 1 : 2) + datum.info.position.x;
            bankGOuterTransform = "translate(" +
                rightBankX + ", " +
                (2 + datum.info.position.y + (index)*(bankHeight+8)) +
                ")";
        }

        const unheardMark: ReactNode = this.renderUnheardWarningMark(unheardMarkX, 5);
        // TODO: make bankIcon into a Component
        const bankIcon: ReactNode =
            <React.Fragment key={bankNo}>
                <g className={bankGOuterClassNames}
                   transform={bankGOuterTransform}
                   onMouseDown={this.props.onMouseDown}
                   onClick={this.props.onClick}
                   data-dotid={bankNo}
                   data-devicetype={ObjectType.SDLC_BANK}
                >
                    {/* rect backs all the channels and bank number text */}
                    <rect className={bgBankRectClassNames}
                          width={bankWidth}
                          height={bankSelected ? bankHeight + 2: bankHeight}/>
                    <rect className='bankDivider'
                          width={7}
                          height={bankHeight}
                          x={bankDividerX} y={bankSelected ? 1 : 0}/>
                    <text className='bankText'
                          x={bankTextX} y={bankTextY}
                          transform={bankTextRotate}>
                        {'FlexConnect: Bank ' + bankNo}
                    </text>

                    {/* show 16 channels as vertically stacked lozenges */}
                    {this.makeChannelIcons(bankNo, bankSelected, detectedChannelIndices)}

                    {unheardMark}
                </g>
            </React.Fragment>;
        return bankIcon;
    }

    private makeChannelIcons(bankNo: number,
                             bankSelected: boolean,
                             detectedChannelIndices: Set<ChannelNumber>): ReactNode[] {

        let channelIconX:number = (bankSelected ? 2 : 1);
        if (this.props.leftSideBank) {
            channelIconX = (bankSelected ? 22 : 23);
        }

        let channelIcons:ReactNode[] = [];
        const channelIconHeight:number = this.channelIconHeight;
        for (let channelNo of Object.values(ChannelNumber)) {
            channelIcons.push(<SDLCChannelIconG key={'' + bankNo + '-' + channelNo}
                                                id={SDLCChannelIconG.makeChannelKey(bankNo, channelNo)}
                                                channelNo={channelNo}
                                                bankNo={bankNo}
                                                bankSelected={bankSelected}
                                                detect={detectedChannelIndices.has(channelNo)}
                                                disabled={this.props.datum.channelsById[SDLCChannelIconG.makeChannelKey(bankNo, channelNo)].enabled === CCChanEnableOption.DISABLED}
                                                height={channelIconHeight}
                                                x={channelIconX}
                                                y={channelIconHeight*(SDLCG.toInt(channelNo) - 1)}
                                                onMouseEnter={this.props.onMouseEnter}
                                                onMouseLeave={this.props.onMouseLeave}
                              />);
        }
        return channelIcons;
    }

    /** converts e.g. 'CH_13' to 13 */
    public static toInt(channelNo: ChannelNumber):number {
        return +(channelNo.substr(3));
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

export default SDLCG;
