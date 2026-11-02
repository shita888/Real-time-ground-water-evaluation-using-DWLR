import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Droplets, TrendingUp, TrendingDown, AlertTriangle, MapPin, Search, Navigation, Clock, Satellite } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/ui/header";
import AppSidebar from "@/components/ui/AppSidebar";
import HistoryViewer from "@/components/HistoryViewer";
import ForecastViewer from "@/components/ForecastViewer";
import Footer from "@/components/ui/footer";
import {
  getStations,
  getRecentStations,
  getStatistics,
  getNearbyStations,
} from "@/services/api";

interface StatsCardProps {
  icon: React.ElementType;
  title: string;
  value: string;
  trend: 'up' | 'down';
  status: string;
}

const StatsCard = ({ icon: Icon, title, value, trend, status }: StatsCardProps) => (
  <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm hover:shadow-xl transition-all duration-300 ring-1 ring-slate-200/50 text-slate-900 w-full min-w-0 overflow-hidden">
    <CardContent className="p-4 sm:p-5 min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg shrink-0">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div className="min-w-0 truncate">
            <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">{title}</p>
            <p className="text-base sm:text-xl font-bold text-slate-900 truncate">{value}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
          {trend === 'up' ? (
            <div className="p-1 rounded-full bg-emerald-50 ring-1 ring-emerald-200">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600" />
            </div>
          ) : (
            <div className="p-1 rounded-full bg-red-50 ring-1 ring-red-200">
              <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600" />
            </div>
          )}
          <Badge variant={status === 'critical' || status === 'over-exploited' ? 'destructive' : status === 'semi-critical' || status === 'low' ? 'secondary' : 'default'} className="text-[11px] sm:text-xs">
            {status}
          </Badge>
        </div>
      </div>
    </CardContent>
  </Card>
);

interface StationCardProps {
  station: {
    id: string;
    name?: string;
    location: string;
    district?: string;
    block?: string;
    village?: string;
    level: number | null;
    status: string;
    trend: string;
    trend_direction?: 'up' | 'down';
  };
}

