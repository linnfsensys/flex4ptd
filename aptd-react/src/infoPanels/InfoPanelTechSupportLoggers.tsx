import React, {ChangeEvent} from 'react';
import './InfoPanelTechSupport.css';
import {ObjectType, EnactType, ModalType} from "../AptdClientTypes";
import {GUITechSupport, GUITechSupportLogger} from "../AptdServerTypes";
import SelectField, {Option} from "../fields/SelectField";
import WebSocketManager from "../WebSocketManager";
import UndoManager from "../UndoManager";
import TopStore from "../TopStore";

interface InfoPanelTechSupportLoggersProps {
    techSupportModel: GUITechSupport | null,
    webSocketManager: WebSocketManager | null,
    topStore: TopStore,
    undoManager: UndoManager,
}

interface LoggersMap {
    name: string,
    level: string
}

export enum TechSupportLogLevel {
    OFF = "Off",
    FATAL = "Fatal" ,
    ERROR = "Error" ,
    WARN = "Warn" ,
    INFO = "Info" ,
    DEBUG = "Debug" ,
    TRACE = "Trace" ,
    ALL = "All"
}

/**
 * this version uses local state. We keep top-level state in AptdApp as the
 * source of *verified* truth, but need local state to reflect user input,
 * in case where user makes errors.  Local state is in InputField components.
 */
class InfoPanelTechSupportLoggers extends React.Component<InfoPanelTechSupportLoggersProps> {
    private techSupportLogOptions: Array<Option>;

    constructor(props: InfoPanelTechSupportLoggersProps) {
        super(props);
        this.onSaveClicked = this.onSaveClicked.bind(this);
        this.onChangeAll = this.onChangeAll.bind(this);
        console.debug('lifecycle InfoPanelTechSupportLoggers constructor(): start');

        this.techSupportLogOptions =  [
            {value: TechSupportLogLevel.OFF, text: 'Off'},
            {value: TechSupportLogLevel.FATAL, text: 'Fatal'},
            {value: TechSupportLogLevel.ERROR, text: 'Error'},
            {value: TechSupportLogLevel.WARN, text: 'Warn'},
            {value: TechSupportLogLevel.INFO, text: 'Info'},
            {value: TechSupportLogLevel.DEBUG, text: 'Debug'},
            {value: TechSupportLogLevel.TRACE, text: 'Trace'},
            {value: TechSupportLogLevel.ALL, text: 'All'},
        ];
    }

    componentDidMount():void {
        window.addEventListener("resize", this.updateSize);
    }

    componentWillUnmount():void {
        window.removeEventListener("resize", this.updateSize);
    }

    updateSize(event:any):void
    {
        //let tbody = document.getElementById("tbody");
    }

    transformValueToStore(useValue:string):{[fieldName:string]: string} {
        return {useValue};
    }

    lookupLogEnum(value: string):TechSupportLogLevel {
        const theValue = value.toUpperCase();
        if (theValue === "OFF") return TechSupportLogLevel.OFF;
        else if (theValue === "FATAL") return TechSupportLogLevel.FATAL;
        else if (theValue === "ERROR") return TechSupportLogLevel.ERROR;
        else if (theValue === "WARN") return TechSupportLogLevel.WARN;
        else if (theValue === "INFO") return TechSupportLogLevel.INFO;
        else if (theValue === "DEBUG") return TechSupportLogLevel.DEBUG;
        else if (theValue === "TRACE") return TechSupportLogLevel.TRACE;
        else if (theValue === "ALL") return TechSupportLogLevel.ALL;
        else return TechSupportLogLevel.OFF;
    }

    onSaveClicked(event: React.MouseEvent<HTMLButtonElement, MouseEvent>):void {
        console.debug('user clicked Save button. about to send Save msg to server');
        if (this.props.webSocketManager === null) {
            console.error('websocketManager is null');
            this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'SensConfig is unable to connect.');
        } else {
            this.props.webSocketManager.sendTechSupportSaveLoggersMsg();
        }
    }

    onChangeAll(event: ChangeEvent<HTMLSelectElement>) {
        let theLoggersMap:{[key: string]: string} =  this.props.techSupportModel!.loggers;
        for (const key of Object.keys(theLoggersMap)) {
            let x = event.currentTarget;
            theLoggersMap[key] = x[event.currentTarget.selectedIndex].label.toUpperCase();
        }
        this.props.techSupportModel!.loggers = theLoggersMap;
        this.forceUpdate();
    }

    render() {
        let theLoggersMap =  this.props.techSupportModel!.loggers;

        // in order to use .map() in the return, theLoggerMap contents are here
        // converted to an array
        let theLoggers:GUITechSupportLogger[] = [];
        for (const key in theLoggersMap) {
            let theLevel = theLoggersMap[key] as unknown as string;
            theLoggers.push({name:key, logLevel:theLevel});
         }

        return (
            <div id='infoTechSupportLoggers'>
                <div id='techSupportLoggersForm'>
                    <table>
                        <tbody>
                            <tr>
                                <td>Change all levels to</td>
                                <td>
                                    <select id='setAllSelect'
                                            className='setAllClass'
                                            onChange={this.onChangeAll}>
                                        {
                                            this.techSupportLogOptions.map((option) => (
                                                <option value={option.value}
                                                        key={option.text}
                                                >{option.text}
                                                </option>
                                            ))
                                        }
                                    </select>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <table>
                        <thead className="techSupportScrollable">
                        <tr className="techSupportscrollable">
                            <th className="techSupportLoggerName" align="left">Name</th>
                            <th align="left">Level</th>
                        </tr>
                        </thead>
                         <tbody id="tbody" className="techSupportLoggersScrollable">
                        {theLoggers.map(item => {
                            return <tr key={item.name}>
                                <td>{item.name}</td>
                                <SelectField label={''}
                                             row={false}
                                             showLabel={false}
                                             value={this.lookupLogEnum(item.logLevel)}
                                             key={item.name}
                                             options={this.techSupportLogOptions}
                                             idName={item.name}
                                             className={'logLevelClass'}
                                             fieldName={'logLevelField'}
                                             objectType={ObjectType.TECH_SUPPORT_LOGGERS}
                                             objectId={item.name}
                                             transformValueToStore={this.transformValueToStore}
                                             enactType={EnactType.USER_ACTION_NOT_UNDOABLE}
                                             topStore={this.props.topStore}
                                             undoManager={this.props.undoManager}
                                />
                            </tr>
                        })}
                        </tbody>
                    </table>
                </div>
                <div id='infoPanelTechSupportLoggersBottom'>
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

export default InfoPanelTechSupportLoggers;