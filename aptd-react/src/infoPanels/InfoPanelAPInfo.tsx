import React from 'react';
import './InfoPanel.css';
import SelectField, {Option} from "../fields/SelectField";
import {
    GUIAPConfigClient,
    HttpMethod,
    ModalClass,
    ModalType,
    ObjectType,
    UpdateType,
} from "../AptdClientTypes";
import {
    ColorCodeMode,
    FirmwareType,
    Interface,
    NetworkSecurityTypes,
    UploadFirmwareResponses
} from "../AptdServerTypes";
import TopStore from "../TopStore";
import UndoManager from "../UndoManager";
import FilePickerButton from "../fields/FilePickerButton";
import WebSocketManager from "../WebSocketManager";
import Note from "../fields/Note";
import HttpManager from "../HttpManager";
import RadioButtonGroupField from "../fields/RadioButtonGroupField";
import './InfoPanelAPInfo.css';
import AptdButton from "../AptdButton";


interface InfoPanelAPInfoProps {
    apId: string,
    apModel: GUIAPConfigClient,
    topStore: TopStore,
    undoManager: UndoManager,
    webSocketManager: WebSocketManager | null
    httpManager: HttpManager | null
}

interface InfoPanelAPInfoState {
}


/**
 * Corresponds to AP tab that is now called "Utilities".
 *
 * this version uses local state. We keep top-level state in TopStore as the
 * source of *verified* truth, but need local state to reflect user input,
 * in case where user makes errors.  Local state is in InputField, SelectField components.
 */
class InfoPanelAPInfo extends React.Component<InfoPanelAPInfoProps, InfoPanelAPInfoState> {
    private firmwareUploadDeviceType: FirmwareType|undefined;

    constructor(props: InfoPanelAPInfoProps) {
        super(props);
        console.debug('lifecycle InfoPanelAPInfo constructor(): start. this.props.apId=', this.props.apModel.id);

        this.firmwareUploadDeviceType = undefined;

        this.state = {
        };

        this.onRebootClick = this.onRebootClick.bind(this);
        this.onResetClick = this.onResetClick.bind(this);
        this.onUploadFirmwareResponse = this.onUploadFirmwareResponse.bind(this);
        this.rebootAP = this.rebootAP.bind(this);
        this.resetApConfig = this.resetApConfig.bind(this);
        this.downloadDeviceHierarchy = this.downloadDeviceHierarchy.bind(this);
        this.downloadDiagnostic = this.downloadDiagnostic.bind(this);
        this.downloadAPBackup = this.downloadAPBackup.bind(this);
        this.onUploadRestoreFileResponse = this.onUploadRestoreFileResponse.bind(this);
        this.onUploadLicenseResponse = this.onUploadLicenseResponse.bind(this);
        this.setDownloadInProgressState = this.setDownloadInProgressState.bind(this);
        this.setUploadInProgressState = this.setUploadInProgressState.bind(this);
        this.downloadFileFromUrl = this.downloadFileFromUrl.bind(this);
        this.saveBlob = this.saveBlob.bind(this);
        this.makeBkupHandler = this.makeBkupHandler.bind(this);
        this.makeCleanupHandler = this.makeCleanupHandler.bind(this);
        this.onCancelFirmwareUpload = this.onCancelFirmwareUpload.bind(this);
        this.onProceedWithFirmwareUpload = this.onProceedWithFirmwareUpload.bind(this);
    }


    transformValueToStore(useValue:string):{[fieldName:string]: string} {
        return {useValue};
    }

    onRebootClick() {
        const preamble:string = this.props.undoManager.undoStackChangedSinceLastSave() ?
            "Unsaved changes will be lost during reboot. " : "";
        const msg = preamble + "Are you sure you'd like to reboot the Gateway?";
        this.props.topStore.showModal(ModalType.TWO_BUTTON,
            msg, ['Cancel', 'Reboot'],
           [this.cancelReboot, this.rebootAP]);
    }

    onResetClick() {
        const msg = "All configured (Map) Sensors, Repeaters, and Radios will be reset to their factory RF configurations (RF channel, color code). This will remove all Sensors and Repeaters from the Map. Map Sensors should reappear in the Tray. Will not change the Gateway configuration. Will not reset firmware nor timeslot. This is not a \"hard reset\" of devices.";
        this.props.topStore.showModal(ModalType.TWO_BUTTON,
            msg, ['Cancel', 'Reset'],
            [this.cancelReset, this.resetApConfig]);
    }

