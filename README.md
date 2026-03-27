# Card.io — Heart Disease Prediction API

A machine learning API that predicts heart disease probability using a Random Forest model with SHAP-based explainability. Deployed as a serverless function on **AWS Lambda + API Gateway**, with automatic deployment via **GitHub Actions**.

## Architecture

- **Runtime**: Python 3.12 on AWS Lambda (container image)
- **Framework**: FastAPI + Mangum (ASGI-to-Lambda adapter)
- **ML Model**: Random Forest (scikit-learn) with SHAP explanations
- **Infrastructure**: AWS SAM (Serverless Application Model)

## Prerequisites

Install the following tools:

1. **[AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)** — download the Windows MSI installer
2. **[AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)** — download the Windows MSI installer
3. **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** — required for building the container image

After installing AWS CLI, configure your credentials:
```bash
aws configure
```

## Local Development

### Run with uvicorn (no AWS tools needed)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```
API available at `http://localhost:8000`

### Run with SAM (simulates Lambda locally)
```bash
cd backend
sam build
sam local start-api
```
API available at `http://127.0.0.1:3000`

## Deploy to AWS

### First-time deployment
```bash
cd backend
sam build
sam deploy --guided
```
Follow the prompts to set a stack name, region, and confirm changes. SAM will output your API URL.

### Subsequent deployments (manual)
```bash
cd backend
sam build
sam deploy
```

## CI/CD (GitHub Actions)

The workflow at `.github/workflows/deploy-backend.yml` **automatically deploys** when you push changes to `backend/` on the `main` branch. Other file changes (frontend, docs, etc.) will **not** trigger a deploy.

### One-time setup
1. In your GitHub repo, go to **Settings → Secrets and variables → Actions**
2. Add these two secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

After that, every push to `main` that touches `backend/` will auto-deploy.

## API Endpoints

| Method | Path       | Description                          |
|--------|------------|--------------------------------------|
| GET    | `/`        | Health check                         |
| POST   | `/predict` | Predict heart disease probability    |

### Example Request
```bash
curl -X POST https://YOUR_API_URL/predict \
  -H "Content-Type: application/json" \
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
