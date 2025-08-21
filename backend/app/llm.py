import json
import logging
import requests
import time
from typing import Dict, Any, List, Optional
from requests.adapters import HTTPAdapter, Retry
from app.config import HF_API_KEY, HF_MODEL, DEMO_MODE

# --- Logging Setup ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


class LLMClient:
    def __init__(self):
        self.api_key = HF_API_KEY
        self.model = HF_MODEL
        self.base_url = "https://api-inference.huggingface.co/models"

        # Setup session with retries
        self.session = requests.Session()
        retries = Retry(
            total=3,
            backoff_factor=2,
            status_forcelist=[429, 502, 503, 504],
            allowed_methods=["POST"]
        )
        self.session.mount("https://", HTTPAdapter(max_retries=retries))

    def query_huggingface(self, prompt: str, max_tokens: int = 256) -> Optional[str]:
        """Query Hugging Face Inference API with retries and backoff"""
        if not self.api_key or not self.model:
            logger.warning("HF_API_KEY or HF_MODEL missing → skipping HF call, using fallback.")
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

        url = f"{self.base_url}/{self.model}"

        for attempt in range(3):  # try up to 3 times
            try:
                response = self.session.post(url, headers=headers, json=payload, timeout=60)

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

                elif response.status_code == 503 and "is currently loading" in response.text:
                    # Model is still loading, wait and retry
                    logger.warning(f"Model {self.model} is loading. Retrying in {5 * (attempt+1)}s...")
                    time.sleep(5 * (attempt + 1))
                    continue

                else:
                    logger.error(f"HF API error {response.status_code}: {response.text}")
                    return None

            except Exception as e:
                logger.error(f"HF API request failed (attempt {attempt+1}): {e}")
                time.sleep(2 * (attempt + 1))  # backoff and retry

        return None  # after retries exhausted

    def synthesize_answer(
        self,
        prompt_text: str,
        retrieved_docs: List[Dict[str, Any]],
        image_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """Synthesize answer using HF API or deterministic fallback"""

        # Try HF API first (only if DEMO_MODE is False)
        if not DEMO_MODE:
            hf_response = None
            try:
                hf_response = self.query_huggingface(prompt_text)
            except Exception as e:
                logger.error(f"HuggingFace API call crashed: {e}")

            if hf_response:
                try:
                    # Try to parse as JSON
                    parsed = json.loads(hf_response)
                    if self._validate_response(parsed):
                        parsed["meta"] = {"mode": "ai", "model": self.model}
                        return parsed
                except json.JSONDecodeError:
                    # If not JSON, wrap in response format
                    return {
                        "answer": hf_response.strip(),
                        "confidence": 0.7,
                        "actions": [],
                        "sources": [],
                        "meta": {"mode": "ai", "model": self.model}
                    }

        # Fallback to deterministic synthesis (works offline too)
        return self._deterministic_fallback(prompt_text, retrieved_docs, image_context)

    # --- Deterministic fallback methods unchanged ---
    def _deterministic_fallback(self, prompt_text: str, retrieved_docs: List[Dict[str, Any]],
                               image_context: Optional[str] = None) -> Dict[str, Any]:
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

        answer = self._generate_contextual_answer(prompt_text, context_snippets, image_context)
        actions = self._generate_actions(prompt_text, image_context)
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
        query_lower = query.lower()

        if image_context:
            if "disease" in query_lower or "pest" in query_lower:
                return f"Based on the uploaded image showing {image_context}, I can see potential issues that may require attention. {' '.join(snippets[:2]) if snippets else 'Please consult with a local agricultural expert for proper diagnosis and treatment recommendations.'}"
            else:
                return f"From the uploaded image of {image_context}, {' '.join(snippets[:2]) if snippets else 'this appears to be a healthy crop. Continue with regular care and monitoring.'}"

        if any(word in query_lower for word in ["irrigate", "water", "rain", "weather"]):
            base_answer = "For irrigation timing, consider soil moisture, weather conditions, and crop growth stage."
            return f"{base_answer} {snippets[0]}" if snippets else f"{base_answer} Check soil moisture at 6-inch depth and irrigate when it feels dry."

        if any(word in query_lower for word in ["pest", "disease", "insect", "fungus"]):
            base_answer = "For pest and disease management, early identification and integrated pest management are key."
            return f"{base_answer} {snippets[0]}" if snippets else f"{base_answer} Monitor crops regularly and consult local agricultural extension services for specific treatments."

        if any(word in query_lower for word in ["plant", "sow", "seed", "timing"]):
            base_answer = "Planting timing depends on local climate, soil conditions, and crop variety."
            return f"{base_answer} {snippets[0]}" if snippets else f"{base_answer} Consult your local agricultural calendar and weather forecasts for optimal timing."

        if any(word in query_lower for word in ["price", "market", "sell", "buy"]):
            base_answer = "Market prices fluctuate based on supply, demand, and seasonal factors."
            return f"{base_answer} {snippets[0]}" if snippets else f"{base_answer} Check local mandi prices and consider storage options during peak harvest."

        if snippets:
            return f"Based on agricultural best practices: {' '.join(snippets[:2])}"

        return "For specific agricultural advice, I recommend consulting with your local Krishi Vigyan Kendra (KVK) or agricultural extension officer who can provide guidance tailored to your local conditions and crops."

    def _generate_actions(self, query: str, image_context: Optional[str] = None) -> List[str]:
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

        if not actions:
            actions = [
                "Consult local agricultural expert",
                "Monitor crop conditions regularly",
                "Keep records of farming activities"
            ]

        return actions[:3]

    def _validate_response(self, response: Dict[str, Any]) -> bool:
        required_fields = ["answer", "confidence", "actions", "sources"]
        return all(field in response for field in required_fields)


# Global instance
llm_client = LLMClient()
