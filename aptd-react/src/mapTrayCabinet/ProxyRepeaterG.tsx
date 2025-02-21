import React from "react";
import './ProxyRepeaterG.css';


interface ProxyRepeaterGProps {
    pointX: number,
    pointY: number,
    dotid: string,
}


/**
 * ProxyRepeaterG represents an svg g element containing representation of a
 * Repeater, and its children.
 * It appears ONLY while dragging a Repeaterr on the Map.
 */
export class ProxyRepeaterG extends React.Component<ProxyRepeaterGProps, any> {

    render() {
        const transform =
            "translate(" +
            //(this.props.pointX + 5) +
            (this.props.pointX - 10) +
            ", " +
            //(this.props.pointY - 50) +
            (this.props.pointY - 50 - 30) +
            ")";
        const repeaterWidth = 40;
        const repeaterHeight = 40;

        return (
            <g
                className={"proxy proxyRepeaterG dotid-" + this.props.dotid}
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

export default ProxyRepeaterG;