import React, {Component, ReactNode} from 'react';
import {ModalType, ObjectType} from "./AptdClientTypes";
import './Modal.css';
import TopStore from "./TopStore";

interface ModalProps {
    show: Boolean,
    type: ModalType | null,
    description: string | null,
    node?: ReactNode,
    onClicks: Array<(param?:any)=>void>,
    buttonLabels: string[],
    /** modalClass may be multiple names separated by spaces */
    modalClasses: string,
    id?: string,
    onMouseDown?: (event: React.MouseEvent<SVGGElement|HTMLDivElement>)=>void,
    onMouseMove?: (event: React.MouseEvent<SVGGElement|HTMLDivElement>)=>void,
    onMouseUp?:  (event: React.MouseEvent<SVGGElement|HTMLDivElement>)=>void,
    topStore: TopStore,
}

/** shows a Modal dialog box, with text, optional markup, buttons, actions on buttons */
export class Modal extends Component<ModalProps, {}> {
    // TODO: perhaps following should be in state for easier debugging?
    private dragging: boolean = false;
    private posX: number = 0;
    private posY: number = 0;
    private id: number;
    private static modalCounter: number = 0;

    constructor(modalProps: ModalProps) {
        super(modalProps);
        this.id = Modal.modalCounter++;
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
    }

