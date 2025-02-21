import React, {Component, ReactNode} from 'react';
import '../infoPanels/InfoPanel.css';
import './ReadOnlyField.css';
import {ObjectType} from "../AptdClientTypes";

interface ReadOnlyFieldProps {
    label: string,
    text: string,
    idName: string,
    fieldName: string,
    deviceType: ObjectType,
    deviceId: string,
    theClassName?: string,
}

interface ReadOnlyFieldState {

}

/**
 * A generalized Component that represents an underlying label and read-only text field.
 * This Component supports a Controlled Form
 */
export default class ReadOnlyField extends Component<ReadOnlyFieldProps, ReadOnlyFieldState> {

    constructor(props: ReadOnlyFieldProps) {
        super(props);
        this.state = {
        };
    }

    render() {
        let inputClass: string = 'cell readOnlyInput';
        if (this.props.theClassName !== undefined) {
            inputClass += ' ' + this.props.theClassName;
        }
        const row:ReactNode = (
            <tr className={'readOnlyField row'}>
                <td className={'right'}>
                    <label htmlFor={this.props.idName}
                           className='cell right readOnlyLabel'>{this.props.label}&nbsp;
                    </label>
                </td>
                <td>
                    <input id={this.props.idName} type={'text'}
                           value={this.props.text}
                           className={inputClass}
                           readOnly={true}
                           disabled={true}
                    />
                </td>
            </tr>
        );
        return row;
    }
}