# Copilot Instructions for Farm-Guru

This guide helps AI coding agents work productively in the Farm-Guru codebase. It summarizes architecture, workflows, and conventions unique to this project.

## Architecture Overview
- **Frontend**: Vite + React 18 + TypeScript, shadcn/ui, Tailwind CSS, React Query, React Router. Key UI in `src/pages/`, reusable components in `src/components/`, utilities in `src/lib/`, hooks in `src/hooks/`.
- **Backend**: FastAPI (Python), async/await, Hugging Face Inference API, Supabase (PostgreSQL + pgvector), Redis caching, local fallback for offline/dev. Main app in `backend/app/`, routes in `backend/app/routes/`, AI logic in `backend/app/llm.py`, retrieval in `backend/app/retriever.py`, DB helpers in `backend/app/db.py`.
- **Data Flow**: Frontend calls backend via REST API (`/api/query`, `/api/upload-image`, etc.), backend orchestrates AI, DB, and external APIs. Fallbacks ensure demo mode works without cloud keys.

## Developer Workflows
- **Backend**: Install with `pip install -r requirements.txt`. Run with `python run.py`. Test with `pytest app/tests/`.
- **Frontend**: Install with `npm install`. Run with `npm run dev`. Test with `npm test`.
- **Environment**: Copy `.env.example` to `.env` in both frontend and backend. See README for required variables.
- **Production**: Backend deploys with Uvicorn; frontend builds with `npm run build` and deploys `dist/`.

## Project-Specific Patterns
- **Fallbacks**: If cloud keys (Hugging Face, Supabase) are missing, backend uses local/demo data. Images save to `backend/app/static/` if Supabase is unavailable.
- **Multilingual**: UI supports English/Hindi, with language toggles and translation hooks (`useTranslation`).
- **Analytics**: Event tracking is privacy-focused, implemented in `src/lib/analytics.ts`.
- **AI Query**: Main endpoint is `POST /api/query`, with deterministic fallback if Hugging Face API fails.
- **Image Analysis**: Upload via `POST /api/upload-image`, analyzed by vision model or local logic.
- **Market/Weather**: Data from AGMARKNET/Data.gov.in, fallback to OpenWeatherMap/demo data.

## Conventions & Examples
- **Routes**: Add backend routes in `backend/app/routes/`, register in `main.py`. Frontend pages in `src/pages/`, navigation via React Router.
- **API Methods**: Frontend API calls in `src/lib/api.ts`. Use React Query for server state.
- **Testing**: Backend tests in `backend/app/tests/`, frontend tests in `src/__tests__/`.
- **Database**: Supabase schema includes `users`, `queries`, `images`, `docs`, `schemes`, `weather`, `market_prices`.

## Integration Points
- **Supabase**: Used for DB, storage, and auth. Local fallback for dev/offline.
- **Redis**: Used for caching weather/market data (1-hour TTL).
- **Hugging Face**: For AI inference; fallback logic in `llm.py`.

## Key Files/Directories
- `backend/app/routes/` - API endpoints
- `backend/app/llm.py` - AI integration
- `backend/app/retriever.py` - Document retrieval
- `backend/app/db.py` - DB helpers
- `src/pages/` - Main UI pages
- `src/lib/api.ts` - Frontend API logic
- `src/lib/analytics.ts` - Event tracking

---
For more details, see the README or ask for clarification on unclear sections.
