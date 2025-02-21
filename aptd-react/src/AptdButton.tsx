import * as React from "react";
import HelpEngine, { Change } from "./help/HelpEngine";

interface AptdButtonProps {
    id: string,
    text: string,
    title: string,
    onClick?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>)=> void,
    disabled?: boolean,
    theClassName?: string,
    dataDotid?: string,
    imgIcon?: any,
    imgWidth?: number,
    imgAlt?: string,
    helpEngine?: HelpEngine,
}
interface AptdButtonState {
}

export default class AptdButton extends React.Component<AptdButtonProps, AptdButtonState> {

    constructor(props: AptdButtonProps) {
        super(props);
        this.onButtonClick = this.onButtonClick.bind(this);
        this.onMouseDownNoFocus = this.onMouseDownNoFocus.bind(this);
    }

    render() {
        let buttonClassNames:string = 'button ' +
            (this.props.theClassName === undefined || this.props.theClassName === '' ?
                'gray' : this.props.theClassName);
        if (this.props.helpEngine !== undefined) {
            if (this.props.helpEngine.isHelpEnabled() &&
                this.props.helpEngine.getAwaitedButtonIds().includes(this.props.id)) {
                buttonClassNames += ' hilighted';
            }
        }
        return (
            <button
                id={this.props.id}
                type='button'
                title={this.props.title}
                data-dotid={this.props.dataDotid}
                onClick={this.onButtonClick}
                onMouseDown={this.onMouseDownNoFocus}
                disabled={this.props.disabled !== undefined ? this.props.disabled : false}
                className={buttonClassNames}
            >
                {this.props.imgIcon !== undefined ?
                    <img src={this.props.imgIcon} width={this.props.imgWidth} alt={this.props.imgAlt}></img>
                    :
                    null
                }
                {this.props.text}
            </button>
        )
    }

    onButtonClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        // do button-specific click handler
        if (this.props.onClick !== undefined) {
            this.props.onClick(event);
        }

        // do generic help-related click handler
        if (this.props.helpEngine !== undefined &&
            this.props.helpEngine.isHelpEnabled() &&
            this.props.helpEngine.getAwaitedButtonIds().includes(this.props.id)) {
            console.debug('onButtonClick(): this click triggers a HelpEngine state change');
            this.props.helpEngine.changeState(Change.BUTTON_PRESS, null,  this.props.id);
        } else {
            console.debug('onButtonClick(): this click is of no interest to HelpEngine');
        }
    }

    /**
     * Prevent mouseDown event from causing focus (and focus style) on button.
     * This is esp important because focus will linger after mouseUp.
     * Also, this way, tabbing to the button will still allow focus and focus style.
     */
    onMouseDownNoFocus(event: React.MouseEvent): void {
        event.preventDefault();
    }
}
