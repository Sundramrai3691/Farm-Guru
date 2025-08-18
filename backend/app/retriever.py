import logging
import numpy as np
from typing import List, Dict, Any, Optional
from sentence_transformers import SentenceTransformer
from app.db import db

logger = logging.getLogger(__name__)

class DocumentRetriever:
    def __init__(self):
        self.model = None
        self.documents = []
        self.embeddings = None
        self._load_model()
        self._load_documents()
    
    def _load_model(self):
        """Load sentence transformer model for embeddings"""
        try:
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Sentence transformer model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load sentence transformer: {e}")
            self.model = None
    
    def _load_documents(self):
        """Load documents from Supabase or use fallback knowledge base"""
        if db.is_connected():
            try:
                # Try to load from Supabase docs table
                result = db.client.table("docs").select("*").execute()
                if result.data:
                    self.documents = result.data
                    logger.info(f"Loaded {len(self.documents)} documents from Supabase")
                    return
            except Exception as e:
                logger.error(f"Failed to load documents from Supabase: {e}")
        
        # Fallback to hardcoded knowledge base
        self.documents = self._get_fallback_documents()
        logger.info(f"Using fallback knowledge base with {len(self.documents)} documents")
        
        # Pre-compute embeddings for fallback documents
        if self.model:
            try:
                texts = [doc["content"] for doc in self.documents]
                self.embeddings = self.model.encode(texts)
                logger.info("Pre-computed embeddings for fallback documents")
            except Exception as e:
                logger.error(f"Failed to compute embeddings: {e}")
    
    def _get_fallback_documents(self) -> List[Dict[str, Any]]:
        """Fallback agricultural knowledge base"""
        return [
            {
                "id": "1",
                "title": "Wheat Irrigation Guidelines",
                "content": "Wheat requires 4-6 irrigations during its growing season. Critical stages for irrigation include crown root initiation (20-25 days), tillering (40-45 days), jointing (60-65 days), flowering (85-90 days), and grain filling (100-110 days). Soil moisture should be maintained at 50-60% of field capacity.",
                "url": "https://icar.org.in/wheat-cultivation",
                "snippet": "Wheat requires 4-6 irrigations during growing season at critical stages including crown root initiation, tillering, jointing, flowering, and grain filling."
            },
            {
                "id": "2", 
                "title": "Tomato Pest Management",
                "content": "Common tomato pests include whitefly, aphids, thrips, and fruit borers. Integrated pest management includes crop rotation, resistant varieties, biological control agents like Trichogramma, and need-based pesticide application. Monitor crops weekly for early detection.",
                "url": "https://icar.org.in/tomato-pest-management",
                "snippet": "Tomato pest management requires integrated approach with crop rotation, resistant varieties, biological control, and regular monitoring for early detection."
            },
            {
                "id": "3",
                "title": "Rice Planting Calendar",
                "content": "Rice planting timing varies by region. Kharif rice is sown June-July, transplanted July-August. Rabi rice sown November-December in southern states. Seed treatment with fungicides recommended. Maintain 2-3 cm water level after transplanting.",
                "url": "https://icar.org.in/rice-cultivation",
                "snippet": "Rice planting timing: Kharif sown June-July, Rabi November-December. Seed treatment and proper water management essential for good yields."
            },
            {
                "id": "4",
                "title": "Soil Health Management",
                "content": "Soil testing every 2-3 years helps determine nutrient status. Organic matter addition through compost, FYM improves soil structure. Balanced NPK application based on soil test results. Micronutrient deficiencies common in alkaline soils.",
                "url": "https://icar.org.in/soil-health",
                "snippet": "Regular soil testing, organic matter addition, and balanced fertilization based on soil test results are key for soil health management."
            },
            {
                "id": "5",
                "title": "Crop Disease Identification",
                "content": "Early disease detection crucial for management. Common symptoms include leaf spots, wilting, yellowing, stunted growth. Fungal diseases favored by high humidity. Bacterial diseases spread through water splash. Viral diseases transmitted by insects.",
                "url": "https://icar.org.in/plant-diseases",
                "snippet": "Early disease detection through symptom recognition (leaf spots, wilting, yellowing) enables timely management and prevents crop losses."
            },
            {
                "id": "6",
                "title": "Organic Farming Practices",
                "content": "Organic farming relies on natural inputs like compost, biofertilizers, biopesticides. Crop rotation, intercropping, and cover crops maintain soil fertility. Certification process takes 3 years. Premium prices offset lower yields initially.",
                "url": "https://icar.org.in/organic-farming",
                "snippet": "Organic farming uses natural inputs, crop rotation, and biological methods. Certification takes 3 years but offers premium market prices."
            },
            {
                "id": "7",
                "title": "Water Conservation Techniques",
                "content": "Drip irrigation saves 30-50% water compared to flood irrigation. Mulching reduces evaporation losses. Rainwater harvesting and farm ponds store monsoon water. Laser land leveling improves water use efficiency in flood irrigation.",
                "url": "https://icar.org.in/water-conservation",
                "snippet": "Water conservation through drip irrigation, mulching, rainwater harvesting, and laser leveling can save 30-50% water while maintaining yields."
            },
            {
                "id": "8",
                "title": "Post-Harvest Management",
                "content": "Proper harvesting timing, cleaning, drying, and storage reduce post-harvest losses. Moisture content should be 12-14% for safe storage. Use of hermetic storage, improved storage structures prevent pest damage and quality deterioration.",
                "url": "https://icar.org.in/post-harvest",
                "snippet": "Proper harvesting, drying to 12-14% moisture, and improved storage structures significantly reduce post-harvest losses and maintain quality."
            }
        ]
    
    def retrieve(self, query_text: str, k: int = 3) -> List[Dict[str, Any]]:
        """Retrieve most relevant documents for the query"""
        if not self.documents:
            logger.warning("No documents available for retrieval")
            return []
        
        if not self.model:
            # Simple keyword matching fallback
            return self._keyword_search(query_text, k)
        
        try:
            # Use Supabase vector search if available
            if db.is_connected() and hasattr(db.client, 'rpc'):
                try:
                    query_embedding = self.model.encode([query_text])[0].tolist()
                    result = db.client.rpc('match_documents', {
                        'query_embedding': query_embedding,
                        'match_threshold': 0.3,
                        'match_count': k
                    }).execute()
                    
                    if result.data:
                        return result.data
                except Exception as e:
                    logger.warning(f"Vector search failed, using fallback: {e}")
            
            # Fallback to local similarity search
            query_embedding = self.model.encode([query_text])
            
            if self.embeddings is not None:
                # Compute cosine similarity
                similarities = np.dot(query_embedding, self.embeddings.T).flatten()
                top_indices = np.argsort(similarities)[::-1][:k]
                
                results = []
                for idx in top_indices:
                    doc = self.documents[idx].copy()
                    doc['similarity'] = float(similarities[idx])
                    results.append(doc)
                
                return results
            else:
                # Fallback to keyword search
                return self._keyword_search(query_text, k)
                
        except Exception as e:
            logger.error(f"Retrieval failed: {e}")
            return self._keyword_search(query_text, k)
    
    def _keyword_search(self, query_text: str, k: int) -> List[Dict[str, Any]]:
        """Simple keyword-based search fallback"""
        query_words = set(query_text.lower().split())
        scored_docs = []
        
        for doc in self.documents:
            content_words = set(doc.get("content", "").lower().split())
            title_words = set(doc.get("title", "").lower().split())
            
            # Simple scoring: title matches worth more
            title_score = len(query_words.intersection(title_words)) * 2
            content_score = len(query_words.intersection(content_words))
            total_score = title_score + content_score
            
            if total_score > 0:
                doc_copy = doc.copy()
                doc_copy['similarity'] = total_score
                scored_docs.append(doc_copy)
        
        # Sort by score and return top k
        scored_docs.sort(key=lambda x: x['similarity'], reverse=True)
        return scored_docs[:k]

# Global instance
retriever = DocumentRetriever()