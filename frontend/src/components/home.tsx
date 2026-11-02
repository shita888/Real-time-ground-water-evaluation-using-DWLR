// src/components/home.tsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./home.css";
import { getStations, getStatistics } from "@/services/api";

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

interface StatsData {
  active_stations: number;
  avg_water_level: string;
  avg_water_level_num?: number;
  safe_stations: number;
  semi_critical_stations: number;
  critical_stations: number;
  recharge_rate?: string;
  state?: string;
}

export default function HomePage() {
  const navigate = useNavigate();

  // Navigation & search state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Data state
  const [stations, setStations] = useState<Station[]>([]);
  const [stats, setStats] = useState<StatsData>({
    active_stations: 2453,
    avg_water_level: "11.1m",
    safe_stations: 606,
    semi_critical_stations: 593,
    critical_stations: 1254,
    state: "Madhya Pradesh",
  });
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");

  // Map references
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);

  // Status color helper
  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "safe":
        return "#1e8e6a"; // var(--green)
      case "semi-critical":
        return "#f59e0b"; // amber
      case "critical":
      case "over-exploited":
        return "#ef4444"; // red
      default:
        return "#1f6fb2"; // var(--blue)
    }
  };

  // Fetch live stations & statistics from backend
  useEffect(() => {
    let isMounted = true;

    async function loadLiveData() {
      try {
        const [stationsRes, statsRes] = await Promise.allSettled([
          getStations(),
          getStatistics(),
        ]);

        if (!isMounted) return;

        if (stationsRes.status === "fulfilled" && stationsRes.value?.stations) {
          const mpStations = stationsRes.value.stations.filter(
            (s: Station) => s.station_id && s.station_id.startsWith("MP_")
          );
          setStations(mpStations);
        }

        if (statsRes.status === "fulfilled" && statsRes.value) {
          setStats(statsRes.value);
        }
      } catch (err) {
        console.warn("Could not load backend groundwater statistics:", err);
      }
    }

    loadLiveData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Config from index(1).html: mpCenter: [23.5, 78.5], mpZoom: 6
    const map = L.map(mapContainerRef.current, {
      scrollWheelZoom: false,
    }).setView([23.5, 78.5], 6.5);

    mapInstanceRef.current = map;

    // OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 14,
      minZoom: 5,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    // Load Madhya Pradesh District Boundaries GeoJSON
    (async () => {
      try {
        const res = await fetch("/data/geojson/dists11.geojson");
        if (!res.ok) return;
        const geoData = await res.json();

        if (geoData && geoData.features) {
          // Filter strictly for Madhya Pradesh
          geoData.features = geoData.features.filter(
            (f: any) =>
              (f.properties?.ST_NM || "").trim().toLowerCase() ===
              "madhya pradesh"
          );

          const geoLayer = L.geoJSON(geoData, {
            style: {
              color: "#1f6fb2",
              weight: 1.2,
              fillColor: "#1e8e6a",
              fillOpacity: 0.12,
            },
            onEachFeature: (feature, layer) => {
              const dName =
                feature.properties?.DISTRICT ||
                feature.properties?.dtname ||
                "District";

              layer.on({
                mouseover: () => {
                  layer.setStyle({ fillOpacity: 0.32, color: "#0b2a5b", weight: 2 });
                },
                mouseout: () => {
                  layer.setStyle({ fillOpacity: 0.12, color: "#1f6fb2", weight: 1.2 });
                },
                click: (e) => {
                  setSelectedDistrict(dName);
                  map.fitBounds(e.target.getBounds());
                },
              });
            },
          }).addTo(map);

          geoJsonLayerRef.current = geoLayer;
        }
      } catch (err) {
        console.warn("District GeoJSON note:", err);
      }
    })();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Station Markers when stations or selected district changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();

    const filtered = stations.filter((s) => {
      if (!selectedDistrict) return true;
      const stDist = (s.district || "").toLowerCase().trim();
      const selDist = selectedDistrict.toLowerCase().trim();
      return stDist.includes(selDist) || selDist.includes(stDist);
    });

    const displayLimit = Math.min(filtered.length, 500);

    for (let i = 0; i < displayLimit; i++) {
      const s = filtered[i];
      if (typeof s.lat !== "number" || typeof s.lon !== "number") continue;

      const color = getStatusColor(s.latest_status);

      const circle = L.circleMarker([s.lat, s.lon], {
        radius: 5,
        fillColor: color,
        color: "#ffffff",
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.85,
      });

      const popupContent = `
        <div style="font-family: Inter, sans-serif; font-size: 13px; line-height: 1.4; min-width: 160px; color: #14284b;">
          <div style="font-weight: 700; color: #0b2a5b; margin-bottom: 2px;">${
            s.name || s.station_id
          }</div>
          <div style="color: #51627f; font-size: 12px;">District: <b>${
            s.district || "N/A"
          }</b></div>
          <div style="color: #14284b; font-size: 12px; margin: 3px 0;">Depth: <b>${
            s.latest_level !== undefined && s.latest_level !== null
              ? `${s.latest_level} m bgl`
              : "N/A"
          }</b></div>
          <div style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; color: #fff; background: ${color}; text-transform: capitalize;">
            ${s.latest_status || "safe"}
          </div>
          <div style="margin-top: 6px;">
            <a href="/dashboard?station=${encodeURIComponent(
              s.station_id
            )}" style="color: #1f6fb2; font-weight: 600; text-decoration: underline; font-size: 12px;">Open in Dashboard →</a>
          </div>
        </div>
      `;

      circle.bindPopup(popupContent);
      markersLayer.addLayer(circle);
    }
  }, [stations, selectedDistrict]);

  // Compute district statistics
  const districtFilteredStations = useMemo(() => {
    if (!selectedDistrict) return stations;
    const sel = selectedDistrict.toLowerCase().trim();
    return stations.filter((s) => {
      const d = (s.district || "").toLowerCase().trim();
      return d.includes(sel) || sel.includes(d);
    });
  }, [stations, selectedDistrict]);

  const districtCounts = useMemo(() => {
    let safe = 0;
    let semi = 0;
    let critical = 0;
    let sumLevel = 0;
    let countWithLevel = 0;

    districtFilteredStations.forEach((s) => {
      const st = (s.latest_status || "").toLowerCase();
      if (st === "safe") safe++;
      else if (st === "semi-critical") semi++;
      else if (st === "critical" || st === "over-exploited") critical++;

      if (typeof s.latest_level === "number" && !isNaN(s.latest_level)) {
        sumLevel += s.latest_level;
        countWithLevel++;
      }
    });

    const avgLevel =
      countWithLevel > 0
        ? (sumLevel / countWithLevel).toFixed(1) + " m"
        : stats.avg_water_level || "11.1 m";

    return {
      total: districtFilteredStations.length || (selectedDistrict ? 0 : stats.active_stations),
      safe: selectedDistrict ? safe : stats.safe_stations,
      semi: selectedDistrict ? semi : stats.semi_critical_stations,
      critical: selectedDistrict ? critical : stats.critical_stations,
      avgLevel: avgLevel,
    };
  }, [districtFilteredStations, selectedDistrict, stats]);

  // Search handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = searchQuery.trim();
    if (v) {
      navigate(`/districts?q=${encodeURIComponent(v)}`);
    }
  };

  return (
    <div className="jaldrishti-home">
      {/* 1. HEADER (Exact from index(1).html) */}
      <header className={`site-header ${isMenuOpen ? "open" : ""}`} id="header">
        <div className="wrap bar">
          <Link className="brand" to="/" aria-label="JalDrishti home">
            <b>
              Jal<span>Drishti</span>
            </b>
            <small>Groundwater Monitoring for a Sustainable Tomorrow</small>
          </Link>

          <button
            className="menu-btn"
            id="menuBtn"
            aria-label="Open menu"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          {/* Keep hrefs in sync with existing routes */}
          <nav className="nav" aria-label="Main">
            <Link className="active" to="/">
              Home
            </Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/map">Map</Link>
            <a href="#about">About</a>
          </nav>

          <form
            className="search"
            id="searchForm"
            role="search"
            onSubmit={handleSearchSubmit}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#51627f"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4" />
            </svg>
            <input
              id="q"
              type="search"
              placeholder="Search station or district..."
              aria-label="Search station or district"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          <Link className="btn btn-primary login" to="/login">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
            </svg>
            Login
          </Link>
        </div>
      </header>

      {/* 2. MAIN */}
      <main>
        <div className="wrap">
          {/* HERO SECTION */}
          <div className="hero">
            <div className="hero-grid">
              <div>
                <h1>Real-time Groundwater Insights for Madhya Pradesh</h1>
                <p>
                  JalDrishti provides groundwater levels, historical analysis,
                  and future forecasts using DWLR data to support informed water
                  management decisions.
                </p>
                <div className="cta">
                  <Link className="btn btn-primary" to="/dashboard">
                    View Dashboard
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </Link>
                  <a className="btn btn-outline" href="#explore">
                    Explore Map
                  </a>
                </div>
              </div>

              {/* Replaced illustrated SVG with the provided reservoir photo */}
              <div className="hero-img">
                <img
                  src="/reservoir_hero.jpg"
                  alt="DWLR intake tower on a reservoir in Madhya Pradesh"
                  loading="eager"
                />
              </div>
            </div>
          </div>

          {/* STATS SECTION (Network summary with real data) */}
          <div className="stats" aria-label="Network summary">
            <div className="stat">
              <div className="ico blue">
                <svg viewBox="0 0 24 24">
                  <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
                  <circle cx="12" cy="9.5" r="2.5" />
                </svg>
              </div>
              <div>
                <strong data-stat="stations">5,260+</strong>
                <span>DWLR Stations (India)</span>
              </div>
            </div>

            <div className="stat">
              <div className="ico green">
                <svg viewBox="0 0 24 24">
                  <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
                  <path d="M9 4v14M15 6v14" />
                </svg>
              </div>
              <div>
                <strong data-stat="districts">700+</strong>
                <span>Districts Covered</span>
              </div>
            </div>

            <div className="stat">
              <div className="ico blue">
                <svg viewBox="0 0 24 24">
                  <path d="M5 20V11M12 20V5M19 20v-7" />
                </svg>
              </div>
              <div>
                <strong data-stat="years">30+ Years</strong>
                <span>Historical Data (1994 – 2024)</span>
              </div>
            </div>

            <div className="stat">
              <div className="ico green">
                <svg viewBox="0 0 24 24">
                  <path d="M3 12h4l3-7 4 14 3-7h4" />
                </svg>
              </div>
              <div>
                <strong>Live Insights</strong>
                <span>For Sustainable Water Management</span>
              </div>
            </div>
          </div>

          {/* KEY FEATURES SECTION */}
          <section aria-labelledby="feat">
            <h2 id="feat">Key Features</h2>
            <div className="cards">
              <Link className="card" to="/dashboard">
                <div className="ico blue">
                  <svg viewBox="0 0 24 24">
                    <path d="M5 20V11M12 20V5M19 20v-7" />
                  </svg>
                </div>
                <div>
                  <h3>Historical Analysis</h3>
                  <p>
                    View and analyze past groundwater level trends with
                    interactive charts.
                  </p>
                </div>
              </Link>

              <Link className="card" to="/dashboard">
                <div className="ico green">
                  <svg viewBox="0 0 24 24">
                    <path d="M3 17l6-6 4 4 8-8" />
                    <path d="M15 7h6v6" />
                  </svg>
                </div>
                <div>
                  <h3>Future Forecast</h3>
                  <p>
                    7-day LSTM based water level prediction for selected
                    stations.
                  </p>
                </div>
              </Link>

              <Link className="card" to="/map">
                <div className="ico blue">
                  <svg viewBox="0 0 24 24">
                    <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
                    <path d="M9 4v14M15 6v14" />
                  </svg>
                </div>
                <div>
                  <h3>Interactive Map</h3>
                  <p>
                    Explore DWLR stations and district-wise data on map.
                  </p>
                </div>
              </Link>

              <Link className="card" to="/districts">
                <div className="ico green">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 21V5l9-2v18M13 9h7v12M4 21h16M8 8h1M8 12h1M8 16h1" />
                  </svg>
                </div>
                <div>
                  <h3>District Insights</h3>
                  <p>
                    Compare groundwater conditions across districts of Madhya
                    Pradesh.
                  </p>
                </div>
              </Link>
            </div>
          </section>

          {/* EXPLORE GROUNDWATER DATA SECTION (MAP + PANEL) */}
          <section id="explore" aria-labelledby="exp">
            <h2 id="exp">Explore Groundwater Data</h2>
            <p className="sub">
              Select a district to view stations and groundwater information.
            </p>
            <div className="explore">
              <div
                id="map"
                ref={mapContainerRef}
                role="region"
                aria-label="Madhya Pradesh map"
              />

              <aside className="panel" aria-live="polite">
                <h3 id="pName">
                  {selectedDistrict ? `${selectedDistrict} District` : "Madhya Pradesh"}
                </h3>
                <p id="pText">
                  {selectedDistrict
                    ? "Latest available information for this district."
                    : "Select a district from the map or use the search bar to get started."}
                </p>

                <dl id="pData">
                  <dt>Total DWLR Stations</dt>
                  <dd>{districtCounts.total.toLocaleString()}</dd>
                  <dt>Average Water Level</dt>
                  <dd>{districtCounts.avgLevel}</dd>
                  <dt>Safe Stations</dt>
                  <dd>{districtCounts.safe}</dd>
                  <dt>Semi-Critical</dt>
                  <dd>{districtCounts.semi}</dd>
                  <dt>Critical</dt>
                  <dd>{districtCounts.critical}</dd>
                </dl>

                <Link
                  className="btn btn-outline"
                  id="pLink"
                  to={
                    selectedDistrict
                      ? `/districts?name=${encodeURIComponent(selectedDistrict)}`
                      : "/districts"
                  }
                >
                  View district details
                </Link>
              </aside>
            </div>
          </section>

          {/* ABOUT SECTION */}
          <section id="about" style={{ paddingBottom: "20px" }}>
            <h2>About JalDrishti</h2>
            <p className="sub" style={{ maxWidth: "800px", lineHeight: "1.6" }}>
              JalDrishti is a dedicated groundwater monitoring platform designed
              for researchers, planners, and communities in Madhya Pradesh. By
              integrating automated Digital Water Level Recorders (DWLR) with
              machine learning forecasting algorithms, JalDrishti provides
              transparent, real-time insights into aquifer sustainability.
            </p>
          </section>
        </div>
      </main>

      {/* 3. FOOTER (Exact from index(1).html) */}
      <footer>
        <div className="wrap foot">
          <span>
            &copy; {new Date().getFullYear()} JalDrishti &middot; Groundwater
            Monitoring for Madhya Pradesh
          </span>
          <nav aria-label="Footer">
            <Link to="/">Home</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/map">Map</Link>
            <a href="#about">About</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}