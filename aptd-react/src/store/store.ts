import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { TopStoreState } from '../TopStore'

// 类型定义 - 初期可以复用TopStoreState
interface ZustandStore extends Partial<TopStoreState> {
  // 仅添加一些基础状态用于测试
  isZustandActive: boolean
  
  // 只读镜像，不修改原数据
  mirrorTopStoreState: (topStoreState: TopStoreState) => void
}

// 创建store
const useStore = create<ZustandStore>()(
  subscribeWithSelector(
    devtools(
      (set) => ({
        // 初始状态 - 最小化
        isZustandActive: true,
        ap: null,
        radios: {},
        mapSensors: {},
        
        // 镜像TopStore状态的方法
        mirrorTopStoreState: (topStoreState) => {
          set({
            ap: topStoreState.ap,
            radios: topStoreState.radios,
            mapSensors: topStoreState.mapSensors,
            // 其他需要的状态...
          }, false, 'mirrorTopStoreState')
        }
      })
    )
  )
)

// 导出
export default useStore

// 调试辅助方法 - 在控制台中访问
// 这样可以在浏览器控制台通过window.zustandStore查看状态
if (process.env.NODE_ENV === 'development') {
  // @ts-ignore - 全局变量声明
  window.zustandStore = useStore
}