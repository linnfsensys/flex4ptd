import React, {ReactNode} from 'react';
import '../infoPanels/InfoPanel.css';
import './ProgressBar.css';

interface ProgressFieldProps {
    label: string,
    label2?: string,
    idName: string,
    value: number,
    max: number,
    visible?: boolean,
}

interface ProgressFieldState {
}
/**
 * A generalized Component that represents an underlying label and <progress>, which is readonly .
 */
export default class ProgressBar extends React.Component<ProgressFieldProps, ProgressFieldState> {

    constructor(props: ProgressFieldProps) {
        super(props);

        this.state = {
        };
    }

    render() {
        let progressDivClass: string = 'progressDiv ';
        progressDivClass += (this.props.visible === undefined || this.props.visible ?
            'visible' : 'invisible');
        const html: ReactNode = (
            <div id={this.props.idName+'Div'}
                 className={progressDivClass}
            >
                <progress id={this.props.idName}
                          max={this.props.max}
                          value={this.props.value}
                          >
                </progress>
                <label htmlFor={this.props.idName}>
                    {this.props.label}
                </label>
                {this.props.label2 !== undefined ?
                    <label>{this.props.label2}</label>
                    :
                    null
                }
            </div>
        );
        return html;
    }
}
