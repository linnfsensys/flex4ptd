import { useCallback } from 'react'
import useAppStore from './store'
import { DispatchType } from '../TopStore'
import { 
  Selected, 
  SelectedLinkInfo, 
  ModalType, 
  ModalClass,
  ObjectType,
  ActionGroup,
  GUISensorClient,
  GUIRepeaterClient,
  GUIRadioClient,
  GUISZClient,
  GUIAPConfigClient,
  GUICCInterfaceBaseClient,
  Action,
  UpdateType,
  MapSettings
} from '../AptdClientTypes'
import { ReactNode } from 'react'

/**
 * 获取应用程序的基本状态
 */
export const useAppState = () => {
  return {
    disabled: useAppStore(state => state.disabled),
    loading: useAppStore(state => state.loading),
    currentApTime: useAppStore(state => state.currentApTime),
    currentApTimezone: useAppStore(state => state.currentApTimezone),
    clientTimeMsAtLastServerUpdate: useAppStore(state => state.clientTimeMsAtLastServerUpdate),
    pingScanStatus: useAppStore(state => state.pingScanStatus),
    pingScanSecsLeft: useAppStore(state => state.pingScanSecsLeft),
    savePctComplete: useAppStore(state => state.savePctComplete),
    showHelpGuideOnLaunch: useAppStore(state => state.showHelpGuideOnLaunch),
    awaitingLoginValidation: useAppStore(state => state.awaitingLoginValidation),
    userid: useAppStore(state => state.userid),
    password: useAppStore(state => state.password),
    downloadInProgress: useAppStore(state => state.downloadInProgress),
    uploadInProgress: useAppStore(state => state.uploadInProgress),
    awaitingSaveResult: useAppStore(state => state.awaitingSaveResult),
    rebootRequiredOnSave: useAppStore(state => state.rebootRequiredOnSave)
  }
}

/**
 * 获取选中的设备信息
 */
export const useSelection = () => {
  return {
    selected: useAppStore(state => state.selected),
    selectedLinkInfo: useAppStore(state => state.selectedLinkInfo),
    
    // 选择设备的操作
    selectDevice: useCallback((deviceType: ObjectType, deviceId: string) => {
      useAppStore.getState().dispatch({
        objectType: ObjectType.SELECTED,
        objectId: deviceId,
        updateType: UpdateType.UPDATE,
        newData: {
          selected: null, // 这里需要实际的设备对象
          selectedG: null, // 这里需要实际的SVG元素
          selectedDeviceType: deviceType,
          selectedDotid: deviceId,
          selectedSzId: null // 如果是传感器区域，需要设置
        }
      })
    }, []),
    
    // 清除选择
    clearSelection: useCallback(() => {
      useAppStore.getState().dispatch({
        objectType: ObjectType.SELECTED,
        objectId: '',
        updateType: UpdateType.UPDATE,
        newData: null
      })
    }, [])
  }
}

/**
 * 获取地图上的设备
 */
