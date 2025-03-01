import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useMapSettings, useMapDevices, useSelection, useAP } from '../store/hooks';
import { TextField as BaseTextField, ObjectType } from '../AptdClientTypes';
import './MapAndTrayPanel.css';
import TopStore from '../TopStore';
import UndoManager from '../UndoManager';
import MapImagesManager from '../MapImagesManager';
import { useMapTrayStore } from '../store/mapTrayStore';
import { GUIPoint } from '../AptdServerTypes';
// Import Hilight from a local interface instead of from HelpEngine
// to avoid the module not found error

// Import device icons
const RadioIcon = require('../assets/icons/spp.png');
const RepeaterIcon = require('../assets/icons/SensysSkinMapRepeater.png');
const SensorIcon = require('../assets/icons/empty_rssi_icon.png');
const APIcon = require('../assets/icons/ap_diamond.png');
const NorthArrowIcon = require('../assets/icons/north_arrow_icon.png');
const MapZoomIn = require('../assets/icons/map_zoom_plus.png');
const MapZoomOut = require('../assets/icons/map_zoom_minus.png');

// Define Hilight interface locally
interface Hilight {
  id: string;
  target: string;
  type: string;
}

// Mock HelpEngine interface
interface HelpEngine {
  getHelpBalloons: () => any;
  getHelpHiLights: () => any;
  isHelpEnabled: () => boolean;
}

// Extend TextField interface to include position and rotationDegrees
interface TextField extends BaseTextField {
  position: GUIPoint;
  rotationDegrees: number;
  text: string;
  editText: string;
}

// Define interfaces for the types we're using
interface SensorZone {
  position?: GUIPoint;
  size?: {
    width: number;
    height: number;
  };
}

interface MapSettings {
  textFields?: {[id: string]: TextField};
  showRFLinks?: boolean;
  showCCLinks?: boolean;
  showLegend?: boolean;
  showCabinetIcon?: boolean;
  sensorZones?: {[id: string]: SensorZone};
}

// Define Point interface similar to original
interface Point {
  x: number;
  y: number;
}

// Define WidthHeight interface
interface WidthHeight {
  width: number;
  height: number;
}

// Define sensor and repeater types
interface GUISensor {
  id: string;
  position?: GUIPoint;
  [key: string]: any;
}

interface GUIRepeater {
  id: string;
  position?: GUIPoint;
  [key: string]: any;
}

// Define tray device type
interface TrayDevice {
  id: string;
  deviceType?: string;
  position?: GUIPoint;
  [key: string]: any;
}

// Define RF Link type
interface RFLink {
  dstId: string;
  [key: string]: any;
}

// Extend ObjectType enum
const TRAY_DEVICE = 'TRAY_DEVICE';
type ExtendedObjectType = ObjectType | typeof TRAY_DEVICE;

interface MapAndTrayPanelProps {
  topStore: TopStore;
  undoManager: UndoManager;
  mapImagesManager: MapImagesManager;
  mapCabinetTrayWidth: number;
  mapCabinetTrayHeight: number;
  trayHeight: number;
  mapHeight: number;
  leftCabinetPresent?: boolean; // Add this prop to control left cabinet visibility
  rightCabinetPresent?: boolean; // Add this prop to control right cabinet visibility
  cabinetWidth?: number; // Width of cabinets
}

/**
 * MapAndTrayPanel组件 - 使用Zustand hooks管理地图和托盘
 * 这是MapAndTray的Zustand版本
 */
