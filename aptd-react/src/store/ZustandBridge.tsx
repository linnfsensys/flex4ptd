import React from 'react'
import useStore from './store'
import TopStore from '../TopStore'

interface ZustandBridgeProps {
    topStore: TopStore
}

class ZustandBridge extends React.Component<ZustandBridgeProps> {
    componentDidMount() {
        this.syncTopStoreToZustand()

        this.intervalId = setInterval(() => {
            this.syncTopStoreToZustand()
        }, 30000)
    }

    componentWillUnmount() {
        if (this.intervalId) {
            clearInterval(this.intervalId)
        }
    }

    private intervalId: any = null

    syncTopStoreToZustand = () => {
        if (this.props.topStore) {
            const topState = this.props.topStore.getTopState()
            useStore.getState().mirrorTopStoreState(topState)

            if (process.env.NODE_ENV === 'development') {
                console.log('[ZustandBridge] Synced TopStore to Zustand', new Date().toISOString())
            }
        }
    }

    render() {
        return null
    }
}

export default ZustandBridge
