import logging
import requests
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, Any, Optional
from app.config import DATA_GOV_API_KEY, OPENWEATHER_API_KEY
import json

logger = logging.getLogger(__name__)

router = APIRouter()

# Simple in-memory cache
weather_cache = {}
CACHE_DURATION = 3600  # 1 hour

class WeatherForecast(BaseModel):
    temperature: float
    humidity: float
    rainfall: float
    description: str

class WeatherResponse(BaseModel):
    forecast: WeatherForecast
    last_updated: str
    recommendation: str
    meta: Dict[str, Any]

@router.get("/api/weather", response_model=WeatherResponse)
async def get_weather(
    state: str = Query(..., description="State name"),
    district: str = Query(..., description="District name")
):
    """Get weather forecast and irrigation recommendations"""
    try:
        cache_key = f"{state}_{district}"
        
        # Check cache first
        if cache_key in weather_cache:
            cached_data, timestamp = weather_cache[cache_key]
            if datetime.now().timestamp() - timestamp < CACHE_DURATION:
                logger.info(f"Returning cached weather data for {state}, {district}")
                return WeatherResponse(**cached_data)
        
        # Try to fetch from government sources first
        weather_data = await fetch_government_weather(state, district)
        
        # Fallback to OpenWeatherMap
        if not weather_data:
            weather_data = await fetch_openweather(state, district)
        
        # Final fallback to demo data
        if not weather_data:
            weather_data = generate_demo_weather(state, district)
        
        # Generate irrigation recommendation
        recommendation = generate_irrigation_recommendation(weather_data["forecast"])
        weather_data["recommendation"] = recommendation
        weather_data["last_updated"] = datetime.now().isoformat()
        
        # Cache the result
        weather_cache[cache_key] = (weather_data, datetime.now().timestamp())
        
        logger.info(f"Weather data fetched for {state}, {district}")
        return WeatherResponse(**weather_data)
        
    except Exception as e:
        logger.error(f"Weather fetch failed: {e}")
        raise HTTPException(status_code=500, detail=f"Weather data unavailable: {str(e)}")

