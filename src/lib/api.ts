// API client for Farm-Guru backend integration
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

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  }

  async query(request: QueryRequest): Promise<QueryResponse> {
    const response = await fetch(`${this.baseUrl}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Query failed');
    }

    return response.json();
  }

  async getWeather(state: string, district: string): Promise<WeatherResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/weather?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Weather fetch failed');
    }

    return response.json();
  }

  async getMarketData(commodity: string, mandi: string): Promise<MarketResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/market?commodity=${encodeURIComponent(commodity)}&mandi=${encodeURIComponent(mandi)}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Market data fetch failed');
    }

    return response.json();
  }

  async uploadImage(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/api/upload-image`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Image upload failed');
    }

    return response.json();
  }

  async policyMatch(request: PolicyMatchRequest): Promise<PolicyMatchResponse> {
    const response = await fetch(`${this.baseUrl}/api/policy-match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Policy matching failed');
    }

    return response.json();
  }

  async chemReco(request: ChemRecoRequest): Promise<ChemRecoResponse> {
    const response = await fetch(`${this.baseUrl}/api/chem-reco`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Chemical recommendation failed');
    }

    return response.json();
  }

  async getHealth(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/health`);
    
    if (!response.ok) {
      throw new Error('Health check failed');
    }

    return response.json();
  }
}

export const apiClient = new ApiClient();