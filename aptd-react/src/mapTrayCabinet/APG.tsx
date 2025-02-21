import React, {ReactNode} from "react";
import './APG.css';
import {GUIAPConfig, GUIPoint} from "../AptdServerTypes";
import TopStore from "../TopStore";
import {ErrorKey, ObjectType} from "../AptdClientTypes";

const APIcon:any = require('../assets/icons/ap_diamond.png');

interface APGProps {
    datum: GUIAPConfig,
    mapImageLocation: GUIPoint,
    selected: boolean,
    onMouseDown: (event: React.MouseEvent<SVGGElement>)=>void,
    onClick: (event: React.MouseEvent<SVGGElement>)=>void,
    topStore: TopStore,
}
interface APGState {

}


export class APG extends React.Component<APGProps, APGState> {

    /*
    constructor(props: APGProps) {
        super(props);
    }
    */

    render() {
        const datum = this.props.datum;
        const dotid = datum.id;
        let gClassNames:string = "apGOuter apG draggable dotid-" + dotid;
        let rectClassNames:string = 'ap';
        const apWidth = 56;
        const apHeight = 56;

        const transform: string = "translate(" +
            (datum.info.position.x - apWidth/2 + this.props.mapImageLocation.x) + ", " +
            (datum.info.position.y - apHeight/2 + this.props.mapImageLocation.y) + ")";
        const apId: string = (datum.serialNumber === undefined ? '' : datum.serialNumber);

        if (this.props.selected) {
            rectClassNames += ' selected';
            gClassNames += ' selected';
        }
        const apText: string = (apId === '' ? 'Gateway' : 'Gateway ' + apId);
        return (
            <g className={gClassNames}
               transform={transform}
               onMouseDown={this.props.onMouseDown}
               onClick={this.props.onClick}
               data-dotid={datum.id}
               data-devicetype={ObjectType.AP}
            >
                <rect className={rectClassNames}
                      height={apHeight} width={apWidth} />
                <image
                       width={apWidth} height={apHeight}
                       xlinkHref={APIcon} className={'ap'}/>
                {this.renderValidationErrorMark(apWidth)}
                <text x="30" y="15" >
                    {apText}
                </text>

            </g>
        );
    }

    /**
     * ValidationError mark is currently a red star.
     * May want to use a separate mark such as yellow triangle
     * to differentiate from RF link error.
     * @param radius of the circle on the Map
     */
    renderValidationErrorMark(apWidth: number): ReactNode {
        let validationMark: ReactNode = null;
        if (this.hasValidationErrors()) {
            validationMark =
                <text x={apWidth  - 10}
                      y={14}
                      className='validationError'
                >*</text>
        }
        return validationMark;
    }

    private hasValidationErrors(): boolean {
        for (let validationKey of Object.keys(this.props.topStore.getTopState().validationErrors)) {
            let errorKey: ErrorKey = TopStore.parseValidationErrorsKey(validationKey);
            if (errorKey.objectType === ObjectType.AP) {
                return true;
            }
        }
        return false;
    }

}

export default APG;
