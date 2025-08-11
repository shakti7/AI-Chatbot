# Zocket Backend (FastAPI)

## Quickstart

1. Create environment file:

```bash
cp .env.example .env
# Edit .env to add ZOCKET_GEMINI_API_KEY
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Run server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Endpoints:
- `GET /health`
- `POST /api/chat/stream` (SSE) body: `{ session_id, message }`
- `GET /api/artifacts/latest?session_id=...`
- `POST /api/session/reset?session_id=...`