    private cancelReboot(): void {
        console.info('xhr: reboot AP cancelled');
    }

    private cancelReset(): void {
        console.info( 'xhr: reset AP cancelled');
    }

    /**
     * TODO: note that when server reboots, client will ordinarily reconnect to it.
     *       Do we need to have client itself restart from scratch, as it would do
     *       if login is enforced?
     */
    private rebootAP(): void {
        if (this.props.webSocketManager === null) {
            console.error('xhr: websocketManager is null');
            this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'SensConfig is unable to connect.');
        } else {
            this.props.topStore.showModal(ModalType.NO_OK, 'Gateway will now reboot.', undefined, undefined, undefined, ModalClass.REBOOTING);
            // tell APTD server to tell AP to reboot.
            this.props.webSocketManager.sendRebootMsg();
            // clear all client state, so client, in effect, begins from scratch.
            // Actual clearing will happen later in WebSocketManager.doLogin()
            this.props.topStore.setState({needToClearAll: true});
        }
    }

    private resetApConfig(): void {
        if (this.props.webSocketManager === null) {
            console.log('xhr: websocketManager is null');
            this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'SensConfig is unable to connect.')
        } else {
            // TODO: HR: for the moment, commenting out the blocking dialog here....
            //this.props.topStore.showModal(ModalType.NO_OK, 'Configuration is resetting.', undefined, undefined, undefined, ModalClass.RESETTING);

            // tell APTD server to tell AP to reset.
            this.props.webSocketManager.sendResetMsg();
            // clear all client state, so client, in effect, begins from scratch.
            // Actual clearing will happen later in WebSocketManager.doLogin()
            this.props.topStore.setState({needToClearAll: true});
        }
    }


    /**
     * This method invokes 3 actions (sequentially), one after the other.
     * backup.cgi, APTD server's download facility, cleanup.cgi.
     * backup.cgi and cleanup.cgi are invoked via lighttpd, and are part of VDS on AP.
     * The backup.cgi creates a backup tarfile in the AP's /tmp directory.
     * The APTD server download facility sends the tarfile to the client, which downloads it. (not uuencoded).
     * The cleanup.cgi deletes the backup tarfile from the AP's /tmp directory, though
     * actually the APTD server download facility already does this.
     * @see https://stackoverflow.com/a/44435573/724064 for overall strategy used here.
     */
    private downloadAPBackup(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        this.setDownloadInProgressState(true,
            () => {
                // this modal will block all user input
                this.props.topStore.showModal(ModalType.NO_OK, 'The download may take several minutes. Please be patient', undefined, undefined, undefined, ModalClass.DOWNLOADING);

                const xhr = new XMLHttpRequest();
                const isoNow: string = (new Date()).toISOString();
                const now: string = isoNow.replace(/:/g, '');   // remove colons
                const bkupServerFilename = 'bkup' + now + '.tar.0';
                const params: string = 'app_install_file=' + bkupServerFilename + '&app_install_csum=0';
                xhr.onreadystatechange = this.makeBkupHandler(xhr, bkupServerFilename)
                xhr.open('POST', '/cgi-bin/backup.cgi', true);
                xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                xhr.send(params);
                document.body.style.cursor = "wait";
            }
        );
    }


    /**
     * This is a factory method that produces a handler function that incorporates bkupServerFilename.
     * If backup.cgi ran successfully, the produced handler function invokes APTD server download
     * facility to download the tarfile, which is NOT uuencoded.
     */
    private makeBkupHandler(xhr: XMLHttpRequest, bkupServerFilename: string): (e: Event) => void {
        return () => {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    const bkupResult: string = xhr.responseText;
                    console.debug('xhr DONE: bkupResult=', bkupResult);
                    if (bkupResult.startsWith('ok: ')) {
                        this.downloadFileFromUrl('/downloadVDSBackup.html?fileName=' + bkupServerFilename, bkupServerFilename);
                    } else {
                        this.props.topStore.dismissAnyModal(ModalClass.DOWNLOADING);
                        this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR,
                            'Backup encountered an error: ' + bkupResult);
                        this.setDownloadInProgressState(false);
                        document.body.style.cursor = "default";
                    }
                } /* else {
                    // this code appears to work, (though I don't know if this part ever gets called)
                    //       but I think this might be the wrong paradigm here.
                    //       See downloadFileFromUrl() for what I think is more correct approach:
                    //       which is to use onerror()/onload() rather than looking at a non-200 status,
                    //       which could be intermediate and not a final state!
                    this.props.topStore.dismissAnyModal(ModalClass.DOWNLOADING);
                    this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'backup failed on server: status=' + xhr.status);
                    this.setDownloadInProgressState(false);
                    document.body.style.cursor = "default";
                } */
            }
        };
    }

    /** set TopStore downloadInProgress */
    private setDownloadInProgressState(newState: boolean, callBack?: ()=>void) {
        this.props.topStore.enact({
            actions: [{
                objectId: '',
                objectType: ObjectType.DOWNLOAD_IN_PROGRESS,
                newData: newState,
                updateType: UpdateType.UPDATE,
            }],
            description: newState ? 'turn on download in progress' : 'turn off download in progress',
        }, callBack);
    }

    /** set TopStore uploadInProgress */
    private setUploadInProgressState(newState: boolean, callBack?: ()=>void) {
        this.props.topStore.enact({
            actions: [{
                objectId: '',
                objectType: ObjectType.UPLOAD_IN_PROGRESS,
                newData: newState,
                updateType: UpdateType.UPDATE,
            }],
            description: newState ? 'turn on upload in progress' : 'turn off upload in progress',
        }, callBack);
    }

    private makeCleanupHandler(xhr3: XMLHttpRequest): ((e:Event)=>void) {
        return (e: Event) => {
            if (xhr3.readyState === XMLHttpRequest.DONE && xhr3.status === 200) {
                const cleanupResult: string = xhr3.responseText;
                console.debug('xhr3 DONE: cleanupResult=', cleanupResult);
                if (cleanupResult.startsWith('ok: ')) {
                    console.info('xhr3 cleanup after backup succeeded on server');
                } else {
                    console.error('xhr3 cleanup after backup failed on server: ' + cleanupResult);
                }
            }
        }
    }

    private downloadDiagnostic(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        this.downloadFileFromUrl('/diagnostics.html', 'SensConfigDiagnostics.zip');
    }

    private saveBlob(blob: Blob, filename?: string): void {
        console.info('saveBlob(): start');
        const a: HTMLAnchorElement = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = (filename !== undefined ? filename : "");
        a.click();
        console.info('saveBlob(): after programmatic click');
    }

    private downloadDeviceHierarchy(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        this.downloadFileFromUrl('/deviceHierarchy.html', 'SensConfig-DeviceHierarchy.txt');
    }


    /**
     * [ formerly called fetchData2() ]
     * Download data from a url.  This is a version that uses XMLHttpRequest with Blob.
     * By doing so, we get a notification when the download is complete.
     * @see https://stackoverflow.com/a/44435573/724064
     * @param urlString string containing the url for download
     * @param delayLoadingState if true, delay return of user's control for 30 secs
     * @param filename optional name for file to be downloaded
     */
    private downloadFileFromUrl(urlString: string, filename?: string):void | undefined {
        this.setDownloadInProgressState(true, () => {
            document.body.style.cursor = "wait";
            const xhr = new XMLHttpRequest();
            xhr.onload = () => {
                console.info('xhr downloadFileFromUrl(): about to saveBlob to file');
                const blob: Blob = xhr.response as Blob;
                this.saveBlob(blob, filename);

                this.props.topStore.dismissAnyModal(ModalClass.DOWNLOADING);
                document.body.style.cursor = "default";
                this.setDownloadInProgressState(false);
                console.info('downloadFileFromUrl(): after saveBlob is complete');

                // Tell user there was a download? Only for Firefox.
                const isFirefox:boolean = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
                if (isFirefox) {
                    // we only announce download for Firefox, because it does not
                    this.props.topStore.showModal(ModalType.ONE_BUTTON_SUCCESS, 'Download is complete.  It can usually be found in your Downloads folder.');
                }
            }
            xhr.onerror = () => {
                console.info('downloadFileFromUrl(): error encountered');
                this.props.topStore.dismissAnyModal(ModalClass.DOWNLOADING);
                this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR,
                    "An error occurred during download. Please try again.");
                document.body.style.cursor = "default";
                this.setDownloadInProgressState(false);
            }
            xhr.open('GET', urlString, true);
            xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
            xhr.responseType = 'blob';
            console.info('downloadFileFromUrl(): about to do xhr.send()');
            xhr.send();
            document.body.style.cursor = "wait";
        });
    }


    /**
     * Upon upload of file for firmware upload.
     * Receives {"state":"VALID","files":[{"validChecksum":true,"swVersion":200,"type":"SPP"}]} for example
     */
    private onUploadFirmwareResponse(xhr: XMLHttpRequest): string|undefined {
        const response: string = xhr.responseText;
        const jsonResponse = JSON.parse(response);
        console.info('xhr: onUploadFirmwareResponse(): jsonResponse=', jsonResponse);
        this.props.topStore.dismissAnyModal(ModalClass.FILE_UPLOADING);
        if (jsonResponse.state === UploadFirmwareResponses.VALID) {
            const firmwareVersion: number = jsonResponse.files[0].swVersion;
            const firmwareType: FirmwareType = jsonResponse.files[0].type as FirmwareType;
            this.firmwareUploadDeviceType = firmwareType;
            // prompt the user to confirm or cancel this upload and
            // send a msg over websocket to the server with the user's answer
            let description: string;
            switch (firmwareType) {
                case FirmwareType.IPK:
                    description = "Proceeding will update the Gateway's addons or root image. ";
                    break;
                case FirmwareType.SENSOR:
                case FirmwareType.REPEATER:
                case FirmwareType.RADIO:
                    description = "Proceeding will update all " +
                        InfoPanelAPInfo.toLocale(firmwareType) + "s on Map to Version " + firmwareVersion +
                        ". ";
                    break;
                case FirmwareType.HC:
                    const devices:string = this.getCCDevices();
                    description = "Proceeding will update " + devices + " firmware. ";
                    break;
                default:
                    console.error('invalid firmware type for firmware upload:', firmwareType);
                    this.props.topStore.dismissAllModals();
                    this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR, "Upload error");
                    document.body.style.cursor = "default";
                    return 'ERROR';
            }

            this.props.topStore.showModal(ModalType.TWO_BUTTON,
                description + "Do you want to proceed with the firmware update?",
                ["Cancel", "OK"],
                [this.onCancelFirmwareUpload, this.onProceedWithFirmwareUpload]
            );
        } else {
            this.props.topStore.dismissAllModals();
            this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR, "Upload error " + jsonResponse.state);
            document.body.style.cursor = "default";
            return 'ERROR';
        }
    }

    /**
     * @returns a user-facing list of all CC-card devices on this AP, for use in Firmware Upgrade.
     */
    private getCCDevices(): string {
        let devices:string = 'unknown device';
        const ccCardKeys = Object.keys(this.props.topStore.getTopState().ccCards);
        switch (ccCardKeys[0]) {
            case 'SDLC':
                devices = 'the FlexConnect device';
                break;
            case 'APGI':
            case 'STS':
                console.error('unexpected ccCard: ', ccCardKeys[0]);
                break;
            default:
                // presumably must be EX/CC cards
                const cardInterfaces:Interface[] = ccCardKeys.map((cardid:string) =>
                    this.props.topStore.getTopState().ccCards[cardid].cardInterface);
                const cardInterfacesSet:Set<Interface> = new Set<Interface>(cardInterfaces);
                if (cardInterfacesSet.size === 1) {
                    if (cardInterfacesSet.has(Interface.EXCard)) {
                        devices = 'all EX Cards';
                    } else if (cardInterfacesSet.has(Interface.CCCard)) {
                        devices = 'all CC Cards';
                    }
                } else if (cardInterfacesSet.size > 1) {
                    if (cardInterfacesSet.has(Interface.EXCard)) {
                        devices = 'all EX Cards';
                    }
                    if (cardInterfacesSet.has(Interface.CCCard)) {
                        devices += ' and all CC Cards';
                    }
                }
                break;
        }
        return devices;
    }

    /** converts to user-friendly device e.g. 'SENSOR' to 'Sensor' */
    private static toLocale(deviceType: string|undefined): string {
        let device: string;
        switch (deviceType) {
            case 'SENSOR':      device = 'Sensor';      break;
            case 'REPEATER':    device = 'Repeater';    break;
            case 'RADIO':       device = 'Radio';       break;
            case 'HC':          device = 'CC Card';     break;
            default:
                device = 'Unknown';
                console.error('unexpected deviceType: ', deviceType);
                break;
        }
        return device;
    }

    /** @returns true if deviceType is valid value for firmware upload */
    private static isValidFirmwareUploadDeviceType(deviceType: string|undefined): boolean {
        let valid: boolean;
        switch (deviceType) {
            case 'SENSOR':
            case 'REPEATER':
            case 'RADIO':
            case "IPK":
            case "HC":
                valid = true;
                break;
            default:
                valid = false;
                console.error('unexpected deviceType: ', deviceType);
                break;
        }
        return valid;
    }

    private onProceedWithFirmwareUpload() {
        if (this.props.webSocketManager === null) {
            console.error('websocketManager is null');
            this.props.topStore.dismissAllModals();
            this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'SensConfig is unable to connect.');
            document.body.style.cursor = "default";
        } else {
            // start a blocking modal
            if (InfoPanelAPInfo.isValidFirmwareUploadDeviceType(this.firmwareUploadDeviceType)) {
                // send confirm msg to server
                this.props.webSocketManager.sendConfirmFirmwareUpdateMsg();
                // tell user what's happening
                let description = '';
                if (this.firmwareUploadDeviceType === "IPK") {
                    description = 'Firmware update for the Gateway will begin now, and may take up to 15 minutes.';
                } else {
                    const devices:string = (this.firmwareUploadDeviceType !== FirmwareType.HC ?
                        'all configured ' + InfoPanelAPInfo.toLocale(this.firmwareUploadDeviceType) + 's' :
                        this.getCCDevices());
                    description = 'Firmware update for ' + devices +
                        ' will begin now, and may take up to 15 minutes.';
                }
                this.props.topStore.showModal(ModalType.NO_OK, description,
                    undefined, undefined, undefined,
                    ModalClass.FIRMWARE_UPGRADING);
            } else {
                console.error('Invalid device type for firmware upload: ', this.firmwareUploadDeviceType,
                    ' Too late to cancel.');
                this.props.webSocketManager.sendCancelFirmwareUpdateMsg();
                this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR,
                    'Error in firmware upgrade: Invalid file type. ',
                    undefined, undefined, undefined);
            }
        }
    }

    private onCancelFirmwareUpload() {
        if (this.props.webSocketManager === null) {
            console.error('websocketManager is null');
            this.props.topStore.dismissAllModals();
            this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'SensConfig is unable to connect.');
            document.body.style.cursor = "default";
        } else {
            // send cancel msg to server
            this.props.webSocketManager.sendCancelFirmwareUpdateMsg();
            this.props.topStore.dismissAnyModal(ModalClass.FILE_UPLOADING);
            document.body.style.cursor = "default";
        }
    }

    /**
     * User pressed Restore button, which invoked aptd server upload facility.
     * Now invoke restore.cgi on AP.
     */
    private onUploadRestoreFileResponse(xhr: XMLHttpRequest, originalFilename: string|undefined): string|undefined {
        const response: string = xhr.responseText;
        if (xhr.status === 200) {
            // for APTD server, we use the status of 200 to mean success
            console.debug('xhr onUploadRestoreFileResponse: response is: ', response, 'originalFilename=', originalFilename);
            // upload ran ok, which put backup tarfile on AP at /tmp.
            // so now invoke the restore.cgi, and report its results...
            console.info('xhr: onUploadRestoreFileResponse: upload ran ok. now about to invoke restore.cgi');
            const xhr = new XMLHttpRequest();
            // using csum=0 exploits a weakness in cgi to avoid computing checksum,
            // which would require uudecoding the tarfile first.
            const params: string = 'app_install_file=' + originalFilename + '&app_install_csum=0';
            xhr.onreadystatechange = this.makeRestoreCgiHandler(xhr);
            xhr.open('POST', '/cgi-bin/restore.cgi', true);
            xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

            this.props.topStore.dismissAnyModal(ModalClass.FILE_UPLOADING);
            this.props.topStore.showModal(ModalType.NO_OK, 'Upload completed. Now doing the restore');

            xhr.send(params);
            return undefined;
        } else {
            console.error('xhr onUploadRestoreFileResponse: status is: ', xhr.status, 'response is: ', response, 'originalFilename=', originalFilename);
            document.body.style.cursor = "default";
            this.props.topStore.dismissAllModals();
            this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'error on file upload: ' + response);
            return 'ERROR';
        }
    }

    /**
     * After restore.cgi was invoked, if it ran successfully, then the method
     * returned by this factory will make a
     * further call to /restoreVDS.html, which invokes the server's own RestoreHandler
     * to do any post-processing after the restore.cgi.
     * This includes loading properties from aptd.properties, so we get
     * the values that came from restore before rebooting.
     */
    private makeRestoreCgiHandler(xhr: XMLHttpRequest): ((e:Event)=>void) {
        return (e: Event) => {
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                const restoreResult: string = xhr.responseText;
                console.debug('xhr DONE: restore.cgi restoreResult=', restoreResult);
                if (restoreResult.startsWith('ok: ')) {
                    console.info('xhr restore.cgi succeeded on server');
                    // here, need one more step...
                    this.setUploadInProgressState(true,
                        () => {
                            document.body.style.cursor = "wait";
                            const xhr2= new XMLHttpRequest();
                            xhr2.onreadystatechange = this.makeRestoreHandler2(xhr2)
                            xhr2.open('GET', '/restoreVDS.html', true);
                            xhr2.setRequestHeader("content-type", "application/x-www-form-urlencoded");
                            xhr2.send();
                        });
                } else {
                    console.error('xhr restore.cgi failed on server: ' + restoreResult);
                    document.body.style.cursor = "default";
                    this.setUploadInProgressState(false);
                    this.props.topStore.dismissAllModals();
                    this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR,
                        'Restore (restore.cgi) encountered an error: ' + restoreResult);
                }
            }
        }
    }

    /**
     * after having sent request to server to do /restoreVDS.html,
     * this method creates a responder that cleans up and lets user know results.
     * TODO: note that when server reboots, client will ordinarily reconnect to it.
     *       Do we need to have client itself restart from scratch, as it would do
     *       if login is enforced?
     */
    private makeRestoreHandler2(xhr2: XMLHttpRequest): ((e:Event)=>void) {
        return (e: Event) => {
            if (xhr2.readyState === XMLHttpRequest.DONE) {
                if (xhr2.status === 200) {
                    document.body.style.cursor = "default";
                    this.props.topStore.dismissAllModals();
                    this.setUploadInProgressState(false);
                    // warn user about impending reboot.
                    this.props.topStore.showModal(ModalType.TWO_BUTTON,
                        'Restore succeeded. Gateway must reboot for Restore to take effect. Cancel only if you need to make further changes to files before rebooting.',
                        ['Cancel', 'Reboot'],
                        [this.cancelReboot, this.rebootAP],
                        undefined, ModalClass.REBOOTING);
                } else {
                    console.error('xhr restoreVDS failed on server: status=', xhr2.status);
                    document.body.style.cursor = "default";
                    this.props.topStore.dismissAllModals();
                    this.setUploadInProgressState(false);
                    this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR,
                        'Restore encountered an error in restoreVDS');
                }
            }
        };
    }

    /** User pressed 'Update License' button, which invoked uploadLicense.html. Report result */
    private onUploadLicenseResponse(xhr: XMLHttpRequest, originalFilename: string|undefined): string|undefined {
        const response: string = xhr.responseText;
        if (xhr.status === 200) {
            console.debug('xhr onUploadLicenseResponse: success', 'originalFilename=', originalFilename);
            // upload ran ok, which put license on AP at /etc/apeg/license.
            document.body.style.cursor = "default";
            this.props.topStore.dismissAnyModal(ModalClass.FILE_UPLOADING);
            this.setUploadInProgressState(false);
            this.props.topStore.showModal(ModalType.NO_OK, 'License has been updated.  Gateway will now reboot.', undefined, undefined, undefined, ModalClass.REBOOTING);
            return undefined;
        } else {
            console.error('xhr onUploadLicenseResponse: status is: ' + xhr.status, 'originalFilename=', originalFilename);
            document.body.style.cursor = "default";
            this.props.topStore.dismissAllModals();
            this.setUploadInProgressState(false);
            this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'error on file upload: ' + xhr.status);
            return 'ERROR';
        }
    }


    render() {
        const configuredDevicesResolved: boolean =
            this.props.topStore.getTopState().configuredDevicesResolved;

        return (
            <div id='infoAPInfo'
                 className={this.props.topStore.getTopState().downloadInProgress ||
                            this.props.topStore.getTopState().loading ? 'disabled' : ''}
            >
                <div id='apInfoForm'>
                    <table>
                        <tbody>
                        <tr>
                            <td colSpan={3}>
                                <h4>Reboot</h4>
                                <hr/>
                            </td>
                        </tr>
                        <tr>
                            <td></td>
                            <td colSpan={2}>
                                <span className='buttonPane'>
                                    <AptdButton id='rebootButton' title=''
                                                theClassName='gray'
                                                text='Reboot Gateway'
                                                onClick={this.onRebootClick}
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
                                    <AptdButton id='downloadButton2'
                                                title=''
                                                theClassName={'download gray'}
                                                //disabled={this.state.downloadInProgress}
                                                onClick={this.downloadAPBackup}
                                                text='Backup Gateway Config'
                                    />
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td></td>
                            <td colSpan={2}>
                                {/*  when user presses Restore AP Config button,
                                  *  invoke APTD server upload facility, then restore.cgi on AP */
                                }
                                <FilePickerButton
                                    label={'Restore Gateway Config'}
                                    url={'/uploadVDSBackup.html'}
                                    method={HttpMethod.POST}
                                    paramName={'restoreFile'}
                                    callback={this.onUploadRestoreFileResponse}
                                    computeCsum={false}
                                    computeFilename={true}
                                    showResultToUser={false}
                                    showRebootWarning={true}
                                    httpManager={this.props.httpManager}
                                    topStore={this.props.topStore}
                                />
                                <Note
                                    text='Warning: If you Restore from a Backup file made on a different Gateway, be sure to edit Gateway files before Reboot. Otherwise, you may change the IP address of this Gateway.'
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
                                    callback={this.onUploadFirmwareResponse}
                                    showResultToUser={false}
                                    // TODO: maybe need to show reboot warning if file is ipkg type
                                    showRebootWarning={false}
                                    disabled={! configuredDevicesResolved}
                                    acceptSuffixes=".ldrec,.ndrec,.hc,.gpg"
                                    httpManager={this.props.httpManager}
                                    topStore={this.props.topStore}
                                />
                                <Note
                                    text='After upload, ALL relevant devices will be upgraded. Valid files are for upload are .ldrec, .ndrec, .HC, and .ipk.gpg files.'
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
                                    callback={this.onUploadLicenseResponse}
                                    computeFilename={false}
                                    showResultToUser={false}
                                    showRebootWarning={true}
                                    httpManager={this.props.httpManager}
                                    topStore={this.props.topStore}
                                />
                                <Note
                                    text='After upload, the Gateway will automatically reboot.'
                                    idName='licenseNote'
                                />
                            </td>
                        </tr>

                        <tr>
                            <td colSpan={3}>
                                <h4>Diagnostics</h4>
                                <hr/>
                            </td>
                        </tr>
                        <tr>
                            <td></td>
                            <td colSpan={2}>
                                <div className='buttonPane'>
                                    <AptdButton id='downloadDiagsButton' title=''
                                                theClassName='download gray'
                                                //disabled={this.state.downloadInProgress}
                                                disabled={! configuredDevicesResolved}
                                                onClick={this.downloadDiagnostic}
                                                text='Download Diagnostics'
                                    />
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td></td>
                            <td colSpan={2}>
                                <div className='buttonPane'>
                                    <AptdButton id='downloadDeviceHierarchyButton' title=''
                                                theClassName='download gray'
                                                //disabled={this.state.downloadInProgress}
                                                disabled={! configuredDevicesResolved}
                                                onClick={this.downloadDeviceHierarchy}
                                                text='Download Device Hierarchy'
                                    />
                                </div>
                            </td>
                        </tr>

                        <tr>
                            <td colSpan={3}>
                                <h4>Reset Config</h4>
                                <hr/>
                            </td>
                        </tr>
                        <tr>
                            <td></td>
                            <td colSpan={2}>
                                <div className='buttonPane'>
                                    <AptdButton id='clearAndResetButton' title=''
                                                theClassName='gray'
                                                text='Clear Configuration and Reset Configured Devices'
                                                onClick={this.onResetClick}
                                    />
                                </div>
                                <Note
                                    text='All configured (Map) Sensors, Repeaters, and Radios will be reset to their factory RF configurations (RF channel, color code). This will remove all Sensors and Repeaters from the Map. Map Sensors should reappear in the Tray. Will not change the Gateway configuration. Will not reset firmware nor timeslot. This is not a "hard reset" of devices.'
                                    idName='clearAndResetNote'
                                />
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }
}

export default InfoPanelAPInfo;