import React from 'react';
import './InfoPanelTechSupport.css';
import InputField from "../fields/InputField";
import {CharacterType, EnactType, ModalType, ObjectType} from "../AptdClientTypes";
import {GUITechSupport, GUITechSupportProp} from "../AptdServerTypes";
import WebSocketManager from "../WebSocketManager";
import UndoManager from "../UndoManager";
import TopStore from "../TopStore";


interface InfoPanelTechSupportPropertiesProps {
    techSupportModel: GUITechSupport | null,
    webSocketManager: WebSocketManager | null,
    topStore: TopStore,
    undoManager: UndoManager,
}


/**
 * this version uses local state. We keep top-level state in TopStore as the
 * source of *verified* truth, but need local state to reflect user input,
 * in case where user makes errors.  Local state is in InputField components.
 */
class InfoPanelTechSupportProperties extends React.Component<InfoPanelTechSupportPropertiesProps> {
    constructor(props: InfoPanelTechSupportPropertiesProps) {
        super(props);
        this.onSaveClicked = this.onSaveClicked.bind(this);
        console.debug('lifecycle InfoPanelTechSupportProperties constructor(): start');
    }

    onSaveClicked(event: React.MouseEvent<HTMLButtonElement, MouseEvent>):void {
        console.debug('user clicked Save button. about to send Save msg to server');
        if (this.props.webSocketManager === null) {
            console.error('websocketManager is null');
            this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'SensConfig is unable to connect.')
        } else {
            this.props.webSocketManager.sendTechSupportSavePropsMsg();
        }
    }

    render() {
        let theProps: GUITechSupportProp[] =  this.props.techSupportModel!.props;
        return (
            <div id='infoTechSupportProperties'>
                <div id='techSupportPropertiesForm'>
                    <table>
                        <thead className="techSupportScrollable">
                            <tr>
                                <th className="techSupportPropName" align="left">Name</th>
                                <th align="left">Value</th>
                            </tr>
                        </thead>
                        <tbody className="techSupportPropsScrollable">
                        {theProps.map((item:GUITechSupportProp, index:number) => {
                            if (item.canEdit === false) {
                                return <tr key={item.name}>
                                            <td>{item.name}</td>
                                            <td>{item.value}</td>
                                       </tr>
                            } else {
                                return <tr className="techSupportPropName" key={item.name}>
                                            <td title={item.comment}>{item.name}</td>
                                            <InputField label={item.name}
                                                        showLabel={false}
                                                        showLabelColumn={false}
                                                        row={false}
                                                        size={8}
                                                        text={item.value}
                                                        key={item.name}
                                                        idName={'tsprops' + index}
                                                        fieldName={String(index)}
                                                        maxLength={10}
                                                        objectType={ObjectType.TECH_SUPPORT_PROPS}
                                                        objectId={String(index)}
                                                        characterType={CharacterType.TEXT}
                                                        enactType={EnactType.USER_ACTION_NOT_UNDOABLE}
                                                        topStore={this.props.topStore}
                                                        undoManager={this.props.undoManager}
                                            />
                                       </tr>
                            }
                        })}
                        </tbody>
                    </table>
                </div>
                <div id='infoPanelTechSupportPropsBottom'>
                    <span>
                         <button id='save'
                                 type={'button'}
                                 onClick={this.onSaveClicked}
                         >
                             Save
                         </button>
                    </span>
                </div>
            </div>
        )
    }
}

export default InfoPanelTechSupportProperties;