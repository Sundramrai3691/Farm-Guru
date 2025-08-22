import os
import uvicorn
from app.main import app

if __name__ == "__main__":
    uvicorn.run(
        app,  # use the imported object directly
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),  # Render sets PORT dynamically
        log_level="info"
    )
