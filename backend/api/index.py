# TO RUN UVICORN SERVER:
# uvicorn api.index:app --reload
# Make sure to run this command from the "backend" directory where "api" is located

from fastapi import FastAPI
from scripts.predict import predict_heart_disease

app = FastAPI()

@app.get("/") # Decorator that tells FastAPI to handle any GET request to the root URL ("/") with the following function
def read_root():
    return {"message": "API is running"}

@app.post("/predict")
async def predict(data: dict):
    result = predict_heart_disease (data)
    return result