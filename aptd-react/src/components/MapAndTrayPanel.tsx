import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useMapSettings, useMapDevices, useSelection, useAP } from '../store/hooks';
import { TextField as BaseTextField, ObjectType } from '../AptdClientTypes';
import './MapAndTrayPanel.css';
import TopStore from '../TopStore';
import UndoManager from '../UndoManager';
import MapImagesManager from '../MapImagesManager';
import { useMapTrayStore } from '../store/mapTrayStore';
import { GUIPoint } from '../AptdServerTypes';
import { GUICCInterfaceBaseClient } from '../AptdClientTypes';
import CCCardG from './CCCardG';
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
const WarningIcon = require('../assets/icons/icons8-warning-96.png');
const RssiEmpty = require('../assets/icons/empty_rssi_icon.png');
const RssiHigh = require('../assets/icons/rssi_high.png');
const RssiMid = require('../assets/icons/rssi_mid.png');
const RssiLow = require('../assets/icons/rssi_low.png');
const RssiAlert = require('../assets/icons/rssi_alert.png');

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
  
  // 修改：使用传入的mapCabinetTrayWidth作为初始宽度，不再使用本地状态
  const dimensions = {
    width: mapCabinetTrayWidth,
    height: mapCabinetTrayHeight
  };
  
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
    // 获取当前AP的zoomLevel和pan
    const currentZoomLevel = getZoomLevel();
    const currentPan = getPan();

    // 只有当值真正变化时才更新
    const zoomChanged = Math.abs(currentZoomLevel - zoomLevel) > 0.001;
    const panChanged =
      Math.abs(currentPan.x - pan.x) > 0.001 ||
      Math.abs(currentPan.y - pan.y) > 0.001;

    // 使用防抖来减少更新频率
    if (zoomChanged || panChanged) {
      const timeoutId = setTimeout(() => {
        if (zoomChanged) updateZoomLevel(zoomLevel);
        if (panChanged) updatePan(pan);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [zoomLevel, pan, getZoomLevel, getPan, updateZoomLevel, updatePan]);
  
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
      
      // 调整传感器区域的transform - 加上地图位置偏移量
      const transform = `translate(${position.x + mapXY.x}, ${position.y + mapXY.y})`;
      
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
          transform={transform}
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
    if (!mapSettings?.showRFLinks) {
      return [];
    }
    
    const sensorRfLinks = Object.entries(mapSensors || {}).map(([dotId, sensorData]) => {
      const rfLink = (sensorData as any).info?.rfLink;
      
      if (dotId && rfLink) {
        // 检查是否选中的链接
        const selected = false; // 在实际中应该检查选择状态
        
        // 检查链接的位置类型
        if (rfLink.location === 'MAP_AUTO') {
          console.error('renderRFLinks(): unexpected MAP_AUTO rflink', rfLink, sensorData);
          return null;
        }
        
        const lines = rfLink.lines;
        if (!lines || lines.length === 0) return null;
        
        // 渲染可见的polyline - 从原始版本中提取
        let points = '';
        if (lines && lines.length > 0) {
          const firstLine = lines[0];
          points = `${firstLine.aPoint.x + mapXY.x} ${firstLine.aPoint.y + mapXY.y}`;
          
          for (const line of lines) {
            points += `, ${line.bPoint.x + mapXY.x} ${line.bPoint.y + mapXY.y}`;
          }
        }
        
        // 渲染可拖动链接
        const draggableLinks = [];
        if (lines && lines.length > 0) {
          for (let segmentIndex = 0; segmentIndex < lines.length; segmentIndex++) {
            const line = lines[segmentIndex];
            let segmentPoints = '';
            
            if (segmentIndex === 0) {
              segmentPoints = `${line.aPoint.x + mapXY.x} ${line.aPoint.y + mapXY.y}`;
            } else {
              segmentPoints = `${line.aPoint.x + mapXY.x} ${line.aPoint.y + mapXY.y}`;
            }
            
            segmentPoints += `, ${line.bPoint.x + mapXY.x} ${line.bPoint.y + mapXY.y}`;
            
            draggableLinks.push(
              <polyline 
                key={`rfLinkPlB-${dotId}-${rfLink.dstId}-${segmentIndex}`}
                points={segmentPoints}
                className={`rfLinkPolylineBuffer draggable deviceId-${dotId}`}
                data-deviceid={dotId}
                data-dstid={rfLink.dstId}
                data-segmentid={segmentIndex}
                data-devicetype={ObjectType.RF_LINK}
              />
            );
          }
        }
        
        // 渲染悬停点
        const draggablePoints = [];
        if (lines && lines.length > 1) {
          for (let lineIndex = 0; lineIndex < lines.length - 1; lineIndex++) {
            const point = {
              x: lines[lineIndex].bPoint.x + mapXY.x - 5,
              y: lines[lineIndex].bPoint.y + mapXY.y - 5
            };
            
            draggablePoints.push(
              <rect 
                key={`rfLinkRect-${dotId}-${rfLink.dstId}-${lineIndex}`}
                className="rfLinkPolylineBuffer draggable point"
                data-deviceid={dotId}
                data-dstid={rfLink.dstId}
                data-segmentid={lineIndex}
                data-devicetype={ObjectType.RF_LINK}
                x={point.x}
                y={point.y}
                height="10"
                width="10"
              />
            );
          }
        }
        
        return (
          <g key={`rf${dotId}`} className={`rfLinkGOuter dotid-${dotId}`}>
            <polyline 
              points={points}
              className={`rfLinkPolyline${selected ? ' selected' : ''} deviceId-${dotId}`}
              data-deviceid={dotId}
              data-dstid={rfLink.dstId}
            />
            <g className="allDraggableRfLinks">
              {draggablePoints}
              {draggableLinks}
            </g>
          </g>
        );
      }
      return null;
    });
    
    // 添加中继器的RF链接渲染
    const repeaterRfLinks = Object.entries(mapRepeaters || {}).map(([dotId, repeaterData]) => {
      const rfLink = (repeaterData as any).info?.rfLink;
      
      if (dotId && rfLink) {
        // 检查是否选中的链接
        const selected = false; // 在实际中应该检查选择状态
        
        // 检查链接的位置类型
        if (rfLink.location === 'MAP_AUTO') {
          console.error('renderRFLinks(): unexpected MAP_AUTO rflink', rfLink, repeaterData);
          return null;
        }
        
        const lines = rfLink.lines;
        if (!lines || lines.length === 0) return null;
        
        // 渲染可见的polyline
        let points = '';
        if (lines && lines.length > 0) {
          const firstLine = lines[0];
          points = `${firstLine.aPoint.x + mapXY.x} ${firstLine.aPoint.y + mapXY.y}`;
          
          for (const line of lines) {
            points += `, ${line.bPoint.x + mapXY.x} ${line.bPoint.y + mapXY.y}`;
          }
        }
        
        // 渲染可拖动链接
        const draggableLinks = [];
        if (lines && lines.length > 0) {
          for (let segmentIndex = 0; segmentIndex < lines.length; segmentIndex++) {
            const line = lines[segmentIndex];
            let segmentPoints = '';
            
            if (segmentIndex === 0) {
              segmentPoints = `${line.aPoint.x + mapXY.x} ${line.aPoint.y + mapXY.y}`;
            } else {
              segmentPoints = `${line.aPoint.x + mapXY.x} ${line.aPoint.y + mapXY.y}`;
            }
            
            segmentPoints += `, ${line.bPoint.x + mapXY.x} ${line.bPoint.y + mapXY.y}`;
            
            draggableLinks.push(
              <polyline 
                key={`rfLinkPlB-${dotId}-${rfLink.dstId}-${segmentIndex}`}
                points={segmentPoints}
                className={`rfLinkPolylineBuffer draggable deviceId-${dotId}`}
                data-deviceid={dotId}
                data-dstid={rfLink.dstId}
                data-segmentid={segmentIndex}
                data-devicetype={ObjectType.RF_LINK}
              />
            );
          }
        }
        
        // 渲染悬停点
        const draggablePoints = [];
        if (lines && lines.length > 1) {
          for (let lineIndex = 0; lineIndex < lines.length - 1; lineIndex++) {
            const point = {
              x: lines[lineIndex].bPoint.x + mapXY.x - 5,
              y: lines[lineIndex].bPoint.y + mapXY.y - 5
            };
            
            draggablePoints.push(
              <rect 
                key={`rfLinkRect-${dotId}-${rfLink.dstId}-${lineIndex}`}
                className="rfLinkPolylineBuffer draggable point"
                data-deviceid={dotId}
                data-dstid={rfLink.dstId}
                data-segmentid={lineIndex}
                data-devicetype={ObjectType.RF_LINK}
                x={point.x}
                y={point.y}
                height="10"
                width="10"
              />
            );
          }
        }
        
        return (
          <g key={`rf${dotId}`} className={`rfLinkGOuter dotid-${dotId}`}>
            <polyline 
              points={points}
              className={`rfLinkPolyline${selected ? ' selected' : ''} deviceId-${dotId}`}
              data-deviceid={dotId}
              data-dstid={rfLink.dstId}
            />
            <g className="allDraggableRfLinks">
              {draggablePoints}
              {draggableLinks}
            </g>
          </g>
        );
      }
      return null;
    });
    
    // 合并传感器和中继器的RF链接
    return [...sensorRfLinks, ...repeaterRfLinks].filter(Boolean);
  };
  
  // 渲染射频链接
  const renderCCLinks = () => {
    // 简化版本的CC链接渲染
    return [];
  };
  
  // 添加验证错误检查函数
  const hasValidationErrors = (objectType: ObjectType, objectId: string): boolean => {
    if (!topStore) return false;
    
    // 检查验证错误
    for (let validationKey of Object.keys(topStore.getTopState().validationErrors || {})) {
      let errorKey = TopStore.parseValidationErrorsKey(validationKey);
      if (errorKey.objectType === objectType && errorKey.objectId === objectId) {
        return true;
      }
    }
    
    // 检查全局验证错误
    for (let validationKey of Object.keys(topStore.getTopState().validationGlobalErrors || {})) {
      let errorKey = TopStore.parseValidationGlobalErrorsKey(validationKey);
      if (errorKey.objectType === objectType && errorKey.objectId === objectId) {
        return true;
      }
    }
    
    return false;
  };
  
  // 渲染无线电
  const renderRadios = () => {
    if (!radios) return null;
    
    return Object.entries(radios).map(([radioId, radioData]) => {
      const isSelected = selected?.selectedDotid === radioId;
      const position = (radioData as any).info?.position || (radioData as any).position || { x: 0, y: 0 };
      const radioWidth = 56;
      const radioHeight = 56;
      
      // 使用与原始版本相同的变换计算 - 包括居中偏移和地图位置
      const transform = `translate(${position.x - radioWidth/2 + mapXY.x}, ${position.y - radioHeight/2 + mapXY.y})`;
      
      return (
        <g 
          key={radioId}
          className={`radioGOuter radioG draggable dotid-${radioId} ${isSelected ? 'selected' : ''}`}
          transform={transform}
          data-dotid={radioId}
          data-devicetype={ObjectType.RADIO}
          onClick={(e) => {
            e.stopPropagation();
            selectDevice(ObjectType.RADIO, radioId);
          }}
        >
          <rect className="radio" height={radioHeight} width={radioWidth} />
          <image 
            width={radioWidth} 
            height={radioHeight} 
            xlinkHref={RadioIcon} 
            className="radio"
          />
          {/* 添加固件进度显示 */}
          {(radioData as any).percentComplete !== undefined && (radioData as any).percentComplete > 0 && (
            <rect
              x={radioWidth/2 - 10}
              y={radioHeight/4.5}
              width={20 * ((radioData as any).percentComplete / 100)}
              height={3}
              fill="yellow"
            />
          )}
          <text x="30" y="15">
            {/* 使用与原始版本相同的格式：Radio-X */}
            Radio-{(radioData as any).apConnection?.replace('SPP', '') || radioId.slice(-1)}
          </text>
          {/* 添加未收到警告标记 */}
          {(radioData as any).unheard === true && (
            <image
              id="unheard"
              x={0}
              y={30}
              width="15"
              height="15"
              xlinkHref={WarningIcon}
            />
          )}
          {/* 添加缺陷标记 - 如果有验证错误 */}
          {hasValidationErrors(ObjectType.RADIO, radioId) && (
            <text x={radioWidth-6} y={30} className="deficient">*</text>
          )}
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
      const repeaterWidth = 40;
      const repeaterHeight = 40;
      
      // 使用与原始版本相同的变换计算
      const transform = `translate(${position.x - repeaterWidth/2 + mapXY.x}, ${position.y - repeaterHeight/2 + mapXY.y})`;
      
      return (
        <g 
          key={repeaterId}
          className={`repeaterGOuter repeaterG draggable dotid-${repeaterId} ${isSelected ? 'selected' : ''}`}
          transform={transform}
          data-dotid={repeaterId}
          data-devicetype={ObjectType.MAP_REPEATER}
          onClick={(e) => {
            e.stopPropagation();
            selectDevice(ObjectType.MAP_REPEATER, repeaterId);
          }}
        >
          <rect className="repeater" height={repeaterHeight} width={repeaterWidth} />
          <image 
            width={repeaterWidth} 
            height={repeaterHeight} 
            xlinkHref={RepeaterIcon} 
            className="repeater"
          />
          <text x="20" y="20">R-{repeaterId.slice(-2)}</text>
          {/* 添加未收到警告标记 */}
          {(repeaterData as any).unheard === true && (
            <image
              id="unheard"
              x={0}
              y={30}
              width="15"
              height="15"
              xlinkHref={WarningIcon}
            />
          )}
          {/* 添加缺陷标记 - 如果有验证错误 */}
          {hasValidationErrors(ObjectType.MAP_REPEATER, repeaterId) && (
            <text x={repeaterWidth-6} y={30} className="deficient">*</text>
          )}
        </g>
      );
    });
  };
  
  // 渲染托盘设备
  const renderTrayDevices = () => {
    if (!trayDevices) return null;
    
    // 添加获取RSSI图标的函数
    const getRssiIcon = (deviceData: any): string => {
      // 如果设备未看到或未收到
      if (deviceData.unheard || !deviceData.seen) {
        return RssiEmpty;
      }
      
      // 检查是否有rssi数据
      if (deviceData.rssi !== undefined && ap) {
        // 获取阈值
        let rssiHigh = (ap as any).rssiHigh || -66;
        let rssiMed = (ap as any).rssiMed || -80;
        let rssiLow = (ap as any).rssiLow || -86;
        
        // 根据信号强度返回相应图标
        if (deviceData.rssi >= rssiHigh) {
          return RssiHigh;
        } else if (deviceData.rssi >= rssiMed) {
          return RssiMid;
        } else if (deviceData.rssi >= rssiLow) {
          return RssiLow;
        } else {
          return RssiAlert;
        }
      }
      
      // 默认返回空图标
      return RssiEmpty;
    };
    
    return Object.entries(trayDevices).map(([deviceId, deviceData], index) => {
      const isSelected = selectedTrayDevice === deviceId;
      // 使用设备自己的位置信息，如果有的话
      const devicePosition = (deviceData as any).info?.position || (deviceData as any).position;
      // 如果设备没有位置信息，则使用计算的位置
      const xPosition = devicePosition ? devicePosition.x : 25 + (index * 43);
      const yPosition = devicePosition ? devicePosition.y : 9;
      
      // 在托盘中我们不需要额外的地图偏移，但需要正确居中设备
      
      // 检查设备类型，根据设备类型的字段确定是传感器还是中继器
      const isSensor = (deviceData as any).otype === 'GUISensor';
      
      if (isSensor) {
        // 传感器在托盘中
        const sensorRadius = 20;
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
            <circle cx="0" cy="20" r={sensorRadius} className="sensor" />
            <text x="0" y="20" className="trayDotidText">{deviceId}</text>
            <g className='rssiImg'>
              {/* 使用getRssiIcon函数动态选择RSSI图标 */}
              {(deviceData as any).rssi !== undefined && (
                <image
                  x="-10"
                  y="30"
                  width="20"
                  height="20"
                  xlinkHref={getRssiIcon(deviceData as any)}
                  className="rssi"
                />
              )}
            </g>
          </g>
        );
      } else {
        // 中继器在托盘中
        const repeaterWidth = 40;
        const repeaterHeight = 40;
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
            <rect className="repeater" height={repeaterHeight} width={repeaterWidth} x={-repeaterWidth/2} />
            <polygon points={`${-repeaterWidth/2} ${repeaterHeight-1}, 0 0, ${repeaterWidth/2} ${repeaterHeight-1}`} className="triangle" />
            <image 
              x={-repeaterWidth/2}
              y="0"
              width={repeaterWidth}
              height={repeaterHeight}
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
    const apWidth = 56;
    const apHeight = 56;
    
    // 使用与原始版本相同的变换计算
    const transform = `translate(${position.x - apWidth/2 + mapXY.x}, ${position.y - apHeight/2 + mapXY.y})`;
    
    return (
      <g 
        className={`apGOuter apG draggable dotid-AP ${isSelected ? 'selected' : ''}`}
        transform={transform}
        data-dotid="AP"
        data-devicetype={ObjectType.AP}
        onClick={(e) => {
          e.stopPropagation();
          selectDevice(ObjectType.AP, 'AP');
        }}
      >
        <rect className="ap" height={apHeight} width={apWidth} />
        <image 
          width={apWidth} 
          height={apHeight} 
          xlinkHref={APIcon} 
          className="ap"
        />
        <text x="30" y="15">Gateway {(ap as any).gatewayId || ''}</text>
      </g>
    );
  };
  
  // 渲染机柜卡片
  const renderCabinetCards = () => {
    // 获取检测到的通道ID
    const getDetectedChannelIds = (): Set<string> => {
      const detectedSensors = new Set<string>();
      
      // 收集所有检测到的传感器
      Object.entries(mapSensors || {}).forEach(([sensorId, sensor]) => {
        if (sensor.detect) {
          detectedSensors.add(sensorId);
        }
      });
      
      // 根据检测到的传感器获取通道ID
      const detectedChannelIds = new Set<string>();
      
      Object.entries(ccCards || {}).forEach(([cardId, card]) => {
        const channels = (card as any).channelsById || {};
        
        Object.entries(channels).forEach(([channelId, channel]) => {
          const sensors = (channel as any).sensors || [];
          
          // 如果通道连接的任何传感器被检测到，则标记该通道
          sensors.forEach((sensorId: string) => {
            if (detectedSensors.has(sensorId)) {
              detectedChannelIds.add(`${cardId}-${channelId}`);
            }
          });
        });
      });
      
      return detectedChannelIds;
    };
    
    const detectedChannelIds = getDetectedChannelIds();
    
    // 计算卡片位置
    let currentY = 5; // 起始位置与原始版本一致
    const spacing = 5; // 卡片之间的间距
    
    return Object.entries(ccCards || {}).map(([cardId, cardData]) => {
      // 计算卡片高度（基础高度 + 通道数量 * 每个通道高度）
      const channelsCount = Object.keys((cardData as any).channelsById || {}).length;
      const cardHeight = 63; // 使用固定高度，与原始版本一致
      
      // 保存当前卡片的Y位置
      const yPos = currentY;
      
      // 更新下一张卡片的位置
      currentY += cardHeight + spacing;
      
      return (
        <CCCardG
          key={cardId}
          datum={cardData as GUICCInterfaceBaseClient}
          selected={selected?.selectedDotid === cardId}
          detectedChannels={detectedChannelIds}
          x={0}
          y={yPos}
          onMouseDown={(e) => {
            e.stopPropagation();
            selectExtendedDevice(ObjectType.CCCARD, cardId);
          }}
          onMouseEnter={(e) => {
            // 处理鼠标进入事件
            console.log('Mouse enter card', cardId);
          }}
          onMouseLeave={(e) => {
            // 处理鼠标离开事件
            console.log('Mouse leave card', cardId);
          }}
        />
      );
    });
  };
  
  // 更新机柜卡片的位置
  const updateCabinetCardPositions = () => {
    // 计算每张卡片的垂直位置
    let currentY = 10; // 起始位置
    const spacing = 5; // 卡片之间的间距
    const updatedCCCards = { ...ccCards };
    
    Object.entries(updatedCCCards).forEach(([cardId, cardData]) => {
      // 更新卡片的位置
      (updatedCCCards[cardId] as any).yPos = currentY;
      
      // 计算卡片高度（基础高度 + 通道数量 * 每个通道高度）
      const channelsCount = Object.keys((cardData as any).channelsById || {}).length;
      const cardHeight = 20 + (channelsCount * 15); // 基础高度 + 通道高度
      
      // 更新下一张卡片的位置
      currentY += cardHeight + spacing;
    });
    
    // 我们不直接更新状态，而是记录位置信息
    // 在渲染时使用这些计算出的位置
  };
  
  // 在组件挂载时计算位置
  useEffect(() => {
    updateCabinetCardPositions();
  }, []);
  
  return (
    <div id="mapCabinetTrayDiv" className="map-and-tray-container" style={{ width: '100%', height: dimensions.height }}>
      <div className="map-section" style={{ height: mapHeight }}>
        <svg
          className="mapCabinet"
          height={mapHeight}
          id="mapCabinetSvg"
          data-devicetype={ObjectType.MAP}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
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
      </div>
      
      {/* Tray */}
      <div 
        id="trayDiv" 
        ref={trayRef} 
        style={{ height: `${trayHeight}px`, overflow: 'auto' }}
        onScroll={(e) => {
          // 可以在这里处理滚动事件
          console.log('Tray scrolled');
        }}
      >
        <svg 
          id="traySvg"
          width="100%"
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
              width="100%"
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