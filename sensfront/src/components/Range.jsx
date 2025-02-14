export default function Range({ data, handleMarkerClick }) {
  const getCircleRadius = (zoomLevel) => Math.pow(2, zoomLevel) * 0.002;
  return (
    <div className="range">
      <div
        className="range-wrp"
        style={{
          width: getCircleRadius(data?.zoom),
          height: getCircleRadius(data?.zoom),
        }}
      >
        <div
          className="range-item"
          draggable={false}
          style={{
            transform: `rotate(${data?.rotate || 0}deg) skew(${
              -data?.skew || 0
            }deg, ${-data?.skew || 0}deg)`,
            zIndex: -22,
          }}
        ></div>
        <div
          onClick={(e) => handleMarkerClick(data)}
          className="range-item-mid"
        >
          <img src={data?.img} alt="" />
        </div>
      </div>
      <div
        className="range-wrp"
        style={{
          width: getCircleRadius(data?.zoom + 2),
          height: getCircleRadius(data?.zoom + 2),
        }}
      >
        <div
          className="range-item"
          draggable={false}
          style={{
            transform: `rotate(${data?.rotate || 0}deg) skew(${
              -data?.skew || 0
            }deg, ${-data?.skew || 0}deg)`,
            zIndex: -22,
          }}
        ></div>
        <div
          onClick={(e) => handleMarkerClick(data)}
          className="range-item-mid"
        >
          <img src={data?.img} alt="" />
        </div>
      </div>
    </div>
  );
}
