-- Migration: Add support for pagination, barcode scanning, macro targets, and food log editing
-- Run this against your Supabase database (SQL Editor or psql)
-- Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS

-- ============================================================
-- 1. Pagination indexes (cursor-based on created_at DESC)
-- ============================================================

-- Food logs: cursor-based pagination by user + created_at
CREATE INDEX IF NOT EXISTS idx_food_logs_user_created
  ON food_logs (user_id, created_at DESC);

-- Workout sessions: cursor-based pagination by user + created_at
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_created
  ON workout_sessions (user_id, created_at DESC);


-- ============================================================
-- 2. Food log editing columns
-- ============================================================

-- Flag to indicate the log has been manually edited
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS edited BOOLEAN DEFAULT FALSE;

-- Original AI-estimated values preserved on first edit
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS original_calories DECIMAL(10, 2);
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS original_protein DECIMAL(10, 2);
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS original_carbs DECIMAL(10, 2);
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS original_fat DECIMAL(10, 2);


-- ============================================================
-- 3. Barcode scanning columns
-- ============================================================

-- Recognition source: 'ai_image', 'ai_text', 'manual', 'barcode'
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ai_image';

-- Barcode string for products scanned via barcode
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Serving size text (e.g. "100g", "1 cup")
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS serving_size TEXT;

-- Index for barcode lookups (optional, useful for analytics)
CREATE INDEX IF NOT EXISTS idx_food_logs_barcode
  ON food_logs (barcode)
  WHERE barcode IS NOT NULL;


-- ============================================================
-- 4. Macro targets in bio_profile
-- ============================================================

-- Individual macro targets (grams per day)
ALTER TABLE bio_profile ADD COLUMN IF NOT EXISTS protein_target INTEGER;
ALTER TABLE bio_profile ADD COLUMN IF NOT EXISTS carbs_target INTEGER;
ALTER TABLE bio_profile ADD COLUMN IF NOT EXISTS fat_target INTEGER;

-- Calorie goal (may already exist — safe with IF NOT EXISTS)
ALTER TABLE bio_profile ADD COLUMN IF NOT EXISTS calorie_goal INTEGER;


-- ============================================================
-- 5. Verify changes
-- ============================================================

-- Check food_logs columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'food_logs'
  AND column_name IN ('edited', 'original_calories', 'original_protein', 'original_carbs', 'original_fat', 'source', 'barcode', 'serving_size')
ORDER BY column_name;

-- Check bio_profile columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'bio_profile'
  AND column_name IN ('protein_target', 'carbs_target', 'fat_target', 'calorie_goal')
ORDER BY column_name;
