import { useContext } from "react";
import ThemeContext from "../context/ThemeContext";

export default function MainPannelRight() {
  const { onDragStartItem } = useContext(ThemeContext);
  const items = [];
  return (
    <div className="main-pannel-right">
      <div className="main-pannel-right-item">
        <div className="left">
          <div className="left-item">
            <span>Ch 1</span>
          </div>{" "}
          <div className="left-item">
            <span>Ch 2</span>
          </div>{" "}
          <div className="left-item">
            <span>Ch 3</span>
          </div>{" "}
          <div className="left-item">
            <span>Ch 4</span>
          </div>
        </div>
        <div className="right">
          <p>EX CARD</p>
        </div>
      </div>
      <div className="main-pannel-right-item">
        <div className="left">
          <div className="left-item">
            <span>Ch 1</span>
          </div>{" "}
          <div className="left-item">
            <span>Ch 2</span>
          </div>{" "}
          <div className="left-item">
            <span>Ch 3</span>
          </div>{" "}
          <div className="left-item">
            <span>Ch 4</span>
          </div>
        </div>
        <div className="right">
          <p>FlexConnect</p>
        </div>
      </div>
    </div>
  );
}
