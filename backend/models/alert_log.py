# backend/models/alert_log.py
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..db import Base

class AlertLog(Base):
    __tablename__ = "alert_logs"

    id = Column(Integer, primary_key=True, index=True)
    subscriber_id = Column(Integer, ForeignKey("subscribers.id"), nullable=False)
    level = Column(String(32), nullable=False)  # e.g. "critical", "warning"
    reading_value = Column(Float, nullable=False)
    message = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    success = Column(Boolean, default=False)
    provider_response = Column(Text, nullable=True)

    # relationship back to subscriber (optional, helpful for queries)
    subscriber = relationship("Subscriber", backref="alert_logs")
