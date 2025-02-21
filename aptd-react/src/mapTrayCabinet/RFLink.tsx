import React, { ReactNode } from "react";
import './RFLink.css';
import {Line, GUIPoint} from "../AptdServerTypes";
import { ObjectType } from "../AptdClientTypes";


interface RFLinkProps {
    /** dotId of the downstream Sensor or Repeater */
    dotId: string,
    mapImageLocation: GUIPoint,
    onMouseDown: (event: React.MouseEvent<SVGGElement>)=>void,
    selected?: boolean | null,
    lines?: Line[] | undefined,
    /** id of the upstream Radio or Repeater */
    dstId: string,
}


/**
 * RFLink represents an svg g element containing representation of a
 * RFLink, and its children.  Basically it is an array of 1 or more line segments.
 * The Link is composed of one continuous polyline which is visible to the user as a thin line when not selected
 * as well as 'invisible' individual lines for each segment of the polyline.
 * These are used to 1. determine where a user has grabbed the line and where a new segment needs to be added
 * and 2. these polylines are drawn thicker in the css file to serve as a buffer for the user to more easily grab the line to move
 * Lastly there are also 'draggable points' which are rendered as small boxes when a user hovers over a point in the 
 * polyline that separates two segments 
 */
export class RFLink extends React.Component<RFLinkProps, any> {

    render() {

        const allDraggableRfLinks: ReactNode[] = this.renderDraggableLinks();
        const allDraggablePoints:ReactNode[] = this.renderHoverPointRect();

        let outerGClassNames = "rfLinkGOuter dotid-" + this.props.dotId;
        let visiblePolylineClassName = 'rfLinkPolyline'
        if (this.props.selected) {
            visiblePolylineClassName += ' selected'
        }
        visiblePolylineClassName += ' deviceId-' + this.props.dotId

        let points: string = '';
        // render the visible polyline that represents the RFLink to user
        if (this.props.lines !== undefined && this.props.lines.length > 0) {
            let line:Line = this.props.lines[0];
            points = '' + (line.aPoint.x + this.props.mapImageLocation.x) + ' ' +
                          (line.aPoint.y + this.props.mapImageLocation.y);
            for (let line of this.props.lines) {
                points += ', ' + (line.bPoint.x + this.props.mapImageLocation.x) + ' ' +
                                 (line.bPoint.y + this.props.mapImageLocation.y);
            }
        }

        return (
             <g className={outerGClassNames}>
                <polyline points={points}
                    className={visiblePolylineClassName}
                    data-deviceid={this.props.dotId}
                    data-dstid={this.props.dstId}
                />

                <g className='allDraggableRfLinks'>
                    {
                        allDraggablePoints
                    }
                    {
                        allDraggableRfLinks
                    }
                </g>
            </g>
        );
    }

	/**
     * For each line segment within the RFLink, draw a thick, clear polyline.
     * This is invisible to the user, but (1) lets us get the mouseDown event and
     * (2) have one object per segment.
     */
    private renderDraggableLinks(): ReactNode[] {
        let draggableLinks: ReactNode[] = [];

        if (this.props.lines !== undefined && this.props.lines.length > 0) {

            let segementIndex = -1;
            let points = '';
            for (let line of this.props.lines) {
                segementIndex += 1;
                if (segementIndex === 0) {
                    points = '' + (line.aPoint.x + this.props.mapImageLocation.x) + ' ' + (line.aPoint.y + this.props.mapImageLocation.y);
                }
                else {
                    points = '' + (line.aPoint.x + this.props.mapImageLocation.x) + ' ' + (line.aPoint.y + this.props.mapImageLocation.y);
                }

                points += ', ' + (line.bPoint.x + this.props.mapImageLocation.x) + ' ' + (line.bPoint.y + this.props.mapImageLocation.y);

                draggableLinks.push(

                    <polyline key={'rfLinkPlB-' + this.props.dotId + '-' + this.props.dstId + segementIndex}
                    	points={points}
                        className={'rfLinkPolylineBuffer draggable deviceId-' + this.props.dotId}
                        data-deviceid={this.props.dotId}
                        data-dstid={this.props.dstId}
                        data-segmentid={segementIndex}
                        onMouseDown={this.props.onMouseDown}
                        data-devicetype={ObjectType.RF_LINK}
                    />
                );
            }
        }

        return draggableLinks;
    }

    private renderHoverPointRect(): ReactNode[] {

        let draggablePoints: ReactNode[] = [];

        if (this.props.lines !== undefined && this.props.lines.length > 0) {
            for (let line_index = 0; line_index < this.props.lines.length - 1; ++line_index) {
                let point = {
                    x: this.props.lines[line_index].bPoint.x + this.props.mapImageLocation.x - 5,
                    y: this.props.lines[line_index].bPoint.y + this.props.mapImageLocation.y - 5,
                }
                draggablePoints.push(
                    <rect key={'rfLinkRect-' + this.props.dotId + '-' + this.props.dstId + line_index}
                    	className={"rfLinkPolylineBuffer draggable point"}
                        data-deviceid={this.props.dotId}
                        data-dstid={this.props.dstId}
                        data-segmentid={line_index}
                        onMouseDown={this.props.onMouseDown}
                        data-devicetype={ObjectType.RF_LINK}
                        x={point.x} y={point.y}
                        height="10" width="10"
                    />
                );
            }
        }
        return draggablePoints;
    }
}

export default RFLink;
