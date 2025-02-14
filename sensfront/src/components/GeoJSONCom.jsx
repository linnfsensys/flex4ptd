import { useContext } from "react";
import ThemeContext from "../context/ThemeContext";
import { geoJSONFunc } from "../lib/geoJSONFunc";

export default function GeoJSONCom() {
  const { markers, lineCoordinates } = useContext(ThemeContext);

  return (
    <div className="geo-json">
      <h2>GeoJSON</h2>
      {markers.length > 0 && (
        <div className="geo-json-body">
          <pre>
            {JSON.stringify(geoJSONFunc(markers, lineCoordinates), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
