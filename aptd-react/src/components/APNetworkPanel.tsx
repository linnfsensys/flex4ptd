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
 * 网关网络设置面板组件 - Zustand版本
 * 对应原来的InfoPanelAPNetwork组件
 * 提供网络配置、VPN设置、时区设置等功能
 */
const APNetworkPanel: React.FC<APNetworkPanelProps> = ({ 
  webSocketManager, 
  topStore, 
  undoManager,
  onRequireLoginChanged
}) => {
  const { ap } = useMapDevices();
  
  // IP地址模式选项
  const ipAddrModeOptions: Array<Option> = [
    { text: 'DHCP', value: IPMode.DHCP },
    { text: 'Static', value: IPMode.STATIC },
  ];

  // VPN类型选项
  const vpnTypeOptions: Array<Option> = [
    { text: 'PPTP', value: VPNType.PPTP },
    { text: 'PPIP', value: VPNType.PPIP },
    { text: 'Disabled', value: VPNType.DISABLED },
  ];

  // 同步NTP服务器
  const handleSyncNTP = useCallback(() => {
    if (webSocketManager) {
      webSocketManager.sendSyncNTPMsg();
    }
  }, [webSocketManager]);

  // 转换布尔值到RequireLogin
  const transformBooleanToRequireLogin = (bool: boolean) => {
    if (bool) {
      return { requireLogin: 'ENABLED' };
    } else {
      return { requireLogin: 'DISABLED' };
    }
  };

  if (!ap) {
    return <div>加载中...</div>;
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
                <label htmlFor="apFirmwareVersion" className="cell right readOnlyLabel">固件版本&nbsp;</label>
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
                <h4>网络</h4>
                <hr />
              </td>
            </tr>
            <SelectField 
              label="IP地址模式" 
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
                  label="IP地址" 
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
                  label="子网掩码" 
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
                  label="网关" 
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
                  label="DNS服务器" 
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
              label="主机名" 
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
              label="VPN主机" 
              text={ap.hostname || ''} 
              idName="apHostname" 
              fieldName="hostname"
              deviceType={ObjectType.AP}
              deviceId="ap"
            />
            <SelectField 
              label="VPN模式" 
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
                  label="VPN服务器" 
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
                  label="VPN用户名" 
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
                  label="VPN密码" 
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
                <h4>时区</h4>
                <hr />
              </td>
            </tr>
            <SelectField 
              label="网关时区" 
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
                <h4>NTP服务器</h4>
                <hr />
              </td>
            </tr>
            <InputField 
              label="NTP服务器1" 
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
              label="NTP服务器2" 
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
              label="NTP服务器3" 
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
                  text="同步NTP服务器" 
                  title="同步NTP服务器"
                  onClick={handleSyncNTP} 
                  disabled={!webSocketManager}
                />
              </td>
            </tr>
            
            <tr>
              <td colSpan={2}>
                <h4>安全</h4>
                <hr />
              </td>
            </tr>
            <CheckboxField 
              label="需要登录密码" 
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