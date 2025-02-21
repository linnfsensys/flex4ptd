import React, {ChangeEvent, ReactNode} from 'react';
import '../infoPanels/InfoPanel.css';
import {Option} from './SelectField';
import './RadioButtonGroupField.css';
import {ObjectType, EnactType, UpdateType, Action} from "../AptdClientTypes";
import TopStore from "../TopStore";
import UndoManager from "../UndoManager";
import {BaseField} from "./BaseField";

interface RbgFieldProps {
    label: string,
    /** if undefined, showLabel defaults to true */
    showLabel?: boolean,
    /**
     * If false, show the rbg as 1 or 2 cells rather than as a row.
     * If undefined, defaults to true.
     */
    row?: boolean,
    value: string,
    idName: string,
    className: string,
    key: string,
    fieldName: string,
    options: Array<Option>,
    objectType: ObjectType,
    objectId: string,
    /** if undefined, disabled defaults to false */
    disabled?: boolean,
    /**
     *  if defined, onChangeAddActions method returns additional actions
     *  to make part of the undoable action caused by a change
     */
    onChangeAddActions?: (event: ChangeEvent<HTMLInputElement>, updateAction: Action)=>Action[],
    topStore: TopStore,
    undoManager: UndoManager,
    transformValueToStore?: (value:string)=>{[fieldname:string]: string},
}

interface RbgFieldState {
    value: string,
    /** for undo */
    valueOriginal: string
}


/**
 * A generalized Component that represents an underlying label and radio button group.
 */
export default class RadioButtonGroupField extends BaseField<RbgFieldProps, RbgFieldState> {
    constructor(props: RbgFieldProps) {
        super(props);
        this.state = {
            value: this.props.value,
            valueOriginal: this.props.value,
        };
        this.onChange = this.onChange.bind(this);
    }

    render() {
        let labelClasses: string = 'cell groupLabel right';
        const labelAndRbgButtons = <>
            {this.props.showLabel === undefined || this.props.showLabel === true ?
                <td className={'right'}>
                    <label htmlFor={this.props.idName}
                           className={labelClasses}
                    >{this.props.label}&nbsp;
                    </label>
                </td>
                :
                null
            }
            <td className='cell buttonGroup'>
                <span className='buttonPane rbg'>
                    {this.props.options.map((option: Option, index: number) => {
                        let buttonLabelClasses: string = 'btn'
                        if (this.props.disabled !== undefined && this.props.disabled) {
                            labelClasses += ' disabled';
                            buttonLabelClasses += ' disabled';
                        }
                        if (option.value === this.state.value) {
                            buttonLabelClasses += ' green checked';
                        } else {
                            buttonLabelClasses += ' gray';
                        }

                        return (
                            <div className='option' key={option.value + index}>
                                <input id={this.props.idName + index}
                                       className={"toggle"}
                                       name={this.props.idName}
                                       value={option.value}
                                       type='radio'
                                       key={'input' + this.props.idName + index}
                                       checked={option.value === this.state.value}
                                       disabled={this.props.disabled !== undefined && this.props.disabled}
                                       onChange={this.onChange}
                                />
                                <label htmlFor={this.props.idName + index}
                                       key={'label' + this.props.idName + index}
                                       className={buttonLabelClasses}>
                                    <span className='fake-radio'/>
                                    {option.text}
                                </label>
                            </div>
                        )
                    })
                    }
                </span>
                <div className='errorMsg' id={this.errorId}></div>
            </td>
        </>;
        const html:ReactNode = <>
            {this.props.row !== undefined && this.props.row === false ?
                    <>
                        {labelAndRbgButtons}
                    </>
                    :
                    <tr className={'rbgField row ' + this.props.className}
                        id={this.props.idName}
                    >
                        {labelAndRbgButtons}
                    </tr>
            }
        </>
        return html;
    }

    /**
     * cf. https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html
     * Despite assertions of that blog, i cannot see how to avoid this call in order to
     * satisfy granular undo (undo by action, rather than by letter).
     * That is, I use prop to hold the previous value.  (only for text input, textarea)
     */
    static getDerivedStateFromProps(nextProps: RbgFieldProps,
                                    prevState: RbgFieldState):
        Partial<RbgFieldState> | null {
        //console.debug('RadioButtonGroupField lifecycle getDerivedStateFromProps(): start. nextProps.objectId=', nextProps.objectId);
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
        console.debug('RadioButtonGroupField lifecycle componentDidUpdate(): start. this.props.devideId=', this.props.objectId);
        this.validateAndShowError(this.state.value);
    }
    componentDidMount(): void {
        console.debug('RadioButtonGroupField lifecycle componentDidMount(): start. this.props.devideId=', this.props.objectId);
        this.validateAndShowError(this.state.value);
    }
    */

    /** TODO: this method could be in a base class */
    onChange(event: ChangeEvent<HTMLInputElement>):void {
        console.log('RadioButtonGroupField.onChange(): start');
        const value = event.target.value;
        event.persist();
        // TODO: the setting of state is perhaps not needed?
        this.setState({
            value: value,
        }, () => {
            let newValue = {[this.props.fieldName]: value};
            let origValue = {[this.props.fieldName]: this.props.value};
            if (this.props.transformValueToStore !== undefined) {
                newValue = this.props.transformValueToStore(value);
                origValue = this.props.transformValueToStore(this.props.value);
            }
            // need to set the top state in the callback param, so
            // it is done AFTER the asynchronous setState completes!
            const action:Action = {
                updateType: UpdateType.UPDATE,
                objectType: this.props.objectType,
                objectId: this.props.objectId,
                newData: newValue,
                origData: origValue
            };
            let actions: Action[] = [action];
            if (this.props.onChangeAddActions !== undefined) {
                //changing ccCardType might require updating origValue of action
                //onChangeAddActions will return an array of actions with current update Action first  
                actions = this.props.onChangeAddActions(event, action);
            }
            let enactType:EnactType = EnactType.USER_ACTION;
            this.props.undoManager.enactActionsToStore({
                actions: actions,
                description: this.props.label + " change"
            }, enactType);
        });
    }

}