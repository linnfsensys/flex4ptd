import { useContext } from "react";
import { MdDelete } from "react-icons/md";
import ThemeContext from "../context/ThemeContext";
import CustomSelect from "./Select";

export default function Property() {
  const {
    markers,
    setMarkers,
    activeMarker,
    setActiveMarkar,
    lineCoordinates,
    setLineCoordinates,
    activeLine,
    setActiveLine,
  } = useContext(ThemeContext);

  const handleRotationChange = (e) => {
    const newRotation = e.target.value;

    const updatedMarkers = markers.map((marker) => {
      if (marker.id === activeMarker.id && !marker?.sensor) {
        return {
          ...marker,
          rotate: newRotation,
        };
      } else if (marker.id === activeMarker.id && marker.sensor) {
        // Center point for rotation
        const centerX = marker.longitude + 0.000018 * marker?.quantity.length;
        const centerY = marker.latitude;

        // Normalize rotation angles
        const normalizeAngle = (angle) => ((angle % 360) + 360) % 360;
        const oldRotation = normalizeAngle(marker.rotate);
        const newRotationNormalized = normalizeAngle(newRotation);

        // Calculate rotation difference
        let angleDiff = newRotationNormalized - oldRotation;

        // Adjust for shortest path
        if (angleDiff > 180) angleDiff -= 360;
        if (angleDiff < -180) angleDiff += 360;

        // Reverse the rotation (use negative angle difference)
        angleDiff = -angleDiff;

        // Pre-compute sine and cosine for reverse rotation
        const cosRotation = Math.cos((angleDiff * Math.PI) / 180);
        const sinRotation = Math.sin((angleDiff * Math.PI) / 180);

        // Helper function to rotate points
        const rotatePoint = (x, y) => ({
          longitude: centerX + (x * cosRotation - y * sinRotation),
          latitude: centerY + (x * sinRotation + y * cosRotation),
        });

        // Rotate all `quantity` points in reverse
        const updatedQuantity = marker.quantity.map((item) => {
          const x = item.longitude - centerX;
          const y = item.latitude - centerY;

          const rotatedPosition = rotatePoint(x, y);

          return {
            ...item,
            longitude:
              marker?.quantity.length > 1
                ? rotatedPosition.longitude
                : item.longitude,
            latitude:
              marker?.quantity.length > 1
                ? rotatedPosition.latitude
                : item.latitude,
          };
        });

        return {
          ...marker,
          rotate: newRotation, // Update marker rotation
          quantity: updatedQuantity, // Update rotated points in reverse
        };
      }
      return marker; // Return unchanged markers
    });

    setMarkers(updatedMarkers);
    setActiveMarkar((prev) => {
      return {
        ...prev,
        rotate: newRotation,
      };
    });
  };

  console.log(activeMarker);

  const handleSkewChange = (e) => {
    const newSkew = e.target.value;

    // Update the marker with the same id as activeMarker
    const updatedMarkers = markers.map((marker) => {
      if (marker.id === activeMarker.id) {
        return {
          ...marker,
          skew: newSkew, // Update the rotate property
        };
      }
      return marker; // Return unchanged marker
    });

    setMarkers(updatedMarkers); // Update the markers in context
    setActiveMarkar((prev) => {
      return {
        ...prev,
        skew: newSkew,
      };
    });
  };

  const handleLengthChange = (e) => {
    const newLenght = e.target.value;

    // Update the marker with the same id as activeMarker
    const updatedMarkers = markers.map((marker) => {
      if (marker.id === activeMarker.id) {
        return {
          ...marker,
          length: newLenght, // Update the rotate property
        };
      }
      return marker; // Return unchanged marker
    });

    setMarkers(updatedMarkers); // Update the markers in context
    setActiveMarkar((prev) => {
      return {
        ...prev,
        length: newLenght,
      };
    });
  };

  const handleQuantityChange = (e) => {
    setMarkers((prevMarkers) => {
      const quantityCount = Math.min(e, 4); // Limit quantity to a maximum of 4

      return prevMarkers.map((marker) => {
        // Check if the marker matches the given `activeMarker.id` and has a sensor
        if (marker?.id === activeMarker?.id && marker.sensor) {
          const existingQuantity = marker.quantity || [];

          // Preserve the first sensor if it exists
          const firstSensor = existingQuantity[0] || {
            id: `${marker.id}-sensor-1`,
            longitude: marker.longitude,
            latitude: marker.latitude,
            img: marker.img,
            name: `${marker.name} Sensor 1`,
            title: `${marker.name} Sensor 1`,
            type: marker.type,
            uniqueCode: `${marker.uniqueCode}-sensor-1`,
          };

          // Generate or update the remaining sensors
          const updatedQuantity = Array.from(
            { length: quantityCount },
            (_, index) => {
              if (index === 0) {
                return firstSensor; // Keep the first sensor unchanged
              }
              // Create or update other sensors
              return {
                id: `${marker.id}-sensor-${index + 1}`,
                longitude: marker.longitude + 0.00003 * (index + 1),
                latitude: marker.latitude,
                img: marker.img,
                name: `${marker.name} Sensor ${index + 1}`,
                title: `${marker.name} Sensor ${index + 1}`,
                type: marker?.name + " " + "sensor",
                uniqueCode: `${marker.uniqueCode}-sensor-${index + 1}`, // Unique code
              };
            }
          );

          // Update the `quantity` field for the matching marker
          return { ...marker, quantity: updatedQuantity };
        }

        return marker; // Return marker unchanged if it doesn't match
      });
    });
  };

  const handleTypeChange = (e) => {
    setMarkers((prevMarkers) =>
      prevMarkers.map((marker) =>
        marker.uniqueCode === activeMarker?.uniqueCode
          ? {
              ...marker,
              type: e,
              orderCode:
                activeMarker?.types?.find((item) => item?.name === e)
                  ?.orderCode || "",
            }
          : marker
      )
    );
  };

  const removeLine = (id) => {
    const updatedLineCoordinates = lineCoordinates.filter(
      (line) => line.id !== id
    );
    setLineCoordinates(updatedLineCoordinates);
  };

  console.log(activeMarker);

  return (
    <div className="property">
      <div className="property-body">
        <h4>{activeMarker?.title}</h4>
        {(activeMarker?.name === "Repeater" ||
          activeMarker?.name === "SPP Radio" ||
          activeMarker.sensor) && (
          <div className="property-body-item">
            <label htmlFor="">Rotation</label>
            {/* <input
            type="text"
            value={ln}
            onChange={(e) => setLn(e.target.value)}
          /> */}

            <input
              min={0}
              max={360}
              type="range"
              name="rotation"
              id=""
              value={activeMarker?.rotate}
              onChange={handleRotationChange}
            />
          </div>
        )}
        {(activeMarker?.name === "Repeater" ||
          activeMarker?.name === "SPP Radio") && (
          <div className="property-body-item">
            <label htmlFor="">Field of View</label>
            <input
              min={-40}
              max={40}
              type="range"
              name="skew"
              id=""
              value={activeMarker?.skew}
              onChange={handleSkewChange}
            />
          </div>
        )}
        {activeMarker?.sensor && (
          <div className="property-body-item">
            <label htmlFor="">Lenght</label>
            <input
              type="text"
              name="skew"
              id=""
              value={activeMarker?.length}
              onChange={handleLengthChange}
            />
          </div>
        )}

        {activeMarker?.sensor && (
          <div className="property-body-item">
            <p>Number</p>
            <CustomSelect
              options={[1, 2, 3, 4]}
              selectItem={activeMarker.quantity.length}
              onChange={handleQuantityChange}
            />
          </div>
        )}
        {activeMarker?.types?.length > 0 && (
          <div className="property-body-item">
            <p>Type</p>
            <CustomSelect
              options={activeMarker?.types.map((type) => type.name)}
              selectItem={
                activeMarker?.types?.find(
                  (item) => item?.orderCode === activeMarker.orderCode
                )?.name || ""
              }
              onChange={handleTypeChange}
            />
          </div>
        )}
      </div>
      {lineCoordinates.filter((line) => line.markers.includes(activeMarker?.id))
        .length > 0 && (
        <div className="lines-wrp">
          <h4>Lines</h4>
          <ul className="lines">
            {lineCoordinates
              .filter((line) => line.markers.includes(activeMarker?.id))
              .map((line, i) => (
                <li
                  onMouseOver={() => setActiveLine(line)}
                  onMouseOut={() => setActiveLine({})}
                  key={i}
                  className="line"
                >
                  <span>
                    {markers.find((marker) => marker.id === line.markers[0])
                      ?.name ||
                      markers.find(
                        (marker) =>
                          Array.isArray(marker?.quantity) &&
                          marker.quantity.find((q) => q === line.markers[0])
                      )?.name}
                    -
                    {markers.find((marker) => marker.id === line.markers[1])
                      ?.name ||
                      markers.find(
                        (marker) =>
                          Array.isArray(marker?.quantity) &&
                          marker.quantity.find((q) => q === line.markers[1])
                      )?.name}
                  </span>

                  <button onClick={() => removeLine(line.id)}>
                    <MdDelete />
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
