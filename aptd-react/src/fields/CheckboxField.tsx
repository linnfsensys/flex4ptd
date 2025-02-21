import React, {ChangeEvent, Component, ReactNode} from 'react';
import {ObjectType, EnactType, UpdateType, Action} from "../AptdClientTypes";
import UndoManager from "../UndoManager";
import TopStore from "../TopStore";

export interface Option {
    value: string,
    text: string
}

interface CheckboxFieldProps {
    label: string,
    /** if undefined, defaults to true */
    showLabel?: boolean,
    value: boolean,
    idName: string,
    className: string,
    key: string,
    fieldName: string,
    options?: Option[],
    /**
     * If false, show the select as 1 or 2 cells rather than as a row.
     * If undefined, defaults to true.
     */
    row?: boolean, 
    objectType: ObjectType,
    objectId: string,
    disabled?: boolean,
    /** optional user-supplied change handler -- runs after internal onChange handler*/
    onChange?: ()=>void,
    topStore: TopStore,
    undoManager: UndoManager,
    transformValueToStore?: (value:boolean)=>{[fieldname:string]: string}
}

interface CheckboxFieldState {
    value: boolean,
    /** for undo */
    valueOriginal: boolean,
    //showLabel: boolean
}


/**
 * A generalized Component that represents an optional label and <input type='checkbox'> .
 * This Component supports a Controlled Form, with granular undo (onChange) and state update
 * onChange.
 * Unlike Most of the other *Field components, this one does not inherit from BaseField.
 * I removed validation and error handling, as it is complex because
 *       value here is boolean while rest of error handling for Field class
 *       presumes string value.
 */
export default class CheckboxField extends Component<CheckboxFieldProps, CheckboxFieldState> {
    //errorId: string;

    constructor(props: CheckboxFieldProps) {
        super(props);
        this.state = {
            value: this.props.value,
            valueOriginal: this.props.value,
            //showLabel: this.props.showLabel === undefined ? true : this.props.showLabel
        };
        //this.errorId = this.props.idName + 'Error';
        this.onChange = this.onChange.bind(this);
    }

    render() {
        let html:ReactNode;
        let label:ReactNode;
        if (this.props.showLabel === undefined || this.props.showLabel) {
            label =
                <td className='left'>
                    <label htmlFor={this.props.idName}
                           className='cell checkboxFieldLabel left'>
                        {this.props.label}&nbsp;
                    </label>
                </td>
        } else {
            label = null;
        }

        const oneOr2Tds =
            <>
                <td className='cell right'>
                    <input type='checkbox'
                           className='left'
                           id={this.props.idName}
                           checked={this.state.value}
                           disabled={this.props.disabled}
                           onChange={this.onChange}
                    />
                </td>
                {label}
            </>;

        if (this.props.row === undefined || this.props.row) {
            html =
                <tr className={'checkboxField row ' + this.props.className}>
                    {oneOr2Tds}
                </tr>;
        } else {
            html =
                <React.Fragment>
                    {oneOr2Tds}
                </React.Fragment>;
        }

        return html;
    }

    /**
     * cf. https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html
     * Despite assertions of that blog, i cannot see how to avoid this call in order to
     * satisfy granular undo (undo by action, rather than by letter).
     * That is, I use prop to hold the previous value.  (only for text input, textarea)
     */
    static getDerivedStateFromProps(nextProps: CheckboxFieldProps,
                                    prevState: CheckboxFieldState):
        Partial<CheckboxFieldState> | null {
        //console.debug('CheckboxField lifecycle getDerivedStateFromProps(): start. nextProps.objectId=', nextProps.objectId);
        // only want to update state from props if props change significantly
        if (nextProps.value !== prevState.valueOriginal) {
            const newState = {
                value: nextProps.value,
                valueOriginal: nextProps.value,
            };
            console.log('getDerivedStateFromProps(): about to set new State to ', newState);
            return newState;
        }
        return null;
    }

    /* TODO: uncomment if any instance needs validation
    componentDidUpdate(): void {
        console.debug('CheckboxField lifecycle componentDidUpdate(): start. this.props.devideId=', this.props.deviceId);
        this.validateAndShowError(this.state.value);
    }
    componentDidMount(): void {
        console.debug('CheckboxField lifecycle componentDidMount(): start. this.props.devideId=', this.props.deviceId);
        this.validateAndShowError(this.state.value);
    }
    */

    onChange(event: ChangeEvent<HTMLInputElement>) {
        console.log('CheckboxField.onChange(): start');
        const value = event.target.checked;
        //const validation: Errors = this.props.validate(value);
        this.setState({
            value: this.state.value,
        }, () => {
            //this.showOrHideErrors(validation);

            let newValue:{[field:string]: any} = {[this.props.fieldName]: value};
            let origValue:{[field:string]: any} = {[this.props.fieldName]: this.props.value};
            if (this.props.transformValueToStore !== undefined) {
                newValue = this.props.transformValueToStore(value);
                origValue = this.props.transformValueToStore(this.props.value);
            }
            // need to set the top state in the callback param, so
            // it is done AFTER the asynchronous setState completes!
            const xacts: Array<Action> = [{
                updateType: UpdateType.UPDATE,
                objectType: this.props.objectType,
                objectId: this.props.objectId,
                newData: newValue,
                origData: origValue
            }];
            this.props.undoManager.enactActionsToStore({
                actions: xacts,
                description: this.props.label + " change"
            }, EnactType.USER_ACTION, this.props.onChange);
        });
    }

}