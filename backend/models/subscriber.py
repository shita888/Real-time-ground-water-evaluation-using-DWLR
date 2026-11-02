# backend/models/subscriber.py
from datetime import datetime, timezone, timedelta
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from ..db import Base





class Subscriber(Base):
    __tablename__ = "subscribers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    email = Column(String(256), nullable=True)
    phone = Column(String(32), nullable=True)
    preferred_channel = Column(String(10), default="both")  # "sms", "email", "both"
    station_id = Column(String(64), nullable=True)  # optional filter for specific stations
    active = Column(Boolean, default=True)
    subscribed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_alert_sent_at = Column(DateTime, nullable=True)

    def should_notify(self, now, cooldown_seconds: int) -> bool:
        if not self.last_alert_sent_at:
            return True
        last = self.last_alert_sent_at
        # If naive, make it UTC
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        delta = now - last
        return delta.total_seconds() >= cooldown_seconds

    def mark_sent(self, now: datetime):
        """
        Update last_alert_sent_at to now (after a successful send).
        """
        self.last_alert_sent_at = now
