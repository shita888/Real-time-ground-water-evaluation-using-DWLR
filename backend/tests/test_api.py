import os
import sys

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from backend.app import app
from backend.services.db import db
from backend.services.forecast import get_model_observation_requirement


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health_endpoint(client):
    """Verify service health."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "time" in data


def test_root_endpoint(client):
    """Verify root endpoint returns project metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == "JalDrishti"


def test_get_stations(client):
    """Verify /stations returns only Madhya Pradesh stations with valid coordinates."""
    response = client.get("/stations")
    assert response.status_code == 200
    data = response.json()
    assert "stations" in data
    assert len(data["stations"]) > 0

    for station in data["stations"]:
        assert station["station_id"].startswith("MP_"), f"Non-MP station ID found: {station['station_id']}"
        assert station["station_id"] != "DWLR_001", "Demo DWLR_001 must not be present in /stations"
        # Coordinates in MP: lat ~21-27.5, lon ~74-83.5
        assert 21.0 <= station["lat"] <= 27.5, f"Latitude outside MP: {station['lat']}"
        assert 74.0 <= station["lon"] <= 83.5, f"Longitude outside MP: {station['lon']}"


def test_get_recent_stations(client):
    """Verify /stations/recent returns real MP records with district, block, village, water level and trend."""
    response = client.get("/stations/recent?limit=8")
    assert response.status_code == 200
    data = response.json()
    assert "stations" in data
    assert len(data["stations"]) > 0
    assert len(data["stations"]) <= 8

    for station in data["stations"]:
        assert station["id"].startswith("MP_")
        assert station["district"] is not None
        assert "level" in station
        assert "status" in station
        assert "trend" in station
        assert station["trend_direction"] in ["up", "down"]


def test_get_statistics(client):
    """Verify /statistics returns real aggregated Madhya Pradesh stats."""
    response = client.get("/statistics")
    assert response.status_code == 200
    data = response.json()
    assert data["state"] == "Madhya Pradesh"
    assert data["active_stations"] > 0
    assert "avg_water_level" in data
    assert "critical_stations" in data
    assert "recharge_rate" in data


def test_get_latest_valid_mp_station(client):
    """Verify /latest returns data for real MP station."""
    response = client.get("/latest/MP_DHAR_BAGH_BAGH_1")
    assert response.status_code == 200
    data = response.json()
    assert data["station_id"] == "MP_DHAR_BAGH_BAGH_1"
    assert data["district"] == "Dhar"
    assert data["village"] == "Bagh"
    assert data["currentLevel"] is not None
    assert data["lat"] is not None
    assert data["lon"] is not None


def test_get_latest_rejects_demo_or_invalid_station(client):
    """Verify /latest returns 404 for demo alias DWLR_001 and non-existent station."""
    # DWLR_001 must return 404
    r_demo = client.get("/latest/DWLR_001")
    assert r_demo.status_code == 404
    assert "not found" in r_demo.json()["detail"].lower()

    # Nonexistent station
    r_fake = client.get("/latest/NON_EXISTENT_STATION_XYZ")
    assert r_fake.status_code == 404
    assert "not found" in r_fake.json()["detail"].lower()


def test_get_history_valid_station(client):
    """Verify /history returns chronological readings for real MP station."""
    response = client.get("/history/MP_DHAR_BAGH_BAGH_1?days=10")
    assert response.status_code == 200
    data = response.json()
    assert data["station_id"] == "MP_DHAR_BAGH_BAGH_1"
    assert "history" in data
    assert len(data["history"]) > 0

    # Verify chronological ordering
    dates = [h["date"] for h in data["history"]]
    assert dates == sorted(dates), "History must be in chronological order"


def test_get_history_rejects_demo_or_invalid_station(client):
    """Verify /history returns 404 for DWLR_001 and nonexistent stations."""
    r_demo = client.get("/history/DWLR_001")
    assert r_demo.status_code == 404

    r_fake = client.get("/history/NON_EXISTENT_STATION_XYZ")
    assert r_fake.status_code == 404


def test_get_forecast_valid_station(client):
    """Verify /forecast returns valid predictions for MP stations with >= 15 observations."""
    response = client.get("/forecast/MP_DHAR_BAGH_BAGH_1?n_future=7")
    assert response.status_code == 200
    data = response.json()
    assert data["station_id"] == "MP_DHAR_BAGH_BAGH_1"
    assert "predictions" in data
    assert len(data["predictions"]) == 7
    assert "mean_category" in data
    assert "trend" in data
    for pred in data["predictions"]:
        assert isinstance(pred, (int, float))
        assert pred >= 0, "Water table depth should be non-negative"


