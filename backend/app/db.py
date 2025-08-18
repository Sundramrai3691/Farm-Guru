import logging
from typing import Optional, List, Dict, Any
from supabase import create_client, Client
from app.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

logger = logging.getLogger(__name__)

class SupabaseClient:
    def __init__(self):
        self.client: Optional[Client] = None
        if SUPABASE_URL and SUPABASE_SERVICE_KEY:
            try:
                self.client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
                logger.info("Supabase client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
                self.client = None
        else:
            logger.warning("Supabase credentials not provided, running in local mode")

    def is_connected(self) -> bool:
        return self.client is not None

    def insert_query(self, user_id: Optional[str], question: str, response: Dict[str, Any], 
                    confidence: float, agent: str = "farm-guru") -> Optional[str]:
        """Insert a query record into the queries table"""
        if not self.client:
            logger.info(f"Local mode: Query logged - {question[:50]}...")
            return None
        
        try:
            result = self.client.table("queries").insert({
                "user_id": user_id,
                "question": question,
                "response": response,
                "confidence": confidence,
                "agent": agent
            }).execute()
            
            if result.data:
                return result.data[0]["id"]
            return None
        except Exception as e:
            logger.error(f"Failed to insert query: {e}")
            return None

    def insert_image(self, filename: str, storage_path: Optional[str], 
                    label: Optional[str], confidence: Optional[float],
                    user_id: Optional[str] = None) -> Optional[str]:
        """Insert image metadata into the images table"""
        if not self.client:
            logger.info(f"Local mode: Image logged - {filename}")
            return None
        
        try:
            result = self.client.table("images").insert({
                "filename": filename,
                "storage_path": storage_path,
                "label": label,
                "confidence": confidence,
                "user_id": user_id
            }).execute()
            
            if result.data:
                return result.data[0]["id"]
            return None
        except Exception as e:
            logger.error(f"Failed to insert image: {e}")
            return None

    def get_image(self, image_id: str) -> Optional[Dict[str, Any]]:
        """Get image metadata by ID"""
        if not self.client:
            return None
        
        try:
            result = self.client.table("images").select("*").eq("id", image_id).execute()
            if result.data:
                return result.data[0]
            return None
        except Exception as e:
            logger.error(f"Failed to get image: {e}")
            return None

    def get_schemes(self, state: Optional[str] = None, crop: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get government schemes, optionally filtered by state and crop"""
        if not self.client:
            # Return demo schemes
            return [
                {
                    "name": "PM-KISAN",
                    "description": "Income support scheme providing ₹6000 annually",
                    "eligibility": ["Small & marginal farmers", "Land holding up to 2 hectares"],
                    "required_docs": ["Aadhaar Card", "Land ownership papers", "Bank details"]
                }
            ]
        
        try:
            query = self.client.table("schemes").select("*")
            
            if state:
                query = query.contains("applicable_states", [state])
            if crop:
                query = query.contains("applicable_crops", [crop])
            
            result = query.execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Failed to get schemes: {e}")
            return []

    def upload_file(self, bucket: str, file_path: str, file_data: bytes) -> Optional[str]:
        """Upload file to Supabase storage"""
        if not self.client:
            return None
        
        try:
            result = self.client.storage.from_(bucket).upload(file_path, file_data)
            if result:
                return f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{file_path}"
            return None
        except Exception as e:
            logger.error(f"Failed to upload file: {e}")
            return None

# Global instance
db = SupabaseClient()