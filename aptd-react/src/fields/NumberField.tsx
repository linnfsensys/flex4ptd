import React, {ChangeEvent, ReactNode} from 'react';
import '../infoPanels/InfoPanel.css';
import {Errors} from '../infoPanels/InfoPanel';
import './RangeField.css';
import {CharacterType, EnactType, ObjectType, UpdateType} from "../AptdClientTypes";
import TopStore from "../TopStore";
import UndoManager from "../UndoManager";
import {BaseField} from "./BaseField";
import InputField from "./InputField";

interface NumberFieldProps {
    label: string,
    idName: string,
    fieldName: string,
    value: number,
    min: number,
    max: number,
    step?: number,
    objectType: ObjectType,
    objectId: string,
    prompt?: string,
    /**
     * characterType is used both to screen out invalid characters and to give
     * error message if value typed so far (onChange) does not match desired type.
     */
    characterType?: CharacterType,
    transformValueToStore?: (value:number)=>{[fieldname:string]: number},
    validate?: (value:string)=>Errors,
    topStore: TopStore,
    undoManager: UndoManager,
}

interface NumberFieldState {
    value: number,
    /** for undo */
    valueOriginal: number
}
/**
 * A generalized Component that represents an underlying label and <input type='number'> i.e., a number text field with 'spinner' (up/down arrows).
 * This Component supports a Controlled Form, with granular undo (onBlur) and state update
 * onChange (on every character).
 * Note that user can still type arbitrary number, even though min and max are specified, so 
 * external validation is needed!
 */
export default class NumberField extends BaseField<NumberFieldProps, NumberFieldState> {

    constructor(props: NumberFieldProps) {
        super(props);
        this.state = {
            value: this.props.value,
            valueOriginal: this.props.value
        };
        this.onChange = this.onChange.bind(this);
        this.onBlur = this.onBlur.bind(this);
        this.transformValueToStore = this.transformValueToStore.bind(this);
    }

    render() {
        const step: number = this.props.step !== undefined ? this.props.step : 1;
        const html: ReactNode = (
            <tr className={'rangeField row'}>
                <td className={'right'}>
                    <label htmlFor={this.props.idName}
                           className='cell right inputLabel'>{this.props.label}&nbsp;
                    </label>
                </td>
                <td>
                    <input id={this.props.idName}
                           type={'number'}
                           name={this.props.idName}
                           value={this.props.value}
                           className='cell'
                           min={this.props.min}
                           max={this.props.max}
                           step={step}
                           //list={optionsName}
                           placeholder={this.props.prompt}
                           onBlur={this.onBlur}
                           onChange={this.onChange}
                    />
                    <div className='errorMsg' id={this.errorId}></div>
                </td>
            </tr>
        );
        return html;
    }

    /**
     * cf. https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html
     * Despite assertions of that blog, i cannot see how to avoid this call in order to
     * satisfy granular undo (undo by action, rather than by letter).
     * That is, I use prop to hold the previous value.  (only for text input, textarea)
     */
    static getDerivedStateFromProps(nextProps: NumberFieldProps,
                                    prevState: NumberFieldState):
        Partial<NumberFieldState> | null {
        console.debug('NumberField lifecycle getDerivedStateFromProps(): start. nextProps.objectId=', nextProps.objectId);
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
        console.debug('NumberField lifecycle componentDidUpdate(): start. this.props.objectId=', this.props.objectId);
        this.validateAndShowError(this.state.value.toString());
    }
    componentDidMount(): void {
        console.debug('NumberField lifecycle componentDidMount(): start. this.props.objectId=', this.props.objectId);
        this.validateAndShowError(this.state.value.toString());
    }

 */

    /** Is there ever a need for validation here? Assuming not */
    onChange(event: ChangeEvent<HTMLInputElement>) {
        console.log('NumberField.onChange(): start');
        const value = event.target.value;
        const pureValue = this.purifyValue(value);
        const validation: Errors = this.props.validate !== undefined ? this.props.validate(pureValue) : {value: pureValue, errmsgs: []};
        this.setState({
            value: +validation.value,
        });
    }

    /** Is there ever a need for validation here? Assuming not */
    onBlur(event: ChangeEvent<HTMLInputElement>) {
        console.log('NumberField.onBlur(): start');
        const value: string = event.target.value;
        this.setState({value: +value},
        () => {
            let newValue = {[this.props.fieldName]: +value};
            let origValue = {[this.props.fieldName]: this.props.value};
            if (this.props.transformValueToStore !== undefined) {
                newValue = this.props.transformValueToStore(+value);
                origValue = this.props.transformValueToStore(this.props.value);
            }

            // need to set the top state in the callback param, so
            // it is done AFTER the asynchronous setState completes!
            const actions = [{
                updateType: UpdateType.UPDATE,
                objectType: this.props.objectType,
                objectId: this.props.objectId,
                newData: newValue,
                origData: origValue
            }];

            this.props.undoManager.enactActionsToStore({
                actions: actions,
                description: this.props.label + " change"
            }, EnactType.USER_ACTION);
        });
    }

    /**
     * This method is copied from InputField.
     * It is needed because input type='number' still allows unwanted chars.
     * @return name, trimmed left, with only appropriate characters for characterType
     */
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
                // allow only appropriate chars for characterType.  Remove others
                cleanName = cleanName.replace(InputField.badCharsRegexpByCharacterType[this.props.characterType], '');
                break;
            case CharacterType.TEXT:
                // TODO: do we forbid *any* chars?
                // currently allow anything
                break;
            default:
                throw new Error('unexpected character type: ' + this.props.characterType);
        }
        return cleanName;
    }


    transformValueToStore(value: string): {[fieldname:string]: number} {
        return {[this.props.fieldName]: +value};
    }

}
