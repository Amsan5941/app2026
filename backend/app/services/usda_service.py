"""
USDA FoodData Central API client.

Provides nutrition lookup from the USDA database for more accurate
macro data when available. Free API key required.

API Docs: https://fdc.nal.usda.gov/api-guide.html
"""

from typing import Optional
import httpx

from app.config import settings
from app.models.food_model import NutritionResult

USDA_BASE_URL = "https://api.nal.usda.gov/fdc/v1"


async def search_food(query: str, page_size: int = 5) -> list[NutritionResult]:
    """
    Search the USDA FoodData Central database for a food item.

    Args:
        query: Food name to search (e.g., "chicken breast")
        page_size: Number of results to return

    Returns:
        List of NutritionResult with calorie/macro data
    """
    if not settings.usda_api_key:
        return []

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{USDA_BASE_URL}/foods/search",
            params={
                "api_key": settings.usda_api_key,
                "query": query,
                "pageSize": page_size,
                "dataType": "Survey (FNDDS),Foundation,SR Legacy",
            },
            timeout=10.0,
        )

        if response.status_code != 200:
            return []

        data = response.json()
        results = []

        for food in data.get("foods", []):
            nutrients = {n["nutrientName"]: n.get("value", 0) for n in food.get("foodNutrients", [])}

            results.append(
                NutritionResult(
                    food_name=food.get("description", query),
                    serving_size=food.get("servingSize", None)
                    and f"{food['servingSize']}{food.get('servingSizeUnit', 'g')}",
                    calories=nutrients.get("Energy", 0),
                    protein=nutrients.get("Protein", 0),
                    carbs=nutrients.get("Carbohydrate, by difference", 0),
                    fat=nutrients.get("Total lipid (fat)", 0),
                    source="usda",
                )
            )

        return results


async def get_food_details(fdc_id: int) -> Optional[NutritionResult]:
    """
    Get detailed nutrition info for a specific USDA food by FDC ID.
    """
    if not settings.usda_api_key:
        return None

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{USDA_BASE_URL}/food/{fdc_id}",
            params={"api_key": settings.usda_api_key},
            timeout=10.0,
        )

        if response.status_code != 200:
            return None

        food = response.json()
        nutrients = {}
        for n in food.get("foodNutrients", []):
            nutrient_info = n.get("nutrient", {})
            nutrients[nutrient_info.get("name", "")] = n.get("amount", 0)

        return NutritionResult(
            food_name=food.get("description", "Unknown"),
            calories=nutrients.get("Energy", 0),
            protein=nutrients.get("Protein", 0),
            carbs=nutrients.get("Carbohydrate, by difference", 0),
            fat=nutrients.get("Total lipid (fat)", 0),
            source="usda",
        )
