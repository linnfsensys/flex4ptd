"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import React, { useCallback, useEffect, useRef, useState } from "react";

mapboxgl.accessToken =
  "pk.eyJ1Ijoic2phc2JpciIsImEiOiJjbTF0dWFtbDgwNm5tMmpwbW5weHR3MWxpIn0.8I3SkjcehMgri8Bj2Ke1ZA";

const FT_TO_DEG = 0.00000274;

const RECTANGLE_WIDTH = 20 * FT_TO_DEG;
const RECTANGLE_HEIGHT = 6 * FT_TO_DEG;
const MAG3_DIAMETER = 6 * FT_TO_DEG;

const INITIAL_LNG = -74.006;
const INITIAL_LAT = 40.7128;
const INITIAL_ZOOM = 20;
const INITIAL_ROTATION = 0;

const STREET_STYLE = "mapbox://styles/mapbox/streets-v11";
const SATELLITE_STYLE = "mapbox://styles/mapbox/satellite-v9";

export default function MapboxRotatingSensorZone() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [lng, setLng] = useState(INITIAL_LNG);
  const [lat, setLat] = useState(INITIAL_LAT);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [rotation, setRotation] = useState(INITIAL_ROTATION);
  const [geoJsonData, setGeoJsonData] = useState<string>("");
  const isDragging = useRef(false);
  const dragStartCoords = useRef<[number, number] | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mag3Positions, setMag3Positions] = useState([
    { x: 0.25, y: 0.5 },
    { x: 0.5, y: 0.5 },
    { x: 0.75, y: 0.5 },
  ]);
  const activeMag3 = useRef<number | null>(null);
  const [isSatelliteView, setIsSatelliteView] = useState(false);

  const updateMapFeatures = useCallback(() => {
    if (!map.current || !mapLoaded) return;

    const centerX = lng;
    const centerY = lat;
    const cosRotation = Math.cos((rotation * Math.PI) / 180);
    const sinRotation = Math.sin((rotation * Math.PI) / 180);

    const rotatePoint = (x: number, y: number) => ({
      lng: centerX + (x * cosRotation - y * sinRotation),
      lat: centerY + (x * sinRotation + y * cosRotation),
    });

    const rectangleCoordinates = [
      rotatePoint(-RECTANGLE_WIDTH / 2, -RECTANGLE_HEIGHT / 2),
      rotatePoint(RECTANGLE_WIDTH / 2, -RECTANGLE_HEIGHT / 2),
      rotatePoint(RECTANGLE_WIDTH / 2, RECTANGLE_HEIGHT / 2),
      rotatePoint(-RECTANGLE_WIDTH / 2, RECTANGLE_HEIGHT / 2),
      rotatePoint(-RECTANGLE_WIDTH / 2, -RECTANGLE_HEIGHT / 2),
    ];

    const circleCoordinates = mag3Positions.map((pos) => {
      const x = (pos.x - 0.5) * RECTANGLE_WIDTH;
      const y = (pos.y - 0.5) * RECTANGLE_HEIGHT;
      return rotatePoint(x, y);
    });

    const sensorzoneSource = map.current.getSource(
      "sensorzone"
    ) as mapboxgl.GeoJSONSource;
    if (sensorzoneSource) {
      sensorzoneSource.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            rectangleCoordinates.map((coord) => [coord.lng, coord.lat]),
          ],
        },
      });
    }

    const mag3Source = map.current.getSource("mag3") as mapboxgl.GeoJSONSource;
    if (mag3Source) {
      mag3Source.setData({
        type: "FeatureCollection",
        features: circleCoordinates.map((coord, index) => ({
          type: "Feature",
          properties: {
            id: index + 1,
          },
          geometry: {
            type: "Point",
            coordinates: [coord.lng, coord.lat],
          },
        })),
      });
    }

    setGeoJsonData(
      JSON.stringify(
        {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Polygon",
                coordinates: [
                  rectangleCoordinates.map((coord) => [coord.lng, coord.lat]),
                ],
              },
            },
            ...circleCoordinates.map((coord, index) => ({
              type: "Feature",
              properties: { id: index + 1 },
              geometry: {
                type: "Point",
                coordinates: [coord.lng, coord.lat],
              },
            })),
          ],
        },
        null,
        2
      )
    );
  }, [lng, lat, rotation, mapLoaded, mag3Positions]);

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: STREET_STYLE,
      center: [lng, lat],
      zoom: zoom,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.AttributionControl(), "bottom-right");
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      if (!map.current) return;

      map.current.addSource("sensorzone", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [[]],
          },
        },
      });
      map.current.addLayer({
        id: "sensorzone",
        type: "fill",
        source: "sensorzone",
        layout: {},
        paint: {
          "fill-color": "#088",
          "fill-opacity": 0.3,
        },
      });

      map.current.addSource("mag3", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });
      map.current.addLayer({
        id: "mag3",
        type: "circle",
        source: "mag3",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            ["/", MAG3_DIAMETER, FT_TO_DEG],
            22,
            ["*", ["/", MAG3_DIAMETER, FT_TO_DEG], 2],
          ],
          "circle-color": "#B42222",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      setMapLoaded(true);
      updateMapFeatures();
    });

    map.current.on("move", () => {
      if (!map.current || isDragging.current) return;
      const center = map.current.getCenter();
      setLng(parseFloat(center.lng.toFixed(6)));
      setLat(parseFloat(center.lat.toFixed(6)));
      setZoom(parseFloat(map.current.getZoom().toFixed(2)));
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (mapLoaded) {
      updateMapFeatures();
    }
  }, [updateMapFeatures, mapLoaded]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const onMouseDown = (e: mapboxgl.MapMouseEvent) => {
      if (e.originalEvent.button !== 0) return;
      const features = map.current!.queryRenderedFeatures(e.point, {
        layers: ["mag3"],
      });
      if (features.length > 0) {
        activeMag3.current = (features[0].properties?.id as number) - 1;
        map.current!.getCanvas().style.cursor = "grabbing";
      } else {
        isDragging.current = true;
        dragStartCoords.current = [e.lngLat.lng, e.lngLat.lat];
        map.current!.getCanvas().style.cursor = "grabbing";
      }
      e.preventDefault();
    };

    const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
      if (activeMag3.current !== null) {
        const rect = mapContainer.current!.getBoundingClientRect();
        const x = (e.point.x - rect.left) / rect.width;
        const y = (e.point.y - rect.top) / rect.height;
        setMag3Positions((prev) => {
          const newPositions = [...prev];
          newPositions[activeMag3.current!] = {
            x: Math.max(0, Math.min(1, x)),
            y: Math.max(0, Math.min(1, y)),
          };
          return newPositions;
        });
      } else if (isDragging.current && dragStartCoords.current) {
        const [startLng, startLat] = dragStartCoords.current;
        const [currentLng, currentLat] = [e.lngLat.lng, e.lngLat.lat];
        const deltaLng = currentLng - startLng;
        const deltaLat = currentLat - startLat;
        setLng((prevLng) => prevLng + deltaLng);
        setLat((prevLat) => prevLat + deltaLat);
        dragStartCoords.current = [currentLng, currentLat];
      }
    };

    const onMouseUp = () => {
      isDragging.current = false;
      activeMag3.current = null;
      dragStartCoords.current = null;
      if (map.current) {
        map.current.getCanvas().style.cursor = "";
      }
    };

    map.current.on("mousedown", onMouseDown);
    map.current.on("mousemove", onMouseMove);
    map.current.on("mouseup", onMouseUp);
    map.current.on("mouseenter", "sensorzone", () => {
      if (map.current) map.current.getCanvas().style.cursor = "move";
    });
    map.current.on("mouseleave", "sensorzone", () => {
      if (map.current && !isDragging.current && activeMag3.current === null) {
        map.current.getCanvas().style.cursor = "";
      }
    });
    map.current.on("mouseenter", "mag3", () => {
      if (map.current) map.current.getCanvas().style.cursor = "move";
    });
    map.current.on("mouseleave", "mag3", () => {
      if (map.current && !isDragging.current && activeMag3.current === null) {
        map.current.getCanvas().style.cursor = "";
      }
    });

    return () => {
      if (map.current) {
        map.current.off("mousedown", onMouseDown);
        map.current.off("mousemove", onMouseMove);
        map.current.off("mouseup", onMouseUp);
        map.current.off("mouseenter", "sensorzone");
        map.current.off("mouseleave", "sensorzone");
        map.current.off("mouseenter", "mag3");
        map.current.off("mouseleave", "mag3");
      }
    };
  }, [mapLoaded]);

  const handleRotationChange = (newRotation: number[]) => {
    setRotation(newRotation[0]);
  };

  const handleReset = () => {
    setLng(INITIAL_LNG);
    setLat(INITIAL_LAT);
    setZoom(INITIAL_ZOOM);
    setRotation(INITIAL_ROTATION);
    setMag3Positions([
      { x: 0.25, y: 0.5 },
      { x: 0.5, y: 0.5 },
      { x: 0.75, y: 0.5 },
    ]);
    if (map.current) {
      map.current.flyTo({
        center: [INITIAL_LNG, INITIAL_LAT],
        zoom: INITIAL_ZOOM,
      });
    }
  };

  const toggleMapStyle = () => {
    if (map.current) {
      const newStyle = isSatelliteView ? STREET_STYLE : SATELLITE_STYLE;
      map.current.setStyle(newStyle);
      setIsSatelliteView(!isSatelliteView);

      // Re-add custom layers after style change
      map.current.once("style.load", () => {
        map.current!.addSource("sensorzone", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [[]],
            },
          },
        });
        map.current!.addLayer({
          id: "sensorzone",
          type: "fill",
          source: "sensorzone",
          layout: {},
          paint: {
            "fill-color": "#088",
            "fill-opacity": 0.3,
          },
        });

        map.current!.addSource("mag3", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });
        map.current!.addLayer({
          id: "mag3",
          type: "circle",
          source: "mag3",
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10,
              ["/", MAG3_DIAMETER, FT_TO_DEG],
              22,
              ["*", ["/", MAG3_DIAMETER, FT_TO_DEG], 2],
            ],
            "circle-color": "#B42222",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });

        updateMapFeatures();
      });
    }
  };

  return (
    <div className="w-full h-screen flex">
      <div className="flex-grow relative">
        <div ref={mapContainer} className="w-full h-full" />
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-80 p-4 rounded-lg shadow-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Longitude: {lng}</span>
            <span>Latitude: {lat}</span>
            <span>Zoom: {zoom}</span>
          </div>
        </div>
      </div>
      <div className="w-80 p-4 bg-gray-100 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Controls</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="satellite-view"
              checked={isSatelliteView}
              onCheckedChange={toggleMapStyle}
            />
            <Label htmlFor="satellite-view">Satellite View</Label>
          </div>
          <div>
            <label
              htmlFor="rotation-slider"
              className="text-sm font-medium block mb-2"
            >
              Rotation: {rotation}°
            </label>
            <Slider
              id="rotation-slider"
              min={0}
              max={360}
              step={1}
              value={[rotation]}
              onValueChange={handleRotationChange}
              aria-label="Rotation slider"
            />
          </div>
          <Button onClick={handleReset} aria-label="Reset view">
            Reset View
          </Button>
          <div>
            <label
              htmlFor="geojson-data"
              className="text-sm font-medium block mb-2"
            >
              GeoJSON Data
            </label>
            <Textarea
              id="geojson-data"
              value={geoJsonData}
              readOnly
              className="h-96 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
