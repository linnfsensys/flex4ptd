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


//get the basic state of the application
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

//get the selected device information
export const useSelection = () => {
  return {
    selected: useAppStore(state => state.selected),
    selectedLinkInfo: useAppStore(state => state.selectedLinkInfo),
    
    // select the device operation
    selectDevice: useCallback((deviceType: ObjectType, deviceId: string) => {
      useAppStore.getState().dispatch({
        objectType: ObjectType.SELECTED,
        objectId: deviceId,
        updateType: UpdateType.UPDATE,
        newData: {
          selected: null, // need the actual device object
          selectedG: null, // need the actual SVG element
          selectedDeviceType: deviceType,
          selectedDotid: deviceId,
          selectedSzId: null // if it is a sensor zone, set it
        }
      })
    }, []),
    
    // clear the selection
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

//get the devices on the map
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
    
    // get the specific device
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
    
    // get all the sensors in the specific sensor zone
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


// modal operation hooks
 
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

// operation dispatch hooks
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
    
    // update the AP
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

// validation error hooks
export const useValidation = () => {
  return {
    validationErrors: useAppStore(state => state.validationErrors),
    validationGlobalErrors: useAppStore(state => state.validationGlobalErrors),
    
    // get the specific field validation errors
    getFieldErrors: useCallback((objectType: ObjectType, objectId: string, fieldName: string, fieldIndex?: number|string) => {
      const key = makeErrorKey(objectType, objectId, fieldName, fieldIndex)
      return useAppStore.getState().validationErrors[key] || []
    }, []),
    
    // get the specific panel global validation errors
    getGlobalErrors: useCallback((objectType: ObjectType, objectId: string) => {
      const key = makeInfoPanelKey(objectType, objectId)
      return useAppStore.getState().validationGlobalErrors[key] || []
    }, [])
  }
}

// helper function: create error key
function makeErrorKey(objectType: ObjectType, objectId: string, fieldName: string, fieldIndex?: number|string): string {
  let key = objectType + '-' + objectId + '-' + fieldName
  if (fieldIndex !== undefined) {
    key += '-' + fieldIndex
  }
  return key
}

// helper function: create info panel key
function makeInfoPanelKey(objectType: ObjectType, objectId: string): string {
  return objectType + '-' + objectId
}

// config operation hooks
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

// help system hooks
export const useHelp = () => {
  return {
    helpBalloons: useAppStore(state => state.helpBalloons),
    helpHiLights: useAppStore(state => state.helpHiLights),
    helpArrows: useAppStore(state => state.helpArrows),
    needToClearAll: useAppStore(state => state.needToClearAll)
  }
}

// map settings hooks
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


// sensor zone related hooks
// provide the read and operation methods for the sensor zone
 
export const useSensorZones = () => {
  const sensorZones = useAppStore(state => state.sensorZones);
  const dispatch = useAppStore(state => state.dispatch);
  
  // update the sensor zone
  const updateSensorZone = useCallback((szId: string, data: any) => {
    dispatch({
      objectType: ObjectType.SENSOR_ZONE,
      objectId: szId,
      updateType: UpdateType.UPDATE,
      newData: data
    });
  }, [dispatch]);
  
  // get the specific sensor zone
  const getSensorZone = useCallback((szId: string) => {
    return sensorZones[szId];
  }, [sensorZones]);
  
  // get the sensors in the specific sensor zone
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

// radio related hooks
// provide the read and operation methods for the radio

export const useRadios = () => {
  const radios = useAppStore(state => state.radios);
  const dispatch = useAppStore(state => state.dispatch);
  
  // update the radio
  const updateRadio = useCallback((radioId: string, data: any) => {
    dispatch({
      objectType: ObjectType.RADIO,
      objectId: radioId,
      updateType: UpdateType.UPDATE,
      newData: data
    });
  }, [dispatch]);
  
  // get the specific radio
  const getRadio = useCallback((radioId: string) => {
    return radios[radioId];
  }, [radios]);
  
  // get the available channel options
  const getChannelOptions = useCallback((radioId: string) => {
    const radio = radios[radioId];
    if (!radio) return [];
    
    // here we can implement the channel options logic
    // for example, return different options based on the radio type
    return [];
  }, [radios]);
  
  return {
    radios,
    updateRadio,
    getRadio,
    getChannelOptions
  };
};

// sensor related hooks
// provide the read and operation methods for the sensor

export const useSensors = () => {
  const mapSensors = useAppStore(state => state.mapSensors);
  const dispatch = useAppStore(state => state.dispatch);
  
  // update the sensor
  const updateSensor = useCallback((sensorId: string, data: any) => {
    dispatch({
      objectType: ObjectType.MAP_SENSOR,
      objectId: sensorId,
      updateType: UpdateType.UPDATE,
      newData: data
    });
  }, [dispatch]);
  
  // get the specific sensor
  const getSensor = useCallback((sensorId: string) => {
    return mapSensors[sensorId];
  }, [mapSensors]);
  
  // replace the sensor
  const replaceSensor = useCallback((oldSensorId: string, newSensorId: string) => {
    // here we can implement the replace sensor logic
    dispatch({
      objectType: ObjectType.MAP_SENSOR,
      objectId: oldSensorId,
      updateType: UpdateType.UPDATE,
      newData: { replacementSensorId: newSensorId }
    });
  }, [dispatch]);
  
  // get the sensor battery status
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
 * AP related hooks
 * provide the read and operation methods for the AP
 */
export const useAP = () => {
  const ap = useAppStore(state => state.ap);
  const dispatch = useAppStore(state => state.dispatch);
  
  // update the AP
  const updateAP = useCallback((data: any) => {
    dispatch({
      objectType: ObjectType.AP,
      objectId: 'ap',
      updateType: UpdateType.UPDATE,
      newData: data
    });
  }, [dispatch]);
  
  // get the system context
  const getSystemContext = useCallback(() => {
    return ap?.systemContext || 'DEFAULT';
  }, [ap]);
  
  // get the unit type
  const getUnitType = useCallback(() => {
    return ap?.units || UnitTypes.METRIC;
  }, [ap]);
  
  // get the zoom level
  const getZoomLevel = useCallback(() => {
    return ap?.zoomLevel || 1.0;
  }, [ap]);
  
  // get the pan offset
  const getPan = useCallback(() => {
    return ap?.pan || { x: 0, y: 0 };
  }, [ap]);
  
  // update the zoom level
  const updateZoomLevel = useCallback((newZoomLevel: number) => {
    const oldZoomLevel = ap?.zoomLevel || 1.0;
    
    dispatch({
      objectType: ObjectType.AP,
      objectId: 'AP',
      updateType: UpdateType.UPDATE,
      newData: { zoomLevel: newZoomLevel },
      origData: { zoomLevel: oldZoomLevel }
    });
  }, [dispatch, ap]);
  
  // update the pan offset
  const updatePan = useCallback((newPan: { x: number, y: number }) => {
    const oldPan = ap?.pan || { x: 0, y: 0 };
    
    dispatch({
      objectType: ObjectType.AP,
      objectId: 'AP',
      updateType: UpdateType.UPDATE,
      newData: { pan: newPan },
      origData: { pan: oldPan }
    });
  }, [dispatch, ap]);
  
  return {
    ap,
    updateAP,
    getSystemContext,
    getUnitType,
    getZoomLevel,
    getPan,
    updateZoomLevel,
    updatePan
  };
};

/**
 * unit conversion related hooks
 * provide the unit conversion tools
 */
export const useUnitConversion = () => {
  const ap = useAppStore(state => state.ap);
  
  // mm to inches
  const mmToInches = useCallback((mm: string | number) => {
    const mmNum = typeof mm === 'string' ? parseFloat(mm) : mm;
    return (mmNum / 25.4).toFixed(2);
  }, []);
  
  // inches to mm
  const inchesToMm = useCallback((inches: string | number) => {
    const inchesNum = typeof inches === 'string' ? parseFloat(inches) : inches;
    return Math.round(inchesNum * 25.4).toString();
  }, []);
  
  // is imperial
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
 * repeater related hooks
 * provide the read and operation methods for the repeater
 */
export const useRepeaters = () => {
  const mapRepeaters = useAppStore(state => state.mapRepeaters);
  const dispatch = useAppStore(state => state.dispatch);
  const ap = useAppStore(state => state.ap);
  
  // update the repeater
  const updateRepeater = useCallback((repeaterId: string, data: Partial<GUIRepeaterClient>) => {
    dispatch({
      objectType: ObjectType.MAP_REPEATER,
      objectId: repeaterId,
      updateType: UpdateType.UPDATE,
      newData: data
    });
  }, [dispatch]);
  
  // get the specific repeater
  const getRepeater = useCallback((repeaterId: string) => {
    return mapRepeaters[repeaterId] as GUIRepeaterClient;
  }, [mapRepeaters]);
  
  // replace the repeater
  const replaceRepeater = useCallback((oldRepeaterId: string, newRepeaterId: string) => {
    dispatch({
      objectType: ObjectType.MAP_REPEATER,
      objectId: oldRepeaterId,
      updateType: UpdateType.UPDATE,
      newData: { replacementRepeaterId: newRepeaterId }
    });
  }, [dispatch]);
  
  // get the repeater battery status
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
  
  // get the repeater brand name
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
  
  // disable the disallowed channel options
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
  
  // transform the downstream channel value to the store format
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
  
  // calculate the upstream channel
  const calcDesiredUpstreamChannel = useCallback((repeaterId: string): string => {
    const state = useAppStore.getState();
    const repeaterModel = state.mapRepeaters[repeaterId] as GUIRepeaterClient;
    if (!repeaterModel) return '';
    
    let dstId: string | undefined;
    let rfParent: GUIRadioClient | GUIRepeaterClient | undefined;
    
    if (repeaterModel.info.rfLink === undefined) {
      // this is the case of the TRAY repeater or the MAP repeater that is not linked to the RF parent device
      if (repeaterModel.knownUpstreamChannel === undefined) {
        return '';
      }
      return repeaterModel.knownUpstreamChannel.toString();
    } else {
      dstId = repeaterModel.info.rfLink.dstId;
      if (dstId === 'SPP0' || dstId === 'SPP1') {
        // the parent device is the radio
        rfParent = state.radios[dstId] as GUIRadioClient;
        return (rfParent.channelMode === ChannelMode.AUTO ?
          rfParent.knownChannel : rfParent.desiredChannel);
      } else {
        // the parent device is the repeater
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