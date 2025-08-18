import logging
import requests
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.config import AGMARKNET_API_KEY
import json
import random

logger = logging.getLogger(__name__)

router = APIRouter()

# Simple in-memory cache
market_cache = {}
CACHE_DURATION = 1800  # 30 minutes

class PriceHistory(BaseModel):
    date: str
    price: float

class MarketResponse(BaseModel):
    commodity: str
    mandi: str
    latest_price: float
    seven_day_ma: float
    signal: str
    history: List[PriceHistory]
    meta: Dict[str, Any]

@router.get("/api/market", response_model=MarketResponse)
async def get_market_data(
    commodity: str = Query(..., description="Commodity name"),
    mandi: str = Query(..., description="Mandi/market name")
):
    """Get commodity market prices and trading signals"""
    try:
        cache_key = f"{commodity}_{mandi}"
        
        # Check cache first
        if cache_key in market_cache:
            cached_data, timestamp = market_cache[cache_key]
            if datetime.now().timestamp() - timestamp < CACHE_DURATION:
                logger.info(f"Returning cached market data for {commodity} at {mandi}")
                return MarketResponse(**cached_data)
        
        # Try to fetch from AGMARKNET
        market_data = await fetch_agmarknet_data(commodity, mandi)
        
        # Fallback to demo data
        if not market_data:
            market_data = generate_demo_market_data(commodity, mandi)
        
        # Calculate 7-day moving average and signal
        if len(market_data["history"]) >= 7:
            recent_prices = [p.price for p in market_data["history"][-7:]]
            seven_day_ma = sum(recent_prices) / len(recent_prices)
        else:
            seven_day_ma = market_data["latest_price"]
        
        # Generate trading signal
        signal = generate_trading_signal(market_data["latest_price"], seven_day_ma)
        
        result = {
            "commodity": commodity,
            "mandi": mandi,
            "latest_price": market_data["latest_price"],
            "seven_day_ma": round(seven_day_ma, 2),
            "signal": signal,
            "history": market_data["history"],
            "meta": market_data.get("meta", {})
        }
        
        # Cache the result
        market_cache[cache_key] = (result, datetime.now().timestamp())
        
        logger.info(f"Market data fetched for {commodity} at {mandi}: ₹{market_data['latest_price']}")
        return MarketResponse(**result)
        
    except Exception as e:
        logger.error(f"Market data fetch failed: {e}")
        raise HTTPException(status_code=500, detail=f"Market data unavailable: {str(e)}")

async def fetch_agmarknet_data(commodity: str, mandi: str) -> Optional[Dict[str, Any]]:
    """Try to fetch data from AGMARKNET"""
    if not AGMARKNET_API_KEY:
        logger.info("AGMARKNET_API_KEY not available, skipping AGMARKNET")
        return None
    
    try:
        # AGMARKNET API endpoint (this is a placeholder - actual endpoint may vary)
        # In practice, you might need to scrape their website or use their specific API format
        agmarknet_url = "https://agmarknet.gov.in/SearchCmmMkt.aspx"
        
        # Try to get data (this is a simplified example)
        # Real implementation would need to handle AGMARKNET's specific API format
        params = {
            "Tx_Commodity": commodity,
            "Tx_State": "All",
            "Tx_District": "All",
            "Tx_Market": mandi,
            "DateFrom": (datetime.now() - timedelta(days=7)).strftime("%d-%b-%Y"),
            "DateTo": datetime.now().strftime("%d-%b-%Y"),
            "Fr": "1"
        }
        
        # Note: AGMARKNET might require specific headers and session handling
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; Farm-Guru/1.0; +https://farm-guru.ai)"
        }
        
        response = requests.get(agmarknet_url, params=params, headers=headers, timeout=15)
        
        if response.status_code == 200:
            # Parse response (would need actual parsing logic for AGMARKNET format)
            # This is a placeholder - real implementation would parse HTML/CSV/JSON response
            logger.info("AGMARKNET response received, but parsing not implemented")
            return None
        
    except Exception as e:
        logger.warning(f"AGMARKNET fetch failed: {e}")
    
    return None

def generate_demo_market_data(commodity: str, mandi: str) -> Dict[str, Any]:
    """Generate demo market data as fallback"""
    
    # Base prices for different commodities (₹ per quintal)
    base_prices = {
        "wheat": 2300,
        "rice": 3200,
        "tomato": 1800,
        "onion": 1500,
        "potato": 1200,
        "cotton": 5500,
        "sugarcane": 350,
        "maize": 1800,
        "soybean": 4200,
        "groundnut": 5800
    }
    
    # Get base price for commodity
    commodity_lower = commodity.lower()
    base_price = base_prices.get(commodity_lower, 2000)
    
    # Generate 7 days of price history with realistic variations
    history = []
    current_price = base_price
    
    for i in range(7, 0, -1):
        date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        
        # Add realistic price variation (±5%)
        variation = random.uniform(-0.05, 0.05)
        current_price = max(base_price * 0.8, current_price * (1 + variation))
        
        history.append(PriceHistory(
            date=date,
            price=round(current_price, 2)
        ))
    
    # Add today's price
    today_variation = random.uniform(-0.03, 0.03)
    latest_price = round(current_price * (1 + today_variation), 2)
    
    history.append(PriceHistory(
        date=datetime.now().strftime("%Y-%m-%d"),
        price=latest_price
    ))
    
    return {
        "latest_price": latest_price,
        "history": history,
        "meta": {
            "source": "Demo data",
            "api_used": False,
            "note": "This is simulated market data for demonstration",
            "base_price": base_price
        }
    }

