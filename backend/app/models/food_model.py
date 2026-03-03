"""
Pydantic models for Food Recognition and Diet Tracking.
"""

from datetime import date
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

# ── Enums ──────────────────────────────────────────────────

class MealType(str, Enum):
    breakfast = "breakfast"
    lunch = "lunch"
    dinner = "dinner"
    snack = "snack"


class RecognitionSource(str, Enum):
    openai = "openai"
    custom_model = "custom_model"
    hybrid = "hybrid"
    manual = "manual"
    barcode = "barcode"


# ── Food Items ─────────────────────────────────────────────

class FoodItemBase(BaseModel):
    food_name: str = Field(..., example="Grilled Chicken Breast")
    serving_size: Optional[str] = Field(None, example="6 oz")
    calories: float = Field(..., ge=0, example=284)
    protein: float = Field(0, ge=0, example=53.4)
    carbs: float = Field(0, ge=0, example=0)
    fat: float = Field(0, ge=0, example=6.2)


class FoodItemCreate(FoodItemBase):
    """For creating a food item within a food log."""
    pass


class FoodItemResponse(FoodItemBase):
    id: str
    food_log_id: str


# ── AI Recognition ────────────────────────────────────────

class AIFoodItem(BaseModel):
    """Single food item detected by AI."""
    food_name: str
    serving_size: Optional[str] = None
    calories: float
    protein: float
    carbs: float
    fat: float
    confidence: float = Field(ge=0, le=100, description="Confidence 0-100")


class AIRecognitionResult(BaseModel):
    """Full result from AI food recognition."""
    food_items: list[AIFoodItem]
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fat: float
    ai_confidence: float = Field(ge=0, le=100)
    source: RecognitionSource
    raw_response: Optional[str] = None


class CustomModelPrediction(BaseModel):
    """Prediction from the custom trained model."""
    food_name: str
    confidence: float = Field(ge=0, le=1)
    food_101_class: Optional[str] = None


# ── Food Log (matches Supabase schema) ────────────────────

class FoodLogCreate(BaseModel):
    """Create a food log entry."""
    user_id: str
    image_url: Optional[str] = None
    meal_type: MealType
    logged_date: date
    notes: Optional[str] = None
    food_items: list[FoodItemCreate]


class FoodLogResponse(BaseModel):
    id: str
    user_id: str
    image_url: Optional[str] = None
    total_calories: Optional[float] = None
    total_protein: Optional[float] = None
    total_carbs: Optional[float] = None
    total_fat: Optional[float] = None
    ai_confidence: Optional[float] = None
    logged_date: str
    meal_type: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    food_items: list[FoodItemResponse] = []


# ── Manual Entry ──────────────────────────────────────────

class ManualFoodEntry(BaseModel):
    """Manual food entry (fallback when AI isn't used)."""
    user_id: str
    meal_type: MealType
    logged_date: date
    notes: Optional[str] = None
    food_items: list[FoodItemCreate]


# ── Nutrition Lookup ──────────────────────────────────────

class NutritionQuery(BaseModel):
    """Query for USDA nutrition lookup."""
    food_name: str = Field(..., example="chicken breast")


class NutritionResult(BaseModel):
    food_name: str
    serving_size: Optional[str] = None
    calories: float
    protein: float
    carbs: float
    fat: float
    source: str = "usda"


# ── Dataset / Training ───────────────────────────────────

class DatasetSample(BaseModel):
    """A sample to add to our custom training dataset."""
    image_url: str
    food_name: str
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    verified: bool = False
    source: str = "user_upload"


class TrainingStatus(BaseModel):
    """Status of a model training run."""
    status: str  # "idle", "training", "completed", "failed"
    epoch: Optional[int] = None
    total_epochs: Optional[int] = None
    accuracy: Optional[float] = None
    loss: Optional[float] = None
    message: Optional[str] = None


# ── Food Log Update ───────────────────────────────────────

class FoodLogUpdate(BaseModel):
    """Update a food log's nutrition values. Stores original AI values separately."""
    user_id: str = Field(..., description="User ID for ownership validation")
    total_calories: Optional[float] = Field(None, ge=0)
    total_protein: Optional[float] = Field(None, ge=0)
    total_carbs: Optional[float] = Field(None, ge=0)
    total_fat: Optional[float] = Field(None, ge=0)
    serving_size: Optional[str] = None
    notes: Optional[str] = None


# ── Macro Targets ─────────────────────────────────────────

class MacroTargetsUpdate(BaseModel):
    """Update daily macro targets for a user."""
    protein_target: Optional[float] = Field(None, ge=0)
    carbs_target: Optional[float] = Field(None, ge=0)
    fat_target: Optional[float] = Field(None, ge=0)
    calorie_goal: Optional[float] = Field(None, ge=0)
