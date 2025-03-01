import React, { useState, useRef, useEffect } from 'react';
import { useMapSettings, useMapDevices, useSelection, useAP } from '../store/hooks';
import { TextField as BaseTextField, ObjectType } from '../AptdClientTypes';
import './MapAndTrayPanel.css';
import TopStore from '../TopStore';
import UndoManager from '../UndoManager';
import MapImagesManager from '../MapImagesManager';
import { useMapTrayStore } from '../store/mapTrayStore';
import { GUIPoint } from '../AptdServerTypes';

// Mock HelpEngine interface
interface HelpEngine {
  getHelpBalloons: () => any;
  getHelpHiLights: () => any;
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

// Extend ObjectType enum
const TRAY_DEVICE = 'TRAY_DEVICE';
type ExtendedObjectType = ObjectType | typeof TRAY_DEVICE;

interface MapAndTrayPanelProps {
  topStore?: TopStore;
  undoManager?: UndoManager;
  mapImagesManager?: MapImagesManager;
  mapCabinetTrayWidth: number;
  mapCabinetTrayHeight: number;
  trayHeight: number;
  mapHeight: number;
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
  mapHeight
}) => {
  // 使用Zustand hooks获取状态和操作
  const { mapSettings } = useMapSettings();
  const { mapSensors, mapRepeaters, radios, trayDevices = {} } = useMapDevices();
  const { selected, selectDevice, clearSelection } = useSelection();
  const { updateAP, getZoomLevel, getPan, updateZoomLevel, updatePan } = useAP();
  
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
    return {
      x: (e.clientX - rect.left) / zoomLevel - pan.x,
      y: (e.clientY - rect.top) / zoomLevel - pan.y
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
      const mousePos = {
        x: e.clientX,
        y: e.clientY
      };
      
      updateDragging(mousePos);
    }
  };
  
  // 处理地图鼠标释放事件
  const handleMouseUp = () => {
    if (isDragging) {
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
    let newZoomLevel = zoomLevel;
    
    if (direction === 'in') {
      // 放大，最大缩放级别为2.0
      newZoomLevel = Math.min(zoomLevel * 1.2, 2.0);
    } else {
      // 缩小，最小缩放级别为0.2
      newZoomLevel = Math.max(zoomLevel / 1.2, 0.2);
    }
    
    setZoomLevel(newZoomLevel);
    
    // 持久化到AP状态
    updateZoomLevel(newZoomLevel);
  };
  
  // 重置视图
  const handleResetView = () => {
    resetView();
    
    // 持久化到AP状态
    updateZoomLevel(1.0);
    updatePan({ x: 0, y: 0 });
  };
  
  // 渲染文本字段
  const renderTextFields = () => {
    const settings = mapSettings as MapSettings;
    if (!settings.textFields) return null;
    
    return Object.entries(settings.textFields).map(([id, textField]) => {
      const isSelected = selected?.selectedDotid === id;
      
      return (
        <div
          key={id}
          className={`text-field ${isSelected ? 'selected' : ''}`}
          style={{
            left: textField.position.x,
            top: textField.position.y,
            transform: `rotate(${textField.rotationDegrees}deg)`,
            fontWeight: 'normal',
            fontStyle: 'normal',
            fontSize: '14px'
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (isSelected) {
              clearSelection();
            } else {
              selectDevice(ObjectType.TEXT_FIELD, id);
            }
          }}
        >
          {textField.text}
        </div>
      );
    });
  };
  
  // 渲染传感器区域
  const renderSensorZones = () => {
    const settings = mapSettings as MapSettings;
    if (!settings.sensorZones) return null;
    
    return Object.entries(settings.sensorZones).map(([id, zone]) => {
      if (!zone.position || !zone.size) return null;
      
      return (
        <div
          key={id}
          className="sensor-zone"
          style={{
            left: zone.position.x,
            top: zone.position.y,
            width: zone.size.width,
            height: zone.size.height
          }}
        />
      );
    });
  };
  
  // 渲染地图传感器
  const renderMapSensors = () => {
    return Object.entries(mapSensors).map(([id, sensor]) => {
      // 确保传感器有位置属性
      const sensorWithPosition = sensor as GUISensor;
      if (!sensorWithPosition.position) return null;
      
      const isSelected = selected?.selectedDeviceType === ObjectType.MAP_SENSOR && 
                         selected?.selectedDotid === id;
      
      return (
        <div
          key={id}
          className={`map-sensor ${isSelected ? 'selected' : ''}`}
          style={{
            left: sensorWithPosition.position.x - 10,
            top: sensorWithPosition.position.y - 10,
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: 'green'
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (isSelected) {
              clearSelection();
            } else {
              selectDevice(ObjectType.MAP_SENSOR, id);
            }
          }}
        />
      );
    });
  };
  
  // 渲染中继器
  const renderRepeaters = () => {
    return Object.entries(mapRepeaters).map(([id, repeater]) => {
      // 确保中继器有位置属性
      const repeaterWithPosition = repeater as GUIRepeater;
      if (!repeaterWithPosition.position) return null;
      
      const isSelected = selected?.selectedDeviceType === ObjectType.MAP_REPEATER && 
                         selected?.selectedDotid === id;
      
      return (
        <div
          key={id}
          className={`map-repeater ${isSelected ? 'selected' : ''}`}
          style={{
            left: repeaterWithPosition.position.x - 10,
            top: repeaterWithPosition.position.y - 10,
            width: 20,
            height: 20,
            backgroundColor: 'blue'
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (isSelected) {
              clearSelection();
            } else {
              selectDevice(ObjectType.MAP_REPEATER, id);
            }
          }}
        />
      );
    });
  };
  
  // 渲染无线电设备
  const renderRadios = () => {
    return Object.entries(radios).map(([id, radio]) => {
      // 确保无线电设备有位置属性
      const radioWithPosition = radio as { position?: GUIPoint };
      if (!radioWithPosition.position) return null;
      
      const isSelected = selected?.selectedDeviceType === ObjectType.RADIO && 
                         selected?.selectedDotid === id;
      
      return (
        <div
          key={id}
          className={`map-radio ${isSelected ? 'selected' : ''}`}
          style={{
            left: radioWithPosition.position.x - 12,
            top: radioWithPosition.position.y - 12,
            width: 24,
            height: 24,
            backgroundColor: 'purple',
            borderRadius: '3px'
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (isSelected) {
              clearSelection();
            } else {
              selectDevice(ObjectType.RADIO, id);
            }
          }}
        />
      );
    });
  };
  
  // 渲染RF连接
  const renderRFLinks = () => {
    const settings = mapSettings as MapSettings;
    if (!settings.showRFLinks) return null;
    
    // 这里可以实现RF连接的渲染逻辑
    return null;
  };
  
  // 渲染CC连接
  const renderCCLinks = () => {
    const settings = mapSettings as MapSettings;
    if (!settings.showCCLinks) return null;
    
    // 这里可以实现CC连接的渲染逻辑
    return null;
  };
  
  // 渲染机柜图标
  const renderCabinetIcon = () => {
    const settings = mapSettings as MapSettings;
    if (!settings.showCabinetIcon) return null;
    
    // 这里可以实现机柜图标的渲染逻辑
    return (
      <div
        className="cabinet-icon"
        style={{
          left: 50,
          top: 50,
          width: 30,
          height: 40,
          backgroundColor: 'gray'
        }}
      />
    );
  };
  
  // 渲染托盘设备
  const renderTrayDevices = () => {
    if (!trayDevices) return null;
    
    return Object.entries(trayDevices).map(([id, device]) => {
      const trayDevice = device as unknown as TrayDevice;
      if (!trayDevice.position) return null;
      
      const isSelected = selectedTrayDevice === id;
      
      // 根据设备类型设置不同的样式
      let style: React.CSSProperties = {
        position: 'absolute',
        left: trayDevice.position.x,
        top: trayDevice.position.y,
        cursor: 'pointer'
      };
      
      // 根据设备类型设置不同的类名和样式
      let className = `tray-device ${isSelected ? 'selected' : ''}`;
      let content = null;
      
      // 根据设备类型设置不同的样式
      const deviceType = trayDevice.deviceType || 'unknown';
      
      if (deviceType.includes('sensor')) {
        style = {
          ...style,
          width: 20,
          height: 20,
          borderRadius: '50%',
          backgroundColor: 'green'
        };
        className += ' tray-sensor';
      } else if (deviceType.includes('repeater')) {
        style = {
          ...style,
          width: 20,
          height: 20,
          backgroundColor: 'blue'
        };
        className += ' tray-repeater';
      } else {
        style = {
          ...style,
          width: 24,
          height: 24,
          backgroundColor: 'gray',
          borderRadius: '3px'
        };
        className += ' tray-other';
      }
      
      return (
        <div
          key={id}
          className={className}
          style={style}
          onMouseDown={(e) => handleTrayDeviceMouseDown(e, id)}
          onClick={(e) => {
            e.stopPropagation();
            if (isSelected) {
              setSelectedTrayDevice(null);
            } else {
              selectExtendedDevice(TRAY_DEVICE, id);
            }
          }}
        >
          {content}
        </div>
      );
    });
  };
  
  return (
    <div className="map-and-tray-container" style={{ width: dimensions.width, height: dimensions.height }}>
      {/* 地图容器 */}
      <div
        ref={mapRef}
        className={`map-container ${isDragging ? 'dragging' : ''}`}
        style={{ height: mapHeight }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
      >
        {/* 地图内容 */}
        <div
          className="map-content"
          style={{
            transform: `scale(${zoomLevel}) translate(${pan.x}px, ${pan.y}px)`,
            width: '100%',
            height: '100%'
          }}
        >
          {/* 渲染地图元素 */}
          {renderSensorZones()}
          {renderRFLinks()}
          {renderCCLinks()}
          {renderMapSensors()}
          {renderRepeaters()}
          {renderRadios()}
          {renderTextFields()}
          {renderCabinetIcon()}
        </div>
        
        {/* 缩放控制 */}
        <div className="zoom-controls">
          <div className="zoom-button" onClick={() => handleZoom('in')}>+</div>
          <div className="zoom-level">{Math.round(zoomLevel * 100)}%</div>
          <div className="zoom-button" onClick={() => handleZoom('out')}>-</div>
          <div className="zoom-button" onClick={handleResetView}>R</div>
        </div>
        
        {/* 图例 */}
        {(mapSettings as MapSettings).showLegend && (
          <div className="legend">
            <div className="legend-title">Legend</div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: 'green', borderRadius: '50%' }}></div>
              <div className="legend-text">Sensor</div>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: 'blue' }}></div>
              <div className="legend-text">Repeater</div>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: 'purple' }}></div>
              <div className="legend-text">Radio</div>
            </div>
          </div>
        )}
      </div>
      
      {/* 托盘容器 */}
      <div
        ref={trayRef}
        className="tray-container"
        style={{ height: trayHeight }}
        onMouseMove={handleTrayMouseMove}
        onMouseUp={handleTrayMouseUp}
        onMouseLeave={handleTrayMouseUp}
      >
        {/* 托盘内容 */}
        <div className="tray-content">
          {renderTrayDevices()}
        </div>
      </div>
    </div>
  );
};

export default MapAndTrayPanel; 