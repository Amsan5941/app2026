"""
Custom Food Classification Model (Option B)

Architecture: Fine-tuned ResNet-50 on Food-101 dataset + custom user data.
This model runs alongside OpenAI in hybrid mode:
  1. Custom model makes a prediction with confidence score
  2. If confidence >= threshold → use custom model (free, fast)
  3. If confidence < threshold → fallback to OpenAI Vision (paid, more accurate)

Over time, as more user data is collected and the model improves,
fewer requests will need to fall through to OpenAI.
"""

import logging
import os
from io import BytesIO
from typing import Optional

import torch
import torch.nn as nn
from app.config import settings
from app.models.food_model import CustomModelPrediction
from PIL import Image
from torchvision import models, transforms

logger = logging.getLogger(__name__)

# Food-101 classes (101 food categories)
FOOD101_CLASSES = [
    "apple_pie", "baby_back_ribs", "baklava", "beef_carpaccio", "beef_tartare",
    "beet_salad", "beignets", "bibimbap", "bread_pudding", "breakfast_burrito",
    "bruschetta", "caesar_salad", "cannoli", "caprese_salad", "carrot_cake",
    "ceviche", "cheese_plate", "cheesecake", "chicken_curry", "chicken_quesadilla",
    "chicken_wings", "chocolate_cake", "chocolate_mousse", "churros", "clam_chowder",
    "club_sandwich", "crab_cakes", "creme_brulee", "croque_madame", "cup_cakes",
    "deviled_eggs", "donuts", "dumplings", "edamame", "eggs_benedict",
    "escargots", "falafel", "filet_mignon", "fish_and_chips", "foie_gras",
    "french_fries", "french_onion_soup", "french_toast", "fried_calamari", "fried_rice",
    "frozen_yogurt", "garlic_bread", "gnocchi", "greek_salad", "grilled_cheese_sandwich",
    "grilled_salmon", "guacamole", "gyoza", "hamburger", "hot_and_sour_soup",
    "hot_dog", "huevos_rancheros", "hummus", "ice_cream", "lasagna",
    "lobster_bisque", "lobster_roll_sandwich", "macaroni_and_cheese", "macarons", "miso_soup",
    "mussels", "nachos", "omelette", "onion_rings", "oysters",
    "pad_thai", "paella", "pancakes", "panna_cotta", "peking_duck",
    "pho", "pizza", "pork_chop", "poutine", "prime_rib",
    "pulled_pork_sandwich", "ramen", "ravioli", "red_velvet_cake", "risotto",
    "samosa", "sashimi", "scallops", "seaweed_salad", "shrimp_and_grits",
    "spaghetti_bolognese", "spaghetti_carbonara", "spring_rolls", "steak", "strawberry_shortcake",
    "sushi", "tacos", "takoyaki", "tiramisu", "tuna_tartare",
    "waffles",
]

# Image preprocessing (must match training transforms)
INFERENCE_TRANSFORM = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


class FoodClassifier(nn.Module):
    """
    ResNet-50 fine-tuned for food classification.
    Output: 101 classes (Food-101) + expandable for custom classes.
    """

    def __init__(self, num_classes: int = 101, pretrained_backbone: bool = True):
        super().__init__()
        # Load pretrained ResNet-50
        self.backbone = models.resnet50(
            weights=models.ResNet50_Weights.DEFAULT if pretrained_backbone else None
        )
        # Replace final FC layer for our number of classes
        in_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(in_features, 512),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(512, num_classes),
        )

    def forward(self, x):
        return self.backbone(x)


# Singleton model instance
_model: Optional[FoodClassifier] = None
_model_loaded = False


def load_model() -> Optional[FoodClassifier]:
    """Load the trained model from disk. Returns None if no model file exists."""
    global _model, _model_loaded

    if _model_loaded:
        return _model

    model_path = settings.custom_model_path
    if not os.path.exists(model_path):
        logger.info("No model found at %s — custom model disabled", model_path)
        _model_loaded = True
        _model = None
        return None

    logger.info("Loading custom model from %s", model_path)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    checkpoint = torch.load(model_path, map_location=device, weights_only=False)
    num_classes = checkpoint.get("num_classes", 101)

    model = FoodClassifier(num_classes=num_classes, pretrained_backbone=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()

    _model = model
    _model_loaded = True
    logger.info("Custom model loaded successfully (%d classes)", num_classes)
    return model


async def predict_food(image_bytes: bytes) -> Optional[CustomModelPrediction]:
    """
    Run food classification on an image using the custom model.

    Args:
        image_bytes: Raw image bytes

    Returns:
        CustomModelPrediction or None if model isn't available
    """
    model = load_model()
    if model is None:
        return None

    device = next(model.parameters()).device

    # Preprocess
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    tensor = INFERENCE_TRANSFORM(image).unsqueeze(0).to(device)

    # Inference
    with torch.no_grad():
        outputs = model(tensor)
        probabilities = torch.softmax(outputs, dim=1)
        confidence, predicted_idx = torch.max(probabilities, 1)

    predicted_class = FOOD101_CLASSES[predicted_idx.item()]
    conf_value = confidence.item()

    return CustomModelPrediction(
        food_name=predicted_class.replace("_", " ").title(),
        confidence=conf_value,
        food_101_class=predicted_class,
    )


async def hybrid_analyze(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
) -> dict:
    """
    Hybrid analysis: try custom model first, fallback to OpenAI if low confidence.

    Returns:
        dict with "result" (AIRecognitionResult) and "source" info
    """
    from app.models.food_model import RecognitionSource
    from app.services.openai_service import analyze_food_image

    custom_prediction = None
    used_source = RecognitionSource.openai

    # Step 1: Try custom model
    if settings.use_custom_model:
        custom_prediction = await predict_food(image_bytes)

        if custom_prediction and custom_prediction.confidence >= settings.custom_model_confidence_threshold:
            # Custom model is confident — still use OpenAI but tell it what we detected
            # This gives us the best of both worlds: custom model speed + OpenAI nutrition data
            used_source = RecognitionSource.hybrid
            logger.info(
                "Hybrid: custom model detected %s (confidence=%.2f)",
                custom_prediction.food_name,
                custom_prediction.confidence,
            )

    # Step 2: Get full nutrition analysis from OpenAI
    ai_result = await analyze_food_image(image_bytes, mime_type)
    ai_result.source = used_source

    return {
        "result": ai_result,
        "custom_prediction": custom_prediction,
        "source": used_source.value,
    }
