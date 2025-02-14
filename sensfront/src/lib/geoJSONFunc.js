export const geoJSONFunc =(markers, lineCoordinates) => {


    const geoJSON = {
        type: "FeatureCollection",
        features: [
          ...markers.map((marker) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [marker.longitude, marker.latitude],
            },
            properties: {
              id: `feature-${marker.id}`,
              name: marker.name,
              orderCode: marker.orderCode || "",
              sensors: marker.quantity || 0,
            },
          })),
          ...lineCoordinates.map((line) => ({
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: line.coordinates,
            },
            properties: {
              id: `line-${line.id}`,
              startId: `feature-${line.markers[0]}`,
              endId: `feature-${line.markers[1]}`,
            },
          })),
        ],
      }

      return geoJSON
}