import React, {Component, ReactNode} from 'react';
import '../infoPanels/InfoPanel.css';

interface NoteProps {
    text: string,
    idName: string
}

interface NoteState {

}

/**
 * A component for showing small Note to give advice to user.
 */
export default class Note extends Component<NoteProps, NoteState> {

    render() {
        const row:ReactNode = (
            <div className={'Note row'}>
                <small id={this.props.idName}
                       className='cell note'
                >{this.props.text}
                </small>
            </div>
        );
        return row;
    }
}