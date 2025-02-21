import React, {ChangeEvent, ReactNode} from 'react';
import '../infoPanels/InfoPanel.css';
import './SelectField.css';
import {ObjectType, EnactType, UpdateType, Action, TopType} from "../AptdClientTypes";
import {BaseField} from "./BaseField";
import TopStore from "../TopStore";
import UndoManager from "../UndoManager";
import Note from "./Note";

export interface Option {
    value: string,
    text: string,
    disabled?: boolean
}

interface SelectFieldProps {
    label: string,
    /** if undefined, showLabel defaults to true */
    showLabel?: boolean,
    /** if undefined, showErrorTd defaults to true even if there is no error */
    showErrorTd?: boolean,
    value: string,
    idName: string,
    className: string,
    key: string,
    fieldName: string,
    /** if undefined, disabled defaults to false */
    disabled?: boolean,
    /** if undefined, enactType defaults to EnactType.USER_ACTION */
    enactType?:EnactType,
    /**
     * If false, show the select as 1 or 2 cells rather than as a row.
     * If undefined, defaults to true.
     */
    row?: boolean,
    suppressTd?: boolean,
    options: Array<Option>,
    objectType: ObjectType,
    objectId: string,
    unit?: string,
    prompt?: string,
    /** If provided, a custom handler after user changed the value */
    onValueChanged?: (value:string)=>void,
    /**
     *  if defined, onChangeAddActions method returns additional actions
     *  to make part of the undoable action caused by a change
     */
    onChangeAddActions?: (event: ChangeEvent<HTMLSelectElement>, updateAction: Action)=>Action[],
    transformValueToStore?: (value:string)=>Partial<TopType>,
    topStore: TopStore,
    undoManager: UndoManager,
}

interface SelectFieldState {
    value: string,
    /** for undo */
    valueOriginal: string,
}


/**
 * A generalized Component that represents an (optional) underlying label and a select tag.
 * This Component supports a Controlled Form, with granular undo and state update
 * (onChange).
 * Please provide a label value even if showLabel is false, as the label value is also
 * shown to user for the Undo button hover.
 */
export default class SelectField /*extends Field<SelectFieldProps, SelectFieldState>*/ extends BaseField<SelectFieldProps, SelectFieldState> {
    errorId: string;

    constructor(props: SelectFieldProps) {
        super(props);
        this.state = {
            value: this.props.value,
            valueOriginal: this.props.value,
        };
        this.errorId = this.props.idName + 'Error';
        this.onChange = this.onChange.bind(this);
    }

    render() {
        let html:ReactNode;
        let label:ReactNode;
        const isRow:boolean = (this.props.row === undefined || this.props.row);
        const showErrorTd:boolean = (this.props.showErrorTd === undefined || this.props.showErrorTd);
        const showLabel:boolean = (this.props.showLabel === undefined || this.props.showLabel);
        if (showLabel) {
            let labelClasses = 'cell selectLabel right';
            if (this.props.disabled === true) {
                labelClasses += ' disabled';
            }
            label = (<label htmlFor={this.props.idName}
                            className={labelClasses}>
                        {this.props.label}&nbsp;
                    </label>);
        } else {
            label = null;
        }

        const selectTd =
            <td>
                <select id={this.props.idName}
                        className='cell'
                        value={this.state.value}
                        disabled={this.props.disabled !== undefined && this.props.disabled}
                        onChange={this.onChange}>
                    {
                        this.props.options.map((option) => (
                            <option value={option.value}
                                    key={option.text}
                                    disabled={option.disabled}
                            >{option.text}
                            </option>
                        ))
                    }
                </select>
                {this.props.unit !== undefined ?
                    <span className='unit'>{this.props.unit}</span> : null
                }
                {this.props.prompt !== undefined ?
                    <Note text={this.props.prompt}
                          idName={'promptFor' + this.props.idName}
                    /> : null
                }
            </td>;

        const errorArray: ReactNode[] = this.renderErrors();
        // TODO: perhaps instead of using showErrorTd, just don't use separate td for error in non-row case.
        // Q: why does errorTds have 2 tds, one of them empty?
        // A: to match the 2 tds for label, select, in the <tr> case.
        const errorTds =
            <>
                {isRow? <td/> : null}
                {showErrorTd ?
                    <td>
                        <div className='errorMsg' id={this.errorId}>
                            {errorArray}
                        </div>
                    </td>
                    :
                    null
                }
            </>;

        if (isRow) {
            html =
                <>
                    <tr className={'selectField row ' + this.props.className}>
                        <td className='right'>
                            {label}
                        </td>
                        {selectTd}
                    </tr>
                    {errorArray.length > 0 ?
                        <tr className={'selectFieldError row ' + this.props.className}>
                            {errorTds}
                        </tr>
                        :
                        null
                    }
                </>;
        } else if (showLabel) {
            // showLabel true, row false
            html =
                <React.Fragment>
                    <td className='right'>{label}</td>
                    {selectTd}
                    {errorTds}
                </React.Fragment>;
        } else {
            // showLabel false, row false
            html =
                <React.Fragment>
                    {selectTd}
                    {errorTds}
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
    static getDerivedStateFromProps(nextProps: SelectFieldProps,
                                    prevState: SelectFieldState):
        Partial<SelectFieldState> | null {
        //console.debug('SelectField lifecycle getDerivedStateFromProps(): start. nextProps.objectId=', nextProps.objectId);
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

    /*
    componentDidUpdate(): void {
        console.debug('SelectField lifecycle componentDidUpdate(): start. this.props.devideId=', this.props.deviceId);
        this.validateAndShowError(this.state.value);
    }
    componentDidMount(): void {
        console.debug('SelectField lifecycle componentDidMount(): start. this.props.devideId=', this.props.deviceId);
        this.validateAndShowError(this.state.value);
    }
    */

    onChange(event: ChangeEvent<HTMLSelectElement>) {
        console.log('SelectField.onChange(): start');
        const value = event.target.value;
        event.persist();
        // TODO: do we need to set the value in state here?  seems unnecessary
        this.setState({
            value: value,
        }, () => {
            let newValue: Partial<TopType> = {[this.props.fieldName]: value};
            let origValue: Partial<TopType> = {[this.props.fieldName]: this.props.value};
            if (this.props.transformValueToStore !== undefined) {
                newValue = this.props.transformValueToStore(value);
                origValue = this.props.transformValueToStore(this.props.value);
            }
            // need to set the top state in the callback param, so
            // it is done AFTER the asynchronous setState completes!
            let action: Action = {
                updateType: UpdateType.UPDATE,
                objectType: this.props.objectType,
                objectId: this.props.objectId,
                newData: newValue,
                origData: origValue
            };
            let actions: Array<Action> = [action];
            if (this.props.onChangeAddActions !== undefined) {
                //changing ccCardType might require updating origValue of action
                //onChangeAddActions will return an array of actions with current update Action first
                actions = this.props.onChangeAddActions(event, action);
            }
            let enactType:EnactType = EnactType.USER_ACTION;
            if (this.props.enactType !== undefined) {
                enactType = this.props.enactType;
            }
            this.props.undoManager.enactActionsToStore({
                actions: actions,
                description: this.props.label + " change"
            }, enactType);
        });

        // TODO: although this call appears to be *after* the above, it will happen first!
        //       This may not be what the developer expects...
        if (this.props.onValueChanged !== null && this.props.onValueChanged !== undefined) {
            this.props.onValueChanged(value);
        }
    }
}