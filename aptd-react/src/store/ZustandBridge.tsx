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
 * ZustandBridge组件用于在TopStore和Zustand之间同步状态
 * 在重构过程中，它充当两种状态管理方式的桥梁
 * 随着重构的深入，这个组件的作用会逐渐减少，最终可能被移除
 */
class ZustandBridge extends React.Component<ZustandBridgeProps> {
    componentDidMount() {
        // 初始同步
        this.syncTopStoreToZustand()
        
        // 设置定期同步
        this.intervalId = setInterval(() => {
            this.syncTopStoreToZustand()
        }, 5000) // 每5秒同步一次
        
        // 初始化验证管理器和撤销管理器
        if (this.props.topStore.validationManager) {
            useAppStore.getState().initValidationManager(this.props.topStore.validationManager)
        }
        
        if (this.props.topStore.undoManager) {
            useAppStore.getState().initUndoManager(this.props.topStore.undoManager)
        }
        
        // 监听Zustand的dispatch调用，将其转发到TopStore
        this.unsubscribeDispatch = useAppStore.subscribe(
            state => state.dispatch,
            () => {
                // 当Zustand的dispatch被调用时，这个回调会被触发
                // 但我们不需要在这里做任何事情，因为dispatch本身会处理同步
            }
        )
        
        // 监听Zustand的mapSettings变化，同步到TopStore
        this.unsubscribeMapSettings = useAppStore.subscribe(
            state => state.mapSettings,
            (mapSettings) => {
                console.log('[ZustandBridge] mapSettings changed in Zustand, syncing to TopStore', mapSettings);
                // 将Zustand的mapSettings同步到TopStore
                this.syncZustandToTopStore();
            }
        )
        
        // 重写TopStore的dispatch方法，使其同时更新Zustand
        const originalDispatch = this.props.topStore.dispatch.bind(this.props.topStore)
        this.originalDispatch = originalDispatch;
        this.props.topStore.dispatch = (action: Action, dispatchType: DispatchType = DispatchType.ORIGINAL, callback?: () => void) => {
            // 先调用原始的dispatch方法
            originalDispatch(action, dispatchType, () => {
                // 然后同步到Zustand
                this.syncTopStoreToZustand()
                // 最后调用回调
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
        
        // 恢复原始的dispatch方法
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
            
            // 使用immer更新Zustand状态
            useAppStore.setState(state => {
                // 复制所有TopStore状态到Zustand
                Object.keys(topState).forEach(key => {
                    // @ts-ignore - 动态键访问
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
            
            // 同步mapSettings到TopStore
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
