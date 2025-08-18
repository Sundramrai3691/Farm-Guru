import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.db import db

logger = logging.getLogger(__name__)

router = APIRouter()

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

@router.post("/api/policy-match", response_model=PolicyMatchResponse)
async def match_policies(request: PolicyMatchRequest):
    """Match government schemes based on farmer profile"""
    try:
        logger.info(f"Matching policies for state: {request.state}, crop: {request.crop}")
        
        # Get schemes from database or fallback data
        schemes = db.get_schemes(state=request.state, crop=request.crop)
        
        # If no schemes from DB, use fallback schemes
        if not schemes:
            schemes = get_fallback_schemes()
        
        # Filter schemes based on farmer profile
        matched_schemes = []
        for scheme in schemes:
            if is_eligible(scheme, request):
                matched_schemes.append(SchemeInfo(
                    name=scheme.get("name", ""),
                    code=scheme.get("code", ""),
                    description=scheme.get("description", ""),
                    eligibility=scheme.get("eligibility", []),
                    required_docs=scheme.get("required_docs", []),
                    benefits=scheme.get("benefits", ""),
                    application_url=scheme.get("url")
                ))
        
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
                    "farmer_type": request.farmer_type
                }
            }
        )
        
        logger.info(f"Found {len(matched_schemes)} matching schemes")
        return response
        
    except Exception as e:
        logger.error(f"Policy matching failed: {e}")
        raise HTTPException(status_code=500, detail=f"Policy matching failed: {str(e)}")

def is_eligible(scheme: Dict[str, Any], request: PolicyMatchRequest) -> bool:
    """Check if farmer is eligible for the scheme"""
    
    # Check state eligibility
    applicable_states = scheme.get("applicable_states", [])
    if applicable_states and request.state not in applicable_states:
        # Check if scheme is pan-India (empty list or contains "All")
        if not any(state.lower() in ["all", "india", "pan-india"] for state in applicable_states):
            return False
    
    # Check crop eligibility
    if request.crop:
        applicable_crops = scheme.get("applicable_crops", [])
        if applicable_crops and request.crop.lower() not in [crop.lower() for crop in applicable_crops]:
            return False
    
    # Check land size eligibility
    if request.land_size is not None:
        max_land_size = scheme.get("max_land_size")
        if max_land_size and request.land_size > max_land_size:
            return False
    
    # Check farmer type eligibility
    if request.farmer_type:
        eligible_farmer_types = scheme.get("eligible_farmer_types", [])
        if eligible_farmer_types and request.farmer_type not in eligible_farmer_types:
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
    
    if any("pm-kisan" in name for name in scheme_names):
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
                "Indian citizenship required"
            ],
            "required_docs": [
                "Aadhaar Card",
                "Land ownership papers",
                "Bank account details",
                "Mobile number"
            ],
            "benefits": "₹6000 per year in three installments of ₹2000 each",
            "url": "https://pmkisan.gov.in/",
            "applicable_states": [],  # Pan-India
            "applicable_crops": [],   # All crops
            "max_land_size": 2.0,
            "eligible_farmer_types": ["small", "marginal"]
        },
        {
            "name": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
            "code": "PMFBY",
            "description": "Crop insurance scheme protecting farmers against crop loss",
            "eligibility": [
                "All farmers (landowner/tenant)",
                "Notified crops in notified areas",
                "Compulsory for loanee farmers"
            ],
            "required_docs": [
                "Application form",
                "Aadhaar/Voter ID",
                "Bank account details",
                "Land records",
                "Sowing certificate"
            ],
            "benefits": "Comprehensive risk cover against all non-preventable natural risks",
            "url": "https://pmfby.gov.in/",
            "applicable_states": [],
            "applicable_crops": ["wheat", "rice", "cotton", "sugarcane", "oilseeds"],
            "eligible_farmer_types": ["small", "marginal", "large"]
        },
        {
            "name": "Kisan Credit Card (KCC)",
            "code": "KCC",
            "description": "Credit facility for farmers at subsidized interest rates",
            "eligibility": [
                "Farmers with land ownership",
                "Tenant farmers with valid documents",
                "SHG members involved in agriculture"
            ],
            "required_docs": [
                "KYC documents",
                "Land documents",
                "Income certificate",
                "Crop plan/budget"
            ],
            "benefits": "Credit up to ₹3 lakh at 4% interest rate (with subsidy)",
            "url": "https://www.nabard.org/content1.aspx?id=581",
            "applicable_states": [],
            "applicable_crops": [],
            "eligible_farmer_types": ["small", "marginal", "large"]
        },
        {
            "name": "PM-KUSUM",
            "code": "PM-KUSUM",
            "description": "Solar energy scheme for irrigation and grid feeding",
            "eligibility": [
                "Individual farmers",
                "Cooperatives/FPOs",
                "Water user associations"
            ],
            "required_docs": [
                "Application form",
                "Land documents",
                "Electricity connection proof",
                "Bank guarantee"
            ],
            "benefits": "30-60% subsidy on solar pumps and grid-connected solar plants",
            "url": "https://pmkusum.mnre.gov.in/",
            "applicable_states": [],
            "applicable_crops": [],
            "eligible_farmer_types": ["small", "marginal", "large"]
        },
        {
            "name": "Soil Health Card Scheme",
            "code": "SHC",
            "description": "Free soil testing and nutrient management recommendations",
            "eligibility": [
                "All farmers",
                "Land ownership or cultivation rights"
            ],
            "required_docs": [
                "Land documents",
                "Aadhaar card",
                "Application form"
            ],
            "benefits": "Free soil testing every 2 years with fertilizer recommendations",
            "url": "https://soilhealth.dac.gov.in/",
            "applicable_states": [],
            "applicable_crops": [],
            "eligible_farmer_types": ["small", "marginal", "large"]
        }
    ]

@router.get("/api/policy/schemes")
async def get_all_schemes(
    state: Optional[str] = None,
    crop: Optional[str] = None,
    limit: int = 20
):
    """Get all available schemes with optional filtering"""
    try:
        schemes = db.get_schemes(state=state, crop=crop)
        
        if not schemes:
            schemes = get_fallback_schemes()
        
        # Apply filters
        if state:
            schemes = [s for s in schemes if not s.get("applicable_states") or 
                      state in s.get("applicable_states", [])]
        
        if crop:
            schemes = [s for s in schemes if not s.get("applicable_crops") or 
                      crop.lower() in [c.lower() for c in s.get("applicable_crops", [])]]
        
        # Limit results
        schemes = schemes[:limit]
        
        return {
            "schemes": schemes,
            "total": len(schemes),
            "filters": {
                "state": state,
                "crop": crop
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get schemes: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve schemes")

@router.get("/api/policy/states")
async def get_states():
    """Get list of states for scheme filtering"""
    states = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
        "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
        "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
        "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
        "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
        "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry"
    ]
    
    return {"states": states}