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
  MapSettings,
  BatteryStatus
} from '../AptdClientTypes'
import { ReactNode } from 'react'
import { UnitTypes, ChannelMode } from '../AptdServerTypes'

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

/**
 * 传感器区域相关的 hooks
 * 提供对传感器区域的读取和操作方法
 */
export const useSensorZones = () => {
  const sensorZones = useAppStore(state => state.sensorZones);
  const dispatch = useAppStore(state => state.dispatch);
  
  // 更新传感器区域
  const updateSensorZone = useCallback((szId: string, data: any) => {
    dispatch({
      objectType: ObjectType.SENSOR_ZONE,
      objectId: szId,
      updateType: UpdateType.UPDATE,
      newData: data
    });
  }, [dispatch]);
  
  // 获取特定传感器区域
  const getSensorZone = useCallback((szId: string) => {
    return sensorZones[szId];
  }, [sensorZones]);
  
  // 获取传感器区域内的传感器
  const getSensorsInZone = useCallback((szId: string) => {
    const zone = sensorZones[szId];
    if (!zone || !zone.sensorIds) return {};
    
    const mapSensors = useAppStore.getState().mapSensors;
    const result: {[sensorId: string]: any} = {};
    
    zone.sensorIds.forEach(sensorId => {
      if (mapSensors[sensorId]) {
        result[sensorId] = mapSensors[sensorId];
      }
    });
    
    return result;
  }, [sensorZones]);
  
  return {
    sensorZones,
    updateSensorZone,
    getSensorZone,
    getSensorsInZone
  };
};

/**
 * 无线电设备相关的 hooks
 * 提供对无线电设备的读取和操作方法
 */
export const useRadios = () => {
  const radios = useAppStore(state => state.radios);
  const dispatch = useAppStore(state => state.dispatch);
  
  // 更新无线电设备
  const updateRadio = useCallback((radioId: string, data: any) => {
    dispatch({
      objectType: ObjectType.RADIO,
      objectId: radioId,
      updateType: UpdateType.UPDATE,
      newData: data
    });
  }, [dispatch]);
  
  // 获取特定无线电设备
  const getRadio = useCallback((radioId: string) => {
    return radios[radioId];
  }, [radios]);
  
  // 获取可用的通道选项
  const getChannelOptions = useCallback((radioId: string) => {
    const radio = radios[radioId];
    if (!radio) return [];
    
    // 这里可以实现通道选项的逻辑
    // 例如根据无线电类型返回不同的选项
    return [];
  }, [radios]);
  
  return {
    radios,
    updateRadio,
    getRadio,
    getChannelOptions
  };
};

/**
 * 传感器相关的 hooks
 * 提供对传感器的读取和操作方法
 */
export const useSensors = () => {
  const mapSensors = useAppStore(state => state.mapSensors);
  const dispatch = useAppStore(state => state.dispatch);
  
  // 更新传感器
  const updateSensor = useCallback((sensorId: string, data: any) => {
    dispatch({
      objectType: ObjectType.MAP_SENSOR,
      objectId: sensorId,
      updateType: UpdateType.UPDATE,
      newData: data
    });
  }, [dispatch]);
  
  // 获取特定传感器
  const getSensor = useCallback((sensorId: string) => {
    return mapSensors[sensorId];
  }, [mapSensors]);
  
  // 替换传感器
  const replaceSensor = useCallback((oldSensorId: string, newSensorId: string) => {
    // 实现替换传感器的逻辑
    dispatch({
      objectType: ObjectType.MAP_SENSOR,
      objectId: oldSensorId,
      updateType: UpdateType.UPDATE,
      newData: { replacementSensorId: newSensorId }
    });
  }, [dispatch]);
  
  // 获取传感器电池状态
  const getSensorBatteryStatus = useCallback((sensorId: string) => {
    const sensor = mapSensors[sensorId];
    if (!sensor) return BatteryStatus.UNKNOWN;
    
    const ap = useAppStore.getState().ap;
    
    if (!ap) {
      return BatteryStatus.UNKNOWN;
    } else if (sensor.voltage === -1) {
      return BatteryStatus.UNKNOWN;
    } else if (sensor.voltage < ap.sensorLowBatteryThreshold) {
      return BatteryStatus.REPLACE;
    } else {
      return BatteryStatus.GOOD;
    }
  }, [mapSensors]);
  
  return {
    mapSensors,
    updateSensor,
    getSensor,
    replaceSensor,
    getSensorBatteryStatus
  };
};

/**
 * AP 相关的 hooks
 * 提供对 AP 的读取和操作方法
 */
