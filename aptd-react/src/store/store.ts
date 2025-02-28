import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { TopStoreState, DispatchType } from '../TopStore'
import { 
  Selected, 
  SelectedLinkInfo,
  ModalInfo,
  Action,
  ActionGroup,
  ModalType,
  ModalClass,
  ObjectType,
  GUIAPConfigClient, 
  GUIRadioClient, 
  GUIRepeaterClient, 
  GUISensorClient, 
  GUISZClient,
  GUICCInterfaceBaseClient,
  MapSettings,
  APGIChannelIdClient,
  STSChannelIdClient,
  UpdateType,
  TopType
} from '../AptdClientTypes'
import { GUITechSupport } from '../AptdServerTypes'
import { Balloon, Hilight, Arrow } from '../help/HelpEngine'
import { ValidationAction } from '../ValidationManager'
import HttpManager from '../HttpManager'
import { ReactNode } from 'react'
import UndoManager from '../UndoManager'
import ValidationManager from '../ValidationManager'

// 内部状态接口，不暴露给外部
interface InternalState {
  _validationManager: ValidationManager | null
  _undoManager: UndoManager | null
}

// 主Store类型定义
interface AppStore extends TopStoreState, InternalState {
  // 操作方法
  dispatch: (action: Action, dispatchType?: DispatchType, callback?: () => void) => void
  dispatchAll: (actions: Action[], callback?: () => void) => void
  enact: (actionGroup: ActionGroup, callback?: () => void) => void
  reverse: (action: Action, callback?: () => void) => void
  
  // 模态框操作
  showModal: (
    modalType?: ModalType,
    description?: string,
    buttonLabels?: string[],
    buttonOnClicks?: Array<() => void>,
    node?: ReactNode,
    modalClass?: string,
    callback?: () => void
  ) => void
  dismissModal: (modalClass?: ModalClass | Event) => void
  dismissAllModals: () => void
  
  // 验证错误操作
  dispatchValidationErrorsActions: (actions: ValidationAction[]) => void
  dispatchGlobalValidationErrorsActions: (actions: ValidationAction[]) => void
  
  // 配置操作
  clearConfig: () => void
  resetConfig: () => void
  clearTray: () => void
  
  // 初始化验证管理器和撤销管理器
  initValidationManager: (validationManager: ValidationManager) => void
  initUndoManager: (undoManager: UndoManager) => void
  
  // 获取状态的辅助方法
  getTopState: () => TopStoreState
}