export const useMapDevices = () => {
  return {
    ap: useAppStore(state => state.ap),
    radios: useAppStore(state => state.radios) as {[id: string]: GUIRadioClient},
    mapRepeaters: useAppStore(state => state.mapRepeaters) as {[id: string]: GUIRepeaterClient},
    mapSensors: useAppStore(state => state.mapSensors) as {[id: string]: GUISensorClient},
    sensorZones: useAppStore(state => state.sensorZones) as {[id: string]: GUISZClient},
    trayDevices: useAppStore(state => state.trayDevices),
    ccCards: useAppStore(state => state.ccCards) as {[id: string]: GUICCInterfaceBaseClient},
    sensorDotidToSzId: useAppStore(state => state.sensorDotidToSzId),
    
    // 获取特定设备
    getRadio: useCallback((radioId: string): GUIRadioClient | undefined => {
      return useAppStore.getState().radios[radioId] as GUIRadioClient
    }, []),
    
    getMapSensor: useCallback((sensorId: string): GUISensorClient | undefined => {
      return useAppStore.getState().mapSensors[sensorId] as GUISensorClient
    }, []),
    
    getMapRepeater: useCallback((repeaterId: string): GUIRepeaterClient | undefined => {
      return useAppStore.getState().mapRepeaters[repeaterId] as GUIRepeaterClient
    }, []),
    
    getSensorZone: useCallback((szId: string): GUISZClient | undefined => {
      return useAppStore.getState().sensorZones[szId] as GUISZClient
    }, []),
    
    getTrayDevice: useCallback((deviceId: string) => {
      return useAppStore.getState().trayDevices[deviceId]
    }, []),
    
    getCCCard: useCallback((cardId: string): GUICCInterfaceBaseClient | undefined => {
      return useAppStore.getState().ccCards[cardId] as GUICCInterfaceBaseClient
    }, []),
    
    // 获取特定传感器区域中的所有传感器
    getMapSensorsForSz: useCallback((szId: string): {[sensorId: string]: GUISensorClient} => {
      const state = useAppStore.getState();
      const result: {[sensorId: string]: GUISensorClient} = {};
      
      Object.entries(state.sensorDotidToSzId).forEach(([sensorId, currentSzId]) => {
        if (currentSzId === szId && state.mapSensors[sensorId]) {
          result[sensorId] = state.mapSensors[sensorId] as GUISensorClient;
        }
      });
      
      return result;
    }, [])
  }
}

/**
 * 模态框操作hooks
 */
export const useModals = () => {
  return {
    modalStack: useAppStore(state => state.modalStack),
    credentialValidationModalStack: useAppStore(state => state.credentialValidationModalStack),
    
    showModal: useCallback((
      modalType: ModalType = ModalType.ONE_BUTTON_SUCCESS,
      description: string = '',
      buttonLabels: string[] = [],
      buttonOnClicks: Array<() => void> = [],
      node?: ReactNode,
      modalClass?: string,
      callback?: () => void
    ) => {
      useAppStore.getState().showModal(
        modalType,
        description,
        buttonLabels,
        buttonOnClicks,
        node,
        modalClass,
        callback
      )
    }, []),
    
    dismissModal: useCallback((modalClass?: ModalClass | Event) => {
      useAppStore.getState().dismissModal(modalClass)
    }, []),
    
    dismissAllModals: useCallback(() => {
      useAppStore.getState().dismissAllModals()
    }, [])
  }
}

/**
 * 操作分发hooks
 */
export const useActions = () => {
  return {
    dispatch: useCallback((action: Action, dispatchType?: DispatchType, callback?: () => void) => {
      useAppStore.getState().dispatch(action, dispatchType, callback)
    }, []),
    
    dispatchAll: useCallback((actions: Action[], callback?: () => void) => {
      useAppStore.getState().dispatchAll(actions, callback)
    }, []),
    
    enact: useCallback((actionGroup: ActionGroup, callback?: () => void) => {
      useAppStore.getState().enact(actionGroup, callback)
    }, []),
    
    reverse: useCallback((action: Action, callback?: () => void) => {
      useAppStore.getState().reverse(action, callback)
    }, []),
    
    // 常用操作的快捷方法
    updateAP: useCallback((newData: Partial<GUIAPConfigClient>, callback?: () => void) => {
      useAppStore.getState().dispatch({
        objectType: ObjectType.AP,
        objectId: 'ap',
        updateType: UpdateType.UPDATE,
        newData
      }, undefined, callback)
    }, []),
    
    updateRadio: useCallback((radioId: string, newData: Partial<GUIRadioClient>, callback?: () => void) => {
      useAppStore.getState().dispatch({
        objectType: ObjectType.RADIO,
        objectId: radioId,
        updateType: UpdateType.UPDATE,
        newData
      }, undefined, callback)
    }, []),
    
    updateMapSensor: useCallback((sensorId: string, newData: Partial<GUISensorClient>, callback?: () => void) => {
      useAppStore.getState().dispatch({
        objectType: ObjectType.MAP_SENSOR,
        objectId: sensorId,
        updateType: UpdateType.UPDATE,
        newData
      }, undefined, callback)
    }, []),
    
    updateMapRepeater: useCallback((repeaterId: string, newData: Partial<GUIRepeaterClient>, callback?: () => void) => {
      useAppStore.getState().dispatch({
        objectType: ObjectType.MAP_REPEATER,
        objectId: repeaterId,
        updateType: UpdateType.UPDATE,
        newData
      }, undefined, callback)
    }, []),
    
    updateSensorZone: useCallback((szId: string, newData: Partial<GUISZClient>, callback?: () => void) => {
      useAppStore.getState().dispatch({
        objectType: ObjectType.SENSOR_ZONE,
        objectId: szId,
        updateType: UpdateType.UPDATE,
        newData
      }, undefined, callback)
    }, []),
    
    updateCCCard: useCallback((cardId: string, newData: Partial<GUICCInterfaceBaseClient>, callback?: () => void) => {
      useAppStore.getState().dispatch({
        objectType: ObjectType.CCCARD,
        objectId: cardId,
        updateType: UpdateType.UPDATE,
        newData
      }, undefined, callback)
    }, [])
  }
}

