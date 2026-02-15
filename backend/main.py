"""
AI Diet Tracker - FastAPI Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import food_recognition, nutrition, food_logs
from app.config import settings

app = FastAPI(
    title="AI Diet Tracker",
    description="Food recognition via OpenAI Vision + Custom ML Model with Supabase storage",
    version="1.0.0",
)

# CORS - allow your Expo app to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routes ---
app.include_router(food_recognition.router, prefix="/api/v1", tags=["Food Recognition"])
app.include_router(nutrition.router, prefix="/api/v1", tags=["Nutrition"])
app.include_router(food_logs.router, prefix="/api/v1", tags=["Food Logs"])


@app.get("/")
async def root():
    return {
        "service": "AI Diet Tracker",
        "version": "1.0.0",
        "status": "running",
        "custom_model_enabled": settings.use_custom_model,
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=settings.debug)
