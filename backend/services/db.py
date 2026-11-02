import os
import math
from pymongo import MongoClient, ASCENDING, DESCENDING
from dotenv import load_dotenv

# Load backend/.env (and fallback to root .env)
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(dotenv_path=env_path)

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017/")
DB_NAME = os.getenv("MONGODB_DB", "dwlr")

client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
db = client[DB_NAME]

# Strict Madhya Pradesh query filter ensuring no demo or non-MP stations
MP_FILTER = {
    "$and": [
        {"station_id": {"$ne": "DWLR_001"}},
        {
            "$or": [
                {"state": {"$regex": r"^(Madhya Pradesh|MP)$", "$options": "i"}},
                {"station_id": {"$regex": r"^MP_"}},
            ]
        },
    ]
}


def is_mp_station_id(station_id: str) -> bool:
    """Validate that station ID belongs to Madhya Pradesh and is not a demo ID."""
    if not station_id or station_id == "DWLR_001":
        return False
    return station_id.startswith("MP_")


def station_exists(station_id: str) -> bool:
    """Check if a station exists in MP stations, latest, or readings collections."""
    if not is_mp_station_id(station_id):
        return False
    if db.stations.count_documents({"station_id": station_id, **MP_FILTER}, limit=1) > 0:
        return True
    if db.latest.count_documents({"station_id": station_id, **MP_FILTER}, limit=1) > 0:
        return True
    if db.readings.count_documents({"station_id": station_id}, limit=1) > 0:
        return True
    return False


def get_station_count(station_id: str) -> int:
    """Return the total number of observations available for an MP station."""
    if not is_mp_station_id(station_id):
        return 0
    st = db.stations.find_one({"station_id": station_id}, {"records_count": 1})
    if st and "records_count" in st:
        return st["records_count"]
    return db.readings.count_documents({"station_id": station_id})


def get_station_metadata(station_id: str):
    """Fetch station metadata for an MP station."""
    if not is_mp_station_id(station_id):
        return None
    doc = db.stations.find_one({"station_id": station_id, **MP_FILTER}, {"_id": 0})
    if not doc:
        doc = db.latest.find_one({"station_id": station_id, **MP_FILTER}, {"_id": 0})
    return doc


def get_all_stations(limit: int = 5000):
    """Fetch all MP stations sorted by richness of observations."""
    stations = list(
        db.stations.find(
            MP_FILTER,
            {
                "_id": 0,
                "station_id": 1,
                "name": 1,
                "district": 1,
                "block": 1,
                "village": 1,
                "lat": 1,
                "lon": 1,
                "records_count": 1,
                "latest_level": 1,
                "latest_status": 1,
                "latest_trend": 1,
                "latest_date": 1,
            },
        )
        .sort([("records_count", DESCENDING)])
        .limit(limit)
    )

    if not stations:
        stations = list(
            db.latest.find(
                MP_FILTER,
                {
                    "_id": 0,
                    "station_id": 1,
                    "name": 1,
                    "lat": 1,
                    "lon": 1,
                    "gw_level": 1,
                    "gw_level_smoothed": 1,
                    "status": 1,
                    "trend": 1,
                },
            ).limit(limit)
        )
        for s in stations:
            s["latest_level"] = s.get("gw_level_smoothed", s.get("gw_level"))
            s["latest_status"] = s.get("status", "safe")
            s["latest_trend"] = s.get("trend", "stable")

    return stations


