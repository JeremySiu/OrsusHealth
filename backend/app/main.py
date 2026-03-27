from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from scripts.predict import predict_heart_disease

app = FastAPI()

# Allow all origins for cross-origin requests
# REPLACE THIS WITH THE ACTUAL FRONTEND URL ONCE THE FRONTEND IS SET UP
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "API is running"}

@app.post("/predict")
async def predict(data: dict):
    result = predict_heart_disease(data)
    return result