def test_get_forecast_insufficient_data(client):
    """Verify /forecast returns 422 (not 500) for MP stations with < 15 observations."""
    low_data_station = db.stations.find_one({"records_count": {"$lt": 15}})
    if low_data_station:
        sid = low_data_station["station_id"]
        response = client.get(f"/forecast/{sid}?n_future=7")
        assert response.status_code == 422
        data = response.json()
        assert "not enough data" in data["detail"].lower() or "need at least" in data["detail"].lower()


def test_subscribe_flow(client):
    """Verify alert subscription endpoint."""
    payload = {
        "name": "Integration Test User",
        "email": "test_subscriber@example.com",
        "phone": "+919876543210",
        "preferredChannel": "email",
    }
    response = client.post("/api/subscribe", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert "id" in data


def test_get_nearby_stations_returns_distinct_mp_districts(client):
    """Verify /stations/nearby returns stations across distinct MP districts, avoiding duplicate districts."""
    response = client.get("/stations/nearby?limit=3")
    assert response.status_code == 200
    data = response.json()
    assert "stations" in data
    assert len(data["stations"]) == 3
    districts = [s.get("district") for s in data["stations"]]
    assert len(set(districts)) == len(districts), f"Districts must be distinct: {districts}"
    for s in data["stations"]:
        assert s["id"].startswith("MP_"), f"Must be an MP station: {s['id']}"
        assert s.get("level") is not None


def test_model_actual_observation_requirement():
    """Verify that the model's actual observation requirement is verified from model architecture."""
    req = get_model_observation_requirement()
    assert req == 15, f"Expected model observation requirement of 15, got {req}"


def test_forecast_and_history_station_with_zero_observations(client):
    """
    Verify station with 0 observations:
    - Forecast is NOT generated, returning 422 with clear message stating 0 available and 15 required.
    - History works independently, returning 200 with count: 0 and empty history list.
    """
    sid = "MP_BHOPAL_NEW_0_OBS"

    # 1. Forecast endpoint
    r_fc = client.get(f"/forecast/{sid}?n_future=7")
    assert r_fc.status_code == 422
    fc_data = r_fc.json()
    assert "predictions" not in fc_data, "Forecast must NOT be generated for station with 0 observations"
    assert "detail" in fc_data
    detail = fc_data["detail"].lower()
    assert "0 available" in detail or "only 0 available" in detail
    assert "15" in detail
    assert "need at least" in detail or "insufficient" in detail
    assert r_fc.headers.get("X-Observations-Available") == "0"
    assert r_fc.headers.get("X-Observations-Required") == "15"

    # 2. History endpoint (works independently!)
    r_hist = client.get(f"/history/{sid}?days=7")
    assert r_hist.status_code == 200
    hist_data = r_hist.json()
    assert hist_data["station_id"] == sid
    assert hist_data["count"] == 0
    assert hist_data["history"] == []


def test_forecast_and_history_station_with_fewer_than_required_observations(client):
    """
    Verify station with fewer than required observations (1-14 observations, e.g. 2 observations):
    - Forecast is NOT generated, returning 422 with clear message stating available count and 15 required.
    - History works independently, returning 200 with the exact available records.
    """
    sid = "MP_AGAR_MALWA_AGAR_DAABADIYA"  # known station with 2 observations in database

    # 1. Forecast endpoint
    r_fc = client.get(f"/forecast/{sid}?n_future=7")
    assert r_fc.status_code == 422
    fc_data = r_fc.json()
    assert "predictions" not in fc_data, "Forecast must NOT be generated when observations < 15"
    assert "detail" in fc_data
    detail = fc_data["detail"].lower()
    assert "available" in detail
    assert "15" in detail
    assert "need at least" in detail or "insufficient" in detail
    available_header = r_fc.headers.get("X-Observations-Available")
    assert available_header is not None
    assert int(available_header) < 15
    assert r_fc.headers.get("X-Observations-Required") == "15"

    # 2. History endpoint (works independently!)
    r_hist = client.get(f"/history/{sid}?days=15")
    assert r_hist.status_code == 200
    hist_data = r_hist.json()
    assert hist_data["station_id"] == sid
    assert hist_data["count"] == int(available_header)
    assert len(hist_data["history"]) == int(available_header)
    for record in hist_data["history"]:
        assert "date" in record
        assert "water_level" in record
        assert isinstance(record["water_level"], (int, float))


def test_forecast_and_history_station_with_sufficient_observations(client):
    """
    Verify station with sufficient observations (>= 15, e.g. MP_DHAR_BAGH_BAGH_1 with 151 obs):
    - Forecast is generated with valid 7 predictions.
    - History works independently and returns chronological records.
    """
    sid = "MP_DHAR_BAGH_BAGH_1"

    # 1. Forecast endpoint
    r_fc = client.get(f"/forecast/{sid}?n_future=7")
    assert r_fc.status_code == 200
    fc_data = r_fc.json()
    assert fc_data["station_id"] == sid
    assert "predictions" in fc_data
    assert len(fc_data["predictions"]) == 7
    assert fc_data["required_observations"] == 15
    assert fc_data["available_observations"] >= 15
    assert fc_data["mean_category"].lower() in ["safe", "semi-critical", "critical"]
    for pred in fc_data["predictions"]:
        assert isinstance(pred, (int, float))
        assert pred >= 0.0, "Never fabricate negative water levels"

    # 2. History endpoint
    r_hist = client.get(f"/history/{sid}?days=10")
    assert r_hist.status_code == 200
    hist_data = r_hist.json()
    assert hist_data["station_id"] == sid
    assert hist_data["count"] == 10
    dates = [h["date"] for h in hist_data["history"]]
    assert dates == sorted(dates), "History must be in chronological order"


def test_missing_and_invalid_data_handled_safely(client):
    """
    Verify that missing/invalid/corrupted observations (NaN, null, string, missing timestamp)
    are handled safely:
    - History skips corrupted readings safely without 500 error or data fabrication (no 0.0 dummy values).
    - Forecast counts only strictly valid observations and rejects if valid count < 15.
    - Never fabricates data.
    """
    corrupt_sid = "MP_TEST_STATION_CORRUPT_HANDLING"

    try:
        # Seed test station
        db.stations.update_one(
            {"station_id": corrupt_sid},
            {
                "$set": {
                    "station_id": corrupt_sid,
                    "name": "Corrupt Handling Test Well",
                    "district": "Bhopal",
                    "block": "Phanda",
                    "village": "Test Village",
                    "state": "Madhya Pradesh",
                    "lat": 23.25,
                    "lon": 77.40,
                    "records_count": 5,
                    "latest_status": "safe",
                }
            },
            upsert=True,
        )

        # Insert 5 readings: 2 valid, 3 corrupted/missing
        db.readings.delete_many({"station_id": corrupt_sid})
        readings = [
            {"station_id": corrupt_sid, "ts": datetime(2023, 1, 1, tzinfo=timezone.utc), "gw_level": 12.5, "gw_level_smoothed": 12.5, "status": "safe", "trend": "stable"},
            {"station_id": corrupt_sid, "ts": datetime(2023, 1, 2, tzinfo=timezone.utc), "gw_level": None, "gw_level_smoothed": None, "status": "safe", "trend": "stable"},  # None
            {"station_id": corrupt_sid, "ts": datetime(2023, 1, 3, tzinfo=timezone.utc), "gw_level": "corrupted_str", "gw_level_smoothed": None, "status": "safe", "trend": "stable"},  # String
            {"station_id": corrupt_sid, "ts": None, "gw_level": 14.0, "gw_level_smoothed": 14.0, "status": "safe", "trend": "stable"},  # Missing date
            {"station_id": corrupt_sid, "ts": datetime(2023, 1, 5, tzinfo=timezone.utc), "gw_level": 15.0, "gw_level_smoothed": 15.0, "status": "safe", "trend": "stable"},  # Valid
        ]
        db.readings.insert_many(readings)

        # 1. History: must succeed with status 200, returning ONLY the 2 valid readings (never 0.0 fabricated)
        r_hist = client.get(f"/history/{corrupt_sid}?days=10")
        assert r_hist.status_code == 200
        hist_data = r_hist.json()
        assert hist_data["count"] == 2, f"Expected 2 valid readings in history, got {hist_data['count']}"
        levels = [h["water_level"] for h in hist_data["history"]]
        assert levels == [12.5, 15.0], f"Expected valid levels [12.5, 15.0], got {levels}"
        assert 0.0 not in levels, "Must never fabricate 0.0 for missing data"

        # 2. Forecast: must reject with 422, explicitly reporting 2 available valid observations and 15 required
        r_fc = client.get(f"/forecast/{corrupt_sid}?n_future=7")
        assert r_fc.status_code == 422
        fc_data = r_fc.json()
        assert "2 available" in fc_data["detail"] or "only 2 available" in fc_data["detail"]
        assert "15" in fc_data["detail"]
        assert r_fc.headers.get("X-Observations-Available") == "2"
        assert r_fc.headers.get("X-Observations-Required") == "15"

    finally:
        # Cleanup
        db.stations.delete_one({"station_id": corrupt_sid})
        db.readings.delete_many({"station_id": corrupt_sid})