export const useAP = () => {
  const ap = useAppStore(state => state.ap);
  const dispatch = useAppStore(state => state.dispatch);
  
  // 更新 AP
  const updateAP = useCallback((data: any) => {
    dispatch({
      objectType: ObjectType.AP,
      objectId: 'ap',
      updateType: UpdateType.UPDATE,
      newData: data
    });
  }, [dispatch]);
  
  // 获取系统上下文
  const getSystemContext = useCallback(() => {
    return ap?.systemContext || 'DEFAULT';
  }, [ap]);
  
  // 获取单位类型
  const getUnitType = useCallback(() => {
    return ap?.units || UnitTypes.METRIC;
  }, [ap]);
  
  return {
    ap,
    updateAP,
    getSystemContext,
    getUnitType
  };
};

/**
 * 单位转换相关的 hooks
 * 提供单位转换的工具方法
 */
export const useUnitConversion = () => {
  const ap = useAppStore(state => state.ap);
  
  // 毫米转英寸
  const mmToInches = useCallback((mm: string | number) => {
    const mmNum = typeof mm === 'string' ? parseFloat(mm) : mm;
    return (mmNum / 25.4).toFixed(2);
  }, []);
  
  // 英寸转毫米
  const inchesToMm = useCallback((inches: string | number) => {
    const inchesNum = typeof inches === 'string' ? parseFloat(inches) : inches;
    return Math.round(inchesNum * 25.4).toString();
  }, []);
  
  // 是否使用英制单位
  const isImperial = useCallback(() => {
    return ap?.units === UnitTypes.IMPERIAL;
  }, [ap]);
  
  return {
    mmToInches,
    inchesToMm,
    isImperial
  };
};

/**
 * 中继器相关的 hooks
 * 提供对中继器的读取和操作方法
 */
