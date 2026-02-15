# AI Diet Tracker Backend - Setup Guide

## Quick Start

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Server starts at: **http://localhost:8000**

---

## Configuration

All keys are already set in `.env`.

---

## Database Setup

✅ You've already run the SQL migrations in Supabase.

**Image Storage (DISABLED for cost savings):**
- Currently images are processed in-memory only
- When you're ready to enable photo history: uncomment `SUPABASE_STORAGE_BUCKET` in `.env`
- See [COST_OPTIMIZATION.md](COST_OPTIMIZATION.md) for details

---

## Testing the API

```bash
# Health check
curl http://localhost:8000/health

# Test text recognition
curl -X POST http://localhost:8000/api/v1/recognize/text \
  -F "description=grilled chicken and rice"

# Test image recognition (requires image file)
curl -X POST http://localhost:8000/api/v1/recognize/image \
  -F "image=@meal_photo.jpg"
```

---

## Training the Custom Model (Option B)

**⚡ Recommended: Train on Google Colab (FREE GPU)**

1. Open [colab.research.google.com](https://colab.research.google.com)
2. Upload `AIFoodTraining_Colab.ipynb` from this directory
3. Runtime → Change runtime type → **T4 GPU**
4. Run all cells (30-40 minutes)
5. Download `food_classifier.pth`
6. Move to `backend/models/food_classifier.pth`
7. Set `USE_CUSTOM_MODEL=true` in `.env`

**📖 Full instructions:** See [COLAB_TRAINING_GUIDE.md](COLAB_TRAINING_GUIDE.md)

**Local training** (not recommended - very slow on MacBook Air):
```bash
python -m app.training.train_model --epochs 5 --batch-size 16
```

---

## API Architecture

```
User uploads photo
     ↓
POST /api/v1/recognize/hybrid
     ↓
┌────────────────────────────────────┐
│  Hybrid Analysis                   │
│  1. Custom model predicts (fast)   │
│  2. OpenAI Vision analyzes (accurate)│
└────────────────────────────────────┘
     ↓
AI Result (calories, protein, carbs, fat)
     ↓
Save to food_logs + food_items tables
     ↓
High-confidence results → training_dataset
```

---

## Project Structure

```
backend/
  main.py                    # Start here: uvicorn main:app --reload
  .env                       # ← Your keys
  requirements.txt           # Dependencies
  
  app/
    config.py               # Loads .env
    api/                    # FastAPI routes
      food_recognition.py   # POST /recognize/image, /text, /hybrid
      nutrition.py          # GET /nutrition/search
      food_logs.py          # CRUD for food logs
    services/
      openai_service.py     # GPT-4o Vision
      custom_model_service.py  # ResNet-50 classifier
      supabase_service.py   # Database operations
      usda_service.py       # USDA nutrition lookup
    models/
      food_model.py         # Pydantic schemas
    training/
      train_model.py        # Training pipeline
      dataset_utils.py      # Dataset management
```

---

## Costs (Option A: OpenAI Vision)

- **Input**: ~$0.01 per image (GPT-4o Vision, high detail)
- **For 1000 meal logs/month**: ~$10
- **Custom model reduces costs** as it handles confident predictions for free

---

## Model Performance Expectations

| Dataset | Training Time | Accuracy | Notes |
|---------|---------------|----------|-------|
| Food-101 only | 2-4 hours | ~75-80% | Good baseline |
| Food-101 + 1K custom | 3-5 hours | ~80-85% | Adapts to your users |
| Food-101 + 10K custom | 5-8 hours | ~85-90% | Production-ready |

---

## Troubleshooting

**Import errors:**
```bash
pip install -r requirements.txt
```

**OpenAI API errors:**
- Check `OPENAI_API_KEY` in `.env`
- Verify billing is set up at platform.openai.com

**Supabase connection errors:**
- Verify `SUPABASE_SERVICE_KEY` (not the anon key)
- Check tables exist in Supabase SQL Editor

**Training crashes (out of memory):**
```bash
# Reduce batch size
python -m app.training.train_model --batch-size 16
```

---

## Production Deployment

**Option 1: Railway / Render**
```bash
# Uses Dockerfile
git push
```

**Option 2: AWS Lambda** (for serverless)
- Requires separate Lambda layers for PyTorch
- Cold start: ~3-5 seconds

**Option 3: Docker Compose**
```bash
docker build -t diet-tracker .
docker run -p 8000:8000 --env-file .env diet-tracker
```

---

## Connecting to Your Expo App

In your React Native app:

```typescript
// services/dietTracker.ts
const API_URL = "http://localhost:8000/api/v1";  // Dev
// const API_URL = "https://your-backend.railway.app/api/v1";  // Prod

export async function analyzeFoodPhoto(photoUri: string, userId: string) {
  const formData = new FormData();
  formData.append('image', {
    uri: photoUri,
    type: 'image/jpeg',
    name: 'meal.jpg',
  } as any);
  formData.append('user_id', userId);
  formData.append('save_log', 'true');
  formData.append('meal_type', 'lunch');

  const response = await fetch(`${API_URL}/recognize/hybrid`, {
    method: 'POST',
    body: formData,
  });
  
  return response.json();
}
```

---

## Next: Frontend Integration

1. Build photo upload UI in `app/(tabs)/nutrition.tsx`
2. Call `/recognize/hybrid` endpoint
3. Display AI results (calories, macros)
4. Show daily totals from `/food-logs/summary/{user_id}`
