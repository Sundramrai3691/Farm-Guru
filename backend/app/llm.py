import json
import logging
import requests
from typing import Dict, Any, List, Optional
from app.config import HF_API_KEY, HF_MODEL, DEMO_MODE

logger = logging.getLogger(__name__)

class LLMClient:
    def __init__(self):
        self.api_key = HF_API_KEY
        self.model = HF_MODEL
        self.base_url = "https://api-inference.huggingface.co/models"
        
    def query_huggingface(self, prompt: str, max_tokens: int = 256) -> Optional[str]:
        """Query Hugging Face Inference API"""
        if not self.api_key:
            logger.warning("HF_API_KEY not provided, using fallback")
            return None
            
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": max_tokens,
                "temperature": 0.0,
                "return_full_text": False
            }
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/{self.model}",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Handle different response formats
                if isinstance(result, list) and len(result) > 0:
                    if "generated_text" in result[0]:
                        return result[0]["generated_text"]
                elif isinstance(result, dict) and "generated_text" in result:
                    return result["generated_text"]
                    
                logger.warning(f"Unexpected HF response format: {result}")
                return None
            else:
                logger.error(f"HF API error {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"HF API request failed: {e}")
            return None

    def synthesize_answer(self, prompt_text: str, retrieved_docs: List[Dict[str, Any]], 
                         image_context: Optional[str] = None) -> Dict[str, Any]:
        """Synthesize answer using HF API or deterministic fallback"""
        
        # Try HF API first
        if not DEMO_MODE:
            hf_response = self.query_huggingface(prompt_text)
            if hf_response:
                try:
                    # Try to parse as JSON
                    parsed = json.loads(hf_response)
                    if self._validate_response(parsed):
                        parsed["meta"] = {"mode": "ai", "model": self.model}
                        return parsed
                except json.JSONDecodeError:
                    # If not JSON, wrap in response format
                    pass
        
        # Fallback to deterministic synthesis
        return self._deterministic_fallback(prompt_text, retrieved_docs, image_context)
    
    def _deterministic_fallback(self, prompt_text: str, retrieved_docs: List[Dict[str, Any]], 
                               image_context: Optional[str] = None) -> Dict[str, Any]:
        """Generate deterministic response from retrieved documents"""
        
        # Combine top retrieved snippets
        context_snippets = []
        sources = []
        
        for doc in retrieved_docs[:3]:
            if doc.get("snippet"):
                context_snippets.append(doc["snippet"])
            sources.append({
                "title": doc.get("title", "Agricultural Resource"),
                "url": doc.get("url", ""),
                "snippet": doc.get("snippet", "")[:100] + "..."
            })
        
        # Generate answer based on query type
        answer = self._generate_contextual_answer(prompt_text, context_snippets, image_context)
        
        # Generate actions based on query
        actions = self._generate_actions(prompt_text, image_context)
        
        # Calculate confidence based on retrieval quality
        confidence = min(0.8, 0.4 + (len(context_snippets) * 0.1))
        
        return {
            "answer": answer,
            "confidence": confidence,
            "actions": actions,
            "sources": sources,
            "meta": {
                "mode": "demo" if DEMO_MODE else "fallback",
                "retrieved_docs": len(retrieved_docs)
            }
        }
    
    def _generate_contextual_answer(self, query: str, snippets: List[str], 
                                   image_context: Optional[str] = None) -> str:
        """Generate contextual answer based on query patterns"""
        query_lower = query.lower()
        
        # Image-based queries
        if image_context:
            if "disease" in query_lower or "pest" in query_lower:
                return f"Based on the uploaded image showing {image_context}, I can see potential issues that may require attention. {' '.join(snippets[:2]) if snippets else 'Please consult with a local agricultural expert for proper diagnosis and treatment recommendations.'}"
            else:
                return f"From the uploaded image of {image_context}, {' '.join(snippets[:2]) if snippets else 'this appears to be a healthy crop. Continue with regular care and monitoring.'}"
        
        # Weather/irrigation queries
        if any(word in query_lower for word in ["irrigate", "water", "rain", "weather"]):
            base_answer = "For irrigation timing, consider soil moisture, weather conditions, and crop growth stage."
            if snippets:
                return f"{base_answer} {snippets[0]}"
            return f"{base_answer} Check soil moisture at 6-inch depth and irrigate when it feels dry."
        
        # Pest/disease queries
        if any(word in query_lower for word in ["pest", "disease", "insect", "fungus"]):
            base_answer = "For pest and disease management, early identification and integrated pest management are key."
            if snippets:
                return f"{base_answer} {snippets[0]}"
            return f"{base_answer} Monitor crops regularly and consult local agricultural extension services for specific treatments."
        
        # Planting/sowing queries
        if any(word in query_lower for word in ["plant", "sow", "seed", "timing"]):
            base_answer = "Planting timing depends on local climate, soil conditions, and crop variety."
            if snippets:
                return f"{base_answer} {snippets[0]}"
            return f"{base_answer} Consult your local agricultural calendar and weather forecasts for optimal timing."
        
        # Market/price queries
        if any(word in query_lower for word in ["price", "market", "sell", "buy"]):
            base_answer = "Market prices fluctuate based on supply, demand, and seasonal factors."
            if snippets:
                return f"{base_answer} {snippets[0]}"
            return f"{base_answer} Check local mandi prices and consider storage options during peak harvest."
        
        # General farming advice
        if snippets:
            return f"Based on agricultural best practices: {' '.join(snippets[:2])}"
        
        return "For specific agricultural advice, I recommend consulting with your local Krishi Vigyan Kendra (KVK) or agricultural extension officer who can provide guidance tailored to your local conditions and crops."
    
    def _generate_actions(self, query: str, image_context: Optional[str] = None) -> List[str]:
        """Generate relevant action items based on query"""
        query_lower = query.lower()
        actions = []
        
        if image_context or any(word in query_lower for word in ["disease", "pest", "problem"]):
            actions.extend([
                "Consult local KVK for expert diagnosis",
                "Monitor crop daily for changes",
                "Consider soil testing if needed"
            ])
        
        if any(word in query_lower for word in ["irrigate", "water"]):
            actions.extend([
                "Check soil moisture levels",
                "Monitor weather forecast",
                "Adjust irrigation schedule accordingly"
            ])
        
        if any(word in query_lower for word in ["plant", "sow", "seed"]):
            actions.extend([
                "Check local weather conditions",
                "Prepare soil with proper nutrients",
                "Source quality seeds from certified dealers"
            ])
        
        if any(word in query_lower for word in ["market", "price", "sell"]):
            actions.extend([
                "Check current mandi prices",
                "Consider storage options",
                "Plan harvest timing strategically"
            ])
        
        # Default actions if none specific
        if not actions:
            actions = [
                "Consult local agricultural expert",
                "Monitor crop conditions regularly",
                "Keep records of farming activities"
            ]
        
        return actions[:3]  # Limit to 3 actions
    
    def _validate_response(self, response: Dict[str, Any]) -> bool:
        """Validate that response has required fields"""
        required_fields = ["answer", "confidence", "actions", "sources"]
        return all(field in response for field in required_fields)

# Global instance
llm_client = LLMClient()