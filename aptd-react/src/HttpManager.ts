import TopStore from "./TopStore";
import {HttpMethod, ModalClass, ModalType} from "./AptdClientTypes";

export default class HttpManager {
    private topStore: TopStore;

    constructor(topStore: TopStore) {
        this.topStore = topStore;
    }

    private readFileDataAsBase64(file: any, callback: Function) {
        let reader: FileReader  = new FileReader();
        reader.onload = () => {
            if (reader.result !== null ){
                let data = reader.result;
                callback(data);
            }
        }
        reader.readAsDataURL(file);
    }

    public fileUpload(file: File|null, paramName: string, method: HttpMethod, url: string,
               callback: (request: XMLHttpRequest, arg?: string)=>string|undefined,
               callbackArg?: string,
               showResultToUser: boolean=true, showRebootWarning: boolean=false) {
        const formData = new FormData();
        console.debug('xhr fileUpload(): arguments=', arguments);
        if (file === null) {
            console.error('xhr fileUpload(): unexpected null value for file');
            document.body.style.cursor = "default";
            this.topStore.dismissAllModals();
            return;
        }
        formData.append(paramName, file);
        const request: XMLHttpRequest = new XMLHttpRequest();
        if (method === HttpMethod.POST) {
            request.open('POST', url, true);
        }
        else if (method === HttpMethod.GET) {
            document.body.style.cursor = "default";
            alert("GET methods not yet implemented");
            this.topStore.dismissAllModals();
            return;
        }
        else if ((method === null)) {
            this.readFileDataAsBase64(file, callback);
            return;
        }

        // disable user input.
        // Note: this means that user input must be re-enabled by removing modal in fileUpload()
        let uploadRunningMsg: string =
            'Upload is processing. Please be patient, this may take several minutes.';
        if (showRebootWarning) {
            uploadRunningMsg +=
                ' Remember that after upload completes, the Gateway needs to reboot so changes can take effect.';
        }
        this.topStore.showModal(ModalType.NO_OK, uploadRunningMsg, undefined,
            undefined, undefined, ModalClass.FILE_UPLOADING);
        // TODO: would be nicer to do the following via a css class
        document.body.style.cursor = "wait";

        request.onreadystatechange = () => {
            if (request.readyState === 4) {
                // invoke the callback
                const result: string|undefined = callback(request, callbackArg);
                if (result === 'ERROR') {
                    // this is caused by an error return from the callback.
                    // enable user input
                    document.body.style.cursor = "default";
                    console.error('callback returned an error');
                    // Don't show error here--show it in callback, where more info exists.
                    // TODO: dismissAllModals() is crude here. What if there was a lost connection?
                    //this.topStore.dismissAllModals();
                    //this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, 'An error was encountered');
                } else {
                    if (request.status !== 200) {
                        // enable user input
                        this.topStore.dismissAnyModal(ModalClass.FILE_UPLOADING);
                        document.body.style.cursor = "default";
                        // analyze HTTP status of the response
                        this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, `Error ${request.status}: ${request.statusText} ${request.responseText}`);
                    } else {
                        if (showResultToUser === true) {
                            // show the result
                            // hr: cannot seem to get the # bytes.  too bad.
                            // this.topStore.showModal(ModalType.ONE_BUTTON, `Done, got ${event.loaded} bytes`);

                            // enable user input
                            this.topStore.dismissAnyModal(ModalClass.FILE_UPLOADING);
                            document.body.style.cursor = "default";
                            this.topStore.showModal(ModalType.ONE_BUTTON_SUCCESS, `Done. Upload successful.`);
                        } else {
                            // don't want to show result to user.  just log it.  Want to make further calls
                            console.info('onreadystatechange(): xhr request.status is 200. request=', request);
                        }
                    }
                }
            }
        }


        request.onprogress = function(event) {
            console.debug('onprogress(): request=', request, 'event=', event);
            if (event.lengthComputable === true) {
                console.info(`Received ${event.loaded} of ${event.total} bytes`);
                // TODO: could show the following showModal, but only if configured to do so.
                //       That is, it should be a parameter that gets set somehow.
                //showModal(ModalType.SUCCESS, `Received ${event.loaded} of ${event.total} bytes`);
            } else {
                //showModal(ModalType.ONE_BUTTON, `Received ${event.loaded} bytes`);
            }
        };

        request.onerror = () => {
            document.body.style.cursor = "default";
            this.topStore.dismissAllModals();
            this.topStore.showModal(ModalType.ONE_BUTTON_ERROR, "Request failed" + request.responseText);
        };

        request.send(formData);
    }

}
