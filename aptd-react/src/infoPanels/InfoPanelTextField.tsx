import React from 'react';
import './InfoPanel.css';
import cloneDeep from 'lodash/cloneDeep';
import {ObjectType, UpdateType, TextField, Action, EnactType} from "../AptdClientTypes";
import UndoManager from "../UndoManager";
import TopStore from "../TopStore";


interface InfoPanelTextFieldProps {
    id: string,
    text: string,
    topStore: TopStore,
    undoManager: UndoManager,
}

interface InfoPanelTextFieldState {
    // TODO: unclear if initialTextField is needed
    initialTextField: TextField,
}

/**
 * TODO: There are some possible simplifications and improvements.
 *       1. eliminate initialTextField from state, and thereby eliminate all state.
 *          Instead, in onBlur(), compare text with editText field.
 *       2. use a timer to determine when to call onFocusLoss() (maybe in addition to
 *          mouseLeave and Blur events).  Because onBlur and onMouseLeave don't capture everything,
 *          esp if user is not using mouse.
 */
class InfoPanelTextField extends React.Component<InfoPanelTextFieldProps, InfoPanelTextFieldState> {

    constructor(props: InfoPanelTextFieldProps) {
        super(props);
        const textField:TextField =
            this.props.topStore.getTopState().mapSettings.textFields[this.props.id];
        this.state = {
            initialTextField: textField,
        };
        this.onChange = this.onChange.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
        this.onFocusLoss = this.onFocusLoss.bind(this);
        this.onBlur = this.onBlur.bind(this);
    }


    componentDidMount() {
        console.debug('InfoPanelTextField.componentDidMount(): starting');
        const textAreaId = 'editTextArea' + this.props.id;
        const textAreaElement: HTMLTextAreaElement = document.getElementById(textAreaId) as HTMLTextAreaElement;
        console.debug('InfoPanelTextField.componentDidMount(): found text area');
        /*
         * We should avoid focus here, although it does help the user.
         * The reason is that if focus here, then it is hard to detect when user is done, in
         * order to cause onFocusLoss() activity, while if we don't focus, then we can use onMouseLeave().
        textAreaElement.focus();
         */
        if (textAreaElement.value === 'Text') {
            textAreaElement.select();
        }
    }


    render() {
        const header = " Text Field ";
        const textAreaId = 'editTextArea' + this.props.id;

        return (
            <div id='infoPanelTextField'>
                <div id='infoPanelTextFieldHeader' className="infoPanelHeader">{header}</div>
                    <table>
                        <tbody>
                            <tr>
                                <td>
                                    Edit Text:
                                    <textarea id={textAreaId}
                                              className={'editTextField'}
                                              rows={8}
                                              cols={50}
                                              value={this.props.text}
                                              onChange={this.onChange}
                                              onBlur={this.onBlur}
                                              onMouseLeave={this.onMouseLeave}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
            </div>
        )
    }


    onMouseLeave(event: React.MouseEvent<HTMLTextAreaElement>) {
        console.log('InfoPanelTextField.onMouseLeave(): lifecycle start');
        event.persist();
        this.onFocusLoss(event);
    }

    onBlur(event: React.FocusEvent) {
        console.log('InfoPanelTextField.onBlur(): lifecycle start');
        event.persist();
        this.onFocusLoss(event);
    }

    private onFocusLoss(event: React.MouseEvent | React.FocusEvent) {
        console.debug('InfoPanelTextField.onFocusLoss(): start');
        event.persist();
        if (event.target === null) {
            throw new Error('unexpected null event.target');
        }
        const value = (event.target as HTMLTextAreaElement).value;
        console.debug('InfoPanelTextField.onFocusLoss(): this.props.text=', this.props.text, "value=", value);
        const updatedTextFields: {[id:string]: TextField} =
            cloneDeep(this.props.topStore.getTopState().mapSettings.textFields);

        updatedTextFields[this.props.id] = {...updatedTextFields[this.props.id],
            text: value,
            editText: undefined,
        };
        const newValue:{[field:string]: {[id:string]: TextField}} = {"textFields": updatedTextFields};

        const origTextFields: {[id:string]: TextField} =
            cloneDeep(this.props.topStore.getTopState().mapSettings.textFields);
        // TODO: following is probably not needed...
        origTextFields[this.props.id] = this.state.initialTextField;

        // test for actual text change, as blur can occur at unexpected times, such as when user
        // click the TextField remove button on map. (the "X" button).
        if (updatedTextFields[this.props.id].text !== origTextFields[this.props.id].text) {
            console.debug('InfoPanelTextField(): onFocusLoss(): new textfield differs from orig, post to topstore',
                updatedTextFields[this.props.id].text, origTextFields[this.props.id].text);
            this.setState({
                initialTextField: updatedTextFields[this.props.id],
             }, () => {
                const origValue: { [field: string]: { [id: string]: TextField } } = {"textFields": origTextFields};

                let actions: Array<Action> = [{
                    updateType: UpdateType.UPDATE,
                    objectType: ObjectType.MAP_SETTINGS,
                    objectId: '',
                    origData: origValue,
                    newData: newValue
                }];
                this.props.undoManager.enactActionsToStore({
                    actions: actions,
                    description: "update text field text"
                }, EnactType.USER_ACTION);
            });
        } else {
            console.debug('InfoPanelTextField(): onFocusLoss(): new textfield same as orig, no post to topstore');
        }
    }

    /**
     * This method gets triggered on every character typed in the textarea
     */
    onChange(event: React.ChangeEvent<HTMLTextAreaElement>): void {
        console.debug('InfoPanelTextField(): onChange(): this.props.text=', this.props.text);
        const updatedText = event.target.value;

        const updatedTextFields: {[id:string]: TextField} =
            cloneDeep(this.props.topStore.getTopState().mapSettings.textFields);
        updatedTextFields[this.props.id].editText = updatedText;
        updatedTextFields[this.props.id].text = this.state.initialTextField.text;

        const newValue:{[field:string]: any} =
            {"textFields": updatedTextFields};
        const origValue:{[field:string]: any} =
            {"textFields": cloneDeep(this.props.topStore.getTopState().mapSettings.textFields)};

        this.props.topStore.dispatch({
            updateType: UpdateType.UPDATE,
            objectType: ObjectType.MAP_SETTINGS,
            objectId: '',
            newData: newValue,
            origData: origValue
        });
    }


    /**
     * Q: do we care about position?
     * A: yes: it refers to the coordinates on the map
     */
    private static equalTextFields(tf1: TextField, tf2: TextField): boolean {
        return (tf1.text === tf2.text &&
                tf1.position === tf2.position &&
                tf1.rotationDegrees === tf2.rotationDegrees);
    }
}

export default InfoPanelTextField;
