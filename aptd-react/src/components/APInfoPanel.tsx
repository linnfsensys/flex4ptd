import React, { useCallback, useState } from 'react';
import { useModals } from '../store/hooks';
import { useAppState } from '../store/hooks';
import { ModalType, ModalClass } from '../AptdClientTypes';
import AptdButton from '../AptdButton';
import Note from '../fields/Note';
import FilePickerButton from '../fields/FilePickerButton';
import { HttpMethod } from '../AptdClientTypes';
import '../infoPanels/InfoPanel.css';
import '../infoPanels/InfoPanelAPInfo.css';

// 导入WebSocketManager，用于发送重启和重置消息
import WebSocketManager from '../WebSocketManager';
import HttpManager from '../HttpManager';
import TopStore from '../TopStore';

interface APInfoPanelProps {
  webSocketManager: WebSocketManager | null;
  httpManager: HttpManager | null;
  topStore: TopStore;
}

/**
 * AP信息面板组件 - Zustand版本
 * 对应原来的InfoPanelAPInfo组件
 * 提供网关重启、备份恢复、固件升级等功能
 */
const APInfoPanel: React.FC<APInfoPanelProps> = ({ webSocketManager, httpManager, topStore }) => {
  const { showModal, dismissModal } = useModals();
  const { downloadInProgress, loading } = useAppState();
  const [uploadInProgress, setUploadInProgress] = useState(false);

  // 重启网关
  const handleReboot = useCallback(() => {
    const msg = "确定要重启网关吗？";
    showModal(
      ModalType.TWO_BUTTON,
      msg,
      ['取消', '重启'],
      [
        () => console.info('重启已取消'),
        () => {
          if (webSocketManager === null) {
            console.error('websocketManager为空');
            showModal(ModalType.ONE_BUTTON_ERROR, 'SensConfig无法连接。');
          } else {
            showModal(ModalType.NO_OK, '网关即将重启。', undefined, undefined, undefined, ModalClass.REBOOTING);
            // 告诉APTD服务器让AP重启
            webSocketManager.sendRebootMsg();
            // 清除所有客户端状态，使客户端从头开始
            // 实际清除将在WebSocketManager.doLogin()中进行
          }
        }
      ]
    );
  }, [webSocketManager, showModal]);

  // 重置配置
  const handleReset = useCallback(() => {
    const msg = "所有已配置的（地图）传感器、中继器和无线电将被重置为出厂RF配置（RF通道、颜色代码）。这将从地图中移除所有传感器和中继器。地图传感器应该会重新出现在托盘中。不会更改网关配置。不会重置固件或时隙。这不是设备的\"硬重置\"。";
    showModal(
      ModalType.TWO_BUTTON,
      msg,
      ['取消', '重置'],
      [
        () => console.info('重置已取消'),
        () => {
          if (webSocketManager === null) {
            console.log('websocketManager为空');
            showModal(ModalType.ONE_BUTTON_ERROR, 'SensConfig无法连接。')
          } else {
            // 告诉APTD服务器让AP重置
            webSocketManager.sendResetMsg();
            // 清除所有客户端状态，使客户端从头开始
            // 实际清除将在WebSocketManager.doLogin()中进行
          }
        }
      ]
    );
  }, [webSocketManager, showModal]);

  // 下载AP备份
  const handleDownloadBackup = useCallback(() => {
    setUploadInProgress(true);
    // 这个模态框将阻止所有用户输入
    showModal(ModalType.NO_OK, '下载可能需要几分钟时间。请耐心等待', undefined, undefined, undefined, ModalClass.DOWNLOADING);

    const xhr = new XMLHttpRequest();
    const isoNow: string = (new Date()).toISOString();
    const now: string = isoNow.replace(/:/g, '');   // 移除冒号
    const bkupServerFilename = 'bkup' + now + '.tar.0';
    const params: string = 'app_install_file=' + bkupServerFilename + '&app_install_csum=0';
    
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          // 备份成功，现在下载文件
          const downloadUrl = '/download?filename=' + bkupServerFilename;
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = 'gateway_backup_' + now + '.tar';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          // 清理临时文件
          const cleanupXhr = new XMLHttpRequest();
          cleanupXhr.open('GET', '/cgi-bin/cleanup.cgi?filename=' + bkupServerFilename, true);
          cleanupXhr.send();
          
          dismissModal(ModalClass.DOWNLOADING);
          setUploadInProgress(false);
          document.body.style.cursor = "default";
        } else {
          dismissModal(ModalClass.DOWNLOADING);
          showModal(ModalType.ONE_BUTTON_ERROR, '备份失败：' + xhr.statusText);
          setUploadInProgress(false);
          document.body.style.cursor = "default";
        }
      }
    };
    
    xhr.open('POST', '/cgi-bin/backup.cgi', true);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhr.send(params);
    document.body.style.cursor = "wait";
  }, [showModal, dismissModal]);

  // 处理固件上传响应
  const handleFirmwareUploadResponse = (xhr: XMLHttpRequest) => {
    if (xhr.status !== 200) {
      return '固件上传失败：' + xhr.statusText;
    }
    
    try {
      const response = JSON.parse(xhr.responseText);
      if (response.status === 'success') {
        showModal(
          ModalType.TWO_BUTTON,
          '固件已成功上传。是否要继续升级？',
          ['取消', '继续'],
          [
            () => {
              if (webSocketManager) {
                webSocketManager.sendCancelFirmwareUpdateMsg();
              }
            },
            () => {
              if (webSocketManager) {
                webSocketManager.sendConfirmFirmwareUpdateMsg();
              }
            }
          ]
        );
        return undefined;
      } else {
        return '固件上传失败：' + response.message;
      }
    } catch (e) {
      return '解析响应时出错：' + e;
    }
  };

  // 处理恢复文件上传响应
  const handleRestoreFileUploadResponse = (xhr: XMLHttpRequest, originalFilename: string | undefined) => {
    if (xhr.status !== 200) {
      return '恢复文件上传失败：' + xhr.statusText;
    }
    
    try {
      const response = JSON.parse(xhr.responseText);
      if (response.status === 'success') {
        // 执行恢复操作
        const restoreXhr = new XMLHttpRequest();
        restoreXhr.open('GET', '/cgi-bin/restore.cgi?filename=' + response.filename, true);
        
        restoreXhr.onreadystatechange = () => {
          if (restoreXhr.readyState === 4) {
            if (restoreXhr.status === 200) {
              showModal(ModalType.ONE_BUTTON_SUCCESS, '配置已成功恢复。网关将重启。');
            } else {
              showModal(ModalType.ONE_BUTTON_ERROR, '恢复配置失败：' + restoreXhr.statusText);
            }
          }
        };
        
        restoreXhr.send();
        return undefined;
      } else {
        return '恢复文件上传失败：' + response.message;
      }
    } catch (e) {
      return '解析响应时出错：' + e;
    }
  };

  // 处理许可证上传响应
  const handleLicenseUploadResponse = (xhr: XMLHttpRequest, originalFilename: string | undefined) => {
    if (xhr.status !== 200) {
      return '许可证上传失败：' + xhr.statusText;
    }
    
    try {
      const response = JSON.parse(xhr.responseText);
      if (response.status === 'success') {
        showModal(ModalType.ONE_BUTTON_SUCCESS, '许可证已成功上传。网关将重启。');
        return undefined;
      } else {
        return '许可证上传失败：' + response.message;
      }
    } catch (e) {
      return '解析响应时出错：' + e;
    }
  };

  // 下载诊断信息
  const handleDownloadDiagnostic = useCallback(() => {
    const url = '/download?type=diagnostic';
    const now = new Date().toISOString().replace(/:/g, '');
    const filename = 'diagnostic_' + now + '.tar.gz';
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  // 下载设备层次结构
  const handleDownloadDeviceHierarchy = useCallback(() => {
    const url = '/download?type=hierarchy';
    const now = new Date().toISOString().replace(/:/g, '');
    const filename = 'hierarchy_' + now + '.json';
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  return (
    <div id='infoAPInfo' className={downloadInProgress || loading ? 'disabled' : ''}>
      <div id='apInfoForm'>
        <table>
          <tbody>
            <tr>
              <td colSpan={3}>
                <h4>重启</h4>
                <hr/>
              </td>
            </tr>
            <tr>
              <td></td>
              <td colSpan={2}>
                <span className='buttonPane'>
                  <AptdButton 
                    id='rebootButton' 
                    title=''
                    theClassName='gray'
                    text='重启网关'
                    onClick={handleReboot}
                  />
                </span>
              </td>
            </tr>

            <tr>
              <td colSpan={3}>
                <h4>备份和恢复</h4>
                <hr/>
              </td>
            </tr>
            <tr>
              <td></td>
              <td colSpan={2}>
                <div className='buttonPane'>
                  <AptdButton 
                    id='downloadButton2'
                    title=''
                    theClassName={'download gray'}
                    disabled={uploadInProgress}
                    onClick={handleDownloadBackup}
                    text='备份网关配置'
                  />
                </div>
              </td>
            </tr>
            <tr>
              <td></td>
              <td colSpan={2}>
                <FilePickerButton
                  label={'恢复网关配置'}
                  url={'/uploadVDSBackup.html'}
                  method={HttpMethod.POST}
                  paramName={'restoreFile'}
                  callback={handleRestoreFileUploadResponse}
                  computeCsum={false}
                  computeFilename={true}
                  showResultToUser={false}
                  showRebootWarning={true}
                  httpManager={httpManager}
                  topStore={topStore}
                />
                <Note
                  text='警告：如果您从在不同网关上制作的备份文件恢复，请确保在重启前编辑网关文件。否则，您可能会更改此网关的IP地址。'
                  idName='restoreNote'
                />
              </td>
            </tr>

            <tr>
              <td colSpan={3}>
                <h4>固件升级</h4>
                <hr/>
              </td>
            </tr>
            <tr>
              <td></td>
              <td colSpan={2}>
                <FilePickerButton
                  label={'上传设备固件'}
                  url={'/uploadFirmware.html'}
                  method={HttpMethod.POST}
                  paramName={'firmwareFile'}
                  callback={handleFirmwareUploadResponse}
                  showResultToUser={false}
                  showRebootWarning={false}
                  acceptSuffixes=".ldrec,.ndrec,.hc,.gpg"
                  httpManager={httpManager}
                  topStore={topStore}
                />
                <Note
                  text='上传后，所有相关设备都将升级。有效的上传文件是.ldrec、.ndrec、.HC和.ipk.gpg文件。'
                  idName='afterUploadNote'
                />
              </td>
            </tr>

            <tr>
              <td colSpan={3}>
                <h4>许可证</h4>
                <hr/>
              </td>
            </tr>
            <tr>
              <td></td>
              <td colSpan={2}>
                <FilePickerButton
                  label={'更新许可证'}
                  url={'/uploadLicense.html'}
                  paramName={'licenseFile'}
                  method={HttpMethod.POST}
                  callback={handleLicenseUploadResponse}
                  computeFilename={false}
                  showResultToUser={false}
                  showRebootWarning={true}
                  httpManager={httpManager}
                  topStore={topStore}
                />
                <Note
                  text='上传后，网关将自动重启。'
                  idName='licenseNote'
                />
              </td>
            </tr>

            <tr>
              <td colSpan={3}>
                <h4>诊断</h4>
                <hr/>
              </td>
            </tr>
            <tr>
              <td></td>
              <td colSpan={2}>
                <div className='buttonPane'>
                  <AptdButton 
                    id='downloadDiagsButton' 
                    title=''
                    theClassName='download gray'
                    onClick={handleDownloadDiagnostic}
                    text='下载诊断信息'
                  />
                </div>
              </td>
            </tr>
            <tr>
              <td></td>
              <td colSpan={2}>
                <div className='buttonPane'>
                  <AptdButton 
                    id='downloadDeviceHierarchyButton' 
                    title=''
                    theClassName='download gray'
                    onClick={handleDownloadDeviceHierarchy}
                    text='下载设备层次结构'
                  />
                </div>
              </td>
            </tr>

            <tr>
              <td colSpan={3}>
                <h4>重置配置</h4>
                <hr/>
              </td>
            </tr>
            <tr>
              <td></td>
              <td colSpan={2}>
                <div className='buttonPane'>
                  <AptdButton 
                    id='clearAndResetButton' 
                    title=''
                    theClassName='gray'
                    text='清除配置并重置已配置设备'
                    onClick={handleReset}
                  />
                </div>
                <Note
                  text='所有已配置的（地图）传感器、中继器和无线电将被重置为出厂RF配置（RF通道、颜色代码）。这将从地图中移除所有传感器和中继器。地图传感器应该会重新出现在托盘中。不会更改网关配置。不会重置固件或时隙。这不是设备的"硬重置"。'
                  idName='clearAndResetNote'
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default APInfoPanel; 