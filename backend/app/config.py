import os
from dotenv import load_dotenv

load_dotenv()

# Hugging Face Configuration
HF_API_KEY = os.getenv("HF_API_KEY")
HF_MODEL = os.getenv("HF_MODEL", "mistralai/Mixtral-8x7B-Instruct-v0.1")
HF_VISION_MODEL = os.getenv("HF_VISION_MODEL")

# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

# External API Keys
AGMARKNET_API_KEY = os.getenv("AGMARKNET_API_KEY")
DATA_GOV_API_KEY = os.getenv("DATA_GOV_API_KEY")
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

# Redis Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# App Configuration
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
DEMO_MODE = not bool(HF_API_KEY)