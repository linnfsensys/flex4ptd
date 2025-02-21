import React, {ReactNode} from "react";
import './CCLink.css';
import {GUIPoint, Line} from "../AptdServerTypes";
import {ObjectType} from "../AptdClientTypes";


interface CCLinkProps {
    /** dotId of the Sensor */
    dotId: string,
    mapImageLocation: GUIPoint,
    onMouseDown: (event: React.MouseEvent<SVGGElement>)=>void,
    selected?: boolean| undefined,
    detect?: boolean | undefined,
    lines?: Line[] | undefined,
    /** id of the cc card channel */
    dstId: string,
    channelType:  ObjectType.APGI_CHANNEL | ObjectType.CC_CHANNEL | ObjectType.SDLC_CHANNEL | ObjectType.STS_CHANNEL,
    critical: string
    dashedLine: boolean
}

/**
 * CCLink represents an svg g element containing representation of a
 * CCLink, and its children.  Basically it is an array of 1 or more line segments.
 * The Link is composed of one continuous polyline which is visible to the user as a
 * thin line when not selected as well as 'invisible' polylines for each segment of the polyline.
 * These are used to
 * 1. determine where a user has grabbed the line and where a new segment needs to be added, and
 * 2. these polylines are drawn thicker in the css file to serve as a buffer for the user to more
 *    easily grab the line to move.
 * Lastly there are also 'draggable points' which are rendered as small boxes when a user hovers
 * over a point in the polyline that separates two segments.
 */
export class CCLink extends React.Component<CCLinkProps, any> {

    render() {
        const draggableCCLines: ReactNode[] = this.renderDraggableLinks();
        const draggablePoints:ReactNode[] = this.renderHoverPointRect();
        const clearFillStyle = {fill: "#FFFFFF", stroke: "black"};

        const outerGClassNames = "ccLinkGOuter dotid-" + this.props.dotId;
        let visiblePolylineClassName = 'ccLinkPolyline';
        if (this.props.detect) {
            visiblePolylineClassName += ' detected';
        }
        if (this.props.selected) {
            visiblePolylineClassName += ' selected';
        }
        if (!this.props.critical && this.props.dashedLine) {
            visiblePolylineClassName += ' NON_CRITICAL';
        }
        visiblePolylineClassName += ' deviceId-' + this.props.dotId;

        let points:string = '';
        // render the visible polyline that represents the CCLink to user
        let endpoint:GUIPoint = {x:0, y:0}
        if (this.props.lines !== undefined && this.props.lines.length > 0) {
            const line:Line = this.props.lines[0];
            points = '' + (line.aPoint.x + this.props.mapImageLocation.x) + ' ' +
                          (line.aPoint.y + this.props.mapImageLocation.y);
            for (let line_index = 0; line_index < this.props.lines.length - 1; ++line_index) {
                points += ',' + (this.props.lines[line_index].bPoint.x + this.props.mapImageLocation.x) + ' ' +
                                (this.props.lines[line_index].bPoint.y + this.props.mapImageLocation.y);
            }
            // The final point connects to the cabinet which is not in the same coordinate system
            // as the inner map.
            // So we do not draw the point in respect to the current map image location,
            // but instead the raw location of the ccCard.
            points += ',' + (this.props.lines[this.props.lines.length-1].bPoint.x) + ' ' +
                            (this.props.lines[this.props.lines.length-1].bPoint.y);
            endpoint = this.props.lines[this.props.lines.length-1].bPoint;
            if (this.props.channelType === ObjectType.APGI_CHANNEL ||
                this.props.channelType === ObjectType.STS_CHANNEL) {
                endpoint.x -= 2;  // a fudge factor so endpoint is easier to see and grab
            } else if (this.props.channelType === ObjectType.SDLC_CHANNEL) {
                endpoint.x -= 1;
                endpoint.y += 2;
            }
        }

        return (
            <g className={outerGClassNames}>
                {/* following polyline is what user sees */}
                <polyline points={points}
                          className={visiblePolylineClassName}
                          data-deviceid={this.props.dotId}
                          data-dstid={this.props.dstId}
                />
                <circle cx={endpoint.x} cy={endpoint.y} r={3} style={clearFillStyle}/>
                {/* following points and line segments are not visible but make broader click target */}
                <g className='draggableCCPointsAndLines'>
                    {draggablePoints}
                    {draggableCCLines}
                </g>
            </g>
        );
    }


    /**
     * For each line segment within the CCLink, draw a thick, clear polyline.
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
                points = '' + (line.aPoint.x + this.props.mapImageLocation.x) + ' ' + (line.aPoint.y + this.props.mapImageLocation.y);
                if (segementIndex < this.props.lines.length - 1) {
                    points += ', ' + (line.bPoint.x + this.props.mapImageLocation.x) + ' ' + (line.bPoint.y + this.props.mapImageLocation.y);
                }
                else {
                    //The final point connects to the cabinet which is not in the same coordinate system as the inner map
                    //So we do not draw the point in respect to the current map image location, but instead the raw location of the ccCard
                    points += ', ' + (line.bPoint.x) + ' ' + (line.bPoint.y);
                }
                draggableLinks.push(
                    <polyline points={points}
                        key={'ccLinkPlB-' + this.props.dotId + '-' + this.props.dstId + segementIndex}
                        className={'ccLinkPolylineBuffer draggable deviceId-' + this.props.dotId}
                        data-deviceid={this.props.dotId}
                        data-dstid={this.props.dstId}
                        data-segmentid={segementIndex}
                        onMouseDown={this.props.onMouseDown}
                        data-devicetype={ObjectType.CC_LINK}
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
                    x: (this.props.lines[line_index].bPoint.x + this.props.mapImageLocation.x) - 5,
                    y: (this.props.lines[line_index].bPoint.y + this.props.mapImageLocation.y) - 5,
                }
                draggablePoints.push(
                	<rect key={'ccLinkRect-' + this.props.dotId + '-' + this.props.dstId + line_index}
                    	className={"ccLinkPolylineBuffer draggable point"}
                        data-deviceid={this.props.dotId}
                        data-dstid={this.props.dstId}
                        data-segmentid={line_index}
                        onMouseDown={this.props.onMouseDown}
                        data-devicetype={ObjectType.CC_LINK}
                        x={point.x} y={point.y}
                        height="10" width="10"
                    />
                );
            }
        }
        return draggablePoints;
    }

}

export default CCLink;
