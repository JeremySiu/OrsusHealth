import os
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel, Field

from scripts.predict import predict_heart_disease

_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

GRADIUM_BASES = {
    "us": "https://us.api.gradium.ai/api",
    "eu": "https://eu.api.gradium.ai/api",
}

# Security: API Key requirement
API_KEY_HEADER = APIKeyHeader(name="x-api-key", auto_error=False)

async def validate_api_key(api_key: str = Security(API_KEY_HEADER)):
    """Only allow requests that include the correct x-api-key header."""
    expected_key = os.getenv("APP_API_KEY")
    if expected_key and api_key == expected_key:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Unauthorized: Invalid or missing API Key.",
    )

# Apply security to all routes by default
app = FastAPI(dependencies=[Security(validate_api_key)])

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


class ChatRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    messages: list[dict] = Field(
        ...,
        description='Conversation history as [{role: "user"|"assistant", content: "..."}]',
    )


@app.post("/chat")
async def chat(body: ChatRequest):
    """Dr. Bear chat endpoint — LangChain agent with Gemini + Streaming."""
    from app.chat_agent import run_chat

    # generator to yielded formatted chunks for better streaming handling
    async def stream_generator():
        async for chunk in run_chat(body.user_id, body.messages):
            yield f"{chunk}\n"

    return StreamingResponse(stream_generator(), media_type="text/event-stream")



@app.get("/chat")
async def chat_get():
    """Catch-all for accidental GET requests to the chat endpoint."""
    return {"message": "Chat endpoint is active. Please use POST to send messages."}


class TtsRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=8000)
    voice_id: str | None = None


@app.post("/tts")
async def text_to_speech(body: TtsRequest):
    """
    Proxy to Gradium TTS so the API key stays on the server.
    https://docs.gradium.ai/api-reference/endpoint/tts-post
    """
    api_key = os.getenv("GRADIUM_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GRADIUM_API_KEY is not configured on the server.",
        )

    region = (os.getenv("GRADIUM_API_REGION") or "us").lower().strip()
    base = GRADIUM_BASES.get(region, GRADIUM_BASES["us"])
    url = f"{base}/post/speech/tts"

    voice_id = (
        (body.voice_id or "").strip()
        or (os.getenv("GRADIUM_VOICE_ID") or "").strip()
        or "OceLYI_PPbqsdgdV"
    )

    payload = {
        "text": body.text,
        "voice_id": voice_id,
        "output_format": "wav",
        "only_audio": True,
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(
                url,
                headers={
                    "x-api-key": api_key,
                    "Content-Type": "application/json",
                },
                json=payload,
            )
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"TTS request failed: {e!s}") from e

    if r.status_code != 200:
        raise HTTPException(
            status_code=r.status_code,
            detail=r.text or "TTS provider returned an error",
        )

    # Always label as WAV so clients and API Gateway/Lambda treat the body as binary audio.
    return Response(content=r.content, media_type="audio/wav")
