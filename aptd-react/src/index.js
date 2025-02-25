import React from 'react';
import ReactDOM from 'react-dom';
import * as serviceWorker from './serviceWorker';
import ErrorBoundary from "./ErrorBoundary";

if (process.env.NODE_ENV === 'development') {
    import('./store/devTools').catch(err => 
        console.warn('Failed to load devTools module:', err)
    )
}

ReactDOM.render(<ErrorBoundary />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
