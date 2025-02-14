import { useContext, useEffect, useState } from "react";
import ThemeContext from "../context/ThemeContext";

export default function Inventory() {
  const { markers } = useContext(ThemeContext);
  const [inventoryData, setInventoryData] = useState([]);

  useEffect(() => {
    const result = [];

    markers?.forEach((item) => {
      // Check if the current item's type exists in the result
      const existingItem = result.find((elm) => elm.type === item?.type);

      if (existingItem) {
        existingItem.number += 1; // Increment count for the main item
      } else {
        // Add the main item to the result
        result.push({
          name: item?.name || "Unnamed",
          type: item?.type || "Unknown",
          id: item?.id || "-",
          number: 1,
          orderCode: item?.orderCode,
        });
      }

      // Process sensors if they exist
      if (item?.sensor && Array.isArray(item.quantity)) {
        item.quantity.forEach((sensor) => {
          const existingSensor = result.find(
            (elm) => elm.type === sensor?.type
          );

          if (existingSensor) {
            existingSensor.number += 1;
          } else {
            result.push({
              name: sensor?.name || "Unnamed Sensor",
              type: sensor?.type || "Sensor",
              id: sensor?.id || "-",
              number: 1,
              orderCode: item.orderCode,
            });
          }
        });
      }
    });

    setInventoryData(result); // Update state with the final grouped data
  }, [markers]);

  return (
    <div className="inventory">
      <h4>Inventory</h4>
      <div className="inventory-table">
        <div className="inventory-table-head">
          <span>Name</span>
          <p>Quantity</p>
          <p>Order Code</p>
        </div>
        {inventoryData?.map((item, i) => (
          <div key={i} className="inventory-table-item">
            <span>{item.name}</span>
            <p>{item.number}</p>
            <p>{item.orderCode}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
