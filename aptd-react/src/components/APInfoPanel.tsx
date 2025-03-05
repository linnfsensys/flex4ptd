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

// Import the WebSocketManager, HttpManager, and TopStore
import WebSocketManager from '../WebSocketManager';
import HttpManager from '../HttpManager';
import TopStore from '../TopStore';

interface APInfoPanelProps {
  webSocketManager: WebSocketManager | null;
  httpManager: HttpManager | null;
  topStore: TopStore;
}

/**
 * AP information panel component - Zustand version
 * Corresponds to the original InfoPanelAPInfo component
 * Provides gateway restart, backup recovery, firmware upgrade, and other functions
 */
const APInfoPanel: React.FC<APInfoPanelProps> = ({ webSocketManager, httpManager, topStore }) => {
  const { showModal, dismissModal } = useModals();
  const { downloadInProgress, loading } = useAppState();
  const [uploadInProgress, setUploadInProgress] = useState(false);

  // restart the gateway
  const handleReboot = useCallback(() => {
    const msg = "Are you sure you want to restart the gateway?";
    showModal(
      ModalType.TWO_BUTTON,
      msg,
      ['Cancel', 'Restart'],
      [
        () => console.info('Restart cancelled'),
        () => {
          if (webSocketManager === null) {
            console.error('websocketManager is null');
            showModal(ModalType.ONE_BUTTON_ERROR, 'SensConfig cannot connect.');
          } else {
            showModal(ModalType.NO_OK, 'The gateway will restart soon.', undefined, undefined, undefined, ModalClass.REBOOTING);
            // tell the APTD server to restart the AP
            webSocketManager.sendRebootMsg();
            // clear all client states, so the client starts from scratch
            // actual clearing will be done in WebSocketManager.doLogin()
          }
        }
      ]
    );
  }, [webSocketManager, showModal]);

  // reset the configuration
  const handleReset = useCallback(() => {
    const msg = "All configured (map) sensors, repeaters, and radios will be reset to factory RF configuration (RF channels, color codes). This will remove all sensors and repeaters from the map. Map sensors should reappear in the tray. The gateway configuration will not be changed. The firmware or slots will not be reset. This is not a \"hard reset\" of the device.";
    showModal(
      ModalType.TWO_BUTTON,
      msg,
      ['Cancel', 'Reset'],
      [
        () => console.info('Reset cancelled'),
        () => {
          if (webSocketManager === null) {
            console.log('websocketManager is null');
            showModal(ModalType.ONE_BUTTON_ERROR, 'SensConfig cannot connect.')
          } else {
            // tell the APTD server to reset the AP
            webSocketManager.sendResetMsg();
            // clear all client states, so the client starts from scratch
            // actual clearing will be done in WebSocketManager.doLogin()
          }
        }
      ]
    );
  }, [webSocketManager, showModal]);

  // download the AP backup
  const handleDownloadBackup = useCallback(() => {
    setUploadInProgress(true);
    // this modal will prevent all user input
    showModal(ModalType.NO_OK, 'Downloading may take a few minutes. Please be patient.', undefined, undefined, undefined, ModalClass.DOWNLOADING);

    const xhr = new XMLHttpRequest();
    const isoNow: string = (new Date()).toISOString();
    const now: string = isoNow.replace(/:/g, '');   // remove the colon
    const bkupServerFilename = 'bkup' + now + '.tar.0';
    const params: string = 'app_install_file=' + bkupServerFilename + '&app_install_csum=0';
    
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          // backup successful, now download the file
          const downloadUrl = '/download?filename=' + bkupServerFilename;
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = 'gateway_backup_' + now + '.tar';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          // clean up the temporary file
          const cleanupXhr = new XMLHttpRequest();
          cleanupXhr.open('GET', '/cgi-bin/cleanup.cgi?filename=' + bkupServerFilename, true);
          cleanupXhr.send();
          
          dismissModal(ModalClass.DOWNLOADING);
          setUploadInProgress(false);
          document.body.style.cursor = "default";
        } else {
          dismissModal(ModalClass.DOWNLOADING);
          showModal(ModalType.ONE_BUTTON_ERROR, 'Backup failed: ' + xhr.statusText);
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

  // handle the firmware upload response
  const handleFirmwareUploadResponse = (xhr: XMLHttpRequest) => {
    if (xhr.status !== 200) {
      return 'Firmware upload failed: ' + xhr.statusText;
    }
    
    try {
      const response = JSON.parse(xhr.responseText);
      if (response.status === 'success') {
        showModal(
          ModalType.TWO_BUTTON,
          'Firmware has been uploaded successfully. Do you want to continue the upgrade?',
          ['Cancel', 'Continue'],
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
        return 'Firmware upload failed: ' + response.message;
      }
    } catch (e) {
      return 'Error parsing response: ' + e;
    }
  };

  // handle the restore file upload response
  const handleRestoreFileUploadResponse = (xhr: XMLHttpRequest, originalFilename: string | undefined) => {
    if (xhr.status !== 200) {
      return 'Restore file upload failed: ' + xhr.statusText;
    }
    
    try {
      const response = JSON.parse(xhr.responseText);
      if (response.status === 'success') {
        // perform the restore operation
        const restoreXhr = new XMLHttpRequest();
        restoreXhr.open('GET', '/cgi-bin/restore.cgi?filename=' + response.filename, true);
        
        restoreXhr.onreadystatechange = () => {
          if (restoreXhr.readyState === 4) {
            if (restoreXhr.status === 200) {
              showModal(ModalType.ONE_BUTTON_SUCCESS, 'Configuration has been restored successfully. The gateway will restart.');
            } else {
              showModal(ModalType.ONE_BUTTON_ERROR, 'Restore configuration failed: ' + restoreXhr.statusText);
            }
          }
        };
        
        restoreXhr.send();
        return undefined;
      } else {
        return 'Restore file upload failed: ' + response.message;
      }
    } catch (e) {
      return 'Error parsing response: ' + e;
    }
  };

  // handle the license upload response
  const handleLicenseUploadResponse = (xhr: XMLHttpRequest, originalFilename: string | undefined) => {
    if (xhr.status !== 200) {
      return 'License upload failed: ' + xhr.statusText;
    }
    
    try {
      const response = JSON.parse(xhr.responseText);
      if (response.status === 'success') {
        showModal(ModalType.ONE_BUTTON_SUCCESS, 'License has been uploaded successfully. The gateway will restart.');
        return undefined;
      } else {
        return 'License upload failed: ' + response.message;
      }
    } catch (e) {
      return 'Error parsing response: ' + e;
    }
  };

  // Download the diagnostic information
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

  // Download the device hierarchy
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
                <h4>Restart</h4>
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
                    text='Restart Gateway'
                    onClick={handleReboot}
                  />
                </span>
              </td>
            </tr>

            <tr>
              <td colSpan={3}>
                <h4>Backup and Restore</h4>
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
                    text='Backup Gateway Configuration'
                  />
                </div>
              </td>
            </tr>
            <tr>
              <td></td>
              <td colSpan={2}>
                <FilePickerButton
                  label={'Restore Gateway Configuration'}
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
                  text='Warning: If you restore from a backup file made on a different gateway, please ensure you edit the gateway file before restarting. Otherwise, you may change the IP address of this gateway.'
                  idName='restoreNote'
                />
              </td>
            </tr>

            <tr>
              <td colSpan={3}>
                <h4>Firmware Upgrade</h4>
                <hr/>
              </td>
            </tr>
            <tr>
              <td></td>
              <td colSpan={2}>
                <FilePickerButton
                  label={'Upload Device Firmware'}
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
                  text='After uploading, all related devices will be upgraded. The valid upload files are .ldrec, .ndrec, .hc, and .ipk.gpg files.'
                  idName='afterUploadNote'
                />
              </td>
            </tr>

            <tr>
              <td colSpan={3}>
                <h4>License</h4>
                <hr/>
              </td>
            </tr>
            <tr>
              <td></td>
              <td colSpan={2}>
                <FilePickerButton
                  label={'Update License'}
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
                  text='After uploading, the gateway will automatically restart.'
                  idName='licenseNote'
                />
              </td>
            </tr>

            <tr>
              <td colSpan={3}>
                <h4>Diagnostic</h4>
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
                    text='Download Diagnostic Information'
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
                    text='Download Device Hierarchy'
                  />
                </div>
              </td>
            </tr>

            <tr>
              <td colSpan={3}>
                <h4>Reset Configuration</h4>
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
                    text='Clear Configuration and Reset Configured Devices'
                    onClick={handleReset}
                  />
                </div>
                <Note
                  text='All configured (map) sensors, repeaters, and radios will be reset to factory RF configuration (RF channels, color codes). This will remove all sensors and repeaters from the map. Map sensors should reappear in the tray. The gateway configuration will not be changed. The firmware or slots will not be reset. This is not a \"hard reset\" of the device.'
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