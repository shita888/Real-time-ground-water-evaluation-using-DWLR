print(">>> LOADING THIS APP.PY <<<")
# run with: uvicorn backend.app:app --reload --host 127.0.0.1 --port 8000

import os
import sys
import math
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from dotenv import load_dotenv

# Ensure we read backend/.env regardless of CWD
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path)
print(f"🔐 Loaded env from: {dotenv_path}")

import secrets
from datetime import timedelta
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.db import init_db, get_session
from backend.models.subscriber import Subscriber
from backend.models.user import User
from backend.services import scheduler, notification
from backend.services.forecast import (
    forecast_future,
    StationNotFoundError,
    InsufficientDataError,
)
from backend.services.db import (
    get_station_data,
    station_exists,
    get_all_stations,
    get_station_metadata,
    get_recent_stations,
    get_nearby_stations,
    get_statistics,
    is_mp_station_id,
)

# ------------------ Pydantic models ------------------

class SubscriberRequest(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    preferredChannel: str = "both"

class SubscribeResponse(BaseModel):
    ok: bool
    id: Optional[int] = None
    message: Optional[str] = None
    email_status: Optional[str] = None
    sms_status: Optional[str] = None

class SubscriberOut(BaseModel):
    id: int
    name: str
    email: Optional[str]
    phone: Optional[str]
    preferred_channel: str
    active: bool
    last_alert_sent_at: Optional[str]

# ------------------ Auth Models ------------------

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    token: str
    new_password: str

class AuthUserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: Optional[str] = None

class AuthResponse(BaseModel):
    ok: bool
    message: str
    token: Optional[str] = None
    user: Optional[AuthUserResponse] = None

# ------------------ Notification Imports ------------------

try:
    from backend.services.email_service import send_alert_email, get_subscription_email_content
except Exception as e:
    print("ℹ️ Email service disabled due to error:", e)
    def send_alert_email(*args, **kwargs):
        return False, "Email service unavailable"
    def get_subscription_email_content(name, email, channel="both"):
        return ("💧 JalDrishti Alert Subscription Confirmed", f"Hello {name}, you have subscribed to JalDrishti alerts.", None)

try:
    from backend.services.sms_service import send_sms
except Exception as e:
    print("ℹ️ SMS service disabled due to error:", e)
    def send_sms(*args, **kwargs):
        return False, "SMS service unavailable"

# ------------------ Setup ------------------

init_db()

DEV_TRIGGER_TOKEN = os.getenv("DEV_TRIGGER_TOKEN", "dev-secret")

app = FastAPI(
    title="JalDrishti DWLR Groundwater API",
    description="Real-Time Groundwater Resource Evolution & Forecasting Using DWLR Data",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.middleware("http")
async def add_private_network_access_header(request, call_next):
    response = await call_next(request)
    if request.headers.get("access-control-request-private-network"):
        response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

# ------------------ Health ------------------

@app.get("/")
def read_root():
    return {
        "project": "JalDrishti",
        "description": "Real-Time Groundwater Resource Evolution Using DWLR Data",
        "status": "online",
        "docs_url": "/docs",
    }

@app.get("/health")
def health():
    return {
        "status": "ok",
        "time": datetime.now(timezone.utc).isoformat(),
        "database": "connected",
    }

# ------------------ Subscription ------------------

@app.post("/api/subscribe", response_model=SubscribeResponse)
def subscribe(data: SubscriberRequest):
    name = data.name.strip()
    email = data.email.strip().lower() if data.email else None
    phone = data.phone.strip() if data.phone else None
    preferred = data.preferredChannel

    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    if preferred == "email" and not email:
        raise HTTPException(status_code=400, detail="Email address is required for Email alerts")
    if preferred == "sms" and not phone:
        raise HTTPException(status_code=400, detail="Phone number is required for SMS alerts")
    if not email and not phone:
        raise HTTPException(status_code=400, detail="Email or phone number is required")

    email_status = "not_requested"
    sms_status = "not_requested"

    with get_session() as session:
        existing = None
        if email:
            existing = session.query(Subscriber).filter_by(email=email).first()
        if not existing and phone:
            existing = session.query(Subscriber).filter_by(phone=phone).first()

        if existing:
            existing.name = name
            existing.active = True
            existing.preferred_channel = preferred
            if phone:
                existing.phone = phone
            if email:
                existing.email = email
            session.commit()
            sub_id = existing.id
            action_msg = "Updated existing subscription preferences in database."
        else:
            sub = Subscriber(
                name=name,
                email=email,
                phone=phone,
                preferred_channel=preferred,
            )
            session.add(sub)
            session.commit()
            sub_id = sub.id
            action_msg = "Subscription details and alert preferences saved successfully in database."

        # Send confirmation email
        if email and preferred in ["email", "both"]:
            try:
                subject, plain_text, html_content = get_subscription_email_content(name, email, preferred)
                success, resp = send_alert_email(email, subject, plain_text, html_content)
                if success:
                    email_status = "sent"
                    action_msg = f"Subscription confirmed! A confirmation email has been sent to {email}."
                elif "No email provider configured" in resp:
                    email_status = "not_configured"
                else:
                    email_status = f"failed: {resp}"
            except Exception as e:
                email_status = f"error: {e}"

        # Send welcome SMS only if Twilio is configured
        if phone and preferred in ["sms", "both"]:
            if os.getenv("TWILIO_ACCOUNT_SID") and os.getenv("TWILIO_AUTH_TOKEN"):
                sms_body = f"JalDrishti: Hi {name}, your groundwater alert subscription is now active."
                try:
                    success, resp = send_sms(phone, sms_body)
                    sms_status = "sent" if success else f"failed: {resp}"
                except Exception as e:
                    sms_status = f"error: {e}"
            else:
                sms_status = "not_configured"

        return {
            "ok": True,
            "id": sub_id,
            "message": action_msg,
            "email_status": email_status,
            "sms_status": sms_status,
        }

# ------------------ Authentication ------------------

@app.post("/api/auth/signup", response_model=AuthResponse)
@app.post("/api/auth/register", response_model=AuthResponse)
def signup(data: SignupRequest):
    name = data.name.strip()
    email = data.email.strip().lower()
    password = data.password

    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters long")
    if "@" not in email or "." not in email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")

    with get_session() as session:
        existing = session.query(User).filter_by(email=email).first()
        if existing:
            raise HTTPException(status_code=400, detail="An account with this email already exists. Please log in.")

        user = User(name=name, email=email)
        user.set_password(password)
        session.add(user)
        session.commit()
        session.refresh(user)

        token = secrets.token_urlsafe(32)

        return {
            "ok": True,
            "message": "Account created successfully! Welcome to JalDrishti.",
            "token": token,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            },
        }

@app.post("/api/auth/login", response_model=AuthResponse)
def login(data: LoginRequest):
    email = data.email.strip().lower()
    password = data.password

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    with get_session() as session:
        user = session.query(User).filter_by(email=email).first()
        if not user or not user.check_password(password):
            raise HTTPException(status_code=401, detail="Invalid email or password. Please try again.")

        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account is deactivated. Please contact support.")

        user.last_login_at = datetime.now(timezone.utc)
        session.commit()

        token = secrets.token_urlsafe(32)

        return {
            "ok": True,
            "message": f"Welcome back, {user.name}!",
            "token": token,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            },
        }

