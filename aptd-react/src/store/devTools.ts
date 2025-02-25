import useStore from './store'

if (process.env.NODE_ENV === 'development') {
  // @ts-ignore - global variable declaration
  window.zustandDebug = {
    getState: () => useStore.getState(),
    subscribe: (selector: (state: any) => any, callback: (selectedState: any) => void) => {
      return useStore.subscribe(selector, callback)
    },
    // compare Zustand with TopStore
    compareWithTopStore: (topStore: any) => {
      const zustandState = useStore.getState()
      const topState = topStore.getTopState()
      
      console.group('状态对比')
      console.log('TopStore状态:', topState)
      console.log('Zustand状态:', zustandState)
      
      // check if key properties are consistent
      const keysToCompare = ['ap', 'radios', 'mapSensors']
      keysToCompare.forEach(key => {
        const isEqual = JSON.stringify(topState[key]) === JSON.stringify(zustandState[key])
        console.log(`${key} is consistent:`, isEqual ? '✅' : '❌')
      })
      
      console.groupEnd()
      return { topState, zustandState }
    }
  }
  
  console.log('Zustand调试工具已启用！在控制台使用window.zustandStore或window.zustandDebug访问')
}

export {}