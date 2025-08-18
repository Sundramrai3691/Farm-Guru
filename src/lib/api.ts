// Robust API client for Farm-Guru backend integration with comprehensive fallbacks
export interface QueryRequest {
  user_id?: string;
  text: string;
  lang: 'en' | 'hi';
  image_id?: string;
}

export interface QueryResponse {
  answer: string;
  confidence: number;
  actions: string[];
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  meta: {
    mode: string;
    [key: string]: any;
  };
}

export interface WeatherResponse {
  forecast: {
    temperature: number;
    humidity: number;
    rainfall: number;
    description: string;
  };
  recommendation: string;
  last_updated: string;
  meta: {
    source: string;
    [key: string]: any;
  };
}

export interface MarketResponse {
  commodity: string;
  mandi: string;
  latest_price: number;
  seven_day_ma: number;
  signal: "BUY" | "HOLD" | "SELL";
  history: Array<{
    date: string;
    price: number;
  }>;
  meta: {
    source: string;
    [key: string]: any;
  };
}

export interface UploadResponse {
  image_id: string;
  url: string;
  label: string;
  confidence: number;
  meta: {
    filename: string;
    size: number;
    storage: string;
  };
}

export interface PolicyMatchRequest {
  user_id?: string;
  state: string;
  crop?: string;
  land_size?: number;
  farmer_type?: string;
}

export interface PolicyMatchResponse {
  matched_schemes: Array<{
    name: string;
    code: string;
    description: string;
    eligibility: string[];
    required_docs: string[];
    benefits: string;
    application_url?: string;
  }>;
  total_matches: number;
  recommendations: string[];
  meta: any;
}

export interface ChemRecoRequest {
  crop: string;
  symptom: string;
  image_id?: string;
  severity?: string;
  affected_area?: string;
}

export interface ChemRecoResponse {
  diagnosis: string;
  confidence: number;
  recommendations: Array<{
    type: string;
    method: string;
    description: string;
    timing: string;
    precautions: string[];
  }>;
  next_steps: string[];
  warnings: string[];
  meta: any;
}

