"""
Food Logs API Routes

Endpoints:
  POST   /api/v1/food-logs              → Create manual food log
  GET    /api/v1/food-logs/{user_id}     → Get user's food logs (paginated)
  GET    /api/v1/food-logs/detail/{id}   → Get single log with items
  GET    /api/v1/food-logs/summary/{user_id} → Daily summary
  PUT    /api/v1/food-logs/{food_log_id} → Update a food log
  DELETE /api/v1/food-logs/{id}          → Delete a food log
"""

from datetime import date
from typing import Optional

from app.models.food_model import (FoodLogResponse, FoodLogUpdate,
                                   ManualFoodEntry)
from fastapi import APIRouter, HTTPException, Query

from app.services import supabase_service

router = APIRouter()


async def _resolve_user_id(identifier: str) -> str:
    """
    Resolve a user identifier to an internal user_id.
    Accepts either an internal user_id (UUID) or an auth_id.
    Tries internal ID first, then auth_id lookup.
    """
    # Check if it's a direct user_id (exists in users table)
    client = supabase_service.get_client()
    result = client.table("users").select("id").eq("id", identifier).execute()
    if result.data:
        return result.data[0]["id"]

    # Try as auth_id
    resolved = await supabase_service.get_user_id_from_auth(identifier)
    if resolved:
        return resolved

    raise HTTPException(status_code=404, detail="User not found")


@router.post("/food-logs", response_model=dict)
async def create_manual_food_log(entry: ManualFoodEntry):
    """
    Create a food log from manual entry (no AI).
    User types in what they ate with estimated nutrition.
    """
    try:
        food_log = await supabase_service.create_food_log(
            user_id=entry.user_id,
            ai_result=None,
            image_url=None,
            meal_type=entry.meal_type.value,
            logged_date=entry.logged_date,
            notes=entry.notes,
            manual_items=entry.food_items,
        )
        return {"success": True, "food_log": food_log}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create food log: {str(e)}")


@router.get("/food-logs/{user_id}")
async def get_user_food_logs(
    user_id: str,
    target_date: Optional[date] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[str] = Query(None, description="Pagination cursor (created_at ISO timestamp)"),
):
    """Get food logs for a user with cursor-based pagination. Accepts internal user_id or auth_id."""
    try:
        resolved_id = await _resolve_user_id(user_id)
        result = await supabase_service.get_food_logs(resolved_id, target_date, limit, cursor)
        return {
            "success": True,
            "data": result["items"],
            "count": len(result["items"]),
            "next_cursor": result["next_cursor"],
            "has_more": result["has_more"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/food-logs/detail/{food_log_id}")
async def get_food_log_detail(food_log_id: str):
    """Get a single food log with all its food items."""
    log = await supabase_service.get_food_log_with_items(food_log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Food log not found")
    return {"success": True, "data": log}


@router.get("/food-logs/summary/{user_id}")
async def get_daily_nutrition_summary(
    user_id: str,
    target_date: date = Query(..., description="Date to summarize (YYYY-MM-DD)"),
):
    """
    Get daily nutrition totals for a user.
    Accepts internal user_id or auth_id.
    """
    try:
        resolved_id = await _resolve_user_id(user_id)
        summary = await supabase_service.get_daily_summary(resolved_id, target_date)
        return {"success": True, "data": summary}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/food-logs/{food_log_id}")
async def delete_food_log(food_log_id: str):
    """Delete a food log and its associated food items."""
    success = await supabase_service.delete_food_log(food_log_id)
    if not success:
        raise HTTPException(status_code=404, detail="Food log not found")
    return {"success": True, "message": "Food log deleted"}


@router.put("/food-logs/{food_log_id}")
async def update_food_log(food_log_id: str, update: FoodLogUpdate):
    """
    Update a food log's nutrition values.
    Validates user ownership, stores original AI values, and marks as edited.
    """
    try:
        result = await supabase_service.update_food_log(food_log_id, update)
        if not result:
            raise HTTPException(status_code=404, detail="Food log not found")
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update food log: {str(e)}")
