import os, sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.services.db import db

districts = ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Rewa', 'Sagar', 'Agar-Malwa', 'Dhar']
for d in districts:
    st = db.stations.find_one({'district': d}, {'_id': 0})
    if st:
        print(f"{d}: id={st['station_id']}, name={st['name']}, village={st['village']}, block={st['block']}, level={st.get('latest_level')}, status={st.get('latest_status')}, trend={st.get('latest_trend')}")
    else:
        print(f"{d}: NOT FOUND")
