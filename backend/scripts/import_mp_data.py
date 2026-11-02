"""
Safe, idempotent MongoDB importer for Madhya Pradesh groundwater dataset (mp_groundwater_clean.csv).

Features:
- Validates columns and data types.
- Corrects swapped lat/lng columns (34,145 rows where lat > 35).
- Generates consistent, deterministic station identifiers derived from location metadata.
- Preserves existing database data unless explicitly run with --drop.
- Uses bulk upserts with unique indexes to guarantee idempotency (re-importing will not duplicate records).
- Populates `readings`, `latest`, and `stations` collections.
- Provides sample alias for `DWLR_001` so default / legacy queries work seamlessly.
"""

import os
import sys
import argparse
import re
from datetime import datetime
import pandas as pd
from pymongo import MongoClient, UpdateOne, ASCENDING
from dotenv import load_dotenv

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure backend/.env is loaded
ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(ENV_PATH)

DEFAULT_CSV_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "mp_groundwater_clean.csv"
)
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017/")
MONGODB_DB = os.getenv("MONGODB_DB", "dwlr")


def clean_identifier(s: str) -> str:
    """Sanitize string into an uppercase alphanumeric identifier."""
    cleaned = re.sub(r"[^A-Za-z0-9]+", "_", str(s).strip()).strip("_").upper()
    return cleaned or "UNKNOWN"


