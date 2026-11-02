import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import * as d3 from "d3";
import "bootstrap/dist/css/bootstrap.min.css";
import "leaflet/dist/leaflet.css";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import AppSidebar from "@/components/ui/AppSidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Filter, Layers, Navigation } from "lucide-react";
import { getStations } from "@/services/api";

interface Station {
  station_id: string;
  name: string;
  district?: string;
  block?: string;
  village?: string;
  lat: number;
  lon: number;
  latest_level?: number;
  latest_status?: string;
  latest_trend?: string;
  records_count?: number;
}

const DistrictsMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [stationCount, setStationCount] = useState<number>(0);
  const [hoveredInfo, setHoveredInfo] = useState<string>("Hover over a district or click a station marker");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Status colors
  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "safe":
        return "#10b981"; // emerald-500
      case "semi-critical":
        return "#f59e0b"; // amber-500
      case "critical":
        return "#ef4444"; // red-500
      case "over-exploited":
        return "#8b5cf6"; // violet-500
      default:
        return "#3b82f6"; // blue-500
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up any existing map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize Leaflet map centered on Madhya Pradesh (Lat: 23.4°N, Lon: 78.5°E)
    const map = L.map(mapContainerRef.current, {
      scrollWheelZoom: true,
      zoomControl: true,
    }).setView([23.4, 78.5], 7);

    mapInstanceRef.current = map;

    // Valid, active OpenStreetMap tile provider
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      minZoom: 4,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Layer group for station markers
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    // 1. Load GeoJSON District Boundaries (Filtered strictly for Madhya Pradesh)
    (async () => {
      try {
        const geojsonPath = "/data/geojson/dists11.geojson";
        const districtsData: any = await d3.json(geojsonPath);
        if (districtsData && districtsData.features) {
          // Filter to only display Madhya Pradesh district polygons
          districtsData.features = districtsData.features.filter(
            (f: any) => (f.properties?.ST_NM || "").trim().toLowerCase() === "madhya pradesh"
          );

          const geoLayer = L.geoJSON(districtsData, {
            style: () => ({
              fillColor: "#e0f2fe",
              fillOpacity: 0.25,
              color: "#0284c7",
              weight: 1.5,
              dashArray: "2",
            }),
            onEachFeature: (feature, layer) => {
              layer.on({
                mouseover: (e) => {
                  const targetLayer = e.target;
                  targetLayer.setStyle({
                    weight: 3,
                    color: "#0369a1",
                    fillOpacity: 0.5,
                  });
                  const dName = feature.properties?.DISTRICT || "Unknown District";
                  setHoveredInfo(`District: ${dName} (Madhya Pradesh)`);
                },
                mouseout: (e) => {
                  geoLayer.resetStyle(e.target);
                  setHoveredInfo("Hover over a district or click a station marker");
                },
                click: (e) => {
                  map.fitBounds(e.target.getBounds());
                },
              });
            },
          }).addTo(map);

          if (districtsData.features.length > 0) {
            map.fitBounds(geoLayer.getBounds());
          }
        }
      } catch (err) {
        console.warn("GeoJSON district overlay optional load note:", err);
      }
    })();

    // 2. Fetch Groundwater Monitoring Stations with actual coordinates (MP only)
    (async () => {
      try {
        setLoading(true);
        const data = await getStations();
        const loadedStations: Station[] = (data.stations || []).filter(
          (s: Station) => s.station_id && s.station_id.startsWith("MP_")
        );
        setStations(loadedStations);
        setStationCount(loadedStations.length);
      } catch (err) {
        console.error("Failed to fetch stations for map:", err);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update station markers when filter or stations change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();

    const filtered = stations.filter((s) => {
      if (selectedStatus === "all") return true;
      return (s.latest_status || "").toLowerCase() === selectedStatus.toLowerCase();
    });

    // Render up to 1000 markers for fluid performance
    const renderLimit = Math.min(filtered.length, 1200);

    for (let i = 0; i < renderLimit; i++) {
      const s = filtered[i];
      if (typeof s.lat !== "number" || typeof s.lon !== "number") continue;

      const color = getStatusColor(s.latest_status);

      const circleMarker = L.circleMarker([s.lat, s.lon], {
        radius: 6,
        fillColor: color,
        color: "#ffffff",
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.85,
      });

      const popupContent = `
        <div style="font-family: sans-serif; font-size: 13px; min-width: 180px; padding: 4px;">
          <h4 style="margin: 0 0 6px; font-size: 14px; font-weight: bold; color: #0f172a;">${s.name || s.station_id}</h4>
          <p style="margin: 0 0 4px; color: #475569;"><b>Station ID:</b> ${s.station_id}</p>
          <p style="margin: 0 0 4px; color: #475569;"><b>District:</b> ${s.district || "N/A"}</p>
          <p style="margin: 0 0 4px; color: #475569;"><b>Coordinates:</b> ${s.lat.toFixed(4)}°N, ${s.lon.toFixed(4)}°E</p>
          <p style="margin: 0 0 4px; color: #0f172a; font-weight: bold;">
            <b>Water Level:</b> ${s.latest_level !== undefined && s.latest_level !== null ? `${s.latest_level} m` : "N/A"}
          </p>
          <p style="margin: 0; color: #475569;">
            <b>Status:</b> <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; color: #fff; background: ${color}; font-size: 11px; text-transform: capitalize;">${s.latest_status || "safe"}</span>
          </p>
        </div>
      `;

      circleMarker.bindPopup(popupContent);
      markersLayer.addLayer(circleMarker);
    }
  }, [stations, selectedStatus]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex flex-col text-slate-900">
      <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <div className="flex flex-1 w-full min-w-0">
        <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
                  Groundwater Station Map (Madhya Pradesh)
                </h1>
                <p className="text-slate-600 text-sm md:text-base mt-1">
                  Visualizing {stationCount.toLocaleString()} DWLR monitoring stations with actual dataset coordinates
                </p>
              </div>

              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-2 bg-white/90 p-2 rounded-xl shadow-sm border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase px-2 flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5" /> Filter:
                </span>
                {["all", "safe", "semi-critical", "critical", "over-exploited"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg capitalize transition-all ${
                      selectedStatus === status
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Map Display Card */}
            <Card className="border-0 shadow-xl overflow-hidden ring-1 ring-slate-200 bg-white">
              <CardHeader className="py-3 px-4 bg-slate-50/80 border-b border-slate-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span>{hoveredInfo}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-slate-600">
                    <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block"></span> Safe (&lt;5m)
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <span className="h-3 w-3 rounded-full bg-amber-500 inline-block"></span> Semi-Critical (5-10m)
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <span className="h-3 w-3 rounded-full bg-red-500 inline-block"></span> Critical (10-20m)
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <span className="h-3 w-3 rounded-full bg-violet-500 inline-block"></span> Over-Exploited (&ge;20m)
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0 relative">
                {loading && (
                  <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm font-medium text-slate-700">Loading DWLR stations and boundaries...</p>
                    </div>
                  </div>
                )}
                <div
                  ref={mapContainerRef}
                  style={{ width: "100%", height: "650px" }}
                  className="z-0"
                />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default DistrictsMap;
