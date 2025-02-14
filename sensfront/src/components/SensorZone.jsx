import { useContext, useEffect, useRef, useState } from "react";
import { Marker } from "react-map-gl";
import ThemeContext from "../context/ThemeContext";

export default function SensorZone({ data, handleMarkerClick, map }) {
  const {
    mapZoom,
    setMarkers,
    setActiveMarkar,
    setLineCoordinates,
    lineCoordinates,
    markers,
  } = useContext(ThemeContext);
  const zone = useRef(null);

  const [lngLat, setLngLat] = useState({});
  const [isActive, setIsActive] = useState(false);

  const handleMarkerDrag = (event, zoneID, sensorID) => {
    const { lng, lat } = event.lngLat;
    if (isActive) {
      setLngLat(event.lngLat);
    }
    // Update marker positions
    setMarkers((prevMarkers) =>
      prevMarkers.map((marker) => {
        if (marker.id === zoneID) {
          let updatedQuantity = marker.quantity;
          if (marker.sensor && Array.isArray(marker.quantity)) {
            updatedQuantity = marker.quantity.map((sensor) => {
              if (sensor.id === sensorID) {
                return {
                  ...sensor,
                  longitude: lng,
                  latitude: lat,
                };
              }
              return sensor; // Unchanged sensor
            });
          }

          return {
            ...marker,
            quantity: updatedQuantity,
          };
        }
        return marker; // Unchanged marker
      })
    );

    // Update active marker
    setActiveMarkar((prevActiveMarker) => {
      if (prevActiveMarker?.id === sensorID) {
        return {
          ...prevActiveMarker,
          longitude: lng,
          latitude: lat,
        };
      }
      return prevActiveMarker; // Keep previous active marker if it is not the one being dragged
    });

    // Update lines connected to the dragged marker or sensor
    setLineCoordinates((prevLines) =>
      prevLines.map((line) => {
        if (line.markers.includes(sensorID)) {
          const newCoords = line.coordinates.map((coord, index) => {
            const markerId = line.markers[index];

            // Ensure `markers` and `quantity` are valid
            const marker =
              markerId === sensorID
                ? { longitude: lng, latitude: lat } // Dragged sensor
                : markerId === zoneID
                ? markers?.find((m) => m.id === zoneID) // Dragged zone
                : markers
                    ?.find((m) => {
                      // Ensure `m.quantity` is an array before using `.find()`
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
              marker?.longitude || coord[0],
              marker?.latitude || coord[1],
            ];
          });

          return { ...line, coordinates: newCoords };
        }
        return line; // Unchanged line
      })
    );
  };

  const handlerDragEnd = (e, zoneID, sensorID) => {
    setMarkers((prevMarkers) =>
      prevMarkers.map((marker) => {
        if (marker.id === zoneID) {
          let updatedQuantity = marker.quantity;
          if (marker.sensor && Array.isArray(marker.quantity)) {
            updatedQuantity = marker.quantity.map((sensor) => {
              // Only update longitude if sensor.id matches the given id
              if (sensor.id === sensorID) {
                return {
                  ...sensor,
                  longitude: lngLat.lng,
                  latitude: lngLat.lat,
                };
              }

              // Return the sensor unchanged if the id does not match
              return sensor;
            });
          }

          return {
            ...marker,
            quantity: updatedQuantity,
          };
        }

        return marker; // Return marker unchanged
      })
    );

    // Update lines connected to the dragged marker or sensor
    setLineCoordinates((prevLines) =>
      prevLines.map((line) => {
        if (line.markers.includes(sensorID)) {
          const newCoords = line.coordinates.map((coord, index) => {
            const markerId = line.markers[index];

            // Ensure `markers` and `quantity` are valid
            const marker =
              markerId === sensorID
                ? { longitude: lngLat.lng, latitude: lngLat.lat } // Dragged sensor
                : markerId === zoneID
                ? markers?.find((m) => m.id === zoneID) // Dragged zone
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
              marker?.longitude || coord[0],
              marker?.latitude || coord[1],
            ];
          });

          return { ...line, coordinates: newCoords };
        }
        return line; // Unchanged line
      })
    );
  };

  const zoneWidth = (zoomLevel) =>
    Math.pow(2, zoomLevel) *
    0.000005 *
    (data?.quantity.length === 1
      ? 6
      : data?.length * data?.quantity.length || 10);

  const ZoneHeight = (zoomLevel) => Math.pow(2, zoomLevel) * 0.000005 * 6;

  useEffect(() => {
    const handleMouseUp = (e) => {
      setIsActive(e.target === zone.current);
    };

    document.addEventListener("mousemove", handleMouseUp);

    // Cleanup on component unmount
    return () => {
      document.removeEventListener("mousemove", handleMouseUp);
    };
  }, []);

  return (
    <>
      <div className="sensor-zone">
        <div
          ref={zone}
          id={`sensor-marker-${data.id}`}
          style={{
            width: zoneWidth(data?.zoom),
            height: ZoneHeight(data?.zoom),
            display: mapZoom < 75 ? "none" : "flex",
            transform: `rotate(${data?.rotate || 0}deg) translateY(50%)`,
            position: "relative",
            boxSizing: "border-box",
          }}
          className={`sensor-zone-item`}
          onMouseDown={() => setActiveMarkar(data)}
        ></div>
      </div>
      {data?.quantity.map((item, index) => (
        <Marker
          key={index}
          draggable
          longitude={item.longitude}
          latitude={item.latitude}
          style={{ zIndex: 99 }}
          onDrag={(event) => handleMarkerDrag(event, data?.id, item?.id)}
          onDragEnd={(event) => handlerDragEnd(event, data?.id, item.id)}
          onClick={() => {
            handleMarkerClick(item);
          }}
        >
          <img
            src={data.img}
            alt="Custom Marker"
            title={data?.name}
            style={{
              width: "30px",
              height: "30px",
              objectFit: "contain",
            }}
          />
        </Marker>
      ))}
    </>
  );
}
