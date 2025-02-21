import React, { ReactNode } from "react";
import './RadioG.css';
import {ErrorKey, GlobalErrorKey, GUIRadioClient, ObjectType} from "../AptdClientTypes";
import { GUIPoint } from "../AptdServerTypes";
import TopStore from "../TopStore";
import {MapDeviceUtils} from "./MapDeviceUtils";

const RadioIcon:any = require('../assets/icons/spp.png');

interface RadioGProps {
    key: string,
    id: string,
    mapImageLocation: GUIPoint,
    datum: GUIRadioClient,
    selected: boolean,
    onMouseDown: (event: React.MouseEvent<SVGGElement>)=>void,
    onMouseEnter: (event: React.MouseEvent<SVGGElement>)=>void,
    onMouseLeave: (event: React.MouseEvent<SVGGElement>)=>void,
    onClick: (event: React.MouseEvent<SVGGElement>)=>void,
    topStore: TopStore,
}
interface RadioGState {

}

const WarningIcon:any = require('../assets/icons/icons8-warning-96.png');

export class RadioG extends React.Component<RadioGProps, RadioGState> {

    /*
    constructor(props: RadioGProps) {
        super(props);
    }
    */

    render() {
        const datum:GUIRadioClient = this.props.datum;
        const dotid = datum.id;
        let gClassNames = "radioGOuter radioG draggable dotid-" + dotid;
        let rectClassNames = 'radio';
        const radioWidth = 56;
        const radioHeight = 56;

        const percentComplete:number = ((this.props.datum.percentComplete !== undefined) ?
            this.props.datum.percentComplete : 0);

        // We set up the transform so that the datum.info.position is at the center
        // of the MapRepeaterG rect
        const transform = "translate(" +
            (datum.info.position.x - radioWidth/2 + this.props.mapImageLocation.x) + ", " +
            (datum.info.position.y - radioHeight/2+ this.props.mapImageLocation.y) + ")";

        if (this.props.selected) {
            rectClassNames += ' selected';
            gClassNames += ' selected';
        }
        const unheardMark: ReactNode = this.renderUnheardWarningMark(0, 30);
        const deficiencyMark: ReactNode = this.renderDeficiencyMark(radioWidth-6);
        return (
            <g className={gClassNames}
               transform={transform}
               onMouseDown={this.props.onMouseDown}
               onMouseEnter={this.props.onMouseEnter}
               onMouseLeave={this.props.onMouseLeave}
               onClick={this.props.onClick}
               data-dotid={datum.id}
               data-devicetype={ObjectType.RADIO}
            >
                <rect className={rectClassNames}
                      height={radioHeight} width={radioWidth} />
                <image //x={'5'} y={'5'}
                       width={radioWidth} height={radioHeight}
                       xlinkHref={RadioIcon} className={'radio'}/>

                {MapDeviceUtils.renderFirmwareProgress(datum,radioWidth/2, radioHeight/4.5, percentComplete)}

                <text x="30" y="15" >
                    {/* should say Radio-0 or Radio-1 */}
                    Radio-{datum.apConnection.replace('SPP', '')}
                </text>

                {unheardMark}
                {deficiencyMark}
            </g>
        );
    }

    renderUnheardWarningMark(xOffset: number, yOffset: number): ReactNode {
        let unheardMark: ReactNode = null;
        if (this.props.datum.unheard === true) {
            unheardMark =
                <image id='unheard'
                       x={xOffset}
                       y={yOffset}
                       width='15'
                       height='15'
                       xlinkHref={WarningIcon}
                />
        }
        return unheardMark;
    }

    /**
     * Deficiency mark is currently a red asterisk.
     * It is currently implemented only for missing RF Link,
     * and any errors in the Info Panel.
     * @param xOffset of the center of square behind the icon on the Map
     * TODO: could be in a common ancestor.  This is used elsewhere
     */
    private renderDeficiencyMark(xOffset: number): ReactNode {
        let deficiencyMark: ReactNode = null;
        if (this.hasValidationErrors()) {
            deficiencyMark =
                <text x={xOffset}
                      y={30}
                      className='deficient'
                >*</text>
        }
        return deficiencyMark;
    }

    /** TODO: method is duplicated in MapSensorG, MapRepeaterG */
    private hasValidationErrors(): boolean {
        for (let validationKey of Object.keys(this.props.topStore.getTopState().validationErrors)) {
            let errorKey: ErrorKey = TopStore.parseValidationErrorsKey(validationKey);
            if (errorKey.objectType === ObjectType.RADIO && errorKey.objectId === this.props.id) {
                return true;
            }
        }
        for (let validationKey of Object.keys(this.props.topStore.getTopState().validationGlobalErrors)) {
            let errorKey: GlobalErrorKey = TopStore.parseValidationGlobalErrorsKey(validationKey);
            if (errorKey.objectType === ObjectType.RADIO && errorKey.objectId === this.props.id) {
                return true;
            }
        }
        return false;
    }

}

export default RadioG;
