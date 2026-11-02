import pandas as pd
from services.db import db   # use your MongoDB connection wrapper (db = client[DB_NAME])

def clean_raw_file_to_db(raw_file: str, station_id: str):
    # Step 1: Find the header row index
    with open(raw_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    header_line = None
    for i, line in enumerate(lines):
        if "Data Type Code" in line:
            header_line = i
            break

    if header_line is None:
        raise ValueError("Could not find header row with 'Data Type Code'")

    # Step 2: Load data starting from header
    df = pd.read_csv(raw_file, skiprows=header_line)

    # Step 3: Keep only Date and Water_Level
    df = df[['Data Time', 'Data Value']].rename(
        columns={'Data Time': 'Date', 'Data Value': 'Water_Level'}
    )

    # Step 4: Convert Date column to datetime
    df['Date'] = pd.to_datetime(df['Date'], errors='coerce')

    # Step 5: Drop rows without valid dates
    df = df.dropna(subset=['Date'])

    # Step 6: Insert into MongoDB (readings collection)
    docs = []
    for _, row in df.iterrows():
        docs.append({
            "ts": row['Date'].to_pydatetime(),
            "meta": {"station_id": station_id},
            "raw": {"gw_level": float(row['Water_Level'])},
            "processed": {"gw_level_smoothed": float(row['Water_Level'])}  # you can preprocess later
        })

    if docs:
        db.readings.insert_many(docs)
        print(f"✅ Inserted {len(docs)} records into MongoDB for station {station_id}")

    return len(docs)

if __name__ == "__main__":
    n = clean_raw_file_to_db("data/hauz_khas_dwlr.csv", station_id="DWLR_01")
    print("Inserted:", n)
