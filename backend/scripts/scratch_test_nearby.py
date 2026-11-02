import os, sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.services.db import db, MP_FILTER

def test_get_nearby_stations(lat=None, lon=None, limit=6):
    all_stations = list(db.stations.find(MP_FILTER, {"_id": 0}))
    if lat is not None and lon is not None:
        import math
        def haversine(lat1, lon1, lat2, lon2):
            R = 6371
            dLat = math.radians(lat2 - lat1)
            dLon = math.radians(lon2 - lon1)
            a = math.sin(dLat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon/2)**2
            return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        for s in all_stations:
            s["distance"] = round(haversine(lat, lon, s["lat"], s["lon"]), 1)
        all_stations.sort(key=lambda x: x["distance"])
        
        seen_districts = set()
        diverse = []
        for s in all_stations:
            d = s.get("district")
            if d and d not in seen_districts:
                seen_districts.add(d)
                diverse.append(s)
            if len(diverse) >= limit:
                break
        return diverse
    else:
        # Default diverse selection of key MP districts
        districts = ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Rewa", "Sagar", "Agar-Malwa", "Dhar"]
        selected = []
        for d in districts:
            st = db.stations.find_one({"district": d, **MP_FILTER}, {"_id": 0}, sort=[("records_count", -1)])
            if st:
                st["distance"] = 25.0
                selected.append(st)
            if len(selected) >= limit:
                break
        return selected

print("Default (no coords):")
for s in test_get_nearby_stations(limit=6):
    print("  ->", s["station_id"], "|", s["name"], "| District:", s["district"])

print("\nWith Bhopal coords (23.25, 77.41):")
for s in test_get_nearby_stations(lat=23.25, lon=77.41, limit=6):
    print(f"  -> {s['station_id']} | {s['name']} | District: {s['district']} | Distance: {s['distance']}km")
