# Training the Custom Model on Google Colab (FREE GPU)

## Why Colab?

- ✅ **Free GPU** (T4 GPU, 15GB VRAM)
- ✅ **30-40 minutes** (vs 4+ hours on MacBook Air)
- ✅ **No laptop overheating**
- ✅ **Training happens in the cloud**

---

## Step-by-Step Instructions

### 1. Open Google Colab

Go to: **[colab.research.google.com](https://colab.research.google.com)**

### 2. Upload the Notebook

1. Click **File** → **Upload notebook**
2. Choose **Upload** tab
3. Upload: `/Users/amsan/app2026/backend/AIFoodTraining_Colab.ipynb`

### 3. Enable GPU

**IMPORTANT:** Must do this or training will be slow!

1. Click **Runtime** → **Change runtime type**
2. Set **Hardware accelerator** to **T4 GPU**
3. Click **Save**

### 4. Run Training

**Option A (Recommended):** Run all cells at once
- Click **Runtime** → **Run all**
- Wait 30-40 minutes

**Option B:** Run cells one by one
- Click ▶️ button on each cell
- Review outputs as you go

### 5. Download Trained Model

After training completes, the last cell will automatically download:
- `food_classifier.pth` (~95MB)
- `training_report.json`

### 6. Add to Your Backend

```bash
# Move downloaded file
mv ~/Downloads/food_classifier.pth /Users/amsan/app2026/backend/models/

# Enable custom model in .env
# Change: USE_CUSTOM_MODEL=false
# To:     USE_CUSTOM_MODEL=true

# Restart backend
cd /Users/amsan/app2026/backend
source venv/bin/activate
uvicorn main:app --reload
```

---

## Expected Results

**Training Progress:**
```
Epoch 1/10
Training: 100%|██████████| 1176/1176 [05:23<00:00]
Validation: 100%|██████████| 394/394 [01:12<00:00]
Train Loss: 1.8234 | Train Acc: 52.45%
Val Loss: 1.4567 | Val Acc: 63.21%
✅ New best model!

Epoch 10/10
Training: 100%|██████████| 1176/1176 [05:19<00:00]
Validation: 100%|██████████| 394/394 [01:11<00:00]
Train Loss: 0.3421 | Train Acc: 89.76%
Val Loss: 0.6234 | Val Acc: 81.43%
✅ New best model!
```

**Final Accuracy:** ~80-85% on Food-101 test set

---

## Troubleshooting

### "Runtime disconnected"
**Cause:** Colab free tier has 12-hour sessions  
**Solution:** Run training in one sitting (takes ~40 min), don't leave it idle

### "GPU not available"
**Cause:** Runtime type not set to GPU  
**Solution:** Runtime → Change runtime type → T4 GPU → Save

### "Out of memory"
**Cause:** Batch size too large (shouldn't happen with our config)  
**Solution:** In the notebook, change `BATCH_SIZE = 64` to `BATCH_SIZE = 32`

### "Download didn't work"
**Cause:** Browser blocked popup  
**Solution:** Click "Download" button in Colab output, or manually download from Files panel (left sidebar)

---

## Cost Comparison

| Method | Time | Cost | Laptop Damage |
|--------|------|------|---------------|
| MacBook Air | 4+ hours | $0 | 🔥 High |
| **Google Colab Free** | **40 min** | **$0** | **None** |
| Colab Pro | 30 min | $10/month | None |
| AWS GPU | 20 min | ~$3 one-time | None |

---

## After Training

Your backend will automatically:
1. Try custom model first (fast, free)
2. If confidence < 75%, fallback to OpenAI (accurate, paid)
3. Gradually improve as more users log meals

**Cost savings:**
- Before: $0.01 per image (100% OpenAI)
- After: $0.001-0.003 per image (80% custom, 20% OpenAI)
- **70-90% cost reduction at scale**

---

## Advanced: Training on Your Own Data

Once you have 1K+ user-uploaded meals:

```python
# In the Colab notebook, add a cell:

# Download your custom dataset from Supabase
!pip install supabase
from supabase import create_client

# Fetch images from training_dataset table
# Organize into folders by food_name
# Then run training with both Food-101 + your data
```

This creates a model specifically tuned to YOUR users' eating habits!

---

## Next Steps

1. ✅ Train model on Colab (~40 min)
2. ✅ Download `food_classifier.pth`
3. ✅ Move to `backend/models/`
4. ✅ Set `USE_CUSTOM_MODEL=true`
5. ✅ Test hybrid recognition: `POST /api/v1/recognize/hybrid`
6. 🚀 Deploy to production with cost savings!
