import logging
import os
from typing import Dict, Any
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Import routes
from app.routes import query, upload, weather, market, policy, chem_reco, analytics
from app.config import DEBUG, DEMO_MODE
from app.db import db


# Configure logging
logging.basicConfig(
    level=logging.INFO if not DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Farm-Guru API",
    description="AI-powered agricultural assistant API",
    version="1.0.0",
    docs_url="/docs" if DEBUG else None,
    redoc_url="/redoc" if DEBUG else None,
)

# CORS middleware (frontend + prod)
# CORS middleware (dev: allow all origins to avoid preflight 400)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],            # TEMPORARY for local dev only; restrict in prod
    allow_origin_regex=None,
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],
    expose_headers=["*"],
)


# Mount static files (local image storage)
os.makedirs("app/static", exist_ok=True)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Routers
app.include_router(query.router)
app.include_router(upload.router)
app.include_router(weather.router)
app.include_router(market.router)
app.include_router(policy.router)
app.include_router(chem_reco.router)
app.include_router(analytics.router)

@app.get("/")
async def root():
    return {
        "message": "Farm-Guru API is running",
        "version": "1.0.0",
        "demo_mode": DEMO_MODE,
        "supabase_connected": db.is_connected(),
        "endpoints": {
            "query": "/api/query",
            "upload": "/api/upload-image",
            "weather": "/api/weather",
            "market": "/api/market",
            "policy": "/api/policy-match",
            "chemical": "/api/chem-reco",
            "analytics": "/api/analytics",
        },
    }


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "demo_mode": DEMO_MODE,
        "database": "connected" if db.is_connected() else "local_mode",
    }


@app.post("/api/seed")
async def seed_database():
    """Seed DB with initial data (for dev only)"""
    if not db.is_connected():
        return {"message": "Database not connected, seeding skipped"}

    try:
        sample_docs = [
            {
                "title": "Wheat Cultivation Guide",
                "content": "Comprehensive guide for wheat cultivation including sowing, irrigation, and harvesting practices.",
                "source_url": "https://icar.org.in/wheat-guide",
            },
            {
                "title": "Tomato Disease Management",
                "content": "Integrated pest management strategies for tomato crops including biological and chemical control methods.",
                "source_url": "https://icar.org.in/tomato-ipm",
            },
        ]

        for doc in sample_docs:
            try:
                db.client.table("docs").insert(doc).execute()
            except Exception as e:
                logger.warning(f"Failed to insert doc: {e}")

        sample_schemes = [
            {
                "name": "PM-KISAN",
                "code": "PM-KISAN",
                "description": "Income support scheme providing ₹6000 annually",
                "applicable_states": [],
                "applicable_crops": [],
                "url": "https://pmkisan.gov.in/",
            }
        ]

        for scheme in sample_schemes:
            try:
                db.client.table("schemes").insert(scheme).execute()
            except Exception as e:
                logger.warning(f"Failed to insert scheme: {e}")

        return {"message": "Database seeded successfully"}

    except Exception as e:
        logger.error(f"Database seeding failed: {e}")
        raise HTTPException(status_code=500, detail=f"Seeding failed: {str(e)}")


# Pydantic model for analytics input
class AnalyticsEvent(BaseModel):
    event_name: str
    payload: Dict[str, Any] = {}


@app.post("/api/analytics")
async def log_analytics(event: AnalyticsEvent):
    """Log analytics events (privacy-friendly)"""
    try:
        logger.info(f"Analytics event: {event.event_name}")
        # Fallback: you can add logic to write to local file/db if needed
        return {"status": "logged"}
    except Exception as e:
        logger.error(f"Analytics logging failed: {e}")
        return {"status": "failed", "error": str(e)}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error occurred"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),   
        reload=DEBUG,
        log_level="info",
    )

