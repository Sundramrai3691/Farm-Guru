import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.db import db
from app.retriever import retriever

logger = logging.getLogger(__name__)

router = APIRouter()

class ChemRecoRequest(BaseModel):
    crop: str
    symptom: str
    image_id: Optional[str] = None
    severity: Optional[str] = "moderate"  # mild, moderate, severe
    affected_area: Optional[str] = None   # leaves, stem, fruit, root

class Recommendation(BaseModel):
    type: str  # cultural, biological, chemical
    method: str
    description: str
    timing: str
    precautions: List[str]

class ChemRecoResponse(BaseModel):
    diagnosis: str
    confidence: float
    recommendations: List[Recommendation]
    next_steps: List[str]
    warnings: List[str]
    meta: Dict[str, Any]

@router.post("/api/chem-reco", response_model=ChemRecoResponse)
async def get_chemical_recommendations(request: ChemRecoRequest):
    """Get conservative chemical and management recommendations"""
    try:
        logger.info(f"Processing chemical recommendation for {request.crop} with symptom: {request.symptom}")
        
        # Get image context if provided
        image_context = None
        if request.image_id:
            image_data = db.get_image(request.image_id)
            if image_data:
                image_context = image_data.get("label", "")
        
        # Retrieve relevant documents for the crop and symptom
        query_text = f"{request.crop} {request.symptom} disease pest management treatment"
        retrieved_docs = retriever.retrieve(query_text, k=3)
        
        # Generate diagnosis based on symptoms and crop
        diagnosis = generate_diagnosis(request.crop, request.symptom, image_context)
        
        # Generate conservative recommendations
        recommendations = generate_recommendations(request, retrieved_docs)
        
        # Generate next steps and warnings
        next_steps = generate_next_steps(request, diagnosis)
        warnings = generate_warnings(request)
        
        # Calculate confidence based on available information
        confidence = calculate_confidence(request, image_context, retrieved_docs)
        
        response = ChemRecoResponse(
            diagnosis=diagnosis,
            confidence=confidence,
            recommendations=recommendations,
            next_steps=next_steps,
            warnings=warnings,
            meta={
                "crop": request.crop,
                "symptom": request.symptom,
                "has_image": bool(request.image_id),
                "retrieved_docs": len(retrieved_docs),
                "severity": request.severity
            }
        )
        
        logger.info(f"Generated {len(recommendations)} recommendations with confidence: {confidence}")
        return response
        
    except Exception as e:
        logger.error(f"Chemical recommendation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Recommendation generation failed: {str(e)}")

def generate_diagnosis(crop: str, symptom: str, image_context: Optional[str] = None) -> str:
    """Generate preliminary diagnosis based on crop and symptoms"""
    
    crop_lower = crop.lower()
    symptom_lower = symptom.lower()
    
    # Common crop-specific issues
    diagnoses = {
        "tomato": {
            "yellow": "Possible nutrient deficiency (nitrogen) or early blight",
            "spots": "Likely fungal disease - early blight or septoria leaf spot",
            "wilt": "Possible bacterial wilt or fusarium wilt",
            "curl": "Leaf curl virus or physiological stress"
        },
        "wheat": {
            "rust": "Wheat rust (yellow, brown, or black rust)",
            "spots": "Leaf spot or septoria tritici blotch",
            "yellow": "Nutrient deficiency or stripe rust",
            "wilt": "Root rot or take-all disease"
        },
        "rice": {
            "blast": "Rice blast disease",
            "brown": "Brown spot or bacterial leaf blight",
            "yellow": "Bacterial leaf blight or nutrient deficiency",
            "sheath": "Sheath blight disease"
        }
    }
    
    # Try to match crop and symptom
    if crop_lower in diagnoses:
        for key, diagnosis in diagnoses[crop_lower].items():
            if key in symptom_lower:
                if image_context:
                    return f"Based on symptoms and image analysis ({image_context}): {diagnosis}"
                return f"Based on described symptoms: {diagnosis}"
    
    # Generic diagnosis
    if any(word in symptom_lower for word in ["yellow", "yellowing"]):
        base_diagnosis = "Possible nutrient deficiency, disease, or environmental stress"
    elif any(word in symptom_lower for word in ["spot", "spots", "lesion"]):
        base_diagnosis = "Likely fungal or bacterial disease causing leaf spots"
    elif any(word in symptom_lower for word in ["wilt", "wilting"]):
        base_diagnosis = "Possible vascular disease or water stress"
    elif any(word in symptom_lower for word in ["curl", "curling"]):
        base_diagnosis = "Possible viral infection or environmental stress"
    else:
        base_diagnosis = "Requires detailed examination for accurate diagnosis"
    
    if image_context:
        return f"Based on symptoms and image analysis: {base_diagnosis}"
    return f"Preliminary assessment: {base_diagnosis}"