export const useRepeaters = () => {
  const mapRepeaters = useAppStore(state => state.mapRepeaters);
  const dispatch = useAppStore(state => state.dispatch);
  const ap = useAppStore(state => state.ap);
  
  // 更新中继器
  const updateRepeater = useCallback((repeaterId: string, data: Partial<GUIRepeaterClient>) => {
    dispatch({
      objectType: ObjectType.MAP_REPEATER,
      objectId: repeaterId,
      updateType: UpdateType.UPDATE,
      newData: data
    });
  }, [dispatch]);
  
  // 获取特定中继器
  const getRepeater = useCallback((repeaterId: string) => {
    return mapRepeaters[repeaterId] as GUIRepeaterClient;
  }, [mapRepeaters]);
  
  // 替换中继器
  const replaceRepeater = useCallback((oldRepeaterId: string, newRepeaterId: string) => {
    dispatch({
      objectType: ObjectType.MAP_REPEATER,
      objectId: oldRepeaterId,
      updateType: UpdateType.UPDATE,
      newData: { replacementRepeaterId: newRepeaterId }
    });
  }, [dispatch]);
  
  // 获取中继器电池状态
  const getRepeaterBatteryStatus = useCallback((repeaterId: string): BatteryStatus => {
    const repeater = mapRepeaters[repeaterId] as GUIRepeaterClient;
    if (!repeater) return BatteryStatus.UNKNOWN;
    
    if (!ap) {
      return BatteryStatus.UNKNOWN;
    } else if (repeater.voltage === -1) {
      return BatteryStatus.UNKNOWN;
    } else if (repeater.voltage < ap.repeaterLowBatteryThreshold) {
      return BatteryStatus.REPLACE;
    } else {
      return BatteryStatus.GOOD;
    }
  }, [mapRepeaters, ap]);
  
  // 获取中继器品牌名称
  const getRepeaterBrandName = useCallback((hwEnum: string): string => {
    const repeaterBrandNameBySNHardwareType: {[key:string]: string} = {
      "RPT1": "Original Repeater",       // no longer in production
      "RPT2": "Long-life Repeater",
      "RPT3": "FLEX Repeater",
      "RPT4": "FlexNode Line Powered",
      "RPT5": "FlexRepeat3 Solar",
    };
    
    return repeaterBrandNameBySNHardwareType[hwEnum] || '';
  }, []);
  
  // 禁用不允许的通道选项
  const disableDisallowedOptions = useCallback((repeaterId: string, allChannelOptions: Array<{value: string, text: string}>): Array<{value: string, text: string, disabled?: boolean}> => {
    const state = useAppStore.getState();
    const thisRepeater = state.mapRepeaters[repeaterId] as GUIRepeaterClient;
    if (!thisRepeater) return allChannelOptions;
    
    const otherRepeaterDesiredDownstreamChannels: number[] =
      Object.keys(state.mapRepeaters)
        .map((mapRepeaterId:string) => {
          const mapRepeater = state.mapRepeaters[mapRepeaterId] as GUIRepeaterClient;
          return (mapRepeaterId === repeaterId ? -1 :
            (mapRepeater.channelMode === ChannelMode.MANUAL) ?
              +mapRepeater.desiredDownstreamChannel : +mapRepeater.knownDownstreamChannel);
        });
    
    const otherRepeaterKnownDownstreamChannels: number[] =
      Object.keys(state.mapRepeaters)
        .map((mapRepeaterId:string) => {
          const mapRepeater = state.mapRepeaters[mapRepeaterId] as GUIRepeaterClient;
          return (mapRepeaterId === repeaterId ? -1 : +mapRepeater.knownDownstreamChannel);
        });
    
    const allRadioDesiredChannels: number[] =
      Object.keys(state.radios)
        .map((mapRadioId:string) => {
          const radio = state.radios[mapRadioId] as GUIRadioClient;
          return ((radio.channelMode === ChannelMode.MANUAL) ?
            +radio.desiredChannel : +radio.knownChannel);
        });
    
    const allRadioKnownChannels: number[] =
      Object.keys(state.radios)
        .map((mapRadioId:string) => {
          const radio = state.radios[mapRadioId] as GUIRadioClient;
          return +radio.knownChannel;
        });
    
    const forbiddenChannelArray:number[] =
      otherRepeaterDesiredDownstreamChannels
        .concat(otherRepeaterKnownDownstreamChannels)
        .concat(allRadioDesiredChannels)
        .concat(allRadioKnownChannels)
        .concat(+thisRepeater.knownUpstreamChannel)
        .filter((channel:number) => (channel !== -1));
    
    const forbiddenChannelsSet: Set<number> = new Set<number>(forbiddenChannelArray);
    
    // 'AUTO' option is always allowed
    const allowedOptions = allChannelOptions.filter((option) =>
      (option.value === 'AUTO' || !forbiddenChannelsSet.has(+option.value)));
    
    const allowedOptionByValue: {[value:string]: {value: string, text: string}} = {};
    allowedOptions.forEach((option) => {allowedOptionByValue[option.value] = option});
    
    return allChannelOptions.map((option) =>
      ({...option, disabled: (allowedOptionByValue[option.value] === undefined)}));
  }, []);
  
  // 转换下游通道值到存储格式
  const transformDownstreamChannelValueToStore = useCallback((downstreamChannelValue: string): {[fieldName:string]: string} => {
    let newChannel: string;
    let newChannelMode: string;
    if (downstreamChannelValue === 'AUTO') {
      newChannel = '-1';
      newChannelMode = ChannelMode.AUTO;
    } else {
      const channel:number = +downstreamChannelValue;
      if (channel >=0 && channel <=15) {
        newChannel = downstreamChannelValue.toString();
        newChannelMode = ChannelMode.MANUAL;
      } else {
        console.error('unexpected downstreamChannelValue', downstreamChannelValue);
        newChannel = '-1';
        newChannelMode = ChannelMode.AUTO;
      }
    }
    return {
      desiredDownstreamChannel: newChannel,
      channelMode: newChannelMode
    };
  }, []);
  
  // 计算上游通道
  const calcDesiredUpstreamChannel = useCallback((repeaterId: string): string => {
    const state = useAppStore.getState();
    const repeaterModel = state.mapRepeaters[repeaterId] as GUIRepeaterClient;
    if (!repeaterModel) return '';
    
    let dstId: string | undefined;
    let rfParent: GUIRadioClient | GUIRepeaterClient | undefined;
    
    if (repeaterModel.info.rfLink === undefined) {
      // 这是TRAY中继器的情况，或者尚未链接到RF父设备的MAP中继器
      if (repeaterModel.knownUpstreamChannel === undefined) {
        return '';
      }
      return repeaterModel.knownUpstreamChannel.toString();
    } else {
      dstId = repeaterModel.info.rfLink.dstId;
      if (dstId === 'SPP0' || dstId === 'SPP1') {
        // 父设备是无线电
        rfParent = state.radios[dstId] as GUIRadioClient;
        return (rfParent.channelMode === ChannelMode.AUTO ?
          rfParent.knownChannel : rfParent.desiredChannel);
      } else {
        // 父设备是中继器
        rfParent = state.mapRepeaters[dstId] as GUIRepeaterClient;
        return (rfParent.channelMode === ChannelMode.AUTO ?
          rfParent.knownDownstreamChannel : rfParent.desiredDownstreamChannel);
      }
    }
  }, []);
  
  return {
    mapRepeaters,
    updateRepeater,
    getRepeater,
    replaceRepeater,
    getRepeaterBatteryStatus,
    getRepeaterBrandName,
    disableDisallowedOptions,
    transformDownstreamChannelValueToStore,
    calcDesiredUpstreamChannel
  };
}; 