async def fetch_government_weather(state: str, district: str) -> Optional[Dict[str, Any]]:
    """Try to fetch weather from Indian government sources"""
    if not DATA_GOV_API_KEY:
        logger.info("DATA_GOV_API_KEY not available, skipping government sources")
        return None
    
    try:
        # Try IMD data through data.gov.in
        # Note: This is a placeholder URL - actual IMD API endpoints may vary
        imd_url = "https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69"
        
        params = {
            "api-key": DATA_GOV_API_KEY,
            "format": "json",
            "filters[state]": state,
            "filters[district]": district,
            "limit": 1
        }
        
        response = requests.get(imd_url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("records"):
                record = data["records"][0]
                
                return {
                    "forecast": WeatherForecast(
                        temperature=float(record.get("temperature", 28)),
                        humidity=float(record.get("humidity", 65)),
                        rainfall=float(record.get("rainfall", 0)),
                        description=record.get("weather_desc", "Partly cloudy")
                    ),
                    "meta": {
                        "source": "IMD/Data.gov.in",
                        "api_used": True
                    }
                }
        
    except Exception as e:
        logger.warning(f"Government weather API failed: {e}")
    
    return None

async def fetch_openweather(state: str, district: str) -> Optional[Dict[str, Any]]:
    """Fetch weather from OpenWeatherMap as fallback"""
    if not OPENWEATHER_API_KEY:
        logger.info("OPENWEATHER_API_KEY not available, skipping OpenWeatherMap")
        return None
    
    try:
        # Get coordinates for the location
        location = f"{district}, {state}, India"
        geo_url = "http://api.openweathermap.org/geo/1.0/direct"
        geo_params = {
            "q": location,
            "limit": 1,
            "appid": OPENWEATHER_API_KEY
        }
        
        geo_response = requests.get(geo_url, params=geo_params, timeout=10)
        
        if geo_response.status_code == 200:
            geo_data = geo_response.json()
            if geo_data:
                lat, lon = geo_data[0]["lat"], geo_data[0]["lon"]
                
                # Get weather data
                weather_url = "https://api.openweathermap.org/data/2.5/weather"
                weather_params = {
                    "lat": lat,
                    "lon": lon,
                    "appid": OPENWEATHER_API_KEY,
                    "units": "metric"
                }
                
                weather_response = requests.get(weather_url, params=weather_params, timeout=10)
                
                if weather_response.status_code == 200:
                    weather_data = weather_response.json()
                    
                    return {
                        "forecast": WeatherForecast(
                            temperature=weather_data["main"]["temp"],
                            humidity=weather_data["main"]["humidity"],
                            rainfall=weather_data.get("rain", {}).get("1h", 0),
                            description=weather_data["weather"][0]["description"]
                        ),
                        "meta": {
                            "source": "OpenWeatherMap",
                            "api_used": True,
                            "location": f"{lat}, {lon}"
                        }
                    }
        
    except Exception as e:
        logger.warning(f"OpenWeatherMap API failed: {e}")
    
    return None

def generate_demo_weather(state: str, district: str) -> Dict[str, Any]:
    """Generate demo weather data as final fallback"""
    import random
    
    # Generate realistic weather data based on season and location
    base_temp = 28
    if "punjab" in state.lower() or "haryana" in state.lower():
        base_temp = 25  # Cooler in northern states
    elif "rajasthan" in state.lower():
        base_temp = 32  # Hotter in desert regions
    elif "kerala" in state.lower() or "tamil nadu" in state.lower():
        base_temp = 30  # Warm and humid in south
    
    temperature = base_temp + random.uniform(-5, 5)
    humidity = random.uniform(45, 85)
    rainfall = random.uniform(0, 5)
    
    descriptions = [
        "Partly cloudy with chance of light rain",
        "Clear skies with moderate humidity",
        "Overcast with high humidity",
        "Sunny with low humidity",
        "Light rain expected"
    ]
    
    return {
        "forecast": WeatherForecast(
            temperature=round(temperature, 1),
            humidity=round(humidity, 1),
            rainfall=round(rainfall, 1),
            description=random.choice(descriptions)
        ),
        "meta": {
            "source": "Demo data",
            "api_used": False,
            "note": "This is simulated data for demonstration"
        }
    }

def generate_irrigation_recommendation(forecast: WeatherForecast) -> str:
    """Generate irrigation recommendation based on weather forecast"""
    recommendations = []
    
    if forecast.rainfall > 2:
        recommendations.append("Expected rainfall detected. Delay irrigation for 24-48 hours.")
    elif forecast.rainfall > 0.5:
        recommendations.append("Light rain expected. Monitor soil moisture before irrigating.")
    else:
        recommendations.append("No significant rainfall expected. Continue regular irrigation schedule.")
    
    if forecast.humidity > 80:
        recommendations.append("High humidity may increase disease risk. Ensure good air circulation.")
    elif forecast.humidity < 40:
        recommendations.append("Low humidity may increase water stress. Monitor crops closely.")
    
    if forecast.temperature > 35:
        recommendations.append("High temperature alert. Consider early morning or evening irrigation.")
    elif forecast.temperature < 15:
        recommendations.append("Cool weather. Reduce irrigation frequency and check for frost risk.")
    
    return " ".join(recommendations) if recommendations else "Weather conditions are favorable for normal farming activities."

@router.get("/api/weather/forecast")
async def get_extended_forecast(
    state: str = Query(...),
    district: str = Query(...),
    days: int = Query(7, ge=1, le=14)
):
    """Get extended weather forecast"""
    try:
        # For demo, generate extended forecast
        forecasts = []
        base_weather = generate_demo_weather(state, district)
        
        for i in range(days):
            date = (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%d")
            temp_variation = random.uniform(-3, 3)
            humidity_variation = random.uniform(-10, 10)
            
            forecast = {
                "date": date,
                "temperature": round(base_weather["forecast"].temperature + temp_variation, 1),
                "humidity": max(30, min(90, base_weather["forecast"].humidity + humidity_variation)),
                "rainfall": round(random.uniform(0, 3), 1),
                "description": base_weather["forecast"].description
            }
            forecasts.append(forecast)
        
        return {
            "location": f"{district}, {state}",
            "forecasts": forecasts,
            "meta": {
                "source": "Demo extended forecast",
                "generated_at": datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Extended forecast failed: {e}")
        raise HTTPException(status_code=500, detail="Extended forecast unavailable")

import random  # Add this import at the top