"""
Food Logs API Routes

Endpoints:
  POST   /api/v1/food-logs              → Create manual food log
  GET    /api/v1/food-logs/{user_id}     → Get user's food logs
  GET    /api/v1/food-logs/detail/{id}   → Get single log with items
  GET    /api/v1/food-logs/summary/{user_id} → Daily summary
  DELETE /api/v1/food-logs/{id}          → Delete a food log
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.models.food_model import ManualFoodEntry, FoodLogResponse
from app.services import supabase_service

router = APIRouter()


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
    limit: int = Query(50, ge=1, le=200),
):
    """Get food logs for a user, optionally filtered by date."""
    try:
        logs = await supabase_service.get_food_logs(user_id, target_date, limit)
        return {"success": True, "data": logs, "count": len(logs)}
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
    Shows total calories, protein, carbs, fat broken down by meal type.
    """
    try:
        summary = await supabase_service.get_daily_summary(user_id, target_date)
        return {"success": True, "data": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/food-logs/{food_log_id}")
async def delete_food_log(food_log_id: str):
    """Delete a food log and its associated food items."""
    success = await supabase_service.delete_food_log(food_log_id)
    if not success:
        raise HTTPException(status_code=404, detail="Food log not found")
    return {"success": True, "message": "Food log deleted"}
