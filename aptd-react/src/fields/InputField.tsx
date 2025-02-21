import React, {ChangeEvent, ReactNode} from 'react';
import '../infoPanels/InfoPanel.css';
import {Errors} from '../infoPanels/InfoPanel';
import './InputField.css';
import {Action, CharacterType, EnactType, ObjectType, UpdateType,} from "../AptdClientTypes";
import cloneDeep from 'lodash/cloneDeep';
import TopStore from "../TopStore";
import UndoManager from "../UndoManager";
import {BaseField} from "./BaseField";
import ValidationManager, {DoOrUndoType} from "../ValidationManager";


interface InputFieldProps {
    label: string,
    showLabel?: boolean,
    /** this is used if showLabel === false, to skip the hidden column otherwise defined for the un-shown label */
    showLabelColumn?: boolean,
    text: string,
    idName: string,
    classToAdd?: string,
    fieldName: string,
    /** if fieldIndex is defined, fieldName is assumed to be array */
    fieldIndex?: number|string,
    password?: boolean,
    maxLength: number,
    required?: boolean,
    objectType: ObjectType,
    objectId: string,
    /** if undefined, enactType defaults to EnactType.USER_ACTION */
    enactType?:EnactType,
    /** unit of measurement, e.g. 'in' for inches */
    unit?: string,
    /**
     * If false, show the select as 1 or 2 cells rather than as a row.
     * If undefined, defaults to true.
     */
    row?: boolean,
    transformValueToStore?: (value:string)=>any,
    /**
     * characterType is used both to screen out invalid characters and to give
     * error message if value typed so far (onChange) does not match desired type.
     */
    characterType?: CharacterType,
    prompt?: string,
    topStore: TopStore,
    undoManager: UndoManager,
    /** if undefined, value of disabled is false */
    disabled?: boolean,
    size?: number
}

interface InputFieldState {
    text: string,
    /** for undo */
    textOriginal: string,
    /** map from ObjectType to the field name of the top level object of that type.  e.g., from ObjectType.SENSOR_ZONE to 'sensorZones' */
    topStateFieldByObjectType: {[stateKey: string]: string} | null,
    showFocusLossErrors: boolean,
    showChangeErrors: boolean,
}

/**
 * A generalized Component that represents an underlying label and <input type='text'> .
 * This Component supports a Controlled Form, with granular undo (onBlur) and state update
 * onChange (on every character).
 * This is the only one of our BaseField children that has a separate onChange method,
 * because input text is the only one where user types in.  (though could also have text area).
 * Note: the underlying field in TopStore that backs this component should be a string
 *       type, not a number.  That is so it can hold the user's invalid value onBlur.
 * There are 3 kinds of errors:
 * 1. global error (kept in TopStore.validationGlobalErrors)
 * 2. per-object error (kept in TopStore.validationErrors)
 * 3. on-change error (kept in this class, in state)
 *
 */
