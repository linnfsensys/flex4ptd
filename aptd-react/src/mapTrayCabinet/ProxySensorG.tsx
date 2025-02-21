import React from "react";
import './ProxySensorG.css';


interface ProxySensorGProps {
    pointX: number,
    pointY: number,
    dotid: string,
    helpGesturePresent?: boolean,
}


/**
 * ProxySensorG represents an svg g element containing representation of a
 * Sensor, and its children.
 * It appears ONLY while dragging a Sensor on the Map.
 */
export class ProxySensorG extends React.Component<ProxySensorGProps, any> {

    render() {
        const transform =
            "translate(" +
            //(this.props.pointX + 5) +
            (this.props.pointX - 10) +
            ", " +
            //(this.props.pointY - 50) +
            (this.props.pointY - 50 - 30) +
            ")";

        return (
            <g
                className={"proxy proxySensorG dotid-" + this.props.dotid}
                transform={transform}
                data-dotid={this.props.dotid}
            >
                <circle cx="0" cy="20" r="20" className='circle'/>
                <text x="0" y="20">
                    {this.props.dotid}
                </text>

                {this.props.helpGesturePresent &&
                    <g>
                        <circle className={'proxyhelpgesturecircle'} cx={0} cy="20"/>
                        <circle className={'innerproxyhelpgesturecircle'} cx={0} cy="20"/>
                    </g>
                }
            </g>
        );
    }
}

export default ProxySensorG;
