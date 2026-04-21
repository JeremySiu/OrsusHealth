# PDF Preview Dev Tool

This is a standalone Vite app used only for generating and previewing PDFs from `backend/functions/generate-pdf/handler.mjs`.

It runs on its own localhost and is isolated in this folder so it can be removed without touching the production frontend.

## What It Does

- `fixture mode`: uses editable local `formData` and `result` JSON, then sends rendered HTML to the PDF generator.
- `live mode`: sends `formData` to the prediction API, uses the returned prediction JSON, then sends rendered HTML to the PDF generator.
- Displays the returned PDF inline using the same browser `<object>` pattern used by the main app.

## Start It

```bash
cd tools/pdf-preview
npm install
npm run dev
```

App URL: `http://127.0.0.1:4174`

## Environment Variables

Create `tools/pdf-preview/.env.local` from `.env.template`.

### Preview App

| Variable | Required | Purpose |
|---|---|---|
| `VITE_PDF_GENERATOR_URL` | Yes | URL for the PDF generator endpoint or local PDF dev server |
| `VITE_PDF_GENERATOR_API_KEY` | Yes | `x-api-key` sent to the PDF generator |
| `VITE_DEFAULT_MODE` | No | Initial mode: `fixture` or `live` |
| `VITE_PREDICT_API_BASE_URL` | Live mode only | Base URL for the prediction API |
| `VITE_PREDICT_API_KEY` | No | `x-api-key` for prediction API; falls back to `VITE_PDF_GENERATOR_API_KEY` |

### Local PDF Generator

Run from `backend/functions/generate-pdf/`.

| Variable | Required | Purpose |
|---|---|---|
| `APP_API_KEY` | Yes | Must match `VITE_PDF_GENERATOR_API_KEY` from the preview app |
| `PORT` | No | Local server port, defaults to `3001` |

Start it with:

```bash
cd backend/functions/generate-pdf
npm install
npm run dev
```

### Local Prediction API

Run from `backend/`.

| Variable | Required | Purpose |
|---|---|---|
| `APP_API_KEY` | Yes | Must match `VITE_PREDICT_API_KEY` or the fallback PDF key |
| `GRADIUM_API_KEY` | No for `/predict` | Only needed for TTS |
| `GRADIUM_VOICE_ID` | No for `/predict` | Only needed for TTS |
| `GRADIUM_API_REGION` | No for `/predict` | Only needed for TTS |
| `GOOGLE_API_KEY` | No for `/predict` | Only needed for chat features |
| `LANGCHAIN_TRACING_V2` | No for `/predict` | Only needed for tracing |
| `LANGCHAIN_API_KEY` | No for `/predict` | Only needed for tracing |
| `LANGCHAIN_PROJECT` | No for `/predict` | Only needed for tracing |
| `SUPABASE_URL` | No for `/predict` | Not needed for PDF preview |
| `SUPABASE_SERVICE_ROLE_KEY` | No for `/predict` | Not needed for PDF preview |

Start it with:

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Common Setups

### Fastest layout iteration

- Preview app: local
- PDF generator: local
- Prediction API: not used
- Use `fixture mode`

### Full local end-to-end

- Preview app: local
- PDF generator: local
- Prediction API: local
- Use `live mode`

### Test against deployed AWS services

- Preview app: local
- PDF generator: deployed Lambda URL
- Prediction API: deployed backend URL
- Use `live mode`
