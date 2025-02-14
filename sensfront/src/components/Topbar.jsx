import { useContext, useEffect, useState } from "react";
import { CiLight } from "react-icons/ci";
import { FiSearch } from "react-icons/fi";
import { GrUploadOption } from "react-icons/gr";
import { MdNightlight } from "react-icons/md";
import { TbSettings2 } from "react-icons/tb";
import { TiLocationOutline } from "react-icons/ti";
import { Link } from "react-router-dom";
import ThemeContext from "../context/ThemeContext";

export default function Topbar({ theme, setTheme }) {
  const {
    mapZoom,
    setSearchQuery,
    searchQuery,
    setViewState,
    setIsGeo,
    isGeo,
  } = useContext(ThemeContext);
  const [user, setUser] = useState({});

  useEffect(() => {
    setUser(JSON.parse(localStorage.getItem("user")));
  }, []);
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // Redirect to the login page after logout
    window.location.href = "/login"; // This will reload the app and redirect
  };

  // Function to handle the search
  const handleSearch = async (e) => {
    e.preventDefault();

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        searchQuery
      )}.json?access_token=${process.env.VITE_MAP_APIKEY}`
    );

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const { center } = data.features[0];
      setViewState({
        longitude: center[0],
        latitude: center[1],
        zoom: 16,
      });
    } else {
      alert("Location not found");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      window.dispatchEvent(new CustomEvent('pdf-upload', { detail: file }));
    } else {
      alert('请上传PDF文件');
    }
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        <Link to="/" className="brand">
          <img src="/images/Logo.png" alt="" />
        </Link>
        <form onSubmit={handleSearch} className="search-bar">
          <div className="icon">
            <TiLocationOutline />
          </div>
          <div className="search-bar-input">
            <input
              onChange={(e) => setSearchQuery(e.target.value)}
              type="text"
              placeholder="Enter address or coordinates"
            />
          </div>
          <button>
            <FiSearch />
          </button>
        </form>
        <div className="file-upload">
          <label htmlFor="fileUpload">
            <GrUploadOption /> <span>Upload a Map</span>
            <input 
              type="file" 
              name="fileUpload" 
              id="fileUpload" 
              accept=".pdf"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>
      <div className="topbar-right">
        <button
          onClick={() => {
            if (theme === "dark") {
              setTheme("light");
              localStorage.setItem("theme", "light");
            } else {
              setTheme("dark");
              localStorage.setItem("theme", "dark");
            }
          }}
        >
          {(theme === "dark" && <CiLight />) || <MdNightlight />}
        </button>{" "}
        <button onClick={() => setIsGeo(!isGeo)}>
          <TbSettings2 />
        </button>
        <div className="profile">
          <img src={user?.image || "/images/profile.png"} alt="profile" />
          <span>{user?.name}</span>
          <div className="profile-dropdown">
            <Link to="/">Profile</Link>
            <Link to="/">Setting</Link>
            <button onClick={handleLogout} className="logout">
              logout
            </button>
          </div>
        </div>
        <div className="zoom">
          {/* <div className="icon">
            <LuPlusCircle />
          </div> */}
          <span>{mapZoom}%</span>
        </div>
      </div>
    </div>
  );
}