export default class InputField extends BaseField<InputFieldProps, InputFieldState> {
    private static characterErrorMsg:{[charType: string]: string} = {
        'INTEGER': 'Value must be an integer',
        'NONNEGATIVE_INTEGER': 'Value must be a non-negative integer',
        'FLOAT': 'Value must be a number with optional decimal point',
        'NONNEGATIVE_FLOAT': 'Value must be a positive number with optional decimal point',
        'DOTTED_QUAD': 'Value must be in dotted quad format: 999.999.999.999',
        'DOTTED_QUAD_OR_HOSTNAME': 'Value must be dotted quad or hostname',
        'NAME': 'Value can be alphanumeric or _ - $ # @',
        'NAME_WITH_BLANKS': 'Value may include letters, numbers, blanks, -_/&#@().',
        'TEXT': 'Value can contain alphanumeric or _ ! @ # $ % * + .',
    };
    public static badCharsRegexpByCharacterType: {[charType: string]: RegExp} = {
        'INTEGER': /[^[0-9-]]/g,
        'NONNEGATIVE_INTEGER': /[^0-9]/,
        'FLOAT': /[^0-9\-.]/,
        'NONNEGATIVE_FLOAT': /[^0-9.]/,
        'DOTTED_QUAD': /[^0-9.]/g,
        'DOTTED_QUAD_OR_HOSTNAME': /[^a-zA-Z0-9.\\-]/g,
        'NAME': /[^\w\-#@]/g,
        'NAME_WITH_BLANKS': /[^\w\-&@#/(). ]/g,
        'TEXT': /[^\w!@#$%*+.]/g
    };


    constructor(props: InputFieldProps) {
        super(props);
        //console.debug('InputField.constructor(): starting');
        this.state = {
            text: this.props.text,
            textOriginal: this.props.text,
            topStateFieldByObjectType: this.props.topStore.getTopState === undefined ? null : this.props.topStore.getTopState().topStateFieldByObjectType,
            showFocusLossErrors: false,
            showChangeErrors: true,
        };

        this.showOrHideChangeErrors = this.showOrHideChangeErrors.bind(this);

        this.onChange = this.onChange.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
        this.onBlur = this.onBlur.bind(this);
        this.onFocusLoss = this.onFocusLoss.bind(this);
    }

    render() {
        let html:ReactNode;
        let label:ReactNode;
        let labelClasses: string = 'cell label inputLabel right';
        let size: number = 20;
        if (this.props.size !== undefined) {
            size = this.props.size;
        }
        if (this.props.disabled !== undefined && this.props.disabled) {
            labelClasses += ' disabled';
        }

        if (this.props.showLabel === undefined || this.props.showLabel) {
            label = (<td className={'right'}>
                        <label htmlFor={this.props.idName}
                            className={labelClasses}>
                          {this.props.label}&nbsp;
                        </label>
                     </td>
                    );
        } else {
            if (this.props.showLabelColumn === undefined || this.props.showLabelColumn) {
                label = <td></td>;
            }
        }

        const topLevelErrors: ReactNode[] = this.renderErrors();
        let inputClassNames = 'cell inputText';
        if (this.props.classToAdd !== undefined) {
            inputClassNames += ' ' + this.props.classToAdd;
        }
        if (topLevelErrors.length > 0) {
            inputClassNames += ' error';
        }

        const errorDivs =
            <>
                {/* .changeErrorMsg is from onChange handler. state based. */}
                <div className='changeErrorMsg' id={this.errorId + 'Change'}>
                </div>
                {/* .errorMsg is from onBlur handler. topStore based. */}
                <div className='errorMsg' id={this.errorId}>
                    {this.state.showFocusLossErrors ? topLevelErrors : ''}
                </div>
            </>;

        const labelAndTdWithInput: ReactNode =
            <>
                {label}
                <td>
                    <input id={this.props.idName}
                           type={this.props.password === true ? 'password' : 'text'}
                           value={this.state.text}
                           disabled={this.props.disabled !== undefined && this.props.disabled}
                           size={size}
                           className={inputClassNames}
                           maxLength={this.props.maxLength}
                           placeholder={this.props.prompt}
                           onChange={this.onChange}
                           onBlur={this.onBlur}
                           onMouseLeave={this.onMouseLeave}
                    />
                    {this.props.unit !== undefined ?
                        <span className='unit cell'>  {this.props.unit}</span> : null
                    }
                    {(this.props.row === false) ? errorDivs : null}
                </td>
            </>;

        if (this.props.row === undefined || this.props.row) {
            html =
                <>
                    <tr className={'inputField row'}>
                        {labelAndTdWithInput}
                    </tr>
                    <tr>
                        <td>
                        </td>
                        <td>
                            {errorDivs}
                        </td>
                    </tr>
                </>
        } else {
            // no row (row is defined and false)
            html = (
                <React.Fragment>
                    {labelAndTdWithInput}
                </React.Fragment>
            );
        }

        return html;
    }

    /**
     * cf. https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html
     * Despite assertions of that blog, i cannot see how to avoid this call in order to
     * satisfy granular undo (undo by action, rather than by letter).
     * That is, I use prop to hold the previous value.  (only for text input, textarea)
     */
    static getDerivedStateFromProps(nextProps: InputFieldProps,
                                    prevState: InputFieldState):
        Partial<InputFieldState> | null {
        //console.debug('InputField lifecycle getDerivedStateFromProps(): start. nextProps.objectId=', nextProps.objectId);

        // only want to update state from props if props change significantly
        if (nextProps.text !== prevState.textOriginal) {
            const newState = {
                text: nextProps.text,
                textOriginal: nextProps.text,
            };
            console.log('InputField.getDerivedStateFromProps(): lifecycle about to set new State to ', newState);
            return newState;
        }
        return null;
    }

    /** gets called on each character typed */
    onChange(event: ChangeEvent<HTMLInputElement>) {
        console.log('InputField.onChange(): lifecycle start. ', this.props.label);
        const value = event.target.value;
        const pureValue = this.purifyValue(value);
        this.setState({
            text: pureValue,
        } /*
           * TODO: HR: as a quick but dirty fix for bug 14555 (double error msgs), I am removing the
           *     showing of all onChange msgs for InputField.
           *     For future release, this should get re-enabled and the
           *     bug more properly fixed.  I could not fix because I could not reproduce on the
           *     Mac, nor on Windows via Microsoft Remote Desktop.
           *
        , () => {
            this.showOrHideChangeErrors(pureValue);
        }
        */);
    }

    /**
     * Instead of onBlur, prefer onMouseLeave, because
     * it better handles case where user goes from InputField
     * to click a Button, which does not trigger onBlur...
     */
    onMouseLeave(event: React.MouseEvent<HTMLInputElement>) {
        console.log('InputField.onMouseLeave(): lifecycle start');
        this.onFocusLoss(event);
    }

    onBlur(event: React.FocusEvent) {
        console.log('InputField.onBlur(): lifecycle start');
        this.onFocusLoss(event);
    }


    private onFocusLoss(event: React.MouseEvent | React.FocusEvent) {
        console.debug('InputField.onFocusLoss(): start. ', this.props.label);
        if (event.target === null) {
            throw new Error('unexpected null event.target');
        }
        const value = (event.target as HTMLInputElement).value;
        const trimmedValidatedValue = value.trimRight();

        // if there was a change, update state
        if (trimmedValidatedValue !== this.props.text) {
            console.debug('InputField.onFocusLoss(): was there a change?', this.props.label, trimmedValidatedValue, this.props.text);
            this.removeChangeErrors();
            this.setState({
                text: trimmedValidatedValue,
            }, this.makeTopStoreCallback(trimmedValidatedValue));
        } else {
            console.debug('InputField.onFocusLoss(): no apparent change: ', this.props.label, trimmedValidatedValue, this.props.text);
        }
        this.showFocusLossErrors();
    }


    /**
     * factory method, so can incorporate trimmedValidatedValue.
     */
    private makeTopStoreCallback(trimmedValidatedValue: string) {
        return () => {
            // need to set the top state in the callback param, so
            // it is done AFTER the asynchronous setState completes!
            let newData: any;
            let origData: any;
            if (this.props.fieldIndex !== undefined) {
                // assume fieldName is an array
                if (this.props.topStore.getTopState === undefined) {
                    throw new Error('missing getTopState');
                }
                if (this.state.topStateFieldByObjectType === null) {
                    throw new Error('unexpected null topStateFieldByObjectType');
                }
                let topKey: string = this.state.topStateFieldByObjectType[this.props.objectType as string];  // e.g. topState.sensorZones

                // @ts-ignore
                const topStateObject = this.props.topStore.getTopState()[topKey];
                const origArray = (topKey === 'ap' ?
                    topStateObject[this.props.fieldName] :
                    topStateObject[this.props.objectId][this.props.fieldName]);
                let newArray: any[] = cloneDeep(origArray);
                let newValue: any = trimmedValidatedValue;
                if (this.props.transformValueToStore !== undefined) {
                    newValue = this.props.transformValueToStore(trimmedValidatedValue);
                }
                newArray[this.props.fieldIndex as keyof typeof newArray] = newValue;
                newData = newArray;
                // @ts-ignore
                origData = origArray;
            } else {
                // simple case: fieldName is a non-array field
                let newValue: any = trimmedValidatedValue;
                if (this.props.transformValueToStore !== undefined) {
                    newValue = this.props.transformValueToStore(trimmedValidatedValue);
                }
                newData = newValue;
                origData = this.props.text;
            }

            const actions: Array<Action> = [{
                // update the actual data in TopStore object
                updateType: UpdateType.UPDATE,
                objectType: this.props.objectType, // e.g. ObjectType.SENSOR_ZONE
                objectId: this.props.objectId,
                newData: {[this.props.fieldName]: newData},
                origData: {[this.props.fieldName]: origData},
            }];

            let enactType: EnactType = EnactType.USER_ACTION;
            if (this.props.enactType !== undefined) {
                enactType = this.props.enactType;
            }
            // note: following will invoke ValidationManager.doValidation() and doGlobalValidation()
            this.props.undoManager.enactActionsToStore({
                actions: actions,
                description: this.props.label + " change"
            }, enactType);
        };
    }

    /** @return name, trimmed left, with only appropriate characters for characterType */
    private purifyValue(name: string): string {
        let cleanName = name.trimLeft();
        switch (this.props.characterType) {
            case CharacterType.DOTTED_QUAD:
            case CharacterType.DOTTED_QUAD_OR_HOSTNAME:
            case CharacterType.INTEGER:
            case CharacterType.NAME:
            case CharacterType.NAME_WITH_BLANKS:
            case CharacterType.FLOAT:
            case CharacterType.NONNEGATIVE_FLOAT:
            case CharacterType.NONNEGATIVE_INTEGER:
                // allow only valid chars (depending on characterType).  Remove others
                cleanName = cleanName.replace(InputField.badCharsRegexpByCharacterType[this.props.characterType], '');
                break;
            case CharacterType.TEXT:
                // TODO: should we forbid *any* chars?
                // currently allow anything
                break;
            default:
                throw new Error('unexpected character type: ' + this.props.characterType);
        }
        return cleanName;
    }

    /** remove any error messages inserted by InputField.onChange() */
    private removeChangeErrors() {
        console.debug('InputField.removeChangeErrors(): starting. ', this.props.label);
        const inputElt = document.getElementById(this.props.idName);
        const changeErrorElt = document.getElementById(this.errorId + 'Change');
        const focusLossErrorElt = document.getElementById(this.errorId);

        // if there are no global errors, mark this field as not in error
        if (inputElt !== null && focusLossErrorElt !== null && focusLossErrorElt.textContent === '') {
            // assert: removing changeError, and there is no global error, so
            // remove error class
            console.debug('InputField.removeChangeErrors(): about to remove error class from ' + this.props.idName);
            inputElt.classList.remove('error');
        } else {
            console.debug('not removing error class. presumably there is still global error');
        }

        if (changeErrorElt !== null) {
            changeErrorElt.innerText = '';
        } else {
            console.error('unexpected missing changeErrorElt');
        }
    }

    /** remove any error messages inserted by InputField.onFocusLoss() */
    private removeFocusLossErrors() {
        this.setState({showFocusLossErrors: false});
    }

    /** show any error messages inserted by InputField.onFocusLoss() */
    private showFocusLossErrors() {
        this.setState({showFocusLossErrors: true});
    }

    /** TODO: instead of using document.getElementById(), set something in state and use render() */
    private showOrHideChangeErrors(value: string): void {
        const idElt = document.getElementById(this.props.idName);
        const changeErrorElt = document.getElementById(this.errorId + 'Change');
        let show: boolean;
        if (this.props.disabled ||
            ValidationManager.matchesRegexpForCharType(value, this.props.characterType, this.props.required)) {
            show = false;
        } else {
            show = true;
        }

        if (! show) {
            // hide error state and msg
            if (idElt !== null) {
                idElt.classList.remove('error');
            } else {
                console.error('InputField.showOrHideChangeErrors(): unexpected missing idElt');
            }
            if (changeErrorElt !== null) {
                changeErrorElt.innerText = '';
            } else {
                console.error('InputField.showOrHideChangeErrors(): unexpected missing changeErrorElt');
            }
        } else {
            // show error state and msg
            // first: hide any focusLoss (global validation) errors
            this.removeFocusLossErrors();
            if (idElt !== null) {
                idElt.classList.add('error');
            } else {
                console.error('InputField.showOrHideChangeErrors(): unexpected missing idElt');
            }
            if (changeErrorElt !== null) {
                const charType:CharacterType =
                    (this.props.characterType === undefined ? CharacterType.TEXT : this.props.characterType);
                changeErrorElt.innerText = InputField.characterErrorMsg[charType];
                if (this.props.required === undefined || this.props.required === false) {
                    changeErrorElt.innerText += ' or empty';
                }
            } else {
                console.error('InputField.showOrHideChangeErrors(): unexpected missing changeErrorElt');
            }
        }
    }

    static isValidField(validation: Errors): boolean {
        return validation.errmsgs === undefined ||
            validation.errmsgs === null ||
            validation.errmsgs.length === 0;
    }

}