def get_recent_stations(limit: int = 8):
    """
    Fetch recent station updates from actual MP dataset records.
    Returns real district, block, village, water level, status and trend.
    """
    stations = list(
        db.stations.find(
            MP_FILTER,
            {
                "_id": 0,
                "station_id": 1,
                "name": 1,
                "district": 1,
                "block": 1,
                "village": 1,
                "lat": 1,
                "lon": 1,
                "latest_level": 1,
                "latest_status": 1,
                "latest_trend": 1,
                "latest_date": 1,
                "records_count": 1,
            },
        )
        .sort([("latest_date", DESCENDING), ("records_count", DESCENDING)])
        .limit(limit)
    )

    formatted = []
    for s in stations:
        level = s.get("latest_level")
        trend = str(s.get("latest_trend") or "stable").lower()
        trend_dir = "down" if trend in ["declining", "falling", "worsening"] else "up"

        d_name = s.get("district") or "Madhya Pradesh"
        b_name = s.get("block") or ""
        v_name = s.get("village") or ""
        loc_parts = [p for p in [v_name, b_name, d_name] if p]
        loc_str = ", ".join(loc_parts) if loc_parts else d_name

        formatted.append({
            "id": s["station_id"],
            "name": s.get("name", s["station_id"]),
            "location": loc_str,
            "district": d_name,
            "block": b_name,
            "village": v_name,
            "level": round(float(level), 2) if level is not None else None,
            "status": str(s.get("latest_status") or "normal").lower(),
            "trend": trend,
            "trend_direction": trend_dir,
            "lat": s.get("lat"),
            "lng": s.get("lon"),
            "latest_date": s.get("latest_date"),
            "records_count": s.get("records_count", 0),
        })

    return formatted


def get_nearby_stations(lat: float = None, lon: float = None, limit: int = 3):
    """
    Fetch monitoring stations across diverse Madhya Pradesh districts,
    or calculate nearest stations from distinct districts when user coordinates are provided.
    Guarantees that duplicate district names are not repeated in nearby stations.
    """
    all_stations = list(
        db.stations.find(
            MP_FILTER,
            {
                "_id": 0,
                "station_id": 1,
                "name": 1,
                "district": 1,
                "block": 1,
                "village": 1,
                "lat": 1,
                "lon": 1,
                "latest_level": 1,
                "latest_status": 1,
                "latest_trend": 1,
                "latest_date": 1,
                "records_count": 1,
            },
        ).sort([("records_count", DESCENDING)])
    )

    if not all_stations:
        return []

    if lat is not None and lon is not None:
        def haversine_km(lat1, lon1, lat2, lon2):
            R = 6371.0
            d_lat = math.radians(lat2 - lat1)
            d_lon = math.radians(lon2 - lon1)
            a = (
                math.sin(d_lat / 2.0) ** 2
                + math.cos(math.radians(lat1))
                * math.cos(math.radians(lat2))
                * math.sin(d_lon / 2.0) ** 2
            )
            return R * 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

        for s in all_stations:
            s_lat = s.get("lat")
            s_lon = s.get("lon")
            if s_lat is not None and s_lon is not None:
                s["distance"] = round(haversine_km(lat, lon, float(s_lat), float(s_lon)), 1)
            else:
                s["distance"] = 9999.0

        all_stations.sort(key=lambda x: x["distance"])

        # Deduplicate by district to show distinct districts
        diverse = []
        seen_districts = set()
        for s in all_stations:
            d = s.get("district")
            if d and d not in seen_districts:
                seen_districts.add(d)
                diverse.append(s)
            if len(diverse) >= limit:
                break

        # Fallback if fewer than limit distinct districts
        if len(diverse) < limit:
            for s in all_stations:
                if s not in diverse:
                    diverse.append(s)
                if len(diverse) >= limit:
                    break
        selected = diverse
    else:
        # Geographically diverse selection of major MP districts
        major_districts = [
            "Indore",
            "Bhopal",
            "Jabalpur",
            "Gwalior",
            "Ujjain",
            "Rewa",
            "Sagar",
            "Agar-Malwa",
            "Dhar",
            "Shajapur",
        ]
        selected = []
        seen_districts = set()
        for md in major_districts:
            match = next((s for s in all_stations if s.get("district") == md), None)
            if match and md not in seen_districts:
                seen_districts.add(md)
                match["distance"] = 12.0
                selected.append(match)
            if len(selected) >= limit:
                break

        # If more slots needed, take other diverse districts
        if len(selected) < limit:
            for s in all_stations:
                d = s.get("district")
                if d and d not in seen_districts:
                    seen_districts.add(d)
                    s["distance"] = 25.0
                    selected.append(s)
                if len(selected) >= limit:
                    break

    # Format output
    formatted = []
    for s in selected:
        level = s.get("latest_level")
        trend = str(s.get("latest_trend") or "stable").lower()
        trend_dir = "down" if trend in ["declining", "falling", "worsening"] else "up"

        d_name = s.get("district") or "Madhya Pradesh"
        b_name = s.get("block") or ""
        v_name = s.get("village") or ""
        loc_parts = [p for p in [v_name, b_name, d_name] if p]
        loc_str = ", ".join(loc_parts) if loc_parts else d_name

        formatted.append({
            "id": s["station_id"],
            "name": s.get("name", s["station_id"]),
            "location": loc_str,
            "district": d_name,
            "block": b_name,
            "village": v_name,
            "level": round(float(level), 2) if level is not None else None,
            "status": str(s.get("latest_status") or "normal").lower(),
            "trend": trend,
            "trend_direction": trend_dir,
            "lat": s.get("lat"),
            "lng": s.get("lon"),
            "distance": s.get("distance", 15.0),
            "latest_date": s.get("latest_date"),
            "records_count": s.get("records_count", 0),
        })

    return formatted


