import {Errors} from "../infoPanels/InfoPanel";
import {Component} from "react";
import {HasIdNameValidate} from "../AptdClientTypes";

export class Field<P extends HasIdNameValidate, S> extends Component<P, S> {
    errorId: string;

    constructor(props: P) {
        super(props);
        this.errorId = this.props.idName + 'Error';
        this.validateAndShowError = this.validateAndShowError.bind(this);
        this.showOrHideErrors = this.showOrHideErrors.bind(this);
    }

    validateAndShowError(value: string): Errors {
        const validation: Errors = this.props.validate(value);
        this.showOrHideErrors(validation);
        return validation;
    }

    showOrHideErrors(validation: Errors): void {
        const idElt = document.getElementById(this.props.idName);
        const errorElt = document.getElementById(this.errorId);
        if (Field.isValidField(validation)) {
            // hide error state and msg
            if (idElt !== null) {
                idElt.classList.remove('error');
            } else {
                throw Error('unexpected missing idElt');
            }
            if (errorElt !== null) {
                errorElt.innerText = '';
            } else {
                throw Error('unexpected missing errorElt');
            }
        } else {
            // show error state and msg
            if (idElt !== null) {
                idElt.classList.add('error');
            } else {
                throw Error('unexpected missing idElt');
            }
            if (errorElt !== null) {
                errorElt.innerText = validation.errmsgs.join('\n');
            } else {
                throw Error('unexpected missing errorElt');
            }
        }
    }

    static isValidField(validation: Errors): boolean {
        return validation.errmsgs === undefined ||
            validation.errmsgs === null ||
            validation.errmsgs.length === 0;
    }
}
