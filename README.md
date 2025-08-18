# Farm-Guru 🌾

AI-powered agricultural assistant helping Indian farmers make informed decisions with expert guidance and real-time data.

## Features

- **AI Assistant**: Get instant answers to farming questions using Hugging Face models with deterministic fallback
- **Image Analysis**: Upload crop images for disease/pest identification and treatment recommendations
- **Weather Forecasts**: Real-time weather data with irrigation recommendations
- **Market Prices**: Live commodity prices with trading signals from AGMARKNET
- **Government Schemes**: Policy matching based on farmer profile and location
- **Voice Input**: Web Speech API integration for hands-free queries
- **Multilingual**: Support for English and Hindi

## Architecture

### Frontend (React + TypeScript)
- **Framework**: Vite + React 18 + TypeScript
- **UI**: shadcn/ui + Tailwind CSS with custom agricultural theme
- **State**: React Query for server state, local state with hooks
- **Routing**: React Router with animated page transitions
- **Analytics**: Privacy-focused event tracking

### Backend (FastAPI + Python)
- **Framework**: FastAPI with async/await
- **AI**: Hugging Face Inference API with deterministic fallback
- **Database**: Supabase (PostgreSQL + pgvector) with local fallback
- **Storage**: Supabase Storage for images with local fallback
- **Caching**: Redis for weather/market data (1-hour TTL)
- **Retrieval**: Sentence transformers for document similarity

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+ and pip
- (Optional) Redis for caching
- (Optional) Supabase account for production features

### 1. Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env with your keys (optional for demo mode)
# HF_API_KEY=your_hugging_face_key
# SUPABASE_URL=your_supabase_url
# SUPABASE_SERVICE_KEY=your_service_key

# Start backend server
python run.py
```

Backend will run on `http://localhost:8000`

### 2. Frontend Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env
# VITE_API_URL=http://localhost:8000
# VITE_SUPABASE_URL=your_supabase_url (optional)
# VITE_SUPABASE_ANON_KEY=your_anon_key (optional)

# Start frontend
npm run dev
```

Frontend will run on `http://localhost:5173`

## Manual Testing Checklist

Run these tests locally to verify functionality:

### ✅ Basic Functionality
1. **Home Page**: Navigate to `/` - should show hero section with CTA buttons
2. **Ask Farm-Guru**: Click "Ask Farm-Guru" → should open `/query` page
3. **Text Query**: Enter "When should I irrigate wheat in Bengaluru?" → should return JSON answer with sources
4. **Voice Input**: Press mic button and speak same question → transcription appears and query executes
5. **Navigation**: All header links and bottom tabs should route correctly

### ✅ Image Upload & Analysis
6. **Image Upload**: Upload a crop image → should return label and confidence
7. **Image Query**: After upload, submit text query → should reference image in response
8. **Diagnostics**: Go to `/diagnostics` → upload image + describe symptoms → get treatment recommendations

### ✅ Data Endpoints
9. **Weather**: Go to `/weather` → select state/district → should return forecast and irrigation advice
10. **Market**: Go to `/market` → select commodity/mandi → should return prices, chart, and trading signal
11. **Schemes**: Go to `/schemes` → should show government schemes with eligibility

### ✅ Fallback Behavior
12. **Demo Mode**: Without HF_API_KEY, all queries should still return structured responses
13. **Offline Storage**: Without Supabase, images should save locally to `backend/app/static/`
14. **Error Handling**: Invalid inputs should show appropriate error messages

## Environment Variables

### Backend (.env)
```bash
# AI Configuration
HF_API_KEY=                    # Optional: Hugging Face API key
HF_MODEL=mistralai/Mixtral-8x7B-Instruct-v0.1
HF_VISION_MODEL=               # Optional: Vision model for image analysis

# Database
SUPABASE_URL=                  # Optional: Supabase project URL
SUPABASE_SERVICE_KEY=          # Optional: Supabase service role key
SUPABASE_ANON_KEY=            # Optional: Supabase anon key

# External APIs
AGMARKNET_API_KEY=            # Optional: For live market data
DATA_GOV_API_KEY=             # Optional: For government weather data
OPENWEATHER_API_KEY=          # Optional: Weather fallback

# Infrastructure
REDIS_URL=redis://localhost:6379  # Optional: For caching
DEBUG=false
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=            # Optional: Same as backend
VITE_SUPABASE_ANON_KEY=       # Optional: Same as backend
VITE_API_USE_REAL_MARKET=false
```

## API Endpoints

### Core Endpoints
- `POST /api/query` - Main AI assistant endpoint
- `POST /api/upload-image` - Image upload and analysis
- `GET /api/weather` - Weather forecasts by location
- `GET /api/market` - Commodity prices and signals
- `POST /api/policy-match` - Government scheme matching
- `POST /api/chem-reco` - Chemical/treatment recommendations

### Utility Endpoints
- `GET /api/health` - Health check and system status
- `POST /api/seed` - Seed database with sample data
- `POST /api/analytics` - Privacy-focused event logging

## Data Sources

### Government APIs (Primary)
- **AGMARKNET**: Live commodity prices from Indian mandis
- **Data.gov.in**: Weather data from Indian Meteorological Department
- **Supabase**: User data, queries, schemes, and documents

### Fallback Sources
- **OpenWeatherMap**: Weather data when government APIs unavailable
- **Demo Data**: Seeded prices and weather for offline development
- **Local Storage**: File storage when Supabase unavailable

## Development

### Running Tests
```bash
# Backend tests
cd backend
pytest app/tests/

# Frontend tests
npm test
```

### Code Structure
```
backend/
├── app/
│   ├── routes/          # API endpoints
│   ├── llm.py          # Hugging Face integration
│   ├── retriever.py    # Document retrieval
│   ├── db.py           # Supabase helpers
│   └── main.py         # FastAPI app
├── requirements.txt
└── run.py

src/
├── components/         # Reusable UI components
├── pages/             # Route components
├── lib/               # Utilities (API, analytics, i18n)
├── hooks/             # Custom React hooks
└── data/              # Static data files
```

### Adding New Features
1. **Backend**: Add route in `app/routes/`, update `main.py`
2. **Frontend**: Add API method in `lib/api.ts`, create/update components
3. **Database**: Add migration in Supabase, update `db.py` helpers
4. **Tests**: Add test cases for new functionality

## Production Deployment

### Backend (Railway/Render/DigitalOcean)
1. Set all environment variables
2. Configure Redis instance
3. Set up Supabase project with required tables
4. Deploy with `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Frontend (Vercel/Netlify)
1. Set `VITE_API_URL` to production backend URL
2. Configure Supabase environment variables
3. Build with `npm run build`
4. Deploy `dist/` folder

### Database Schema (Supabase)
Required tables:
- `users` - Farmer profiles
- `queries` - Query history
- `images` - Image metadata
- `docs` - Knowledge base documents
- `schemes` - Government schemes
- `weather` - Cached weather data
- `market_prices` - Price history

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@farm-guru.ai or create an issue in this repository.

---

Built with ❤️ for Indian farmers using modern web technologies and AI.
