import React, {ChangeEvent} from 'react';
import './InfoPanel.css';
import SelectField, {Option} from "../fields/SelectField";
import {Action, GUICCAPGIClient, GUICCSTSClient, ObjectType, UpdateType} from "../AptdClientTypes";
import {APGIReportType, GUIAPConfig, Interface, Location, VirtualCcType} from "../AptdServerTypes";
import TopStore from "../TopStore";
import UndoManager from "../UndoManager";
import Note from "../fields/Note";


interface InfoPanelAPVCCProps {
    apId: string,
    apModel: GUIAPConfig,
    apgi: GUICCAPGIClient | null,
    topStore: TopStore,
    undoManager: UndoManager,
}


interface InfoPanelAPVCCState {

}


/**
 * We keep top-level state in AptdApp as the
 * source of *verified* truth. Local state is in InputField components.
 */
class InfoPanelAPVCC extends React.Component<InfoPanelAPVCCProps, InfoPanelAPVCCState> {
    private readonly vccOptions: Array<Option>;
    private readonly apgiOptions: Array<Option>;

    constructor(props: InfoPanelAPVCCProps) {
        super(props);
        console.debug('lifecycle InfoPanelAPVCC constructor(): start. this.props.apId=', this.props.apModel.id);
        this.vccOptions = [
            {text: 'None', value: VirtualCcType.NONE},
            {text: 'BVD/STS', value: VirtualCcType.STS},
            {text: 'APGI', value: VirtualCcType.APGI},
        ];
        this.apgiOptions = [
            {text: 'Mapped', value: APGIReportType.MAPPED},
            {text: 'Configured', value: APGIReportType.CONFIGURED},
            {text: 'All', value: APGIReportType.ALL},
         ];

        this.state = {
        };

        this.onChangeVirtualCC = this.onChangeVirtualCC.bind(this);
    }

