import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.llm import llm_client
from app.retriever import retriever
from app.db import db

logger = logging.getLogger(__name__)

router = APIRouter()


class QueryRequest(BaseModel):
    user_id: Optional[str] = None
    text: str
    lang: str = "en"
    image_id: Optional[str] = None


class QueryResponse(BaseModel):
    answer: str
    confidence: float
    actions: list
    sources: list
    meta: Dict[str, Any]


@router.post("/api/query", response_model=QueryResponse)
async def query_assistant(request: QueryRequest):
    """Main query endpoint for Farm-Guru AI assistant with robust fallback"""
    try:
        logger.info(f"Processing query: {request.text[:50]}...")

        # Validate input
        if not request.text or not request.text.strip():
            raise HTTPException(status_code=400, detail="Query text cannot be empty")

        # Retrieve relevant documents
        retrieved_docs = []
        try:
            retrieved_docs = retriever.retrieve(request.text, k=3) or []
            logger.info(f"Retrieved {len(retrieved_docs)} documents")
        except Exception as e:
            logger.warning(f"Document retrieval failed: {e}")
            # Continue with empty docs - fallback will handle it

        # Handle image context if provided
        image_context = None
        if request.image_id:
            try:
                image_data = db.get_image(request.image_id)
                if image_data and image_data.get("label"):
                    image_context = f"Image shows: {image_data['label']}"
                    logger.info(f"Added image context: {image_context}")
            except Exception as e:
                logger.warning(f"Failed to get image context: {e}")
                # Continue without image context

        # Build context
        context_text = "\n".join([
            f"Title: {doc.get('title', 'N/A')}\nContent: {doc.get('content', doc.get('snippet', ''))}"
            for doc in retrieved_docs
        ])

        # Prompt template
        prompt_template = """You are Farm-Guru, an AI agricultural assistant. Based on the context and query, provide helpful farming advice.

Context:
{context}

Query: {query}

{image_context}

Respond with practical, actionable advice. Be concise but comprehensive."""

        prompt = prompt_template.format(
            context=context_text,
            query=request.text,
            image_context=f"\nImage Context: {image_context}" if image_context else ""
        )

        # Get response from LLM with enhanced fallback
        try:
            response = llm_client.synthesize_answer(prompt, retrieved_docs, image_context)
        except Exception as e:
            logger.error(f"LLM synthesis failed: {e}")
            response = None

        # Enhanced fallback if LLM fails or returns empty
        if not response or not response.get("answer"):
            logger.warning("LLM failed, returning enhanced fallback response")
            response = generate_enhanced_fallback(request.text, request.lang, image_context)

        # Validate response structure
        response = ensure_response_structure(response)

        # Save query to database (with error handling)
        try:
            query_id = db.insert_query(
                user_id=request.user_id,
                question=request.text,
                response=response,
                confidence=response.get("confidence", 0.5)
            )
            if query_id:
                response["meta"]["query_id"] = query_id
        except Exception as e:
            logger.warning(f"Failed to save query to database: {e}")
            # Continue without saving

        logger.info(f"Query processed successfully with confidence: {response.get('confidence', 0)}")

        return QueryResponse(**response)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Query processing failed: {e}")
        # Ultimate fallback in case of complete failure
        fallback = generate_emergency_fallback(request.text if hasattr(request, 'text') else "farming question", 
                                               request.lang if hasattr(request, 'lang') else "en")
        return QueryResponse(**fallback)


