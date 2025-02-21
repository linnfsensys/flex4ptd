import React from 'react';
import './InfoPanel.css';
import SelectField, {Option} from "../fields/SelectField";
import InputField from "../fields/InputField";
import ReadOnlyField from "../fields/ReadOnlyField";
import {CharacterType, GUIAPConfigClient, ModalType, ObjectType} from "../AptdClientTypes";
import {IPMode, RequireLogin, VPNType} from "../AptdServerTypes";
import UndoManager from "../UndoManager";
import TopStore from "../TopStore";
import WebSocketManager from "../WebSocketManager";
import CheckboxField from "../fields/CheckboxField";
import TimeZoneUnitsMapDisplay from "../TimeZoneUnitsMapDisplay";
import AptdButton from "../AptdButton";


interface InfoPanelAPNetworkProps {
    apId: string,
    apModel: GUIAPConfigClient,
    topStore: TopStore,
    undoManager: UndoManager,
    webSocketManager: WebSocketManager | null,
    onRequireLoginChanged: ()=>void,
}


interface InfoPanelAPNetworkState {
    timeZone: string,
    dhcpMonitorHost: string,
    ipAddrMode: IPMode,
}


/**
 * this version uses local state. We keep top-level state in AptdApp as the
 * source of *verified* truth, but need local state to reflect user input,
 * in case where user makes errors.  Local state is in InputField components.
 */
class InfoPanelAPNetwork extends React.Component<InfoPanelAPNetworkProps, InfoPanelAPNetworkState> {
    private readonly ipAddrModeOptions: Array<Option>;
    private readonly vpnTypeOptions: Array<Option>;

    constructor(props: InfoPanelAPNetworkProps) {
        super(props);
        console.debug('lifecycle InfoPanelAPNetwork constructor(): start. this.props.apId=', this.props.apModel.id);
        this.ipAddrModeOptions = [
            {text: 'DHCP', value: IPMode.DHCP},
            {text: 'Static', value: IPMode.STATIC},
            //{text: 'Disabled', value: IPMode.DISABLED},
        ];
        this.vpnTypeOptions = [
            {text: 'PPTP', value: VPNType.PPTP},
            {text: 'PPIP', value: VPNType.PPIP},
            {text: 'Disabled', value: VPNType.DISABLED},
            // OpenVPN not yet supported
            //{text: 'Open VPN', value: VPNType.OpenVPN},
        ];

        this.state = {
            timeZone: this.props.apModel.timeZone,
            dhcpMonitorHost: this.props.apModel.dhcpMonitorHost,
            ipAddrMode: this.props.apModel.ipAddrMode,
        };
        this.onSyncNTPClick = this.onSyncNTPClick.bind(this);
        this.scrollToTop = this.scrollToTop.bind(this);
    }