/**
 * 验证错误hooks
 */
export const useValidation = () => {
  return {
    validationErrors: useAppStore(state => state.validationErrors),
    validationGlobalErrors: useAppStore(state => state.validationGlobalErrors),
    
    // 获取特定字段的验证错误
    getFieldErrors: useCallback((objectType: ObjectType, objectId: string, fieldName: string, fieldIndex?: number|string) => {
      const key = makeErrorKey(objectType, objectId, fieldName, fieldIndex)
      return useAppStore.getState().validationErrors[key] || []
    }, []),
    
    // 获取特定面板的全局验证错误
    getGlobalErrors: useCallback((objectType: ObjectType, objectId: string) => {
      const key = makeInfoPanelKey(objectType, objectId)
      return useAppStore.getState().validationGlobalErrors[key] || []
    }, [])
  }
}

/**
 * 辅助函数：创建错误键
 */
function makeErrorKey(objectType: ObjectType, objectId: string, fieldName: string, fieldIndex?: number|string): string {
  let key = objectType + '-' + objectId + '-' + fieldName
  if (fieldIndex !== undefined) {
    key += '-' + fieldIndex
  }
  return key
}

/**
 * 辅助函数：创建信息面板键
 */
function makeInfoPanelKey(objectType: ObjectType, objectId: string): string {
  return objectType + '-' + objectId
}

/**
 * 配置操作hooks
 */
export const useConfig = () => {
  return {
    clearConfig: useCallback(() => {
      useAppStore.getState().clearConfig()
    }, []),
    
    resetConfig: useCallback(() => {
      useAppStore.getState().resetConfig()
    }, []),
    
    clearTray: useCallback(() => {
      useAppStore.getState().clearTray()
    }, [])
  }
}

/**
 * 帮助系统hooks
 */
export const useHelp = () => {
  return {
    helpBalloons: useAppStore(state => state.helpBalloons),
    helpHiLights: useAppStore(state => state.helpHiLights),
    helpArrows: useAppStore(state => state.helpArrows),
    needToClearAll: useAppStore(state => state.needToClearAll)
  }
}

/**
 * 地图设置hooks
 */
export const useMapSettings = () => {
  return {
    mapSettings: useAppStore(state => state.mapSettings),
    
    updateMapSettings: useCallback((newSettings: Partial<MapSettings>) => {
      useAppStore.getState().dispatch({
        objectType: ObjectType.MAP_SETTINGS,
        objectId: 'mapSettings',
        updateType: UpdateType.UPDATE,
        newData: newSettings
      })
    }, [])
  }
} 