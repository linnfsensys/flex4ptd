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
 * MapAndTrayPanel - the MapAndTrayPanel component implemented using Zustand
 * this is the Zustand version of the MapAndTrayPanel
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
  // use the Zustand hooks to get the state and operations
  const { mapSettings } = useMapSettings();
  const { mapSensors, mapRepeaters, radios, trayDevices = {}, sensorZones, ccCards, sensorDotidToSzId } = useMapDevices();
  const { selected, selectDevice, clearSelection } = useSelection();
  const { ap, updateAP, getZoomLevel, getPan, updateZoomLevel, updatePan } = useAP();
  
  // use the mapTrayStore to manage the map pan and zoom
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
  
  // modify: use the incoming mapCabinetTrayWidth as the initial width, no longer use the local state
  const dimensions = {
    width: mapCabinetTrayWidth,
    height: mapCabinetTrayHeight
  };
  
  // dragging state
  const [draggingTrayDevice, setDraggingTrayDevice] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<GUIPoint>({ x: 0, y: 0 });
  
  // the selected tray device state
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
  
  // references to the map and tray divs
  const mapRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  
  // the extended select device function
  const selectExtendedDevice = (deviceType: ExtendedObjectType, deviceId: string) => {
    if (deviceType === TRAY_DEVICE) {
      // for the tray device, we use the local state to track the selection
      setSelectedTrayDevice(deviceId);
      console.log('Selecting tray device:', deviceId);
      // in the actual application, this should call the appropriate method to select the tray device
    } else {
      // for other device types, use the original selectDevice function
      selectDevice(deviceType as ObjectType, deviceId);
    }
  };
  
  // synchronize the Zustand store and AP state
  useEffect(() => {
    // initialize the mapTrayStore from the AP state
    const initialZoomLevel = getZoomLevel();
    const initialPan = getPan();
    
    setZoomLevel(initialZoomLevel);
    setPan(initialPan);
  }, [getZoomLevel, getPan, setZoomLevel, setPan]);
  
  // when the mapTrayStore state changes, update the AP state
  useEffect(() => {
    // get the current AP's zoomLevel and pan
    const currentZoomLevel = getZoomLevel();
    const currentPan = getPan();

    // only update when the value really changes
    const zoomChanged = Math.abs(currentZoomLevel - zoomLevel) > 0.001;
    const panChanged =
      Math.abs(currentPan.x - pan.x) > 0.001 ||
      Math.abs(currentPan.y - pan.y) > 0.001;

    // use debounce to reduce the update frequency
    if (zoomChanged || panChanged) {
      const timeoutId = setTimeout(() => {
        if (zoomChanged) updateZoomLevel(zoomLevel);
        if (panChanged) updatePan(pan);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [zoomLevel, pan, getZoomLevel, getPan, updateZoomLevel, updatePan]);
  
  // get the mouse position relative to the map
  const getMousePosition = (e: React.MouseEvent): GUIPoint => {
    if (!mapRef.current) {
      return { x: 0, y: 0 };
    }
    
    const rect = mapRef.current.getBoundingClientRect();
    // use the same conversion logic as the original version
    return {
      x: (e.clientX - rect.left - (mapWidth/2)) / zoomLevel - pan.x,
      y: (e.clientY - rect.top - (mapHeight/2)) / zoomLevel - pan.y
    };
  };
  
  // get the mouse position relative to the tray
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
  
  // handle the map mouse down event
  const handleMouseDown = (e: React.MouseEvent) => {
    // only handle the left click
    if (e.button !== 0) return;
    
    // stop the event propagation and default behavior
    e.stopPropagation();
    e.preventDefault();
    
    // start dragging
    const mousePos = {
      x: e.clientX,
      y: e.clientY
    };
    
    startDragging(mousePos);
  };
  
  // handle the map mouse move event
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      // stop the event propagation and default behavior
      e.stopPropagation();
      e.preventDefault();
      
      const mousePos = {
        x: e.clientX,
        y: e.clientY
      };
      
      updateDragging(mousePos);
    }
  };
  
  // handle the map mouse up event
  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging) {
      // stop the event propagation and default behavior
      e.stopPropagation();
      e.preventDefault();
      
      stopDragging();
      
      // persist to the AP state
      updatePan(pan);
    }
  };
  
  // handle the map click event
  const handleClick = (e: React.MouseEvent) => {
    // if the dragging is finished, do not handle the click
    if (isDragging) return;
    
    // get the click position
    const mousePos = getMousePosition(e);
    console.log('Click at', mousePos);
    
    // clear the selection
    clearSelection();
    setSelectedTrayDevice(null);
  };
  
  // handle the tray device mouse down event
  const handleTrayDeviceMouseDown = (e: React.MouseEvent, deviceId: string) => {
    e.stopPropagation();
    
    // only handle the left click
    if (e.button !== 0) return;
    
    // select the device
    selectExtendedDevice(TRAY_DEVICE, deviceId);
    
    // start dragging
    setDraggingTrayDevice(deviceId);
    
    // calculate the drag offset
    const mousePos = getTrayMousePosition(e);
    const device = trayDevices[deviceId] as unknown as TrayDevice;
    if (device && device.position) {
      setDragOffset({
        x: device.position.x - mousePos.x,
        y: device.position.y - mousePos.y
      });
    }
  };
  
  // handle the tray device mouse move event
  const handleTrayMouseMove = (e: React.MouseEvent) => {
    if (draggingTrayDevice) {
      // update the tray device position
      const mousePos = getTrayMousePosition(e);
      const newPosition = {
        x: mousePos.x + dragOffset.x,
        y: mousePos.y + dragOffset.y
      };
      
      // here should update the tray device position
      console.log('Update tray device position', draggingTrayDevice, newPosition);
      
      // in the actual application, this should call updateTrayDevice or similar method
    }
  };
  
  // handle the tray device mouse up event
  const handleTrayMouseUp = () => {
    if (draggingTrayDevice) {
      setDraggingTrayDevice(null);
    }
  };
  
  // handle the zoom
  const handleZoom = (direction: 'in' | 'out') => {
    const zoomFactor = direction === 'in' ? 1.1 : 0.9;
    // the original version limits the zoom to 0.1 to 8.0
    const newZoomLevel = Math.max(0.1, Math.min(8.0, zoomLevel * zoomFactor));
    
    // update the state
    setZoomLevel(newZoomLevel);
    
    // persist to the AP state
    updateZoomLevel(newZoomLevel);
  };
  
  // handle the reset view
  const handleResetView = () => {
    resetView();
    updateZoomLevel(1.0);
    updatePan({ x: 0, y: 0 });
  };
  
  // render the sensor zones
  const renderSensorZones = () => {
    if (!sensorZones) return null;
    
    return Object.entries(sensorZones).map(([szId, szData]) => {
      const isSelected = selected?.selectedSzId === szId;
      const position = (szData as any).info?.position || (szData as any).position || { x: 0, y: 0 };
      
      // adjust the sensor zone's transform - add the map position offset
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
  
  // render the RF links
  const renderRFLinks = () => {
    if (!mapSettings?.showRFLinks) {
      return [];
    }
    
    const sensorRfLinks = Object.entries(mapSensors || {}).map(([dotId, sensorData]) => {
      const rfLink = (sensorData as any).info?.rfLink;
      
      if (dotId && rfLink) {
        // check if the link is selected
        const selected = false; // in the actual application, this should check the selection state
        
        // check the link location type
        if (rfLink.location === 'MAP_AUTO') {
          console.error('renderRFLinks(): unexpected MAP_AUTO rflink', rfLink, sensorData);
          return null;
        }
        
        const lines = rfLink.lines;
        if (!lines || lines.length === 0) return null;
        
        // render the visible polyline - from the original version
        let points = '';
        if (lines && lines.length > 0) {
          const firstLine = lines[0];
          points = `${firstLine.aPoint.x + mapXY.x} ${firstLine.aPoint.y + mapXY.y}`;
          
          for (const line of lines) {
            points += `, ${line.bPoint.x + mapXY.x} ${line.bPoint.y + mapXY.y}`;
          }
        }
        
        // render the draggable links
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
        
        // render the hover points
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
    
    // render the repeater's RF links
    const repeaterRfLinks = Object.entries(mapRepeaters || {}).map(([dotId, repeaterData]) => {
      const rfLink = (repeaterData as any).info?.rfLink;
      
      if (dotId && rfLink) {
        // check if the link is selected
        const selected = false; // in the actual application, this should check the selection state
        
        // check the link location type
        if (rfLink.location === 'MAP_AUTO') {
          console.error('renderRFLinks(): unexpected MAP_AUTO rflink', rfLink, repeaterData);
          return null;
        }
        
        const lines = rfLink.lines;
        if (!lines || lines.length === 0) return null;
        
        // render the visible polyline
        let points = '';
        if (lines && lines.length > 0) {
          const firstLine = lines[0];
          points = `${firstLine.aPoint.x + mapXY.x} ${firstLine.aPoint.y + mapXY.y}`;
          
          for (const line of lines) {
            points += `, ${line.bPoint.x + mapXY.x} ${line.bPoint.y + mapXY.y}`;
          }
        }
        
        // render the draggable links
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
        
        // render the hover points
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
    
    // merge the sensor and repeater's RF links
    return [...sensorRfLinks, ...repeaterRfLinks].filter(Boolean);
  };
  
  // render the CC links
  const renderCCLinks = () => {
    // simplified version of the CC links rendering
    return [];
  };
  
  // add the validation error check function
  const hasValidationErrors = (objectType: ObjectType, objectId: string): boolean => {
    if (!topStore) return false;
    
    // check the validation errors
    for (let validationKey of Object.keys(topStore.getTopState().validationErrors || {})) {
      let errorKey = TopStore.parseValidationErrorsKey(validationKey);
      if (errorKey.objectType === objectType && errorKey.objectId === objectId) {
        return true;
      }
    }
    
    // check the global validation errors
    for (let validationKey of Object.keys(topStore.getTopState().validationGlobalErrors || {})) {
      let errorKey = TopStore.parseValidationGlobalErrorsKey(validationKey);
      if (errorKey.objectType === objectType && errorKey.objectId === objectId) {
        return true;
      }
    }
    
    return false;
  };
  
  // render the radios
  const renderRadios = () => {
    if (!radios) return null;
    
    return Object.entries(radios).map(([radioId, radioData]) => {
      const isSelected = selected?.selectedDotid === radioId;
      const position = (radioData as any).info?.position || (radioData as any).position || { x: 0, y: 0 };
      const radioWidth = 56;
      const radioHeight = 56;
      
      // use the same transform calculation as the original version - including the center offset and map position
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
          {/* add the firmware progress display */}
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
            {/* use the same format as the original version: Radio-X */}
            Radio-{(radioData as any).apConnection?.replace('SPP', '') || radioId.slice(-1)}
          </text>
          {/* add the unheard warning mark */}
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
          {/* add the deficient mark - if there are validation errors */}
          {hasValidationErrors(ObjectType.RADIO, radioId) && (
            <text x={radioWidth-6} y={30} className="deficient">*</text>
          )}
        </g>
      );
    });
  };
  
  // render the repeaters
  const renderRepeaters = () => {
    if (!mapRepeaters) return null;
    
    return Object.entries(mapRepeaters).map(([repeaterId, repeaterData]) => {
      const isSelected = selected?.selectedDotid === repeaterId;
      const position = (repeaterData as any).info?.position || (repeaterData as any).position || { x: 0, y: 0 };
      const repeaterWidth = 40;
      const repeaterHeight = 40;
      
      // use the same transform calculation as the original version
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
          {/* add the unheard warning mark */}
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
          {/* add the deficient mark - if there are validation errors */}
          {hasValidationErrors(ObjectType.MAP_REPEATER, repeaterId) && (
            <text x={repeaterWidth-6} y={30} className="deficient">*</text>
          )}
        </g>
      );
    });
  };
  
  // render the tray devices
  const renderTrayDevices = () => {
    if (!trayDevices) return null;
    
    // add the function to get the RSSI icon
    const getRssiIcon = (deviceData: any): string => {
      // if the device is unseen or unheard
      if (deviceData.unheard || !deviceData.seen) {
        return RssiEmpty;
      }
      
      // check if there is rssi data
      if (deviceData.rssi !== undefined && ap) {
        // get the thresholds
        let rssiHigh = (ap as any).rssiHigh || -66;
        let rssiMed = (ap as any).rssiMed || -80;
        let rssiLow = (ap as any).rssiLow || -86;
        
        // return the corresponding icon based on the signal strength
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
      
      // default return the empty icon
      return RssiEmpty;
    };
    
    return Object.entries(trayDevices).map(([deviceId, deviceData], index) => {
      const isSelected = selectedTrayDevice === deviceId;
      // use the device's own position information, if any
      const devicePosition = (deviceData as any).info?.position || (deviceData as any).position;
      // if the device has no position information, use the calculated position
      const xPosition = devicePosition ? devicePosition.x : 25 + (index * 43);
      const yPosition = devicePosition ? devicePosition.y : 9;
      
      // in the tray, we do not need the extra map offset, but we need to center the device correctly
      
      // check the device type, determine if it is a sensor or a repeater
      const isSensor = (deviceData as any).otype === 'GUISensor';
      
      if (isSensor) {
        // the sensor is in the tray
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
              {/* use the getRssiIcon function to dynamically select the RSSI icon */}
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
        // the repeater is in the tray
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
  
  // render the AP
  const renderAP = () => {
    if (!ap) return null;
    
    const isSelected = selected?.selectedDotid === 'AP';
    const position = (ap as any).info?.position || (ap as any).position || { x: 0, y: 0 };
    const apWidth = 56;
    const apHeight = 56;
    
    // use the same transform calculation as the original version
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
  
  // render the cabinet cards
  const renderCabinetCards = () => {
    // get the detected channel IDs
    const getDetectedChannelIds = (): Set<string> => {
      const detectedSensors = new Set<string>();
      
      // collect all the detected sensors
      Object.entries(mapSensors || {}).forEach(([sensorId, sensor]) => {
        if (sensor.detect) {
          detectedSensors.add(sensorId);
        }
      });
      
      // get the detected channel IDs
      const detectedChannelIds = new Set<string>();
      
      Object.entries(ccCards || {}).forEach(([cardId, card]) => {
        const channels = (card as any).channelsById || {};
        
        Object.entries(channels).forEach(([channelId, channel]) => {
          const sensors = (channel as any).sensors || [];
          
          // if any sensor connected to the channel is detected, mark the channel
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
    
    // calculate the card positions
    let currentY = 5; // start position, consistent with the original version
    const spacing = 5; // card spacing
    
    return Object.entries(ccCards || {}).map(([cardId, cardData]) => {
      // calculate the card height (base height + channel count * each channel height)
      const channelsCount = Object.keys((cardData as any).channelsById || {}).length;
      const cardHeight = 63; // use the fixed height, consistent with the original version
      
      // save the current card's Y position
      const yPos = currentY;
      
      // update the next card's position
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
            // handle the mouse enter event
            console.log('Mouse enter card', cardId);
          }}
          onMouseLeave={(e) => {
            // handle the mouse leave event
            console.log('Mouse leave card', cardId);
          }}
        />
      );
    });
  };
  
  // update the cabinet card positions
  const updateCabinetCardPositions = () => {
    // calculate the vertical position of each card
    let currentY = 10; // start position
    const spacing = 5; // card spacing
    const updatedCCCards = { ...ccCards };
    
    Object.entries(updatedCCCards).forEach(([cardId, cardData]) => {
      // update the card's position
      (updatedCCCards[cardId] as any).yPos = currentY;
      
      // calculate the card height (base height + channel count * each channel height)
      const channelsCount = Object.keys((cardData as any).channelsById || {}).length;
      const cardHeight = 20 + (channelsCount * 15); // base height + channel height
      
      // update the next card's position
      currentY += cardHeight + spacing;
    });
    
    // we do not directly update the state, but record the position information
    // use these calculated positions when rendering
  };
  
  // calculate the positions when the component is mounted
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
          // handle the scroll event
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