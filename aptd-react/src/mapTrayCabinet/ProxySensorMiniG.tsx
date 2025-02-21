import React from "react";
import './ProxySensorMiniG.css';


interface ProxySensorMiniGProps {
    pointX: number,
    pointY: number,
    dotid: string,
}


/**
 * ProxySensorMiniG represents an svg g element containing representation of a
 * Sensor, and its children.
 * It appears ONLY while dragging a Sensor on the Map.
 * The mini version is used when user is dragging starting from a Sensor on Map.
 */
export class ProxySensorMiniG extends React.Component<ProxySensorMiniGProps, any> {

    render() {
        const transform =
            "translate(" +
            (this.props.pointX - 17) + ", " + (this.props.pointY - 67) +
            ")";

        return (
            <g
                className={"proxy proxySensorMiniG dotid-" + this.props.dotid}
                transform={transform}
                data-dotid={this.props.dotid}
            >
                <circle cx="12.5" cy="12.5" r="12.5" className='circle'/>
                <text x="12.5" y="12.5">
                    {this.props.dotid}
                </text>
            </g>
        );
    }
}

export default ProxySensorMiniG;
