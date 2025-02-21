import React from 'react';
import {CharacterType, GUICCSTSClient, ObjectType, STSChannelIdClient,} from "../AptdClientTypes";
import TopStore from "../TopStore";
import UndoManager from "../UndoManager";
import './InfoPanelSTS.css'
import {ChannelNumber} from "../AptdServerTypes";
import {Option} from "../fields/SelectField";
import InputField from "../fields/InputField";


interface InfoPanelStsIPsProps {
    stsModel: GUICCSTSClient,
    topStore: TopStore,
    undoManager: UndoManager,
}

interface InfoPanelStsIPsState {
}


/**
 * this version uses local state. We keep top-level state in AptdApp as the
 * source of *verified* truth, but need local state to reflect user input,
 * in case where user makes errors.  Local state is in InputField components.
 */
export default class InfoPanelStsIPs extends React.Component<InfoPanelStsIPsProps, InfoPanelStsIPsState> {
    ipOptions: Option[] = [];

    constructor(props: InfoPanelStsIPsProps) {
        super(props);
        //console.debug('lifecycle InfoPanelSTS constructor(): start. this.props.ccId=', this.props.ccModel.id);

        this.state = {
        };
    }


    /** for StsChannel */
    render() {
        const IP_KEYS = ['IP1', 'IP2', 'IP3', 'IP4', 'IP5'];
        return (
            <div id='infoPanelStsIPs'>
                <div id='stsForm'>
                    <h4>Configured IPs</h4>
                    {/* there is a max of 5 IPs */}
                    <table>
                        <tbody>
                        {IP_KEYS.map((ipKey: string, index) => {
                            let ipAddr: string = this.props.stsModel.addrMap[ipKey];
                            if (ipAddr === undefined) {
                                ipAddr = '';
                            }
                            return <InputField label={ipKey}
                                           text={ipAddr}
                                           idName={'ip' + (index + 1)}
                                           key={ipKey}
                                           fieldName={'addrMap'}
                                           fieldIndex={ipKey}
                                           objectType={ObjectType.STS_ADDR_MAP}
                                           objectId={'STS'}
                                           maxLength={15}
                                           characterType={CharacterType.DOTTED_QUAD}
                                           topStore={this.props.topStore}
                                           undoManager={this.props.undoManager}/>
                            })
                        }
                        </tbody>
                    </table>
                    <hr/>
                </div>
            </div>
        )
    }


    /** @returns e.g., "IP15-G16-CH_4" */
    private static toUserChannelId(stsChannelTemp: STSChannelIdClient): string {
        return 'IP' + stsChannelTemp.ip + '-' +
            'G' + stsChannelTemp.group + '-' +
            'CH_' + stsChannelTemp.channel;
    }


    private static toChannelNumber(channel: string): ChannelNumber {
        return 'CH_' + channel as ChannelNumber;
    }
}