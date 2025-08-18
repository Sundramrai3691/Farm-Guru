import logging
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.db import db

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------- Models (unchanged) ----------
class PolicyMatchRequest(BaseModel):
    user_id: Optional[str] = None
    state: str
    crop: Optional[str] = None
    land_size: Optional[float] = None  # in hectares
    farmer_type: Optional[str] = None  # small, marginal, large


class SchemeInfo(BaseModel):
    name: str
    code: str
    description: str
    eligibility: List[str]
    required_docs: List[str]
    benefits: str
    application_url: Optional[str] = None


class PolicyMatchResponse(BaseModel):
    matched_schemes: List[SchemeInfo]
    total_matches: int
    recommendations: List[str]
    meta: Dict[str, Any]


# ---------- Utilities ----------
def slugify(text: str) -> str:
    """Simple slugify to build a sentinel id/code from a name."""
    if not text:
        return ""
    text = str(text).strip().lower()
    # remove non-alphanum, replace spaces with hyphen
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text[:64]  # limit length


def ensure_list(x):
    if x is None:
        return []
    if isinstance(x, list):
        return x
    # if comma separated string
    if isinstance(x, str):
        return [s.strip() for s in x.split(",") if s.strip()]
    return [x]


def sanitize_scheme(raw: Dict[str, Any], idx: int) -> Dict[str, Any]:
    """Return a sanitized scheme dictionary with guaranteed non-empty id/code/name."""
    s = dict(raw or {})

    # Normalize name/title
    name = (s.get("name") or s.get("title") or s.get("scheme_name") or "").strip()
    if not name:
        name = f"Scheme {idx + 1}"

    # Normalize code
    code = (s.get("code") or s.get("scheme_code") or "").strip()
    if not code:
        code = slugify(name) or f"scheme-{idx+1}"

    # Ensure id
    sid = s.get("id") or s.get("_id") or s.get("code") or ""
    sid = str(sid).strip()
    if not sid:
        sid = code

    description = s.get("description") or s.get("details") or ""
    eligibility = ensure_list(s.get("eligibility") or s.get("eligible_for") or [])
    required_docs = ensure_list(s.get("required_docs") or s.get("documents") or [])
    benefits = s.get("benefits") or s.get("benefit") or ""
    url = s.get("url") or s.get("application_url") or None

    # Normalize applicable states/crops to lists
    applicable_states = ensure_list(s.get("applicable_states") or [])
    applicable_crops = ensure_list(s.get("applicable_crops") or [])

    # Max land size as float if present
    max_land_size = s.get("max_land_size")
    try:
        max_land_size = float(max_land_size) if max_land_size is not None else None
    except Exception:
        max_land_size = None

    eligible_farmer_types = ensure_list(s.get("eligible_farmer_types") or s.get("farmer_types") or [])

    sanitized = {
        "id": str(sid),
        "name": str(name),
        "code": str(code),
        "description": str(description),
        "eligibility": eligibility,
        "required_docs": required_docs,
        "benefits": str(benefits),
        "url": url,
        "applicable_states": applicable_states,
        "applicable_crops": applicable_crops,
        "max_land_size": max_land_size,
        "eligible_farmer_types": eligible_farmer_types,
    }
    return sanitized


# ---------- Core endpoints ----------
@router.post("/api/policy-match", response_model=PolicyMatchResponse)
async def match_policies(request: PolicyMatchRequest):
    """Match government schemes based on farmer profile"""
    try:
        logger.info(f"Matching policies for state: {request.state}, crop: {request.crop}")

        # Get schemes from database or fallback data
        schemes_raw = db.get_schemes(state=request.state, crop=request.crop) or []
        if not schemes_raw:
            schemes_raw = get_fallback_schemes()

        # Sanitize all schemes first
        sanitized_schemes = [sanitize_scheme(s, i) for i, s in enumerate(schemes_raw)]

        # Filter schemes based on farmer profile
        matched_schemes = []
        for scheme in sanitized_schemes:
            if is_eligible(scheme, request):
                matched_schemes.append(
                    SchemeInfo(
                        name=scheme.get("name", ""),
                        code=scheme.get("code", ""),
                        description=scheme.get("description", ""),
                        eligibility=scheme.get("eligibility", []),
                        required_docs=scheme.get("required_docs", []),
                        benefits=scheme.get("benefits", ""),
                        application_url=scheme.get("url"),
                    )
                )

        # Generate recommendations
        recommendations = generate_recommendations(request, matched_schemes)

        response = PolicyMatchResponse(
            matched_schemes=matched_schemes,
            total_matches=len(matched_schemes),
            recommendations=recommendations,
            meta={
                "state": request.state,
                "crop": request.crop,
                "search_criteria": {
                    "land_size": request.land_size,
                    "farmer_type": request.farmer_type,
                },
            },
        )

        logger.info(f"Found {len(matched_schemes)} matching schemes")
        return response

    except Exception as e:
        logger.exception(f"Policy matching failed: {e}")
        raise HTTPException(status_code=500, detail=f"Policy matching failed: {str(e)}")


def is_eligible(scheme: Dict[str, Any], request: PolicyMatchRequest) -> bool:
    """Check if farmer is eligible for the scheme"""

    # Check state eligibility
    applicable_states = [s.lower() for s in (scheme.get("applicable_states") or [])]
    if applicable_states:
        if request.state.lower() not in applicable_states and not any(
            state in ["all", "india", "pan-india"] for state in applicable_states
        ):
            return False

    # Check crop eligibility
    if request.crop:
        applicable_crops = [c.lower() for c in (scheme.get("applicable_crops") or [])]
        if applicable_crops and request.crop.lower() not in applicable_crops:
            return False

    # Check land size eligibility
    if request.land_size is not None:
        max_land_size = scheme.get("max_land_size")
        if max_land_size is not None:
            try:
                if request.land_size > float(max_land_size):
                    return False
            except Exception:
                # if max_land_size is not numeric, ignore it
                pass

    # Check farmer type eligibility
    if request.farmer_type:
        eligible_farmer_types = [t.lower() for t in (scheme.get("eligible_farmer_types") or [])]
        if eligible_farmer_types and request.farmer_type.lower() not in eligible_farmer_types:
            return False

    return True


