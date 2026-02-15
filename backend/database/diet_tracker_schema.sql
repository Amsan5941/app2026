-- ============================================================
-- AI Diet Tracker - Database Schema Extension
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Tables food_logs and food_items should already exist from DATABASE_SCHEMA.md
-- This adds the training_dataset table for Option B (Custom ML Model)

-- ── Training Dataset Table ────────────────────────────────
-- Stores labeled food images for training the custom model.
-- Data comes from:
--   1. User uploads verified by AI (auto-collected)
--   2. Manual user corrections/verifications
--   3. Imported datasets (Food-101, etc.)

CREATE TABLE IF NOT EXISTS training_dataset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  food_name TEXT NOT NULL,
  calories DECIMAL(10, 2),
  protein DECIMAL(10, 2),
  carbs DECIMAL(10, 2),
  fat DECIMAL(10, 2),
  verified BOOLEAN DEFAULT FALSE,
  source TEXT DEFAULT 'user_upload',  -- 'user_upload', 'ai_auto', 'food101', 'manual'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_dataset_food_name ON training_dataset(food_name);
CREATE INDEX IF NOT EXISTS idx_training_dataset_verified ON training_dataset(verified);
CREATE INDEX IF NOT EXISTS idx_training_dataset_source ON training_dataset(source);

-- ── Model Registry Table ──────────────────────────────────
-- Tracks trained model versions and their performance metrics.

CREATE TABLE IF NOT EXISTS model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  accuracy DECIMAL(5, 4),
  loss DECIMAL(10, 6),
  num_classes INTEGER,
  num_samples INTEGER,
  epochs_trained INTEGER,
  model_path TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_registry_active ON model_registry(is_active);

-- ── Supabase Storage Bucket ───────────────────────────────
-- Create a storage bucket for food images (run in Supabase Dashboard → Storage):
--
--   Bucket name: food_images
--   Public: true (so URLs are accessible from the app)
--
-- Or via SQL:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('food_images', 'food_images', true)
-- ON CONFLICT DO NOTHING;

-- ── RLS Policies (optional but recommended) ───────────────
-- The backend uses the service role key, so RLS is bypassed.
-- But if you want to allow direct client access too:

-- ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE training_dataset ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can view own food logs"
--   ON food_logs FOR SELECT
--   USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- CREATE POLICY "Users can insert own food logs"
--   ON food_logs FOR INSERT
--   WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- CREATE POLICY "Users can delete own food logs"
--   ON food_logs FOR DELETE
--   USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
