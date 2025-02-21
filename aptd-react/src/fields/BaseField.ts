import {Component, ReactNode} from "react";
import {BaseFieldProps} from "../AptdClientTypes";
import ValidationManager from "../ValidationManager";

export class BaseField<P extends BaseFieldProps, S> extends Component<P, S> {
    errorId: string;


    constructor(props: P) {
        super(props);
        this.errorId = this.props.idName + 'Error';
    }

    protected renderErrors(): ReactNode[] {
        let result: ReactNode[] = [];
        const errorKey: string = ValidationManager.makeErrorKey(this.props.objectType, this.props.objectId, this.props.fieldName, this.props.fieldIndex);
        const errMsgs: string[] = this.props.topStore.getTopState().validationErrors[errorKey];
        if (errMsgs !== undefined && errMsgs.length > 0) {
            let errMsgNo = 0;
            for (let errMsg of errMsgs) {
                if (errMsgNo > 0) {
                    result.push('<br>');
                }
                result.push(errMsg);
                errMsgNo++;
            }
        }
        return result;
    }
}
