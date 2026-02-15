"""
OpenAI Vision Service (Option A - Primary)

Sends food photos to GPT-4o Vision and returns structured nutrition data.
This is the primary recognition engine — fast, accurate, handles complex meals.

Cost: ~$0.01-0.02 per image
"""

import base64
import json
import re
from openai import AsyncOpenAI

from app.config import settings
from app.models.food_model import AIRecognitionResult, AIFoodItem, RecognitionSource

client = AsyncOpenAI(api_key=settings.openai_api_key)

SYSTEM_PROMPT = """You are a professional nutritionist AI. When given a photo of food:

1. Identify EVERY food item visible in the image
2. Estimate the serving size for each item
3. Provide calorie and macronutrient estimates (protein, carbs, fat) in grams
4. Rate your overall confidence from 0-100

Be practical and realistic with portions. If a food item is partially hidden or unclear,
make your best estimate and lower the confidence score.

IMPORTANT: Respond ONLY with valid JSON in this exact format, no other text:
{
  "food_items": [
    {
      "food_name": "food name here",
      "serving_size": "estimated serving size",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0,
      "confidence": 85
    }
  ],
  "overall_confidence": 85
}
"""


async def analyze_food_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> AIRecognitionResult:
    """
    Send a food image to GPT-4o Vision and get structured nutrition data.

    Args:
        image_bytes: Raw image bytes
        mime_type: Image MIME type (image/jpeg, image/png, etc.)

    Returns:
        AIRecognitionResult with detected food items and totals
    """
    # Encode image to base64
    base64_image = base64.b64encode(image_bytes).decode("utf-8")

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Analyze this food photo. Identify all food items and estimate their nutritional content.",
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{base64_image}",
                            "detail": "high",
                        },
                    },
                ],
            },
        ],
        max_tokens=1500,
        temperature=0.2,  # Low temperature for consistent outputs
    )

    raw_text = response.choices[0].message.content
    parsed = _parse_response(raw_text)

    # Calculate totals
    total_calories = sum(item.calories for item in parsed["food_items"])
    total_protein = sum(item.protein for item in parsed["food_items"])
    total_carbs = sum(item.carbs for item in parsed["food_items"])
    total_fat = sum(item.fat for item in parsed["food_items"])

    return AIRecognitionResult(
        food_items=parsed["food_items"],
        total_calories=total_calories,
        total_protein=total_protein,
        total_carbs=total_carbs,
        total_fat=total_fat,
        ai_confidence=parsed["overall_confidence"],
        source=RecognitionSource.openai,
        raw_response=raw_text,
    )


async def analyze_food_text(description: str) -> AIRecognitionResult:
    """
    Use OpenAI to estimate nutrition from a text description of food.
    Useful as a fallback or for manual text-based entries.

    Args:
        description: Text description like "2 eggs, toast with butter, orange juice"

    Returns:
        AIRecognitionResult with estimated nutrition
    """
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Estimate the nutritional content of this meal: {description}",
            },
        ],
        max_tokens=1500,
        temperature=0.2,
    )

    raw_text = response.choices[0].message.content
    parsed = _parse_response(raw_text)

    total_calories = sum(item.calories for item in parsed["food_items"])
    total_protein = sum(item.protein for item in parsed["food_items"])
    total_carbs = sum(item.carbs for item in parsed["food_items"])
    total_fat = sum(item.fat for item in parsed["food_items"])

    return AIRecognitionResult(
        food_items=parsed["food_items"],
        total_calories=total_calories,
        total_protein=total_protein,
        total_carbs=total_carbs,
        total_fat=total_fat,
        ai_confidence=parsed["overall_confidence"],
        source=RecognitionSource.openai,
        raw_response=raw_text,
    )


def _parse_response(raw_text: str) -> dict:
    """Parse the JSON response from OpenAI, handling markdown code blocks."""
    # Strip markdown code fences if present
    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        # Fallback: try to extract JSON object from text
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            data = json.loads(match.group())
        else:
            # Return empty result if parsing fails
            return {
                "food_items": [],
                "overall_confidence": 0,
            }

    food_items = []
    for item in data.get("food_items", []):
        food_items.append(
            AIFoodItem(
                food_name=item.get("food_name", "Unknown"),
                serving_size=item.get("serving_size"),
                calories=float(item.get("calories", 0)),
                protein=float(item.get("protein", 0)),
                carbs=float(item.get("carbs", 0)),
                fat=float(item.get("fat", 0)),
                confidence=float(item.get("confidence", 50)),
            )
        )

    return {
        "food_items": food_items,
        "overall_confidence": float(data.get("overall_confidence", 50)),
    }