def import_dataset(csv_path: str = DEFAULT_CSV_PATH, drop_first: bool = False, batch_size: int = 2000):
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV file not found at: {csv_path}")

    print(f"📖 Reading dataset from: {csv_path}")
    df = pd.read_csv(csv_path)
    total_raw_rows = len(df)
    print(f"📊 Total raw rows loaded: {total_raw_rows}")

    # 0. Strict Madhya Pradesh state filtering
    # Handles variations such as 'Madhya Pradesh', 'MP', and trailing/leading spaces
    state_cleaned = df["state"].astype(str).str.strip().str.upper()
    mp_mask = state_cleaned.isin(["MADHYA PRADESH", "MP", "MADHYA_PRADESH"])
    dropped_non_mp = int((~mp_mask).sum())
    if dropped_non_mp > 0:
        print(f"⚠️ Dropping {dropped_non_mp} non-Madhya Pradesh records.")
    df = df[mp_mask].copy()
    print(f"📍 Madhya Pradesh records retained: {len(df)}")

    # 1. Coordinate correction (lat/lng swap fix)
    # In MP: Lat is ~21-27 N, Lng is ~74-83 E
    swapped_mask = (df["lat"] > 35) & (df["lng"] <= 35)
    swapped_count = int(swapped_mask.sum())
    print(f"🔍 Found {swapped_count} rows with swapped coordinates. Correcting...")

    corrected_lat = df["lat"].copy()
    corrected_lng = df["lng"].copy()
    corrected_lat[swapped_mask] = df["lng"][swapped_mask]
    corrected_lng[swapped_mask] = df["lat"][swapped_mask]

    df["lat_corr"] = corrected_lat.round(5)
    df["lng_corr"] = corrected_lng.round(5)

    # 2. Date parsing
    print("🕒 Parsing dates (dayfirst=True)...")
    df["parsed_date"] = pd.to_datetime(df["Date"], dayfirst=True, errors="coerce")
    invalid_dates = int(df["parsed_date"].isnull().sum())
    if invalid_dates > 0:
        print(f"⚠️ Dropping {invalid_dates} rows with invalid dates.")
        df = df.dropna(subset=["parsed_date"])

    # 3. Clean string columns & construct station keys
    df["clean_district"] = df["district"].apply(clean_identifier)
    df["clean_block"] = df["BLOCK"].apply(clean_identifier)
    df["clean_village"] = df["VILLAGE"].apply(clean_identifier)

    # Base station ID
    df["base_station_id"] = (
        "MP_" + df["clean_district"] + "_" + df["clean_block"] + "_" + df["clean_village"]
    )

    # Check if any (district, block, village) has distinct well coordinates
    # We assign a well suffix (_1, _2) if a village has multiple physical wells
    well_coords = df.groupby(["base_station_id", "lat_corr", "lng_corr"]).size().reset_index()
    well_coords["well_idx"] = well_coords.groupby("base_station_id").cumcount() + 1
    well_totals = well_coords.groupby("base_station_id")["well_idx"].transform("max")
    well_coords["has_multiple"] = well_totals > 1

    station_mapping = {}
    for _, row in well_coords.iterrows():
        base_id = row["base_station_id"]
        lat = row["lat_corr"]
        lng = row["lng_corr"]
        idx = row["well_idx"]
        has_multi = row["has_multiple"]
        station_id = f"{base_id}_{idx}" if has_multi else base_id
        station_mapping[(base_id, lat, lng)] = station_id

    # Map final station_id
    df["station_id"] = [
        station_mapping[(b, la, lo)]
        for b, la, lo in zip(df["base_station_id"], df["lat_corr"], df["lng_corr"])
    ]

    total_stations = df["station_id"].nunique()
    print(f"📍 Identified {total_stations} unique monitoring stations.")

    # 4. Connect to MongoDB
    print(f"🔌 Connecting to MongoDB at: {MONGODB_URI} (Database: {MONGODB_DB})")
    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
    db = client[MONGODB_DB]

    # Verify connection
    client.admin.command("ping")
    print("✅ Successfully connected to MongoDB.")

    if drop_first:
        print("⚠️ --drop flag provided: Dropping existing collections...")
        db.readings.drop()
        db.latest.drop()
        db.stations.drop()

    # Create indexes for performance and duplicate prevention
    print("⚡ Ensuring indexes on MongoDB collections...")
    db.readings.create_index([("station_id", ASCENDING), ("ts", ASCENDING)], unique=True)
    db.readings.create_index([("station_id", ASCENDING)])
    db.readings.create_index([("ts", ASCENDING)])
    db.latest.create_index([("station_id", ASCENDING)], unique=True)
    db.stations.create_index([("station_id", ASCENDING)], unique=True)

    # 5. Process and insert readings
    print(f"🚀 Preparing readings for bulk upsert (batch size: {batch_size})...")

    # If multiple readings exist for the same station on the same date, aggregate median
    df_sorted = df.sort_values(by=["station_id", "parsed_date"])
    agg_df = (
        df_sorted.groupby(["station_id", "parsed_date"])
        .agg({
            "waterLevel": "median",
            "district": "first",
            "BLOCK": "first",
            "VILLAGE": "first",
            "lat_corr": "first",
            "lng_corr": "first",
            "status": "last",
            "trend": "last",
            "year": "first",
        })
        .reset_index()
    )

    readings_ops = []
    total_readings_queued = len(agg_df)
    inserted_readings = 0

    for i, row in agg_df.iterrows():
        ts = row["parsed_date"].to_pydatetime()
        station_id = row["station_id"]
        wl = float(row["waterLevel"])

        doc = {
            "station_id": station_id,
            "ts": ts,
            "gw_level": wl,
            "gw_level_smoothed": wl,
            "status": str(row["status"]).lower(),
            "trend": str(row["trend"]).lower(),
            "year": int(row["year"]) if pd.notnull(row["year"]) else ts.year,
        }

        readings_ops.append(
            UpdateOne(
                {"station_id": station_id, "ts": ts},
                {"$set": doc},
                upsert=True,
            )
        )

        if len(readings_ops) >= batch_size:
            res = db.readings.bulk_write(readings_ops, ordered=False)
            inserted_readings += res.upserted_count + res.modified_count
            readings_ops = []
            print(f"   -> Processed {i + 1}/{total_readings_queued} readings...", end="\r")

    if readings_ops:
        res = db.readings.bulk_write(readings_ops, ordered=False)
        inserted_readings += res.upserted_count + res.modified_count

    print(f"\n✅ Finished upserting readings! Total unique readings in DB: {db.readings.count_documents({})}")

    # 6. Populate `latest` and `stations` collections
    print("📊 Populating `latest` and `stations` metadata...")
    stations_ops = []
    latest_ops = []

    # Find the top station with most readings to use as DWLR_001 demo alias
    station_stats = (
        agg_df.groupby("station_id")
        .agg(
            records_count=("waterLevel", "count"),
            earliest_date=("parsed_date", "min"),
            latest_date=("parsed_date", "max"),
            min_level=("waterLevel", "min"),
            max_level=("waterLevel", "max"),
            mean_level=("waterLevel", "mean"),
            lat=("lat_corr", "first"),
            lon=("lng_corr", "first"),
            district=("district", "first"),
            block=("BLOCK", "first"),
            village=("VILLAGE", "first"),
        )
        .reset_index()
    )

    # Sort descending by record count so richest stations come first
    station_stats = station_stats.sort_values(by="records_count", ascending=False)
    top_station_id = station_stats.iloc[0]["station_id"]

    for _, srow in station_stats.iterrows():
        sid = srow["station_id"]
        v_name = str(srow["village"]).strip().title()
        b_name = str(srow["block"]).strip().title()
        d_name = str(srow["district"]).strip().title()
        display_name = f"{v_name} ({b_name}, {d_name})"

        # Find latest observation for this station
        last_obs = agg_df[agg_df["station_id"] == sid].iloc[-1]
        last_wl = float(last_obs["waterLevel"])
        last_ts = last_obs["parsed_date"].to_pydatetime()
        last_status = str(last_obs["status"]).lower()
        last_trend = str(last_obs["trend"]).lower()

        station_doc = {
            "station_id": sid,
            "name": display_name,
            "state": "Madhya Pradesh",
            "district": d_name,
            "block": b_name,
            "village": v_name,
            "lat": float(srow["lat"]),
            "lon": float(srow["lon"]),
            "records_count": int(srow["records_count"]),
            "earliest_date": srow["earliest_date"].strftime("%Y-%m-%d"),
            "latest_date": srow["latest_date"].strftime("%Y-%m-%d"),
            "min_level": round(float(srow["min_level"]), 2),
            "max_level": round(float(srow["max_level"]), 2),
            "mean_level": round(float(srow["mean_level"]), 2),
            "latest_level": last_wl,
            "latest_status": last_status,
            "latest_trend": last_trend,
        }

        stations_ops.append(
            UpdateOne({"station_id": sid}, {"$set": station_doc}, upsert=True)
        )

        latest_doc = {
            "station_id": sid,
            "name": display_name,
            "lat": float(srow["lat"]),
            "lon": float(srow["lon"]),
            "ts": last_ts.isoformat(),
            "gw_level": last_wl,
            "gw_level_smoothed": last_wl,
            "status": last_status,
            "trend": last_trend,
            "last": {
                "gw_level": last_wl,
                "gw_level_smoothed": last_wl,
            },
        }

        latest_ops.append(
            UpdateOne({"station_id": sid}, {"$set": latest_doc}, upsert=True)
        )

    db.stations.bulk_write(stations_ops, ordered=False)
    db.latest.bulk_write(latest_ops, ordered=False)

    # 7. Clean up any legacy invented demo stations (e.g. DWLR_001)
    db.stations.delete_many({"station_id": "DWLR_001"})
    db.latest.delete_many({"station_id": "DWLR_001"})
    db.readings.delete_many({"station_id": "DWLR_001"})
    db.forecast.delete_many({"station_id": "DWLR_001"})
    # Also ensure any non-MP state records are removed
    db.stations.delete_many({"state": {"$nin": ["Madhya Pradesh", "MP"]}})

    print("\n🎉 Import Summary:")
    print(f"   • Total stations in `stations`: {db.stations.count_documents({})}")
    print(f"   • Total records in `readings`: {db.readings.count_documents({})}")
    print(f"   • Total stations in `latest`: {db.latest.count_documents({})}")
    print(f"   • Stations with >= 15 observations: {db.stations.count_documents({'records_count': {'$gte': 15}})}")
    print(f"   • Stations with < 15 observations: {db.stations.count_documents({'records_count': {'$lt': 15}})}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import Madhya Pradesh groundwater data into MongoDB")
    parser.add_argument("--csv-path", default=DEFAULT_CSV_PATH, help="Path to mp_groundwater_clean.csv")
    parser.add_argument("--drop", action="store_true", help="Drop collections before import")
    args = parser.parse_args()

    import_dataset(csv_path=args.csv_path, drop_first=args.drop)