    render() {
        // Render nothing if the "show" prop is false
        if (!this.props.show || this.props.type === null) {
            return null;
        }

        let modalDescription = "";
        if (this.props.description !== null) {
            // Transform the description to add a newline after every
            // period followed by space (". ") or instead of "\n"
            let descriptionStrings: string[] = this.props.description.split(/\n|\.\ /);

            // If there is a period at the end remove empty string
            if (descriptionStrings.length > 0) {
                if (descriptionStrings[descriptionStrings.length-1].trim() === "") {
                    descriptionStrings.pop();
                }
            }

            for (let index = 0; index < descriptionStrings.length - 1; ++index) {
                let nextLine = descriptionStrings[index].trim();
                if (nextLine === '') {
                    modalDescription += "\n";
                } else {
                    modalDescription += nextLine + ".\n";
                }
            }
            if (descriptionStrings.length > 0) {
                let nextLine = descriptionStrings[descriptionStrings.length-1].trim();
                modalDescription += nextLine;
            }
        }

        const id:string = this.id.toString();
        const modalHeader:React.ReactNode =
            <div key={'modalHeader' + id} id={'modalHeader' + id} className={"modalHeader draggable"}
                 data-dotid={"modal-" + id}
                 data-devicetype={ObjectType.MODAL}
                 onMouseDown={this.props.onMouseDown !== undefined ?
                     this.props.onMouseDown : this.onMouseDown}
                 onMouseLeave={this.props.onMouseDown !== undefined ?
                     undefined : this.onMouseLeave}
            />;

        switch (this.props.type) {
            case ModalType.ONE_BUTTON_SUCCESS:
                return (
                    <div className="backdrop"
                         onMouseUp={this.props.onMouseUp !== undefined ?
                                    this.props.onMouseUp : this.onMouseUp}
                         onMouseMove={this.props.onMouseMove !== undefined ?
                                      this.props.onMouseMove : this.onMouseMove}
                    >
                        <div id={'modal-' + id} key={'modal-' + id}
                             className={"modal successModal " + this.props.modalClasses}>
                            {modalHeader}
                            <div className='modalContent'>
                                {modalDescription}
                                <div className='modal-node'>
                                    {this.props.node}
                                </div>
                                <div className='buttonPane'>
                                    <button className="button gray modal-link modal-dismiss"
                                            onClick={this.props.onClicks[0]}>
                                        {this.props.buttonLabels[0]}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case ModalType.TWO_BUTTON:
                const onclick1 = (e: React.MouseEvent) => {
                    this.props.topStore.dismissModal();
                    if (this.props.onClicks[0] !== this.props.topStore.dismissModal) {
                        this.props.onClicks[0]();
                    }
                };
                const onclick2 = (e: React.MouseEvent) => {
                    this.props.topStore.dismissModal();
                    if (this.props.onClicks[1] !== this.props.topStore.dismissModal) {
                        this.props.onClicks[1]();
                    }
                };

                return (
                    <div className="backdrop"
                         onMouseUp={this.props.onMouseUp !== undefined ?
                                    this.props.onMouseUp : this.onMouseUp}
                         onMouseMove={this.props.onMouseMove !== undefined ?
                                      this.props.onMouseMove : this.onMouseMove}
                    >
                        <div id={'modal' + id} key={'modal' + id}
                             className={"modal twoButtonModal " + this.props.modalClasses}>
                            {modalHeader}
                            <div className='modalContent'>
                                {modalDescription}
                                <div className='modal-node'>
                                    {this.props.node}
                                </div>
                                <br/>
                                <br/>
                                <div className='buttonPane'>
                                    <button className='button gray modal-link modal-dismiss'
                                            onClick={onclick1}>
                                        {this.props.buttonLabels[0]}
                                    </button>
                                    <button className='button gray modal-link modal-dismiss'
                                            onClick={onclick2}>
                                        {this.props.buttonLabels[1]}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case ModalType.ONE_BUTTON_ERROR:
                // indicates an error with red border
                return (
                    <div className="backdrop"
                         onMouseUp={this.props.onMouseUp !== undefined ?
                                    this.props.onMouseUp : this.onMouseUp}
                         onMouseMove={this.props.onMouseMove !== undefined ?
                                      this.props.onMouseMove : this.onMouseMove}
                    >
                        <div id={'modal' + id} key={'modal' + id}
                             className={"modal oneButtonModal oneButtonErrorModal " + this.props.modalClasses}>
                            {modalHeader}
                            <div className='modalContent'>
                                {modalDescription}
                                <div className='modal-node'>
                                    {this.props.node}
                                </div>
                                <br/>
                                <br/>
                                <div className='buttonPane'>
                                    <button className="button gray modal-link modal-dismiss"
                                            onClick={this.props.onClicks[0]}>
                                        {this.props.buttonLabels[0]}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case ModalType.NO_OK:
                return (
                    <div className="backdrop"
                         onMouseUp={this.props.onMouseUp !== undefined ?
                                    this.props.onMouseUp : this.onMouseUp}
                         onMouseMove={this.props.onMouseMove !== undefined ?
                                      this.props.onMouseMove : this.onMouseMove}
                    >
                        <div id={'modal' + id} key={'modal' + id}
                             className={"modal noButtonModal " + this.props.modalClasses}>
                            {modalHeader}
                            <div className='modalContent'>
                                {modalDescription}
                                <div className='modal-node'>
                                    {this.props.node}
                                </div>
                                <br/>
                                <br/>
                            </div>
                        </div>
                    </div>
                );

            case ModalType.NO_MSG:
                // blocks input, but shows no message
                return (
                    <div className={"noMsgBackdrop " + this.props.modalClasses}>
                    </div>
                );

            default:
                console.error('unexpected modalType: ', this.props.type);
                break;
        }
    }

    // allow for drag-ability of Modal dialogs except for NO_MSG variety.

    /** drag starts with a click on the .modalHeader div */
    private onMouseDown(event: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
        event.preventDefault();
        this.posX = event.clientX;
        this.posY = event.clientY;
        this.dragging = true;
        const dragHeader: HTMLDivElement = (event.target as HTMLDivElement);
        dragHeader.style.cursor = 'grabbing';
    }

    private onMouseUp(event: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
        event.preventDefault();
        this.dragging = false;
        this.posX = 0;
        this.posY = 0;
        const dragHeader: HTMLDivElement = (event.target as HTMLDivElement);
        dragHeader.style.cursor = 'grab';
    }

    private onMouseMove(event: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
        event.preventDefault();
        if (this.dragging) {
            const dx: number = event.clientX - this.posX;
            const dy: number = event.clientY - this.posY;
            this.posX = event.clientX;
            this.posY = event.clientY;
            // find the .modal parent of the target
            const parentDiv: HTMLElement | null = (event.target as HTMLDivElement).parentElement;
            if (parentDiv === null) {
                console.error('onMouseMove(): unexpected null parentDiv');
                return;
            }
            // assert class of parentDiv is modal
            if (! parentDiv.classList.contains('modal')) {
                console.error('onMouseMove(): parent is not .modal.  parent=', parentDiv);
                return;
            }
            const parentDivX: number = parseInt(window.getComputedStyle(parentDiv).marginLeft);
            const parentDivY: number = parseInt(window.getComputedStyle(parentDiv).marginTop);
            parentDiv.style.marginLeft = (parentDivX + dx) + "px";
            parentDiv.style.marginTop = (parentDivY + dy) + "px";
        }
    }

    onMouseLeave(event: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
        if (this.dragging) {
            // may have dragged too fast and gotten outside the drag bar.
            // In that case, stop the drag.

            // hr test: ignore it
            console.debug('Modal.onMouseLeave(): ignoring');
        }
    }

}

export default Modal;
