# backend/services/notification.py
import os
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from ..db import SessionLocal
from ..models.subscriber import Subscriber
from ..models.alert_log import AlertLog
from . import email_service, sms_service

ALERT_COOLDOWN_SECONDS = int(os.getenv("ALERT_COOLDOWN_SECONDS", "3600"))


def notify_subscribers(level: str, station_id: str, reading_value: float, timestamp: datetime):
    """
    Notify all active subscribers if they are eligible (cooldown passed).
    Returns a summary dict.
    """
    now = datetime.now(timezone.utc)
    sent, skipped, errors = 0, 0, 0

    session: Session = SessionLocal()
    try:
        subscribers = session.query(Subscriber).filter(Subscriber.active == True).all()
        for sub in subscribers:
            if not sub.should_notify(now, ALERT_COOLDOWN_SECONDS):
                skipped += 1
                continue

            sms_success, email_success = False, False

            # Build messages
            sms_msg = f"CRITICAL: Station {station_id} level={reading_value} at {timestamp.isoformat()}"
            email_subject = f"⚠️ Groundwater Alert - Station {station_id}"
            email_body = (
                f"Critical depletion detected at station {station_id}.\n\n"
                f"Level: {reading_value}\n"
                f"Timestamp: {timestamp.isoformat()}\n\n"
                "Please take immediate action."
            )

            try:
                if sub.preferred_channel in ("sms", "both") and sub.phone:
                    sms_success, sms_resp = sms_service.send_sms(sub.phone, sms_msg)
                if sub.preferred_channel in ("email", "both") and sub.email:
                    email_success, email_resp = email_service.send_alert_email(
                        sub.email, email_subject, email_body
                    )
            except Exception as e:
                print(f"[Notification] Error sending to {sub.id}: {e}")
                errors += 1
                success = False
                provider_resp = str(e)
            else:
                success = sms_success or email_success
                provider_resp = {"sms": sms_success, "email": email_success}

            # Log attempt
            log = AlertLog(
                subscriber_id=sub.id,
                level=level,
                reading_value=reading_value,
                message=email_body,
                sent_at=now,
                success=success,
                provider_response=str(provider_resp),
            )
            session.add(log)

            if success:
                sub.mark_sent(now)
                sent += 1
            else:
                errors += 1

        session.commit()
    finally:
        session.close()

    return {"sent": sent, "skipped": skipped, "errors": errors}
