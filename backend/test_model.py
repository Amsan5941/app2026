#!/usr/bin/env python3
"""
Test if the trained model works correctly.
Run this after downloading food_classifier.pth from Colab.

Usage:
  python test_model.py
"""

import os
import torch
from app.services.custom_model_service import load_model, FoodClassifier

def test_model():
    """Test the custom food classifier model."""
    
    print("🔍 Testing Custom Food Model")
    print("=" * 60)
    
    # Check if model file exists
    model_path = "models/food_classifier.pth"
    if not os.path.exists(model_path):
        print(f"❌ Model not found at: {model_path}")
        print("\nDid you:")
        print("  1. Train the model on Google Colab?")
        print("  2. Download food_classifier.pth?")
        print("  3. Move it to backend/models/?")
        return False
    
    print(f"✅ Model file found: {model_path}")
    file_size = os.path.getsize(model_path) / (1024 * 1024)
    print(f"   Size: {file_size:.1f} MB")
    
    # Load model
    print("\n📦 Loading model...")
    try:
        model = load_model()
        if model is None:
            print("❌ Model failed to load")
            return False
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        return False
    
    print("✅ Model loaded successfully!")
    
    # Check model details
    checkpoint = torch.load(model_path, map_location='cpu', weights_only=False)
    
    print("\n📊 Model Details:")
    print(f"   Classes: {checkpoint.get('num_classes', 'Unknown')}")
    print(f"   Accuracy: {checkpoint.get('accuracy', 'Unknown'):.2f}%")
    print(f"   Epochs: {checkpoint.get('epochs_trained', 'Unknown')}")
    print(f"   Trained: {checkpoint.get('trained_at', 'Unknown')}")
    
    # Count parameters
    total_params = sum(p.numel() for p in model.parameters())
    print(f"   Parameters: {total_params:,}")
    
    print("\n✅ Model is ready to use!")
    print("\nNext steps:")
    print("  1. Set USE_CUSTOM_MODEL=true in .env")
    print("  2. Restart the backend server")
    print("  3. Test with: POST /api/v1/recognize/hybrid")
    
    return True


if __name__ == "__main__":
    import sys
    
    # Add parent directory to path
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    success = test_model()
    sys.exit(0 if success else 1)