@app.post("/api/auth/forgot-password")
def forgot_password(data: ForgotPasswordRequest):
    email = data.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    with get_session() as session:
        user = session.query(User).filter_by(email=email).first()
        if user:
            reset_token = secrets.token_hex(16)
            user.reset_token = reset_token
            user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
            session.commit()

            # Attempt sending reset email if configured
            subject = "🔑 JalDrishti Password Reset Request"
            body = (
                f"Hello {user.name},\n\n"
                "We received a request to reset your password for JalDrishti.\n"
                f"Your reset code is: {reset_token}\n\n"
                "This code will expire in 1 hour. If you did not request this, you can safely ignore this email.\n\n"
                "Team JalDrishti"
            )
            try:
                success, resp = send_alert_email(email, subject, body)
                email_status = "sent" if success else f"not_delivered: {resp}"
            except Exception as e:
                email_status = f"error: {e}"

            # If email service is not configured, supply reset code in response for testing
            demo_code = reset_token if not (os.getenv("SENDGRID_API_KEY") or os.getenv("SMTP_HOST")) else None

            return {
                "ok": True,
                "message": "Password reset instructions generated successfully.",
                "email_status": email_status,
                "reset_code": demo_code,
            }

        return {
            "ok": True,
            "message": "If an account with that email exists, password reset instructions have been sent.",
        }

@app.post("/api/auth/reset-password")
def reset_password(data: ResetPasswordRequest):
    email = data.email.strip().lower()
    token = data.token.strip()
    new_password = data.new_password

    if not email or not token or not new_password:
        raise HTTPException(status_code=400, detail="Email, reset token, and new password are required")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")

    with get_session() as session:
        user = session.query(User).filter_by(email=email).first()
        if not user or user.reset_token != token:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")

        if user.reset_token_expires:
            exp = user.reset_token_expires
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > exp:
                raise HTTPException(status_code=400, detail="Reset token has expired. Please request a new one.")

        user.set_password(new_password)
        user.reset_token = None
        user.reset_token_expires = None
        session.commit()

        return {
            "ok": True,
            "message": "Password has been successfully reset! You can now log in with your new password.",
        }

@app.get("/api/subscribers", response_model=List[SubscriberOut])
def list_subscribers():
    with get_session() as session:
        subs = session.query(Subscriber).all()
        return [
            {
                "id": s.id,
                "name": s.name,
                "email": s.email,
                "phone": s.phone,
                "preferred_channel": s.preferred_channel,
                "active": s.active,
                "last_alert_sent_at": s.last_alert_sent_at.isoformat() if s.last_alert_sent_at else None,
            }
            for s in subs
        ]

@app.get("/api/trigger-test")
def trigger_test(token: str = Query(...)):
    if token != DEV_TRIGGER_TOKEN:
        raise HTTPException(status_code=403, detail="Unauthorized")

    now = datetime.now(timezone.utc)
    summary = notification.notify_subscribers(
        level="critical",
        station_id="TEST_STATION",
        reading_value=25.5,
        timestamp=now,
    )
    return {"ok": True, "summary": summary}