def generate_enhanced_fallback(query_text: str, lang: str, image_context: Optional[str] = None) -> Dict[str, Any]:
    """Generate enhanced fallback response based on query analysis"""
    
    query_lower = query_text.lower()
    
    # Language-specific responses
    if lang == 'hi':
        base_greeting = "मैं आपकी कृषि संबंधी सहायता के लिए यहाँ हूँ।"
        general_advice = "यहाँ कुछ सामान्य कृषि सुझाव हैं जो आपके लिए उपयोगी हो सकते हैं:"
    else:
        base_greeting = "I'm here to help with your farming questions."
        general_advice = "Here are some general farming tips that might be useful for your situation:"

    # Context-aware responses based on query content
    if any(word in query_lower for word in ["irrigate", "water", "rain", "drought"]):
        if lang == 'hi':
            answer = f"{base_greeting} सिंचाई के लिए मिट्टी की नमी की जांच करें और मौसम पूर्वानुमान देखें।"
            actions = ["मिट्टी की नमी की जांच करें", "मौसम पूर्वानुमान देखें", "सिंचाई का समय निर्धारित करें"]
        else:
            answer = f"{base_greeting} For irrigation, check soil moisture levels and monitor weather forecasts."
            actions = ["Check soil moisture levels", "Monitor weather forecasts", "Plan irrigation timing"]
    
    elif any(word in query_lower for word in ["pest", "disease", "insect", "fungus"]):
        if lang == 'hi':
            answer = f"{base_greeting} कीट और रोग प्रबंधन के लिए नियमित निगरानी और एकीकृत कीट प्रबंधन अपनाएं।"
            actions = ["फसल की नियमित जांच करें", "स्थानीय कृषि विशेषज्ञ से सलाह लें", "जैविक नियंत्रण विधियों का उपयोग करें"]
        else:
            answer = f"{base_greeting} For pest and disease management, regular monitoring and integrated pest management are essential."
            actions = ["Monitor crops regularly", "Consult local agricultural experts", "Use biological control methods"]
    
    elif any(word in query_lower for word in ["plant", "sow", "seed", "timing"]):
        if lang == 'hi':
            answer = f"{base_greeting} बुवाई का समय स्थानीय जलवायु और मिट्टी की स्थिति पर निर्भर करता है।"
            actions = ["स्थानीय कृषि कैलेंडर देखें", "मौसम पूर्वानुमान की जांच करें", "गुणवत्तापूर्ण बीज का चयन करें"]
        else:
            answer = f"{base_greeting} Planting timing depends on local climate and soil conditions."
            actions = ["Check local agricultural calendar", "Monitor weather forecasts", "Select quality seeds"]
    
    elif any(word in query_lower for word in ["price", "market", "sell", "buy"]):
        if lang == 'hi':
            answer = f"{base_greeting} बाजार की कीमतें मांग, आपूर्ति और मौसमी कारकों पर निर्भर करती हैं।"
            actions = ["स्थानीय मंडी की कीमतें देखें", "भंडारण विकल्पों पर विचार करें", "बिक्री का समय निर्धारित करें"]
        else:
            answer = f"{base_greeting} Market prices depend on supply, demand, and seasonal factors."
            actions = ["Check local mandi prices", "Consider storage options", "Plan selling timing"]
    
    else:
        # General farming advice
        if lang == 'hi':
            answer = f"{base_greeting} {general_advice} नियमित मिट्टी परीक्षण, संतुलित उर्वरक उपयोग, और एकीकृत कीट प्रबंधन अपनाएं।"
            actions = ["मिट्टी परीक्षण कराएं", "संतुलित उर्वरक का उपयोग करें", "स्थानीय KVK से सलाह लें"]
        else:
            answer = f"{base_greeting} {general_advice} Regular soil testing, balanced fertilization, and integrated pest management."
            actions = ["Conduct soil testing", "Use balanced fertilizers", "Consult local KVK"]

    # Add image context if available
    if image_context:
        if lang == 'hi':
            answer = f"अपलोड की गई तस्वीर के आधार पर ({image_context}): {answer}"
        else:
            answer = f"Based on the uploaded image ({image_context}): {answer}"

    return {
        "answer": answer,
        "confidence": 0.6,
        "actions": actions,
        "sources": [
            {
                "title": "ICAR Guidelines" if lang == 'en' else "ICAR दिशानिर्देश",
                "url": "https://icar.org.in",
                "snippet": "Comprehensive agricultural guidance and best practices" if lang == 'en' else "व्यापक कृषि मार्गदर्शन और सर्वोत्तम प्रथाएं"
            }
        ],
        "meta": {
            "mode": "fallback",
            "language": lang,
            "has_image": bool(image_context),
            "fallback_reason": "Enhanced offline guidance"
        }
    }


def generate_emergency_fallback(query_text: str, lang: str) -> Dict[str, Any]:
    """Emergency fallback for complete system failure"""
    
    if lang == 'hi':
        answer = "Farm-Guru अभी आपके प्रश्न को संसाधित नहीं कर सकता। यहाँ कुछ सुरक्षित सामान्य सुझाव हैं:"
        actions = ["मिट्टी की नमी की नियमित जांच करें", "रासायनिक उर्वरकों का अधिक उपयोग न करें", "मल्चिंग का उपयोग करें"]
    else:
        answer = "Farm-Guru cannot process your query right now. Here are some safe general suggestions:"
        actions = ["Check soil moisture regularly", "Avoid overuse of chemical fertilizers", "Use mulching to retain soil moisture"]

    return {
        "answer": answer,
        "confidence": 0.4,
        "actions": actions,
        "sources": [
            {
                "title": "General Agricultural Knowledge" if lang == 'en' else "सामान्य कृषि ज्ञान",
                "url": "",
                "snippet": "Basic farming principles and safety guidelines" if lang == 'en' else "बुनियादी कृषि सिद्धांत और सुरक्षा दिशानिर्देश"
            }
        ],
        "meta": {
            "mode": "emergency_fallback",
            "language": lang,
            "error": "System temporarily unavailable"
        }
    }


def ensure_response_structure(response: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure response has all required fields with proper types"""
    
    # Set defaults for missing fields
    if not response.get("answer"):
        response["answer"] = "I'm here to help with your farming questions."
    
    if not isinstance(response.get("confidence"), (int, float)):
        response["confidence"] = 0.5
    else:
        # Ensure confidence is between 0 and 1
        response["confidence"] = max(0.0, min(1.0, float(response["confidence"])))
    
    if not isinstance(response.get("actions"), list):
        response["actions"] = ["Consult local agricultural expert", "Monitor crop conditions"]
    
    if not isinstance(response.get("sources"), list):
        response["sources"] = []
    
    if not isinstance(response.get("meta"), dict):
        response["meta"] = {}
    
    # Ensure sources have proper structure
    validated_sources = []
    for source in response.get("sources", []):
        if isinstance(source, dict):
            validated_sources.append({
                "title": str(source.get("title", "Agricultural Resource")),
                "url": str(source.get("url", "")),
                "snippet": str(source.get("snippet", ""))
            })
    response["sources"] = validated_sources
    
    return response


@router.get("/api/query/history")
async def get_query_history(user_id: Optional[str] = None, limit: int = 10):
    """Get query history for a user with error handling"""
    try:
        if not db.is_connected():
            return {"message": "Query history not available in demo mode", "queries": []}

        query = db.client.table("queries").select("*").order("created_at", desc=True).limit(limit)

        if user_id:
            query = query.eq("user_id", user_id)

        result = query.execute()
        return {"queries": result.data if result.data else []}

    except Exception as e:
        logger.error(f"Failed to get query history: {e}")
        # Return empty history instead of error
        return {"message": "Query history temporarily unavailable", "queries": []}