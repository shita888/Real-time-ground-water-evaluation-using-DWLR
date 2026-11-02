import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import * as d3 from "d3";
import "leaflet/dist/leaflet.css";

type Metric = "litrate" | "sexratio" | "area" | "popdensity" | "workpoprate";

const DistrictMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const [metric, setMetric] = useState<Metric>("litrate");

  useEffect(() => {
    if (!mapRef.current) return;

    let geoLayer: L.GeoJSON<any>;

    const initMap = async () => {
      const map = L.map(mapRef.current, { scrollWheelZoom: false }).setView([23.4, 78.5], 6);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        minZoom: 2,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // Load data from public static directory
      const districts: any = await d3.json("/data/geojson/dists11.geojson");
      const info: any = await d3.csv("/data/csv/dists.csv");

      const getProp = (dist: string, key: Metric) => {
        const entry = info.find((d: any) => d.dist.trim().toLowerCase() === dist.trim().toLowerCase());
        return entry ? parseFloat(entry[key]) : 0;
      };

      districts.features.forEach((f: any) => {
        f.properties.litrate = getProp(f.properties.DISTRICT, "litrate");
        f.properties.sexratio = getProp(f.properties.DISTRICT, "sexratio");
        f.properties.area = getProp(f.properties.DISTRICT, "area");
        f.properties.popdensity = getProp(f.properties.DISTRICT, "popdensity");
        f.properties.workpoprate = getProp(f.properties.DISTRICT, "workpoprate");
      });

      const values = districts.features.map((f: any) => f.properties[metric] || 0);
      const min = Math.min(...values.filter((v) => v > 0));
      const max = Math.max(...values);
      const colorScale = d3.scaleLinear<string>().domain([min, max]).range(["#fff7ec", "#7f0000"]);

      const style = (feature: any) => ({
        fillColor: colorScale(feature.properties[metric] || 0),
        weight: 2,
        color: "white",
        dashArray: "3",
        fillOpacity: 0.7,
      });

      const highlightFeature = (e: any) => {
        const layer = e.target;
        layer.setStyle({ weight: 4, color: "#fff", fillOpacity: 0.9 });
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) layer.bringToFront();

        if (infoRef.current) {
          infoRef.current.innerHTML = `<h6>India ${metric}</h6>
            <b>${layer.feature.properties.ST_NM}</b><br/>
            District: <b>${layer.feature.properties.DISTRICT}</b><br/>
            ${metric}: <b>${layer.feature.properties[metric]}</b>`;
        }
      };

      const resetHighlight = (e: any) => {
        geoLayer.resetStyle(e.target);
        if (infoRef.current) {
          infoRef.current.innerHTML = `<h6>India ${metric}</h6>Hover over a district`;
        }
      };

      const zoomToFeature = (e: any) => {
        map.fitBounds(e.target.getBounds());
      };

      const onEachFeature = (feature: any, layer: any) => {
        layer.on({
          mouseover: highlightFeature,
          mouseout: resetHighlight,
          click: zoomToFeature,
        });
      };

      geoLayer = L.geoJSON(districts, { style, onEachFeature }).addTo(map);
    };

    initMap();
  }, [metric]);

  return (
    <div style={{ position: "relative" }}>
      <h3>Select Metric:</h3>
      <div style={{ marginBottom: "10px" }}>
        {["litrate", "sexratio", "area", "popdensity", "workpoprate"].map((m) => (
          <button key={m} onClick={() => setMetric(m as Metric)} style={{ marginRight: "5px" }}>
            {m}
          </button>
        ))}
      </div>

      {/* Info Box */}
      <div
        ref={infoRef}
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          zIndex: 1000,
          background: "rgba(255, 255, 255, 0.9)",
          padding: "8px",
          borderRadius: "4px",
          boxShadow: "0 0 8px rgba(0,0,0,0.3)",
        }}
      >
        <h6>India {metric}</h6>
        Hover over a district
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ width: "100%", height: "800px" }} />
    </div>
  );
};

export default DistrictMap;