    render() {
        const ccCards = this.props.topStore.getTopState().ccCards;
        const nCcCards: number = Object.keys(ccCards).length;
        let existPhysicalCards: boolean;
        if (nCcCards > 0) {
            const aCard = (Object.values(ccCards))[0];
            if (aCard.cardInterface === Interface.CCCard ||
                aCard.cardInterface === Interface.EXCard ||
                aCard.cardInterface === Interface.SDLC) {

                existPhysicalCards = true;
            } else {
                existPhysicalCards = false;
            }
        } else {
            existPhysicalCards = false;
        }

        return (
            <div id='infoAPVCC'>
                <div id='apVCCForm'>
                    <table>
                        <tbody>
                        <SelectField label='Virtual CC Enable'
                                     value={this.props.apModel.virtualCCMode}
                                     key={'apVirtualCCMode'}
                                     options={this.vccOptions}
                                     idName={'apVirtualCCMode'}
                                     className={'apVirtualCCMode'}
                                     fieldName='virtualCCMode'
                                     objectType={ObjectType.AP}
                                     objectId={this.props.apModel.id}
                                     disabled={existPhysicalCards}
                                     onChangeAddActions={this.onChangeVirtualCC}
                                     topStore={this.props.topStore}
                                     undoManager={this.props.undoManager}
                        />
                        <tr className='row'>
                            <td colSpan={2}>
                                <Note text="APGI is Sensys Networks' Virtual Contact Closure Device"
                                      idName='vccNote1'
                                />
                            </td>
                        </tr>
                        <tr className='row'>
                            <td colSpan={2}>
                                <Note text="BVD/STS is Siemens' Virtual Contact Closure Device"
                                      idName='vccNote2'
                                />
                            </td>
                        </tr>
                        <SelectField label='APGI Report Sensors'
                                     value={this.props.apgi === null || this.props.apgi === undefined ? APGIReportType.MAPPED : this.props.apgi.mode}
                                     disabled={this.props.apModel.virtualCCMode !== VirtualCcType.APGI}
                                     key={'apgiReportMode'}
                                     options={this.apgiOptions}
                                     idName={'apgiReportMode'}
                                     className={'apgiReportMode'}
                                     fieldName='mode'
                                     objectType={ObjectType.APGI}
                                     objectId={'APGI'}
                                     topStore={this.props.topStore}
                                     undoManager={this.props.undoManager}
                        />
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }

    /**
     * Updates the current ccCardType on AP.
     * If switching between virtual ccCardTypes, origValue of update action will be reassigned to NONE.
     * This handles the Undo/Redo prevention between ccCardTypes.
     */
    onChangeVirtualCC(event: ChangeEvent<HTMLSelectElement>, updateAction: Action): Action[] {
        const value: string = event.target.value;
        switch (value as VirtualCcType) {
            case VirtualCcType.APGI:
            {
                // init the CC Card as APGI.
                // This is in addition to setting the value of ap's virtual cc enable.
                // TODO: what if there already is some APGI data set up, e.g. channels?
                // TODO: maybe do a 'clear all' before ADD to handle edge case of existing cards
                const INITIAL_APGI: GUICCAPGIClient = {
                    mode: APGIReportType.MAPPED,
                    channelsById: {},
                    majorFirmwareVersion: -1,
                    minorFirmwareVersion: -1,
                    cardInterface: Interface.APGI,
                    info: {
                        location: Location.MAP,
                        position: {x: 0, y: 0},
                        ccLinks: [],
                        rotationDegrees: 0
                    },
                    otype: "GUICCAPGI",
                    id: 'APGI',
                    unheard: false,
                };

                const action: Action = {
                    objectType: ObjectType.CCCARD,
                    objectId: 'APGI',
                    updateType: UpdateType.ADD,
                    newData: INITIAL_APGI,
                    origData: null,
                };

                //Remove any references to STS in the undo/redo stack when switching to APGI
                updateAction.origData = {'virtualCCMode': VirtualCcType.NONE};
                this.props.undoManager.removeFromUndoStack(VirtualCcType.STS);
                this.props.undoManager.removeFromRedoStack(VirtualCcType.STS);
                return [updateAction, action];
            }

            case VirtualCcType.STS:
            {
                // init the CC Card as STS.
                // This is in addition to setting the value of ap's virtual cc enable.
                // TODO: what if there already is some STS data set up, e.g. channels?
                // TODO: maybe do a 'clear all' before ADD to handle edge case of existing cards
                const INITIAL_STS: GUICCSTSClient = {
                    addrMap: {},
                    channelsById: {},
                    majorFirmwareVersion: -1,
                    minorFirmwareVersion: -1,
                    cardInterface: Interface.STS,
                    info: {
                        location: Location.MAP,
                        position: {x: 0, y: 0},
                        ccLinks: [],
                        rotationDegrees: 0
                    },
                    otype: "GUICCSTS",
                    id: 'STS',
                    unheard: false,
                };

                const action: Action = {
                    objectType: ObjectType.CCCARD,
                    objectId: 'STS',
                    updateType: UpdateType.ADD,
                    newData: INITIAL_STS,
                    origData: null,
                };
                //Remove any references to APGI in the undo/redo stack when switching to STS
                updateAction.origData = {'virtualCCMode': VirtualCcType.NONE};
                this.props.undoManager.removeFromUndoStack(VirtualCcType.APGI);
                this.props.undoManager.removeFromRedoStack(VirtualCcType.APGI);
                return [updateAction, action];
            }

            case VirtualCcType.NONE:
            {
                const ccCards = this.props.topStore.getTopState().ccCards;
                if (Object.values(ccCards).length > 0) {
                    const aCard = Object.values(ccCards)[0];
                    switch (aCard.cardInterface) {
                        case Interface.APGI:
                            const actions1: Action = {
                                objectType: ObjectType.CCCARD,
                                objectId: 'APGI',
                                updateType: UpdateType.DELETE,
                                newData: null,
                                origData: aCard,
                            };
                            return [updateAction, actions1];
                        case Interface.STS:
                            const actions2: Action = {
                                objectType: ObjectType.CCCARD,
                                objectId: 'STS',
                                updateType: UpdateType.DELETE,
                                newData: null,
                                origData: aCard,
                            };
                            return [updateAction, actions2];
                        default:
                            console.error('unexpected cardInterface: ', aCard.cardInterface);
                            return [updateAction];
                    }
                } else {
                    console.error('unexpected state');
                    return [updateAction];
                }
            }

            default:
                console.error('unexpected VirtualCcType: ' + this.props.apModel.virtualCCMode);
                return [];
        }
    }
}

export default InfoPanelAPVCC;