import React from 'react';
import {HttpMethod, ModalType} from "../AptdClientTypes";
import HttpManager from "../HttpManager";
import TopStore from "../TopStore";
import './FilePickerButton.css';

export interface FilePickerButtonProps {
    label: string,
    url: string,
    paramName: string,
    method: HttpMethod | null, // POST or GET
    /** method returns 'ERROR' or undefined */
    callback: (request: XMLHttpRequest, arg?: string)=>string|undefined,
    computeCsum?: boolean,
    computeFilename?: boolean,
    /** showResultToUser is usually true, unless there is a 2nd follow-on script to invoke */
    showResultToUser?: boolean,
    showRebootWarning?: boolean,
    disabled?: boolean,
    /** an optional comma-separated list of file suffixes to accept */
    acceptSuffixes?: string,
    httpManager: HttpManager | null,
    topStore: TopStore,
}

export interface FilePickerButtonState {
    file: File | null,
    csum?: number,
    originalFilename?: string,
}

export default class FilePickerButton extends React.Component<FilePickerButtonProps, FilePickerButtonState> {
    //private readonly MAX_UPLOAD_FILE_SIZE: number = 1024*1024;  // 1MB

    constructor(props: FilePickerButtonProps) {
        super(props);
        this.state = {
            file: null,
            csum: 0,
            originalFilename: '',
        };
        this.onFormSubmit = this.onFormSubmit.bind(this);
        this.onFilePickedChange = this.onFilePickedChange.bind(this);
        this.onMouseDownNoFocus = this.onMouseDownNoFocus.bind(this);
        //this.generateChecksum = this.generateChecksum.bind(this);
        //this.getOriginalFilename = this.getOriginalFilename.bind(this);
        //this.fileUpload = this.fileUpload.bind(this)
        //this.readFileDataAsBase64 = this.readFileDataAsBase64.bind(this)

    }

    /**
     * when user clicks on the Form submit button,
     * instead, programmatically click on the form's (invisible) input file button.
     * This will cause the browser to prompt user for a file to upload
     */
    private onFormSubmit(e:React.FormEvent){
        e.preventDefault(); // Stop form submit
        const form: HTMLFormElement = e.currentTarget as HTMLFormElement;
        if (form.firstElementChild !== null) {
            const inputElt: HTMLInputElement = form.firstElementChild as HTMLInputElement;
            inputElt.click();
            // Browser will prompt user for file to upload.
            // When user picks a file, action continues in this.onFilePickedChange()
        }
    }