// 创建store
const useAppStore = create<AppStore>()(
  subscribeWithSelector(
    devtools(
      immer((set, get) => ({
        // 初始状态 - 从TopStoreState复制
        disabled: false,
        loading: false,
        selected: null,
        selectedLinkInfo: null,
        ap: null,
        radios: {},
        mapRepeaters: {},
        ccCards: {},
        mapSensors: {},
        sensorZones: {},
        trayDevices: {},
        sensorDotidToSzId: {},
        lastRadioPositionById: {},
        validationErrors: {},
        validationGlobalErrors: {},
        mapSettings: {
          showRFLinks: true,
          showCCLinks: true,
          showLegend: true,
          showCabinetIcon: false,
          cabinetIconPosition: {x:0, y:0},
          northArrowRotationDegrees: 0,
          textFields: {},
        },
        httpManager: null,
        techSupport: null,
        pingScanStatus: null,
        pingScanNoCancel: false,
        pingScanSecsLeft: null,
        savePctComplete: null,
        currentApTime: null,
        currentApTimezone: null,
        clientTimeMsAtLastServerUpdate: null,
        showHelpGuideOnLaunch: false,
        modalStack: [],
        credentialValidationModalStack: [],
        awaitingLoginValidation: false,
        userid: '',
        password: '',
        topStateFieldByObjectType: {},
        apgiChannelTemp: {} as APGIChannelIdClient,
        stsChannelTemp: {} as STSChannelIdClient,
        helpBalloons: [],
        helpHiLights: [],
        helpArrows: [],
        needToClearAll: false,
        nextModalClass: 0,
        downloadInProgress: false,
        uploadInProgress: false,
        awaitingSaveResult: false,
        ignorePingScanStatus: false,
        lastServerStartTime: 0,
        lastGuiActiveTime: 0,
        rebootRequiredOnSave: false,
        configuredDevicesResolved: false,
        
        // 内部状态 - 不在TopStoreState中
        _validationManager: null,
        _undoManager: null,
        
        // 获取状态的辅助方法
        getTopState: () => {
          const state = get()
          // 排除内部状态和方法
          const { 
            _validationManager, _undoManager, getTopState, dispatch, dispatchAll, 
            enact, reverse, showModal, dismissModal, dismissAllModals, 
            dispatchValidationErrorsActions, dispatchGlobalValidationErrorsActions,
            clearConfig, resetConfig, clearTray, initValidationManager, initUndoManager,
            ...topState 
          } = state
          return topState as TopStoreState
        },
        
        // 初始化验证管理器和撤销管理器
        initValidationManager: (validationManager: ValidationManager) => {
          set(state => {
            state._validationManager = validationManager
          })
        },
        
        initUndoManager: (undoManager: UndoManager) => {
          set(state => {
            state._undoManager = undoManager
          })
        },
        
        // 操作方法 - 基本实现，后续需要完善
        dispatch: (action: Action, dispatchType: DispatchType = DispatchType.ORIGINAL, callback?: () => void) => {
          // 这里需要根据action.objectType分发到不同的处理函数
          console.log('Zustand dispatch:', action, dispatchType)
          
          // 临时实现：直接更新状态
          set(state => {
            if (action.objectType === ObjectType.AP && action.newData) {
              state.ap = { ...state.ap, ...(action.newData as Partial<GUIAPConfigClient>) }
            } else if (action.objectType === ObjectType.RADIO && action.objectId && action.newData) {
              state.radios[action.objectId] = { 
                ...state.radios[action.objectId], 
                ...(action.newData as Partial<GUIRadioClient>) 
              }
            } else if (action.objectType === ObjectType.MAP_SENSOR && action.objectId && action.newData) {
              state.mapSensors[action.objectId] = { 
                ...state.mapSensors[action.objectId], 
                ...(action.newData as Partial<GUISensorClient>) 
              }
            } else if (action.objectType === ObjectType.MAP_SETTINGS && action.newData) {
              // 处理地图设置更新
              state.mapSettings = { 
                ...state.mapSettings, 
                ...(action.newData as Partial<MapSettings>) 
              }
              console.log('更新地图设置:', state.mapSettings)
            }
            // 其他类型的处理...
          }, false, `dispatch/${action.objectType}`)
          
          if (callback) callback()
        },
        
        dispatchAll: (actions: Action[], callback?: () => void) => {
          actions.forEach(action => {
            get().dispatch(action)
          })
          if (callback) callback()
        },
        
        enact: (actionGroup: ActionGroup, callback?: () => void) => {
          get().dispatchAll(actionGroup.actions, callback)
        },
        
        reverse: (action: Action, callback?: () => void) => {
          // 撤销操作的实现
          console.log('Zustand reverse:', action)
          
          // 临时实现
          if (callback) callback()
        },
        
        // 模态框操作
        showModal: (
          modalType: ModalType = ModalType.ONE_BUTTON_SUCCESS,
          description: string = '',
          buttonLabels: string[] = [],
          buttonOnClicks: Array<() => void> = [],
          node?: ReactNode,
          modalClass?: string,
          callback?: () => void
        ) => {
          set(state => {
            const modalInfo: ModalInfo = {
              modalType,
              modalShow: true,
              modalDescription: description,
              modalLabels: buttonLabels,
              modalOnClicks: buttonOnClicks,
              modalNode: node || null,
              modalClass: modalClass || `modal-${state.nextModalClass++}`
            }
            state.modalStack.push(modalInfo)
          }, false, 'showModal')
          
          if (callback) callback()
        },
        
        dismissModal: (modalClass?: ModalClass | Event) => {
          set(state => {
            if (!modalClass) {
              // 移除最上面的模态框
              if (state.modalStack.length > 0) {
                state.modalStack.pop()
              }
            } else {
              // 移除特定的模态框
              const classStr = typeof modalClass === 'string' ? modalClass : ''
              state.modalStack = state.modalStack.filter(modal => 
                modal.modalClass !== classStr
              )
            }
          }, false, 'dismissModal')
        },
        
        dismissAllModals: () => {
          set(state => {
            state.modalStack = []
          }, false, 'dismissAllModals')
        },
        
        // 验证错误操作
        dispatchValidationErrorsActions: (actions: ValidationAction[]) => {
          actions.forEach(action => {
            set(state => {
              if (action.updateType === UpdateType.UPDATE || action.updateType === UpdateType.ADD) {
                if (state.validationErrors[action.fieldId] === undefined) {
                  state.validationErrors[action.fieldId] = [action.errMsg]
                } else {
                  state.validationErrors[action.fieldId].push(action.errMsg)
                }
              } else if (action.updateType === UpdateType.DELETE) {
                delete state.validationErrors[action.fieldId]
              }
            }, false, 'dispatchValidationErrorsAction')
          })
        },
        
        dispatchGlobalValidationErrorsActions: (actions: ValidationAction[]) => {
          actions.forEach(action => {
            set(state => {
              if (action.updateType === UpdateType.UPDATE || action.updateType === UpdateType.ADD) {
                if (state.validationGlobalErrors[action.fieldId] === undefined) {
                  state.validationGlobalErrors[action.fieldId] = [action.errMsg]
                } else {
                  state.validationGlobalErrors[action.fieldId].push(action.errMsg)
                }
              } else if (action.updateType === UpdateType.DELETE) {
                delete state.validationGlobalErrors[action.fieldId]
              }
            }, false, 'dispatchGlobalValidationErrorsAction')
          })
        },
        
        // 配置操作
        clearConfig: () => {
          set(state => {
            state.ap = null
            state.radios = {}
            state.mapRepeaters = {}
            state.ccCards = {}
            state.mapSensors = {}
            state.sensorZones = {}
            state.trayDevices = {}
            state.sensorDotidToSzId = {}
            state.selected = null
            state.selectedLinkInfo = null
            state.validationErrors = {}
            state.validationGlobalErrors = {}
          }, false, 'clearConfig')
        },
        
        resetConfig: () => {
          // 重置配置的实现
          get().clearConfig()
          // 其他重置操作...
        },
        
        clearTray: () => {
          set(state => {
            state.trayDevices = {}
          }, false, 'clearTray')
        }
      }))
    )
  )
)

// 导出
export default useAppStore

// 调试辅助方法 - 在控制台中访问
if (process.env.NODE_ENV === 'development') {
  // @ts-ignore - 全局变量声明
  window.zustandStore = useAppStore
}