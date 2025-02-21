import React, {ReactNode} from 'react';
import '../infoPanels/InfoPanel.css';
import './RangeField.css';
import {EnactType, ObjectType, UpdateType} from "../AptdClientTypes";
import TopStore from "../TopStore";
import UndoManager from "../UndoManager";
import {BaseField} from "./BaseField";

interface RangeFieldProps {
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
    /** showTicks is true by default */
    showTicks?: boolean,
    /** showMoreLess is false by default */
    showMoreLess?: boolean,
    disabled?: boolean,
    valueUpdated?: ()=>void,
    transformValueToStore?: (value:number)=>{[fieldname:string]: number},
    //validate?: (value:string)=>Errors,
    enactType?: EnactType,
    topStore: TopStore,
    undoManager: UndoManager,
}

interface RangeFieldState {
    value: number,
    /** for undo */
    valueOriginal: number
}
/**
 * A generalized Component that represents an underlying label and <input type='range'> .
 */
export default class RangeField extends BaseField<RangeFieldProps, RangeFieldState> {

    constructor(props: RangeFieldProps) {
        super(props);

        this.state = {
            value: this.props.value,
            valueOriginal: this.props.value
        };

        this.onChange = this.onChange.bind(this);
        this.onBlur = this.onBlur.bind(this);
        this.onFinalChange = this.onFinalChange.bind(this);
        this.transformValueToStore = this.transformValueToStore.bind(this);
    }

    render() {
        let datalistOptions:Array<ReactNode> = [];
        const step: number = this.props.step !== undefined ? this.props.step : 1;
        for (let optionNo = this.props.min; optionNo <= this.props.max; optionNo += step) {
            datalistOptions.push(<option value={optionNo} key={optionNo}/>);
        }
        const optionsName = this.props.idName + 'Options';
        let dataList:ReactNode = <datalist id={optionsName}>{datalistOptions}</datalist>;
        let labelClasses:string = 'cell right inputLabel label';
        let moreLessClass:string = '';
        if (this.props.disabled === true) {
            labelClasses += ' disabled';
            moreLessClass += 'disabled';
        }
        const html: ReactNode = (
            <tr className={'rangeField row'}>
                <td className={'right'}>
                    <label htmlFor={this.props.idName}
                           className={labelClasses}>{this.props.label}&nbsp;
                    </label>
                </td>
                <td>
                    <div className='rangeFieldAndValue'>
                        <div className='rangeFieldMoreLess'>
                            <div className='rangeFieldItself'>
                                <input id={this.props.idName}
                                       type={'range'}
                                       name={this.props.idName}
                                       value={this.state.value}
                                       className='cell'
                                       min={this.props.min}
                                       max={this.props.max}
                                       step={step}
                                       list={this.props.showTicks !== undefined &&
                                             this.props.showTicks === false ?
                                             undefined : optionsName}
                                       disabled={this.props.disabled === true}
                                       placeholder={this.props.prompt}
                                       onChange={this.onChange}
                                       onMouseUp={this.onFinalChange}
                                       onBlur={this.onBlur}
                                />
                                {dataList}
                            </div>
                            {this.props.showMoreLess === true ?
                                <div className='moreLess'>
                                    <span className={moreLessClass}>More</span>
                                    <span className={moreLessClass}>Less</span>
                                </div>
                                :
                                null
                            }
                        </div>
                        <div className='rangeFieldValue'>
                            <input type={'text'} id={this.props.idName + 'Value'} readOnly={true} disabled={true} value={this.state.value} className={'rangeFieldReadout'} >
                            </input>
                        </div>
                    </div>
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
    static getDerivedStateFromProps(nextProps: RangeFieldProps,
                                    prevState: RangeFieldState):
        Partial<RangeFieldState> | null {
        //console.debug('RangeField lifecycle getDerivedStateFromProps(): start. nextProps.objectId=', nextProps.objectId);
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


    /**
     * This method is called on every value, as the slider slides past.
     * Is there ever a need for validation here? Assuming not.
     */
    onChange(event: React.ChangeEvent<HTMLInputElement>) {
        console.log('RangeField.onChange(): start');
        const value = event.target.value;
        this.setState({
            value: +value,
        }, this.props.valueUpdated);
    }


    /**
     * This method is called at the end of user's sliding.
     * Is there ever a need for validation here? Assuming not.
     */
    onFinalChange(event: React.MouseEvent<HTMLInputElement, MouseEvent>) {
        console.log('RangeField.onFinalChange(): start');
        const value: string = ((event.target) as HTMLInputElement).value;
        this.setValueInTopStore(value);
    }

    /**
     * This is here to handle cases where user uses keyboard to change values rather than mouse.
     */
    onBlur(event: React.FocusEvent<HTMLInputElement>) {
        console.log('RangeField.onBlur(): start');
        const value: string = ((event.target) as HTMLInputElement).value;
        if (+value !== this.props.value) {
            this.setValueInTopStore(value);
        }
    }

    private setValueInTopStore(value: string) {
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

        let enactType: EnactType = EnactType.USER_ACTION;
        if (this.props.enactType !== undefined) {
            enactType = this.props.enactType;
        }

        this.props.undoManager.enactActionsToStore({
            actions: actions,
            description: this.props.label + " change"
        }, enactType);
    }

    transformValueToStore(value: string): {[fieldname:string]: number} {
        return {[this.props.fieldName]: +value};
    }

}
