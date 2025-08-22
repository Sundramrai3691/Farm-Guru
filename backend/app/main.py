import logging
import os
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Import routes
from app.routes import query, upload, weather, market, policy, chem_reco, analytics
from app.config import DEBUG, DEMO_MODE
from app.db import db

# ---------------- Logging ----------------
logging.basicConfig(
    level=logging.INFO if not DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ---------------- FastAPI App ----------------
app = FastAPI(
    title="Farm-Guru API",
    description="AI-powered agricultural assistant API",
    version="1.0.0",
    docs_url="/docs" if DEBUG else None,
    redoc_url="/redoc" if DEBUG else None,
)

# ---------------- CORS ----------------
# Preferred: whitelist only real frontend domains
FRONTEND_ORIGINS: List[str] = [
    os.getenv("FRONTEND_ORIGIN", "https://farm-guru-gilt.vercel.app"),
    "http://localhost:5173",  # local dev
]

# also allow vercel subdomains via regex (optional, safe for your case)
allow_regex = os.getenv("ALLOW_ORIGIN_REGEX", r"^https://.*\.vercel\.app$")

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,     # explicit list
    allow_origin_regex=allow_regex,     # allow vercel subdomains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Fallback HTTP middleware — ensures CORS headers are present on every response.
# This is a safety-net: if CORSMiddleware is skipped for some reason, this will still add headers.
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    origin = request.headers.get("origin")
    resp: Response
    try:
        resp = await call_next(request)
    except Exception as e:
        # In case of error, create a Response so headers can be attached
        logger.error(f"Request handling failed: {e}")
        resp = JSONResponse(status_code=500, content={"detail": "Internal server error occurred"})

    # If origin is present and either allowed explicitly or matches regex, add headers.
    allowed = False
    if origin:
        if origin in FRONTEND_ORIGINS:
            allowed = True
        else:
            import re
            try:
                if re.match(allow_regex, origin):
                    allowed = True
            except re.error:
                # invalid regex — fallback to not matching
                logger.warning("Invalid ALLOW_ORIGIN_REGEX")
    # If allowed, attach Access-Control headers (preflight-safe)
    if allowed:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Access-Control-Allow-Credentials"] = "true"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, PUT, DELETE, PATCH"
        resp.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept, Origin, X-Requested-With"
        resp.headers["Access-Control-Expose-Headers"] = "Content-Disposition, Content-Length"
    return resp

# ---------------- Static Files ----------------
os.makedirs("app/static", exist_ok=True)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# ---------------- Routers ----------------
app.include_router(query.router)
app.include_router(upload.router)
app.include_router(weather.router)
app.include_router(market.router)
app.include_router(policy.router)
app.include_router(chem_reco.router)
app.include_router(analytics.router)

# ---------------- Global Model ----------------
model = None

@app.on_event("startup")
async def load_model():
    global model
    if model is None:
        try:
            from sentence_transformers import SentenceTransformer
            # use the embed model configured in env if present
            embed_model_name = os.getenv("HF_MODEL_EMBED", "sentence-transformers/paraphrase-MiniLM-L3-v2")
            model = SentenceTransformer(embed_model_name, device="cpu")
            app.state.model = model
            logger.info(f"✅ SentenceTransformer model loaded ({embed_model_name}) and exposed on app.state.model")
        except Exception as e:
            logger.error(f"❌ Failed to load model on startup: {e}")
            app.state.model = None

# ---------------- System Endpoints ----------------
@app.get("/", tags=["System"])
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

@app.get("/api/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "demo_mode": DEMO_MODE,
        "database": "connected" if db.is_connected() else "local_mode",
    }

# ---------------- Database Seeder ----------------
@app.post("/api/seed", tags=["System"])
async def seed_database():
    if not db.is_connected():
        return {"message": "Database not connected, seeding skipped"}
    try:
        sample_docs = [
            {"title": "Wheat Cultivation Guide",
             "content": "Comprehensive guide for wheat cultivation including sowing, irrigation, and harvesting practices.",
             "source_url": "https://icar.org.in/wheat-guide"},
            {"title": "Tomato Disease Management",
             "content": "Integrated pest management strategies for tomato crops including biological and chemical control methods.",
             "source_url": "https://icar.org.in/tomato-ipm"},
        ]
        for doc in sample_docs:
            try:
                db.client.table("docs").insert(doc).execute()
            except Exception as e:
                logger.warning(f"⚠️ Failed to insert doc: {e}")

        sample_schemes = [
            {"name": "PM-KISAN",
             "code": "PM-KISAN",
             "description": "Income support scheme providing ₹6000 annually",
             "applicable_states": [],
             "applicable_crops": [],
             "url": "https://pmkisan.gov.in/"},
        ]
        for scheme in sample_schemes:
            try:
                db.client.table("schemes").insert(scheme).execute()
            except Exception as e:
                logger.warning(f"⚠️ Failed to insert scheme: {e}")

        return {"message": "Database seeded successfully"}

    except Exception as e:
        logger.error(f"❌ Database seeding failed: {e}")
        raise HTTPException(status_code=500, detail=f"Seeding failed: {str(e)}")

# ---------------- Analytics ----------------
class AnalyticsEvent(BaseModel):
    event_name: str
    payload: Dict[str, Any] = Field(default_factory=dict)

@app.post("/api/analytics", tags=["Analytics"])
async def log_analytics(event: AnalyticsEvent):
    try:
        logger.info(f"📊 Analytics event: {event.event_name}")
        return {"status": "logged"}
    except Exception as e:
        logger.error(f"❌ Analytics logging failed: {e}")
        return {"status": "failed", "error": str(e)}

# ---------------- Global Error Handler ----------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error occurred"},
    )

# ---------------- Run Server ----------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=DEBUG,
        log_level="info",
    )
