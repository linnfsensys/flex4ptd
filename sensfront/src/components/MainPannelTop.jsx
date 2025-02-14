import { saveAs } from "file-saver";
import JSZip from "jszip";
import { useContext } from "react";
import { FaRegFileLines } from "react-icons/fa6";
import { RiArrowGoBackLine, RiArrowGoForwardLine } from "react-icons/ri";
import ThemeContext from "../context/ThemeContext";
import { geoJSONFunc } from "../lib/geoJSONFunc";

export default function MainPannelTop() {
  const { markers, lineCoordinates } = useContext(ThemeContext);

  const handlePublish = async () => {
    try {
      const geoJSON = geoJSONFunc(markers, lineCoordinates);
      // Create a new zip instance
      const zip = new JSZip();

      // Add the GeoJSON file to the zip
      zip.file("data.geojson", JSON.stringify(geoJSON, null, 2));

      // Generate the zip file as a blob
      const blob = await zip.generateAsync({ type: "blob" });

      // Trigger download
      saveAs(blob, "geojson-data.zip");
    } catch (error) {
      console.error("Failed to create zip:", error);
    }
  };

  return (
    <div className="main-pannel-top">
      <div className="left">
        <label htmlFor="UPfil">
          <FaRegFileLines />
          <span>File</span>
          <ul className="file-dropdown">
            <li>
              <button>Upload a map</button>
            </li>
            <li>
              <button>Load a map</button>
            </li>
            <li>
              <button onClick={handlePublish}>Save this design</button>
            </li>
          </ul>
        </label>
        <input type="file" id="UPfile" />
      </div>
      <div className="right">
        <button className="publish" onClick={handlePublish}>
          Publish
        </button>
        <div className="separator"></div>
        <button>Verify Design</button>
        <div className="separator"></div>
        <div className="undoredo">
          <button>
            <RiArrowGoBackLine />
          </button>
          <button>
            <RiArrowGoForwardLine />
          </button>
        </div>
      </div>
    </div>
  );
}