def generate_recommendations(request: ChemRecoRequest, retrieved_docs: List[Dict[str, Any]]) -> List[Recommendation]:
    """Generate conservative management recommendations"""
    
    recommendations = []
    
    # Always start with cultural practices
    recommendations.append(Recommendation(
        type="cultural",
        method="Sanitation and Cultural Practices",
        description="Remove affected plant parts and destroy them. Improve air circulation and avoid overhead watering. Ensure proper plant spacing.",
        timing="Immediate and ongoing",
        precautions=[
            "Disinfect tools between plants",
            "Do not compost diseased plant material",
            "Wash hands after handling affected plants"
        ]
    ))
    
    # Add biological control options
    if any(word in request.symptom.lower() for word in ["fungal", "spot", "blight", "rust"]):
        recommendations.append(Recommendation(
            type="biological",
            method="Biological Control",
            description="Apply beneficial microorganisms like Trichoderma or Pseudomonas. Use neem oil or other organic fungicides as preventive measure.",
            timing="Early morning or evening application",
            precautions=[
                "Test on small area first",
                "Avoid application during flowering",
                "Follow organic certification guidelines if applicable"
            ]
        ))
    
    # Conservative chemical recommendations only when necessary
    if request.severity == "severe":
        if any(word in request.symptom.lower() for word in ["fungal", "spot", "blight", "rust"]):
            recommendations.append(Recommendation(
                type="chemical",
                method="Fungicide Application (if severe)",
                description="Consider copper-based fungicides or other approved fungicides. Use only as last resort and follow integrated pest management principles.",
                timing="As per product label, typically early morning",
                precautions=[
                    "MANDATORY: Consult local agricultural extension officer",
                    "Read and follow all label instructions",
                    "Use protective equipment (gloves, mask, long sleeves)",
                    "Observe pre-harvest intervals",
                    "Rotate active ingredients to prevent resistance",
                    "Do not spray during windy conditions"
                ]
            ))
    
    # Add nutrient management if symptoms suggest deficiency
    if any(word in request.symptom.lower() for word in ["yellow", "pale", "stunted"]):
        recommendations.append(Recommendation(
            type="cultural",
            method="Nutrient Management",
            description="Conduct soil test to identify nutrient deficiencies. Apply balanced fertilizers or organic amendments based on soil test results.",
            timing="Based on crop growth stage and soil test recommendations",
            precautions=[
                "Avoid over-fertilization",
                "Apply fertilizers when soil moisture is adequate",
                "Follow recommended application rates"
            ]
        ))
    
    return recommendations

def generate_next_steps(request: ChemRecoRequest, diagnosis: str) -> List[str]:
    """Generate next steps for farmer"""
    
    next_steps = [
        "Monitor the affected plants daily for changes in symptoms",
        "Take clear photos of symptoms for documentation and expert consultation"
    ]
    
    if "requires detailed examination" in diagnosis.lower():
        next_steps.extend([
            "Contact your local Krishi Vigyan Kendra (KVK) for expert diagnosis",
            "Consider sending plant samples to nearest plant pathology lab"
        ])
    
    if request.severity in ["moderate", "severe"]:
        next_steps.extend([
            "Isolate affected plants if possible to prevent spread",
            "Check neighboring plants for similar symptoms"
        ])
    
    next_steps.extend([
        "Keep records of treatments applied and their effectiveness",
        "Implement preventive measures for next growing season",
        "Consider crop rotation if disease persists"
    ])
    
    return next_steps

