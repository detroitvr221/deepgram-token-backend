# Deepgram Token Backend

Secure backend for generating short-lived Deepgram tokens for iOS or web clients. Built with Node.js + Express and deployable to Railway.

## Quickstart

1. Install dependencies:

```bash
npm install
```

2. Create `.env` (see `.env.example`):

```
DEEPGRAM_API_KEY=dg_...
API_KEY=your_custom_api_key_for_clients
NODE_ENV=development
PORT=3000
```

3. Start the server:

```bash
npm run dev
```

4. Health check:

```bash
curl http://localhost:3000/health
```

5. Request a token (replace API key):

```bash
curl -X POST http://localhost:3000/api/deepgram/token \
  -H "x-api-key: your_custom_api_key_for_clients"
```

## Deploy to Railway

- Push this directory to GitHub and connect the repo in Railway, or use the Railway CLI.
- Ensure env vars are set in Railway: `DEEPGRAM_API_KEY`, `API_KEY`, `NODE_ENV=production`.
 - Ensure env vars are set in Railway: `DEEPGRAM_API_KEY`, `API_KEY`, `OPENAI_API_KEY`, `NODE_ENV=production`.

## Notes

- Token expires in 30 seconds and is scoped to `listen` and `speak`.
- In non-production, if `API_KEY` is missing, auth is skipped for local dev.

## OpenAI Chat Endpoint

POST `/api/openai/chat` with your API key header and messages array:

```bash
curl -X POST http://localhost:3050/api/openai/chat \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role":"system","content":"You are a helpful assistant."},
      {"role":"user","content":"Say hello"}
    ]
  }'
```

Requires `OPENAI_API_KEY` to be set.

