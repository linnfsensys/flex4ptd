import React from "react";
import './ProxyRepeaterMiniG.css';


interface ProxyRepeaterMiniGProps {
    pointX: number,
    pointY: number,
    dotid: string,
}


/**
 * ProxyRepeaterMiniG represents an svg g element containing representation of a
 * Repeater, and its children.
 * It appears ONLY while dragging a Repeater on the Map.
 */
export class ProxyRepeaterMiniG extends React.Component<ProxyRepeaterMiniGProps, any> {

    render() {
        const transform =
            "translate(" +
            (this.props.pointX - 7) +
            ", " +
            (this.props.pointY - 76) +
            ")";
        const repeaterWidth = 40;
        const repeaterHeight = 40;

        return (
            <g
                className={"proxy proxyRepeaterMiniG dotid-" + this.props.dotid}
                transform={transform}
                data-dotid={this.props.dotid}
            >
                <rect className={'repeaterRect'}
                      height={repeaterHeight}
                      width={repeaterWidth}
                      x={'-20'}
                />
                <polygon points={'-20 39, 0 0, 20 39'}
                         className={'triangle'}/>
                <text x="0" y="24">
                    {this.props.dotid}
                </text>
            </g>
        );
    }
}

export default ProxyRepeaterMiniG;