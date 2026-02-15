"""
Supabase Service Layer

Handles all database operations for food logs, food items, dataset samples,
and image storage via Supabase.
"""

from datetime import date
from typing import Optional

from supabase import create_client, Client

from app.config import settings
from app.models.food_model import (
    FoodLogCreate,
    FoodLogResponse,
    FoodItemResponse,
    AIRecognitionResult,
    DatasetSample,
)

_client: Optional[Client] = None


def get_client() -> Client:
    """Get or create Supabase client (service role — full access)."""
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_key)
    return _client


# ── Image Storage ─────────────────────────────────────────

async def upload_food_image(user_id: str, image_bytes: bytes, filename: str) -> Optional[str]:
    """
    Upload a food image to Supabase Storage (if enabled).

    Returns:
        Public URL of the uploaded image, or None if storage is disabled
    """
    if not settings.supabase_storage_bucket:
        # Storage disabled - return None
        return None

    client = get_client()
    path = f"{user_id}/{filename}"

    # Determine content type
    content_type = "image/jpeg"
    if filename.endswith(".png"):
        content_type = "image/png"
    elif filename.endswith(".webp"):
        content_type = "image/webp"

    client.storage.from_(settings.supabase_storage_bucket).upload(
        path,
        image_bytes,
        file_options={"content-type": content_type},
    )

    # Get public URL
    result = client.storage.from_(settings.supabase_storage_bucket).get_public_url(path)
    return result


# ── Food Logs ─────────────────────────────────────────────

async def create_food_log(
    user_id: str,
    ai_result: Optional[AIRecognitionResult],
    image_url: Optional[str],
    meal_type: str,
    logged_date: date,
    notes: Optional[str] = None,
    manual_items: Optional[list] = None,
) -> dict:
    """
    Create a food_log row + associated food_items.

    Args:
        user_id: The users.id (not auth_id)
        ai_result: AI recognition result (if from image/text analysis)
        image_url: URL of uploaded image in Supabase Storage
        meal_type: breakfast/lunch/dinner/snack
        logged_date: Date the meal was logged
        notes: Optional notes
        manual_items: Manual food items (used if ai_result is None)

    Returns:
        The created food log with food items
    """
    client = get_client()

    # Build totals
    if ai_result:
        total_calories = ai_result.total_calories
        total_protein = ai_result.total_protein
        total_carbs = ai_result.total_carbs
        total_fat = ai_result.total_fat
        ai_confidence = ai_result.ai_confidence
    else:
        total_calories = sum(i.calories for i in (manual_items or []))
        total_protein = sum(i.protein for i in (manual_items or []))
        total_carbs = sum(i.carbs for i in (manual_items or []))
        total_fat = sum(i.fat for i in (manual_items or []))
        ai_confidence = None

    # Insert food_log
    log_data = {
        "user_id": user_id,
        "image_url": image_url,
        "total_calories": total_calories,
        "total_protein": total_protein,
        "total_carbs": total_carbs,
        "total_fat": total_fat,
        "ai_confidence": ai_confidence,
        "logged_date": logged_date.isoformat(),
        "meal_type": meal_type,
        "notes": notes,
    }

    result = client.table("food_logs").insert(log_data).execute()
    food_log = result.data[0]
    food_log_id = food_log["id"]

    # Insert food_items
    items_to_insert = []
    if ai_result:
        for item in ai_result.food_items:
            items_to_insert.append({
                "food_log_id": food_log_id,
                "food_name": item.food_name,
                "serving_size": item.serving_size,
                "calories": item.calories,
                "protein": item.protein,
                "carbs": item.carbs,
                "fat": item.fat,
            })
    elif manual_items:
        for item in manual_items:
            items_to_insert.append({
                "food_log_id": food_log_id,
                "food_name": item.food_name,
                "serving_size": item.serving_size,
                "calories": item.calories,
                "protein": item.protein,
                "carbs": item.carbs,
                "fat": item.fat,
            })

    if items_to_insert:
        client.table("food_items").insert(items_to_insert).execute()

    return food_log