    private onSyncNTPClick() {
        if (this.props.webSocketManager === null) {
            console.error('websocketManager is null');
            this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'SensConfig is unable to connect.');
        } else {
            this.props.webSocketManager.sendSyncNTPMsg();
        }
    }

    componentDidMount():void {
        this.scrollToTop();
    }

    /**
     * Scroll the entire InfoPanel to the top.
     * Normally, scroll setting is common to all InfoPanels, so when an InfoPanel shows, it
     * inherits scroll setting of previous InfoPanel.
     * Calling this method will force a scroll to the top.
     */
    private scrollToTop() {
        // just using this as a way to scroll to top of InfoPanel
        const addrModeSelect:Element|null = document.querySelector('select#apIpAddrMode');
        if (addrModeSelect === null) {
            console.error('unexpected null addrModeSelect');
        } else {
            console.debug('InfoPanelAPNetwork.scrollToTop(): about to scrollIntoView()');
            addrModeSelect.scrollIntoView({behavior: 'auto', block: 'end'});
        }
    }

    render() {
        return (
            <div id='infoAPNetwork'>
                <div id='apNetworkForm'>
                    <table>
                        <tbody>
                            <ReadOnlyField label='ID'
                                        text={this.props.apModel.serialNumber === undefined ?
                                              'unknown' : 'apeg' + this.props.apModel.serialNumber}
                                        idName='apId'
                                        fieldName={'id'}
                                        deviceId='AP'
                                        deviceType={ObjectType.AP}
                            />

                            <ReadOnlyField label='Firmware Version'
                                           text={this.props.apModel.apFirmwareVersion}
                                           idName='apFirmwareVersion'
                                           fieldName={'apFirmwareVersion'}
                                           deviceId='AP'
                                           deviceType={ObjectType.AP}
                            />
                            <tr>
                                <td colSpan={2}>
                                    <h4>Network</h4>
                                    <hr/>
                                </td>
                            </tr>
                            <SelectField label='IP Address Mode'
                                         value={this.props.apModel.ipAddrMode}
                                         key={'apIpAddrMode'}
                                         options={this.ipAddrModeOptions}
                                         idName={'apIpAddrMode'}
                                         className={'apIpAddrMode'}
                                         fieldName='ipAddrMode'
                                         objectType={ObjectType.AP}
                                         objectId={this.props.apModel.id}
                                         topStore={this.props.topStore}
                                         undoManager={this.props.undoManager}
                            />
                            {this.props.apModel.ipAddrMode !== IPMode.DHCP &&
                                <>
                                    <InputField label='IP Address'
                                        text={this.props.apModel.ipAddr}
                                        disabled={this.props.apModel.ipAddrMode === IPMode.DISABLED}
                                        required={this.props.apModel.ipAddrMode === IPMode.STATIC}
                                        idName='apIpAddr'
                                        key='apIpAddr'
                                        fieldName={'ipAddr'}
                                        objectId='AP'
                                        objectType={ObjectType.AP}
                                        characterType={CharacterType.DOTTED_QUAD_OR_HOSTNAME}
                                        maxLength={15}
                                        topStore={this.props.topStore}
                                        undoManager={this.props.undoManager}
                                    />
                                    <InputField label='Net Mask'
                                                text={this.props.apModel.netMask}
                                                disabled={this.props.apModel.ipAddrMode === IPMode.DISABLED}
                                                required={this.props.apModel.ipAddrMode === IPMode.STATIC}
                                                idName='apNetMask'
                                                key='apNetMask'
                                                fieldName={'netMask'}
                                                objectId='AP'
                                                objectType={ObjectType.AP}
                                                characterType={CharacterType.DOTTED_QUAD}
                                                maxLength={15}
                                                topStore={this.props.topStore}
                                                undoManager={this.props.undoManager}
                                    />
                                    <InputField label='Gateway'
                                                text={this.props.apModel.gateway}
                                                disabled={this.props.apModel.ipAddrMode === IPMode.DISABLED}
                                                required={this.props.apModel.ipAddrMode === IPMode.STATIC}
                                                idName='apGateway'
                                                key='apGateway'
                                                fieldName={'gateway'}
                                                objectId='AP'
                                                objectType={ObjectType.AP}
                                                characterType={CharacterType.DOTTED_QUAD_OR_HOSTNAME}
                                                maxLength={15}
                                                topStore={this.props.topStore}
                                                undoManager={this.props.undoManager}                        
                                    />
                                    <InputField label='DNS'
                                                text={this.props.apModel.dns}
                                                disabled={this.props.apModel.ipAddrMode === IPMode.DISABLED}
                                                required={false}
                                                idName='apDns'
                                                key='apDns'
                                                fieldName='dns'
                                                objectId='AP'
                                                objectType={ObjectType.AP}
                                                characterType={CharacterType.DOTTED_QUAD}
                                                maxLength={15}
                                                topStore={this.props.topStore}
                                                undoManager={this.props.undoManager}
                                    />
                                </>
                            }
                            <InputField label='DHCP&nbsp;Monitor&nbsp;Host'
                                        text={this.props.apModel.dhcpMonitorHost}
                                        disabled={this.props.apModel.ipAddrMode === IPMode.DISABLED ||
                                                  this.props.apModel.ipAddrMode === IPMode.STATIC}
                                        idName='apDhcpMonitorHost'
                                        key='apDhcpMonitorHost'
                                        fieldName={'dhcpMonitorHost'}
                                        objectId='AP'
                                        objectType={ObjectType.AP}
                                        characterType={CharacterType.DOTTED_QUAD_OR_HOSTNAME}
                                        maxLength={253}
                                        topStore={this.props.topStore}
                                        undoManager={this.props.undoManager}
                            />

                            <tr>
                                <td colSpan={2}>
                                    <h4>VPN</h4>
                                    <hr/>
                                </td>
                            </tr>

                            <ReadOnlyField label={'VPN Host'}
                                           text={this.props.apModel.hostname}
                                           idName='apHostname'
                                           fieldName={'hostname'}
                                           deviceType={ObjectType.AP}
                                           deviceId='AP'
                            />
                            <SelectField label='VPN Mode'
                                         value={this.props.apModel.vpnType}
                                         key={'apVpnType'}
                                         options={this.vpnTypeOptions}
                                         //disabled={this.props.apModel.hostname === ''}
                                         idName={'apVpnType'}
                                         className={'apVpnType'}
                                         fieldName='vpnType'
                                         objectType={ObjectType.AP}
                                         objectId={this.props.apModel.id}
                                         topStore={this.props.topStore}
                                         undoManager={this.props.undoManager}
                            />
                            <InputField label='User&nbsp;Name'
                                        text={this.props.apModel.vpnUsername}
                                        idName='apVpnUsername'
                                        key='apVpnUsername'
                                        fieldName={'vpnUsername'}
                                        objectId='AP'
                                        objectType={ObjectType.AP}
                                        characterType={CharacterType.NAME}
                                        maxLength={64}
                                        disabled={this.props.apModel.vpnType === VPNType.DISABLED}
                                        topStore={this.props.topStore}
                                        undoManager={this.props.undoManager}
                            />
                            <InputField label='Password'
                                        text={this.props.apModel.vpnPassword}
                                        idName='apVpnPassword'
                                        key='apVpnPassword'
                                        fieldName={'vpnPassword'}
                                        objectId='AP'
                                        objectType={ObjectType.AP}
                                        characterType={CharacterType.TEXT}
                                        maxLength={64}
                                        password={true}
                                        disabled={this.props.apModel.vpnType === VPNType.DISABLED}
                                        topStore={this.props.topStore}
                                        undoManager={this.props.undoManager}
                            />
                            <InputField label='SNAPS&nbsp;Server'
                                        text={this.props.apModel.snapsServerHost}
                                        idName='aSnapsServerHost'
                                        key='aSnapsServerHost'
                                        fieldName={'snapsServerHost'}
                                        objectId='AP'
                                        objectType={ObjectType.AP}
                                        characterType={CharacterType.DOTTED_QUAD_OR_HOSTNAME}
                                        maxLength={253}
                                        required={this.props.apModel.vpnType !== VPNType.DISABLED}
                                        disabled={this.props.apModel.vpnType === VPNType.DISABLED}
                                        topStore={this.props.topStore}
                                        undoManager={this.props.undoManager}
                            />
                            <InputField label='PPP&nbsp;Monitor&nbsp;Host'
                                        text={this.props.apModel.pppMonitorHost}
                                        idName='apPppMonitorHost'
                                        key='apPppMonitorHost'
                                        fieldName={'pppMonitorHost'}
                                        objectId='AP'
                                        objectType={ObjectType.AP}
                                        characterType={CharacterType.DOTTED_QUAD_OR_HOSTNAME}
                                        maxLength={253}
                                        disabled={this.props.apModel.vpnType === VPNType.DISABLED}
                                        required={false}
                                        topStore={this.props.topStore}
                                        undoManager={this.props.undoManager}
                            />
                            <tr>
                                <td colSpan={2}>
                                    <h4>Time Config</h4>
                                    <hr/>
                                </td>
                            </tr>
                            <SelectField label="Gateway's Timezone"
                                         value={this.props.apModel === null ?
                                                '' : this.props.apModel.timeZone}
                                         key={'apTimeZone'}
                                         options={this.props.apModel === null ?
                                                  [] : TimeZoneUnitsMapDisplay.optionize(this.props.apModel.allTimeZones)}
                                         idName={'apTimeZone'}
                                         className={'timeZone'}
                                         fieldName='timeZone'
                                         objectType={ObjectType.AP}
                                         objectId='AP'
                                         topStore={this.props.topStore}
                                         undoManager={this.props.undoManager}
                            />
                            <InputField label='NTP&nbsp;Servers'
                                        text={this.props.apModel.ntpHosts[0]}
                                        idName='ntpHosts0'
                                        key='ntpHosts0'
                                        fieldName='ntpHosts'
                                        fieldIndex={0}
                                        objectId='AP'
                                        objectType={ObjectType.AP}
                                        characterType={CharacterType.DOTTED_QUAD_OR_HOSTNAME}
                                        disabled={(this.props.apModel.ipAddrMode === IPMode.STATIC &&
                                                   this.props.apModel.ipAddr === '') ||
                                                   this.props.apModel.ipAddrMode === IPMode.DISABLED}
                                        maxLength={253}
                                        topStore={this.props.topStore}
                                        undoManager={this.props.undoManager}                                                       />
                            <InputField
                                        label='NTP&nbsp;Servers'
                                        showLabel={false}
                                        text={this.props.apModel.ntpHosts[1]}
                                        idName='ntpHosts1'
                                        key='ntpHosts1'
                                        fieldName='ntpHosts'
                                        fieldIndex={1}
                                        objectId='AP'
                                        objectType={ObjectType.AP}
                                        characterType={CharacterType.DOTTED_QUAD_OR_HOSTNAME}
                                        disabled={(this.props.apModel.ipAddrMode === IPMode.STATIC &&
                                                   this.props.apModel.ipAddr === '') ||
                                                   this.props.apModel.ipAddrMode === IPMode.DISABLED}
                                        maxLength={253}
                                        topStore={this.props.topStore}
                                        undoManager={this.props.undoManager}                                                       />
                            <InputField
                                        label='NTP&nbsp;Servers'
                                        showLabel={false}
                                        text={this.props.apModel.ntpHosts[2]}
                                        idName='ntpHosts2'
                                        key='ntpHosts2'
                                        fieldName={'ntpHosts'}
                                        fieldIndex={2}
                                        objectId='AP'
                                        objectType={ObjectType.AP}
                                        characterType={CharacterType.DOTTED_QUAD_OR_HOSTNAME}
                                        disabled={(this.props.apModel.ipAddrMode === IPMode.STATIC &&
                                                   this.props.apModel.ipAddr === '') ||
                                                   this.props.apModel.ipAddrMode === IPMode.DISABLED}
                                        maxLength={253}
                                        topStore={this.props.topStore}
                                        undoManager={this.props.undoManager}
                            />
                            <tr>
                                <td> </td>
                                <td>
                                    <span className='buttonPane'>
                                        <AptdButton
                                            id='syncNtpdButton' title=''
                                            disabled={(this.props.apModel.ipAddrMode === IPMode.STATIC &&
                                                       this.props.apModel.ipAddr === '') ||
                                                       this.props.apModel.ipAddrMode === IPMode.DISABLED}
                                            theClassName='gray'
                                            onClick={this.onSyncNTPClick}
                                            text='Sync NTPD'
                                        />
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td colSpan={2}>
                                    <h4>Security</h4>
                                    <hr/>
                                </td>
                            </tr>
                            <CheckboxField label={'Require Login Password'}
                                           value={this.props.topStore.getTopState().ap === null ?
                                                  false :
                                                  this.props.topStore.getTopState().ap!.requireLogin === RequireLogin.ENABLED}
                                           idName={'requireLogin'} className={'requireLogin'}
                                           key={'requireLogin'} fieldName={'requireLogin'}
                                           objectType={ObjectType.AP} 
                                           objectId={'AP'}
                                           transformValueToStore={this.transformBooleanToRequireLogin}
                                           onChange={this.props.onRequireLoginChanged}
                                           topStore={this.props.topStore}
                                           undoManager={this.props.undoManager}/>

                        </tbody>
                    </table>
                </div>
            </div>
        )
    }


    transformTimeZoneValueToStore(timeZoneValue:string):{[fieldName:string]: string} {
        return {timeZone: timeZoneValue};
    }

    public transformBooleanToRequireLogin(bool: boolean):  {[fieldname: string]: string} {
        if (bool) {
            return {requireLogin: RequireLogin.ENABLED};
        } else {
            return {requireLogin: RequireLogin.DISABLED};
        }
    }
}

export default InfoPanelAPNetwork;