# backend/services/scheduler.py
import os
import requests
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timezone
from . import notification

CRITICAL_LEVEL = float(os.getenv("CRITICAL_LEVEL", "20.0"))
INGEST_URL = os.getenv("INGEST_URL")
INGEST_TOKEN = os.getenv("INGEST_TOKEN")
DISABLE_SCHEDULER = os.getenv("DISABLE_SCHEDULER", "false").lower() == "true"

scheduler = BackgroundScheduler()


def fetch_latest_reading():
    """
    Fetch the latest groundwater reading.
    Returns dict: { "station_id": str, "level": float, "timestamp": datetime }
    """
    if not INGEST_URL:
        return None

    headers = {}
    if INGEST_TOKEN:
        headers["Authorization"] = f"Bearer {INGEST_TOKEN}"

    try:
        resp = requests.get(INGEST_URL, headers=headers, timeout=5)
        resp.raise_for_status()
        data = resp.json()

        return {
            "station_id": data.get("station_id", "UNKNOWN"),
            "level": float(data.get("level")),
            "timestamp": datetime.fromisoformat(data.get("timestamp")),
        }
    except Exception as e:
        print(f"[Scheduler] Error fetching reading from INGEST_URL: {e}")
        return None


def check_and_alert():
    """
    Called by scheduler at intervals.
    Compares level against CRITICAL_LEVEL and triggers notifications.
    """
    reading = fetch_latest_reading()
    if not reading:
        return

    level = reading["level"]
    station_id = reading["station_id"]
    ts = reading["timestamp"]

    print(f"[Scheduler] {ts.isoformat()} Station {station_id} Level={level}")

    # Check depletion: in positive mbgl, level >= CRITICAL_LEVEL means deep/critical
    is_critical = (level >= CRITICAL_LEVEL) if level >= 0 else (level <= -abs(CRITICAL_LEVEL))

    if is_critical:
        print(f"[Scheduler] Critical depletion detected at {level}")
        summary = notification.notify_subscribers(
            level="critical",
            station_id=station_id,
            reading_value=level,
            timestamp=ts,
        )
        print(f"[Scheduler] Notification summary: {summary}")
    else:
        print(f"[Scheduler] Level {level} is safe (threshold {CRITICAL_LEVEL})")


def start_scheduler():
    if DISABLE_SCHEDULER:
        print("[Scheduler] Standby mode: disabled via env (DISABLE_SCHEDULER=true)")
        return

    if not INGEST_URL:
        print("[Scheduler] INGEST_URL not configured. Running in standby mode.")
        return

    try:
        scheduler.add_job(check_and_alert, "interval", seconds=60, id="alert_job")
        scheduler.start()
        print("[Scheduler] Started background job: check_and_alert every 60s")
    except Exception as e:
        print(f"⚠️ Failed to start scheduler: {e}")
