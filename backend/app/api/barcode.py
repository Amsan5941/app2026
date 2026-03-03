"""
Barcode API Routes

Endpoints:
  GET /api/v1/barcode/{barcode}  → Look up product from Open Food Facts
  POST /api/v1/barcode/log       → Look up barcode and save as food log
"""

import logging
from datetime import date
from typing import Optional

import httpx
from app.models.food_model import MealType
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services import supabase_service

logger = logging.getLogger(__name__)

router = APIRouter()

OPEN_FOOD_FACTS_URL = "https://world.openfoodfacts.org/api/v2/product"


class BarcodeProduct(BaseModel):
    """Product data extracted from Open Food Facts."""
    barcode: str
    product_name: str
    calories: float = 0
    protein: float = 0
    carbs: float = 0
    fat: float = 0
    serving_size: Optional[str] = None
    image_url: Optional[str] = None
    brand: Optional[str] = None
    found: bool = True


class BarcodeLogRequest(BaseModel):
    """Request to save a barcode scan as a food log."""
    user_id: str
    barcode: str
    product_name: str
    calories: float = Field(ge=0)
    protein: float = Field(0, ge=0)
    carbs: float = Field(0, ge=0)
    fat: float = Field(0, ge=0)
    serving_size: Optional[str] = None
    meal_type: MealType
    logged_date: Optional[date] = None


async def _fetch_product(barcode: str) -> BarcodeProduct:
    """Fetch product data from Open Food Facts API."""
    url = f"{OPEN_FOOD_FACTS_URL}/{barcode}.json"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            data = response.json()

        if data.get("status") != 1 or not data.get("product"):
            return BarcodeProduct(
                barcode=barcode,
                product_name="Product not found",
                found=False,
            )

        product = data["product"]
        nutriments = product.get("nutriments", {})

        # Extract per-serving or per-100g values
        calories = (
            nutriments.get("energy-kcal_serving")
            or nutriments.get("energy-kcal_100g")
            or 0
        )
        protein = (
            nutriments.get("proteins_serving")
            or nutriments.get("proteins_100g")
            or 0
        )
        carbs = (
            nutriments.get("carbohydrates_serving")
            or nutriments.get("carbohydrates_100g")
            or 0
        )
        fat = (
            nutriments.get("fat_serving")
            or nutriments.get("fat_100g")
            or 0
        )

        return BarcodeProduct(
            barcode=barcode,
            product_name=product.get("product_name", "Unknown product"),
            calories=float(calories),
            protein=float(protein),
            carbs=float(carbs),
            fat=float(fat),
            serving_size=product.get("serving_size"),
            image_url=product.get("image_front_small_url"),
            brand=product.get("brands"),
            found=True,
        )
    except Exception as e:
        logger.error("Open Food Facts lookup failed", exc_info=e)
        raise HTTPException(status_code=502, detail=f"Failed to look up barcode: {str(e)}")


@router.get("/barcode/{barcode}", response_model=BarcodeProduct)
async def lookup_barcode(barcode: str):
    """Look up a product by barcode using Open Food Facts."""
    if not barcode.strip():
        raise HTTPException(status_code=400, detail="Barcode cannot be empty")

    product = await _fetch_product(barcode.strip())
    if not product.found:
        raise HTTPException(status_code=404, detail="Product not found in Open Food Facts database")

    return product


@router.post("/barcode/log")
async def log_barcode_food(entry: BarcodeLogRequest):
    """
    Save a barcode-scanned product as a food log.
    The frontend should call GET /barcode/{barcode} first to get product data,
    show a confirmation modal, then POST here to save.
    """
    try:
        # Resolve user_id (accepts auth_id too)
        resolved_id = entry.user_id
        client = supabase_service.get_client()
        user_check = client.table("users").select("id").eq("id", entry.user_id).execute()
        if not user_check.data:
            resolved_id_result = await supabase_service.get_user_id_from_auth(entry.user_id)
            if not resolved_id_result:
                raise HTTPException(status_code=404, detail="User not found")
            resolved_id = resolved_id_result

        logged_date = entry.logged_date or date.today()

        log_data = {
            "user_id": resolved_id,
            "total_calories": entry.calories,
            "total_protein": entry.protein,
            "total_carbs": entry.carbs,
            "total_fat": entry.fat,
            "logged_date": logged_date.isoformat(),
            "meal_type": entry.meal_type.value,
            "notes": f"Barcode: {entry.barcode}",
            "source": "barcode",
            "barcode": entry.barcode,
        }
        result = client.table("food_logs").insert(log_data).execute()
        food_log = result.data[0]
        food_log_id = food_log["id"]

        # Insert food item
        item_data = {
            "food_log_id": food_log_id,
            "food_name": entry.product_name,
            "serving_size": entry.serving_size,
            "calories": entry.calories,
            "protein": entry.protein,
            "carbs": entry.carbs,
            "fat": entry.fat,
        }
        client.table("food_items").insert(item_data).execute()

        return {"success": True, "food_log": food_log}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save barcode food log: {str(e)}")