def generate_trading_signal(latest_price: float, seven_day_ma: float) -> str:
    """Generate trading signal based on price analysis"""
    
    # Calculate percentage difference
    price_diff_pct = ((latest_price - seven_day_ma) / seven_day_ma) * 100
    
    if price_diff_pct > 5:
        return "SELL"  # Price is significantly above average
    elif price_diff_pct < -5:
        return "BUY"   # Price is significantly below average
    else:
        return "HOLD"  # Price is near average

@router.get("/api/market/commodities")
async def get_available_commodities():
    """Get list of available commodities"""
    commodities = [
        {"name": "Wheat", "value": "wheat", "unit": "quintal"},
        {"name": "Rice", "value": "rice", "unit": "quintal"},
        {"name": "Tomato", "value": "tomato", "unit": "quintal"},
        {"name": "Onion", "value": "onion", "unit": "quintal"},
        {"name": "Potato", "value": "potato", "unit": "quintal"},
        {"name": "Cotton", "value": "cotton", "unit": "quintal"},
        {"name": "Sugarcane", "value": "sugarcane", "unit": "quintal"},
        {"name": "Maize", "value": "maize", "unit": "quintal"},
        {"name": "Soybean", "value": "soybean", "unit": "quintal"},
        {"name": "Groundnut", "value": "groundnut", "unit": "quintal"}
    ]
    
    return {"commodities": commodities}

@router.get("/api/market/mandis")
async def get_available_mandis(state: Optional[str] = None):
    """Get list of available mandis/markets"""
    mandis = [
        {"name": "Bengaluru", "state": "Karnataka"},
        {"name": "Mumbai", "state": "Maharashtra"},
        {"name": "Delhi", "state": "Delhi"},
        {"name": "Chennai", "state": "Tamil Nadu"},
        {"name": "Hyderabad", "state": "Telangana"},
        {"name": "Kolkata", "state": "West Bengal"},
        {"name": "Pune", "state": "Maharashtra"},
        {"name": "Ahmedabad", "state": "Gujarat"},
        {"name": "Jaipur", "state": "Rajasthan"},
        {"name": "Lucknow", "state": "Uttar Pradesh"},
        {"name": "Ludhiana", "state": "Punjab"},
        {"name": "Indore", "state": "Madhya Pradesh"}
    ]
    
    if state:
        mandis = [m for m in mandis if m["state"].lower() == state.lower()]
    
    return {"mandis": mandis}

@router.get("/api/market/analysis")
async def get_market_analysis(
    commodity: str = Query(...),
    days: int = Query(30, ge=7, le=90)
):
    """Get detailed market analysis for a commodity"""
    try:
        # Generate extended price history for analysis
        base_price = 2000
        if commodity.lower() in ["wheat", "rice", "cotton"]:
            base_price = {"wheat": 2300, "rice": 3200, "cotton": 5500}[commodity.lower()]
        
        history = []
        current_price = base_price
        
        for i in range(days, 0, -1):
            date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
            variation = random.uniform(-0.02, 0.02)
            current_price = max(base_price * 0.7, current_price * (1 + variation))
            history.append({"date": date, "price": round(current_price, 2)})
        
        # Calculate statistics
        prices = [h["price"] for h in history]
        min_price = min(prices)
        max_price = max(prices)
        avg_price = sum(prices) / len(prices)
        
        # Calculate volatility (standard deviation)
        variance = sum((p - avg_price) ** 2 for p in prices) / len(prices)
        volatility = (variance ** 0.5) / avg_price * 100
        
        return {
            "commodity": commodity,
            "period_days": days,
            "history": history,
            "statistics": {
                "min_price": round(min_price, 2),
                "max_price": round(max_price, 2),
                "avg_price": round(avg_price, 2),
                "current_price": round(current_price, 2),
                "volatility_pct": round(volatility, 2)
            },
            "insights": [
                f"Price range: ₹{min_price:.0f} - ₹{max_price:.0f} per quintal",
                f"Average price over {days} days: ₹{avg_price:.0f}",
                f"Volatility: {volatility:.1f}% ({'High' if volatility > 10 else 'Moderate' if volatility > 5 else 'Low'})",
                "Consider market timing based on seasonal patterns" if volatility > 10 else "Stable market conditions observed"
            ]
        }
        
    except Exception as e:
        logger.error(f"Market analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Market analysis unavailable")