const MapAndTrayPanel: React.FC<MapAndTrayPanelProps> = ({
  topStore,
  undoManager,
  mapImagesManager,
  mapCabinetTrayWidth,
  mapCabinetTrayHeight,
  trayHeight,
  mapHeight,
  leftCabinetPresent = false,
  rightCabinetPresent = true,
  cabinetWidth = 60
}) => {
  // 使用Zustand hooks获取状态和操作
  const { mapSettings } = useMapSettings();
  const { mapSensors, mapRepeaters, radios, trayDevices = {}, sensorZones, ccCards, sensorDotidToSzId } = useMapDevices();
  const { selected, selectDevice, clearSelection } = useSelection();
  const { ap, updateAP, getZoomLevel, getPan, updateZoomLevel, updatePan } = useAP();
  
  // 使用mapTrayStore管理地图平移和缩放
  const { 
    zoomLevel, 
    pan, 
    isDragging, 
    startDragging, 
    updateDragging, 
    stopDragging, 
    setZoomLevel, 
    setPan, 
    resetView 
  } = useMapTrayStore();
  
  // 本地状态
  const [dimensions, setDimensions] = useState({
    width: mapCabinetTrayWidth,
    height: mapCabinetTrayHeight
  });
  
  // 拖动状态
  const [draggingTrayDevice, setDraggingTrayDevice] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<GUIPoint>({ x: 0, y: 0 });
  
  // 选中的托盘设备状态
  const [selectedTrayDevice, setSelectedTrayDevice] = useState<string | null>(null);
  
  // Map dimensions calculations (similar to updateMapDimensions in original)
  const mapWidth = useMemo(() => {
    return mapCabinetTrayWidth - (leftCabinetPresent ? cabinetWidth : 0) - (rightCabinetPresent ? cabinetWidth : 0);
  }, [mapCabinetTrayWidth, leftCabinetPresent, rightCabinetPresent, cabinetWidth]);
  
  // Calculate map SVG position
  const mapSvgXY = useMemo(() => {
    return {
      x: leftCabinetPresent ? cabinetWidth : 0,
      y: 0
    };
  }, [leftCabinetPresent, cabinetWidth]);
  
  // Get map image dimensions - matching original getMapImageWidthHeight() method
  const mapImageDimensions = useMemo((): WidthHeight => {
    let widthHeight: WidthHeight;
    if (mapImagesManager === null) {
      widthHeight = {width: 1680, height: 1680};
    } else if (mapImagesManager.isCustomMapSelected() && mapImagesManager.customMapExists) {
      widthHeight = {width: 1680, height: 1680};
    } else {
      const mapDatum = mapImagesManager.getCurrentMapDatum();
      if (mapDatum !== null && mapDatum !== undefined) {
        widthHeight = {
          width: mapDatum.width,
          height: mapDatum.height,
        };
      } else {
        widthHeight = {width: 1680, height: 1680};
      }
    }
    return widthHeight;
  }, [mapImagesManager]);
  
  // Determine map view box
  const mapViewBox = useMemo(() => {
    return `0 0 ${mapWidth} ${mapHeight}`;
  }, [mapWidth, mapHeight]);
  
  // Calculate map elements transform
  const mapElementsTransform = useMemo(() => {
    // Match the original transform logic - scale first, then translate
    return `scale(${zoomLevel}) translate(${pan.x} ${pan.y})`;
  }, [pan.x, pan.y, zoomLevel]);
  
  // Calculate map XY position for background rectangle and image - using original calculation
  const mapXY = useMemo(() => {
    // Original calculation: (mapWidth/scale - mapImageWidth)/2.0
    const mapX = (mapWidth/zoomLevel - mapImageDimensions.width)/2.0;
    const mapY = (mapHeight/zoomLevel - mapImageDimensions.height)/2.0;
    return { x: mapX, y: mapY };
  }, [mapWidth, mapHeight, zoomLevel, mapImageDimensions]);
  
  // 引用
  const mapRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  
  // 扩展的选择设备函数
  const selectExtendedDevice = (deviceType: ExtendedObjectType, deviceId: string) => {
    if (deviceType === TRAY_DEVICE) {
      // 对于托盘设备，我们使用本地状态来跟踪选择
      setSelectedTrayDevice(deviceId);
      console.log('Selecting tray device:', deviceId);
      // 在实际应用中，这里应该调用适当的方法来选择托盘设备
    } else {
      // 对于其他设备类型，使用原始的selectDevice函数
      selectDevice(deviceType as ObjectType, deviceId);
    }
  };
  
  // 同步Zustand store和AP状态
  useEffect(() => {
    // 从AP状态初始化mapTrayStore
    const initialZoomLevel = getZoomLevel();
    const initialPan = getPan();
    
    setZoomLevel(initialZoomLevel);
    setPan(initialPan);
  }, [getZoomLevel, getPan, setZoomLevel, setPan]);
  
  // 当mapTrayStore状态改变时，更新AP状态
  useEffect(() => {
    // 使用防抖来减少更新频率
    const timeoutId = setTimeout(() => {
      updateZoomLevel(zoomLevel);
      updatePan(pan);
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [zoomLevel, pan, updateZoomLevel, updatePan]);
  
  // 获取鼠标相对于地图的位置
  const getMousePosition = (e: React.MouseEvent): GUIPoint => {
    if (!mapRef.current) {
      return { x: 0, y: 0 };
    }
    
    const rect = mapRef.current.getBoundingClientRect();
    // 使用与原始版本相似的转换逻辑
    return {
      x: (e.clientX - rect.left - (mapWidth/2)) / zoomLevel - pan.x,
      y: (e.clientY - rect.top - (mapHeight/2)) / zoomLevel - pan.y
    };
  };
  
  // 获取鼠标相对于托盘的位置
  const getTrayMousePosition = (e: React.MouseEvent): GUIPoint => {
    if (!trayRef.current) {
      return { x: 0, y: 0 };
    }
    
    const rect = trayRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };
  
  // 处理地图鼠标按下事件
  const handleMouseDown = (e: React.MouseEvent) => {
    // 只处理左键点击
    if (e.button !== 0) return;
    
    // 阻止事件传播和默认行为
    e.stopPropagation();
    e.preventDefault();
    
    // 开始拖动
    const mousePos = {
      x: e.clientX,
      y: e.clientY
    };
    
    startDragging(mousePos);
  };
  
  // 处理地图鼠标移动事件
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      // 阻止事件传播和默认行为
      e.stopPropagation();
      e.preventDefault();
      
      const mousePos = {
        x: e.clientX,
        y: e.clientY
      };
      
      updateDragging(mousePos);
    }
  };
  
  // 处理地图鼠标释放事件
  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging) {
      // 阻止事件传播和默认行为
      e.stopPropagation();
      e.preventDefault();
      
      stopDragging();
      
      // 持久化到AP状态
      updatePan(pan);
    }
  };
  
  // 处理地图点击事件
  const handleClick = (e: React.MouseEvent) => {
    // 如果是拖动结束，不处理点击
    if (isDragging) return;
    
    // 获取点击位置
    const mousePos = getMousePosition(e);
    console.log('Click at', mousePos);
    
    // 清除选择
    clearSelection();
    setSelectedTrayDevice(null);
  };
  
  // 处理托盘设备鼠标按下事件
  const handleTrayDeviceMouseDown = (e: React.MouseEvent, deviceId: string) => {
    e.stopPropagation();
    
    // 只处理左键点击
    if (e.button !== 0) return;
    
    // 选择设备
    selectExtendedDevice(TRAY_DEVICE, deviceId);
    
    // 开始拖动
    setDraggingTrayDevice(deviceId);
    
    // 计算拖动偏移量
    const mousePos = getTrayMousePosition(e);
    const device = trayDevices[deviceId] as unknown as TrayDevice;
    if (device && device.position) {
      setDragOffset({
        x: device.position.x - mousePos.x,
        y: device.position.y - mousePos.y
      });
    }
  };
  
  // 处理托盘鼠标移动事件
  const handleTrayMouseMove = (e: React.MouseEvent) => {
    if (draggingTrayDevice) {
      // 更新托盘设备位置
      const mousePos = getTrayMousePosition(e);
      const newPosition = {
        x: mousePos.x + dragOffset.x,
        y: mousePos.y + dragOffset.y
      };
      
      // 这里应该更新托盘设备位置
      console.log('Update tray device position', draggingTrayDevice, newPosition);
      
      // 在实际应用中，这里应该调用updateTrayDevice或类似的方法
    }
  };
  
  // 处理托盘鼠标释放事件
  const handleTrayMouseUp = () => {
    if (draggingTrayDevice) {
      setDraggingTrayDevice(null);
    }
  };
  
  // 处理缩放
  const handleZoom = (direction: 'in' | 'out') => {
    const zoomFactor = direction === 'in' ? 1.1 : 0.9;
    // 原始版本对缩放限制是0.1到8.0
    const newZoomLevel = Math.max(0.1, Math.min(8.0, zoomLevel * zoomFactor));
    
    // 更新状态
    setZoomLevel(newZoomLevel);
    
    // 持久化到AP状态
    updateZoomLevel(newZoomLevel);
  };
  
  // 重置视图
  const handleResetView = () => {
    resetView();
    updateZoomLevel(1.0);
    updatePan({ x: 0, y: 0 });
  };
  
  // 渲染传感器区域
  const renderSensorZones = () => {
    if (!sensorZones) return null;
    
    return Object.entries(sensorZones).map(([szId, szData]) => {
      const isSelected = selected?.selectedSzId === szId;
      const position = (szData as any).info?.position || (szData as any).position || { x: 0, y: 0 };
      
      const szSensors = Object.entries(mapSensors || {})
        .filter(([sensorId]) => sensorDotidToSzId[sensorId] === szId)
        .map(([sensorId, sensorData]) => {
          const isSelected = selected?.selectedDotid === sensorId;
          
          return (
            <g 
              key={sensorId}
              className={`mapSensorG draggable ${isSelected ? 'selected' : ''}`}
              data-dotid={sensorId}
              data-devicetype={ObjectType.MAP_SENSOR}
              onClick={(e) => {
                e.stopPropagation();
                selectDevice(ObjectType.MAP_SENSOR, sensorId);
              }}
            >
              <circle cx="35" cy="12.5" r="12.5" className="sensor" />
              <g className="text" transform="translate(35, 12.5) rotate(360)">
                <text className="dotidText">{sensorId}</text>
              </g>
            </g>
          );
        });
      
      return (
        <g 
          key={szId}
          className={`szG draggable ${isSelected ? 'selected' : ''}`}
          transform={`translate(${position.x}, ${position.y})`}
          data-dotid={szId}
          data-devicetype="szG"
          onClick={(e) => {
            e.stopPropagation();
            selectDevice(ObjectType.SENSOR_ZONE, szId);
          }}
        >
          <g 
            className="szRectG draggable"
            data-dotid={szId}
            data-devicetype={ObjectType.SENSOR_ZONE}
          >
            <rect className="szRect" height="25" width="70" />
            <text x="62" y="15" className="arrow">→</text>
            <g className="sensorsInSZ">
              {szSensors}
            </g>
          </g>
          <g 
            className="szRotateG draggable"
            data-dotid={szId}
            data-devicetype="szRotateG"
          >
            <rect className="rotateIconConnecton" x="70" y="12.5" height="1" width="15" />
            <circle cx="85" cy="12.5" r="5" className="rotateIcon" style={{ fill: 'rgb(255, 255, 255)' }} />
          </g>
        </g>
      );
    });
  };
  
  // 渲染射频链接
  const renderRFLinks = () => {
    // 简化版本的RF链接渲染
    return Object.entries(mapSensors || {}).map(([sensorId, sensorData]) => {
      const rfLinks = (sensorData as any).rfLinks || [];
      
      if (rfLinks.length === 0) return null;
      
      return rfLinks.map((link: RFLink, index: number) => {
        const targetId = link.dstId;
        const targetDevice = radios[targetId];
        const sensorPosition = (sensorData as any).info?.position || (sensorData as any).position;
        const targetPosition = targetDevice ? 
          ((targetDevice as any).info?.position || (targetDevice as any).position) : null;
        
        if (!targetPosition || !sensorPosition) return null;
        
        return (
          <g key={`${sensorId}-${targetId}-${index}`} className={`rfLinkGOuter dotid-${sensorId}`}>
            <polyline 
              points={`${sensorPosition.x} ${sensorPosition.y}, ${targetPosition.x} ${targetPosition.y}`}
              className={`rfLinkPolyline deviceId-${sensorId}`}
              data-deviceid={sensorId}
              data-dstid={targetId}
            />
            <g className="allDraggableRfLinks">
              <polyline 
                points={`${sensorPosition.x} ${sensorPosition.y}, ${targetPosition.x} ${targetPosition.y}`}
                className={`rfLinkPolylineBuffer draggable deviceId-${sensorId}`}
                data-deviceid={sensorId}
                data-dstid={targetId}
                data-segmentid="0"
                data-devicetype="RF_LINK"
              />
            </g>
          </g>
        );
      });
    }).flat().filter(Boolean);
  };
  
  // 渲染射频链接
  const renderCCLinks = () => {
    // 简化版本的CC链接渲染
    return [];
  };
  
  // 渲染无线电
  const renderRadios = () => {
    if (!radios) return null;
    
    return Object.entries(radios).map(([radioId, radioData]) => {
      const isSelected = selected?.selectedDotid === radioId;
      const position = (radioData as any).info?.position || (radioData as any).position || { x: 0, y: 0 };
      
      return (
        <g 
          key={radioId}
          className={`radioGOuter radioG draggable dotid-${radioId} ${isSelected ? 'selected' : ''}`}
          transform={`translate(${position.x}, ${position.y})`}
          data-dotid={radioId}
          data-devicetype={ObjectType.RADIO}
          onClick={(e) => {
            e.stopPropagation();
            selectDevice(ObjectType.RADIO, radioId);
          }}
        >
          <rect className="radio" height="56" width="56" />
          <image 
            width="56" 
            height="56" 
            xlinkHref={RadioIcon} 
            className="radio"
          />
          <text x="30" y="15">Radio-{radioId.slice(-1)}</text>
        </g>
      );
    });
  };
  
  // 渲染中继器
  const renderRepeaters = () => {
    if (!mapRepeaters) return null;
    
    return Object.entries(mapRepeaters).map(([repeaterId, repeaterData]) => {
      const isSelected = selected?.selectedDotid === repeaterId;
      const position = (repeaterData as any).info?.position || (repeaterData as any).position || { x: 0, y: 0 };
      
      return (
        <g 
          key={repeaterId}
          className={`repeaterGOuter repeaterG draggable dotid-${repeaterId} ${isSelected ? 'selected' : ''}`}
          transform={`translate(${position.x}, ${position.y})`}
          data-dotid={repeaterId}
          data-devicetype={ObjectType.MAP_REPEATER}
          onClick={(e) => {
            e.stopPropagation();
            selectDevice(ObjectType.MAP_REPEATER, repeaterId);
          }}
        >
          <rect className="repeater" height="40" width="40" />
          <image 
            width="40" 
            height="40" 
            xlinkHref={RepeaterIcon} 
            className="repeater"
          />
          <text x="20" y="20">R-{repeaterId.slice(-2)}</text>
        </g>
      );
    });
  };
  
  // 渲染托盘设备
  const renderTrayDevices = () => {
    if (!trayDevices) return null;
    
    return Object.entries(trayDevices).map(([deviceId, deviceData], index) => {
      const isSelected = selectedTrayDevice === deviceId;
      // 使用设备自己的位置信息，如果有的话
      const devicePosition = (deviceData as any).info?.position || (deviceData as any).position;
      // 如果设备没有位置信息，则使用计算的位置
      const xPosition = devicePosition ? devicePosition.x : 25 + (index * 43);
      const yPosition = devicePosition ? devicePosition.y : 9;
      
      // 检查设备类型，根据设备类型的字段确定是传感器还是中继器
      // 在原始代码中，设备类型存储在otype字段中
      const isSensor = (deviceData as any).otype === 'GUISensor';
      
      if (isSensor) {
        return (
          <g 
            key={deviceId}
            id={deviceId}
            className={`traySensorG draggable dotid-${deviceId} ${isSelected ? 'selected' : ''}`}
            transform={`translate(${xPosition}, ${yPosition})`}
            data-dotid={deviceId}
            data-devicetype={ObjectType.TRAY_SENSOR}
            onMouseDown={(e) => handleTrayDeviceMouseDown(e, deviceId)}
          >
            <circle cx="0" cy="20" r="20" className="sensor" />
            <text x="0" y="20" className="trayDotidText">{deviceId}</text>
            <g className='rssiImg'>
              {/* 这里可以添加RSSI图标，如果需要的话 */}
            </g>
          </g>
        );
      } else {
        return (
          <g 
            key={deviceId}
            id={deviceId}
            className={`trayRepeaterG draggable dotid-${deviceId} ${isSelected ? 'selected' : ''}`}
            transform={`translate(${xPosition}, ${yPosition})`}
            data-dotid={deviceId}
            data-devicetype={ObjectType.TRAY_REPEATER}
            onMouseDown={(e) => handleTrayDeviceMouseDown(e, deviceId)}
          >
            <rect className="repeater" height="40" width="40" x="-20" />
            <polygon points="-20 39, 0 0, 20 39" className="triangle" />
            <image 
              x="-20" 
              y="0"
              width="40" 
              height="40" 
              xlinkHref={RepeaterIcon}
              className="repeater"
            />
            <text className="devType" x="0" y="18">Repeater</text>
            <text x="0" y="33">{deviceId}</text>
          </g>
        );
      }
    });
  };
  
  // 渲染AP
  const renderAP = () => {
    if (!ap) return null;
    
    const isSelected = selected?.selectedDotid === 'AP';
    const position = (ap as any).info?.position || (ap as any).position || { x: 0, y: 0 };
    
    return (
      <g 
        className={`apGOuter apG draggable dotid-AP ${isSelected ? 'selected' : ''}`}
        transform={`translate(${position.x}, ${position.y})`}
        data-dotid="AP"
        data-devicetype={ObjectType.AP}
        onClick={(e) => {
          e.stopPropagation();
          selectDevice(ObjectType.AP, 'AP');
        }}
      >
        <rect className="ap" height="56" width="56" />
        <image 
          width="56" 
          height="56" 
          xlinkHref={APIcon} 
          className="ap"
        />
        <text x="30" y="15">Gateway {(ap as any).gatewayId || ''}</text>
      </g>
    );
  };
  
  // 渲染机柜卡片
  const renderCabinetCards = () => {
    if (!ccCards) return null;
    
    return Object.entries(ccCards).map(([cardId, cardData], index) => {
      const isSelected = selected?.selectedDotid === cardId;
      
      return (
        <g 
          key={cardId}
          className={`ccCardGOuter ccCardG selectable dotid-${cardId} ${isSelected ? 'selected' : ''}`}
          transform={`translate(0, ${5 + index * 65})`}
          data-dotid={cardId}
          data-devicetype={ObjectType.CCCARD}
          onClick={(e) => {
            e.stopPropagation();
            selectDevice(ObjectType.CCCARD, cardId);
          }}
        >
          <rect className="ccCard" height="63" width="50" />
          <rect className="cardRect" width="35" height="59" x="0" y="2" />
          <text className="cardText" x="46" y="13" transform="rotate(90, 40, 15)">{cardId.split('-')[1]}</text>
          
          {/* 渲染通道 */}
          {(cardData as any).channels && Object.entries((cardData as any).channels).map(([channelId, channelData], channelIndex) => (
            <g 
              key={channelId}
              className={`ccChannelG dotid-${cardId}-${channelId}`}
              transform={`translate(2, ${1 + channelIndex * 15})`}
              data-dotid={`${cardId}-${channelId}`}
              data-devicetype={ObjectType.CC_CHANNEL}
            >
              <rect className="ccChannelRect" height="15" width="28" rx="3" />
              <text className="channelText" x="12" y="7">Ch {channelIndex + 1}</text>
            </g>
          ))}
        </g>
      );
    });
  };
  
  return (
    <div id="mapCabinetTrayDiv" className="map-and-tray-container" style={{ width: dimensions.width, height: dimensions.height }}>
      <svg
        width={mapCabinetTrayWidth}
        height={mapCabinetTrayHeight}
        className="mapCabinet"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        id="mapCabinetSvg"
        data-devicetype={ObjectType.MAP}
      >
        {/* Left cabinet - conditionally rendered based on leftCabinetPresent */}
        {leftCabinetPresent && (
          <g className="cabinetG" key="left" transform="translate(0, 0)">
            <rect
              className="cabinetRect"
              width={cabinetWidth}
              height={mapHeight}
            />
            {/* Left cabinet cards could be rendered here */}
          </g>
        )}
        
        {/* Map SVG - using original structure and properties */}
        <svg 
          x={mapSvgXY.x} 
          y={mapSvgXY.y}
          className="mapSvg" 
          id="mapSvg"
          width={mapWidth}
          height={mapHeight}
          viewBox={mapViewBox}
          transform="scale(1)"
        >
          {/* Map elements group - using original transform structure */}
          <g 
            className="mapElementsG" 
            transform={mapElementsTransform}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
          >
            {/* Map background image */}
            <g 
              className="mapImageG"
              onMouseUp={handleMouseUp}
            >
              <rect 
                id="mapBgRect"
                x={mapXY.x} 
                y={mapXY.y}
                width={mapImageDimensions.width} 
                height={mapImageDimensions.height}
              />
              <image 
                id="mapImage"
                x={mapXY.x} 
                y={mapXY.y}
                width={mapImageDimensions.width} 
                height={mapImageDimensions.height}
                xlinkHref={mapImagesManager?.getCurrentMapUrl() || ''}
              />
            </g>
            
            {/* North arrow icon */}
            <g 
              className="gNorthArrowIconOutter selectable" 
              data-devicetype="MAP_NORTH_ARROW_ICON" 
              transform="translate(35, 35)"
            >
              <g 
                className="gNorthArrowIconRotate draggable" 
                data-dotid="rotate" 
                data-devicetype="MAP_NORTH_ARROW_ICON"
              >
                <rect className="rotateIconConnecton" x="17.5" y="-15" height="15" width="1" />
                <circle cx="17.5" cy="-15" r="5" className="rotateIcon" style={{ fill: 'rgb(255, 255, 255)' }} />
              </g>
              <g 
                className="gNorthArrowIcon draggable" 
                data-dotid="image" 
                data-devicetype="MAP_NORTH_ARROW_ICON"
              >
                <image 
                  width="35" 
                  height="35" 
                  xlinkHref={NorthArrowIcon}
                  className="northArrowIcon"
                />
              </g>
            </g>
            
            {/* RF links */}
            <g className="allRfLinks">
              {renderRFLinks()}
            </g>
            
            {/* CC links */}
            <g className="allCCLinks">
              {renderCCLinks()}
            </g>
            
            {/* Sensor zones */}
            <g className="allMapSensorZones">
              {renderSensorZones()}
            </g>
            
            {/* Radios */}
            <g className="allRadios">
              {renderRadios()}
            </g>
            
            {/* Repeaters */}
            <g className="allRepeaters">
              {renderRepeaters()}
            </g>
            
            {/* AP */}
            {renderAP()}
            
            {/* Testing */}
            <g className="testing" />
          </g>
          
          {/* Zoom controls */}
          <image 
            x={mapWidth - 70}
            y={mapHeight - 120}
            width="30"
            height="30"
            id="mapZoomIn"
            xlinkHref={MapZoomIn}
            onClick={() => handleZoom('in')}
          />
          <image 
            x={mapWidth - 70}
            y={mapHeight - 90}
            width="30"
            height="30"
            id="mapZoomOut"
            xlinkHref={MapZoomOut}
            onClick={() => handleZoom('out')}
          />
        </svg>
        
        {/* Right cabinet - conditionally rendered based on rightCabinetPresent */}
        {rightCabinetPresent && (
          <g className="cabinetG" transform={`translate(${mapCabinetTrayWidth - cabinetWidth}, 0)`} key="right">
            <rect
              className="cabinetRect"
              width={cabinetWidth}
              height={mapHeight}
            />
            {renderCabinetCards()}
          </g>
        )}
      </svg>
      
      {/* Tray */}
      <div id="trayDiv" style={{ width: mapCabinetTrayWidth, position: 'absolute', top: mapHeight }}>
        <svg 
          id="traySvg"
          width={mapCabinetTrayWidth}
          height={trayHeight}
          className="traySvg"
          onMouseMove={handleTrayMouseMove}
          onMouseUp={handleTrayMouseUp}
        >
          <g 
            className="trayG"
            data-devicetype={ObjectType.TRAY}
          >
            <rect
              id="trayRect"
              className="tray"
              width={mapCabinetTrayWidth}
              height={trayHeight}
              x={0}
              y={0}
            />
            {renderTrayDevices()}
          </g>
          <g id="trayDragProxyG" className="trayDragProxyG" />
        </svg>
      </div>
    </div>
  );
};

export default MapAndTrayPanel; 