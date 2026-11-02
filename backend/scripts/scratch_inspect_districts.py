import os, sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.services.db import db

districts = db.stations.distinct("district")
print(f"Total districts: {len(districts)}")
for d in sorted(districts):
    count = db.stations.count_documents({"district": d})
    st = db.stations.find_one({"district": d})
    print(f"District: {repr(d)} (stations: {count}) | Sample: {repr(st.get('village'))}, {repr(st.get('block'))} | Name: {repr(st.get('name'))} | ID: {st['station_id']}")
