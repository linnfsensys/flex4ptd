import { useContext } from "react";
import { FaLocationDot } from "react-icons/fa6";
import { HiOutlineLightBulb } from "react-icons/hi";
import ThemeContext from "../context/ThemeContext";

export default function Footer() {
  const { activeMarker } = useContext(ThemeContext);

  return (
    <footer className="footer">
      <div className="footer-left">
        <p>
          <HiOutlineLightBulb />{" "}
          {/* <span>
            !!WARN!! - Sensor 12FD has low rssi. Add a Repeater about 20 meters
            from SPP Radio “1234”
          </span>
          <a href="/">
            Learn more <FaAngleUp />
          </a> */}
        </p>
      </div>
      <div className="footer-right">
        <div className="icon">
          <FaLocationDot />
        </div>

        <p>{activeMarker?.longitude}</p>
        <p>{activeMarker?.latitude}</p>
      </div>
    </footer>
  );
}
