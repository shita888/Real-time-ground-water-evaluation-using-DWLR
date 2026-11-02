import { useEffect, useState, useMemo } from "react";
import { getHistory, getStations } from "../services/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronRight,
  Droplets,
  Calendar,
  Info,
  Filter,
} from "lucide-react";

interface StationOption {
  station_id: string;
  name: string;
  records_count?: number;
  district?: string;
  village?: string;
}

export default function HistoryViewer() {
  const [stationId, setStationId] = useState<string>("MP_DHAR_BAGH_BAGH_1");
  const [stationsList, setStationsList] = useState<StationOption[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [readingsLimit, setReadingsLimit] = useState<number>(15);
  const [data, setData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showNumbers, setShowNumbers] = useState<boolean>(false);

  // Fetch Madhya Pradesh stations
  useEffect(() => {
    getStations()
      .then((json: any) => {
        const loaded: StationOption[] = (json.stations || []).filter(
          (s: StationOption) => s.station_id && s.station_id.startsWith("MP_")
        );
        if (loaded.length) {
          // Sort stations with readings first, then by district/name
          const sorted = [...loaded].sort((a, b) => {
            const countA = a.records_count || 0;
            const countB = b.records_count || 0;
            if (countB !== countA) return countB - countA;
            return (a.district || "").localeCompare(b.district || "");
          });
          setStationsList(sorted);
        }
      })
      .catch((err) => console.warn("Failed to load stations list:", err));
  }, []);

  // Distinct Districts list
  const districtsList = useMemo(() => {
    const set = new Set<string>();
    stationsList.forEach((s) => {
      if (s.district) set.add(s.district.trim());
    });
    return Array.from(set).sort();
  }, [stationsList]);

  // Filtered stations for dropdown
  const filteredStations = useMemo(() => {
    if (selectedDistrict === "all") return stationsList;
    return stationsList.filter(
      (s) => (s.district || "").trim().toLowerCase() === selectedDistrict.toLowerCase()
    );
  }, [stationsList, selectedDistrict]);

  // Fetch history for selected station
  useEffect(() => {
    if (!stationId) return;

    setLoading(true);
    setErrorMessage(null);

    getHistory(stationId, readingsLimit)
      .then((json) => {
        const history = json.history || [];
        setTotalCount(json.count ?? history.length);

        const formatted = history
          .filter(
            (d: any) =>
              d &&
              d.date &&
              d.water_level !== null &&
              d.water_level !== undefined &&
              typeof d.water_level === "number" &&
              !isNaN(d.water_level)
          )
          .map((d: any, idx: number, arr: any[]) => {
            const prev = idx > 0 ? arr[idx - 1].water_level : null;
            const diff = prev !== null ? Number((d.water_level - prev).toFixed(2)) : null;
            return {
              date: d.date,
              displayDate: d.date.length >= 7 ? d.date.slice(0, 7) : d.date,
              water_level: d.water_level,
              diff,
              status: d.status || (d.water_level < 5 ? "Safe" : d.water_level < 10 ? "Semi-critical" : d.water_level < 20 ? "Critical" : "Over-exploited"),
            };
          });

        setData(formatted);
      })
      .catch((err: any) => {
        console.error("Error fetching history:", err);
        const msg = err.message || "Failed to load station history";
        setErrorMessage(msg.startsWith("⚠️") ? msg : `⚠️ ${msg}`);
        setData([]);
        setTotalCount(0);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [stationId, readingsLimit]);

  // Key stats calculation
  const stats = useMemo(() => {
    if (!data.length) return null;
    const first = data[0].water_level;
    const latest = data[data.length - 1].water_level;
    const min = Math.min(...data.map((d) => d.water_level));
    const max = Math.max(...data.map((d) => d.water_level));
    const netChange = Number((latest - first).toFixed(2));
    
    // In groundwater depth (mbgl):
    // negative change = depth decreased = water level rose (IMPROVED!)
    // positive change = depth increased = water level dropped deeper (DEPLETED!)
    const isImproving = netChange < 0;
    const isStable = Math.abs(netChange) <= 0.1;

    let category = "Safe";
    let categoryColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (latest >= 20) {
      category = "Over-exploited";
      categoryColor = "bg-red-100 text-red-800 border-red-200";
    } else if (latest >= 10) {
      category = "Critical";
      categoryColor = "bg-orange-100 text-orange-800 border-orange-200";
    } else if (latest >= 5) {
      category = "Semi-critical";
      categoryColor = "bg-amber-100 text-amber-800 border-amber-200";
    }

    return {
      first,
      latest,
      min,
      max,
      netChange,
      isImproving,
      isStable,
      category,
      categoryColor,
    };
  }, [data]);

  // Selected station metadata
  const currentStationMeta = useMemo(() => {
    return stationsList.find((s) => s.station_id === stationId);
  }, [stationsList, stationId]);

  return (
    <div className="text-slate-900 w-full min-w-0 space-y-4">
      {/* 1. Header & Easy-to-understand Guidance */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <Droplets className="h-5 w-5" />
            </span>
            <span>Groundwater Historical Records</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Past groundwater depth measurements (meters below ground level)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200 font-medium">
            {totalCount} total readings recorded
          </span>
        </div>
      </div>

      {/* 2. Simplified Station & District Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
        {/* District Filter */}
        <div className="sm:col-span-4">
          <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Select District:
          </label>
          <select
            value={selectedDistrict}
            onChange={(e) => {
              setSelectedDistrict(e.target.value);
              // Auto-select first station of that district
              const matches = stationsList.filter(
                (s) => e.target.value === "all" || (s.district || "").trim().toLowerCase() === e.target.value.toLowerCase()
              );
              if (matches.length) setStationId(matches[0].station_id);
            }}
            className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-xs focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium"
          >
            <option value="all">All Districts (Madhya Pradesh)</option>
            {districtsList.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Station Select */}
        <div className="sm:col-span-5">
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Monitoring Station:
          </label>
          <select
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-xs focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium truncate"
          >
            {filteredStations.map((s) => (
              <option key={s.station_id} value={s.station_id}>
                {s.village || s.name || s.station_id} ({s.district || "MP"}) — {s.records_count || 0} obs
              </option>
            ))}
          </select>
        </div>

        {/* Timeframe Chips */}
        <div className="sm:col-span-3">
          <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Timeframe:
          </label>
          <select
            value={readingsLimit}
            onChange={(e) => setReadingsLimit(Number(e.target.value))}
            className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-xs focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium"
          >
            <option value={7}>Last 7 Readings</option>
            <option value={15}>Last 15 Readings</option>
            <option value={30}>Last 30 Readings</option>
            <option value={60}>Last 60 Readings</option>
            <option value={500}>All Available Readings</option>
          </select>
        </div>
      </div>

      {/* 3. Simple Summary Cards (Latest Level, Status, Net Trend) */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Latest Level */}
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
              Latest Depth
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
              {stats.latest} <span className="text-xs font-semibold text-slate-500">mbgl</span>
            </div>
            <span className="text-[11px] text-slate-500">meters below ground</span>
          </div>

          {/* Health Category */}
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
              Current Category
            </span>
            <div className="mt-1">
              <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${stats.categoryColor}`}>
                ● {stats.category}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">CGWB Guidelines</span>
          </div>

          {/* Overall Trend */}
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
              Water Table Trend
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-sm">
              {stats.isStable ? (
                <span className="text-slate-700 flex items-center gap-1">
                  <Minus className="h-4 w-4" /> Stable
                </span>
              ) : stats.isImproving ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" /> Water Rising (Good)
                </span>
              ) : (
                <span className="text-red-700 flex items-center gap-1">
                  <TrendingDown className="h-4 w-4" /> Depleting (Falling)
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-500">
              {stats.first}m → {stats.latest}m
            </span>
          </div>

          {/* Depth Range */}
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
              Historical Range
            </span>
            <div className="text-sm font-bold text-slate-800 mt-1">
              {stats.min}m — {stats.max}m
            </div>
            <span className="text-[11px] text-slate-500">min to max recorded depth</span>
          </div>
        </div>
      )}

      {/* User Friendly Plain Explanation Banner */}
      <div className="flex items-center gap-2 p-2.5 bg-blue-50/70 border border-blue-200/60 rounded-xl text-xs text-blue-900 leading-snug">
        <Info className="h-4 w-4 text-blue-600 shrink-0" />
        <span>
          <b>Simple Guide:</b> Numbers show depth in meters below ground. <b>Lower meters (&lt; 10m)</b> = water is near the surface (Healthy & Safe). <b>Higher meters (&gt; 20m)</b> = water has dropped deep into the ground (Critical zone).
        </span>
      </div>

      {/* 4. Chart Display (Styled to match the reference graph) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
        {loading ? (
          <div className="py-20 text-center text-slate-500 font-medium">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
            Loading station historical records...
          </div>
        ) : errorMessage ? (
          <div className="py-8 px-4 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-sm font-medium">
            <div className="font-semibold text-amber-950 mb-1">Notice</div>
            <p className="m-0">{errorMessage}</p>
          </div>
        ) : data.length ? (
          <div>
            {/* Chart Area */}
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data}
                  margin={{ top: 25, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fill: "#475569", fontSize: 11 }}
                    stroke="#cbd5e1"
                    dy={5}
                  />
                  
                  <YAxis
                    domain={[0, (dataMax: number) => Math.max(25, Math.ceil(dataMax * 1.25))]}
                    unit="m"
                    tick={{ fill: "#475569", fontSize: 11 }}
                    stroke="#cbd5e1"
                  />
                  
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const val = payload[0].value;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-lg text-xs space-y-1">
                            <div className="font-bold text-slate-800">{d.date}</div>
                            <div className="text-emerald-700 font-semibold">
                              Depth: <b>{val} meters</b>
                            </div>
                            <div className="text-slate-600">
                              Status: <span className="font-medium">{d.status}</span>
                            </div>
                            {d.diff !== null && (
                              <div className="text-[11px] text-slate-500">
                                Change: {d.diff > 0 ? `+${d.diff}m (Depleted)` : `${d.diff}m (Risen)`}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  {/* Critical Threshold Benchmark Line (Matching the reference design) */}
                  <ReferenceLine
                    y={20}
                    stroke="#b91c1c"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: "20m: over-exploited & critical above this line",
                      fill: "#991b1b",
                      position: "top",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />

                  {/* Main Line with Custom First/Last Labels */}
                  <Line
                    type="monotone"
                    dataKey="water_level"
                    stroke="#166534"
                    strokeWidth={2.8}
                    dot={(props: any) => {
                      const { cx, cy, index, payload } = props;
                      const isFirst = index === 0;
                      const isLast = index === data.length - 1;

                      return (
                        <g key={`dot-${index}`}>
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isFirst || isLast ? 5.5 : 3.5}
                            fill="#166534"
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                          {(isFirst || isLast) && (
                            <text
                              x={cx}
                              y={cy - 10}
                              textAnchor="middle"
                              fill="#0f172a"
                              fontSize={11}
                              fontWeight="bold"
                            >
                              {payload.water_level}m
                            </text>
                          )}
                        </g>
                      );
                    }}
                    activeDot={{ r: 6, fill: "#15803d", stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 5. Category Legend Badges (Exact design inspired by reference image) */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600"></span>
                Safe · &lt; 5m depth
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500"></span>
                Semi-critical · 5–10m
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-800 font-semibold border border-orange-200">
                <span className="w-2.5 h-2.5 rotate-45 bg-orange-500"></span>
                Critical · 10–20m
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-800 font-semibold border border-red-200">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                Over-exploited · &gt; 20m
              </span>
            </div>

            {/* 6. "Show the numbers" Collapsible Table (Exact match to reference design) */}
            <div className="mt-3 pt-2">
              <button
                type="button"
                onClick={() => setShowNumbers(!showNumbers)}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {showNumbers ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <span>{showNumbers ? "Hide the numbers" : "▶ Show the numbers"}</span>
              </button>

              {showNumbers && (
                <div className="mt-2.5 overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Water Level (mbgl)</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Change vs Prior</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 font-medium text-slate-800">{row.date}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{row.water_level} m</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                row.water_level < 5
                                  ? "bg-emerald-100 text-emerald-800"
                                  : row.water_level < 10
                                  ? "bg-amber-100 text-amber-800"
                                  : row.water_level < 20
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {row.diff !== null ? (
                              row.diff < 0 ? (
                                <span className="text-emerald-700 font-medium">{row.diff}m (Risen)</span>
                              ) : row.diff > 0 ? (
                                <span className="text-red-700 font-medium">+{row.diff}m (Fallen)</span>
                              ) : (
                                "No change"
                              )
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-600 font-medium bg-slate-50 rounded-lg">
            No historical records found for this station.
          </div>
        )}
      </div>
    </div>
  );
}
