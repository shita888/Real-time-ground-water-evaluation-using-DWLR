import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import AppSidebar from "@/components/ui/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Search,
  Filter,
  MapPin,
  TrendingDown,
  TrendingUp,
  Droplets,
  Layers,
  ArrowUpDown,
  ExternalLink,
} from "lucide-react";
import { getStations } from "@/services/api";

interface Station {
  station_id: string;
  name?: string;
  district?: string;
  block?: string;
  village?: string;
  latest_level?: number | null;
  latest_status?: string;
  latest_trend?: string;
  records_count?: number;
  lat?: number;
  lon?: number;
}

interface DistrictSummary {
  name: string;
  totalStations: number;
  avgWaterLevel: number;
  safeCount: number;
  semiCriticalCount: number;
  criticalCount: number;
  overExploitedCount: number;
  dominantStatus: string;
  topStations: Station[];
}

const DistrictsDataPage: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "stations" | "level">("stations");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getStations()
      .then((data) => {
        if (!isMounted) return;
        const loaded: Station[] = (data.stations || []).filter(
          (s: Station) => s.station_id && s.station_id.startsWith("MP_")
        );
        setStations(loaded);
      })
      .catch((err) => console.error("Error fetching stations for district page:", err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Aggregate stations by District
  const districtSummaries: DistrictSummary[] = useMemo(() => {
    if (!stations.length) return [];

    const map = new Map<string, Station[]>();

    stations.forEach((s) => {
      const dName = (s.district || "Unassigned").trim();
      if (!map.has(dName)) {
        map.set(dName, []);
      }
      map.get(dName)!.push(s);
    });

    const summaries: DistrictSummary[] = [];

    map.forEach((distStations, distName) => {
      let validLevelSum = 0;
      let validLevelCount = 0;
      let safe = 0;
      let semi = 0;
      let crit = 0;
      let over = 0;

      distStations.forEach((s) => {
        if (typeof s.latest_level === "number" && !isNaN(s.latest_level)) {
          validLevelSum += s.latest_level;
          validLevelCount++;
        }

        const st = (s.latest_status || "").toLowerCase();
        if (st === "safe") safe++;
        else if (st === "semi-critical") semi++;
        else if (st === "critical") crit++;
        else if (st === "over-exploited") over++;
        else safe++;
      });

      const avgLevel = validLevelCount > 0 ? validLevelSum / validLevelCount : 0;

      // Determine dominant status
      let dominant = "Safe";
      if (over > 0 && over >= crit) dominant = "Over-exploited";
      else if (crit >= semi && crit >= safe) dominant = "Critical";
      else if (semi >= safe) dominant = "Semi-critical";

      summaries.push({
        name: distName,
        totalStations: distStations.length,
        avgWaterLevel: parseFloat(avgLevel.toFixed(2)),
        safeCount: safe,
        semiCriticalCount: semi,
        criticalCount: crit,
        overExploitedCount: over,
        dominantStatus: dominant,
        topStations: distStations.slice(0, 5),
      });
    });

    return summaries;
  }, [stations]);

  // Filter & Sort
  const filteredDistricts = useMemo(() => {
    return districtSummaries
      .filter((d) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          if (!d.name.toLowerCase().includes(q)) return false;
        }

        if (statusFilter !== "all") {
          const sf = statusFilter.toLowerCase();
          if (sf === "safe" && d.safeCount === 0) return false;
          if (sf === "semi-critical" && d.semiCriticalCount === 0) return false;
          if (sf === "critical" && d.criticalCount === 0) return false;
          if (sf === "over-exploited" && d.overExploitedCount === 0) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === "name") {
          diff = a.name.localeCompare(b.name);
        } else if (sortBy === "stations") {
          diff = a.totalStations - b.totalStations;
        } else if (sortBy === "level") {
          diff = a.avgWaterLevel - b.avgWaterLevel;
        }
        return sortOrder === "asc" ? diff : -diff;
      });
  }, [districtSummaries, searchQuery, statusFilter, sortBy, sortOrder]);

  const toggleSort = (col: "name" | "stations" | "level") => {
    if (sortBy === col) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortOrder("desc");
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("over-exploited")) {
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200 capitalize">Over-exploited</Badge>;
    }
    if (s.includes("critical")) {
      return <Badge className="bg-red-100 text-red-800 border-red-200 capitalize">Critical</Badge>;
    }
    if (s.includes("semi")) {
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 capitalize">Semi-Critical</Badge>;
    }
    return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 capitalize">Safe</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex flex-col text-slate-900">
      <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      <div className="flex flex-1 w-full min-w-0">
        <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200">
                    <Building2 className="h-3 w-3 mr-1 inline" /> Regional Telemetry
                  </Badge>
                  <Badge variant="outline" className="border-slate-300 text-slate-600">
                    55 Districts of Madhya Pradesh
                  </Badge>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
                  District-Wise Groundwater Data
                </h1>
                <p className="text-slate-600 text-xs sm:text-sm md:text-base mt-1">
                  Aggregated telemetry metrics, critical zone classifications, and monitoring density across all districts in Madhya Pradesh.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => navigate("/map")}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-sm text-xs sm:text-sm font-semibold"
                >
                  <MapPin className="h-4 w-4 mr-1.5" />
                  View All on Interactive Map
                </Button>
              </div>
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-0 shadow-sm bg-white ring-1 ring-slate-200/60">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-600">Covered Districts</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {loading ? "..." : districtSummaries.length}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white ring-1 ring-slate-200/60">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-600">Total DWLR Stations</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {loading ? "..." : stations.length.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-600">
                    <Droplets className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white ring-1 ring-slate-200/60">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-600">Critical Stations</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">
                      {loading
                        ? "..."
                        : districtSummaries.reduce((acc, d) => acc + d.criticalCount, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-red-50 text-red-600">
                    <TrendingDown className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white ring-1 ring-slate-200/60">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-600">Safe Stations</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                      {loading
                        ? "..."
                        : districtSummaries.reduce((acc, d) => acc + d.safeCount, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search & Filters */}
            <Card className="border-0 shadow-sm bg-white ring-1 ring-slate-200/60">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                  <div className="relative flex-1 w-full">
                    <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search district name (e.g., Indore, Bhopal, Dhar, Ujjain)..."
                      className="pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border-slate-200 rounded-xl w-full"
                    />
                  </div>

                  {/* Filter by status */}
                  <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                    <span className="text-xs font-semibold text-slate-500 uppercase px-1 flex items-center gap-1">
                      <Filter className="h-3 w-3" /> Status:
                    </span>
                    {["all", "critical", "semi-critical", "safe"].map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-lg capitalize transition-all ${
                          statusFilter === st
                            ? "bg-[#0A3D62] text-white shadow-xs"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* District Table / Data View */}
            <Card className="border-0 shadow-lg bg-white ring-1 ring-slate-200/60 overflow-hidden">
              <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50/60 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm sm:text-base font-bold text-slate-900">
                    District Telemetry Breakdown
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Showing {filteredDistricts.length} of {districtSummaries.length} districts in Madhya Pradesh
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="py-16 text-center text-slate-600 font-medium">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    Loading Madhya Pradesh district groundwater records...
                  </div>
                ) : filteredDistricts.length === 0 ? (
                  <div className="py-12 text-center text-slate-600 font-medium">
                    No districts found matching &ldquo;{searchQuery}&rdquo;.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-slate-100/80 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th
                            onClick={() => toggleSort("name")}
                            className="py-3 px-4 cursor-pointer hover:text-slate-900"
                          >
                            <div className="flex items-center gap-1">
                              District <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </th>
                          <th
                            onClick={() => toggleSort("stations")}
                            className="py-3 px-4 cursor-pointer hover:text-slate-900"
                          >
                            <div className="flex items-center gap-1">
                              DWLR Stations <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </th>
                          <th
                            onClick={() => toggleSort("level")}
                            className="py-3 px-4 cursor-pointer hover:text-slate-900"
                          >
                            <div className="flex items-center gap-1">
                              Avg Water Level (mbgl) <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </th>
                          <th className="py-3 px-4">Status Distribution</th>
                          <th className="py-3 px-4">Dominant Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredDistricts.map((d) => (
                          <tr key={d.name} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-900">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                                <span>{d.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-700">
                              {d.totalStations} stations
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {d.avgWaterLevel > 0 ? `${d.avgWaterLevel} m` : "N/A"}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 text-[11px]">
                                {d.safeCount > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                                    {d.safeCount} Safe
                                  </span>
                                )}
                                {d.semiCriticalCount > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">
                                    {d.semiCriticalCount} Semi
                                  </span>
                                )}
                                {d.criticalCount > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-medium">
                                    {d.criticalCount} Crit
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">{getStatusBadge(d.dominantStatus)}</td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  to={`/dashboard?search=${encodeURIComponent(d.name)}`}
                                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 no-underline inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                                >
                                  Dashboard <ExternalLink className="h-3 w-3" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default DistrictsDataPage;