// Enhanced error class with status information
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public statusText?: string,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  }

  private sanitizePayload(payload: any): any {
    if (payload === null || payload === undefined) {
      return {};
    }
    
    if (typeof payload !== 'object') {
      return payload;
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined) {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    fallbackData: T
  ): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        console.warn(`API request failed: ${response.status} ${response.statusText} for ${endpoint}`);
        return fallbackData;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.warn(`Network error for ${endpoint}:`, error);
      return fallbackData;
    }
  }

  async query(request: QueryRequest): Promise<QueryResponse> {
    const sanitizedRequest = this.sanitizePayload(request);
    
    const fallbackResponse: QueryResponse = {
      answer: "I'm here to help with your farming questions! While I'm currently experiencing connectivity issues, here are some general farming tips that might be useful for your situation.",
      confidence: 0.6,
      actions: [
        "Check soil moisture levels regularly",
        "Monitor weather forecasts for planning",
        "Consult local agricultural extension services",
        "Keep detailed farming records"
      ],
      sources: [
        {
          title: "General Agricultural Guidelines",
          url: "https://icar.org.in",
          snippet: "Best practices for sustainable farming and crop management"
        }
      ],
      meta: {
        mode: "fallback",
        fallback_reason: "API unavailable"
      }
    };

    return this.makeRequest('/api/query', {
      method: 'POST',
      body: JSON.stringify(sanitizedRequest),
    }, fallbackResponse);
  }

  async getWeather(state: string, district: string): Promise<WeatherResponse> {
    const fallbackResponse: WeatherResponse = {
      forecast: {
        temperature: 28,
        humidity: 65,
        rainfall: 0,
        description: "Partly cloudy with moderate humidity"
      },
      recommendation: "Monitor soil moisture and irrigate if needed. Check weather updates regularly for any changes in conditions.",
      last_updated: new Date().toISOString(),
      meta: {
        source: "Fallback data",
        fallback_reason: "Weather service unavailable"
      }
    };

    return this.makeRequest(
      `/api/weather?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`,
      {},
      fallbackResponse
    );
  }

  async getMarketData(commodity: string, mandi: string): Promise<MarketResponse> {
    const basePrice = this.getBasePriceForCommodity(commodity);
    
    const fallbackResponse: MarketResponse = {
      commodity,
      mandi,
      latest_price: basePrice,
      seven_day_ma: basePrice * 0.98,
      signal: "HOLD",
      history: this.generateFallbackPriceHistory(basePrice),
      meta: {
        source: "Fallback data",
        fallback_reason: "Market service unavailable"
      }
    };

    return this.makeRequest(
      `/api/market?commodity=${encodeURIComponent(commodity)}&mandi=${encodeURIComponent(mandi)}`,
      {},
      fallbackResponse
    );
  }

  async uploadImage(file: File): Promise<UploadResponse> {
    const fallbackResponse: UploadResponse = {
      image_id: `fallback-${Date.now()}`,
      url: URL.createObjectURL(file),
      label: "Crop image (analysis unavailable)",
      confidence: 0.5,
      meta: {
        filename: file.name,
        size: file.size,
        storage: "local_fallback"
      }
    };

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/api/upload-image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        console.warn(`Image upload failed: ${response.status} ${response.statusText}`);
        return fallbackResponse;
      }

      return await response.json();
    } catch (error) {
      console.warn('Image upload network error:', error);
      return fallbackResponse;
    }
  }

  async policyMatch(request: PolicyMatchRequest): Promise<PolicyMatchResponse> {
    const sanitizedRequest = this.sanitizePayload(request);
    
    const fallbackResponse: PolicyMatchResponse = {
      matched_schemes: [
        {
          name: "PM-KISAN",
          code: "PM-KISAN",
          description: "Income support scheme providing ₹6000 annually to farmer families",
          eligibility: ["Small & marginal farmers", "Land holding up to 2 hectares"],
          required_docs: ["Aadhaar Card", "Land ownership papers", "Bank details"],
          benefits: "₹6000 per year in three installments",
          application_url: "https://pmkisan.gov.in/"
        },
        {
          name: "PMFBY",
          code: "PMFBY", 
          description: "Crop insurance scheme protecting farmers against crop loss",
          eligibility: ["All farmers", "Notified crops in notified areas"],
          required_docs: ["Application form", "Aadhaar/Voter ID", "Bank details", "Land records"],
          benefits: "Comprehensive risk cover against natural calamities",
          application_url: "https://pmfby.gov.in/"
        }
      ],
      total_matches: 2,
      recommendations: [
        "Apply for PM-KISAN for direct income support",
        "Consider crop insurance through PMFBY",
        "Visit local CSC for application assistance"
      ],
      meta: {
        fallback_reason: "Policy service unavailable",
        state: request.state
      }
    };

    return this.makeRequest('/api/policy-match', {
      method: 'POST',
      body: JSON.stringify(sanitizedRequest),
    }, fallbackResponse);
  }

  async chemReco(request: ChemRecoRequest): Promise<ChemRecoResponse> {
    const sanitizedRequest = this.sanitizePayload(request);
    
    const fallbackResponse: ChemRecoResponse = {
      diagnosis: `Based on the symptoms described for ${request.crop}, this appears to be a common agricultural issue that requires attention.`,
      confidence: 0.6,
      recommendations: [
        {
          type: "cultural",
          method: "Sanitation and Monitoring",
          description: "Remove affected plant parts and monitor daily for changes. Improve air circulation around plants.",
          timing: "Immediate and ongoing",
          precautions: ["Disinfect tools between plants", "Dispose of affected material properly"]
        },
        {
          type: "biological",
          method: "Organic Treatment",
          description: "Apply neem oil or other organic treatments as preventive measure.",
          timing: "Early morning or evening",
          precautions: ["Test on small area first", "Avoid during flowering"]
        }
      ],
      next_steps: [
        "Monitor affected plants daily",
        "Contact local KVK for expert diagnosis",
        "Document symptoms with photos",
        "Implement preventive measures"
      ],
      warnings: [
        "⚠️ This is general guidance only - consult local experts for accurate diagnosis",
        "⚠️ Always follow safety guidelines when applying any treatments"
      ],
      meta: {
        fallback_reason: "Diagnosis service unavailable",
        crop: request.crop
      }
    };

    return this.makeRequest('/api/chem-reco', {
      method: 'POST',
      body: JSON.stringify(sanitizedRequest),
    }, fallbackResponse);
  }

  async getHealth(): Promise<any> {
    const fallbackResponse = {
      status: "fallback",
      demo_mode: true,
      database: "local_mode",
      message: "API health check unavailable - using fallback mode"
    };

    return this.makeRequest('/api/health', {}, fallbackResponse);
  }

  private getBasePriceForCommodity(commodity: string): number {
    const basePrices: Record<string, number> = {
      'tomato': 1800,
      'wheat': 2300,
      'rice': 3200,
      'onion': 1500,
      'potato': 1200,
      'cotton': 5500,
      'maize': 1800,
      'soybean': 4200
    };
    
    return basePrices[commodity.toLowerCase()] || 2000;
  }

  private generateFallbackPriceHistory(basePrice: number): Array<{date: string, price: number}> {
    const history = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
      const price = Math.round(basePrice * (1 + variation));
      
      history.push({
        date: date.toISOString().split('T')[0],
        price
      });
    }
    
    return history;
  }
}

export const apiClient = new ApiClient();