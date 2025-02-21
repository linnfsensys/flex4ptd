import * as React from 'react';
import {ReactNode} from 'react';
import './HelpEngineBalloon.css';
import {ActionGroup, ObjectType, UpdateType} from "../AptdClientTypes";
import {GUIPoint} from "../AptdServerTypes";
import HelpEngine, {Balloon, Change, HelpLocType} from './HelpEngine';

interface HelpEngineBalloonProps {
    /** balloon id, e.g. "SaveBalloon0" */
    id: string,
    balloon: Balloon,
    position: GUIPoint,
    mapImageScale: number,
    helpEngine: HelpEngine,
    onHelpGuideClicked: ()=>void,
}
interface HelpEngineBalloonState {
}

/**
 * This class implements the HelpEngineBalloon rendering.
 * The state control code is in HelpEngine.ts,
 * while the data for 1st help tutorial is HelpDefaultPath.ts
 */
class HelpEngineBalloon extends React.Component<HelpEngineBalloonProps, HelpEngineBalloonState> {

    constructor(props: HelpEngineBalloonProps) {
        super(props);
        this.onSkipButtonClicked = this.onSkipButtonClicked.bind(this);
        this.onCloseButtonClicked = this.onCloseButtonClicked.bind(this);
    }

    render() {
        let balloonText:string = this.props.balloon.text;
        let helpBalloonRectClassName:string = 'helpBalloonRect';
        const skipStepRectClassName:string = 'skipRect';
        const closeStepRectClassName:string = 'closeRect';
        let rerenderNeeded = false;
        const final:boolean|undefined = this.props.helpEngine.getCurrentState().final;
        const showClose: boolean = (final === undefined ? false : final);

        if (balloonText !== null && balloonText !== undefined) {
            let newLines:string[] = balloonText.split('\n');
            const balloonHeight:number = (newLines.length * 16 * this.props.mapImageScale) +
                                         (20*this.props.mapImageScale);
            let balloonWidth:number = 0;

            let currentPosition:GUIPoint = this.props.position;
            currentPosition.x = currentPosition.x * this.props.mapImageScale;

            switch (this.props.balloon.location.helpLocType) {
                case HelpLocType.MAP_OBJECT:
                case HelpLocType.MAP_UPPER_LEFT_QUADRANT:
                case HelpLocType.MAP_UPPER_RIGHT_QUADRANT:
                    currentPosition.y = (currentPosition.y * this.props.mapImageScale) - balloonHeight/2;
                    break;
                case HelpLocType.MAP_LOWER_LEFT_QUADRANT:
                case HelpLocType.MAP_LOWER_RIGHT_QUADRANT:
                    currentPosition.y = (currentPosition.y * this.props.mapImageScale) - balloonHeight;
                    break;
                case HelpLocType.TRAY:
                    break;
                default:
                    break;
            }

            let textLines: ReactNode[] = [];
            for (let line_index = 0; line_index < newLines.length; ++line_index) {
                const yPos:number = ((line_index+1)*(this.props.mapImageScale*16)) + currentPosition.y;
                const lineId:string = this.props.id + line_index;  // e.g. 'SaveBalloon02'
                const currentText:HTMLElement|null = document.getElementById(lineId);
                if (currentText !== null) {
                    let font_size = (14*this.props.mapImageScale);
                    currentText.style.cssText= "text-anchor: start; font-size: " +font_size +"px;";
                }
                const textEls: HTMLCollectionOf<SVGTextElement> = document.getElementsByTagName('text');
                const textFieldText: SVGTextElement|null = textEls.namedItem(lineId);
                if (textFieldText !== null) {
                    const textLength: number = textFieldText.getComputedTextLength();
                    //helpTextClassName = 'helpText';
                    balloonWidth = Math.max(textLength, balloonWidth);
                } else {
                    rerenderNeeded = true;
                }
                const textItem = <text key={lineId} id={lineId}
                                       className='helpText'
                                       x={currentPosition.x + 10}
                                       y={yPos}>{newLines[line_index]}
                                 </text>;
                textLines.push(textItem);
            }

            /**
             * Don't show the balloon the first time it is rendered.
             * This is to avoid the chicken-and-egg problem that it must be already rendered in order
             * to calculate the width/height.
             */
            if (balloonWidth <= 0) {
                helpBalloonRectClassName += ' invisible';
            }
            balloonWidth = balloonWidth + 20;
            if (this.props.balloon.skipButtonPresent || showClose) {
                balloonWidth = balloonWidth + 50;
            }

            let skipStepRectWidth = 45;
            let skipStepRectHeight = 15;
            let skipStepRectPos = {
                x: currentPosition.x + (balloonWidth - skipStepRectWidth - 10),
                y: currentPosition.y + (balloonHeight - skipStepRectHeight - 10)
            };

            if (rerenderNeeded) {
                // TODO: this is considered bad form in React.
                //       But I do it to avoid chicken-and-egg proboem
                //       of needing to rerender after width is calculated.
                //       Another approach: use getSnapshotBeforeUpdate()
                this.forceUpdate();
            }

            return (
                <g className={'gHelpEngineBalloon'}
                    data-dotid={this.props.id}
                >
                    {/* Body of the Help Balloon */}
                    <g className={'gHelpEngineBalloonBody'}
                        data-dotid={this.props.id}
                        data-devicetype={ObjectType.HELP_BALLOONS}
                    >
                        <rect id={this.props.id}
                              className={helpBalloonRectClassName}
                              x={currentPosition.x} y={currentPosition.y}
                              height={balloonHeight} width={balloonWidth}
                              rx={5} ry={5}/>

                        {textLines}

                        {this.props.balloon.skipButtonPresent ?
                            <g className={'gHelpEngineSkipButton'}
                               data-dotid={this.props.id}
                               data-devicetype={ObjectType.HELP_BALLOONS}
                               onClick={this.onSkipButtonClicked}
                            >
                                <rect id={'skipButton'+this.props.id}
                                      className={skipStepRectClassName}
                                      x={skipStepRectPos.x} y={skipStepRectPos.y}
                                      height={skipStepRectHeight} width={skipStepRectWidth}
                                      rx={3} ry={3}/>
                                <text key={'skipText' + this.props.id}
                                      className={skipStepRectClassName}
                                      x={skipStepRectPos.x + skipStepRectWidth / 2}
                                      y={skipStepRectPos.y + skipStepRectHeight / 2 + 1}>
                                    skip&gt;&gt;
                                </text>
                            </g>
                            :
                            null
                        }

                        {showClose ?
                            <g className={'gHelpEngineCloseButton'}
                               data-dotid={this.props.id}
                               data-devicetype={ObjectType.HELP_BALLOONS}
                               onClick={this.onCloseButtonClicked}
                            >
                                <rect id={'closeButton'+this.props.id}
                                      className={closeStepRectClassName}
                                      x={skipStepRectPos.x} y={skipStepRectPos.y}
                                      height={skipStepRectHeight} width={skipStepRectWidth}
                                      rx={3} ry={3}/>
                                <text key={'closeText' + this.props.id}
                                      className={closeStepRectClassName}
                                      x={skipStepRectPos.x + skipStepRectWidth / 2}
                                      y={skipStepRectPos.y + skipStepRectHeight / 2 + 1}>
                                    OK
                                </text>
                            </g>
                            :
                            null
                        }
                    </g>
                </g>
            );
        }
        return null;
    }


    private onSkipButtonClicked(event: React.MouseEvent<SVGElement, MouseEvent>):void {
        let objectId = "skip";
        if (this.props.balloon.location.locObjectId !== undefined) {
            objectId = this.props.balloon.location.locObjectId;
        }
        const actionGroup: ActionGroup = {
            actions: [{
                objectId: objectId,
                objectType: ObjectType.SENSOR_ZONE,
                newData: null,
                updateType: UpdateType.UPDATE,
            }],
            description: "skip"
        };
        this.props.helpEngine.changeState(Change.NEXT, actionGroup);
    }

    /**
     * Close button is only for final states.
     * It will close the Help Balloon, but also is same as "Hide Help" button.
     */
    private onCloseButtonClicked(event: React.MouseEvent<SVGElement, MouseEvent>):void {
        this.props.onHelpGuideClicked();
    }
}

export default HelpEngineBalloon;
