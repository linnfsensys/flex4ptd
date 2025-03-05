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

/**
 * Internal state interface, not exposed externally
 */
interface InternalState {
  _validationManager: ValidationManager | null
  _undoManager: UndoManager | null
}

// Main Store type definition
interface AppStore extends TopStoreState, InternalState {
  // Operation methods
  dispatch: (action: Action, dispatchType?: DispatchType, callback?: () => void) => void
  dispatchAll: (actions: Action[], callback?: () => void) => void
  enact: (actionGroup: ActionGroup, callback?: () => void) => void
  reverse: (action: Action, callback?: () => void) => void
  
  /**
   * Modal operations
   */
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
  
  // Validation error operations
  dispatchValidationErrorsActions: (actions: ValidationAction[]) => void
  dispatchGlobalValidationErrorsActions: (actions: ValidationAction[]) => void
  
  // Configuration operations
  clearConfig: () => void
  resetConfig: () => void
  clearTray: () => void
  
  // Initialize validation manager and undo manager
  initValidationManager: (validationManager: ValidationManager) => void
  initUndoManager: (undoManager: UndoManager) => void
  
  // Helper method to get state
  getTopState: () => TopStoreState
}

// Create store
const useAppStore = create<AppStore>()(
  subscribeWithSelector(
    devtools(
      immer((set, get) => ({
        // Initial state - copied from TopStoreState
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
        
        // Internal state - not in TopStoreState
        _validationManager: null,
        _undoManager: null,
        
        // Helper method to get state
        getTopState: () => {
          const state = get()
          // Exclude internal state and methods
          const { 
            _validationManager, _undoManager, getTopState, dispatch, dispatchAll, 
            enact, reverse, showModal, dismissModal, dismissAllModals, 
            dispatchValidationErrorsActions, dispatchGlobalValidationErrorsActions,
            clearConfig, resetConfig, clearTray, initValidationManager, initUndoManager,
            ...topState 
          } = state
          return topState as TopStoreState
        },
        
        // Initialize validation manager and undo manager
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
        
        // Operation methods - basic implementation, needs to be improved later
        dispatch: (action: Action, dispatchType: DispatchType = DispatchType.ORIGINAL, callback?: () => void) => {
          // Need to dispatch to different handlers based on action.objectType
          console.log('Zustand dispatch:', action, dispatchType)
          
          // Temporary implementation: directly update state
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
              // Handle map settings update
              state.mapSettings = { 
                ...state.mapSettings, 
                ...(action.newData as Partial<MapSettings>) 
              }
              console.log('Update map settings:', state.mapSettings)
            }
            // Handling for other types...
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
          // Implementation of the undo operation
          console.log('Zustand reverse:', action)
          
          // Temporary implementation
          if (callback) callback()
        },
        
        // Modal operations
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
              // Remove the top modal
              if (state.modalStack.length > 0) {
                state.modalStack.pop()
              }
            } else {
              // Remove a specific modal
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
        
        // Validation error operations
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
        
        // Configuration operations
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

// Export
export default useAppStore

// Debug helper method - access in console
if (process.env.NODE_ENV === 'development') {
  // @ts-ignore - global variable declaration
  window.zustandStore = useAppStore
}