import useAppStore from './store'
import TopStore from '../TopStore'

if (process.env.NODE_ENV === 'development') {
  // @ts-ignore - global variable declaration
  window.zustandDebug = {
    getState: () => useAppStore.getState(),
    subscribe: (selector: (state: any) => any, callback: (selectedState: any) => void) => {
      return useAppStore.subscribe(selector, callback)
    },
    // compare Zustand with TopStore
    compareWithTopStore: (topStore: TopStore) => {
      const zustandState = useAppStore.getState()
      const topState = topStore.getTopState()
      
      console.group('状态对比')
      console.log('TopStore状态:', topState)
      console.log('Zustand状态:', zustandState)
      
      // check if key properties are consistent
      const keysToCompare = [
        'ap', 'radios', 'mapSensors', 'mapRepeaters', 'sensorZones', 
        'trayDevices', 'selected', 'selectedLinkInfo', 'modalStack'
      ]
      
      keysToCompare.forEach(key => {
        try {
          const isEqual = JSON.stringify(topState[key]) === JSON.stringify(zustandState[key])
          console.log(`${key} is consistent:`, isEqual ? '✅' : '❌')
        } catch (e) {
          console.log(`${key} comparison failed:`, e)
        }
      })
      
      console.groupEnd()
      return { topState, zustandState }
    },
    
    // 调试辅助方法
    logDispatch: (enabled = true) => {
      if (enabled) {
        const originalDispatch = useAppStore.getState().dispatch
        useAppStore.setState(state => {
          state.dispatch = (action, dispatchType, callback) => {
            console.log('Zustand dispatch:', action, dispatchType)
            return originalDispatch(action, dispatchType, callback)
          }
        })
        console.log('Dispatch logging enabled')
      } else {
        console.log('Dispatch logging disabled - reload page to reset')
      }
    },
    
    // 监听特定状态变化
    watchState: (path: string) => {
      const parts = path.split('.')
      const selector = (state: any) => {
        let current = state
        for (const part of parts) {
          if (current === undefined || current === null) return undefined
          current = current[part]
        }
        return current
      }
      
      return useAppStore.subscribe(selector, (value) => {
        console.log(`[State Change] ${path}:`, value)
      })
    }
  }
  
  console.log('Zustand调试工具已启用！在控制台使用window.zustandStore或window.zustandDebug访问')
}

export {}