def generate_warnings(request: ChemRecoRequest) -> List[str]:
    """Generate important warnings and disclaimers"""
    
    warnings = [
        "⚠️ IMPORTANT: This is preliminary guidance only. Always consult local agricultural experts for accurate diagnosis.",
        "⚠️ Chemical pesticides should be used only when necessary and as per expert recommendation.",
        "⚠️ Always read and follow pesticide labels completely before use.",
        "⚠️ Use appropriate protective equipment when handling any chemicals.",
        "⚠️ Observe pre-harvest intervals and maximum residue limits for food safety."
    ]
    
    if request.severity == "severe":
        warnings.insert(1, "⚠️ URGENT: Severe symptoms detected. Seek immediate expert consultation.")
    
    if not request.image_id:
        warnings.append("⚠️ NOTE: Recommendations are based on symptom description only. Image analysis would improve accuracy.")
    
    return warnings

def calculate_confidence(request: ChemRecoRequest, image_context: Optional[str], 
                        retrieved_docs: List[Dict[str, Any]]) -> float:
    """Calculate confidence score for recommendations"""
    
    base_confidence = 0.3  # Conservative base
    
    # Increase confidence based on available information
    if image_context:
        base_confidence += 0.2
    
    if len(retrieved_docs) > 0:
        base_confidence += 0.1 * len(retrieved_docs)
    
    if request.affected_area:
        base_confidence += 0.1
    
    # Specific crop-symptom combinations we're more confident about
    common_combinations = [
        ("tomato", "blight"), ("wheat", "rust"), ("rice", "blast"),
        ("potato", "blight"), ("cotton", "bollworm")
    ]
    
    for crop, symptom in common_combinations:
        if crop in request.crop.lower() and symptom in request.symptom.lower():
            base_confidence += 0.2
            break
    
    # Cap confidence at reasonable level for safety
    return min(0.8, base_confidence)

@router.get("/api/chem-reco/crops")
async def get_supported_crops():
    """Get list of crops supported for chemical recommendations"""
    crops = [
        {"name": "Tomato", "value": "tomato", "common_issues": ["early blight", "late blight", "leaf curl"]},
        {"name": "Wheat", "value": "wheat", "common_issues": ["rust", "leaf spot", "powdery mildew"]},
        {"name": "Rice", "value": "rice", "common_issues": ["blast", "brown spot", "sheath blight"]},
        {"name": "Cotton", "value": "cotton", "common_issues": ["bollworm", "aphids", "leaf curl"]},
        {"name": "Potato", "value": "potato", "common_issues": ["late blight", "early blight", "black scurf"]},
        {"name": "Onion", "value": "onion", "common_issues": ["purple blotch", "downy mildew", "thrips"]},
        {"name": "Chili", "value": "chili", "common_issues": ["anthracnose", "leaf curl", "fruit rot"]},
        {"name": "Maize", "value": "maize", "common_issues": ["leaf blight", "stalk rot", "fall armyworm"]}
    ]
    
    return {"crops": crops}

@router.get("/api/chem-reco/symptoms")
async def get_common_symptoms():
    """Get list of common crop symptoms"""
    symptoms = [
        {"category": "Leaf Issues", "symptoms": ["yellowing leaves", "brown spots", "leaf curl", "wilting", "holes in leaves"]},
        {"category": "Stem Issues", "symptoms": ["stem rot", "cankers", "galls", "stunted growth"]},
        {"category": "Fruit Issues", "symptoms": ["fruit rot", "spots on fruit", "premature drop", "deformed fruit"]},
        {"category": "Root Issues", "symptoms": ["root rot", "poor root development", "plant wilting despite adequate water"]},
        {"category": "General", "symptoms": ["overall yellowing", "stunted growth", "poor flowering", "reduced yield"]}
    ]
    
    return {"symptom_categories": symptoms}