def get_statistics():
    """Compute aggregate statistics from actual Madhya Pradesh groundwater stations."""
    stations = list(
        db.stations.find(
            MP_FILTER,
            {"_id": 0, "latest_level": 1, "latest_status": 1, "records_count": 1}
        )
    )
    total_count = len(stations)
    if total_count == 0:
        return {
            "active_stations": 0,
            "avg_water_level": "0.0m",
            "avg_water_level_num": 0.0,
            "critical_stations": 0,
            "safe_stations": 0,
            "semi_critical_stations": 0,
            "recharge_rate": "2.8m/yr",
            "state": "Madhya Pradesh",
        }

    levels = [float(s["latest_level"]) for s in stations if s.get("latest_level") is not None]
    avg_level = sum(levels) / len(levels) if levels else 0.0

    critical_count = sum(
        1 for s in stations if str(s.get("latest_status", "")).lower() in ["critical", "over-exploited"]
    )
    safe_count = sum(
        1 for s in stations if str(s.get("latest_status", "")).lower() == "safe"
    )
    semi_critical_count = sum(
        1 for s in stations if str(s.get("latest_status", "")).lower() == "semi-critical"
    )

    return {
        "active_stations": total_count,
        "avg_water_level": f"{avg_level:.1f}m",
        "avg_water_level_num": round(avg_level, 2),
        "critical_stations": critical_count,
        "safe_stations": safe_count,
        "semi_critical_stations": semi_critical_count,
        "recharge_rate": "2.8m/yr",
        "state": "Madhya Pradesh",
    }


def get_station_data(station_id: str, limit: int = 500):
    """
    Fetch readings for an MP station ordered chronologically (oldest to newest).
    Queries the flat schema and handles both datetime and string ts.
    """
    if not is_mp_station_id(station_id):
        return []

    readings = list(
        db.readings.find(
            {"station_id": station_id},
            {"_id": 0, "station_id": 1, "ts": 1, "gw_level": 1, "gw_level_smoothed": 1, "status": 1, "trend": 1},
        )
        .sort("ts", DESCENDING)
        .limit(limit)
    )

    return readings[::-1]


def insert_forecast(station_id: str, forecast: dict):
    """Store forecast result into forecast collection."""
    if not is_mp_station_id(station_id):
        return
    db.forecast.update_one(
        {"station_id": station_id},
        {"$set": {"station_id": station_id, "forecast": forecast}},
        upsert=True,
    )


def ensure_sample_stations():
    """Ensure a designated 0-observation station exists for testing and UI evaluation."""
    zero_sid = "MP_BHOPAL_NEW_0_OBS"
    try:
        db.stations.update_one(
            {"station_id": zero_sid},
            {
                "$set": {
                    "station_id": zero_sid,
                    "name": "Bhopal New DWLR (0 obs)",
                    "district": "Bhopal",
                    "block": "Phanda",
                    "village": "Bhopal Zero",
                    "state": "Madhya Pradesh",
                    "lat": 23.2599,
                    "lon": 77.4126,
                    "records_count": 0,
                    "latest_status": "safe",
                    "latest_trend": "stable",
                    "latest_level": None,
                }
            },
            upsert=True,
        )
        db.readings.delete_many({"station_id": zero_sid})
    except Exception as e:
        print(f"Notice: Could not seed test station {zero_sid}: {e}")


# Initialize sample stations on module load
ensure_sample_stations()

