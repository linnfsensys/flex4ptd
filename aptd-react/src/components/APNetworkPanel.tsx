import React, { useState, useCallback } from 'react';
import { useMapDevices } from '../store/hooks';
import SelectField, { Option } from '../fields/SelectField';
import InputField from '../fields/InputField';
import ReadOnlyField from '../fields/ReadOnlyField';
import { CharacterType, ObjectType } from '../AptdClientTypes';
import { IPMode, VPNType } from '../AptdServerTypes';
import AptdButton from '../AptdButton';
import CheckboxField from '../fields/CheckboxField';
import '../infoPanels/InfoPanel.css';
import WebSocketManager from '../WebSocketManager';
import TopStore from '../TopStore';
import UndoManager from '../UndoManager';

interface APNetworkPanelProps {
  webSocketManager: WebSocketManager | null;
  topStore: TopStore;
  undoManager: UndoManager;
  onRequireLoginChanged: () => void;
}

/**
 * gateway network settings panel component - Zustand version
 * corresponding to the original InfoPanelAPNetwork component
 * provides network configuration, VPN settings, time zone settings, etc.
 */
const APNetworkPanel: React.FC<APNetworkPanelProps> = ({ 
  webSocketManager, 
  topStore, 
  undoManager,
  onRequireLoginChanged
}) => {
  const { ap } = useMapDevices();
  
  // IP address mode options
  const ipAddrModeOptions: Array<Option> = [
    { text: 'DHCP', value: IPMode.DHCP },
    { text: 'Static', value: IPMode.STATIC },
  ];

  // VPN type options
  const vpnTypeOptions: Array<Option> = [
    { text: 'PPTP', value: VPNType.PPTP },
    { text: 'PPIP', value: VPNType.PPIP },
    { text: 'Disabled', value: VPNType.DISABLED },
  ];

  // sync NTP server
  const handleSyncNTP = useCallback(() => {
    if (webSocketManager) {
      webSocketManager.sendSyncNTPMsg();
    }
  }, [webSocketManager]);

  // transform boolean to requireLogin
  const transformBooleanToRequireLogin = (bool: boolean) => {
    if (bool) {
      return { requireLogin: 'ENABLED' };
    } else {
      return { requireLogin: 'DISABLED' };
    }
  };

  if (!ap) {
    return <div>Loading...</div>;
  }

  const apegId = ap.serialNumber ? 'apeg' + ap.serialNumber : '';
  const isVpnEnabled = ap.vpnType && ap.vpnType !== VPNType.DISABLED;

  return (
    <div id="infoAPNetwork">
      <div id="apNetworkForm">
        <table>
          <tbody>
            <tr className="readOnlyField row">
              <td className="right">
                <label htmlFor="apId" className="cell right readOnlyLabel">ID&nbsp;</label>
              </td>
              <td>
                <input id="apId" type="text" className="cell readOnlyInput" readOnly disabled value={apegId} />
              </td>
            </tr>
            <tr className="readOnlyField row">
              <td className="right">
                <label htmlFor="apFirmwareVersion" className="cell right readOnlyLabel">Firmware Version&nbsp;</label>
              </td>
              <td>
                <input 
                  id="apFirmwareVersion" 
                  type="text" 
                  className="cell readOnlyInput" 
                  readOnly 
                  disabled 
                  value={ap.apFirmwareVersion || ''} 
                />
              </td>
            </tr>

            <tr>
              <td colSpan={2}>
                <h4>Network</h4>
                <hr />
              </td>
            </tr>
            <SelectField 
              label="IP Address Mode" 
              idName="apIpAddrMode" 
              fieldName="ipAddrMode"
              objectType={ObjectType.AP}
              objectId="ap"
              options={ipAddrModeOptions}
              value={ap.ipAddrMode || IPMode.DHCP}
              topStore={topStore}
              undoManager={undoManager}
              className="info-panel-select"
              key="apIpAddrMode"
            />
            
            {ap.ipAddrMode === IPMode.STATIC && (
              <>
                <InputField 
                  label="IP Address" 
                  text={ap.ipAddr || ''} 
                  idName="apIpAddr" 
                  fieldName="ipAddr"
                  maxLength={15}
                  objectType={ObjectType.AP}
                  objectId="ap"
                  topStore={topStore}
                  undoManager={undoManager}
                />
                <InputField 
                  label="Subnet Mask" 
                  text={ap.netMask || ''} 
                  idName="apNetmask" 
                  fieldName="netMask"
                  maxLength={15}
                  objectType={ObjectType.AP}
                  objectId="ap"
                  topStore={topStore}
                  undoManager={undoManager}
                />
                <InputField 
                  label="Gateway" 
                  text={ap.gateway || ''} 
                  idName="apGateway" 
                  fieldName="gateway"
                  maxLength={15}
                  objectType={ObjectType.AP}
                  objectId="ap"
                  topStore={topStore}
                  undoManager={undoManager}
                />
                <InputField 
                  label="DNS Server" 
                  text={ap.dns || ''} 
                  idName="apDns" 
                  fieldName="dns"
                  maxLength={15}
                  objectType={ObjectType.AP}
                  objectId="ap"
                  topStore={topStore}
                  undoManager={undoManager}
                />
              </>
            )}
            
            <InputField 
              label="Hostname" 
              text={ap.hostname || ''} 
              idName="apHostname" 
              fieldName="hostname"
              maxLength={253}
              objectType={ObjectType.AP}
              objectId="ap"
              disabled={ap.ipAddrMode !== IPMode.DHCP}
              topStore={topStore}
              undoManager={undoManager}
            />

            <tr>
              <td colSpan={2}>
                <h4>VPN</h4>
                <hr />
              </td>
            </tr>
            <ReadOnlyField 
              label="VPN Hostname" 
              text={ap.hostname || ''} 
              idName="apHostname" 
              fieldName="hostname"
              deviceType={ObjectType.AP}
              deviceId="ap"
            />
            <SelectField 
              label="VPN Type" 
              idName="apVpnType" 
              fieldName="vpnType"
              objectType={ObjectType.AP}
              objectId="ap"
              options={vpnTypeOptions}
              value={ap.vpnType || VPNType.DISABLED}
              topStore={topStore}
              undoManager={undoManager}
              className="info-panel-select"
              key="apVpnType"
            />
            
            {isVpnEnabled && (
              <>
                <InputField 
                  label="VPN Server" 
                  text={(ap as any).vpnServer || ''} 
                  idName="apVpnServer" 
                  fieldName="vpnServer"
                  maxLength={253}
                  objectType={ObjectType.AP}
                  objectId="ap"
                  disabled={!isVpnEnabled}
                  topStore={topStore}
                  undoManager={undoManager}
                />
                <InputField 
                  label="VPN Username" 
                  text={ap.vpnUsername || ''} 
                  idName="apVpnUsername" 
                  fieldName="vpnUsername"
                  maxLength={64}
                  objectType={ObjectType.AP}
                  objectId="ap"
                  disabled={!isVpnEnabled}
                  topStore={topStore}
                  undoManager={undoManager}
                />
                <InputField 
                  label="VPN Password" 
                  text={ap.vpnPassword || ''} 
                  idName="apVpnPassword" 
                  fieldName="vpnPassword"
                  maxLength={64}
                  objectType={ObjectType.AP}
                  objectId="ap"
                  disabled={!isVpnEnabled}
                  topStore={topStore}
                  undoManager={undoManager}
                />
              </>
            )}

            <tr>
              <td colSpan={2}>
                <h4>Time Zone</h4>
                <hr />
              </td>
            </tr>
            <SelectField 
              label="Gateway Time Zone" 
              idName="apTimeZone" 
              fieldName="timeZone"
              objectType={ObjectType.AP}
              objectId="ap"
              options={Object.entries(ap.allTimeZones || {}).map(([text, value]) => ({ text, value: String(value) }))}
              value={ap.timeZone || ''}
              topStore={topStore}
              undoManager={undoManager}
              className="info-panel-select"
              key="apTimeZone"
            />
            
            <tr>
              <td colSpan={2}>
                <h4>NTP Server</h4>
                <hr />
              </td>
            </tr>
            <InputField 
              label="NTP Server 1" 
              text={(ap.ntpHosts && ap.ntpHosts[0]) || ''} 
              idName="apNtpServer1" 
              fieldName="ntpHosts[0]"
              maxLength={253}
              objectType={ObjectType.AP}
              objectId="ap"
              topStore={topStore}
              undoManager={undoManager}
            />
            <InputField 
              label="NTP Server 2" 
              text={(ap.ntpHosts && ap.ntpHosts[1]) || ''} 
              idName="apNtpServer2" 
              fieldName="ntpHosts[1]"
              maxLength={253}
              objectType={ObjectType.AP}
              objectId="ap"
              topStore={topStore}
              undoManager={undoManager}
            />
            <InputField 
              label="NTP Server 3" 
              text={(ap.ntpHosts && ap.ntpHosts[2]) || ''} 
              idName="apNtpServer3" 
              fieldName="ntpHosts[2]"
              maxLength={253}
              objectType={ObjectType.AP}
              objectId="ap"
              topStore={topStore}
              undoManager={undoManager}
            />
            
            <tr>
              <td></td>
              <td>
                <AptdButton 
                  id="syncNtpButton"
                  text="Sync NTP Server" 
                  title="Sync NTP Server"
                  onClick={handleSyncNTP} 
                  disabled={!webSocketManager}
                />
              </td>
            </tr>
            
            <tr>
              <td colSpan={2}>
                <h4>Security</h4>
                <hr />
              </td>
            </tr>
            <CheckboxField 
              label="Require Login Password" 
              value={ap.requireLogin === 'ENABLED'} 
              idName="requireLogin" 
              className="info-panel-checkbox"
              key="requireLogin"
              fieldName="requireLogin"
              objectType={ObjectType.AP}
              objectId="ap"
              transformValueToStore={transformBooleanToRequireLogin}
              onChange={onRequireLoginChanged}
              topStore={topStore}
              undoManager={undoManager}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default APNetworkPanel; 