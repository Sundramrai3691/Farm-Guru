import pytest
from fastapi.testclient import TestClient
from app.main import app
import os

client = TestClient(app)

def test_query_endpoint_without_hf_key():
    """Test that /api/query returns valid JSON even without HF_API_KEY"""
    
    # Temporarily remove HF_API_KEY if present
    original_key = os.environ.get("HF_API_KEY")
    if "HF_API_KEY" in os.environ:
        del os.environ["HF_API_KEY"]
    
    try:
        response = client.post("/api/query", json={
            "text": "When should I irrigate wheat?",
            "lang": "en"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields are present
        assert "answer" in data
        assert "confidence" in data
        assert "actions" in data
        assert "sources" in data
        assert "meta" in data
        
        # Check data types
        assert isinstance(data["answer"], str)
        assert isinstance(data["confidence"], (int, float))
        assert isinstance(data["actions"], list)
        assert isinstance(data["sources"], list)
        assert isinstance(data["meta"], dict)
        
        # Check that it's using fallback mode
        assert data["meta"].get("mode") in ["demo", "fallback"]
        
    finally:
        # Restore original key if it existed
        if original_key:
            os.environ["HF_API_KEY"] = original_key

def test_query_endpoint_with_image():
    """Test query endpoint with image context"""
    response = client.post("/api/query", json={
        "text": "What disease is affecting my crop?",
        "lang": "en",
        "image_id": "test-image-123"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert len(data["answer"]) > 0

def test_health_endpoint():
    """Test health check endpoint"""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "healthy"

def test_root_endpoint():
    """Test root endpoint returns API info"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "endpoints" in data
    assert "/api/query" in data["endpoints"]["query"]