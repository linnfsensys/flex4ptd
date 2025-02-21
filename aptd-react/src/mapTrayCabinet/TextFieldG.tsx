import * as React from 'react';
import './MapAndTray.css';
import {ObjectType, TextField} from "../AptdClientTypes";
import {GUIPoint} from "../AptdServerTypes";
import { ReactNode } from 'react';
import {Point} from "./MapAndTray";

interface TextFieldGProps {
    /** id is e.g. "textField2" */
    id: string,
    textField: TextField,
    mapImageScale: number,
    selectedDotid: string | null,
    textFieldStartPosition: GUIPoint,
    mapPan: Point,
    onClick: (event: React.MouseEvent<SVGGElement>)=>void,
    onMouseDown: (event: React.MouseEvent<SVGGElement>)=>void,
}
interface TextFieldGState {
}

/**
 * Class represents a single TextField in the MapAndTray UI, which is
 * represented by a top level svg g (group).
 */
class TextFieldG extends React.Component<TextFieldGProps, TextFieldGState> {

    render() {
        const rotationRadius = 4*this.props.mapImageScale;
        const rotationConnectionWidth = 13*this.props.mapImageScale;
        const clearFillStyle = { fill: "#FFFFFF" };

        let textFieldValue: TextField = this.props.textField;
        let textBodyClassNames = 'textFieldBody ';
        let deleteCircleClassNames = 'deleteText ';
        let deleteTextClassNames = 'deleteX ';
        let rotationConnectionClassNames = 'rotateIconConnecton ';
        let rotationCircleClassNames = 'rotateIcon ';
        if (this.props.selectedDotid !== null && this.props.selectedDotid === this.props.id) {
            textBodyClassNames += 'selected';
            deleteCircleClassNames += 'selected';
            deleteTextClassNames += 'selected';
            rotationConnectionClassNames += 'selected';
            rotationCircleClassNames += 'selected';
        }

        if (textFieldValue !== null && textFieldValue !== undefined) {
            let currentPosition = textFieldValue.position;
            // prefer editText from current InfoPanelTextField if available
            let tfText:string = textFieldValue.editText !== undefined ?
                textFieldValue.editText : textFieldValue.text;
            if (tfText === undefined || tfText === null) {
                console.error('unexpected undefined tfText');
                return null;
            }
            if (tfText === "") {
                tfText = " ";
            }
            const newLines:string[] = tfText.split('\n');
            const height = (newLines.length * (11*this.props.mapImageScale)) + (8*this.props.mapImageScale)
            let width = 0;
            let textLines: ReactNode[] = [];
            for (let line_index = 0; line_index < newLines.length; ++line_index) {
                const yPos = ((line_index+1)*(this.props.mapImageScale*11));
                const lineId = this.props.id + line_index;
                // TODO: is it necessary to do this expensive operation?
                const currentText = document.getElementById(lineId);
                if (currentText !== null) {
                    const font_size = (12*this.props.mapImageScale);
                    currentText.style.cssText= "text-anchor: start; font-size: " +font_size +"px;";
                }
                // Q: is it necessary to do this expensive operation?
                // A: I think so because we need to be able to measure it.  chicken/egg issue.
                const el = document.getElementsByTagName('text');
                const textFieldText = el.namedItem(lineId);
                let length = 0;
                if (textFieldText !== null) {
                    length = textFieldText.getComputedTextLength();
                } else {
                    if (newLines[line_index] !== "") {
                        textBodyClassNames += ' invisible';
                    }
                }
                if (length >= width) {
                    width = length;
                }
                textLines.push(
                    <text key={lineId} id={lineId}
                          className={textBodyClassNames}
                          x={10 + rotationConnectionWidth}
                          y={yPos}
                    >
                        {newLines[line_index]}
                    </text>
                );
            }
            /* hr: for bug 14449.  need to show case where text is empty
            if (width <= 0) {
                textBodyClassNames += ' invisible';
                rotationConnectionClassNames = 'rotateIconConnecton';
                rotationCircleClassNames = 'rotateIcon';
                deleteCircleClassNames = 'deleteText';
                deleteTextClassNames = 'deleteX';
            }
            */
            width = width + 20;

            let transformPosition: GUIPoint = {x: 0, y: 0};
            if (currentPosition === null) {
                currentPosition = {x: 0, y: 0};
            }
            transformPosition = {
                x: this.props.textFieldStartPosition.x +
                    (this.props.mapPan.x + currentPosition.x)*this.props.mapImageScale,
                y: this.props.textFieldStartPosition.y +
                    (this.props.mapPan.y + currentPosition.y)*this.props.mapImageScale,
            };
            let transform = "translate(" +
                (transformPosition.x - width/2 - rotationConnectionWidth) + ", " +
                (transformPosition.y - height/2) + ")";
            let rotationDegrees = textFieldValue.rotationDegrees;
            if (rotationDegrees !== 0) {
                transform +=
                    " translate( " + (width/2 + rotationConnectionWidth) + ", " + (height/2) + ") " +
                    "rotate(" + rotationDegrees+ ") " +
                    "translate( -" + (width/2 + rotationConnectionWidth) + ", -" + (height/2)+ ")";
            }

            return (
                <g className={'gTextFieldOuter selectable'}
                    transform={transform}
                    data-dotid={this.props.id}
                    >
                    {/* the rotate handle: a line (implemented as rect) and a circle */}
                    <g className={'gTextFieldRotate draggable'}
                        onMouseDown={this.props.onMouseDown}
                        data-dotid={this.props.id}
                        data-devicetype={'gTextFieldRotate'}
                        >
                        <rect className={rotationConnectionClassNames}
                              x={0} y={height/2}
                              height="1"
                              width={rotationConnectionWidth}/>
                        <circle cx={0} cy={height/2} r={rotationRadius}
                                className={rotationCircleClassNames}
                                style={clearFillStyle}
                        />
                    </g>
                    {/* Body of the textfield */}
                    <g className={'gTextFieldBody draggable'}
                        onMouseDown={this.props.onMouseDown}
                        data-dotid={this.props.id}
                        data-devicetype={ObjectType.TEXT_FIELD}
                        onClick={this.props.onClick}
                        >
                        <rect id={'Rect'+this.props.id} className={textBodyClassNames}
                              x={rotationConnectionWidth} y={0}
                              height={height} width={width}
                              rx={5} ry={5}/>
                        {textLines}
                    </g>
                    <g className={'deleteTextFieldG selectable'}
                        onClick={this.props.onClick}
                        data-dotid={this.props.id}
                        data-devicetype={'deleteTextFieldG'}
                        >
                        <circle cx={width+rotationConnectionWidth} cy={0} r={6}
                                className={deleteCircleClassNames}
                                style={clearFillStyle}/>
                        <text x={width+rotationConnectionWidth} y={0}
                              className={deleteTextClassNames}>x</text>

                        <g className={'hoverTextG'}>
                            <rect x={width+rotationConnectionWidth + 10} y={'-10'} height={'20'} width={'40'} className={'hoverRect'}/>
                            <text x={width+rotationConnectionWidth + 13} y={'1'} className={'hoverText'}>Delete</text>
                        </g>
                    </g>
                </g>
            );
        }
        return null;
    }
}

export default TextFieldG;