def generate_recommendations(request: PolicyMatchRequest, matched_schemes: List[SchemeInfo]) -> List[str]:
    """Generate personalized recommendations"""
    recommendations = []

    if not matched_schemes:
        recommendations.append("No specific schemes found for your profile. Consider visiting your local KVK for guidance.")
        recommendations.append("Check eligibility for general farmer welfare schemes like PM-KISAN.")
        return recommendations

    # Priority recommendations based on scheme types
    scheme_names = [s.name.lower() for s in matched_schemes]

    if any("pm-kisan" in name or "pm kisan" in name for name in scheme_names):
        recommendations.append("Apply for PM-KISAN first as it provides direct income support with minimal documentation.")

    if any("insurance" in name or "pmfby" in name for name in scheme_names):
        recommendations.append("Consider crop insurance (PMFBY) to protect against weather risks and crop losses.")

    if any("credit" in name or "kcc" in name for name in scheme_names):
        recommendations.append("Kisan Credit Card can provide easy access to agricultural credit at subsidized rates.")

    if request.land_size and request.land_size <= 2:
        recommendations.append("As a small/marginal farmer, you may get priority in most government schemes.")

    if len(matched_schemes) > 3:
        recommendations.append("You're eligible for multiple schemes. Start with income support schemes, then consider credit and insurance.")

    recommendations.append("Visit your nearest Common Service Center (CSC) for application assistance.")

    return recommendations


def get_fallback_schemes() -> List[Dict[str, Any]]:
    """Fallback schemes data when database is not available"""
    return [
        {
            "name": "PM-KISAN",
            "code": "PM-KISAN",
            "description": "Income support scheme providing ₹6000 annually to farmer families",
            "eligibility": [
                "Small and marginal farmer families",
                "Land holding up to 2 hectares",
                "Indian citizenship required",
            ],
            "required_docs": ["Aadhaar Card", "Land ownership papers", "Bank account details", "Mobile number"],
            "benefits": "₹6000 per year in three installments of ₹2000 each",
            "url": "https://pmkisan.gov.in/",
            "applicable_states": [],  # Pan-India
            "applicable_crops": [],  # All crops
            "max_land_size": 2.0,
            "eligible_farmer_types": ["small", "marginal"],
        },
        # other fallback schemes...
        {
            "name": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
            "code": "PMFBY",
            "description": "Crop insurance scheme protecting farmers against crop loss",
            "eligibility": ["All farmers (landowner/tenant)", "Notified crops in notified areas", "Compulsory for loanee farmers"],
            "required_docs": ["Application form", "Aadhaar/Voter ID", "Bank account details", "Land records", "Sowing certificate"],
            "benefits": "Comprehensive risk cover against all non-preventable natural risks",
            "url": "https://pmfby.gov.in/",
            "applicable_states": [],
            "applicable_crops": ["wheat", "rice", "cotton", "sugarcane", "oilseeds"],
            "eligible_farmer_types": ["small", "marginal", "large"],
        },
    ]


@router.get("/api/policy/schemes")
async def get_all_schemes(state: Optional[str] = None, crop: Optional[str] = None, limit: int = 20):
    """Get all available schemes with optional filtering"""
    try:
        schemes_raw = db.get_schemes(state=state, crop=crop) or []
        if not schemes_raw:
            schemes_raw = get_fallback_schemes()

        # Sanitize outputs
        sanitized = [sanitize_scheme(s, i) for i, s in enumerate(schemes_raw)]

        # Apply filters (case-insensitive)
        if state:
            state_l = state.lower()
            sanitized = [
                s
                for s in sanitized
                if not s.get("applicable_states") or state_l in [st.lower() for st in s.get("applicable_states", [])]
            ]

        if crop:
            crop_l = crop.lower()
            sanitized = [
                s
                for s in sanitized
                if not s.get("applicable_crops") or crop_l in [c.lower() for c in s.get("applicable_crops", [])]
            ]

        # Limit results
        sanitized = sanitized[: max(0, int(limit or 20))]

        return {"schemes": sanitized, "total": len(sanitized), "filters": {"state": state, "crop": crop}}

    except Exception as e:
        logger.exception(f"Failed to get schemes: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve schemes")


@router.get("/api/policy/states")
async def get_states():
    """Get list of states for scheme filtering"""
    states = [
        "Andhra Pradesh",
        "Arunachal Pradesh",
        "Assam",
        "Bihar",
        "Chhattisgarh",
        "Goa",
        "Gujarat",
        "Haryana",
        "Himachal Pradesh",
        "Jharkhand",
        "Karnataka",
        "Kerala",
        "Madhya Pradesh",
        "Maharashtra",
        "Manipur",
        "Meghalaya",
        "Mizoram",
        "Nagaland",
        "Odisha",
        "Punjab",
        "Rajasthan",
        "Sikkim",
        "Tamil Nadu",
        "Telangana",
        "Tripura",
        "Uttar Pradesh",
        "Uttarakhand",
        "West Bengal",
        "Delhi",
        "Jammu and Kashmir",
        "Ladakh",
        "Puducherry",
    ]

    return {"states": states}
