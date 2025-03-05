import React from 'react'
import useAppStore from './store'
import TopStore, { DispatchType } from '../TopStore'
import { Action, ObjectType, UpdateType } from '../AptdClientTypes'
import UndoManager from '../UndoManager'
import ValidationManager from '../ValidationManager'

interface ZustandBridgeProps {
    topStore: TopStore
}

/**
 * The ZustandBridge component is used to synchronize state between TopStore and Zustand
 * During the refactoring process, it serves as a bridge between the two state management approaches
 * As the refactoring progresses, the role of this component will gradually diminish and may eventually be removed
 */
class ZustandBridge extends React.Component<ZustandBridgeProps> {
    componentDidMount() {
        // Initial synchronization
        this.syncTopStoreToZustand()
        
        // Set up periodic synchronization
        this.intervalId = setInterval(() => {
            this.syncTopStoreToZustand()
        }, 5000) // Sync every 5 seconds
        
        // Initialize validation manager and undo manager
        if (this.props.topStore.validationManager) {
            useAppStore.getState().initValidationManager(this.props.topStore.validationManager)
        }
        
        if (this.props.topStore.undoManager) {
            useAppStore.getState().initUndoManager(this.props.topStore.undoManager)
        }
        
        // Listen for Zustand dispatch calls and forward them to TopStore
        this.unsubscribeDispatch = useAppStore.subscribe(
            state => state.dispatch,
            () => {
                // This callback is triggered when Zustand's dispatch is called
                // But we don't need to do anything here because dispatch itself will handle synchronization
            }
        )
        
        // Listen for changes in Zustand's mapSettings and sync to TopStore
        this.unsubscribeMapSettings = useAppStore.subscribe(
            state => state.mapSettings,
            (mapSettings) => {
                console.log('[ZustandBridge] mapSettings changed in Zustand, syncing to TopStore', mapSettings);
                // Sync Zustand's mapSettings to TopStore
                this.syncZustandToTopStore();
            }
        )
        
        // Override TopStore's dispatch method to update Zustand simultaneously
        const originalDispatch = this.props.topStore.dispatch.bind(this.props.topStore)
        this.originalDispatch = originalDispatch;
        this.props.topStore.dispatch = (action: Action, dispatchType: DispatchType = DispatchType.ORIGINAL, callback?: () => void) => {
            // First call the original dispatch method
            originalDispatch(action, dispatchType, () => {
                // Then sync to Zustand
                this.syncTopStoreToZustand()
                // Finally call the callback
                if (callback) callback()
            })
        }
    }

    componentWillUnmount() {
        if (this.intervalId) {
            clearInterval(this.intervalId)
        }
        
        if (this.unsubscribeDispatch) {
            this.unsubscribeDispatch()
        }
        
        if (this.unsubscribeMapSettings) {
            this.unsubscribeMapSettings()
        }
        
        // Restore the original dispatch method
        if (this.originalDispatch) {
            this.props.topStore.dispatch = this.originalDispatch
        }
    }

    private intervalId: NodeJS.Timeout | null = null
    private unsubscribeDispatch: (() => void) | null = null
    private unsubscribeMapSettings: (() => void) | null = null
    private originalDispatch: ((action: Action, dispatchType?: DispatchType, callback?: () => void) => void) | null = null

    syncTopStoreToZustand = () => {
        if (this.props.topStore) {
            const topState = this.props.topStore.getTopState()
            
            // Use immer to update Zustand state
            useAppStore.setState(state => {
                // Copy all TopStore state to Zustand
                Object.keys(topState).forEach(key => {
                    // @ts-ignore - Dynamic key access
                    state[key] = topState[key]
                })
            }, false, 'syncTopStoreToZustand')

            if (process.env.NODE_ENV === 'development') {
                console.log('[ZustandBridge] Synced TopStore to Zustand', new Date().toISOString())
            }
        }
    }

    syncZustandToTopStore = () => {
        if (this.props.topStore && this.originalDispatch) {
            const zustandState = useAppStore.getState();
            
            // Sync mapSettings to TopStore
            this.originalDispatch({
                objectType: ObjectType.MAP_SETTINGS,
                objectId: 'mapSettings',
                updateType: UpdateType.UPDATE,
                newData: zustandState.mapSettings
            }, DispatchType.ORIGINAL);

            if (process.env.NODE_ENV === 'development') {
                console.log('[ZustandBridge] Synced Zustand to TopStore', new Date().toISOString())
            }
        }
    }

    render() {
        return null
    }
}

export default ZustandBridge
