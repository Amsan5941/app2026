"""
Food Recognition API Routes

Endpoints:
  POST /api/v1/recognize/image   → Upload photo → AI nutrition analysis
  POST /api/v1/recognize/text    → Text description → AI nutrition estimate
  POST /api/v1/recognize/hybrid  → Photo → Custom model + OpenAI hybrid
"""

import uuid
from datetime import date

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional

from app.models.food_model import AIRecognitionResult, MealType, RecognitionSource
from app.services import openai_service, supabase_service
from app.services.custom_model_service import hybrid_analyze
from app.config import settings

router = APIRouter()


@router.post("/recognize/image", response_model=AIRecognitionResult)
async def recognize_food_image(
    image: UploadFile = File(..., description="Food photo (JPEG/PNG)"),
    user_id: Optional[str] = Form(None, description="User ID to save the log"),
    meal_type: Optional[MealType] = Form(None, description="Meal type"),
    save_log: bool = Form(False, description="Save as food log entry"),
):
    """
    Upload a food photo → GPT-4o Vision analyzes it → returns nutrition data.

    Optionally saves as a food log entry if user_id and meal_type are provided.
    """
    # Validate file type
    if image.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are supported")

    image_bytes = await image.read()

    if len(image_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="Image too large (max 10MB)")

    # Analyze with OpenAI Vision
    try:
        result = await openai_service.analyze_food_image(image_bytes, image.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

    # Optionally save food log (without image storage for cost savings)
    if save_log and user_id and meal_type:
        try:
            # Upload image to Supabase Storage (if enabled)
            image_url = None
            filename = f"{uuid.uuid4()}.{image.filename.split('.')[-1] if image.filename else 'jpg'}"
            image_url = await supabase_service.upload_food_image(user_id, image_bytes, filename)

            # Save food log
            await supabase_service.create_food_log(
                user_id=user_id,
                ai_result=result,
                image_url=image_url,  # Will be None if storage disabled
                meal_type=meal_type.value,
                logged_date=date.today(),
            )
        except Exception as e:
            # Don't fail the recognition if saving fails — return results anyway
            print(f"Warning: Failed to save food log: {e}")

    return result


@router.post("/recognize/text", response_model=AIRecognitionResult)
async def recognize_food_text(
    description: str = Form(..., description="Text description of the meal"),
    user_id: Optional[str] = Form(None),
    meal_type: Optional[MealType] = Form(None),
    save_log: bool = Form(False),
):
    """
    Describe your meal in text → AI estimates nutrition.
    Example: "2 scrambled eggs, 2 slices of toast with butter, glass of orange juice"
    """
    if not description.strip():
        raise HTTPException(status_code=400, detail="Description cannot be empty")

    try:
        result = await openai_service.analyze_food_text(description)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

    # Optionally save
    if save_log and user_id and meal_type:
        try:
            await supabase_service.create_food_log(
                user_id=user_id,
                ai_result=result,
                image_url=None,
                meal_type=meal_type.value,
                logged_date=date.today(),
                notes=f"Text entry: {description}",
            )
        except Exception as e:
            print(f"Warning: Failed to save food log: {e}")

    return result


@router.post("/recognize/hybrid")
async def recognize_food_hybrid(
    image: UploadFile = File(..., description="Food photo"),
    user_id: Optional[str] = Form(None),
    meal_type: Optional[MealType] = Form(None),
    save_log: bool = Form(False),
):
    """
    Hybrid recognition: Custom ML model first → OpenAI fallback.

    If custom model is confident (>= threshold), it contributes to the result.
    OpenAI Vision always provides the final nutrition breakdown.
    This endpoint collects data for training the custom model.
    """
    if image.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are supported")

    image_bytes = await image.read()

    try:
        hybrid_result = await hybrid_analyze(image_bytes, image.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hybrid analysis failed: {str(e)}")

    ai_result: AIRecognitionResult = hybrid_result["result"]

    # Save food log (without image storage for cost savings)
    if save_log and user_id and meal_type:
        try:
            image_url = None
            filename = f"{uuid.uuid4()}.{image.filename.split('.')[-1] if image.filename else 'jpg'}"
            image_url = await supabase_service.upload_food_image(user_id, image_bytes, filename)

            await supabase_service.create_food_log(
                user_id=user_id,
                ai_result=ai_result,
                image_url=image_url,  # Will be None if storage disabled
                meal_type=meal_type.value,
                logged_date=date.today(),
            )

            # Auto-contribute to training dataset (user can verify later)
            # Note: image_url will be None if storage is disabled - custom model training
            # will use Food-101 dataset until you enable storage
            if ai_result.ai_confidence >= 80 and image_url:
                for item in ai_result.food_items:
                    from app.models.food_model import DatasetSample
                    await supabase_service.save_dataset_sample(
                        DatasetSample(
                            image_url=image_url,
                            food_name=item.food_name,
                            calories=item.calories,
                            protein=item.protein,
                            carbs=item.carbs,
                            fat=item.fat,
                            verified=False,  # Needs user verification
                            source="ai_auto",
                        )
                    )
        except Exception as e:
            print(f"Warning: Failed to save food log: {e}")

    return {
        "recognition": ai_result,
        "custom_model_prediction": hybrid_result.get("custom_prediction"),
        "source": hybrid_result["source"],
        "custom_model_enabled": settings.use_custom_model,
    }
