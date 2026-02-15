"""
Nutrition API Routes

Endpoints:
  GET  /api/v1/nutrition/search    → USDA food search
  GET  /api/v1/nutrition/details   → USDA food details by FDC ID
"""

from fastapi import APIRouter, Query, HTTPException

from app.models.food_model import NutritionResult
from app.services import usda_service

router = APIRouter()


@router.get("/nutrition/search", response_model=list[NutritionResult])
async def search_nutrition(
    query: str = Query(..., min_length=2, description="Food name to search"),
    limit: int = Query(5, ge=1, le=25),
):
    """
    Search the USDA FoodData Central database for nutrition info.
    Returns calorie/macro data for matching foods.
    """
    results = await usda_service.search_food(query, page_size=limit)

    if not results:
        raise HTTPException(
            status_code=404,
            detail="No nutrition data found. Try a different search term, or check that USDA_API_KEY is set.",
        )

    return results


@router.get("/nutrition/details", response_model=NutritionResult)
async def get_nutrition_details(
    fdc_id: int = Query(..., description="USDA FoodData Central ID"),
):
    """Get detailed nutrition info for a specific food by USDA FDC ID."""
    result = await usda_service.get_food_details(fdc_id)
    if not result:
        raise HTTPException(status_code=404, detail="Food not found")
    return result
