import { useEffect, useState, useMemo } from "react";
import { getForecast, getStations } from "../services/api";
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
  Sparkles,
  ChevronDown,
  ChevronRight,
  Filter,
  Info,
  Cpu,
  RefreshCw,
} from "lucide-react";

interface StationOption {
  station_id: string;
  name: string;
  records_count?: number;
  district?: string;
  village?: string;
}

export default function ForecastViewer() {
  const [stationId, setStationId] = useState<string>("MP_DHAR_BAGH_BAGH_1");
  const [stationsList, setStationsList] = useState<StationOption[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [data, setData] = useState<any[]>([]);
  const [trend, setTrend] = useState<string>("");
  const [meanCategory, setMeanCategory] = useState<string>("");
  const [latestLevel, setLatestLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [availableObs, setAvailableObs] = useState<number | null>(null);
  const [requiredObs, setRequiredObs] = useState<number>(15);
  const [showNumbers, setShowNumbers] = useState<boolean>(false);

  // Fetch Madhya Pradesh stations
  useEffect(() => {
    getStations()
      .then((json: any) => {
        const loaded: StationOption[] = (json.stations || []).filter(
          (s: StationOption) => s.station_id && s.station_id.startsWith("MP_")
        );
        if (loaded.length) {
          // Sort stations with >= 15 readings first (eligible for forecast)
          const sorted = [...loaded].sort((a, b) => {
            const countA = a.records_count || 0;
            const countB = b.records_count || 0;
            if (countB !== countA) return countB - countA;
            return (a.district || "").localeCompare(b.district || "");
          });
          setStationsList(sorted);
        }
      })
      .catch((err) => console.warn("Failed to load stations for forecast:", err));
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

  // Fetch forecast for selected station
  useEffect(() => {
    if (!stationId) return;

    setLoading(true);
    setErrorNotice(null);
    setAvailableObs(null);

    getForecast(stationId, 7)
      .then((json) => {
        if (!json || !json.predictions) {
          throw new Error("No forecast predictions returned.");
        }
        const predictions = json.predictions;
        const formatted = predictions.map((p: number, i: number) => {
          const prev = i > 0 ? predictions[i - 1] : json.latest_level ?? p;
          const diff = Number((p - prev).toFixed(2));
          return {
            day: `Day ${i + 1}`,
            prediction: p,
            diff,
            category: p < 5 ? "Safe" : p < 10 ? "Semi-critical" : p < 20 ? "Critical" : "Over-exploited",
          };
        });
        setData(formatted);
        setTrend(json.trend || "Stable");
        setMeanCategory(json.mean_category || "Safe");
        setLatestLevel(json.latest_level ?? null);
        setAvailableObs(json.available_observations ?? null);
        setRequiredObs(json.required_observations ?? 15);
      })
      .catch((err: any) => {
        console.error("Forecast API error:", err);
        const msg = err.message || "Failed to fetch forecast";
        setErrorNotice(msg.startsWith("⚠️") ? msg : `⚠️ ${msg}`);
        setData([]);
        setTrend("");
        setMeanCategory("");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [stationId]);

  // Predicted summary
  const summary = useMemo(() => {
    if (!data.length) return null;
    const startPred = data[0].prediction;
    const endPred = data[data.length - 1].prediction;
    const delta = Number((endPred - (latestLevel ?? startPred)).toFixed(2));
    
    // In groundwater depth (mbgl):
    // negative delta = depth decreased = water level rose (IMPROVING!)
    // positive delta = depth increased = water dropped deeper (DECLINING!)
    const isImproving = delta < 0;
    const isStable = Math.abs(delta) <= 0.15;

    let catColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (meanCategory.toLowerCase().includes("over")) {
      catColor = "bg-red-100 text-red-800 border-red-200";
    } else if (meanCategory.toLowerCase().includes("crit")) {
      catColor = "bg-orange-100 text-orange-800 border-orange-200";
    } else if (meanCategory.toLowerCase().includes("semi")) {
      catColor = "bg-amber-100 text-amber-800 border-amber-200";
    }

    return {
      startPred,
      endPred,
      delta,
      isImproving,
      isStable,
      catColor,
    };
  }, [data, latestLevel, meanCategory]);

  return (
    <div className="text-slate-900 w-full min-w-0 space-y-4">
      {/* 1. Header & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <Sparkles className="h-5 w-5" />
            </span>
            <span>7-Day Groundwater Forecast (AI Model)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Predicted future groundwater depth using recursive LSTM neural network
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-blue-50 text-blue-800 px-3 py-1 rounded-full border border-blue-200 font-medium">
            LSTM Model (7-Day Ahead)
          </span>
        </div>
      </div>

      {/* 2. Simplified Station & District Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
        {/* District Filter */}
        <div className="sm:col-span-5">
          <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Select District:
          </label>
          <select
            value={selectedDistrict}
            onChange={(e) => {
              setSelectedDistrict(e.target.value);
              const matches = stationsList.filter(
                (s) => e.target.value === "all" || (s.district || "").trim().toLowerCase() === e.target.value.toLowerCase()
              );
              if (matches.length) setStationId(matches[0].station_id);
            }}
            className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-xs focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium"
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
        <div className="sm:col-span-7">
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Select Station for AI Forecast:
          </label>
          <select
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-xs focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium truncate"
          >
            {filteredStations.map((s) => (
              <option key={s.station_id} value={s.station_id}>
                {(s.records_count || 0) >= 15 ? "🟢 " : "🟡 "}
                {s.village || s.name || s.station_id} ({s.district || "MP"}) — {s.records_count || 0} obs
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Simple Summary Cards (Current Level, Forecasted Day 7 Level, Trajectory, Category) */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Current Depth */}
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
              Current Depth
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
              {latestLevel !== null ? `${latestLevel} m` : "—"}
            </div>
            <span className="text-[11px] text-slate-500">last recorded telemetry</span>
          </div>

          {/* 7-Day Predicted Depth */}
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
              Day 7 Forecast
            </span>
            <div className="text-xl sm:text-2xl font-black text-blue-700 mt-0.5">
              {summary.endPred} <span className="text-xs font-semibold text-slate-500">mbgl</span>
            </div>
            <span className="text-[11px] text-slate-500">predicted water depth</span>
          </div>

          {/* Forecast Trend */}
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
              Predicted Trend
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-sm">
              {summary.isStable ? (
                <span className="text-slate-700 flex items-center gap-1">
                  <Minus className="h-4 w-4" /> Stable
                </span>
              ) : summary.isImproving ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" /> Water Rising
                </span>
              ) : (
                <span className="text-red-700 flex items-center gap-1">
                  <TrendingDown className="h-4 w-4" /> Depleting (Falling)
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-500">
              {summary.delta > 0 ? `+${summary.delta}m deeper` : `${summary.delta}m shallower`}
            </span>
          </div>

          {/* Expected Category */}
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
              Expected Status
            </span>
            <div className="mt-1">
              <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${summary.catColor}`}>
                ● {meanCategory}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">CGWB Guidelines</span>
          </div>
        </div>
      )}

      {/* User Friendly Plain Explanation Banner */}
      <div className="flex items-center gap-2 p-2.5 bg-blue-50/70 border border-blue-200/60 rounded-xl text-xs text-blue-900 leading-snug">
        <Info className="h-4 w-4 text-blue-600 shrink-0" />
        <span>
          <b>Simple Guide:</b> This forecast predicts groundwater depth for the next 7 days. <b>Lower meters (&lt; 10m)</b> = safe water table. <b>Above 20m</b> = critical water shortage risk.
        </span>
      </div>

      {/* 4. Chart Display (Styled to match the reference graph) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
        {loading ? (
          <div className="py-20 text-center text-slate-500 font-medium">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            Running LSTM neural network to generate 7-day forecast...
          </div>
        ) : errorNotice ? (
          <div className="py-8 px-5 bg-amber-50/90 border border-amber-300 rounded-xl text-amber-950 text-xs sm:text-sm space-y-2">
            <div className="font-bold text-amber-900 text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-700" />
              <span>Forecast Not Available For This Station</span>
            </div>
            <p className="m-0 text-slate-700">
              {errorNotice}
            </p>
            <p className="text-xs text-slate-600">
              💡 <b>Why:</b> Deep learning models require at least 15 continuous past observations to predict trends reliably without fabricating fake numbers.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setStationId("MP_DHAR_BAGH_BAGH_1")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                View Working Forecast (Bagh Station, Dhar — 151 readings)
              </button>
            </div>
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
                    dataKey="day"
                    tick={{ fill: "#475569", fontSize: 11 }}
                    stroke="#cbd5e1"
                    dy={5}
                  />
                  
                  <YAxis
                    domain={[0, (dataMax: number) => Math.max(25, Math.ceil(dataMax * 1.3))]}
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
                            <div className="font-bold text-slate-800">{d.day} Prediction</div>
                            <div className="text-blue-700 font-semibold">
                              Expected Depth: <b>{val} meters</b>
                            </div>
                            <div className="text-slate-600">
                              Status: <span className="font-medium">{d.category}</span>
                            </div>
                            {d.diff !== 0 && (
                              <div className="text-[11px] text-slate-500">
                                24h Change: {d.diff > 0 ? `+${d.diff}m deeper` : `${d.diff}m shallower`}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  {/* Critical Threshold Benchmark Line (Matching reference design) */}
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

                  {/* Forecast Line with Custom First/Last Labels */}
                  <Line
                    type="monotone"
                    dataKey="prediction"
                    stroke="#0284c7"
                    strokeWidth={2.8}
                    dot={(props: any) => {
                      const { cx, cy, index, payload } = props;
                      const isFirst = index === 0;
                      const isLast = index === data.length - 1;

                      return (
                        <g key={`forecast-dot-${index}`}>
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isFirst || isLast ? 5.5 : 3.5}
                            fill="#0284c7"
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                          {(isFirst || isLast) && (
                            <text
                              x={cx}
                              y={cy - 10}
                              textAnchor="middle"
                              fill="#0369a1"
                              fontSize={11}
                              fontWeight="bold"
                            >
                              {payload.prediction}m
                            </text>
                          )}
                        </g>
                      );
                    }}
                    activeDot={{ r: 6, fill: "#0369a1", stroke: "#fff", strokeWidth: 2 }}
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
                        <th className="py-2 px-3">Horizon</th>
                        <th className="py-2 px-3">Predicted Level (mbgl)</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3">Daily Trajectory</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 font-semibold text-slate-800">{row.day}</td>
                          <td className="py-2 px-3 font-bold text-blue-700">{row.prediction} m</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                row.prediction < 5
                                  ? "bg-emerald-100 text-emerald-800"
                                  : row.prediction < 10
                                  ? "bg-amber-100 text-amber-800"
                                  : row.prediction < 20
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {row.category}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {row.diff < 0 ? (
                              <span className="text-emerald-700 font-medium">{row.diff}m (Rising)</span>
                            ) : row.diff > 0 ? (
                              <span className="text-red-700 font-medium">+{row.diff}m (Depleting)</span>
                            ) : (
                              "Stable"
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
            Select an MP station above to generate a 7-day forecast.
          </div>
        )}
      </div>
    </div>
  );
}