# ------------------ Forecast & Data ------------------

@app.get("/forecast/{station_id}")
def get_forecast(station_id: str, n_future: int = 7):
    """
    Returns 7-day groundwater forecast for a station.
    - Returns 404 if the station does not exist.
    - Returns 422 with a descriptive message showing available and required counts
      if the station has insufficient valid observations. Never fabricates predictions.
    """
    try:
        return forecast_future(station_id=station_id, n_future=n_future)
    except StationNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except InsufficientDataError as e:
        raise HTTPException(
            status_code=422,
            detail=str(e),
            headers={
                "X-Observations-Available": str(e.available),
                "X-Observations-Required": str(e.required),
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal forecast error: {str(e)}")

@app.get("/history/{station_id}")
def get_history(station_id: str, days: int = 7):
    """
    Returns chronological groundwater observation records for a station.
    Operates independently of forecasting requirements.
    - Returns 404 if station does not exist.
    - Handles stations with 0 observations safely (returns count: 0, history: []).
    - Handles missing/invalid numeric data safely without fabricating fake levels.
    """
    if not station_exists(station_id):
        raise HTTPException(status_code=404, detail=f"Station '{station_id}' was not found in the database.")

    docs = get_station_data(station_id, limit=days)
    history = []
    for d in docs:
        ts = d.get("ts")
        if not ts:
            continue
        date_str = ts.strftime("%Y-%m-%d") if hasattr(ts, "strftime") else str(ts)[:10]
        if date_str == "None" or len(date_str) < 10:
            continue

        raw_val = d.get("gw_level_smoothed")
        if raw_val is None:
            raw_val = d.get("gw_level")

        if raw_val is None:
            # Skip invalid/missing reading - never fabricate data with 0.0 or dummy values
            continue

        try:
            val_float = float(raw_val)
            if math.isnan(val_float) or math.isinf(val_float):
                continue
            wl = round(val_float, 2)
        except (ValueError, TypeError):
            continue

        history.append({
            "date": date_str,
            "water_level": wl,
            "status": d.get("status"),
            "trend": d.get("trend"),
        })

    return {"station_id": station_id, "count": len(history), "history": history}

@app.get("/stations")
def get_stations():
    """
    Returns all Madhya Pradesh monitoring stations with coordinates, district, and latest observations.
    """
    stations = get_all_stations()
    return {"stations": stations, "count": len(stations)}

@app.get("/stations/recent")
def recent_stations(limit: int = 8):
    """
    Returns recent station updates from actual Madhya Pradesh dataset records.
    """
    return {"stations": get_recent_stations(limit=limit)}

@app.get("/stations/nearby")
def nearby_stations(lat: Optional[float] = None, lon: Optional[float] = None, limit: int = 3):
    """
    Returns nearby stations with distinct Madhya Pradesh districts.
    """
    return {"stations": get_nearby_stations(lat=lat, lon=lon, limit=limit)}

@app.get("/statistics")
def statistics():
    """
    Returns aggregate groundwater statistics across Madhya Pradesh monitoring stations.
    """
    return get_statistics()

@app.get("/latest/{station_id}")
def get_latest(station_id: str):
    """
    Returns the latest groundwater reading and status for a specific MP station.
    """
    if not is_mp_station_id(station_id):
        raise HTTPException(status_code=404, detail=f"Station '{station_id}' not found.")

    doc = get_station_metadata(station_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Station '{station_id}' not found.")

    level = doc.get("gw_level_smoothed", doc.get("gw_level", doc.get("latest_level")))
    if level is None and "last" in doc and isinstance(doc["last"], dict):
        level = doc["last"].get("gw_level_smoothed", doc["last"].get("gw_level"))

    return {
        "station_id": station_id,
        "name": doc.get("name", station_id),
        "district": doc.get("district"),
        "block": doc.get("block"),
        "village": doc.get("village"),
        "currentLevel": round(float(level), 2) if level is not None else None,
        "ts": doc.get("ts", doc.get("latest_date")),
        "lat": doc.get("lat"),
        "lon": doc.get("lon"),
        "status": doc.get("status", doc.get("latest_status", "safe")),
        "trend": doc.get("trend", doc.get("latest_trend", "stable")),
    }

# ------------------ Startup ------------------

@app.on_event("startup")
def startup_event():
    # Informative notification credentials check
    sg_key = os.getenv("SENDGRID_API_KEY")
    smtp_host = os.getenv("SMTP_HOST")
    twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")

    if sg_key:
        print("📧 Email alerts configured via SendGrid")
    elif smtp_host:
        print("📧 Email alerts configured via SMTP")
    else:
        print("ℹ️ Email notifications: unconfigured (notifications will be skipped gracefully)")

    if twilio_sid:
        print("📱 SMS alerts configured via Twilio")
    else:
        print("ℹ️ SMS notifications: unconfigured (notifications will be skipped gracefully)")

    scheduler.start_scheduler()
    print("✅ JalDrishti backend startup completed successfully")