    /**
     * We are assuming only a single file upload
     */
    private onFilePickedChange(e: React.ChangeEvent<HTMLInputElement>) {
        console.log("xhr onFilePickedChange(): files=",e.target.files);
        if (e.target !== null && e.target.files !== null) {
            const firstFile: File = e.target.files[0];
            let newState: FilePickerButtonState = {file: firstFile};
            this.setState(newState);
            /*
            if (this.props.computeCsum === true) {
                this.generateChecksum(firstFile);       // sets state.csum
            }
            */

            if (this.props.computeFilename === true) {
                this.setState({originalFilename: firstFile.name});
            }

            if (this.props.acceptSuffixes !== undefined) {
                // Verify that the suffix of the user-chosen file is on the accepted suffix list.
                // Note: we do this because we cannot assume browser/OS will enforce it.
                const match:RegExpMatchArray|null = firstFile.name.match(/(\.[0-9a-zA-Z]+)$/);
                if (match === null) {
                    console.error('unexpected null suffix match for file');
                    return;
                }
                const suffix:string = match[1].toLowerCase();
                if (this.props.acceptSuffixes.toLowerCase().split(',').includes(suffix)) {
                    console.debug('suffix ', suffix, ' is among acceptSuffixes');
                } else {
                    console.error('suffix ', suffix, ' is not among acceptSuffixes');
                    this.props.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'File upload must be of among the following types: ' + this.props.acceptSuffixes);
                    return;
                }
            }
            /*
             * Max says it is sufficient for server side to check.
             *
            if (e.target.files[0].size > this.MAX_UPLOAD_FILE_SIZE) {
                this.props.topStore.showModal(ModalType.ONE_BUTTON, 'Max file size for upload is ' + this.MAX_UPLOAD_FILE_SIZE/1024 + 'KB');
            } else {
                this.setState({
                    file: e.target.files[0],
                    //csum: InfoPanelAPInfo.generateChecksum(file)
                });
            }
            */

            // max wants the file choice to provoke immediate upload
            if (this.props.httpManager !== null && this.props.method !== null &&
                this.props.paramName !== null) {

                let callbackArg: string|undefined = undefined;
                if (this.props.computeFilename === true && firstFile.name !== undefined) {
                    callbackArg = firstFile.name;
                }
                this.props.httpManager.fileUpload(firstFile, this.props.paramName,
                    this.props.method, this.props.url,
                    this.props.callback, callbackArg,
                    this.props.showResultToUser,
                    this.props.showRebootWarning);
                // reset the value so user could pick same value again.
                // (value is the chosen file).
                (e.target as HTMLInputElement).value = '';
            }
        } else {
            console.error('xhr onFilePickedChange(): null target files');
        }
    }

    /**
     * generates a checksum that matches server's csum command.
     * Robert says: the checksum is computed using a simple algorithm that is implemented in a
     * separate program csum. You will not be able to run this csum program in the browser.
     * The checksum algorithm computes the checksum of a file by adding all of the unsigned bytes
     * in the file and then masking them with 0xFFFF (i.e. 16 bits).
     * Result is a base-10 value (0-65535), put into state.csum.
     *
    private generateChecksum(file: File): void {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onloadend = (evt: ProgressEvent) => {
            if (evt.target !== null) {
                if (evt.target.readyState == FileReader.DONE) {
                    const arrayBuffer: ArrayBuffer | string | null = evt.target.result;
                    if (arrayBuffer === null || typeof (arrayBuffer) === "string") {
                        console.error('generateChecksum.onloadedend(): result is wrong type', evt.target.result);
                        return 0;
                    }
                    const array: Uint8Array = new Uint8Array(arrayBuffer);
                    const checksum = FilePickerButton.generateChecksumFromByteArray(array);
                    console.debug('setting csum to ', checksum);
                    this.setState({csum: checksum});
                }
            }
        }
    }*/

    /*
    private static generateChecksumFromByteArray(buf: Uint8Array): number {
        let modularSum:number = 0xce;
        for (let i = 0; i < buf.length; i++)
        {
            modularSum += (buf[i] & 0xff);
        }
        return modularSum & 0xffff;
    }
    */

    /**
     * hr: no longer using this because no longer uuencoding backup file.
     *
     * Assuming that the backup file is a uuencoded tarfile, downloaded from backup.cgi.
     * Therefore, its first line will contain the original filename by which it was created, e.g.,
     * <pre>
     * begin 644 bkup1597174429637.tar
     * </pre>
     *
    private getOriginalFilename(file: File) {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = (evt: ProgressEvent) => {
            const text: string = reader.result as string;
            const firstLine: string = text.split('\n')[0];
            const originalFilename: string = firstLine.split(' ')[2];
            console.debug('setting originalFilename to ', originalFilename);
            this.setState({originalFilename: originalFilename});
        }
    }
     */

    /**
     * Prevent mouseDown event from causing focus (and focus style) on button.
     * This is esp important because focus will linger after mouseUp.
     * Also, this way, tabbing to the button will still allow focus and focus style.
     */
    onMouseDownNoFocus(event: React.MouseEvent): void {
        event.preventDefault();
    }


    render() {
        return (
            <form className='filePickerButtonForm' onSubmit={this.onFormSubmit}>
                <input type="file"
                       accept={this.props.acceptSuffixes}
                       disabled={this.props.disabled}
                       onChange={this.onFilePickedChange}
                />
                <span className='buttonPane'>
                    <button type="submit"
                            className='button gray'
                            disabled={this.props.disabled}
                            onMouseDown={this.onMouseDownNoFocus}
                    >
                        {this.props.label}
                    </button>
                </span>
            </form>
        )
    }

}