async def get_food_logs(user_id: str, target_date: Optional[date] = None, limit: int = 50) -> list[dict]:
    """
    Get food logs for a user, optionally filtered by date.
    """
    client = get_client()
    query = client.table("food_logs").select("*").eq("user_id", user_id)

    if target_date:
        query = query.eq("logged_date", target_date.isoformat())

    query = query.order("created_at", desc=True).limit(limit)
    result = query.execute()
    return result.data


async def get_food_log_with_items(food_log_id: str) -> Optional[dict]:
    """Get a food log with its associated food items."""
    client = get_client()

    log_result = client.table("food_logs").select("*").eq("id", food_log_id).execute()
    if not log_result.data:
        return None

    food_log = log_result.data[0]

    items_result = client.table("food_items").select("*").eq("food_log_id", food_log_id).execute()
    food_log["food_items"] = items_result.data

    return food_log


async def get_daily_summary(user_id: str, target_date: date) -> dict:
    """Get daily nutrition summary for a user."""
    client = get_client()
    result = (
        client.table("food_logs")
        .select("total_calories, total_protein, total_carbs, total_fat, meal_type")
        .eq("user_id", user_id)
        .eq("logged_date", target_date.isoformat())
        .execute()
    )

    logs = result.data
    summary = {
        "date": target_date.isoformat(),
        "total_calories": sum(float(l.get("total_calories") or 0) for l in logs),
        "total_protein": sum(float(l.get("total_protein") or 0) for l in logs),
        "total_carbs": sum(float(l.get("total_carbs") or 0) for l in logs),
        "total_fat": sum(float(l.get("total_fat") or 0) for l in logs),
        "meal_count": len(logs),
        "meals_by_type": {},
    }

    for l in logs:
        mt = l.get("meal_type", "unknown")
        if mt not in summary["meals_by_type"]:
            summary["meals_by_type"][mt] = {
                "count": 0,
                "calories": 0,
                "protein": 0,
                "carbs": 0,
                "fat": 0,
            }
        summary["meals_by_type"][mt]["count"] += 1
        summary["meals_by_type"][mt]["calories"] += float(l.get("total_calories") or 0)
        summary["meals_by_type"][mt]["protein"] += float(l.get("total_protein") or 0)
        summary["meals_by_type"][mt]["carbs"] += float(l.get("total_carbs") or 0)
        summary["meals_by_type"][mt]["fat"] += float(l.get("total_fat") or 0)

    return summary


async def delete_food_log(food_log_id: str) -> bool:
    """Delete a food log and its items (cascade)."""
    client = get_client()
    result = client.table("food_logs").delete().eq("id", food_log_id).execute()
    return len(result.data) > 0


# ── Dataset Collection ────────────────────────────────────

async def save_dataset_sample(sample: DatasetSample) -> dict:
    """
    Save a verified food image + labels to our custom dataset table.
    This builds our training data over time.
    """
    client = get_client()
    data = {
        "image_url": sample.image_url,
        "food_name": sample.food_name,
        "calories": sample.calories,
        "protein": sample.protein,
        "carbs": sample.carbs,
        "fat": sample.fat,
        "verified": sample.verified,
        "source": sample.source,
    }
    result = client.table("training_dataset").insert(data).execute()
    return result.data[0] if result.data else {}


async def get_dataset_samples(verified_only: bool = True, limit: int = 1000) -> list[dict]:
    """Get training dataset samples from Supabase."""
    client = get_client()
    query = client.table("training_dataset").select("*")
    if verified_only:
        query = query.eq("verified", True)
    query = query.limit(limit)
    result = query.execute()
    return result.data


# ── User Lookup ───────────────────────────────────────────

async def get_user_id_from_auth(auth_id: str) -> Optional[str]:
    """Get the internal user_id from the auth user's id."""
    client = get_client()
    result = client.table("users").select("id").eq("auth_id", auth_id).execute()
    if result.data:
        return result.data[0]["id"]
    return None
