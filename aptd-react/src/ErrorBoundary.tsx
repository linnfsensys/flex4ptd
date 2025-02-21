import React, {ErrorInfo} from "react";
import TopStore from "./TopStore";
import './ErrorBoundary.css';

const SensysLogo:any = require('./assets/icons/sensys_logo_white.svg');
const SensConfigLogo:any = require('./assets/icons/SensConfig-logo-02.svg');

export interface ErrorBoundaryState {
    hasError: boolean,
}

export default class ErrorBoundary extends React.Component<{}, ErrorBoundaryState> {
    constructor(props: any) {
        super(props);
        this.state = {
            hasError: false,
        };
    }

    /** Update state so the next render will show the fallback UI */
    static getDerivedStateFromError(error:Error) {
        return { hasError: true };
    }

    /** You can also log the error to an error reporting service */
    componentDidCatch(error:Error, errorInfo:ErrorInfo) {
        console.error('ErrorBoundary.componentDidCatch(): about to log error');
        console.error(error);
        console.error(errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
            <div className='errorBoundary container'>
                <div className='top'>
                    <span id='sensysLogoSpan'>
                        <a href='#' id='sensysLogoA' className='logo'
                           title='Sensys Networks: SensConfig'
                        >
                            <img id='sensysLogo' src={SensysLogo} />
                        </a>
                    </span>
                    <span id="appLogo">
                        {/*SensConfig*/}
                        <a href='#' id='sensConfigLogoA' className='logo'
                           title='SensConfig Logo'
                        >
                            <img id='sensConfigLogo' src={SensConfigLogo} />
                        </a>
                    </span>
                    <span id="emptyRight">
                    </span>
                </div>
                <div className='content' id='body'>
                    <div className='lhs'>
                    </div>
                    <div className='center info inner'>
                        <div className='box' id='popup'>
                              <span className='text' id='message'>
                                  <p>
                                    We regret that an internal error occurred in SensConfig.
                                  </p>
                                  <p>
                                    Please restart SensConfig.
                                  </p>
                                  <p className='rightP buttonPane'>
                                    <a href='/index.html'>
                                        <button className='button gray start'>Restart</button>
                                    </a>
                                  </p>
                              </span>
                        </div>
                    </div>
                    <div className="rhs">
                    </div>
                </div>
                <div className='bottom'>
                </div>
            </div>
            );
        }
        return <TopStore/>
    }
}