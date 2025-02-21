import * as React from 'react';
import './MapAndTray.css';
import {ObjectType} from "../AptdClientTypes";
import {GUIPoint} from "../AptdServerTypes";

interface NorthArrowIconProps {
    northArrowPosition: GUIPoint,
    mapWidth: number,
    mapHeight: number,
    mapImageLocation: GUIPoint,
    northArrowIconRotation: number,
    northArrowIconWidth: number,
    northArrowIconHeight: number,
    selected: boolean,
    onClick: (event: React.MouseEvent<SVGGElement>)=>void,
    onMouseDown: (event: React.MouseEvent<SVGGElement>)=>void,
}
interface NorthArrowIconState {
}

const NorthArrow:any = require('../assets/icons/north_arrow_icon.png');

class NorthArrowIcon extends React.Component<NorthArrowIconProps, NorthArrowIconState> {

    render() {
        let currentIconPosition = {...this.props.northArrowPosition};
        currentIconPosition.x = this.props.mapImageLocation.x + currentIconPosition.x;
        currentIconPosition.y = this.props.mapImageLocation.y + currentIconPosition.y;

        let transform = "translate(" + (currentIconPosition.x) + ", " + (currentIconPosition.y) + ")";
        let rotationDegrees = this.props.northArrowIconRotation;
        if (rotationDegrees !== 0) {
            transform += " translate( " + this.props.northArrowIconWidth/2 + ", " + this.props.northArrowIconHeight/2 + ") rotate(" + rotationDegrees+ ") translate( -" + this.props.northArrowIconWidth/2 + ", -" + this.props.northArrowIconHeight/2 + ")";
        }

        const clearFillStyle = { fill: "#FFFFFF" };
        let rotationConnectionClassNames = 'rotateIconConnecton ';
        let rotationCircleClassNames = 'rotateIcon ';
        if (this.props.selected === true) {
            rotationConnectionClassNames += 'selected';
            rotationCircleClassNames += 'selected';
        }
        return (
            <g className={'gNorthArrowIconOutter selectable'}
                data-devicetype={ObjectType.MAP_NORTH_ARROW_ICON}
                transform={transform}
                onClick={this.props.onClick}
            >
                {/* the rotate handle: a line (implemented as rect) and a circle */}
                <g className={'gNorthArrowIconRotate draggable'}
                    onMouseDown={this.props.onMouseDown}
                    data-dotid={'rotate'}
                    data-devicetype={ObjectType.MAP_NORTH_ARROW_ICON}
                >
                   	<rect className={rotationConnectionClassNames}
                          x={this.props.northArrowIconWidth/2} y={-15}
                          height="15" width="1" />
                    <circle cx={this.props.northArrowIconWidth/2} cy={-15} r="5"
                            className={rotationCircleClassNames}
                            style={clearFillStyle} />
                </g>
                <g className={'gNorthArrowIcon draggable'}
                    data-dotid={'image'}
                    data-devicetype={ObjectType.MAP_NORTH_ARROW_ICON}
                >
                    <image x={0} y={0}
                           width={this.props.northArrowIconWidth}
                           height={this.props.northArrowIconHeight}
                           xlinkHref={NorthArrow}
                           id='mapNorthArrow'/>
                </g>
        	</g>
    	);
    }
}

export default NorthArrowIcon;
