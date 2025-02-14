import { useState } from "react";
import Inventory from "./Inventory";
import Property from "./Property";

export default function RightPannel() {
  const [active, setActive] = useState("Property");
  return (
    <div className="right-pannel">
      <div className="right-pannel-top">
        <div className="right-pannel-top-wrp">
          <button
            onClick={() => {
              setActive("Property");
            }}
            className={(active === "Property" && "active") || ""}
          >
            Property
          </button>
          <button
            className={(active === "Inventory" && "active") || ""}
            onClick={() => {
              setActive("Inventory");
            }}
          >
            Inventory
          </button>
        </div>
      </div>{" "}
      {(active === "Inventory" && <Inventory />) || <Property />}
    </div>
  );
}
