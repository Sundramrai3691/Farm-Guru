# app/routes/analytics.py
import logging
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any

logger = logging.getLogger(__name__)
router = APIRouter()

class AnalyticsEvent(BaseModel):
    event_name: str
    payload: Dict[str, Any] = {}

@router.post("/api/analytics")
async def log_analytics(event: AnalyticsEvent):
    """Log analytics events safely (no PII here)."""
    try:
        logger.info(f"Analytics event: {event.event_name}")
        # TODO: persist to DB or file if desired; for now just log
        return {"status": "logged"}
    except Exception as e:
        logger.exception("Analytics logging failed")
        return {"status": "failed", "error": str(e)}