const StationCard = ({ station }: StationCardProps) => {
  const isUp = station.trend_direction === 'up' || ['improving', 'rising', 'up'].includes(station.trend.toLowerCase());
  const statusLower = (station.status || 'normal').toLowerCase();

  return (
    <Card className="border-0 shadow-md bg-white/95 backdrop-blur-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 ring-1 ring-slate-200/50 text-slate-900 w-full min-w-0 overflow-hidden">
      <CardContent className="p-4 min-w-0 overflow-hidden">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center space-x-2 overflow-hidden min-w-0">
            <div className="p-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 shrink-0">
              <MapPin className="h-3 w-3 text-white" />
            </div>
            <span className="font-semibold text-xs sm:text-sm text-slate-900 truncate" title={station.name || station.id}>
              {station.village || station.name || station.id}
            </span>
          </div>
          <Badge 
            variant={
              statusLower === 'critical' || statusLower === 'over-exploited' ? 'destructive' : 
              statusLower === 'semi-critical' || statusLower === 'low' ? 'secondary' : 
              'default'
            }
            className="capitalize text-[11px] sm:text-xs shrink-0"
          >
            {station.status || 'safe'}
          </Badge>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 mb-3 truncate" title={station.location}>
          {station.location || (station.district ? `${station.district}, MP` : 'Madhya Pradesh')}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-base sm:text-lg font-bold text-slate-900 truncate">
            {station.level !== null && station.level !== undefined ? `${station.level}m` : 'N/A'}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-slate-600 capitalize">{station.trend}</span>
            {isUp ? (
              <div className="p-1 rounded-full bg-emerald-50 ring-1 ring-emerald-200" title="Trend: Improving">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600" />
              </div>
            ) : (
              <div className="p-1 rounded-full bg-red-50 ring-1 ring-red-200" title="Trend: Declining">
                <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600" />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function GroundwaterDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationData, setLocationData] = useState<any>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [, setLastUpdate] = useState(new Date());

  // Real backend MP dataset states
  const [recentStations, setRecentStations] = useState<any[]>([]);
  const [nearbyStations, setNearbyStations] = useState<any[]>([]);
  const [allStations, setAllStations] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loadingRecent, setLoadingRecent] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real Madhya Pradesh dataset records and statistics on mount
  useEffect(() => {
    let isMounted = true;

    // 1. Fetch recent MP stations
    getRecentStations(8)
      .then((data) => {
        if (!isMounted) return;
        if (data.stations && data.stations.length > 0) {
          setRecentStations(data.stations);
        }
      })
      .catch((err) => console.error("Error fetching recent stations:", err))
      .finally(() => {
        if (isMounted) setLoadingRecent(false);
      });

    // 2. Fetch MP aggregate statistics
    getStatistics()
      .then((data) => {
        if (!isMounted) return;
        if (data) setStatistics(data);
      })
      .catch((err) => console.error("Error fetching statistics:", err));

    // 3. Fetch nearby distinct MP stations across diverse districts (Indore, Bhopal, Jabalpur, etc.)
    getNearbyStations(undefined, undefined, 3)
      .then((data) => {
        if (!isMounted) return;
        if (data.stations && data.stations.length > 0) {
          setNearbyStations(data.stations);
        }
      })
      .catch((err) => console.error("Error fetching nearby stations:", err));

    // 4. Fetch all MP stations for search and map
    getStations()
      .then((data) => {
        if (!isMounted) return;
        const list = data.stations || [];
        setAllStations(list);
      })
      .catch((err) => console.error("Error fetching stations:", err));

    return () => {
      isMounted = false;
    };
  }, []);

  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const userLat = position.coords.latitude;
          const userLon = position.coords.longitude;

          setUserLocation({ lat: userLat, lng: userLon });
          setLocationPermission("granted");

          // Query backend nearby endpoint which guarantees distinct MP districts
          try {
            const nearbyJson = await getNearbyStations(userLat, userLon, 3);
            if (nearbyJson && nearbyJson.stations && nearbyJson.stations.length > 0) {
                setNearbyStations(nearbyJson.stations);
                const closest = nearbyJson.stations[0];
                setLocationData({
                  currentLevel: closest.level !== null && closest.level !== undefined ? `${closest.level}` : "N/A",
                  lastUpdated: closest.latest_date || "Latest dataset record",
                  coordinates: closest.lat && closest.lng
                    ? `${Number(closest.lat).toFixed(4)}°N, ${Number(closest.lng).toFixed(4)}°E`
                    : "N/A",
                  altitude: 480,
                  nearestStation: closest.location || closest.name || closest.id,
                  distance: closest.distance !== undefined ? `${closest.distance}` : "12.0",
                });
                return;
              }
          } catch (e) {
            console.error("Error fetching nearby stations with coords:", e);
          }

          // Fallback if backend /stations/nearby fails
          const stations = allStations.length ? allStations : (await getStations().catch(() => ({ stations: [] }))).stations || [];
          if (!stations.length) return;

          let nearest = stations[0];
          let minDist = Infinity;
          stations.forEach((s: any) => {
            if (typeof s.lat === 'number' && typeof s.lon === 'number') {
              const dist = haversine(userLat, userLon, s.lat, s.lon);
              if (dist < minDist) {
                minDist = dist;
                nearest = s;
              }
            }
          });

          const locParts = [nearest.village, nearest.block, nearest.district].filter(Boolean);
          const locStr = locParts.length ? locParts.join(", ") : (nearest.name || nearest.station_id);

          setLocationData({
            currentLevel: nearest.latest_level !== undefined && nearest.latest_level !== null ? Number(nearest.latest_level).toFixed(2) : "N/A",
            lastUpdated: nearest.latest_date || "Latest dataset record",
            coordinates: nearest.lat && nearest.lon
              ? `${Number(nearest.lat).toFixed(4)}°N, ${Number(nearest.lon).toFixed(4)}°E`
              : "N/A",
            altitude: 480,
            nearestStation: locStr,
            distance: minDist.toFixed(1),
          });
        },
        () => {
          setLocationPermission("denied");
          // If denied, fallback to representative MP station
          if (allStations.length > 0) {
            const defaultStation = allStations[0];
            const locParts = [defaultStation.village, defaultStation.block, defaultStation.district].filter(Boolean);
            const locStr = locParts.length ? locParts.join(", ") : (defaultStation.name || defaultStation.station_id);
            setLocationData({
              currentLevel: defaultStation.latest_level !== undefined && defaultStation.latest_level !== null ? Number(defaultStation.latest_level).toFixed(2) : "N/A",
              lastUpdated: defaultStation.latest_date || "Latest dataset record",
              coordinates: defaultStation.lat && defaultStation.lon
                ? `${Number(defaultStation.lat).toFixed(4)}°N, ${Number(defaultStation.lon).toFixed(4)}°E`
                : "23.4°N, 78.5°E",
              altitude: 480,
              nearestStation: locStr,
              distance: "General Area",
            });
          }
        }
      );
    }
  };

  // Filter stations based on search query
  const filteredStations = (recentStations.length ? recentStations : allStations.slice(0, 8)).filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.id && s.id.toLowerCase().includes(q)) ||
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.location && s.location.toLowerCase().includes(q)) ||
      (s.district && s.district.toLowerCase().includes(q)) ||
      (s.block && s.block.toLowerCase().includes(q)) ||
      (s.village && s.village.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex flex-col text-slate-900">
      <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <div className="flex flex-1 w-full min-w-0">
        <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Title Section */}
          <div className="max-w-7xl mx-auto w-full">
            <div className="text-center space-y-2 mb-6">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent py-1">
                JalDrishti — {t('groundwater_monitoring')} (Madhya Pradesh)
              </h1>
              <p className="text-slate-700 text-xs sm:text-sm md:text-base font-medium max-w-3xl mx-auto">
                Real-Time Digital Water Level Recorder (DWLR) telemetry telemetry across 55 districts
              </p>
            </div>

            {/* Main Content */}
            <div className="space-y-6 min-w-0">
          {/* Live Location Section */}
          <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm ring-1 ring-slate-200/50 text-slate-900 w-full min-w-0 overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-3 text-slate-900 truncate">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg shrink-0">
                    <Navigation className="h-5 w-5 text-white" />
                  </div>
                  <span>{t('live_location_data')}</span>
                </CardTitle>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full ring-1 ring-slate-200 font-medium w-fit shrink-0">
                  <Clock className="h-4 w-4 text-slate-600 shrink-0" />
                  <span>Updated {locationData?.lastUpdated || "—"}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {locationPermission === 'pending' && (
                <div className="text-center py-8">
                  <Button 
                    onClick={requestLocation} 
                    className="mb-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg px-8 py-3 text-base sm:text-lg font-semibold"
                  >
                    <Satellite className="h-5 w-5 mr-2" />
                    {t('enable_location')}
                  </Button>
                  <p className="text-slate-700 font-medium text-sm sm:text-base">
                    Find nearest Madhya Pradesh DWLR groundwater monitoring station
                  </p>
                </div>
              )}
              
              {locationPermission === 'denied' && (
                <div className="text-center py-8">
                  <p className="text-slate-700 mb-4 font-medium text-sm sm:text-base">
                    Location access denied. Showing representative Madhya Pradesh station data.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={requestLocation}
                    className="border-2 border-blue-400 text-blue-700 hover:bg-blue-50 font-semibold"
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              )}

              {(locationPermission === 'granted' || locationData) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0">
                  <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-100 ring-1 ring-blue-200 shadow-sm min-w-0">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 w-fit mx-auto mb-3 shadow-lg">
                      <Droplets className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 truncate">{locationData?.currentLevel}m</p>
                    <p className="text-xs text-slate-700 font-semibold truncate">Current Water Level</p>
                  </div>
                  <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 ring-1 ring-emerald-200 shadow-sm min-w-0">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 w-fit mx-auto mb-3 shadow-lg">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-sm font-bold text-slate-900 truncate" title={locationData?.nearestStation}>
                      {locationData?.nearestStation}
                    </p>
                    <p className="text-xs text-slate-700 font-semibold truncate">Nearest MP Station ({locationData?.distance}km)</p>
                  </div>
                  <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-100 ring-1 ring-purple-200 shadow-sm min-w-0">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 w-fit mx-auto mb-3 shadow-lg">
                      <Navigation className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-xs font-bold text-slate-900 truncate">{locationData?.coordinates}</p>
                    <p className="text-xs text-slate-700 font-semibold truncate">Coordinates</p>
                  </div>
                  <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-orange-50 to-red-100 ring-1 ring-orange-200 shadow-sm min-w-0">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 w-fit mx-auto mb-3 shadow-lg">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-sm font-bold text-slate-900 truncate">{locationData?.altitude}m</p>
                    <p className="text-xs text-slate-700 font-semibold truncate">Plateau Altitude</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Nearby Stations */}
          {nearbyStations.length > 0 && (
            <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm ring-1 ring-slate-200/50 text-slate-900 w-full min-w-0 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-3 text-slate-900">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shrink-0">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <span>{t('nearby_stations')} (Madhya Pradesh)</span>
                </CardTitle>
                <p className="text-xs text-slate-600 mt-1">Groundwater stations across representative Madhya Pradesh districts</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full min-w-0">
                  {nearbyStations.map((station) => (
                    <div key={station.id} className="p-4 rounded-xl ring-1 ring-slate-200 bg-white/90 backdrop-blur-sm hover:shadow-md transition-all duration-300 min-w-0 overflow-hidden">
                      <div className="flex items-center justify-between mb-3 gap-2">
                        <Badge variant={station.status === 'critical' || station.status === 'over-exploited' ? 'destructive' : station.status === 'semi-critical' || station.status === 'low' ? 'secondary' : 'default'} className="capitalize font-semibold text-xs shrink-0">
                          {station.status}
                        </Badge>
                        <span className="text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded-full font-medium ring-1 ring-slate-200 truncate">
                          {station.distance !== undefined ? `${station.distance}km away` : (station.district || 'MP')}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm mb-1 text-slate-900 truncate" title={station.name || station.id}>
                        {station.name || station.id}
                      </h4>
                      <p className="text-xs text-slate-600 mb-3 truncate" title={station.location}>{station.location}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold text-slate-900">
                          {station.level !== null && station.level !== undefined ? `${station.level}m` : 'N/A'}
                        </span>
                        {station.trend_direction === 'up' ? (
                          <div className="p-1.5 rounded-full bg-emerald-50 ring-1 ring-emerald-200" title="Trend: Improving">
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                          </div>
                        ) : (
                          <div className="p-1.5 rounded-full bg-red-50 ring-1 ring-red-200" title="Trend: Declining">
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 w-full min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-500 pointer-events-none" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Madhya Pradesh stations by district, block, or village..."
                className="w-full pl-12 pr-4 py-3 border border-slate-300 shadow-md bg-white text-slate-900 placeholder:text-slate-500 text-sm sm:text-base ring-1 ring-slate-200/50 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full min-w-0">
            <StatsCard 
              icon={Droplets}
              title={t('active_stations')}
              value={statistics?.active_stations ? statistics.active_stations.toLocaleString() : "2,452"}
              trend="up"
              status="normal"
            />
            <StatsCard 
              icon={TrendingUp}
              title={t('avg_water_level')}
              value={statistics?.avg_water_level || "11.1m"}
              trend="up"
              status="normal"
            />
            <StatsCard 
              icon={AlertTriangle}
              title={t('critical_stations')}
              value={statistics?.critical_stations ? statistics.critical_stations.toLocaleString() : "1,254"}
              trend="down"
              status="critical"
            />
            <StatsCard 
              icon={TrendingUp}
              title={t('recharge_rate')}
              value={statistics?.recharge_rate || "2.8m/yr"}
              trend="up"
              status="normal"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full min-w-0">
            <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm ring-1 ring-slate-200/50 text-slate-900 w-full min-w-0 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg sm:text-xl font-bold text-slate-900 truncate">Historical Data (Madhya Pradesh)</CardTitle>
                <p className="text-xs text-slate-600 mt-1">Historical water level observations from MP DWLR telemetry</p>
              </CardHeader>
              <CardContent className="p-2 sm:p-4 min-w-0 overflow-hidden">
                <HistoryViewer />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm ring-1 ring-slate-200/50 text-slate-900 w-full min-w-0 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg sm:text-xl font-bold text-slate-900 truncate">Forecast Data (Madhya Pradesh)</CardTitle>
                <p className="text-xs text-slate-600 mt-1">7-day LSTM water table trajectory prediction</p>
              </CardHeader>
              <CardContent className="p-2 sm:p-4 min-w-0 overflow-hidden">
                <ForecastViewer />
              </CardContent>
            </Card>
          </div>

          {/* Recent Stations */}
          <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm ring-1 ring-slate-200/50 text-slate-900 w-full min-w-0 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-lg sm:text-xl font-bold text-slate-900 truncate">Recent Station Updates</CardTitle>
                <p className="text-xs text-slate-600 mt-1">Live updates from Madhya Pradesh monitoring stations</p>
              </div>
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 font-semibold shrink-0">
                MP Data Only
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4 min-w-0 overflow-hidden">
              {loadingRecent ? (
                <div className="py-12 text-center text-slate-600 font-medium">Loading recent station updates...</div>
              ) : filteredStations.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0">
                  {filteredStations.map((station) => (
                    <StationCard key={station.id} station={station} />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-600 bg-slate-50 rounded-lg font-medium">
                  No Madhya Pradesh stations found matching &ldquo;{searchQuery}&rdquo;.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full min-w-0">
            <Button 
              onClick={() => navigate("/map")}
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg py-3 text-base sm:text-lg font-semibold"
            >
              <MapPin className="h-5 w-5 mr-2" />
              View Madhya Pradesh Station Map
            </Button>

            <Button 
              variant="secondary"
              onClick={() => navigate("/dashboard")}
              className="flex-1 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-800 hover:from-slate-200 hover:to-slate-300 shadow-lg py-3 text-base sm:text-lg font-semibold ring-1 ring-slate-300"
            >
              <TrendingUp className="h-5 w-5 mr-2" />
              Refresh Dashboard
            </Button>
          </div>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}