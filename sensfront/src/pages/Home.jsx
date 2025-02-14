import { useEffect, useState } from "react";
import Footer from "../components/Footer";
import GeoJSONCom from "../components/GeoJSONCom";
import MainPannel from "../components/MainPannel";
import RightPannel from "../components/RightPannel";
import Topbar from "../components/Topbar";
import ThemeContext from "../context/ThemeContext";

export default function Home() {
  const [mapZoom, setMapZoom] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [markers, setMarkers] = useState([]);
  const [activeMarker, setActiveMarkar] = useState({});
  const [lineCoordinates, setLineCoordinates] = useState([]); // Array to hold multiple lines
  const [activeLine, setActiveLine] = useState({});
  const [isGeo, setIsGeo] = useState(false);
  const [defaultSensorPosition, setDefaultSensorPosition] = useState([
    {
      left: 25,
    },
    {
      left: 90,
    },
    {
      left: 100,
    },
    {
      left: 100,
    },
  ]);

  const [viewState, setViewState] = useState({
    longitude: -74.006,
    latitude: 40.7128,
    zoom: 18,
  });
  const [theme, setTheme] = useState("light");
  const [draggedItem, setDraggedItem] = useState(null);

  const onDragStartItem = (item) => {
    setDraggedItem(item);
  };

  useEffect(() => {
    setTheme(localStorage.getItem("theme"));
  }, []);

  useEffect(() => {
    const getLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { longitude, latitude } = position.coords;
            setViewState({
              longitude,
              latitude,
              zoom: 18, // You can adjust the zoom level as needed
            });
          },
          (error) => {
            console.error("Error getting location:", error);
            // Optionally handle error (e.g., set to a default location)
          }
        );
      } else {
        console.log("Geolocation is not supported by this browser.");
        // Optionally handle lack of support (e.g., set to a default location)
      }
    };

    getLocation();
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        mapZoom,
        setMapZoom,
        searchQuery,
        setSearchQuery,
        viewState,
        setViewState,
        onDragStartItem,
        draggedItem,
        markers,
        setMarkers,
        activeMarker,
        setActiveMarkar,
        defaultSensorPosition,
        setDefaultSensorPosition,
        lineCoordinates,
        setLineCoordinates,
        activeLine,
        setActiveLine,
        setIsGeo,
        isGeo,
      }}
    >
      <div className={`main ${(theme === "light" && "light") || ""}`}>
        <Topbar theme={theme} setTheme={setTheme} />
        <div className="main-wrp">
          <MainPannel />
          {(!isGeo && <RightPannel />) || <GeoJSONCom />}
        </div>
        <Footer />
      </div>
    </ThemeContext.Provider>
  );
}
