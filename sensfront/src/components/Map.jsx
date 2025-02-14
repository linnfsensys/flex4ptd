import "mapbox-gl/dist/mapbox-gl.css";
import { useContext, useEffect, useRef, useState } from "react";
import { MdDelete } from "react-icons/md";
import Map, { Layer, Marker, Source } from "react-map-gl";
import ThemeContext from "../context/ThemeContext";
import Range from "./Range";
import SensorZone from "./SensorZone";
import { PDFDocument } from 'pdf-lib';
import { saveAs } from "file-saver";

const MarkerMap = () => {
  const mapRef = useRef(null);
  const {
    setMapZoom,
    mapZoom,
    searchQuery,
    setSearchQuery,
    viewState,
    setViewState,
    draggedItem,
    markers,
    setMarkers,
    activeMarker,
    setActiveMarkar,
    lineCoordinates,
    setLineCoordinates,
    activeLine,
    setActiveLine,
  } = useContext(ThemeContext);

  const [mapStyle, setMapStyle] = useState(
    "mapbox://styles/mapbox/streets-v12"
  );
  const [isSensorActive, setIsSensorActive] = useState(false);

  const [selectedMarkers, setSelectedMarkers] = useState([]);
  const [shiftHeld, setShiftHeld] = useState(false);

  const [pdfUrl, setPdfUrl] = useState(null);

  function downHandler({ key }) {
    if (key === "Shift") {
      setShiftHeld(true);
    }
  }

  function upHandler({ key }) {
    if (key === "Shift") {
      setShiftHeld(false);
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", downHandler);
    window.addEventListener("keyup", upHandler);
    return () => {
      window.removeEventListener("keydown", downHandler);
      window.removeEventListener("keyup", upHandler);
    };
  }, []);

  const minZoom = 0;
  const maxZoom = 22;

  useEffect(() => {
    const hasActiveSensor = markers.some((marker) => marker.sensor);
    if (hasActiveSensor) {
      setIsSensorActive(true);
    }
  }, [markers]);

  const toggleMapStyle = () => {
    setMapStyle((prevStyle) =>
      prevStyle === "mapbox://styles/mapbox/streets-v12"
        ? "mapbox://styles/mapbox/satellite-v9"
        : "mapbox://styles/mapbox/streets-v12"
    );
  };

  const zoomPercentage = Math.round(
    ((viewState.zoom - minZoom) / (maxZoom - minZoom)) * 100
  );

  useEffect(() => {
    setMapZoom(zoomPercentage);
  }, [zoomPercentage, viewState.zoom]);

  const handleMarkerClick = (marker) => {
    if (shiftHeld) {
      setSelectedMarkers((prev) => {
        const isMarkerAlreadySelected = prev.some((m) => m.id === marker.id);
        const newSelected = isMarkerAlreadySelected ? prev : [...prev, marker];

        if (newSelected.length === 2) {
          const markerIds = [newSelected[0].id, newSelected[1].id];

          // Check if the line already exists
          const lineExists = lineCoordinates.some(
            (line) =>
              line.markers.includes(markerIds[0]) &&
              line.markers.includes(markerIds[1])
          );

          if (!lineExists) {
            const newCorden = {
              id: Date.now(),
              coordinates: [
                [newSelected[0].longitude, newSelected[0].latitude],
                [newSelected[1].longitude, newSelected[1].latitude],
              ],
              markers: markerIds,
            };

            // Add the new line
            setLineCoordinates((prevLines) => {
              const lineExist = prevLines.some(
                (line) =>
                  line.markers.includes(markerIds[0]) &&
                  line.markers.includes(markerIds[1])
              );
              if (!lineExist) {
                return [...prevLines, newCorden];
              } else {
                return [...prevLines];
              }
            });
          }

          return [];
        } else {
          return newSelected;
        }
      });
    } else {
      setActiveMarkar(marker);
    }
  };

  const handleDrop = (event) => {
    if (!draggedItem.active) {
      return;
    }
    event.preventDefault();

    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    const mapContainer = mapInstance.getContainer();
    const rect = mapContainer.getBoundingClientRect();

    const relativeX = event.clientX - rect.left;
    const relativeY = event.clientY - rect.top;

    const markerWidth = 30;
    const centeredX = relativeX + markerWidth / 2;
    const centeredY = relativeY + markerWidth;

    const coordinates = mapInstance.unproject([centeredX, centeredY]);
    const newMarker = {
      id: new Date().getTime(),
      longitude: coordinates.lng,
      latitude: coordinates.lat,
      img: draggedItem?.img,
      name: draggedItem?.name || "",
      title: draggedItem?.name,
      rotate: draggedItem?.sensor ? 0 : -20,
      skew: -10,
      sensor: draggedItem?.sensor || false,
      types: draggedItem?.types || [],
      orderCode:
        draggedItem?.orderCode || draggedItem?.types[0].orderCode || "",
      quantity: draggedItem?.sensor
        ? [
            {
              id: new Date().getTime(),
              longitude: coordinates.lng + 0.000009,
              latitude: coordinates.lat,
              img: draggedItem?.img,
              name: draggedItem?.name?.split(" ")[0] + " " + "Sensor",
              title: draggedItem?.name + "sensor" + " " + markers.length,
              type: draggedItem?.name + " " + "sensor",
              uniqueCode: new Date().getTime(),
            },
          ]
        : 0,
      type: draggedItem?.type || draggedItem?.name,
      uniqueCode: new Date().getTime(),
      length: 10,
    };

    setMarkers((prevMarkers) => [...prevMarkers, newMarker]);
    setActiveMarkar(newMarker);
  };

  const handleMarkerDrag = (event, id) => {
    const newLongitude = event.lngLat.lng;
    const newLatitude = event.lngLat.lat;

    setMarkers((prevMarkers) =>
      prevMarkers.map((marker) => {
        if (marker.id === id) {
          const longitudeDiff = newLongitude - marker.longitude;
          const latitudeDiff = newLatitude - marker.latitude;

          // Update marker position and adjust quantity if marker is of type "sensor"
          let updatedQuantity = marker.quantity;
          if (marker.sensor && Array.isArray(marker.quantity)) {
            updatedQuantity = marker.quantity.map((sensor) => ({
              ...sensor,
              longitude: sensor.longitude + longitudeDiff,
              latitude: sensor.latitude + latitudeDiff,
            }));
          }

          return {
            ...marker,
            longitude: newLongitude,
            latitude: newLatitude,
            quantity: updatedQuantity,
          };
        }

        return marker; // Return marker unchanged
      })
    );

    markers.map((marker, inx) => {
      if (marker.id === id && marker?.sensor) {
        const longitudeDiff = newLongitude - marker.longitude;
        const latitudeDiff = newLatitude - marker.latitude;
        marker?.quantity.map((sensor, idx) => {
          // Update lines connected to the dragged marker or sensor
          setLineCoordinates((prevLines) =>
            prevLines.map((line) => {
              if (line.markers.includes(sensor.id)) {
                const newCoords = line.coordinates.map((coord, index) => {
                  const markerId = line.markers[index];

                  // Ensure `markers` and `quantity` are valid
                  const newmarker =
                    markerId === sensor.id
                      ? {
                          longitude: sensor.longitude + longitudeDiff,
                          latitude: sensor.latitude + latitudeDiff,
                        } // Dragged sensor
                      : markerId === marker.id
                      ? markers?.find((m) => m.id === marker.id) // Dragged zone
                      : markers
                          ?.find((m) => {
                            if (Array.isArray(m?.quantity)) {
                              return m.quantity.find(
                                (sensor) => sensor.id === markerId
                              );
                            }
                            return false; // Skip invalid markers
                          })
                          ?.quantity?.find((sensor) => sensor.id === markerId); // Find sensor in quantity

                  // Return updated or unchanged coordinates
                  return [
                    newmarker?.longitude || coord[0],
                    newmarker?.latitude || coord[1],
                  ];
                });

                return { ...line, coordinates: newCoords };
              }
              return line; // Unchanged line
            })
          );
        });

        return;
      }
    });

    setLineCoordinates((prevLines) =>
      prevLines.map((line) => {
        if (line.markers.includes(id)) {
          const newCoords = line.coordinates.map((coord, index) => {
            const markerId = line.markers[index];

            const marker =
              markerId === id
                ? { longitude: newLongitude, latitude: newLatitude }
                : markers?.find((m) => m.id === markerId) ||
                  markers
                    ?.flatMap((m) => m.quantity || [])
                    .find((sensor) => sensor.id === markerId); // Check sensors too

            return [
              marker?.longitude || coord[0],
              marker?.latitude || coord[1],
            ];
          });

          return { ...line, coordinates: newCoords };
        }

        return line;
      })
    );

    // Update active marker
    setActiveMarkar((prevActiveMarker) => {
      if (prevActiveMarker?.id === id) {
        return {
          ...prevActiveMarker,
          longitude: newLongitude,
          latitude: newLatitude,
        };
      }
      return prevActiveMarker; // Keep previous active marker if it is not the one being dragged
    });
  };

  const removeMarker = (idToRemove) => {
    // Remove the marker first
    setMarkers((prevMarkers) =>
      prevMarkers.filter((marker) => marker.id !== idToRemove)
    );
    setActiveMarkar({});

    // Remove any lines that contain the removed marker's id
    setLineCoordinates((prevLines) =>
      prevLines.filter(
        (line) => !line.markers.includes(idToRemove) // Filter out lines containing the removed marker's id
      )
    );
  };

  // Handle PDF file upload
  const handlePdfUploadEvent = (event) => {
    const file = event.detail;
    if (file && file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPdfUrl(`${url}#toolbar=0&navpanes=0`);
    } else {
      alert('Please upload a PDF file');
    }
  };

  useEffect(() => {
    window.addEventListener('pdf-upload', handlePdfUploadEvent);
    return () => {
      window.removeEventListener('pdf-upload', handlePdfUploadEvent);
      // Clean up created URL
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, []);

  // Handle drag and drop on PDF
  const handlePdfDrop = (event) => {
    if (!draggedItem.active) {
      return;
    }
    event.preventDefault();

    // Get PDF container position info
    const pdfContainer = event.currentTarget;
    const rect = pdfContainer.getBoundingClientRect();

    // Calculate relative position
    const relativeX = event.clientX - rect.left;
    const relativeY = event.clientY - rect.top;

    // Calculate relative percentage position (to keep marker position relatively stable)
    const percentX = (relativeX / rect.width) * 100;
    const percentY = (relativeY / rect.height) * 100;

    const newMarker = {
      id: new Date().getTime(),
      pdfX: percentX,  // Store relative position on PDF
      pdfY: percentY,
      img: draggedItem?.img,
      name: draggedItem?.name || "",
      title: draggedItem?.name,
      rotate: draggedItem?.sensor ? 0 : -20,
      skew: -10,
      sensor: draggedItem?.sensor || false,
      types: draggedItem?.types || [],
      orderCode: draggedItem?.orderCode || draggedItem?.types[0]?.orderCode || "",
      type: draggedItem?.type || draggedItem?.name,
      uniqueCode: new Date().getTime(),
      onPdf: true  // Mark this as a marker on PDF
    };

    setMarkers(prevMarkers => [...prevMarkers, newMarker]);
  };

  // Render markers on PDF
  const renderPdfMarkers = () => {
    return markers.filter(marker => marker.onPdf).map(marker => (
      <div
        key={marker.id}
        style={{
          position: 'absolute',
          left: `${marker.pdfX}%`,
          top: `${marker.pdfY}%`,
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          cursor: 'pointer'
        }}
      >
        <button
          onClick={() => removeMarker(marker?.id)}
          title="delete"
          className="marker-delete"
          style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            display: 'flex'
          }}
        >
          <MdDelete />
        </button>
        <img
          src={marker.img}
          alt="Custom Marker"
          title={marker?.name}
          style={{
            width: [
              "Traffic Cabinet",
              "EX Card",
              "FlexConnect",
            ].includes(marker.name)
              ? '60px'
              : '30px',
            height: [
              "Traffic Cabinet",
              "EX Card",
              "FlexConnect",
            ].includes(marker.name)
              ? '60px'
              : '30px',
            transform: `rotate(${
              marker.name === "repeater" ? marker?.rotate : 0
            }deg)`,
            objectFit: "contain"
          }}
        />
      </div>
    ));
  };

  // Add function to export PDF
  const handleExportPdf = async () => {
    if (!pdfUrl) return;

    try {
      // Get original PDF
      const pdfResponse = await fetch(pdfUrl);
      const pdfBuffer = await pdfResponse.arrayBuffer();
      
      // Load PDF document
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      
      // Get page size
      const { width, height } = firstPage.getSize();

      // Get PDF markers
      const pdfMarkers = markers.filter(m => m.onPdf);

      // Add image for each marker
      for (const marker of pdfMarkers) {
        const imageResponse = await fetch(marker.img);
        const imageBuffer = await imageResponse.arrayBuffer();
        
        // Determine image size based on marker type
        const imageSize = [
          "Traffic Cabinet",
          "EX Card",
          "FlexConnect",
        ].includes(marker.name) ? 60 : 30;

        // Embed image into PDF
        const image = await pdfDoc.embedPng(imageBuffer);
        
        // Calculate actual position (convert percentage to actual coordinates)
        const x = (marker.pdfX / 100) * width - (imageSize / 2);
        const y = height - ((marker.pdfY / 100) * height) - (imageSize / 2);

        // Draw image in PDF
        firstPage.drawImage(image, {
          x,
          y,
          width: imageSize,
          height: imageSize,
        });
      }

      // Save modified PDF
      const modifiedPdfBytes = await pdfDoc.save();
      const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      saveAs(blob, 'map-with-markers.pdf');

    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF');
    }
  };

  return (
    <div className="map">
      {!pdfUrl ? (
        <>
          <button onClick={toggleMapStyle} className="layer-btn">
            <img
              src={
                (mapStyle === "mapbox://styles/mapbox/streets-v12" &&
                  "/images/Lear.png") ||
                "/images/layer2.png"
              }
              alt=""
            />
          </button>

          <div
            className="map-wrp"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            style={{ width: "100%", height: "100%" }}
          >
            <Map
              ref={mapRef}
              {...viewState}
              onMove={(evt) => setViewState(evt.viewState)}
              style={{ width: "100%", height: "100%" }}
              mapStyle={mapStyle}
              mapboxAccessToken={process.env.VITE_MAP_APIKEY}
            >
              {/* Render each line */}
              {lineCoordinates.map((line) => (
                <Source
                  key={`line-${line.id}`}
                  id={`line-source-${line.id}`}
                  type="geojson"
                  data={{
                    type: "Feature",
                    geometry: {
                      type: "LineString",
                      coordinates: line.coordinates,
                    },
                  }}
                >
                  <Layer
                    id={`line-layer-${line.id}`}
                    type="line"
                    paint={{
                      "line-color":
                        activeLine.id === line.id ? "#ff0000" : "#d28f3d",
                      "line-width": 1,
                    }}
                  />
                </Source>
              ))}

              {/* Render markers */}
              {markers.map((marker) => (
                <Marker
                  key={marker.id}
                  longitude={marker.longitude}
                  latitude={marker.latitude}
                  anchor="bottom"
                  draggable
                  onDrag={(event) => handleMarkerDrag(event, marker.id)}
                >
                  <button
                    onClick={() => removeMarker(marker?.id)}
                    title="delete"
                    className="marker-delete"
                    style={{
                      display: (mapZoom < 75 && "none") || "flex",
                    }}
                  >
                    <MdDelete />
                  </button>
                  {(marker?.sensor && (
                    <SensorZone
                      map={mapRef}
                      handleMarkerDrag={handleMarkerDrag}
                      handleMarkerClick={handleMarkerClick}
                      data={{ ...marker, zoom: viewState.zoom }}
                    />
                  )) ||
                    ((marker?.name === "SPP Radio" ||
                      marker?.name === "Repeater") && (
                      <Range
                        data={{ ...marker, zoom: viewState.zoom }}
                        handleMarkerClick={handleMarkerClick}
                      />
                    )) || (
                      <img
                        src={marker.img}
                        alt="Custom Marker"
                        title={marker?.name}
                        onClick={() => handleMarkerClick(marker)}
                        style={{
                          width: [
                            "Traffic Cabinet",
                            "EX Card",
                            "FlexConnect",
                          ].includes(marker.name)
                            ? "60px"
                            : "30px",
                          height: [
                            "Traffic Cabinet",
                            "EX Card",
                            "FlexConnect",
                          ].includes(marker.name)
                            ? "60px"
                            : "30px",
                          transform: `translate(0%, 50%) rotate(${
                            marker.name === "repeater" ? marker?.rotate : 0
                          }deg)`,
                          objectFit: "contain",
                          zIndex: 88,
                        }}
                      />
                    )}
                </Marker>
              ))}
            </Map>
          </div>
        </>
      ) : (
        <div 
          style={{ 
            width: "100%", 
            height: "100%", 
            position: "relative" 
          }}
          onDrop={handlePdfDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1000 }}>
            <button 
              onClick={handleExportPdf}
              style={{
                marginRight: '10px',
                padding: '8px 16px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Export PDF
            </button>
            <button 
              onClick={() => {
                setMarkers(prevMarkers => prevMarkers.filter(m => !m.onPdf));
                setPdfUrl(null);
              }}
              style={{
                padding: '8px 16px',
                background: '#d28f3d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Return to Map
            </button>
          </div>
          <iframe
            src={pdfUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              pointerEvents: 'none'  // Prevent iframe from capturing drag events
            }}
          />
          {renderPdfMarkers()}
        </div>
      )}
    </div>
  );
};

export default MarkerMap;
