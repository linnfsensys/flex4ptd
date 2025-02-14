import { useContext } from "react";
import { MdClose } from "react-icons/md";
import { PiWarningCircleThin } from "react-icons/pi";
import ThemeContext from "../context/ThemeContext";
import CustomSelect from "./Select";

export default function Sensor({ isSensor, setIsSensor }) {
  const { markers, setMarkers, activeMarker } = useContext(ThemeContext);

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
            sensor: true,
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
                sensor: true,
                type: marker.type,
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
          ? { ...marker, type: e }
          : marker
      )
    );
  };

  return (
    <div className="sensor">
      <div className="sensor-top">
        <p>
          Sensor
          <span title="info">
            <PiWarningCircleThin />
          </span>
        </p>
        <button
          onClick={() => {
            setIsSensor(false);
          }}
          className="close"
        >
          <MdClose />
        </button>
      </div>
      <div className="sensor-body">
        <div className="arrow"></div>
        <div className="sensor-body-item">
          <p>Number</p>
          <CustomSelect
            options={[1, 2, 3, 4]}
            onChange={handleQuantityChange}
          />
        </div>
        <div className="sensor-body-item">
          <p>Type</p>
          <CustomSelect
            options={
              (activeMarker?.name === "FlexRadar Zone" && [
                "MAG1",
                "MAG2",
                "MAG3",
              ]) ||
              (activeMarker?.name === "camera zone" && ["None", "Camera"]) || [
                "None",
                "URader",
              ]
            }
            onChange={handleTypeChange}
          />
        </div>
      </div>
    </div>
  );
}
