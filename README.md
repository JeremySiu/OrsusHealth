# OrsusHealth

OrsusHealth is a full-stack cardiovascular risk assessment platform that combines machine learning, explainable AI, and a conversational health assistant into a single, production-ready application. The system follows a **Machine Learning as a Serverless Service (MaSS)** architecture, deploying all ML inference, chat, text-to-speech, and PDF generation workloads as containerized or native AWS Lambda functions with no persistent server infrastructure.

## Table of Contents

- [Overview](#overview)
- [MaSS Architecture](#mass-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [CI/CD](#cicd)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)

## Overview

A user signs in through Google OAuth (managed by Supabase Auth), completes a cardiovascular health questionnaire, and receives an instant risk prediction powered by a Random Forest classifier. Each prediction is accompanied by SHAP-based feature explanations that identify the top contributing clinical factors, grounding the results in interpretable medical context. Users can review historical assessments, track trends over time, download PDF reports, and consult an AI-powered conversational agent ("Dr. Bear") that retrieves their personal health records and references a curated clinical knowledge base to answer questions in plain language.

## MaSS Architecture

The backend is built around the principle of **Machine Learning as a Serverless Service (MaSS)**: every compute workload, from model inference to conversational AI, runs on AWS Lambda with zero idle cost and automatic horizontal scaling.

```
Frontend (Vercel)
    |
    v
AWS Lambda Function URL (Streaming)
    |
    +-- /predict   ->  Random Forest + SHAP (scikit-learn)
    +-- /chat      ->  LangGraph ReAct Agent (Gemini + Supabase Tools)
    +-- /tts       ->  Gradium TTS Proxy
    |
AWS Lambda (Node.js)
    +-- /generate-pdf  ->  Server-side PDF rendering
    |
Supabase
    +-- Auth (Google OAuth)
    +-- PostgreSQL (health_records)
```

Key characteristics of the MaSS approach:

- **Containerized ML Inference**: The prediction Lambda packages a pre-trained Random Forest model, SHAP explainer, and all scientific Python dependencies (scikit-learn, numpy, pandas, shap) inside a Docker container image. The AWS Lambda Web Adapter translates Lambda invocation events into standard HTTP requests, allowing the same FastAPI application to run locally with uvicorn or in production on Lambda without code changes.
- **Streaming AI Chat**: The Dr. Bear agent uses Lambda response streaming (`RESPONSE_STREAM` invoke mode) to deliver token-by-token LLM output to the frontend in real time, eliminating the need for WebSocket infrastructure while preserving a responsive conversational experience.
- **Isolated PDF Generation**: A dedicated Node.js Lambda function handles PDF rendering with its own memory allocation (1600 MB), keeping the heavier document generation workload decoupled from the core prediction API.
- **Zero Idle Cost**: With no EC2 instances, ECS tasks, or always-on containers, the entire backend scales to zero when not in use and scales out automatically under load.

## Tech Stack

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 8 |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4, custom CSS |
| UI Components | shadcn/ui (Radix primitives) |
| 3D / Animation | Three.js, React Three Fiber, GSAP |
| Forms / Validation | React Hook Form + Zod |
| Auth | Supabase Auth (Google OAuth) |
| PDF Viewing | react-pdf |
| Hosting | Vercel |

### Backend

| Layer | Technology |
|---|---|
| Runtime | Python 3.12 on AWS Lambda (container image) |
| API Framework | FastAPI + AWS Lambda Web Adapter |
| ML Model | Random Forest (scikit-learn) |
| Explainability | SHAP (TreeExplainer) |
| Chat Agent | LangGraph ReAct agent with Google Gemini |
| Observability | LangSmith tracing |
| TTS | Gradium API (server-side proxy) |
| PDF Generation | Node.js 22 Lambda function |
| Database | Supabase PostgreSQL |
| IaC | AWS SAM (Serverless Application Model) |
| CI/CD | GitHub Actions |

## Project Structure

```
OrsusHealth/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI application (predict, chat, TTS endpoints)
│   │   ├── chat_agent.py          # Dr. Bear LangGraph agent with Supabase tools
│   │   └── clinical_facts.py      # Curated clinical knowledge base
│   ├── scripts/
│   │   └── predict.py             # ML prediction pipeline with SHAP explanations
│   ├── model/
│   │   └── model.joblib           # Pre-trained Random Forest model artifact
│   ├── model_training/
│   │   ├── Heart_Disease_Prediction_Model.ipynb
│   │   └── data.csv               # Training dataset
│   ├── functions/
│   │   └── generate-pdf/          # Standalone Node.js PDF generation Lambda
│   ├── Dockerfile                 # Container image for the prediction Lambda
│   ├── template.yaml              # AWS SAM infrastructure definition
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx    # Animated landing with 3D heart and Google sign-in
│   │   │   ├── Dashboard.jsx      # Main application shell with Dr. Bear integration
│   │   │   └── AuthCallback.jsx   # OAuth redirect handler
│   │   ├── components/
│   │   │   ├── AssessmentForm.jsx  # Multi-page cardiovascular questionnaire
│   │   │   ├── AssessmentReport.jsx
│   │   │   ├── DashboardStats.jsx  # Vitals overview cards
│   │   │   ├── MyReports.jsx       # Historical report browser
│   │   │   ├── MyTrends.jsx        # Longitudinal trend visualization
│   │   │   ├── PdfViewer.jsx       # In-app PDF renderer
│   │   │   └── HeartCanvas.jsx     # Interactive 3D heart (Three.js)
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Supabase session provider
│   │   └── hooks/
│   │       └── use-mobile.js       # Responsive breakpoint hook
│   ├── vercel.json                 # SPA rewrite rules
│   └── package.json
└── .github/
    └── workflows/
        └── deploy-backend.yml      # Manual backend deployment workflow
```

## Features

### Cardiovascular Risk Prediction
- Multi-page assessment form collecting 11 clinical parameters (age, sex, chest pain type, resting blood pressure, cholesterol, fasting blood sugar, resting ECG, max heart rate, exercise angina, ST depression, ST slope)
- Real-time inference via a Random Forest classifier trained on the UCI Heart Disease dataset
- SHAP-based explainability identifying the top 3 contributing features per prediction, with direction of influence

### Dr. Bear Conversational Agent
- LangGraph ReAct agent powered by Google Gemini (gemini-3-flash-preview)
- Tool-calling capabilities: retrieves user health records from Supabase, looks up clinical facts with medical citations
- Streamed responses delivered token-by-token over Lambda response streaming
- Text-to-speech output via Gradium TTS, synchronized with character animation
- Animated bear character with intro, idle, thinking, and talking states using crossfade transitions

### Assessment History and Trends
- All predictions persisted to Supabase PostgreSQL with timestamps
- Historical report browser with PDF download support
- Longitudinal trend visualization across assessments

### Authentication and Security
- Google OAuth via Supabase Auth with session management
- API key validation on all backend endpoints (`x-api-key` header)
- Service role key isolation (server-side only, never exposed to the client)

### Frontend Experience
- Animated landing page with interactive 3D heart model (Three.js / React Three Fiber)
- Glassmorphism dashboard with grain shader backgrounds
- Responsive layout with dedicated mobile experience and Dr. Bear toggle
- GSAP-powered micro-animations and page transitions

## Prerequisites

Install the following tools for local development and deployment:

1. **Python 3.12** (backend development)
2. **Node.js 22+** (frontend development, PDF Lambda)
3. **AWS CLI** ([install guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html))
4. **AWS SAM CLI** ([install guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html))
5. **Docker Desktop** ([download](https://www.docker.com/products/docker-desktop/)) for building the container image

Configure AWS credentials after installing the CLI:

```bash
aws configure
```

## Local Development

### Backend (FastAPI with uvicorn)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.

### Backend (SAM local simulation)

```bash
cd backend
sam build
sam local start-api
```

The API will be available at `http://127.0.0.1:3000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Copy `.env.example` to `.env` and populate the required values before starting the dev server.

## Deployment

### Backend (AWS Lambda via SAM)

First-time deployment:

```bash
cd backend
sam build
sam deploy --guided
```

Follow the prompts to set a stack name, region, and confirm changes. SAM will output the Lambda Function URLs for both the main API and the PDF generator.

Subsequent deployments:

```bash
cd backend
sam build
sam deploy
```

After deployment, SAM outputs two URLs:
- `ApiUrl`: the main prediction/chat/TTS endpoint (set as `VITE_API_BASE_URL` in the frontend)
- `GeneratePdfUrl`: the PDF generation endpoint (set as `VITE_GENERATE_PDF_URL` in the frontend)

### Frontend (Vercel)

The frontend is deployed to Vercel. The `vercel.json` configuration handles SPA routing by rewriting all paths to `index.html`. Set the required `VITE_*` environment variables in the Vercel project settings.

## CI/CD

The GitHub Actions workflow at `.github/workflows/deploy-backend.yml` provides manual backend deployment triggered from the Actions tab (`workflow_dispatch`).

### Setup

1. Navigate to **Settings > Secrets and variables > Actions** in the GitHub repository.
2. Add the following repository secrets:

| Secret | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM access key for deployment |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key for deployment |
| `GRADIUM_API_KEY` | Gradium TTS API key |
| `GOOGLE_API_KEY` | Google Gemini API key |
| `LANGCHAIN_API_KEY` | LangSmith tracing API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `APP_API_KEY` | Shared secret for frontend-to-backend auth |

The workflow builds the SAM application and deploys to `us-east-1` with all parameter overrides injected from secrets.

## API Reference

All endpoints require a valid `x-api-key` header.

| Method | Path | Description |
|---|---|---|
| GET | `/` | Health check |
| POST | `/predict` | Run heart disease prediction with SHAP explanations |
| POST | `/chat` | Streamed Dr. Bear conversation (SSE-style) |
| POST | `/tts` | Text-to-speech proxy (returns WAV audio) |

The PDF generation Lambda is exposed via a separate Function URL and accepts POST requests.

### Example Prediction Request

```bash
curl -X POST https://YOUR_API_URL/predict \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "Age": 40,
    "Sex": "M",
    "ChestPainType": "ATA",
    "RestingBP": 140,
    "Cholesterol": 289,
    "FastingBS": 0,
    "RestingECG": "Normal",
    "MaxHR": 172,
    "ExerciseAngina": "N",
    "Oldpeak": 0.0,
    "ST_Slope": "Up"
  }'
```

## Environment Variables

### Backend (`backend/.env`)

See `backend/.env-template` for a complete reference.

| Variable | Description |
|---|---|
| `GRADIUM_API_KEY` | Gradium TTS API key |
| `GRADIUM_VOICE_ID` | TTS voice identifier |
| `GRADIUM_API_REGION` | TTS API region (`us` or `eu`) |
| `GOOGLE_API_KEY` | Google Gemini API key for Dr. Bear |
| `LANGCHAIN_TRACING_V2` | Enable LangSmith tracing (`true`) |
| `LANGCHAIN_API_KEY` | LangSmith API key |
| `LANGCHAIN_PROJECT` | LangSmith project name |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `APP_API_KEY` | Shared secret for API key validation |

### Frontend (`frontend/.env`)

See `frontend/.env.example` for a complete reference.

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `VITE_API_BASE_URL` | Backend Lambda Function URL (no trailing slash) |
| `VITE_BACKEND_API_KEY` | Shared secret matching `APP_API_KEY` |
| `VITE_GENERATE_PDF_URL` | PDF generation Lambda Function URL |
